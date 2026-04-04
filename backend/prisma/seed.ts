import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "password123";

// Real reel IDs captured from the database
const REEL_IDS = [
  "DSav-IDj4yT", "DTA-jf1joEp", "DTd95USEmj5", "DTdgPtjDN9N", "DTEaEFDD2tc",
  "DTX73wFDb-_", "DU_7ebPDDxM", "DU806HykT47", "DUBGz7zjlLe", "DUqvOljkZP2",
  "DUR9wz2jt8j", "DUrF2HgAsL0", "DV1pAcbgBui", "DV6Mq2YDy2P", "DV8fiQAkbcD",
  "DVb-TG2Dmo9", "DVbKzbsjp7M", "DVcp72Zghms", "DVhn3EQDasd", "DVJ7ztrEf0W",
  "DVmRTUIErgm", "DVof8NZCLOo", "DVRbcWYFK1u", "DVrfa94kprs", "DVVDo0vEe9z",
  "DVWue1pEV6d", "DVwvCV7iQ16", "DVXSZKQjXD7", "DWAT4FRkRRL", "DWb8Jn0EWT9",
  "DWgWopxD-Sw", "DWHZTXngIGw", "DWkEaH6ER0F", "DWkmy6TTqX6", "DWlsG3UDESp",
  "DWmtPVdxBXt", "DWpHXHnkeEb", "DWrCCzHjfzR", "DWrIQmUEYT4", "DWrTkREEU8L",
  "DWrToWdEZDN", "DWSCVbkktlH", "DWSR3h-gWOf", "DWsV9KXxnPt", "DWYD_tNkfem",
];

const users = [
  { email: "jake_fitguy@test.com", displayName: "Jake Fitness", igUsername: "jake_fitguy", tags: "Fitness, Gym motivation, Workout routines, Meal prep, Protein shakes, CrossFit, Running, Yoga", likeThreshold: 3 },
  { email: "maya_gamer@test.com", displayName: "Maya Gamer", igUsername: "maya_plays", tags: "Gaming, Esports, Twitch streams, Valorant, Minecraft builds, Speedruns, Game mods, Retro gaming", likeThreshold: 4 },
  { email: "sofia_style@test.com", displayName: "Sofia Style", igUsername: "sofiastyle_", tags: "Fashion, Streetwear, Thrift hauls, Sneaker culture, Outfit ideas, Vintage fashion, Accessories, Style tips", likeThreshold: 2 },
  { email: "liam_cooks@test.com", displayName: "Liam Cooks", igUsername: "liam_kitchen", tags: "Cooking, Baking, Food photography, Recipe hacks, Ramen, Korean BBQ, Vegan recipes, Meal prep", likeThreshold: 3 },
  { email: "emma_wanders@test.com", displayName: "Emma Wanders", igUsername: "emma.wanders", tags: "Travel, Backpacking, Road trips, Beach vibes, City exploration, Hiking trails, Photography, Sunsets", likeThreshold: 5 },
  { email: "noah_beats@test.com", displayName: "Noah Beats", igUsername: "noah_muzik", tags: "Music production, Guitar covers, Beatmaking, Vinyl collecting, Lo-fi beats, Hip hop, Jazz, Indie rock", likeThreshold: 3 },
  { email: "aiko_otaku@test.com", displayName: "Aiko Anime", igUsername: "aiko_otaku", tags: "Anime, Manga, Cosplay, Studio Ghibli, One Piece fan art, Jujutsu Kaisen, Anime edits, Figure collecting", likeThreshold: 2 },
  { email: "dev_marcus@test.com", displayName: "Marcus Dev", igUsername: "marcus_codes", tags: "Tech reviews, Programming, AI news, Gadgets, Mechanical keyboards, Linux, Web development, Startups", likeThreshold: 4 },
  { email: "luna_artsy@test.com", displayName: "Luna Artsy", igUsername: "luna.draws", tags: "Art, Digital illustration, Watercolor, Sketching, Procreate tutorials, Abstract art, Gallery visits, Art history", likeThreshold: 3 },
];

// Each user gets 5 specific reels from the pool (deterministic slices)
const USER_REELS: string[][] = [
  /* Jake     */ REEL_IDS.slice(0, 5),
  /* Maya     */ REEL_IDS.slice(5, 10),
  /* Sofia    */ REEL_IDS.slice(10, 15),
  /* Liam     */ REEL_IDS.slice(15, 20),
  /* Emma     */ REEL_IDS.slice(20, 25),
  /* Noah     */ REEL_IDS.slice(25, 30),
  /* Aiko     */ REEL_IDS.slice(30, 35),
  /* Marcus   */ REEL_IDS.slice(35, 40),
  /* Luna     */ REEL_IDS.slice(40, 45),
];

// Cross-user reel likes: [likerIdx, ownerIdx, reel index within owner's 5]
const REEL_LIKE_PATTERNS: [number, number, number][] = [
  [0, 1, 0], [0, 1, 2], [0, 6, 1],
  [1, 0, 0], [1, 0, 3], [1, 2, 4],
  [2, 3, 1], [2, 3, 3], [2, 5, 0],
  [3, 4, 0], [3, 4, 2], [3, 8, 4],
  [4, 5, 1], [4, 5, 3],
  [5, 6, 0], [5, 6, 2], [5, 7, 1],
  [6, 0, 1], [6, 0, 4], [6, 7, 3],
  [7, 8, 0], [7, 8, 2], [7, 1, 1],
  [8, 2, 0], [8, 2, 3], [8, 4, 2],
];

