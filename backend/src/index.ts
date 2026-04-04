import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";
import onboardingRoutes from "./routes/onboarding";
import discoverRoutes from "./routes/discover";
import matchesRoutes from "./routes/matches";
import reelsRoutes from "./routes/reels";
import videoRoutes from "./routes/video";

const app = express();
const PORT = process.env.PORT || 3001;

const CHROME_EXTENSION_ID = process.env.CHROME_EXTENSION_ID || "";

const allowedOrigins = [
  process.env.CORS_ORIGIN || "http://localhost:5173",
  ...(CHROME_EXTENSION_ID
    ? [`chrome-extension://${CHROME_EXTENSION_ID}`]
    : []),
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.some((o) => o === origin || (o.includes("*") && origin?.startsWith(o.replace("*", ""))))) {
        callback(null, true);
      } else if (process.env.NODE_ENV === "production") {
        callback(new Error("Not allowed by CORS"));
      } else {
        console.warn(`CORS: allowing unlisted origin in dev: ${origin}`);
        callback(null, true);
      }
    },
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/reels", reelsRoutes);
app.use("/api/video", videoRoutes);

app.listen(PORT, () => {
  console.log(`Reel Rizz backend running on http://localhost:${PORT}`);
});
