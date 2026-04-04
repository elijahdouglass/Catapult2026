import { Router, Response } from "express";
import { signRequest } from "@worldcoin/idkit-server";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

const WORLD_ID_APP_ID = process.env.WORLD_ID_APP_ID;
const WORLD_ID_RP_ID = process.env.WORLD_ID_RP_ID;
const WORLD_ID_RP_SIGNING_KEY = process.env.WORLD_ID_RP_SIGNING_KEY;
const ACTION = "verify-human";

router.get(
  "/rp-signature",
  authMiddleware,
  async (_req: AuthRequest, res: Response) => {
    if (!WORLD_ID_APP_ID || !WORLD_ID_RP_ID || !WORLD_ID_RP_SIGNING_KEY) {
      res.status(503).json({ error: "World ID not configured" });
      return;
    }

    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: WORLD_ID_RP_SIGNING_KEY,
      action: ACTION,
      ttl: 300,
    });

    res.json({
      app_id: WORLD_ID_APP_ID,
      action: ACTION,
      rp_context: {
        rp_id: WORLD_ID_RP_ID,
        nonce,
        created_at: createdAt,
        expires_at: expiresAt,
        signature: sig,
      },
    });
  }
);

router.post(
  "/verify",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    if (!WORLD_ID_RP_ID) {
      res.status(503).json({ error: "World ID not configured" });
      return;
    }

    const proof = req.body;

    // Forward proof to World ID verify API
    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${WORLD_ID_RP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proof),
      }
    );

    const verifyData = (await verifyRes.json()) as {
      success?: boolean;
      detail?: string;
      code?: string;
      nullifier?: string;
      results?: { nullifier?: string }[];
    };

    if (!verifyRes.ok || !verifyData.success) {
      res.status(400).json({
        error: "Verification failed",
        detail: verifyData.detail || verifyData.code,
      });
      return;
    }

    // Extract nullifier from the first response item
    const nullifier =
      proof.responses?.[0]?.nullifier ||
      verifyData.nullifier ||
      verifyData.results?.[0]?.nullifier;

    if (nullifier) {
      // Check if this World ID is already linked to another account
      const existing = await prisma.user.findUnique({
        where: { worldIdNullifier: nullifier },
      });
      if (existing && existing.id !== req.userId!) {
        res.status(409).json({
          error: "This World ID is already linked to another account",
        });
        return;
      }
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        worldIdVerified: true,
        worldIdNullifier: nullifier || null,
      },
    });

    res.json({ verified: true });
  }
);

export default router;
