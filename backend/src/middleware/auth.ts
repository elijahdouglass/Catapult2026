import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { clerkClient, getAuth } from "@clerk/express";
import prisma from "../lib/prisma";

export interface AuthRequest extends Request {
  userId?: number;
  clerkUserId?: string;
}

// Short, copy/paste-friendly IG DM verification code. Excludes ambiguous
// glyphs so a user reading it off-screen doesn't confuse O/0 or I/1.
function generateIgVerifyCode(): string {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Resolve a Clerk-authenticated request to a local User row, creating one on
// first sight. Clerk owns identity; we still need an integer userId so the
// existing Prisma relations (likes, reels, etc.) don't have to change.
async function resolveLocalUser(clerkUserId: string): Promise<number> {
  const existing = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (existing) return existing.id;

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new Error(`Clerk user ${clerkUserId} has no email address`);
  }
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    clerkUser.username ||
    email.split("@")[0];

  // Race: webhook may create the row between findUnique and create. Catch the
  // unique-constraint violation and re-fetch.
  try {
    const created = await prisma.user.create({
      data: {
        clerkId: clerkUserId,
        email,
        displayName,
        igVerifyCode: generateIgVerifyCode(),
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    const after = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!after) throw new Error(`Failed to provision local user for ${clerkUserId}`);
    return after.id;
  }
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    req.clerkUserId = auth.userId;
    req.userId = await resolveLocalUser(auth.userId);
    next();
  } catch (err) {
    console.error("Auth resolution error:", err);
    res.status(500).json({ error: "Failed to resolve user" });
  }
}

// Verifies a Clerk session token passed as a raw string (e.g. via query param
// for the WorldID verify-page bridge that runs inside SFSafariViewController
// and can't set Authorization headers). Returns the local userId on success.
export async function verifyClerkSessionToken(
  token: string
): Promise<number | null> {
  try {
    const { verifyToken } = await import("@clerk/backend");
    const claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    if (!claims.sub) return null;
    return await resolveLocalUser(claims.sub);
  } catch (err) {
    console.error("Clerk token verification failed:", err);
    return null;
  }
}
