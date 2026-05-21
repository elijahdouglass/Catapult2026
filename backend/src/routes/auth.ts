import { Router, Response } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

// Canonical form for IG handles: strip leading "@", trim, lowercase. Applied
// at the only write-time entry point (PATCH /auth/profile) and mirrored in
// seed.ts so the DB only ever stores normalized values.
function normalizeIgUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").trim().toLowerCase();
}

// Clerk owns sign-up and sign-in; this router only exposes read-only session
// helpers backed by the local user row resolved in `authMiddleware`.

const router = Router();

// ─── Verification status polling ────────────────────────────────────

router.get(
  "/verify-status",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { igVerified: true },
      });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({ igVerified: user.igVerified });
    } catch (error) {
      console.error("Verify status error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Session check ──────────────────────────────────────────────────

router.get(
  "/me",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          onboarded: user.onboarded,
          igUsername: user.igUsername,
          igVerified: user.igVerified,
          // The verify code is only meaningful while a user hasn't yet
          // proven they own the IG handle. Once verified, hide it.
          igVerifyCode: user.igVerified ? undefined : user.igVerifyCode ?? undefined,
          tags: user.tags,
          worldIdVerified: user.worldIdVerified,
        },
      });
    } catch (error) {
      console.error("Auth/me error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Profile self-update ────────────────────────────────────────────
//
// Clerk owns identity (email, name); this endpoint covers fields Clerk
// doesn't know about — the IG handle the user is claiming and an optional
// display-name override. Only allowed while still unverified so a malicious
// client can't swap handles post-verification.
router.patch(
  "/profile",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { igUsername, displayName } = req.body ?? {};
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { igVerified: true },
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const data: { igUsername?: string; displayName?: string } = {};
      if (typeof igUsername === "string" && igUsername.trim()) {
        if (user.igVerified) {
          res.status(403).json({ error: "IG handle is locked once verified" });
          return;
        }
        const normalized = normalizeIgUsername(igUsername);
        if (!normalized) {
          res.status(400).json({ error: "IG handle is empty" });
          return;
        }
        data.igUsername = normalized;
      }
      if (typeof displayName === "string" && displayName.trim()) {
        data.displayName = displayName.trim();
      }
      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: "Nothing to update" });
        return;
      }

      try {
        await prisma.user.update({ where: { id: req.userId! }, data });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          const target = (err.meta as { target?: string | string[] } | undefined)
            ?.target;
          const fields = Array.isArray(target) ? target : target ? [target] : [];
          if (fields.includes("igUsername")) {
            res.status(409).json({ error: "IG handle already claimed" });
            return;
          }
        }
        throw err;
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("Auth/profile update error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
