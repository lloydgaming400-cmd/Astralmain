import pkg from 'whatsapp-web.js';
import fetch from 'node-fetch';
const { Client, LocalAuth, MessageMedia } = pkg;
type Message = pkg.Message;
import { storage } from './storage';
import { type User, type Card, type Sect } from '@shared/schema';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export let currentQrCode: string | undefined;
export let connectionStatus: "CONNECTED" | "DISCONNECTED" | "WAITING_FOR_QR" = "DISCONNECTED";

const OWNER_NUMBER = "2347062301848@c.us";

const HELP_MENU = `╭══════════════════════════╮
   ✦┊　🌌  ASTRAL BOT  🌌　┊✦
╰══════════════════════════╯
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Greetings, Cultivator! ✨
  Astral Bot is your path to
  ascension — collect spirit
  cards, climb the ranks, and
  forge your legacy in the realm.
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🃏 Collect rare anime cards
  🏅 Rank up & gain glory
  ⚔️  Join a sect & conquer
  📜 Respect the sacred laws
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Before you begin:
  📜 !rules  ↳ view the sacred laws
  📖 !scroll ↳ view all commands
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Your ascension begins with
  one step, Cultivator.
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼
╰══════════════════════════╯`;

const SCROLL_MENU = `╭══════════════════════╮
   ✦┊【Ａｗａｋｅｎｉｎｇ】┊✦
╰══════════════════════╯
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  📊 PROFILE & STATS
  📈 !status  ↳ quick status
  👤 !profile ↳ full profile
  🏆 !leaderboard ↳ top cultivators
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🛒 SHOP & ITEMS
  🏪 !shop ↳ view shop
  🛍️ !buy [item] ↳ purchase item
  🎒 !inventory ↳ view items
  🎒 !useitem [num] ↳ use item
  🤝 !giveitem [num] ↳ give item (reply)
  💰 !givexp [amt] ↳ give XP (reply)
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🎴 CARDS
  🎁 !getcard ↳ daily claim
  📚 !cardcollection ↳ view cards
  🔍 !card [num] ↳ view card info
  🤝 !givecard [num] ↳ trade card (reply)
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🏯 SECT
  🚪 !joinsect [name] ↳ join a sect
  🏯 !mysect ↳ view sect details
  💰 !donate [amount] ↳ donate XP
  📊 !sectranking ↳ sect leaderboard
  🚶 !sectleave ↳ leave your sect
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👼 SURVIVAL
  🕊️ !revive ↳ revive fallen ally (reply)
  🦷 !suck ↳ drain XP (vampire, reply)
  🏳️ !forfeit ↳ surrender a battle
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  💞 GUIDES
  🙋 !getguide ↳ claim your guide
  💬 !talkguide ↳ talk to your guide
  💋 !smashmyguide ↳ ...you know
  👶 !namechild [name] ↳ name your child
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👼 SURVIVAL
  🕊️ !revive ↳ revive fallen ally (reply)
  🦷 !suck ↳ drain XP (vampire, reply)
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👑 SECT LEADER ONLY
  🥾 !kickmember [name] ↳ kick member
  ⚡ !punish [name] ↳ punish member
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼
╰══════════════════════╯`;

const SPECIES_XP_RATES: Record<string, number> = {
  "Human": 5,
  "Demon": 10,
  "Beast Clan": 15,
  "Fallen Angel": 20,
  "Undead": 25,
  "Spirit": 30,
  "Elf": 35,
  "Dragon": 40,
  "Celestial": 50,
  "Constellation": 300,
};

const RANKS = [
  { level: 8, name: "Core Disciple of Mid", threshold: 0, messages: 0 },
  { level: 7, name: "Outer Disciple of Low Peak", threshold: 100, messages: 20 },
  { level: 6, name: "Inner Disciple of Mid Peak", threshold: 500, messages: 100 },
  { level: 5, name: "Core Disciple of Peak", threshold: 2000, messages: 400 },
  { level: 4, name: "Celestial Lord", threshold: 10000, messages: 2000 },
  { level: 3, name: "Dao of Heavenly Peak", threshold: 20000, messages: 4000 },
  { level: 2, name: "Supreme Dao Ancestor", threshold: 35000, messages: 6000 },
  { level: 1, name: "True Peak Dao of Astral Realm", threshold: 50000, messages: 10000 },
];

function getRankForXp(xp: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].threshold) return RANKS[i];
  }
  return RANKS[0];
}

const SHOP_ITEMS: Record<string, { price: number; description: string }> = {
  "blood rune": { price: 1000, description: "Steal XP from another user." },
  "eclipse stone": { price: 1200, description: "Hide your race & XP for 24hrs." },
  "phantom seal": { price: 1100, description: "Vanish from the leaderboard for 24hrs." },
  "cursed coin": { price: 200, description: "Unknown outcome. Flip and find out." },
  "mirror shard": { price: 1300, description: "Copy another user's race for 30mins." },
  "vampire tooth": { price: 1500, description: "Become a vampire for a week." },
  "cursed bone": { price: 2000, description: "Attract shadows for permanent protection." },
  "grey rot cure": { price: 500, description: "Cures the Grey Rot. (Human)" },
  "hellfire suppressant": { price: 600, description: "Cures Hellfire Fever. (Demon)" },
  "feral antidote": { price: 600, description: "Cures the Feral Plague. (Beast Clan)" },
  "grace restoration vial": { price: 700, description: "Cures Corruption Blight. (Fallen Angel)" },
  "scale restoration salve": { price: 800, description: "Cures Scale Sickness. (Dragon)" },
  "rootwither remedy": { price: 700, description: "Cures Rootwither. (Elf)" },
  "living core": { price: 2500, description: "Rebirth into a new random species." },
  "dragon egg": { price: 5000, description: "A mysterious egg that feeds on XP." },
  "void fragment": { price: 8000, description: "A fragment of the void. Extremely unstable." },
  "star dust": { price: 3000, description: "Dust from the stars. Grants a temporary domain." },
};

