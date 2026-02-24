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
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  💞 GUIDES
  🙋 !getguide ↳ claim your guide
  💬 !talkguide ↳ talk to your guide
  💋 !smashmyguide ↳ ...you know
  👶 !namechild [name] ↳ name your child
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
  "Elf": { name: "Rootwither", race: "Elf", startMsg: "A withering has begun among the Elf race. Rootwither is severing their bond with the ancient world.", endMsg: "Rootwither has retreated into the earth. The Elf race is restored.", cure: "rootwither remedy" }
};

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

// ── GUIDES map — used by !getguide, !talkguide, !smashmyguide, !leaveguide ──
const GUIDES: Record<string, typeof ANNA> = {
  anna: ANNA,
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

// ── Helper: resolve the real sender phone ID from a quoted message ────────────
// In group chats msg.author holds the sender; msg.from is the group ID.
// For DMs, msg.from is the sender. We normalise here.
function resolvePhoneId(quotedMsg: Message): string {
  // quotedMsg.author is set in group chats (it's the participant)
  // quotedMsg.from is the chat (could be group or individual)
  return (quotedMsg as any).author || quotedMsg.from;
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

// ── Interval: HP drain, Plague, Egg Hatching ─────────────────────────────────
setInterval(async () => {
  if (!client) return;
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
      // Notify owner
      await client.sendMessage(OWNER_NUMBER, `☣️ *DISEASE OUTBREAK*\n\n${disease.startMsg}\n\nAffected race: *${disease.race}*\nCure: *${disease.cure}*`);
      // Warn every at-risk user directly
      const atRiskUsers = await storage.getUsers();
      for (const u of atRiskUsers) {
        if (u.species === disease.race && !u.hasShadowVeil && !u.isDead) {
          await client.sendMessage(u.phoneId,
            `⚠️ *OUTBREAK WARNING*\n\n${disease.startMsg}\n\n` +
            `As a *${disease.race}*, you are at risk of infection.\n` +
            `Buy *${disease.cure}* from !shop to protect yourself.\n` +
            `Or use a *Cursed Bone* for permanent Shadow Veil immunity.`
          ).catch(() => {});
        }
      }
    } else if (stats.activeDisease && stats.outbreakEndsAt && now > new Date(stats.outbreakEndsAt)) {
      const disease = Object.values(DISEASES).find(d => d.name === stats.activeDisease);
      await storage.updateGlobalStats({ activeDisease: null, diseaseRace: null, outbreakEndsAt: null });
      await client.sendMessage(OWNER_NUMBER, `✨ *DISEASE CLEARED*\n\n${disease?.endMsg}`);
      // Notify survivors
      const survivors = await storage.getUsers();
      for (const u of survivors) {
        if (u.species === disease?.race && !u.isDead) {
          await client.sendMessage(u.phoneId,
            `✨ *THE PLAGUE HAS PASSED*\n\n${disease?.endMsg}\n\nYou survived.`
          ).catch(() => {});
        }
      }
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
      await client.sendMessage(user.phoneId, `✨ Weekly guide bonus received!\n+${weeklyXp} XP from your companion${hasChild ? " and child" : ""}~`);
      await checkGuideEvents(user, user.phoneId);
    }
  } catch (err) { console.error("Weekly interval error:", err); }
}, 604800000);

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
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    restartOnAuthFail: true,
    puppeteer: {
      executablePath: execSync('which chromium').toString().trim(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu', '--disable-software-rasterizer', '--disable-extensions']
    }
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

  // ── FIX: Tell unregistered users to !start before doing anything else ──────
  if ((!user || !user.isRegistered) && body !== "!start") {
    if (body.startsWith("!")) {
      return msg.reply(`╭══════════════════════╮\n   ✦┊【 Welcome 】┊✦\n╰══════════════════════╯\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  You are not registered yet,\n  Cultivator.\n\n  Type *!start* to begin\n  your ascension journey.\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼\n╰══════════════════════╯`);
    }
    return;
  }

  if (user?.isDead && !body.startsWith("!revive")) {
    if (body.startsWith("!")) return msg.reply("💀 You are dead. Reply to someone with *!revive* to be saved.");
    return;
  }

  // ── Registration ─────────────────────────────────────────────────────────────
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

  // ── Infection trigger — runs on every interaction ───────────────────────────
  {
    const stats = await storage.getGlobalStats();
    if (
      stats?.activeDisease &&
      stats?.diseaseRace === user.species &&
      !user.hasShadowVeil &&
      user.species !== "Constellation" &&
      user.condition === "Healthy"
    ) {
      await storage.updateUser(phoneId, { condition: "Infected", disease: stats.activeDisease, infectedAt: new Date() });
      await client.sendMessage(phoneId,
        `☣️ *INFECTED*

You have contracted *${stats.activeDisease}*.
Your HP is draining *5 per 5 minutes*.

Buy a cure from *!shop* before you perish.
Shadow Veil (*!buy cursed bone*) grants permanent immunity.`
      );
    }
  }

  // ── XP gain on normal messages ─────────────────────────────────────────────
  if (body.length >= 3 && !body.startsWith("!")) {
    // Check mirror shard — use mirrored race XP rate if active
    let activeSpecies = user.species;
    if ((user as any).mirrorUntil && new Date() < new Date((user as any).mirrorUntil)) {
      activeSpecies = (user as any).mirrorRace || user.species;
    } else if ((user as any).mirrorUntil && new Date() >= new Date((user as any).mirrorUntil) && (user as any).mirrorRace) {
      // Mirror expired — restore original race
      await storage.updateUser(phoneId, { species: (user as any).mirrorOriginalRace, mirrorRace: null, mirrorOriginalRace: null, mirrorUntil: null } as any);
      activeSpecies = (user as any).mirrorOriginalRace || user.species;
      await client.sendMessage(phoneId, `🪞 *The mirror shatters. You are yourself again.*\n🧬 Race restored to *${activeSpecies}*.`);
    }
    let rate = activeSpecies === "Constellation" ? 300 : (SPECIES_XP_RATES[activeSpecies] || 5);
    let dustBonus = 0;
    if (user.dustDomainUntil && new Date() < new Date(user.dustDomainUntil)) {
      const newDustMsgs = ((user as any).dustDomainMessages || 0) + 1;
      if (newDustMsgs % 10 === 0) {
        dustBonus = 5000;
        await client.sendMessage(phoneId, `✨ *Dust Domain:* +5000 XP earned! (${newDustMsgs} domain messages)`);
      }
      await storage.updateUser(phoneId, { dustDomainMessages: newDustMsgs } as any);
    } else if (user.dustDomainUntil && new Date() >= new Date(user.dustDomainUntil) && (user as any).dustDomainMessages > 0) {
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

  // ── Commands ─────────────────────────────────────────────────────────────────

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

  // ── FIX: !status = quick, !profile = full detailed view ──────────────────────
  if (body === "!status") {
    const currentRank = getRankForXp(user.xp);
    let sectLine = "None";
    if (user.sectId) {
      const sect = await storage.getSect(user.sectId);
      if (sect) sectLine = `${sect.name} [${sect.tag}]`;
    }
    return msg.reply(
      `╭══════════════════════╮\n` +
      `   ✦┊【Ｑｕｉｃｋ Ｓｔａｔｕｓ】┊✦\n` +
      `╰══════════════════════╯\n` +
      `  👤 ${user.name}\n` +
      `  📈 ${currentRank.name}\n` +
      `  ✨ XP: ${user.xp}\n` +
      `  ❤️ HP: ${generateHpBar(user.hp)}\n` +
      `  🩺 ${getHpStatus(user.hp)}\n` +
      `  🏯 Sect: ${sectLine}\n` +
      `╰══════════════════════╯`
    );
  }

  if (body === "!profile") {
    const currentRank = getRankForXp(user.xp);
    const nextRankIdx = RANKS.findIndex(r => r.level === currentRank.level) - 1;
    const nextRank = nextRankIdx >= 0 ? RANKS[nextRankIdx] : null;
    const xpToNext = nextRank ? nextRank.threshold - user.xp : 0;

    let sectLine = "None";
    if (user.sectId) {
      const sect = await storage.getSect(user.sectId);
      if (sect) sectLine = `${sect.name} [${sect.tag}]`;
    }

    const guideName = (user as any).guideName;
    const guideChild = (user as any).guideChildName;
    const guideEmoji = guideName ? (GUIDES[guideName.toLowerCase()]?.emoji || "💞") : "";
    const guideLine = guideName ? `${guideEmoji} ${guideName}${guideChild ? ` + 👶 ${guideChild}` : ""}` : "None";

    const inv = user.inventory as string[];
    const vampActive = user.isVampire && user.vampireUntil && new Date() < new Date(user.vampireUntil);
    const dustActive = (user as any).dustDomainUntil && new Date() < new Date((user as any).dustDomainUntil);

    return msg.reply(
      `╭══════════════════════╮\n` +
      `   ✦┊【Ｃｕｌｔｉｖａｔｏｒ Ｐｒｏｆｉｌｅ】┊✦\n` +
      `╰══════════════════════╯\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  👤 Name: ${user.name}\n` +
      `  🧬 Species: ${user.species}\n` +
      `  ⚡ XP Rate: ${SPECIES_XP_RATES[user.species] || 5}/msg\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  📈 Rank: 【${currentRank.level}】${currentRank.name}\n` +
      `  ✨ Total XP: ${user.xp}\n` +
      `  💬 Messages: ${user.messages}\n` +
      (nextRank ? `  🎯 Next Rank: ${nextRank.name}\n  📊 XP Needed: ${xpToNext}\n` : `  🏅 MAX RANK ACHIEVED\n`) +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  ❤️ HP: ${generateHpBar(user.hp)}\n` +
      `  🩺 State: ${getHpStatus(user.hp)}\n` +
      `  🩹 Condition: ${user.condition}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  🏯 Sect: ${sectLine}\n` +
      `  💞 Guide: ${guideLine}\n` +
      `  🎒 Items: ${inv.length}\n` +
      `  🃏 Cards: (use !cardcollection)\n` +
      (vampActive ? `  🦷 Vampire: Active\n` : "") +
      (dustActive ? `  ✨ Dust Domain: Active\n` : "") +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼\n` +
      `╰══════════════════════╯`
    );
  }

  if (body === "!leaderboard") {
    const top = await storage.getUsers();
    const rank = top.findIndex(u => u.phoneId === phoneId) + 1;
    // Apply phantom seal — remove hidden users; apply eclipse — hide their stats
    const visible = top.filter(u => {
      if (u.phoneId === phoneId) return true; // always show yourself
      const phantomActive = (u as any).phantomUntil && new Date() < new Date((u as any).phantomUntil);
      return !phantomActive;
    });
    const list = visible.slice(0, 10).map((u, i) => {
      const eclipseActive = (u as any).eclipseUntil && new Date() < new Date((u as any).eclipseUntil);
      const xpDisplay = eclipseActive ? "???" : `${u.xp} XP`;
      const nameDisplay = eclipseActive ? `??? [Eclipse]` : u.name;
      return `  ${i + 1}. ${nameDisplay} — ${xpDisplay}`;
    }).join("\n");
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
    return msg.reply(`╭══════════════════════╮\n  🏪 SHOP\n╰══════════════════════╯\n\n  💊 *Cures*\n  Grey Rot Cure — 500 XP\n  Hellfire Suppressant — 600 XP\n  Feral Antidote — 600 XP\n  Grace Restoration Vial — 700 XP\n  Scale Restoration Salve — 800 XP\n  Rootwither Remedy — 700 XP\n\n  ⚗️ *Special Items*\n  Blood Rune — 1000 XP\n  Eclipse Stone — 1200 XP\n  Phantom Seal — 1100 XP\n  Cursed Coin — 200 XP\n  Mirror Shard — 1300 XP\n  Vampire Tooth — 1500 XP\n  Cursed Bone — 2000 XP\n  Living Core — 2500 XP\n  Star Dust — 3000 XP\n  Dragon Egg — 5000 XP\n  Void Fragment — 8000 XP\n\n  Use !buy [item name]\n╰══════════════════════╯`);
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

    // ── NOTE: NO random fail pool. Every item always works when used.
    // The old "dormant" fail was only meant for randomly FOUND items during chat,
    // not for items you deliberately use. All items below always activate.

    const updates: any = {};

    // ── 🌟 STAR DUST — opens a Dust Domain for 30 minutes ───────────────────
    if (itemLower === "star dust") {
      if ((user as any).dustDomainUntil && new Date() < new Date((user as any).dustDomainUntil)) {
        return msg.reply("✨ Your Dust Domain is already active!");
      }
      const expiresAt = new Date(Date.now() + 1800000);
      updates.dustDomainUntil = expiresAt;
      updates.dustDomainMessages = 0;
      const expireStr = expiresAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      inv.splice(num, 1);
      updates.inventory = inv;
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*The dust scatters. The air around you ripples.*\n\n` +
        `✨ *DUST DOMAIN ACTIVATED*\n\n` +
        `The stars align above you. A shimmering domain of light expands outward, bending reality to your will.\n\n` +
        `⚡ Every *10 messages* you send earns *+5000 XP*.\n` +
        `⏳ Domain expires at: *${expireStr}* (30 minutes).\n\n` +
        `*Make every message count, Cultivator.*`
      );
    }

    // ── 🌑 VOID FRAGMENT — 97% chance to become Constellation ───────────────
    if (itemLower === "void fragment") {
      inv.splice(num, 1);
      if (Math.random() > 0.03) {
        await storage.updateUser(phoneId, { inventory: inv });
        return msg.reply(
          `*You hold the Void Fragment up. Reality cracks around it.*\n\n` +
          `🌑 The stars refused your call. The fragment dissolves into shadow.\n` +
          `*Better luck next time.*`
        );
      }
      updates.inventory = inv;
      updates.species = "Constellation";
      updates.isConstellation = true;
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*The fragment shatters. The void opens.*\n\n` +
        `🌑 *RACE TRANSFORMED*\n\n` +
        `You have transcended mortal flesh. You are now a *✨ Constellation*.\n` +
        `Your power resonates with the stars themselves.\n` +
        `⚡ XP Rate: *300 XP per message*\n\n` +
        `*You are beyond them now.*`
      );
    }

    // ── 🌿 LIVING CORE — reborn as a random new species ─────────────────────
    if (itemLower === "living core") {
      const sp = getRandomSpecies();
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.species = sp.name;
      updates.isConstellation = false;
      updates.hasShadowVeil = false;
      updates.condition = "Healthy";
      updates.disease = null;
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*The Living Core pulses in your hands. Ancient life floods your veins.*\n\n` +
        `🌿 *REBIRTH*\n\n` +
        `Your old form dissolves. Something new rises from within.\n` +
        `🧬 New Race: *${sp.name}* (${sp.rarity})\n` +
        `⚡ XP Rate: *${SPECIES_XP_RATES[sp.name]} XP per message*\n\n` +
        `*You are reborn. Start again. Climb higher.*`
      );
    }

    // ── 🦴 CURSED BONE — permanent shadow veil / plague immunity ────────────
    if (itemLower === "cursed bone") {
      if (user.hasShadowVeil) return msg.reply("🦴 Your Shadow Veil is already active. You are already immune to plagues.");
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.hasShadowVeil = true;
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*The bone crumbles to ash in your hand. Cold shadows curl around you.*\n\n` +
        `🦴 *SHADOW VEIL ACTIVE*\n\n` +
        `Darkness clings to your soul like armour. Plagues cannot find you.\n` +
        `You are permanently immune to all disease outbreaks.\n\n` +
        `*Let the others suffer. Not you.*`
      );
    }

    // ── 🥚 DRAGON EGG — begins feeding on other users' XP ───────────────────
    if (itemLower === "dragon egg") {
      if (user.dragonEggProgress > 0) return msg.reply("🥚 Your Dragon Egg is already active and feeding.");
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.dragonEggProgress = 1;
      updates.dragonEggHatched = false;
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*You place the egg on the ground. It twitches.*\n\n` +
        `🥚 *DRAGON EGG AWAKENED*\n\n` +
        `The egg has begun feeding. Every 5 minutes, it silently drains *30 XP* from a random cultivator nearby.\n` +
        `It needs *1500 XP total* to hatch.\n\n` +
        `*Something ancient stirs within the shell.*`
      );
    }

    // ── 🦷 VAMPIRE TOOTH — become a vampire for 1 week ──────────────────────
    if (itemLower === "vampire tooth") {
      if (user.isVampire && user.vampireUntil && new Date() < new Date(user.vampireUntil)) {
        return msg.reply("🦷 You are already a Vampire. Your fangs are still sharp.");
      }
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.isVampire = true;
      updates.vampireUntil = new Date(Date.now() + 604800000);
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*The tooth pierces your skin. Cold fire spreads through your veins.*\n\n` +
        `🦷 *VAMPIRIC CURSE ACCEPTED*\n\n` +
        `You are now a Vampire for *1 week*.\n` +
        `Use *!suck* (reply to someone's message) to drain their XP once per hour.\n\n` +
        `*Feed well. The night is yours.*`
      );
    }

    // ── 🩸 BLOOD RUNE — steal XP from a random user ─────────────────────────
    if (itemLower === "blood rune") {
      const allUsers = await storage.getUsers();
      const victims = allUsers.filter(u => u.phoneId !== phoneId && u.xp >= 50 && !u.hasShadowVeil && !u.isDead);
      if (!victims.length) {
        inv.splice(num, 1);
        updates.inventory = inv;
        await storage.updateUser(phoneId, updates);
        return msg.reply(`🩸 *Blood Rune activated, but there are no suitable targets nearby.* The rune fades unused.`);
      }
      const victim = victims[Math.floor(Math.random() * victims.length)];
      const stolen = Math.floor(Math.random() * 401) + 100; // 100–500 XP
      const actualStolen = Math.min(stolen, victim.xp);
      inv.splice(num, 1);
      updates.inventory = inv;
      await storage.updateUser(phoneId, { ...updates, xp: user.xp + actualStolen });
      await storage.updateUser(victim.phoneId, { xp: Math.max(0, victim.xp - actualStolen) });
      await client.sendMessage(victim.phoneId,
        `*A dark sigil burns into your chest. Something takes from you in the night.*\n🩸 You lost *${actualStolen} XP* to a Blood Rune.`
      );
      return msg.reply(
        `*You press the rune to your palm. Blood answers blood.*\n\n` +
        `🩸 *BLOOD RUNE ACTIVATED*\n\n` +
        `A distant cultivator staggers. Their XP bleeds into you.\n` +
        `💰 *+${actualStolen} XP* stolen from the shadows.\n\n` +
        `*They will never know it was you.*`
      );
    }

    // ── 🌒 ECLIPSE STONE — hide your race & XP from others for 24hrs ────────
    if (itemLower === "eclipse stone") {
      const expiresAt = new Date(Date.now() + 86400000);
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.eclipseUntil = expiresAt;
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*The stone pulses once — then goes dark.*\n\n` +
        `🌒 *ECLIPSE ACTIVE*\n\n` +
        `Your identity is cloaked. For the next *24 hours*, your species and XP are hidden from the leaderboard and any inspection.\n\n` +
        `*Move in shadow. Let no one track your ascension.*`
      );
    }

    // ── 👻 PHANTOM SEAL — vanish from the leaderboard for 24hrs ────────────
    if (itemLower === "phantom seal") {
      const expiresAt = new Date(Date.now() + 86400000);
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.phantomUntil = expiresAt;
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*The seal dissolves into mist. Your presence fades.*\n\n` +
        `👻 *PHANTOM SEAL ACTIVE*\n\n` +
        `You have vanished from the leaderboard for *24 hours*.\n` +
        `Others cannot see your rank or placement.\n\n` +
        `*You were never there.*`
      );
    }

    // ── 🪙 CURSED COIN — random outcome, good or bad ────────────────────────
    if (itemLower === "cursed coin") {
      inv.splice(num, 1);
      updates.inventory = inv;
      const roll = Math.random();
      let coinResult = "";
      if (roll < 0.05) {
        // Jackpot: +2000 XP
        updates.xp = user.xp + 2000;
        coinResult = `🪙 *JACKPOT!* The coin lands on a forgotten god's face.\n*+2000 XP* flows into you from nowhere.`;
      } else if (roll < 0.20) {
        // Good: +500 XP
        updates.xp = user.xp + 500;
        coinResult = `🪙 The coin spins... and smiles at you.\n*+500 XP* granted by fortune.`;
      } else if (roll < 0.40) {
        // Neutral: nothing
        coinResult = `🪙 The coin spins... and vanishes mid-air.\n*Nothing happens.* The curse offers nothing today.`;
      } else if (roll < 0.65) {
        // Bad: -300 XP
        updates.xp = Math.max(0, user.xp - 300);
        coinResult = `🪙 The coin lands face-down.\n💸 *-300 XP* drained by the curse.`;
      } else if (roll < 0.80) {
        // Worse: infected
        const stats = await storage.getGlobalStats();
        if (stats?.activeDisease && !user.hasShadowVeil && user.condition === "Healthy") {
          updates.condition = "Infected";
          updates.disease = stats.activeDisease;
          updates.infectedAt = new Date();
          coinResult = `🪙 The coin laughs.\n☣️ *You have been cursed with ${stats.activeDisease}!*\nBuy a cure from !shop.`;
        } else {
          updates.xp = Math.max(0, user.xp - 200);
          coinResult = `🪙 The coin frowns at you.\n💸 *-200 XP* taken by bad luck.`;
        }
      } else {
        // Rare good: shadow veil
        updates.hasShadowVeil = true;
        coinResult = `🪙 *The coin glows black.*\n🦴 Against all odds — *Shadow Veil granted!* You are now immune to plagues.`;
      }
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*You flip the Cursed Coin into the air...*\n\n${coinResult}`);
    }

    // ── 🪞 MIRROR SHARD — copy another user's race for 30 mins ──────────────
    if (itemLower === "mirror shard") {
      if (!msg.hasQuotedMsg) {
        return msg.reply("🪞 *Mirror Shard:* Reply to the message of the person whose race you want to copy, then use *!useitem [num]*.");
      }
      const quoted = await msg.getQuotedMessage();
      const targetId = resolvePhoneId(quoted);
      const target = await storage.getUserByPhone(targetId);
      if (!target || !target.isRegistered) return msg.reply("❌ Target not found or not registered.");
      if (targetId === phoneId) return msg.reply("❌ You cannot mirror yourself.");
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.mirrorRace = target.species;
      updates.mirrorOriginalRace = user.species;
      updates.mirrorUntil = new Date(Date.now() + 1800000); // 30 mins
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*The shard reflects a face that isn't yours.*\n\n` +
        `🪞 *MIRROR ACTIVE*\n\n` +
        `You have copied the race of *${target.name}*.\n` +
        `🧬 Temporary Race: *${target.species}*\n` +
        `⚡ XP Rate: *${SPECIES_XP_RATES[target.species] || 5} XP per message*\n` +
        `⏳ Duration: *30 minutes*\n\n` +
        `*Become them. Then return to yourself.*`
      );
    }

    // ── 💊 CURES ──────────────────────────────────────────────────────────────
    if (
      itemLower.includes("cure") || itemLower.includes("remedy") ||
      itemLower.includes("antidote") || itemLower.includes("vial") ||
      itemLower.includes("salve") || itemLower.includes("suppressant")
    ) {
      const disease = Object.values(DISEASES).find(d => d.cure === itemLower);
      if (!disease) return msg.reply("❌ This cure doesn't match any known disease.");
      if (user.species !== disease.race) return msg.reply(`❌ This cure was made for *${disease.race}*, not *${user.species}*. Wrong species.`);
      if (user.condition !== "Infected") return msg.reply("❌ You are not infected. Save the cure for when you need it.");
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.condition = "Healthy";
      updates.disease = null;
      updates.hp = 100;
      await storage.updateUser(phoneId, updates);
      return msg.reply(
        `*You drink the vial. The fever breaks. The shadows retreat.*\n\n` +
        `💉 *CURED*\n\n` +
        `You have recovered from *${disease.name}*.\n` +
        `❤️ HP restored to *100*.\n\n` +
        `*You live to fight another day.*`
      );
    }

    // ── Fallback — item not handled ───────────────────────────────────────────
    return msg.reply(`❌ *${itemName}* cannot be used directly. Check !scroll for usage instructions.`);
  }

  if (body.startsWith("!suck") && user.isVampire) {
    if (!msg.hasQuotedMsg) return msg.reply("🦷 Reply to someone's message to suck their XP.");
    const quoted = await msg.getQuotedMessage();
    const targetId = resolvePhoneId(quoted);
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found.");
    if (target.xp > user.xp * 2) return msg.reply("🦷 They are too powerful. Your fangs find no grip.");
    const now = Date.now();
    if (user.lastSuckAt && now - new Date(user.lastSuckAt).getTime() < 3600000) {
      const mins = Math.ceil((3600000 - (now - new Date(user.lastSuckAt).getTime())) / 60000);
      return msg.reply(`🦷 You must wait *${mins}* more minute(s) before feeding again.`);
    }
    const amt = Math.floor(Math.random() * 251) + 50;
    await storage.updateUser(phoneId, { xp: user.xp + amt, lastSuckAt: new Date() });
    await storage.updateUser(targetId, { xp: Math.max(0, target.xp - amt) });
    await client.sendMessage(targetId, `*Something cold grips you in the dark.*\n🦷 You lost *${amt} XP*.`);
    return msg.reply(`🦷 You drained *${amt} XP* from *${target.name}*.`);
  }

  // ── FIX: !givexp — use resolvePhoneId so it works in group chats ────────────
  if (body.startsWith("!givexp ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give XP.");
    const amt = parseInt(body.split(" ")[1]);
    if (isNaN(amt) || amt <= 0) return msg.reply("❌ Invalid amount. Use: !givexp [number]");
    if (user.xp < amt) return msg.reply(`❌ You only have *${user.xp}* XP.`);
    const quoted = await msg.getQuotedMessage();
    const targetId = resolvePhoneId(quoted);
    if (targetId === phoneId) return msg.reply("❌ You cannot give XP to yourself.");
    const target = await storage.getUserByPhone(targetId);
    if (!target || !target.isRegistered) return msg.reply("❌ That user is not registered. They need to type *!start* first.");
    await storage.updateUser(phoneId, { xp: user.xp - amt });
    await storage.updateUser(targetId, { xp: target.xp + amt });
    await client.sendMessage(targetId, `💰 *${user.name}* gifted you *${amt} XP!*`);
    return msg.reply(`💰 You gave *${amt} XP* to *${target.name}*.`);
  }

  if (body.startsWith("!giveitem ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give an item.");
    const num = parseInt(body.split(" ")[1]) - 1;
    const inv = [...(user.inventory as string[])];
    if (isNaN(num) || !inv[num]) return msg.reply("❌ Invalid item number. Check !inventory.");
    const quoted = await msg.getQuotedMessage();
    const targetId = resolvePhoneId(quoted);
    if (targetId === phoneId) return msg.reply("❌ You cannot give items to yourself.");
    const target = await storage.getUserByPhone(targetId);
    if (!target || !target.isRegistered) return msg.reply("❌ That user is not registered. They need to type *!start* first.");
    const item = inv.splice(num, 1)[0];
    await storage.updateUser(phoneId, { inventory: inv });
    await storage.updateUser(targetId, { inventory: [...(target.inventory as string[]), item] });
    await client.sendMessage(targetId, `🎁 *${user.name}* gave you [*${item}*]!`);
    return msg.reply(`🎁 You gave *[${item}]* to *${target.name}*.`);
  }

  if (body.startsWith("!revive")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a dead person's message to revive them.");
    const quoted = await msg.getQuotedMessage();
    const targetId = resolvePhoneId(quoted);
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found.");
    if (!target.isDead) return msg.reply("❌ That person is not dead.");
    if (target.species !== user.species) return msg.reply("❌ You can only revive someone of the same species.");
    await storage.updateUser(targetId, { isDead: false, hp: 10 });
    await client.sendMessage(targetId, `🕊️ *${user.name}* has revived you! You are back with 10 HP. Stay safe.`);
    return msg.reply(`🕊️ You revived *${target.name}*!`);
  }

  // ── CARDS ─────────────────────────────────────────────────────────────────────

  if (body === "!getcard") {
    const now = new Date();
    if (user.lastCardClaim) {
      const diff = now.getTime() - new Date(user.lastCardClaim).getTime();
      if (diff < 86400000) {
        const hoursLeft = Math.ceil((86400000 - diff) / 3600000);
        return msg.reply(`🎴 You already claimed your card today! Come back in *${hoursLeft}* hour(s).`);
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
        return;
      } catch { /* fall through to text reply */ }
    }
    return msg.reply(cardMsg);
  }

  if (body === "!cardcollection") {
    const userCards = await storage.getUserCards(phoneId);
    if (!userCards.length) return msg.reply("🎴 You have no cards yet. Use *!getcard* to claim your daily card.");
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

  // ── FIX: !givecard — use resolvePhoneId ──────────────────────────────────────
  if (body.startsWith("!givecard ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give a card.");
    const num = parseInt(body.split(" ")[1]) - 1;
    const userCards = await storage.getUserCards(phoneId);
    if (isNaN(num) || !userCards[num]) return msg.reply("❌ Invalid card number. Check !cardcollection.");
    const quoted = await msg.getQuotedMessage();
    const targetId = resolvePhoneId(quoted);
    if (targetId === phoneId) return msg.reply("❌ You cannot give cards to yourself.");
    const target = await storage.getUserByPhone(targetId);
    if (!target || !target.isRegistered) return msg.reply("❌ That user is not registered. They need to type *!start* first.");
    const card = userCards[num];
    await storage.updateCard(card.id, { ownerPhoneId: targetId });
    await client.sendMessage(targetId, `🎴 *${user.name}* gave you the card *${card.name}* [${card.rarity}]!`);
    return msg.reply(`🎴 You gave *${card.name}* to *${target.name}*.`);
  }

  // ── GUIDE COMMANDS ───────────────────────────────────────────────────────────

  if (body === "!getguide") {
    if ((user as any).guideName) {
      const existingGuide = GUIDES[(user as any).guideName.toLowerCase()];
      return msg.reply(`${existingGuide?.emoji || "💞"} You already have *${(user as any).guideName}* as your guide.`);
    }
    if (!annaSpawned) return msg.reply("❌ No guide has appeared yet. Wait for the owner to summon one.");
    annaSpawned = false;
    annaSpawnedAt = null;
    await storage.updateUser(phoneId, { guideName: ANNA.name } as any);
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), ANNA.image));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "anna.jpg");
      await msg.reply(media, undefined, { caption: ANNA.claimMsg });
    } catch { await msg.reply(ANNA.claimMsg); }
    return;
  }

  if (body === "!talkguide") {
    const guideName = (user as any).guideName?.toLowerCase();
    if (!guideName) return msg.reply("❌ You don't have a guide yet. Wait for *!guidespawn* then use *!getguide*.");
    const guide = GUIDES[guideName];
    if (!guide) return msg.reply("❌ Guide not found.");
    const response = guide.talkResponses[Math.floor(Math.random() * guide.talkResponses.length)];
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), guide.image));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "guide.jpg");
      await msg.reply(media, undefined, { caption: response });
    } catch { await msg.reply(response); }
    return;
  }

  if (body === "!smashmyguide") {
    const guideName = (user as any).guideName?.toLowerCase();
    if (!guideName) return msg.reply("❌ You don't have a guide. Use *!getguide* to claim one.");
    const guide = GUIDES[guideName];
    if (!guide) return msg.reply("❌ Guide not found.");
    if ((user as any).guideSmashAt) return msg.reply(`${guide.emoji} *${guide.name}:* "...Again?! Give me a moment to breathe, will you?! 😳"`);
    await storage.updateUser(phoneId, { guideSmashAt: new Date(), guidePregnant: false } as any);
    const scene = guide.smashScene.join("\n");
    return msg.reply(scene);
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
    await msg.reply(`✨ Your family is complete!\n👨 You + ${guide.emoji} ${guide.name} + 👶 ${childName}\n\n+5000 XP per week permanently added!`);
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

  // ── SECTS ─────────────────────────────────────────────────────────────────────

  if (body.startsWith("!joinsect ")) {
    if (user.sectId) return msg.reply("❌ You are already in a sect. Use *!sectleave* first.");
    const sectName = body.replace("!joinsect ", "").trim();
    const sect = await storage.getSectByName(sectName);
    if (!sect) return msg.reply(`❌ Sect *${sectName}* not found. Check !sectranking for existing sects.`);
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await storage.updateSect(sect.id, { membersCount: sect.membersCount + 1 });
    await client.sendMessage(sect.leaderPhoneId, `🏯 *${user.name}* has joined your sect!`);
    return msg.reply(`🏯 You have joined *${sect.name}* [${sect.tag}]!`);
  }

  if (body === "!mysect") {
    if (!user.sectId) return msg.reply("❌ You are not in a sect. Use *!joinsect [name]* to join one.");
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
    if (user.xp < amt) return msg.reply(`❌ You only have *${user.xp}* XP.`);
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

  // ── SECT LEADER COMMANDS ──────────────────────────────────────────────────────

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
    await client.sendMessage(target.phoneId, `⚡ You have been punished by your sect leader! You lost *${penalty} XP*.`);
    return msg.reply(`⚡ *${target.name}* has been punished. They lost *${penalty} XP*.`);
  }

  // ── OWNER COMMANDS — everything below is owner-only ──────────────────────────

  if (phoneId !== OWNER_NUMBER) return;

  if (body === "!guidespawn") {
    annaSpawned = true;
    annaSpawnedAt = new Date();
    const announcement = `╭══════════════════════╮\n   ✦┊【 A G U I D E 】┊✦\n╰══════════════════════╯\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  A guide has appeared!\n  She wanders into the realm,\n  searching for a worthy\n  cultivator to walk beside.\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Type *!getguide* to claim her.\n  She stays forever.\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼\n╰══════════════════════╯`;
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), ANNA.image));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "anna.jpg");
      await msg.reply(media, undefined, { caption: announcement });
    } catch { await msg.reply(announcement); }
    return;
  }

  // ── FIX: !ban — search by name OR phone number ────────────────────────────────
  if (body.startsWith("!ban ")) {
    const targetName = body.replace("!ban ", "").trim();
    const allUsers = await storage.getUsers();
    const target = allUsers.find(u =>
      u.name.toLowerCase() === targetName.toLowerCase() ||
      u.phoneId.includes(targetName)
    );
    if (!target) return msg.reply(`❌ User *${targetName}* not found.`);
    if (target.isBanned) return msg.reply(`⚠️ *${target.name}* is already banned.`);
    await storage.updateUser(target.phoneId, { isBanned: true });
    await client.sendMessage(target.phoneId, `🔨 You have been banned from Astral Bot.`);
    return msg.reply(`🔨 *${target.name}* has been banned.`);
  }

  // ── FIX: !unban — search all users not just banned list ──────────────────────
  if (body.startsWith("!unban ")) {
    const targetName = body.replace("!unban ", "").trim();
    const allUsers = await storage.getUsers();
    const target = allUsers.find(u =>
      (u.name.toLowerCase() === targetName.toLowerCase() ||
        u.phoneId.includes(targetName)) &&
      u.isBanned
    );
    if (!target) return msg.reply(`❌ Banned user *${targetName}* not found.`);
    await storage.updateUser(target.phoneId, { isBanned: false });
    await client.sendMessage(target.phoneId, `🔓 You have been unbanned. Welcome back to Astral Bot.`);
    return msg.reply(`🔓 *${target.name}* has been unbanned.`);
  }

  // ── FIX: !missastral — correct reply syntax with image ───────────────────────
  if (body.startsWith("!missastral")) {
    const missMsg = `*Miss Astral opens one eye slowly...*\n\n🐱 I am alive, yare yare.\nI may sleep soon tho.`;
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), "attached_assets/Missastral.jpg"));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "missastral.jpg");
      // FIX: use client.sendMessage to the chat instead of msg.reply with wrong args
      await client.sendMessage(msg.from, media, { caption: missMsg });
    } catch (err) {
      console.error("Miss Astral image error:", err);
      await msg.reply(missMsg);
    }
    return;
  }

  if (body.startsWith("!addxp ")) {
    const parts = body.split(" ");
    const amt = parseInt(parts[1]);
    const targetName = parts.slice(2).join(" ").trim();
    if (isNaN(amt)) return msg.reply("❌ Usage: !addxp [amount] [name]");
    const allUsers = await storage.getUsers();
    const target = targetName
      ? allUsers.find(u => u.name.toLowerCase() === targetName.toLowerCase())
      : allUsers.find(u => u.phoneId === phoneId);
    if (!target) return msg.reply(`❌ User not found.`);
    await storage.updateUser(target.phoneId, { xp: target.xp + amt });
    return msg.reply(`✅ Added *${amt} XP* to *${target.name}*. New total: ${target.xp + amt}`);
  }
}

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
