import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import { clerkClient, getAuth } from "@clerk/express";
import { verifyToken } from "@clerk/backend";
import { Prisma } from "@prisma/client";
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

// True when `err` is a Prisma unique-constraint violation on any of `fields`.
function isUniqueViolationOn(err: unknown, fields: string[]): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code !== "P2002") return false;
  const target = (err.meta as { target?: string | string[] } | undefined)?.target;
  if (!target) return false;
  const list = Array.isArray(target) ? target : [target];
  return list.some((t) => fields.includes(t));
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

  // Pre-existing local row for this email (seed data, or a user that existed
  // before Clerk was wired in) — adopt it by stamping clerkId, but only if
  // it isn't already linked to a different Clerk user. Without this guard we
  // could hand User A's likes/reels/igUsername to User B in environments
  // where Clerk allows duplicate emails or after an email-change race.
  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, clerkId: true },
  });
  if (byEmail) {
    if (byEmail.clerkId === clerkUserId) return byEmail.id;
    if (byEmail.clerkId !== null) {
      console.error(
        `resolveLocalUser: local row for ${email} is already linked to clerkId ${byEmail.clerkId}; refusing to re-link to ${clerkUserId}`
      );
      throw new Error("Email already linked to a different Clerk user");
    }
    // Atomic adoption: include the `clerkId IS NULL` precondition in the
    // write itself so two concurrent adoptions of the same email can't both
    // succeed and silently overwrite each other.
    const adopted = await prisma.user.updateMany({
      where: { id: byEmail.id, clerkId: null },
      data: { clerkId: clerkUserId },
    });
    if (adopted.count === 1) return byEmail.id;
    const after = await prisma.user.findUnique({
      where: { id: byEmail.id },
      select: { id: true, clerkId: true },
    });
    if (after?.clerkId === clerkUserId) return after.id;
    console.error(
      `resolveLocalUser: email ${email} adoption lost race to ${after?.clerkId ?? "unknown"}; refusing to re-link to ${clerkUserId}`
    );
    throw new Error("Email already linked to a different Clerk user");
  }

  try {
    const created = await prisma.user.create({
      data: {
        clerkId: clerkUserId,
        email,
        displayName,
        derivedDisplayName: displayName,
        igVerifyCode: generateIgVerifyCode(),
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    // Race: webhook may have created the row between findUnique and create.
    if (isUniqueViolationOn(err, ["clerkId"])) {
      const after = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      if (after) return after.id;
    }
    // Race on email: re-check ownership and only adopt if still unlinked.
    // Use updateMany so the unlinked precondition is enforced atomically.
    if (isUniqueViolationOn(err, ["email"])) {
      const raced = await prisma.user.findUnique({
        where: { email },
        select: { id: true, clerkId: true },
      });
      if (raced && raced.clerkId === clerkUserId) return raced.id;
      if (raced) {
        const adopted = await prisma.user.updateMany({
          where: { id: raced.id, clerkId: null },
          data: { clerkId: clerkUserId },
        });
        if (adopted.count === 1) return raced.id;
        const after = await prisma.user.findUnique({
          where: { id: raced.id },
          select: { id: true, clerkId: true },
        });
        if (after?.clerkId === clerkUserId) return after.id;
      }
      console.error(
        `resolveLocalUser: email ${email} raced into a row linked to ${raced?.clerkId ?? "unknown"}; refusing to re-link to ${clerkUserId}`
      );
      throw new Error("Email already linked to a different Clerk user");
    }
    console.error("resolveLocalUser create failed:", err);
    throw err;
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
