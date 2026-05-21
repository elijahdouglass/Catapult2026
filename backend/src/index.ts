import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { clerkMiddleware } from "@clerk/express";
import authRoutes from "./routes/auth";
import onboardingRoutes from "./routes/onboarding";
import discoverRoutes from "./routes/discover";
import matchesRoutes from "./routes/matches";
import reelsRoutes from "./routes/reels";
import videoRoutes from "./routes/video";
import webhookRoutes from "./routes/webhook";
import worldidRoutes from "./routes/worldid";
import clerkWebhookRoutes from "./routes/clerkWebhook";

if (!process.env.CLERK_SECRET_KEY || !process.env.CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    "CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY environment variables are required"
  );
}

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
// Clerk webhook needs the raw request body for Svix signature verification,
// so it's mounted before the JSON parser with its own raw body parser.
app.use(
  "/api/clerk/webhook",
  express.raw({ type: "application/json" }),
  clerkWebhookRoutes
);

app.use(express.json());
app.use(clerkMiddleware());

app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/reels", reelsRoutes);
app.use("/api/video", videoRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/worldid", worldidRoutes);

app.listen(PORT, () => {
  console.log(`Reel Rizz backend running on http://localhost:${PORT}`);
});
