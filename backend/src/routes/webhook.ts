import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const IG_PAGE_ACCESS_TOKEN = process.env.IG_PAGE_ACCESS_TOKEN;

const router = Router();

async function reactToMessage(messageId: string, senderId: string) {
  if (!IG_PAGE_ACCESS_TOKEN) {
    console.warn("No IG_PAGE_ACCESS_TOKEN set, skipping reaction");
    return;
  }

  try {
    await fetch(
      `https://graph.instagram.com/v21.0/me/messages?access_token=${IG_PAGE_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: senderId },
          sender_action: "react",
          payload: { message_id: messageId, reaction: "love" },
        }),
      }
    );
  } catch (err) {
    console.error("Failed to react to message:", err);
  }
}

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
  payload?: { url?: string; reel_video_id?: string };
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

router.post("/instagram", async (req: Request, res: Response) => {
  console.log("Webhook POST received:", JSON.stringify(req.body, null, 2));

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

        const senderIgId = event.sender.id;

        // ── DM verification: check text messages for verify codes ──
        if (msg.text) {
          const code = msg.text.trim().toUpperCase();
          const pendingUser = await prisma.user.findFirst({
            where: { igVerifyCode: code, igVerified: false },
          });

          if (pendingUser) {
            await prisma.user.update({
              where: { id: pendingUser.id },
              data: {
                igVerified: true,
                igUserId: senderIgId,
                igVerifyCode: null,
              },
            });
            console.log(
              `Verified user ${pendingUser.id} (${pendingUser.igUsername}) via DM from ${senderIgId}`
            );
            continue;
          }
        }

        // ── Reel tracking: check attachments for reels ──
        if (!msg.attachments) continue;

        for (const attachment of msg.attachments) {
          if (attachment.type !== "ig_reel" && attachment.type !== "reel") {
            continue;
          }

          const reelId = attachment.payload?.reel_video_id;
          if (!reelId) {
            console.warn(
              "No reel_video_id in attachment:",
              JSON.stringify(attachment.payload)
            );
            continue;
          }
          const videoUrl = attachment.payload?.url ?? null;

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
            update: { viewedAt: new Date(), videoUrl },
            create: { userId: user.id, reelId, videoUrl },
          });

          console.log(
            `Recorded reel ${reelId} for user ${user.id} (${user.igUsername})`
          );

          // React to confirm receipt
          if (msg.mid) {
            await reactToMessage(msg.mid, senderIgId);
          }
        }
      }
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
  }
});

export default router;
