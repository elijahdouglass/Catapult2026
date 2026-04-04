import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

router.post("/view", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { reelId } = req.body;

  if (!reelId || typeof reelId !== "string") {
    res.status(400).json({ error: "reelId is required" });
    return;
  }

  try {
    const reelView = await prisma.reelView.upsert({
      where: { userId_reelId: { userId, reelId } },
      update: { viewedAt: new Date() },
      create: { userId, reelId },
    });

    res.json({ ok: true, reelView });
  } catch (error) {
    console.error("Failed to record reel view:", error);
    res.status(500).json({ error: "Failed to record view" });
  }
});

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const cursor = Number(req.query.cursor) || undefined;

  try {
    const views = await prisma.reelView.findMany({
      where: { userId },
      orderBy: { viewedAt: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = views.length > limit;
    const results = hasMore ? views.slice(0, limit) : views;
    const nextCursor = hasMore ? results[results.length - 1].id : undefined;

    res.json({ views: results, nextCursor });
  } catch (error) {
    console.error("Failed to fetch reel views:", error);
    res.status(500).json({ error: "Failed to fetch views" });
  }
});

export default router;
