# Reel Rizz

A dating app that matches people based on the Instagram reels they've watched. A Chrome extension scrapes reels from a user's Instagram feed, OCR pulls topic tags out of the video frames, and those tags are embedded into a vector that drives discovery and matching.

Built for Catapult 2026 at Purdue.

## Stack

- **Languages:** TypeScript, Python
- **Backend:** Node + Express, Prisma, MySQL
- **Web:** React 19 + Vite
- **Mobile:** React Native + Expo Router
- **Chrome extension:** React + Vite (CRX)
- **OCR / embeddings:** Tesseract + sentence-transformers
- **Auth:** Clerk (managed; Instagram OAuth, social, magic links) + Worldcoin IDKit for proof of personhood
- Runs entirely on localhost — no hosting.

## Components

### `backend/`
Express API on `http://localhost:3001`. Routes: `auth`, `onboarding`, `discover`, `matches`, `reels`, `video`, `webhook`, `worldid`. Stores users, likes, reel views and reel-likes in MySQL via Prisma. Spawns the Python OCR script in `test/` to extract tags from uploaded screenshots, then computes similarity for discovery.

### `frontend/`
Vite + React 19 web client. Onboarding, discovery feed, matches, World ID verification.

### `reel-rizz-app/`
Expo / React Native mobile version of the client. Same flows as the web app, plus video playback via `expo-video`.

### `reel-rizz-reader/`
Chrome extension that runs on instagram.com and pulls reels the user has watched, sending them to the backend. CORS on the backend whitelists the extension ID.

### `Instagram-reels-downloader/`
Git submodule (Next.js) used as a fallback for fetching reel media outside the extension.

### `test/`
Python OCR pipeline (`tesseract_test.py`, `word_sim_test.py`). Invoked as a subprocess by `backend/src/services/ocr.ts` — finds text bubbles in a reel screenshot, runs Tesseract, and returns tag text the backend embeds.

## Prerequisites

- Node ≥ 18 (recommended 20+)
- Python ≥ 3.11
- MySQL 8 running locally
- [Tesseract](https://github.com/tesseract-ocr/tesseract) — `brew install tesseract` on macOS
- [uv](https://github.com/astral-sh/uv) or `pip` for the Python deps
- Expo CLI (installed via `npx`) for the mobile app
- Google Chrome for the extension

## Setup

Clone with submodules:

```bash
git clone --recurse-submodules <repo-url>
cd Catapult2026
```

### 1. Database

Create a MySQL database named `reelrizz` and update `backend/.env` with your connection string. An example `.env` is already in the repo for local dev.

### 1b. Clerk

Auth is handled by [Clerk](https://clerk.com). Create a free Clerk application, then set in `backend/.env`:

```
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

In the Clerk dashboard, add a webhook pointing at `http://<your-tunnel>/api/clerk/webhook` (use ngrok or similar for local dev) and subscribe to `user.created`, `user.updated`, and `user.deleted` events. Copy the signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`. The backend syncs Clerk identity into the local `User` table on first authenticated request and via this webhook.

Each frontend needs the **publishable** key too. Copy the matching `.env.example` to `.env` in each package and fill in:

- `frontend/.env` — `VITE_CLERK_PUBLISHABLE_KEY`
- `reel-rizz-app/.env` — `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `reel-rizz-reader/.env` — `VITE_CLERK_PUBLISHABLE_KEY` (and optionally `VITE_CLERK_SYNC_HOST` to share a session with the web app)

The Chrome extension also needs a **stable extension ID** — add a Chrome Extension app in the Clerk dashboard, copy the manifest `key` it gives you, and export it as `CRX_KEY` before `npm run build` so the manifest pins the ID Clerk has whitelisted.

### 2. Python OCR env

From the repo root:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install numpy pillow pytesseract sentence-transformers scikit-learn
```

The backend expects the venv at `./.venv/bin/python3` (see `backend/src/services/ocr.ts`).

### 3. Backend

```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed   # optional, seeds demo users
npm run dev
```

Server: `http://localhost:3001`.

### 4. Web frontend

```bash
cd frontend
npm install
npm run dev
```

Web app: `http://localhost:5173`.

### 5. Mobile app (optional)

```bash
cd reel-rizz-app
npm install
npx expo start
```

Then open with Expo Go, an iOS simulator, or an Android emulator.

### 6. Chrome extension

```bash
cd reel-rizz-reader
npm install
npm run build
```

Load `reel-rizz-reader/build/` as an unpacked extension at `chrome://extensions`. Copy the resulting extension ID into `backend/.env` as `CHROME_EXTENSION_ID` and restart the backend so CORS allows it.

## Running the whole thing

In separate terminals: `backend` (`npm run dev`), `frontend` (`npm run dev`), Chrome with the extension loaded, and optionally `reel-rizz-app` via Expo. MySQL must be up before the backend starts.
