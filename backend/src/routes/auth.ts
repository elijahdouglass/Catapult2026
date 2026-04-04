import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

function generateVerifyCode(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

// ─── Register ───────────────────────────────────────────────────────

router.post(
  "/register",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email, password, displayName, igUsername } = req.body;
      if (!email || !password || !displayName || !igUsername) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verifyCode = generateVerifyCode();

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          igUsername,
          igVerifyCode: verifyCode,
          igVerified: false,
        },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        token,
        verifyCode,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          igUsername: user.igUsername,
          igVerified: user.igVerified,
          onboarded: user.onboarded,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ─── Login (by email, display name, or IG username) ─────────────────

router.post(
  "/login",
  authLimiter,
  async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      // Try to find user by email, display name, or IG username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: username },
            { displayName: username },
            { igUsername: username },
          ],
        },
      });

      const dummyHash =
        "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012";
      const valid = await bcrypt.compare(
        password,
        user?.passwordHash ?? dummyHash
      );
      if (!user || !valid) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          onboarded: user.onboarded,
          igUsername: user.igUsername,
          igVerified: user.igVerified,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

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
        },
      });
    } catch (error) {
      console.error("Auth/me error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
