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

        // Existing row by clerkId: refresh email, and refresh displayName
        // only if it still matches what we'd derive from Clerk (i.e. the
        // user hasn't overridden it via PATCH /auth/profile).
        const byClerkId = await prisma.user.findUnique({
          where: { clerkId: data.id },
          select: { id: true, displayName: true },
        });
        if (byClerkId) {
          const shouldRefreshName = byClerkId.displayName !== displayName;
          await prisma.user.update({
            where: { clerkId: data.id },
            data: shouldRefreshName ? { email, displayName } : { email },
          });
          break;
        }

        // No row yet for this clerkId. Try to create; if the email is
        // already taken (seed data, or a user that existed before Clerk
        // was wired in), adopt that row by stamping clerkId on it.
        try {
          await prisma.user.create({
            data: {
              clerkId: data.id,
              email,
              displayName,
              igVerifyCode: generateIgVerifyCode(),
            },
          });
        } catch (err) {
          if (isUniqueViolationOn(err, ["email"])) {
            await prisma.user.update({
              where: { email },
              data: { clerkId: data.id },
            });
          } else if (isUniqueViolationOn(err, ["clerkId"])) {
            // Concurrent create on the same clerkId — already linked.
            await prisma.user.update({
              where: { clerkId: data.id },
              data: { email },
            });
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