const MUTUAL_PAIRS: [number, number][] = [
  [0, 6], // Jake <-> Aiko
  [2, 3], // Sofia <-> Liam
  [7, 8], // Marcus <-> Luna
];

const ONE_WAY_LIKES: [number, number][] = [
  [1, 5], // Maya -> Noah
  [4, 2], // Emma -> Sofia
  [5, 3], // Noah -> Liam
];

async function main() {
  console.log("Seeding database...");

  // Compute tag vectors via the existing python pipeline
  const { spawn } = await import("child_process");
  const path = await import("path");
  const PYTHON = path.resolve(__dirname, "../../.venv/bin/python3");
  const SCRIPT = path.resolve(__dirname, "../../test/word_sim_test.py");

  function computeTagVector(tags: string[]): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const proc = spawn(PYTHON, [SCRIPT, JSON.stringify(tags)]);
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
      proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
      proc.on("close", (code: number) => {
        if (code !== 0) {
          reject(new Error(`Vector computation failed (code ${code}): ${stderr}`));
        } else {
          const floats: number[] = JSON.parse(stdout.trim());
          const buffer = new ArrayBuffer(floats.length * 4);
          const view = new DataView(buffer);
          floats.forEach((v, i) => view.setFloat32(i * 4, v, true));
          resolve(new Uint8Array(buffer));
        }
      });
    });
  }

  // Create users
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const createdUsers: { id: number; idx: number }[] = [];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const tagList = u.tags.split(", ");
    console.log(`Computing vector for ${u.displayName}...`);
    const tagVector = await computeTagVector(tagList);

    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  Skipping ${u.email} (already exists, id=${existing.id})`);
      createdUsers.push({ id: existing.id, idx: i });
      continue;
    }

    const created = await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        igUsername: u.igUsername,
        tags: u.tags,
        tagVector: new Uint8Array(tagVector.buffer as ArrayBuffer),
        onboarded: true,
        igVerified: true,
        likeThreshold: u.likeThreshold,
      },
    });
    console.log(`  Created ${u.displayName} (id=${created.id})`);
    createdUsers.push({ id: created.id, idx: i });
  }

  // Assign each user their fixed set of reels
  console.log("\nAssigning reels to users...");
  for (let i = 0; i < createdUsers.length; i++) {
    const userId = createdUsers[i].id;
    const reels = USER_REELS[i];

    for (let j = 0; j < reels.length; j++) {
      const daysAgo = j * 3 + 1; // deterministic spacing: 1, 4, 7, 10, 13 days ago
      const viewedAt = new Date(Date.now() - daysAgo * 24 * 3600000);

      await prisma.reelView.upsert({
        where: { userId_reelId: { userId, reelId: reels[j] } },
        update: {},
        create: { userId, reelId: reels[j], viewedAt },
      });
    }
    console.log(`  ${users[i].displayName}: ${reels.length} reels`);
  }

  // Cross-user reel likes
  console.log("\nCreating reel likes...");
  for (const [likerIdx, ownerIdx, reelOff] of REEL_LIKE_PATTERNS) {
    const likerId = createdUsers[likerIdx].id;
    const ownerId = createdUsers[ownerIdx].id;
    const reelId = USER_REELS[ownerIdx][reelOff];

    await prisma.reelLike.upsert({
      where: { likerId_reelId: { likerId, reelId } },
      update: {},
      create: { likerId, ownerId, reelId },
    });
  }
  console.log(`  Created ${REEL_LIKE_PATTERNS.length} reel likes`);

  // Mutual matches
  console.log("\nCreating mutual likes (matches)...");
  for (const [a, b] of MUTUAL_PAIRS) {
    const idA = createdUsers[a].id;
    const idB = createdUsers[b].id;
    await prisma.like.upsert({
      where: { likerId_likeeId: { likerId: idA, likeeId: idB } },
      update: {},
      create: { likerId: idA, likeeId: idB },
    });
    await prisma.like.upsert({
      where: { likerId_likeeId: { likerId: idB, likeeId: idA } },
      update: {},
      create: { likerId: idB, likeeId: idA },
    });
    console.log(`  ${users[a].displayName} <-> ${users[b].displayName}`);
  }

  // One-way likes
  console.log("\nCreating one-way likes...");
  for (const [a, b] of ONE_WAY_LIKES) {
    const idA = createdUsers[a].id;
    const idB = createdUsers[b].id;
    await prisma.like.upsert({
      where: { likerId_likeeId: { likerId: idA, likeeId: idB } },
      update: {},
      create: { likerId: idA, likeeId: idB },
    });
    console.log(`  ${users[a].displayName} -> ${users[b].displayName}`);
  }

  console.log("\nSeed complete!");
  console.log(`  ${createdUsers.length} users`);
  console.log(`  ${createdUsers.length * 5} reel views`);
  console.log(`  ${REEL_LIKE_PATTERNS.length} reel likes`);
  console.log(`  ${MUTUAL_PAIRS.length} mutual matches, ${ONE_WAY_LIKES.length} one-way likes`);
  console.log(`  All users password: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
