import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { verifyWebhook } from "@clerk/express/webhooks";
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

        await prisma.user.upsert({
          where: { clerkId: data.id },
          // Don't clobber a displayName the user has personalised in-app;
          // only refresh the email (which Clerk owns).
          update: { email },
          create: {
            clerkId: data.id,
            email,
            displayName,
            igVerifyCode: generateIgVerifyCode(),
          },
        });
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
