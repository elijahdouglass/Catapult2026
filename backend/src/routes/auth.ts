import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import prisma from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const IG_APP_ID = process.env.IG_APP_ID;
const IG_APP_SECRET = process.env.IG_APP_SECRET;
const IG_REDIRECT_URI = process.env.IG_REDIRECT_URI;
const FRONTEND_URL = process.env.CORS_ORIGIN || "http://localhost:5173";
const DEV_AUTH = process.env.ALLOW_DEV_AUTH === "true";

const IG_GRAPH_API = "https://graph.instagram.com";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// ─── Instagram OAuth (Business Login for Instagram) ─────────────────

router.get("/instagram", (_req: Request, res: Response) => {
  if (!IG_APP_ID || !IG_REDIRECT_URI) {
    res.status(500).json({ error: "Instagram OAuth not configured" });
    return;
  }

  const scopes = "instagram_business_basic,instagram_business_manage_messages";

  const url =
    `https://www.instagram.com/oauth/authorize` +
    `?client_id=${IG_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(IG_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&response_type=code`;

  res.redirect(url);
});

router.get(
  "/instagram/callback",
  async (req: Request, res: Response) => {
    try {
      const rawCode = req.query.code;
      if (!rawCode || typeof rawCode !== "string") {
        res.redirect(`${FRONTEND_URL}/auth?error=missing_code`);
        return;
      }

      if (!IG_APP_ID || !IG_APP_SECRET || !IG_REDIRECT_URI) {
        res.redirect(`${FRONTEND_URL}/auth?error=oauth_not_configured`);
        return;
      }

      // Instagram appends #_ to the code — strip it
      const code = rawCode.replace(/#_$/, "");

      // 1. Exchange code for short-lived access token
      const tokenRes = await fetch(
        "https://api.instagram.com/oauth/access_token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: IG_APP_ID,
            client_secret: IG_APP_SECRET,
            grant_type: "authorization_code",
            redirect_uri: IG_REDIRECT_URI,
            code,
          }),
        }
      );
      const tokenData = (await tokenRes.json()) as any;
      if (tokenData.error_type || tokenData.error_message) {
        console.error("IG token exchange error:", tokenData);
        res.redirect(`${FRONTEND_URL}/auth?error=token_exchange`);
        return;
      }
      const shortLivedToken: string = tokenData.access_token;
      const igUserId: string = String(tokenData.user_id);

      // 2. Exchange for long-lived token (60 days)
      const llRes = await fetch(
        `${IG_GRAPH_API}/access_token` +
          `?grant_type=ig_exchange_token` +
          `&client_secret=${IG_APP_SECRET}` +
          `&access_token=${shortLivedToken}`
      );
      const llData = (await llRes.json()) as any;
      // Fall back to short-lived if exchange fails
      const accessToken: string = llData.access_token || shortLivedToken;

      // 3. Get user profile (username, name)
      const profileRes = await fetch(
        `${IG_GRAPH_API}/v21.0/me?fields=user_id,username,name&access_token=${accessToken}`
      );
      const profile = (await profileRes.json()) as any;
      const igUsername: string | undefined = profile.username;
      const displayName: string = profile.name || igUsername || "User";

      // 4. Upsert user — match by igUserId first, then by igUsername
      let user = await prisma.user.findUnique({
        where: { igUserId },
      });

      if (!user && igUsername) {
        // Check if user was created via dev auth with matching igUsername
        user = await prisma.user.findFirst({
          where: { igUsername, igUserId: null },
        });
        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { igUserId, igUsername },
          });
        }
      }

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `${igUserId}@instagram.local`,
            displayName,
            igUserId,
            igUsername,
          },
        });
      }

      // 5. Issue JWT and redirect to frontend
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error("Instagram OAuth error:", error);
      res.redirect(`${FRONTEND_URL}/auth?error=oauth_failed`);
    }
  }
);

// ─── Dev-only email/password auth ───────────────────────────────────

if (DEV_AUTH) {
  router.post(
    "/register",
    authLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email, password, displayName } = req.body;
        if (!email || !password || !displayName) {
          res.status(400).json({ error: "Missing required fields" });
          return;
        }

        const existing = await prisma.user.findUnique({
          where: { email },
        });
        if (existing) {
          res.status(409).json({ error: "Email already registered" });
          return;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: { email, passwordHash, displayName },
        });

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
          },
        });
      } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  router.post(
    "/login",
    authLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) {
          res.status(400).json({ error: "Missing required fields" });
          return;
        }

        const user = await prisma.user.findUnique({ where: { email } });

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
          },
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

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
