import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

const router = Router();

// ─── Meta webhook verification ──────────────────────────────────────

router.get("/instagram", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.warn("Webhook verification failed", { mode, token });
    res.sendStatus(403);
  }
});

// ─── Incoming Instagram messages ────────────────────────────────────

interface IgAttachment {
  type: string;
  payload?: { url?: string };
}

interface IgMessage {
  mid?: string;
  text?: string;
  attachments?: IgAttachment[];
  is_echo?: boolean;
  is_deleted?: boolean;
  is_unsupported?: boolean;
}

interface IgMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: IgMessage;
}

interface IgEntry {
  id: string;
  time: number;
  messaging?: IgMessagingEvent[];
}

interface IgWebhookPayload {
  object: string;
  entry?: IgEntry[];
}

const REEL_ID_REGEX = /instagram\.com\/reels?\/([A-Za-z0-9_-]+)/;

function extractReelId(url: string): string | null {
  const match = url.match(REEL_ID_REGEX);
  return match ? match[1] : null;
}

router.post("/instagram", async (req: Request, res: Response) => {
  // Always respond 200 quickly — Meta requires <20s
  res.sendStatus(200);

  try {
    const body = req.body as IgWebhookPayload;
    if (body.object !== "instagram" || !body.entry) return;

    for (const entry of body.entry) {
      if (!entry.messaging) continue;

      for (const event of entry.messaging) {
        const msg = event.message;
        if (!msg) continue;
        if (msg.is_echo || msg.is_deleted || msg.is_unsupported) continue;
        if (!msg.attachments) continue;

        // Find reel attachments
        for (const attachment of msg.attachments) {
          if (attachment.type !== "ig_reel" && attachment.type !== "reel") {
            continue;
          }

          const url = attachment.payload?.url;
          if (!url) continue;

          const reelId = extractReelId(url);
          if (!reelId) {
            console.warn("Could not extract reel ID from:", url);
            continue;
          }

          // The sender is the Reel Rizz user who DM'd our account
          const senderIgId = event.sender.id;

          const user = await prisma.user.findUnique({
            where: { igUserId: senderIgId },
          });

          if (!user) {
            console.log(
              `Ignoring reel from unknown IG user ${senderIgId}`
            );
            continue;
          }

          await prisma.reelView.upsert({
            where: {
              userId_reelId: { userId: user.id, reelId },
            },
            update: { viewedAt: new Date() },
            create: { userId: user.id, reelId },
          });

          console.log(
            `Recorded reel ${reelId} for user ${user.id} (${user.igUsername})`
          );
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
});

export default router;