const DISEASES: Record<string, { name: string; race: string; startMsg: string; endMsg: string; cure: string }> = {
  "Human": { name: "The Grey Rot", race: "Human", startMsg: "A deadly disease has spread throughout the Human race. The Grey Rot is consuming them from within.", endMsg: "The Grey Rot has run its course. The Human race can breathe again.", cure: "grey rot cure" },
  "Demon": { name: "Hellfire Fever", race: "Demon", startMsg: "A plague has ignited within the Demon race. Hellfire Fever is burning through their ranks.", endMsg: "The flames have died down. Hellfire Fever has left the Demon race.", cure: "hellfire suppressant" },
  "Beast Clan": { name: "Feral Plague", race: "Beast Clan", startMsg: "A plague has broken loose within the Beast Clan. The Feral Plague is tearing through their kind.", endMsg: "The Feral Plague has been contained. The Beast Clan rises again.", cure: "feral antidote" },
  "Fallen Angel": { name: "Corruption Blight", race: "Fallen Angel", startMsg: "A blight has swept through the Fallen Angel race. Corruption Blight is consuming what little grace they have left.", endMsg: "The Corruption Blight has faded. The Fallen Angels endure once more.", cure: "grace restoration vial" },
  "Dragon": { name: "Scale Sickness", race: "Dragon", startMsg: "A sickness has infected the Dragon race. Scale Sickness is cracking through their legendary hides.", endMsg: "Scale Sickness has passed. The Dragon race stands unbroken.", cure: "scale restoration salve" },
  "Elf": { name: "Rootwither", race: "Elf", startMsg: "A withering has begun among the Elf race. Rootwither is severing their bond with the ancient world.", endMsg: "Rootwither has retreated into the earth. The Elf race is restored.", cure: "rootwither remedy" },
  "Spirit": { name: "Soul Decay", race: "Spirit", startMsg: "A corruption has swept through the Spirit race. Soul Decay is dissolving their very essence.", endMsg: "Soul Decay has dissipated. The Spirit race endures once more.", cure: "soul restoration tonic" }
};

// Jikan API card fetch
async function fetchRandomAnimeCard(): Promise<{ characterId: number; name: string; series: string; rarity: string; imageUrl: string | null }> {
  try {
    const rarityRoll = Math.random();
    const rarity = rarityRoll < 0.05 ? "Legendary" : rarityRoll < 0.15 ? "Epic" : rarityRoll < 0.35 ? "Rare" : rarityRoll < 0.65 ? "Uncommon" : "Common";
    const page = Math.floor(Math.random() * 20) + 1;
    const res = await fetch(`https://api.jikan.moe/v4/characters?page=${page}&limit=25`);
    const data = await res.json() as any;
    if (!data?.data?.length) throw new Error("No data");
    const chars = data.data.filter((c: any) => c.images?.jpg?.image_url);
    const char = chars[Math.floor(Math.random() * chars.length)];
    const series = char.anime?.[0]?.anime?.title || char.manga?.[0]?.manga?.title || "Unknown Series";
    return { characterId: char.mal_id, name: char.name, series, rarity, imageUrl: char.images?.jpg?.image_url || null };
  } catch {
    // fallback if API fails
    const fallback = [
      { characterId: 1, name: "Naruto Uzumaki", series: "Naruto", rarity: "Rare", imageUrl: null },
      { characterId: 2, name: "Luffy", series: "One Piece", rarity: "Epic", imageUrl: null },
      { characterId: 3, name: "Goku", series: "Dragon Ball", rarity: "Legendary", imageUrl: null },
      { characterId: 4, name: "Ichigo", series: "Bleach", rarity: "Rare", imageUrl: null },
      { characterId: 5, name: "Saitama", series: "One Punch Man", rarity: "Legendary", imageUrl: null },
    ];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
}


// ── GUIDE SYSTEM ─────────────────────────────────────────────────────────────

const ANNA = {
  name: "Anna",
  emoji: "🔴",
  image: "attached_assets/Anna.jpg",
  imageWithChild: "attached_assets/Annawithchild.jpg",
  greeting: `*A red-haired girl bursts in, nearly knocking over everything in sight~*

🔴 *Anna:* "OH— you actually called for me?! Heheheh~ I'm Anna! Your guide, your partner, your absolute chaos companion! Let's make history together darling~! 🔥"

Type *!getguide* to claim Anna as your permanent guide!`,
  claimMsg: `*Anna beams at you like you just made the best decision of your life.*

🔴 *Anna:* "You chose ME?! Darling~ I KNEW you had good taste!! Don't worry, I'll take GREAT care of you!! This is forever okay?! No take-backs~! 🔥"`,
  talkResponses: [
    `🔴 *Anna:* "Darling~! I was JUST thinking about you! Are you eating? Training? Smiling?! 😤"`,
    `🔴 *Anna:* "You know, I sorted your inventory in my head while you were gone. Don't ask how. I just did~ 💫"`,
    `🔴 *Anna:* "Ohhh you came to talk to me! Best decision of your LIFE darling, truly~! 🥰"`,
    `🔴 *Anna:* "I found THREE rare herbs today! ...I ate one. It was delicious. The other two are yours~ 🌿"`,
    `🔴 *Anna:* "You better be ranking up out there! I didn't sign up to guide someone mediocre~ Just kidding. Maybe. 😏"`,
    `🔴 *Anna:* "Sometimes I watch you from a distance and think... yeah. I made a good choice too~ 🌸"`,
    `🔴 *Anna:* "Don't get cocky out there okay?! I can't revive you from here darling~! 😤"`,
  ],
  pregnantMsg: `🔴 *Anna:* "Darling... I have something to tell you. I've been feeling different lately. Something is... different inside me. I think— I think I'm pregnant. 🌸
...Don't look at me like that! This is YOUR fault~!"`,
  birthMsg: `🔴 *Anna:* "DARLING~!! It's time!! She's HERE! Our baby is HERE! 😭🌸
She's so tiny and perfect and— she has your eyes I think?!

Name her! Use *!namechild [name]* RIGHT NOW!!"`,
  namedMsg: (childName: string) => `🔴 *Anna:* "~${childName}~!! Oh that name is PERFECT darling!!
She's already kicking like she approves!! 😭🌸
Welcome to the world, little ${childName}~
Your daddy is... well. He's trying his best. 💕"`,
  smashScene: [
    `*Anna sets her satchel down slowly. Her eyes glint in the torchlight.*`,
    `🔴 *Anna:* "...Oh? So it's THAT kind of night, darling~"`,
    `*She steps closer. The candle flickers.*`,
    `*You reach out. She doesn't step back.*`,
    `*A long silence falls over the room.*`,
    `*Outside, stars wheel overhead.*`,
    `*Inside... the world goes very quiet.*`,
    `*......*`,
    `*Some things are better left unwritten~ 🔥*`,
  ],
  alreadySmashed: `🔴 *Anna:* "...Again?! Give me a moment to breathe, darling~! 😳"`,
  leaveMsg: `🔴 *Anna:* "...Oh. You're leaving? ...Fine! Go!! I'm not crying, YOU'RE crying!! 😤
Come back when you're ready, darling~"`,
};

// Track if Anna is currently spawned in group
let annaSpawned = false;
let annaSpawnedAt: Date | null = null;

// Check guide pregnancy/birth events
async function checkGuideEvents(user: any, phoneId: string) {
  if (!user.guideName || !user.guideSmashAt) return;
  const now = Date.now();
  const smashTime = new Date(user.guideSmashAt).getTime();

  if (!user.guidePregnant && now - smashTime >= 86400000) {
    await storage.updateUser(phoneId, { guidePregnant: true } as any);
    await client.sendMessage(phoneId, ANNA.pregnantMsg);
  }

  if (user.guidePregnant && !user.guideChildName && now - smashTime >= 259200000) {
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), ANNA.imageWithChild));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "annawithchild.jpg");
      await client.sendMessage(phoneId, media, { caption: ANNA.birthMsg });
    } catch { await client.sendMessage(phoneId, ANNA.birthMsg); }
  }
}

