import { Router, Response, Request } from "express";

const router = Router();

const DOWNLOADER_BASE = process.env.VIDEO_DOWNLOADER_URL || "http://localhost:3000";

router.get("/", async (req: Request, res: Response) => {
  const postUrl = req.query.postUrl as string;
  if (!postUrl) {
    res.status(400).json({ error: "postUrl query parameter is required" });
    return;
  }

  try {
    const response = await fetch(
      `${DOWNLOADER_BASE}/api/video?postUrl=${encodeURIComponent(postUrl)}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Video proxy error:", error);
    res.status(502).json({ error: "Failed to fetch video" });
  }
});

export default router;
