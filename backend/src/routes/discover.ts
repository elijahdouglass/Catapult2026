import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import { cosineSimilarity } from "../services/similarity";

const router = Router();

// Original discover endpoint (ranked candidates)
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!me || !me.tagVector) {
    res.status(400).json({ error: "Complete onboarding first" });
    return;
  }

  const likedIds = (
    await prisma.like.findMany({
      where: { likerId: me.id },
      select: { likeeId: true },
    })
  ).map((l) => l.likeeId);

  const seenIds = (
    await prisma.seenUser.findMany({
      where: { viewerId: me.id },
      select: { seenId: true },
    })
  ).map((s) => s.seenId);

  const candidates = await prisma.user.findMany({
    where: {
      onboarded: true,
      id: { notIn: [me.id, ...likedIds, ...seenIds] },
      tagVector: { not: null },
    },
    select: {
      id: true,
      displayName: true,
      tags: true,
      tagVector: true,
      worldIdVerified: true,
    },
  });

  const ranked = candidates
    .map((c) => ({
      userId: c.id,
      displayName: c.displayName,
      tags: c.tags,
      worldIdVerified: c.worldIdVerified,
      similarityScore: Math.round(
        cosineSimilarity(me.tagVector!, c.tagVector!) * 100
      ),
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const start = (page - 1) * limit;

  res.json(ranked.slice(start, start + limit));
});

// Feed: get ranked candidates with their latest 5 reels
router.get("/feed", authMiddleware, async (req: AuthRequest, res: Response) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!me || !me.tagVector) {
    res.status(400).json({ error: "Complete onboarding first" });
    return;
  }

  // Users we already fully liked (via Like model) should be excluded
  const likedIds = (
    await prisma.like.findMany({
      where: { likerId: me.id },
      select: { likeeId: true },
    })
  ).map((l) => l.likeeId);

  // Users already scrolled past
  const seenIds = (
    await prisma.seenUser.findMany({
      where: { viewerId: me.id },
      select: { seenId: true },
    })
  ).map((s) => s.seenId);

  const verifiedOnly = req.query.verifiedOnly === "true";

  const candidates = await prisma.user.findMany({
    where: {
      onboarded: true,
      id: { notIn: [me.id, ...likedIds, ...seenIds] },
      tagVector: { not: null },
      ...(verifiedOnly ? { worldIdVerified: true } : {}),
    },
    select: {
      id: true,
      displayName: true,
      igUsername: true,
      tags: true,
      tagVector: true,
      worldIdVerified: true,
      reelViews: {
        orderBy: { viewedAt: "desc" },
        take: 5,
        select: { reelId: true, videoUrl: true },
      },
    },
  });

  // Only include candidates that have reels
  const withReels = candidates.filter((c) => c.reelViews.length > 0);

  const ranked = withReels
    .map((c) => ({
      userId: c.id,
      displayName: c.displayName,
      igUsername: c.igUsername,
      tags: c.tags,
      worldIdVerified: c.worldIdVerified,
      similarityScore: Math.round(
        cosineSimilarity(me.tagVector!, c.tagVector!) * 100
      ),
      reels: c.reelViews.map((r) => ({
        reelId: r.reelId,
        videoUrl: r.videoUrl,
      })),
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);

  // Also fetch which reels the current user already liked
  const myReelLikes = await prisma.reelLike.findMany({
    where: { likerId: me.id },
    select: { reelId: true },
  });
  const likedReelIds = myReelLikes.map((r) => r.reelId);

  res.json({
    feed: ranked,
    likedReelIds,
    likeThreshold: me.likeThreshold,
  });
});

// Like a specific reel, auto-create Like if threshold met
router.post(
  "/reel-like",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { reelId, ownerId } = req.body;
    if (!reelId || !ownerId) {
      res.status(400).json({ error: "reelId and ownerId are required" });
      return;
    }
    if (ownerId === req.userId) {
      res.status(400).json({ error: "Cannot like your own reel" });
      return;
    }

    // Run the entire like-threshold check in a transaction to prevent race conditions
    const { likeCount, threshold, personLiked, mutual } =
      await prisma.$transaction(async (tx) => {
        // Upsert the reel like
        await tx.reelLike.upsert({
          where: { likerId_reelId: { likerId: req.userId!, reelId } },
          create: { likerId: req.userId!, ownerId, reelId },
          update: {},
        });

        // Count how many of this owner's reels the user has liked
        const likeCount = await tx.reelLike.count({
          where: { likerId: req.userId!, ownerId },
        });

        // Get the user's like threshold
        const me = await tx.user.findUnique({
          where: { id: req.userId! },
          select: { likeThreshold: true },
        });
        const threshold = me?.likeThreshold ?? 3;

        let personLiked = false;
        let mutual = false;

        if (likeCount >= threshold) {
          // Auto-create a Like for the person
          await tx.like.upsert({
            where: {
              likerId_likeeId: { likerId: req.userId!, likeeId: ownerId },
            },
            create: { likerId: req.userId!, likeeId: ownerId },
            update: {},
          });
          personLiked = true;

          // Check if mutual
          const reverseLike = await tx.like.findUnique({
            where: {
              likerId_likeeId: { likerId: ownerId, likeeId: req.userId! },
            },
          });
          mutual = !!reverseLike;
        }

        return { likeCount, threshold, personLiked, mutual };
      });

    // Get owner info for match popup
    let matchInfo = null;
    if (mutual) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { displayName: true, igUsername: true },
      });
      matchInfo = owner;
    }

    res.json({ likeCount, threshold, personLiked, mutual, matchInfo });
  }
);

// Unlike a reel
router.post(
  "/reel-unlike",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { reelId } = req.body;
    if (!reelId) {
      res.status(400).json({ error: "reelId is required" });
      return;
    }

    await prisma.reelLike.deleteMany({
      where: { likerId: req.userId!, reelId },
    });

    res.json({ unliked: true });
  }
);

// Original like endpoint
router.post(
  "/like",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { likeeId } = req.body;
    if (!likeeId) {
      res.status(400).json({ error: "likeeId is required" });
      return;
    }

    if (likeeId === req.userId) {
      res.status(400).json({ error: "Cannot like yourself" });
      return;
    }

    await prisma.like.upsert({
      where: {
        likerId_likeeId: { likerId: req.userId!, likeeId },
      },
      create: { likerId: req.userId!, likeeId },
      update: {},
    });

    const mutual = await prisma.like.findUnique({
      where: {
        likerId_likeeId: { likerId: likeeId, likeeId: req.userId! },
      },
    });

    res.json({ liked: true, mutual: !!mutual });
  }
);

// Mark a user as seen / scrolled past
router.post(
  "/seen",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { seenId } = req.body;
    if (typeof seenId !== "number") {
      res.status(400).json({ error: "seenId is required" });
      return;
    }
    if (seenId === req.userId) {
      res.status(400).json({ error: "Cannot mark yourself as seen" });
      return;
    }

    await prisma.seenUser.upsert({
      where: { viewerId_seenId: { viewerId: req.userId!, seenId } },
      create: { viewerId: req.userId!, seenId },
      update: {},
    });

    res.json({ seen: true });
  }
);

// Update like threshold setting
router.post(
  "/settings",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const { likeThreshold } = req.body;
    if (typeof likeThreshold !== "number" || likeThreshold < 1 || likeThreshold > 5) {
      res.status(400).json({ error: "likeThreshold must be 1-5" });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: { likeThreshold },
    });

    res.json({ likeThreshold });
  }
);

export default router;