function getRandomSpecies() {
  const races = Object.keys(SPECIES_XP_RATES).filter(r => r !== "Constellation");
  const name = races[Math.floor(Math.random() * races.length)];
  const rarity = name === "Celestial" ? "Legendary" : (name === "Dragon" || name === "Elf" ? "Very Rare" : "Common");
  return { name, rarity };
}

function getHpStatus(hp: number) {
  if (hp >= 100) return "Perfectly Healthy";
  if (hp >= 90) return "Feeling Fine";
  if (hp >= 80) return "Slightly Off";
  if (hp >= 70) return "Under the Weather";
  if (hp >= 60) return "Noticeably Sick";
  if (hp >= 50) return "Unwell";
  if (hp >= 40) return "Feverish";
  if (hp >= 30) return "Seriously Ill";
  if (hp >= 20) return "Deteriorating";
  if (hp >= 10) return "Critical Condition";
  return "Perished";
}

function generateHpBar(hp: number) {
  const total = 10;
  const filled = Math.ceil(hp / 10);
  const empty = total - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty)) + ` ${hp}/100`;
}

let client: Client;
let isInitializing = false;

// ── Interval: HP drain, Plague, Egg Hatching ──────────────────────────────────
// FIX: guard with `client` check so it doesn't crash before bot is ready
setInterval(async () => {
  if (!client) return; // FIX: don't run until client is initialised
  try {
    const users = await storage.getUsers();
    for (const user of users) {
      let hpDrain = 0;
      if (user.condition === "Infected") hpDrain += 5;

      if (hpDrain > 0 && !user.isDead) {
        const newHp = Math.max(0, user.hp - hpDrain);
        const isDead = newHp <= 0;
        await storage.updateUser(user.phoneId, { hp: newHp, isDead });
        if (isDead) {
          await client.sendMessage(user.phoneId, "💀 Your life force has faded. You have perished. You cannot use commands until revived.");
        }
      }

      // Dragon Egg Progress
      if (user.dragonEggProgress > 0 && !user.dragonEggHatched) {
        const others = users.filter(u => u.phoneId !== user.phoneId && u.xp >= 30);
        if (others.length > 0) {
          const victim = others[Math.floor(Math.random() * others.length)];
          await storage.updateUser(victim.phoneId, { xp: victim.xp - 30 });
          await storage.updateUser(user.phoneId, { dragonEggProgress: user.dragonEggProgress + 30 });
          await client.sendMessage(victim.phoneId, "A strange fatigue washes over you. Something is feeding nearby.\nYou lost 30 XP.");

          if (user.dragonEggProgress + 30 >= 1500) {
            await storage.updateUser(user.phoneId, { dragonEggHatched: true });
            await client.sendMessage(user.phoneId, "The shell shatters. Something ancient rises.\nYour Dragon Egg has fully hatched. +500 XP per day added permanently.");
          }
        }
      }
    }

    const stats = await storage.getGlobalStats();
    const now = new Date();
    if (!stats.activeDisease && (!stats.lastOutbreakAt || now.getTime() - new Date(stats.lastOutbreakAt).getTime() > 604800000)) {
      const races = Object.keys(DISEASES);
      const randomRace = races[Math.floor(Math.random() * races.length)];
      const disease = DISEASES[randomRace];
      const endsAt = new Date(now.getTime() + (Math.floor(Math.random() * 7) + 1) * 86400000);
      await storage.updateGlobalStats({ activeDisease: disease.name, diseaseRace: disease.race, lastOutbreakAt: now, outbreakEndsAt: endsAt });
      await client.sendMessage(OWNER_NUMBER, `⚠️ *DISEASE OUTBREAK*\n\n${disease.startMsg}`);
    } else if (stats.activeDisease && stats.outbreakEndsAt && now > new Date(stats.outbreakEndsAt)) {
      const disease = Object.values(DISEASES).find(d => d.name === stats.activeDisease);
      await storage.updateGlobalStats({ activeDisease: null, diseaseRace: null, outbreakEndsAt: null });
      await client.sendMessage(OWNER_NUMBER, `✨ *DISEASE CLEARED*\n\n${disease?.endMsg}`);
    }
  } catch (err) { console.error("Interval error:", err); }
}, 300000);


// ── Weekly XP for guides ──────────────────────────────────────────────────────
setInterval(async () => {
  if (!client) return;
  try {
    const users = await storage.getUsers();
    for (const user of users) {
      const hasGuide = !!(user as any).guideName;
      const hasChild = !!(user as any).guideChildName;
      if (!hasGuide) continue;
      const weeklyXp = hasChild ? 5000 : 1000;
      await storage.updateUser(user.phoneId, { xp: user.xp + weeklyXp });
      await client.sendMessage(user.phoneId, `✨ Weekly guide bonus received!
+${weeklyXp} XP from your companion${hasChild ? " and child" : ""}~`);
      // Check pregnancy/birth events
      await checkGuideEvents(user, user.phoneId);
    }
  } catch (err) { console.error("Weekly interval error:", err); }
}, 604800000); // 7 days

