import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import { extractTags } from "../services/ocr";
import { computeTagVector } from "../services/similarity";

const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve(__dirname, "../../uploads"),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

const router = Router();

router.post(
  "/",
  authMiddleware,
  upload.single("screenshot"),
  async (req: AuthRequest, res: Response) => {
    const { igUsername } = req.body;
    if (!igUsername) {
      res.status(400).json({ error: "Instagram username is required" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Screenshot is required" });
      return;
    }

    try {
      const tagsRaw = await extractTags(req.file.path);
      const tagList = tagsRaw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const tagVector = await computeTagVector(tagList);

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: {
          igUsername,
          tags: tagList.join(", "),
          tagVector: new Uint8Array(tagVector.buffer as ArrayBuffer),
          screenshotPath: req.file.filename,
          onboarded: true,
        },
      });

      res.json({
        tags: tagList,
        user: {
          id: user.id,
          displayName: user.displayName,
          onboarded: user.onboarded,
          igUsername: user.igUsername,
          tags: user.tags,
        },
      });
    } catch (err: any) {
      console.error("Onboarding error:", err);
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      res.status(500).json({ error: "Onboarding failed" });
    }
  }
);

export default router;
