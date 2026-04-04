import { Router, Response, Request } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const DOWNLOADER_BASE =
  process.env.VIDEO_DOWNLOADER_URL || "http://localhost:3000";

const ALLOWED_HOSTS = ["instagram.com", "www.instagram.com"];

function isAllowedUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      ALLOWED_HOSTS.includes(url.hostname)
    );
  } catch {
    return false;
  }
}

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const postUrl = req.query.postUrl as string;
  if (!postUrl) {
    res.status(400).json({ error: "postUrl query parameter is required" });
    return;
  }

  if (!isAllowedUrl(postUrl)) {
    res.status(400).json({ error: "Only Instagram URLs are allowed" });
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