export async function initBot() {
  if (isInitializing) return;
  isInitializing = true;
  const authPath = path.join(process.cwd(), '.wwebjs_auth');
  const cachePath = path.join(process.cwd(), '.wwebjs_cache');
  if (connectionStatus === "DISCONNECTED") {
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
    if (fs.existsSync(cachePath)) fs.rmSync(cachePath, { recursive: true, force: true });
  }
  if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
  if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });
  // Find chromium safely across dev and deployed Replit environments
  function findChromiumPath(): string {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      console.log(`[bot] Using PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const candidates = [
      '/run/current-system/sw/bin/chromium', // Nix path on Replit autoscale
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium',
    ];
    for (const cmd of ['chromium', 'chromium-browser', 'google-chrome']) {
      try {
        const result = execSync(`which ${cmd} 2>/dev/null`).toString().trim();
        if (result) { console.log(`[bot] Found chromium via which: ${result}`); return result; }
      } catch { /* not found */ }
    }
    for (const p of candidates) {
      if (fs.existsSync(p)) { console.log(`[bot] Found chromium at: ${p}`); return p; }
    }
    throw new Error('Chromium not found.');
  }

  const chromiumPath = findChromiumPath();
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    restartOnAuthFail: true,
    puppeteer: {
      executablePath: chromiumPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu', '--disable-software-rasterizer', '--disable-extensions'],
    },
  });
  client.on('qr', (qr) => { currentQrCode = qr; connectionStatus = "WAITING_FOR_QR"; });
  client.on('ready', () => { connectionStatus = "CONNECTED"; currentQrCode = undefined; console.log('Bot is ready'); });
  client.on('authenticated', () => { connectionStatus = "CONNECTED"; currentQrCode = undefined; });
  client.on('auth_failure', () => { connectionStatus = "DISCONNECTED"; });
  client.on('disconnected', () => { connectionStatus = "DISCONNECTED"; });
  client.on('message', async (msg) => { try { await handleMessage(msg); } catch (err) { console.error('Error handling message:', err); } });
  client.initialize().catch(() => { connectionStatus = "DISCONNECTED"; }).finally(() => { isInitializing = false; });
}

export function refreshQr() {
  if (client) { client.destroy().then(() => initBot()).catch(() => initBot()); }
  else { initBot(); }
}

async function handleMessage(msg: Message) {
  const contact = await msg.getContact();
  const phoneId = contact.id._serialized;
  const name = contact.pushname || contact.number;
  const body = msg.body.trim().toLowerCase();
  let user = await storage.getUserByPhone(phoneId);

  if (user?.isBanned) return;
  if (user?.isDead && !body.startsWith("!revive")) {
    if (body.startsWith("!")) return msg.reply("💀 You are dead. Reply to someone with !revive to be saved.");
    return;
  }

  // Registration
  if (!user || !user.isRegistered) {
    if (body === "!start") {
      const sp = getRandomSpecies();
      user = await storage.createUser({ phoneId, name, species: sp.name, isRegistered: true, xp: 0, messages: 0, condition: "Healthy", rank: 8, inventory: [], hp: 100 });
      const startMsg = `╭══════════════════════╮\n   ✦┊【Welcome】┊✦\n╰══════════════════════╯\n  👤 Cultivator: ${name}\n  🧬 Species: ${sp.name} (${sp.rarity})\n\n  Your journey begins.\n  Use !scroll or !help to see commands.\n╰══════════════════════╯`;
      try {
        const imgBuffer = fs.readFileSync(path.join(process.cwd(), "attached_assets/Start.jpg"));
        const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "start.jpg");
        await msg.reply(media, undefined, { caption: startMsg });
      } catch { await msg.reply(startMsg); }
      return;
    }
    return;
  }

  // Infection trigger
  if (["!leaderboard", "!profile", "!status"].includes(body)) {
    const stats = await storage.getGlobalStats();
    if (stats?.diseaseRace === user.species && !user.hasShadowVeil && user.species !== "Constellation" && user.condition === "Healthy") {
      await storage.updateUser(phoneId, { condition: "Infected", disease: stats.activeDisease, infectedAt: new Date() });
      await client.sendMessage(phoneId, `☣️ You have been infected with ${stats.activeDisease}! You are losing 5 HP every 5 minutes. Buy a cure from !shop.`);
    }
  }

  // XP gain on normal messages
  if (body.length >= 3 && !body.startsWith("!")) {
    // Check Dust Domain
    let rate = user.species === "Constellation" ? 300 : (SPECIES_XP_RATES[user.species] || 5);
    let dustBonus = 0;
    if (user.dustDomainUntil && new Date() < new Date(user.dustDomainUntil)) {
      const newDustMsgs = ((user as any).dustDomainMessages || 0) + 1;
      if (newDustMsgs % 10 === 0) {
        dustBonus = 5000;
        await client.sendMessage(phoneId, `✨ Dust Domain: +5000 XP earned! (${newDustMsgs} domain messages)`);
      }
      await storage.updateUser(phoneId, { dustDomainMessages: newDustMsgs } as any);
    } else if (user.dustDomainUntil && new Date() >= new Date(user.dustDomainUntil) && (user as any).dustDomainMessages > 0) {
      // Domain just expired
      await storage.updateUser(phoneId, { dustDomainUntil: null, dustDomainMessages: 0 } as any);
      await client.sendMessage(phoneId, `*The light fades. The domain closes. You have returned.*\n✨ Dust Domain has ended.`);
    }

    try {
      const oldRank = getRankForXp(user.xp);
      const newXp = user.xp + rate + dustBonus;
      const newRank = getRankForXp(newXp);
      const updates: any = { xp: newXp, messages: user.messages + 1, rank: newRank.level };

      if (newRank.level < oldRank.level) {
        await client.sendMessage(msg.from, `╭══════════════════════╮\n   🎊 RANK UP! 🎊\n   ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n   👤 Cultivator: ${user.name}\n   📈 New Rank: 【${newRank.level}】${newRank.name}\n   ✨ Total XP: ${newXp}\n   ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n   Your soul ascends further!\n╰══════════════════════╯`);
      }

      if (Math.random() < 0.01) {
        const itemPool: Record<string, string> = {
          "Dragon Egg": "*Something warm and heavy settles into your possession.*\n🥚 A Dragon Egg has appeared in your inventory.",
          "Void Fragment": "*A crack in reality slips into your possession.*\n🌑 A Void Fragment has appeared in your inventory.",
          "Star Dust": "*Something shimmering and weightless drifts into your possession.*\n✨ Star Dust has appeared in your inventory.",
          "Vampire Tooth": "*Something sharp and ancient pierces into your possession.*\n🦷 A Vampire Tooth has appeared in your inventory.",
          "Cursed Bone": "*Something cold and wrong materializes near you.*\n🦴 A Cursed Bone has appeared in your inventory.",
          "Living Core": "*Something ancient and alive pulses into your possession.*\n🌿 A Living Core has appeared in your inventory.",
        };
        const itemNames = Object.keys(itemPool);
        const item = itemNames[Math.floor(Math.random() * itemNames.length)];
        if (!(user.inventory as string[]).includes(item)) {
          updates.inventory = [...(user.inventory as string[]), item];
          await client.sendMessage(phoneId, `${itemPool[item]}\nType !inventory to see your items.`);
        }
      }
      await storage.updateUser(phoneId, updates);
    } catch (err) { console.error("XP/Rank update error:", err); }
    return;
  }

  // ── Commands ────────────────────────────────────────────────────────────────

  if (body === "!help") {
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), "attached_assets/Start.jpg"));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "start.jpg");
      await msg.reply(media, undefined, { caption: HELP_MENU });
    } catch { await msg.reply(HELP_MENU); }
    return;
  }
  if (body === "!scroll") {
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), "attached_assets/Scroll.jpg"));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "scroll.jpg");
      await msg.reply(media, undefined, { caption: SCROLL_MENU });
    } catch { await msg.reply(SCROLL_MENU); }
    return;
  }

  if (body === "!status" || body === "!profile") {
    const currentRank = getRankForXp(user.xp);
    let sectLine = "None";
    if (user.sectId) {
      const sect = await storage.getSect(user.sectId);
      if (sect) sectLine = `${sect.name} [${sect.tag}]`;
    }
    return msg.reply(`╭══════════════════════╮\n   ✦┊【Ｓｔａｔｕｓ】┊✦\n╰══════════════════════╯\n  👤 Cultivator: ${user.name}\n  📈 Rank: ${currentRank.name}\n  ✨ XP: ${user.xp}\n  💬 Msg: ${user.messages}\n  🧬 Species: ${user.species}\n  🏯 Sect: ${sectLine}\n  🩹 Condition: ${user.condition}\n  ❤️ HP: ${generateHpBar(user.hp)}\n  🩺 State: ${getHpStatus(user.hp)}\n╰══════════════════════╯`);
  }

  if (body === "!leaderboard") {
    const top = await storage.getUsers();
    const rank = top.findIndex(u => u.phoneId === phoneId) + 1;
    const list = top.slice(0, 10).map((u, i) => `  ${i + 1}. ${u.name} — ${u.xp} XP`).join("\n");
    return msg.reply(`╭══════════════════════╮\n  🏆 TOP CULTIVATORS\n╰══════════════════════╯\n${list}\n\n  Your Rank: #${rank}\n╰══════════════════════╯`);
  }

  if (body === "!inventory") {
    const inv = user.inventory as string[];
    const itemEmojis: Record<string, string> = {
      "Dragon Egg": "🥚", "Void Fragment": "🌑", "Star Dust": "✨",
      "Vampire Tooth": "🦷", "Cursed Bone": "🦴", "Living Core": "🌿",
      "blood rune": "🩸", "eclipse stone": "🌒", "phantom seal": "👻",
      "cursed coin": "🪙", "mirror shard": "🪞", "vampire tooth": "🦷",
      "cursed bone": "🦴", "grey rot cure": "💊", "hellfire suppressant": "💊",
      "feral antidote": "💊", "grace restoration vial": "💊",
      "scale restoration salve": "💊", "rootwither remedy": "💊",
      "living core": "🌿", "dragon egg": "🥚", "void fragment": "🌑",
      "star dust": "✨",
    };
    const itemRarity: Record<string, string> = {
      "Dragon Egg": "Legendary", "Void Fragment": "Rare", "Star Dust": "Uncommon",
      "Vampire Tooth": "Epic", "Cursed Bone": "Uncommon", "Living Core": "Rare",
    };
    if (!inv.length) return msg.reply(`╭══════════════════════╮\n   ✦┊【Ｉｎｖｅｎｔｏｒｙ】┊✦\n╰══════════════════════╯\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Your satchel is empty.\n  Chat to find hidden items.\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Use !useitem [num]\n╰══════════════════════╯`);
    const list = inv.map((item, i) => {
      const emoji = itemEmojis[item] || itemEmojis[item.toLowerCase()] || "📦";
      const rarity = itemRarity[item] || "";
      return `  【${i + 1}】 ${emoji} ${item}${rarity ? ` ┊ ${rarity}` : ""}`;
    }).join("\n");
    return msg.reply(`╭══════════════════════╮\n   ✦┊【Ｉｎｖｅｎｔｏｒｙ】┊✦\n╰══════════════════════╯\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n${list}\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  ${inv.length} item(s) — !useitem [num]\n╰══════════════════════╯`);
  }

  if (body === "!shop") {
    return msg.reply(`╭══════════════════════╮\n  🏪 SHOP\n╰══════════════════════╯\n\n  💊 *Cures*\n  Grey Rot Cure — 15,000 XP\n  Hellfire Suppressant — 18,000 XP\n  Feral Antidote — 18,000 XP\n  Grace Restoration Vial — 20,000 XP\n  Scale Restoration Salve — 22,000 XP\n  Rootwither Remedy — 20,000 XP\n  Soul Restoration Tonic — 20,000 XP\n\n  ⚗️ *Special Items*\n  Blood Rune — 80,000 XP\n  Eclipse Stone — 90,000 XP\n  Phantom Seal — 85,000 XP\n  Cursed Coin — 5,000 XP\n  Mirror Shard — 95,000 XP\n  Vampire Tooth — 100,000 XP\n  Cursed Bone — 100,000 XP\n  Living Core — 100,000 XP\n  Star Dust — 75,000 XP\n  Dragon Egg — 90,000 XP\n  Void Fragment — 100,000 XP\n\n  Use !buy [item name]\n╰══════════════════════╯`);
  }

  if (body.startsWith("!buy ")) {
    const itemName = body.replace("!buy ", "").trim();
    const item = SHOP_ITEMS[itemName];
    if (!item) return msg.reply("❌ Item not found. Check !shop for available items.");
    if (user.xp < item.price) return msg.reply(`❌ Not enough XP. You need ${item.price} XP but have ${user.xp}.`);
    await storage.updateUser(phoneId, { xp: user.xp - item.price, inventory: [...(user.inventory as string[]), itemName] });
    return msg.reply(`✅ Purchased *${itemName}*!\n📖 ${item.description}`);
  }

  if (body.startsWith("!useitem ")) {
    const num = parseInt(body.split(" ")[1]) - 1;
    const inv = [...(user.inventory as string[])];
    if (isNaN(num) || !inv[num]) return msg.reply("❌ Invalid item number. Check !inventory.");
    const itemName = inv[num];
    const itemLower = itemName.toLowerCase();
    const isFindable = ["dragon egg", "void fragment", "star dust", "vampire tooth", "cursed bone", "living core"].includes(itemLower);

    if (isFindable && Math.random() > 0.11) {
      inv.splice(num, 1);
      await storage.updateUser(phoneId, { inventory: inv });
      return msg.reply(`✨ You used ${itemName}, but its power remains dormant. The item was consumed.`);
    }

    let reply = `✨ You used ${itemName}!`;
    const updates: any = {};

    if (itemLower === "star dust") {
      const expiresAt = new Date(Date.now() + 1800000); // 30 minutes
      updates.dustDomainUntil = expiresAt;
      updates.dustDomainMessages = 0; // reset message counter
      const expireStr = expiresAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      reply = `*The dust scatters and the world around you shifts. A domain of light opens before you.*\n✨ Dust Domain active. You earn 5000 XP per 10 messages for the next 30 minutes. Make it count.\nExpires: ${expireStr}`;
    } else if (itemLower === "void fragment") {
      if (Math.random() > 0.03) {
        inv.splice(num, 1);
        await storage.updateUser(phoneId, { inventory: inv });
        return msg.reply(`🌑 You used the Void Fragment, but the stars refused your call. It dissolved into shadow.`);
      }
      updates.species = "Constellation";
      updates.isConstellation = true;
      reply = `🌑 Race Transformed to ✨ Constellation! Your power is now 300 XP per message.`;
    } else if (itemLower === "living core") {
      const sp = getRandomSpecies();
      updates.species = sp.name;
      updates.isConstellation = false;
      updates.hasShadowVeil = false; // clear shadow veil on race change
      updates.condition = "Healthy"; // clear infection on race change
      updates.disease = null;
      reply = `*The Living Core pulses with ancient life. Your form dissolves and reshapes.*\n🌿 Race Transformed.\nNew Race: ${sp.name} (${sp.rarity})\nXP Rate: ${SPECIES_XP_RATES[sp.name]} XP per message\n*You are reborn.*`;
    } else if (itemLower === "cursed bone") {
      updates.hasShadowVeil = true;
      reply = `🦴 Shadow Veil active! You are now immune to plagues.`;
    } else if (itemLower === "dragon egg") {
      updates.dragonEggProgress = 1;
      reply = `🥚 The egg begins to pulse. It has begun feeding on nearby XP.`;
    } else if (itemLower === "vampire tooth") {
      updates.isVampire = true;
      updates.vampireUntil = new Date(Date.now() + 604800000);
      reply = `🦷 You are now a Vampire for 1 week! Use !suck (reply to a message) to feed.`;
    } else if (itemLower.includes("cure") || itemLower.includes("remedy") || itemLower.includes("antidote") || itemLower.includes("vial") || itemLower.includes("salve") || itemLower.includes("suppressant")) {
      const disease = Object.values(DISEASES).find(d => d.cure === itemLower);
      if (!disease) return msg.reply("❌ This cure doesn't match any known disease.");
      if (user.species !== disease.race) return msg.reply(`❌ This cure was made for *${disease.race}*, not ${user.species}.`);
      if (user.condition !== "Infected") return msg.reply("❌ You are not infected.");
      updates.condition = "Healthy";
      updates.disease = null;
      updates.hp = 100;
      reply = `💉 Cured of *${disease.name}*! Your HP has been restored to 100.`;
    }

    inv.splice(num, 1);
    updates.inventory = inv;
    await storage.updateUser(phoneId, updates);
    return msg.reply(reply);
  }

  // FIX: added hasQuotedMsg check
  if (body.startsWith("!suck") && user.isVampire) {
    if (!msg.hasQuotedMsg) return msg.reply("🦷 Reply to someone's message to suck their XP.");
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found.");
    if (target.xp > user.xp * 2) return msg.reply("🦷 They are too powerful. Your fangs find no grip.");
    const now = Date.now();
    if (user.lastSuckAt && now - new Date(user.lastSuckAt).getTime() < 3600000) {
      const mins = Math.ceil((3600000 - (now - new Date(user.lastSuckAt).getTime())) / 60000);
      return msg.reply(`🦷 You must wait ${mins} more minute(s) before feeding again.`);
    }
    const amt = Math.floor(Math.random() * 251) + 50;
    await storage.updateUser(phoneId, { xp: user.xp + amt, lastSuckAt: new Date() });
    await storage.updateUser(targetId, { xp: Math.max(0, target.xp - amt) });
    await client.sendMessage(targetId, `Something cold grips you in the dark. You lost ${amt} XP.`);
    return msg.reply(`🦷 You drained *${amt} XP* from ${target.name}.`);
  }

  if (body.startsWith("!givexp ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give XP.");
    const amt = parseInt(body.split(" ")[1]);
    if (isNaN(amt) || amt <= 0) return msg.reply("❌ Invalid amount.");
    if (user.xp < amt) return msg.reply(`❌ You only have ${user.xp} XP.`);
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
    if (targetId === phoneId) return msg.reply("❌ You cannot give XP to yourself.");
    await storage.updateUser(phoneId, { xp: user.xp - amt });
    await storage.updateUser(targetId, { xp: target.xp + amt });
    await client.sendMessage(targetId, `💰 ${user.name} gifted you ${amt} XP!`);
    return msg.reply(`💰 You gave *${amt} XP* to ${target.name}.`);
  }

  if (body.startsWith("!giveitem ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give an item.");
    const num = parseInt(body.split(" ")[1]) - 1;
    const inv = [...(user.inventory as string[])];
    if (isNaN(num) || !inv[num]) return msg.reply("❌ Invalid item number.");
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found.");
    const item = inv.splice(num, 1)[0];
    await storage.updateUser(phoneId, { inventory: inv });
    await storage.updateUser(targetId, { inventory: [...(target.inventory as string[]), item] });
    await client.sendMessage(targetId, `🎁 ${user.name} gave you [${item}]!`);
    return msg.reply(`🎁 You gave *[${item}]* to ${target.name}.`);
  }

  // FIX: added hasQuotedMsg check
  if (body.startsWith("!revive")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a dead person's message to revive them.");
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found.");
    if (!target.isDead) return msg.reply("❌ That person is not dead.");
    if (target.species !== user.species) return msg.reply("❌ You can only revive someone of the same species.");
    await storage.updateUser(targetId, { isDead: false, hp: 10 });
    await client.sendMessage(targetId, `🕊️ ${user.name} has revived you! You are back with 10 HP. Stay safe.`);
    return msg.reply(`🕊️ You revived *${target.name}*!`);
  }

  // ── CARDS ────────────────────────────────────────────────────────────────────

  if (body === "!getcard") {
    const now = new Date();
    if (user.lastCardClaim) {
      const diff = now.getTime() - new Date(user.lastCardClaim).getTime();
      if (diff < 86400000) {
        const hoursLeft = Math.ceil((86400000 - diff) / 3600000);
        return msg.reply(`🎴 You already claimed your card today! Come back in ${hoursLeft} hour(s).`);
      }
    }
    await msg.reply("🎴 Drawing your card from the archives...");
    const card = await fetchRandomAnimeCard();
    await storage.createCard({ ownerPhoneId: phoneId, characterId: card.characterId, name: card.name, series: card.series, imageUrl: card.imageUrl, rarity: card.rarity });
    await storage.updateUser(phoneId, { lastCardClaim: now });
    const rarityEmoji = card.rarity === "Legendary" ? "🌟" : card.rarity === "Epic" ? "💜" : card.rarity === "Rare" ? "💙" : card.rarity === "Uncommon" ? "💚" : "⬜";
    const cardMsg = `╭══════════════════════╮\n  🎴 CARD OBTAINED!\n╰══════════════════════╯\n  📛 Name: ${card.name}\n  📺 Series: ${card.series}\n  ${rarityEmoji} Rarity: ${card.rarity}\n\n  Use !cardcollection to view all.\n╰══════════════════════╯`;
    if (card.imageUrl) {
      try {
        const imgRes = await fetch(card.imageUrl);
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const media = new MessageMedia("image/jpeg", buffer.toString("base64"), `${card.name}.jpg`);
        await msg.reply(media, undefined, { caption: cardMsg });
      } catch { await msg.reply(cardMsg); }
    } else { await msg.reply(cardMsg); }
  }

  if (body === "!cardcollection") {
    const userCards = await storage.getUserCards(phoneId);
    if (!userCards.length) return msg.reply("🎴 You have no cards yet. Use !getcard to claim your daily card.");
    const list = userCards.map((c, i) => `  【${i + 1}】 ${c.name} [${c.rarity}] — ${c.series}`).join("\n");
    return msg.reply(`╭══════════════════════╮\n  📚 CARD COLLECTION\n╰══════════════════════╯\n${list}\n\n  Use !card [num] for details.\n╰══════════════════════╯`);
  }

  if (body.startsWith("!card ")) {
    const num = parseInt(body.split(" ")[1]) - 1;
    const userCards = await storage.getUserCards(phoneId);
    if (isNaN(num) || !userCards[num]) return msg.reply("❌ Invalid card number. Check !cardcollection.");
    const card = userCards[num];
    return msg.reply(`╭══════════════════════╮\n  🔍 CARD DETAILS\n╰══════════════════════╯\n  📛 Name: ${card.name}\n  📺 Series: ${card.series}\n  ✨ Rarity: ${card.rarity}\n  🆔 Card ID: #${card.id}\n╰══════════════════════╯`);
  }

  if (body.startsWith("!givecard ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give a card.");
    const num = parseInt(body.split(" ")[1]) - 1;
    const userCards = await storage.getUserCards(phoneId);
    if (isNaN(num) || !userCards[num]) return msg.reply("❌ Invalid card number.");
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found.");
    if (targetId === phoneId) return msg.reply("❌ You cannot give cards to yourself.");
    const card = userCards[num];
    await storage.updateCard(card.id, { ownerPhoneId: targetId });
    await client.sendMessage(targetId, `🎴 ${user.name} gave you the card *${card.name}* [${card.rarity}]!`);
    return msg.reply(`🎴 You gave *${card.name}* to ${target.name}.`);
  }


  // ── GUIDE COMMANDS ───────────────────────────────────────────────────────────



  if (body === "!smashmyguide") {
    const guideName = (user as any).guideName?.toLowerCase();
    if (!guideName) return msg.reply("❌ You don't have a guide. Use !guide to choose one.");
    const guide = GUIDES[guideName];
    if (!guide) return msg.reply("❌ Guide not found.");
    if ((user as any).guideSmashAt) return msg.reply(`${guide.emoji} *${guide.name}:* "...Again? Give me a moment to breathe, will you?"`);
    await storage.updateUser(phoneId, { guideSmashAt: new Date(), guidePregnant: false } as any);
    let scene = "";
    for (const line of guide.smashScene) { scene += line + "\n"; }
    return msg.reply(scene.trim());
  }

  if (body.startsWith("!namechild ")) {
    const guideName = (user as any).guideName?.toLowerCase();
    if (!guideName) return msg.reply("❌ You don't have a guide.");
    const guide = GUIDES[guideName];
    if (!(user as any).guidePregnant) return msg.reply("❌ No child to name yet.");
    if ((user as any).guideChildName) return msg.reply(`❌ Your child is already named *${(user as any).guideChildName}*.`);
    const childName = body.replace("!namechild ", "").trim();
    if (!childName || childName.length > 20) return msg.reply("❌ Invalid name. Keep it under 20 characters.");
    await storage.updateUser(phoneId, { guideChildName: childName } as any);
    const nameMsg = guide.name === "Anna"
      ? `🔴 *Anna:* "~${childName}~!! Oh that's PERFECT darling!! She's already kicking like she approves!! 😭🌸 Welcome to the world, little ${childName}~ Your daddy is... well. He's trying his best."`
      : `⚒️ *Maya:* "...${childName}. ...Yeah. That fits her. Good choice, kid." *She doesn't smile. But her eyes do.*`;
    await msg.reply(nameMsg);
    await msg.reply(`✨ Your family is complete!
👨 You + ${guide.emoji} ${guide.name} + 👶 ${childName}

+5000 XP per week permanently added!`);
    return;
  }

  if (body === "!leaveguide") {
    if (!(user as any).guideName) return msg.reply("❌ You don't have a guide.");
    const guideName = (user as any).guideName?.toLowerCase();
    const guide = GUIDES[guideName];
    const leaveMsg = guide?.name === "Anna"
      ? `🔴 *Anna:* "...Oh. You're leaving? ...Fine. Fine! Go! I'm not crying, YOU'RE crying!! 😤 Come back when you're ready, darling~"`
      : `⚒️ *Maya:* "...Understood. Take care of yourself out there. Don't do anything stupid." *She turns back to the forge.*`;
    await storage.updateUser(phoneId, { guideName: null, guideSmashAt: null, guidePregnant: false, guideChildName: null } as any);
    return msg.reply(leaveMsg);
  }

  // ── SECTS ────────────────────────────────────────────────────────────────────

  if (body.startsWith("!joinsect ")) {
    if (user.sectId) return msg.reply("❌ You are already in a sect. Use !sectleave first.");
    const sectName = body.replace("!joinsect ", "").trim();
    const sect = await storage.getSectByName(sectName);
    if (!sect) return msg.reply(`❌ Sect *${sectName}* not found. Check !sectranking for existing sects.`);
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await storage.updateSect(sect.id, { membersCount: sect.membersCount + 1 });
    await client.sendMessage(sect.leaderPhoneId, `🏯 ${user.name} has joined your sect!`);
    return msg.reply(`🏯 You have joined *${sect.name}* [${sect.tag}]!`);
  }

  if (body === "!mysect") {
    if (!user.sectId) return msg.reply("❌ You are not in a sect. Use !joinsect [name] to join one.");
    const sect = await storage.getSect(user.sectId);
    if (!sect) return msg.reply("❌ Your sect no longer exists.");
    const allUsers = await storage.getUsers();
    const members = allUsers.filter(u => u.sectId === sect.id);
    const memberList = members.slice(0, 10).map((m, i) => `  ${i + 1}. ${m.name} — ${m.xp} XP`).join("\n");
    return msg.reply(`╭══════════════════════╮\n  🏯 ${sect.name} [${sect.tag}]\n╰══════════════════════╯\n  👑 Leader: ${sect.leaderPhoneId}\n  👥 Members: ${sect.membersCount}\n  💰 Treasury: ${sect.treasuryXp} XP\n\n  Top Members:\n${memberList}\n╰══════════════════════╯`);
  }

  if (body.startsWith("!donate ")) {
    if (!user.sectId) return msg.reply("❌ You are not in a sect.");
    const amt = parseInt(body.split(" ")[1]);
    if (isNaN(amt) || amt <= 0) return msg.reply("❌ Invalid amount.");
    if (user.xp < amt) return msg.reply(`❌ You only have ${user.xp} XP.`);
    const sect = await storage.getSect(user.sectId);
    if (!sect) return msg.reply("❌ Sect not found.");
    await storage.updateUser(phoneId, { xp: user.xp - amt });
    await storage.updateSect(sect.id, { treasuryXp: sect.treasuryXp + amt });
    return msg.reply(`💰 You donated *${amt} XP* to *${sect.name}*. Treasury now: ${sect.treasuryXp + amt} XP.`);
  }

  if (body === "!sectranking") {
    const sects = await storage.getSects();
    if (!sects.length) return msg.reply("🏯 No sects exist yet.");
    const list = sects.slice(0, 10).map((s, i) => `  ${i + 1}. ${s.name} [${s.tag}] — ${s.treasuryXp} XP | ${s.membersCount} members`).join("\n");
    return msg.reply(`╭══════════════════════╮\n  📊 SECT RANKING\n╰══════════════════════╯\n${list}\n╰══════════════════════╯`);
  }

  if (body === "!sectleave") {
    if (!user.sectId) return msg.reply("❌ You are not in a sect.");
    const sect = await storage.getSect(user.sectId);
    if (sect && sect.leaderPhoneId === phoneId) return msg.reply("❌ You are the sect leader. Transfer leadership before leaving.");
    if (sect) await storage.updateSect(sect.id, { membersCount: Math.max(0, sect.membersCount - 1) });
    await storage.updateUser(phoneId, { sectId: null, sectTag: null });
    return msg.reply(`🚶 You have left *${sect?.name || "your sect"}*.`);
  }

  // ── SECT LEADER COMMANDS ─────────────────────────────────────────────────────

  if (body.startsWith("!kickmember ")) {
    if (!user.sectId) return msg.reply("❌ You are not in a sect.");
    const sect = await storage.getSect(user.sectId);
    if (!sect || sect.leaderPhoneId !== phoneId) return msg.reply("❌ You are not the sect leader.");
    const targetName = body.replace("!kickmember ", "").trim();
    const allUsers = await storage.getUsers();
    const target = allUsers.find(u => u.sectId === sect.id && u.name.toLowerCase() === targetName.toLowerCase());
    if (!target) return msg.reply(`❌ Member *${targetName}* not found in your sect.`);
    if (target.phoneId === phoneId) return msg.reply("❌ You cannot kick yourself.");
    await storage.updateUser(target.phoneId, { sectId: null, sectTag: null });
    await storage.updateSect(sect.id, { membersCount: Math.max(0, sect.membersCount - 1) });
    await client.sendMessage(target.phoneId, `🥾 You have been kicked from *${sect.name}* by the leader.`);
    return msg.reply(`🥾 *${target.name}* has been kicked from the sect.`);
  }

  if (body.startsWith("!punish ")) {
    if (!user.sectId) return msg.reply("❌ You are not in a sect.");
    const sect = await storage.getSect(user.sectId);
    if (!sect || sect.leaderPhoneId !== phoneId) return msg.reply("❌ You are not the sect leader.");
    const targetName = body.replace("!punish ", "").trim();
    const allUsers = await storage.getUsers();
    const target = allUsers.find(u => u.sectId === sect.id && u.name.toLowerCase() === targetName.toLowerCase());
    if (!target) return msg.reply(`❌ Member *${targetName}* not found in your sect.`);
    if (target.phoneId === phoneId) return msg.reply("❌ You cannot punish yourself.");
    const penalty = Math.floor(target.xp * 0.1);
    await storage.updateUser(target.phoneId, { xp: Math.max(0, target.xp - penalty) });
    await client.sendMessage(target.phoneId, `⚡ You have been punished by your sect leader! You lost ${penalty} XP.`);
    return msg.reply(`⚡ *${target.name}* has been punished. They lost ${penalty} XP.`);
  }

  // ── OWNER COMMANDS ───────────────────────────────────────────────────────────

  if (phoneId !== OWNER_NUMBER) return; // everything below is owner-only

  if (body === "!guidespawn") {
    annaSpawned = true;
    annaSpawnedAt = new Date();
    const announcement = `╭══════════════════════╮
   ✦┊【 A G U I D E 】┊✦
╰══════════════════════╯
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  A guide has appeared!
  She wanders into the realm,
  searching for a worthy
  cultivator to walk beside.
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Type *!getguide* to claim her.
  She stays forever.
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼
╰══════════════════════╯`;
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), ANNA.image));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "anna.jpg");
      await client.sendMessage(msg.from, media, { caption: announcement });
    } catch { await msg.reply(announcement); }
    return;
  }

  if (body.startsWith("!ban ")) {
    const targetName = body.replace("!ban ", "").trim();
    const allUsers = await storage.getUsers();
    const target = allUsers.find(u => u.name.toLowerCase() === targetName.toLowerCase());
    if (!target) return msg.reply(`❌ User *${targetName}* not found.`);
    await storage.updateUser(target.phoneId, { isBanned: true });
    return msg.reply(`🔨 *${target.name}* has been banned.`);
  }

  if (body.startsWith("!unban ")) {
    const targetName = body.replace("!unban ", "").trim();
    const banned = await storage.getBannedUsers();
    const target = banned.find(u => u.name.toLowerCase() === targetName.toLowerCase());
    if (!target) return msg.reply(`❌ Banned user *${targetName}* not found.`);
    await storage.updateUser(target.phoneId, { isBanned: false });
    return msg.reply(`🔓 *${target.name}* has been unbanned.`);
  }

  if (body.startsWith("!missastral")) {
    const missMsg = `*Miss Astral opens one eye slowly...*\n\n🐱 I am alive, yare yare.\nI may sleep soon tho.`;
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), "attached_assets/Missastral.jpg"));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "missastral.jpg");
      await msg.reply(media, undefined, { caption: missMsg });
    } catch { await msg.reply(missMsg); }
    return;
  }
}
