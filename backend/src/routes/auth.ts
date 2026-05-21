import { Router, Response } from "express";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

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

export default router;
