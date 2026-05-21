import { Router, Response } from "express";
import { signRequest } from "@worldcoin/idkit-server";
import { authMiddleware, AuthRequest, verifyClerkSessionToken } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

const WORLD_ID_APP_ID = process.env.WORLD_ID_APP_ID;
const WORLD_ID_RP_ID = process.env.WORLD_ID_RP_ID;
const WORLD_ID_RP_SIGNING_KEY = process.env.WORLD_ID_RP_SIGNING_KEY;
const ACTION = "verify-human";

// Serve a standalone verification page for the mobile app.
// Opens in SFSafariViewController so IDKit deep-links to World App work.
// Accept token from query param for browser-based access (SFSafariViewController can't set headers)
router.get("/verify-page", async (req: AuthRequest, res: Response) => {
  const token = (req.query.token as string) || req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).send("Missing token");
    return;
  }
  // Verify Clerk session token so we don't need the header-based middleware
  const userId = await verifyClerkSessionToken(token);
  if (!userId) {
    res.status(401).send("Invalid token");
    return;
  }
  req.userId = userId;
  if (!WORLD_ID_APP_ID || !WORLD_ID_RP_ID || !WORLD_ID_RP_SIGNING_KEY) {
    res.status(503).send("World ID not configured");
    return;
  }

  const { sig, nonce, createdAt, expiresAt } = signRequest({
    signingKeyHex: WORLD_ID_RP_SIGNING_KEY,
    action: ACTION,
    ttl: 300,
  });

  const tokenVal = (req.query.token as string) || req.headers.authorization?.replace("Bearer ", "") || "";

  const apiBase = `${req.protocol}://${req.get("host")}`;

  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify with World ID</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0d0d12; color: #f0e6db;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; padding: 24px;
    }
    .card {
      background: rgba(25,25,35,0.95); border-radius: 24px;
      padding: 32px; text-align: center; max-width: 400px; width: 100%;
      border: 1px solid rgba(255,255,255,0.06);
    }
    h2 { font-size: 22px; margin-bottom: 8px; }
    .sub { color: #999; font-size: 14px; margin-bottom: 24px; line-height: 1.4; }
    .status { color: #22c55e; font-size: 16px; font-weight: 600; margin: 16px 0; }
    .error { color: #f43f5e; }
    .spinner { width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #f43f5e; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 16px auto; }
    @keyframes spin { to { transform: rotate(360deg); } }
    #root { width: 100%; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Verify with World ID</h2>
    <p class="sub">Prove you're a real human to get a verified badge.</p>
    <div id="root"><div class="spinner"></div><p class="sub">Loading verification...</p></div>
  </div>

  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@19.1.0",
      "react/jsx-runtime": "https://esm.sh/react@19.1.0/jsx-runtime",
      "react-dom": "https://esm.sh/react-dom@19.1.0",
      "react-dom/client": "https://esm.sh/react-dom@19.1.0/client",
      "@worldcoin/idkit": "https://esm.sh/@worldcoin/idkit@4.0.11?external=react,react-dom"
    }
  }
  </script>
  <script type="module">
    import { createElement } from "react";
    import { createRoot } from "react-dom/client";
    import { IDKitRequestWidget, orbLegacy } from "@worldcoin/idkit";

    const TOKEN = ${JSON.stringify(tokenVal)};
    const API_BASE = ${JSON.stringify(apiBase)};
    const rpContext = ${JSON.stringify({ rp_id: WORLD_ID_RP_ID, nonce, created_at: createdAt, expires_at: expiresAt, signature: sig })};

    const root = createRoot(document.getElementById("root"));

    function Status({ text, isError }) {
      return createElement("p", { className: isError ? "sub error" : "status" }, text);
    }

    async function handleVerify(result) {
      document.getElementById("root").innerHTML = '<div class="spinner"></div><p class="sub">Verifying proof...</p>';
      const res = await fetch(API_BASE + "/api/worldid/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + TOKEN },
        body: JSON.stringify(result),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        root.render(createElement(Status, { text: err.error || "Verification failed", isError: true }));
        return;
      }
    }

    function onSuccess() {
      root.render(createElement(Status, { text: "\\u2705 Verified! You can close this page." }));
    }

    function onError(code) {
      root.render(createElement(Status, { text: "Error: " + code, isError: true }));
    }

    root.render(createElement(IDKitRequestWidget, {
      open: true,
      onOpenChange: () => {},
      app_id: ${JSON.stringify(WORLD_ID_APP_ID)},
      action: ${JSON.stringify(ACTION)},
      rp_context: rpContext,
      allow_legacy_proofs: true,
      preset: orbLegacy({}),
      handleVerify,
      onSuccess,
      onError,
    }));
  </script>
</body>
</html>`);
});

router.get(
  "/rp-signature",
  authMiddleware,
  async (_req: AuthRequest, res: Response) => {
    if (!WORLD_ID_APP_ID || !WORLD_ID_RP_ID || !WORLD_ID_RP_SIGNING_KEY) {
      res.status(503).json({ error: "World ID not configured" });
      return;
    }

    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: WORLD_ID_RP_SIGNING_KEY,
      action: ACTION,
      ttl: 300,
    });

    res.json({
      app_id: WORLD_ID_APP_ID,
      action: ACTION,
      rp_context: {
        rp_id: WORLD_ID_RP_ID,
        nonce,
        created_at: createdAt,
        expires_at: expiresAt,
        signature: sig,
      },
    });
  }
);

router.post(
  "/verify",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    if (!WORLD_ID_RP_ID) {
      res.status(503).json({ error: "World ID not configured" });
      return;
    }

    const proof = req.body;

    // Forward proof to World ID verify API
    const verifyRes = await fetch(
      `https://developer.world.org/api/v4/verify/${WORLD_ID_RP_ID}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proof),
      }
    );

    const verifyData = (await verifyRes.json()) as {
      success?: boolean;
      detail?: string;
      code?: string;
      nullifier?: string;
      results?: { nullifier?: string }[];
    };

    if (!verifyRes.ok || !verifyData.success) {
      res.status(400).json({
        error: "Verification failed",
        detail: verifyData.detail || verifyData.code,
      });
      return;
    }

    // Extract nullifier from the first response item
    const nullifier =
      proof.responses?.[0]?.nullifier ||
      verifyData.nullifier ||
      verifyData.results?.[0]?.nullifier;

    if (nullifier) {
      // Check if this World ID is already linked to another account
      const existing = await prisma.user.findUnique({
        where: { worldIdNullifier: nullifier },
      });
      if (existing && existing.id !== req.userId!) {
        res.status(409).json({
          error: "This World ID is already linked to another account",
        });
        return;
      }
    }

    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        worldIdVerified: true,
        worldIdNullifier: nullifier || null,
      },
    });

    res.json({ verified: true });
  }
);

export default router;
