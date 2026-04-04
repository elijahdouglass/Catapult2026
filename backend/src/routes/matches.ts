import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import { cosineSimilarity } from "../services/similarity";

const router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const me = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Find users I liked
  const myLikes = await prisma.like.findMany({
    where: { likerId: me.id },
    select: { likeeId: true },
  });
  const myLikedIds = myLikes.map((l) => l.likeeId);

  if (myLikedIds.length === 0) {
    res.json([]);
    return;
  }

  // Find which of those liked me back
  const mutualLikes = await prisma.like.findMany({
    where: {
      likerId: { in: myLikedIds },
      likeeId: me.id,
    },
    select: { likerId: true },
  });
  const mutualIds = mutualLikes.map((l) => l.likerId);

  if (mutualIds.length === 0) {
    res.json([]);
    return;
  }

  const matches = await prisma.user.findMany({
    where: { id: { in: mutualIds } },
    select: {
      id: true,
      displayName: true,
      igUsername: true,
      tags: true,
      tagVector: true,
    },
  });

  const result = matches.map((m) => ({
    userId: m.id,
    displayName: m.displayName,
    igUsername: m.igUsername,
    tags: m.tags,
    similarityScore:
      me.tagVector && m.tagVector
        ? Math.round(cosineSimilarity(me.tagVector, m.tagVector) * 100) || 0
        : 0,
  }));

  res.json(result);
});

export default router;
