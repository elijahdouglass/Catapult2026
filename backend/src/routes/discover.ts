import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import { cosineSimilarity } from "../services/similarity";

const router = Router();

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

  const candidates = await prisma.user.findMany({
    where: {
      onboarded: true,
      id: { notIn: [me.id, ...likedIds] },
      tagVector: { not: null },
    },
    select: {
      id: true,
      displayName: true,
      tags: true,
      tagVector: true,
    },
  });

  const ranked = candidates
    .map((c) => ({
      userId: c.id,
      displayName: c.displayName,
      tags: c.tags,
      similarityScore: Math.round(
        cosineSimilarity(me.tagVector!, c.tagVector!) * 100
      ),
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const start = (page - 1) * limit;

  res.json(ranked.slice(start, start + limit));
});

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

export default router;
