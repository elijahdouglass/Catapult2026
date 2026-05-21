import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { verifyWebhook } from "@clerk/express/webhooks";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";

const router = Router();

// Mirrored from middleware/auth.ts. Kept in sync intentionally so the webhook
// and the create-on-first-sight path produce codes from the same alphabet.
function generateIgVerifyCode(): string {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function isUniqueViolationOn(err: unknown, fields: string[]): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  const target = (err.meta as { target?: string | string[] } | undefined)?.target;
  if (!target) return false;
  const list = Array.isArray(target) ? target : [target];
  return list.some((t) => fields.includes(t));
}

// Keeps the local User row in sync with Clerk-owned identity data. Mounted
// with `express.raw()` so Svix can verify the request signature against the
// untouched body.
router.post("/", async (req: Request, res: Response) => {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook verification failed:", err);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const data = evt.data;
        const email =
          data.email_addresses.find(
            (e) => e.id === data.primary_email_address_id
          )?.email_address ?? data.email_addresses[0]?.email_address;
        if (!email) {
          console.warn(`Clerk webhook ${evt.type}: no email for ${data.id}`);
          break;
        }
        const displayName =
          [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
          data.username ||
          email.split("@")[0];

        // Existing row by clerkId: always refresh email; refresh displayName
        // only when the local value still equals the value we last derived
        // from Clerk (tracked in `derivedDisplayName`). That way a user who
        // overrides their name via PATCH /auth/profile doesn't see it
        // silently clobbered on the next Clerk-side edit, but a row whose
        // displayName has never been overridden does keep tracking Clerk.
        const byClerkId = await prisma.user.findUnique({
          where: { clerkId: data.id },
          select: { id: true, displayName: true, derivedDisplayName: true },
        });
        if (byClerkId) {
          const userOverrode =
            byClerkId.derivedDisplayName !== null &&
            byClerkId.displayName !== byClerkId.derivedDisplayName;
          const fullData = userOverrode
            ? { email, derivedDisplayName: displayName }
            : { email, displayName, derivedDisplayName: displayName };
          try {
            await prisma.user.update({
              where: { clerkId: data.id },
              data: fullData,
            });
          } catch (err) {
            // The incoming Clerk email is already held by a different local
            // row (a still-unlinked seed row, or a row owned by another
            // linked Clerk user). Refusing to ack would have Clerk retry the
            // webhook forever; instead, skip the email field, still refresh
            // displayName tracking, and surface a warning for the operator.
            if (isUniqueViolationOn(err, ["email"])) {
              const { email: _omit, ...withoutEmail } = fullData;
              console.warn(
                `Clerk webhook ${evt.type}: email ${email} already held by another local row; updating ${data.id} without email field`
              );
              try {
                await prisma.user.update({
                  where: { clerkId: data.id },
                  data: withoutEmail,
                });
              } catch (retryErr) {
                // P2025: the row was deleted concurrently between our
                // initial `findUnique`/`update` and this retry (e.g. a
                // user.deleted webhook arrived in the gap). Ack with a
                // warning — a future user.updated will either land on a
                // newly-created row or repeat this resolution. Surfacing
                // 500 here just makes Clerk retry with a misleading "handler
                // failed" log.
                if (
                  retryErr instanceof Prisma.PrismaClientKnownRequestError &&
                  retryErr.code === "P2025"
                ) {
                  console.warn(
                    `Clerk webhook ${evt.type}: row for ${data.id} vanished before retry; acking`
                  );
                } else {
                  throw retryErr;
                }
              }
            } else {
              throw err;
            }
          }
          break;
        }

        // No row yet for this clerkId. If the email is already on file (seed
        // data or a user that existed before Clerk was wired in), adopt that
        // row by stamping clerkId — but only when it isn't already linked to
        // a different Clerk user. Otherwise we'd transfer the existing row's
        // igUsername / igVerified / likes / reels to a new identity. We
        // don't touch displayName during adoption; a later user.updated
        // event will resync displayName from Clerk unless the user has
        // since overridden it via PATCH /auth/profile (tracked by
        // derivedDisplayName).
        const byEmail = await prisma.user.findUnique({
          where: { email },
          select: { id: true, clerkId: true },
        });
        if (byEmail) {
          if (byEmail.clerkId === data.id) break;
          if (byEmail.clerkId !== null) {
            console.warn(
              `Clerk webhook ${evt.type}: refusing to adopt local row for ${email} — already linked to ${byEmail.clerkId}, incoming ${data.id}`
            );
            break;
          }
          // Atomic adoption: include the `clerkId IS NULL` precondition in
          // the write so two concurrent adoptions can't both stamp the row.
          const adopted = await prisma.user.updateMany({
            where: { id: byEmail.id, clerkId: null },
            data: { clerkId: data.id },
          });
          if (adopted.count === 0) {
            const after = await prisma.user.findUnique({
              where: { id: byEmail.id },
              select: { clerkId: true },
            });
            // Three outcomes here, only one of which is a real conflict:
            //   - after.clerkId === data.id: idempotent same-user race, no-op.
            //   - after is null: row deleted between updateMany and re-read.
            //   - after.clerkId !== data.id: lost to a different Clerk user.
            // Tag the warning so a future metric can split "row vanished" and
            // "genuine conflict" without re-parsing the message body.
            if (!after) {
              console.warn(
                `Clerk webhook ${evt.type}: row for ${email} vanished mid-adoption, incoming ${data.id}`
              );
            } else if (after.clerkId !== data.id) {
              console.warn(
                `Clerk webhook ${evt.type}: lost adoption race for ${email} to ${after.clerkId}, incoming ${data.id}`
              );
            }
          }
          break;
        }

        try {
          await prisma.user.create({
            data: {
              clerkId: data.id,
              email,
              displayName,
              derivedDisplayName: displayName,
              igVerifyCode: generateIgVerifyCode(),
            },
          });
        } catch (err) {
          if (isUniqueViolationOn(err, ["clerkId"])) {
            // Concurrent create on the same clerkId — already linked.
            await prisma.user.update({
              where: { clerkId: data.id },
              data: { email },
            });
          } else if (isUniqueViolationOn(err, ["email"])) {
            // Race on email: re-check ownership before adopting. Use
            // updateMany so the unlinked precondition is enforced atomically.
            const raced = await prisma.user.findUnique({
              where: { email },
              select: { id: true, clerkId: true },
            });
            if (raced && raced.clerkId !== data.id) {
              const adopted = await prisma.user.updateMany({
                where: { id: raced.id, clerkId: null },
                data: { clerkId: data.id },
              });
              if (adopted.count === 0) {
                const after = await prisma.user.findUnique({
                  where: { id: raced.id },
                  select: { clerkId: true },
                });
                if (after?.clerkId !== data.id) {
                  console.warn(
                    `Clerk webhook ${evt.type}: refusing to adopt local row for ${email} after race — owner ${after?.clerkId ?? "unknown"}, incoming ${data.id}`
                  );
                }
              }
            } else if (!raced) {
              console.warn(
                `Clerk webhook ${evt.type}: row for ${email} vanished after P2002, incoming ${data.id}`
              );
            }
          } else {
            throw err;
          }
        }
        break;
      }
      case "user.deleted": {
        const data = evt.data;
        if (!data.id) break;
        await prisma.user.deleteMany({ where: { clerkId: data.id } });
        break;
      }
      default:
        // Ignore other event types.
        break;
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Clerk webhook handler error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

export default router;
