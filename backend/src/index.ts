import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";
import onboardingRoutes from "./routes/onboarding";
import discoverRoutes from "./routes/discover";
import matchesRoutes from "./routes/matches";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/matches", matchesRoutes);

app.listen(PORT, () => {
  console.log(`Reel Rizz backend running on http://localhost:${PORT}`);
});
