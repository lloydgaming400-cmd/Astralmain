import pkg from 'whatsapp-web.js';
import fetch from 'node-fetch';
const { Client, LocalAuth, MessageMedia } = pkg;
type Message = pkg.Message;
import { storage } from './storage';
import { type User, type Card, type Sect } from '@shared/schema';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  ALL_SKILLS,
  BATTLE_LOCATIONS,
  type BattleState,
  type Combatant,
  type Skill,
  computeStats,
  determineFirstMover,
  formatTurnBlock,
  formatSkillList,
  calculateDamage,
  applySkillEffect,
  applyPassive,
  applyTurnEffects,
  tickCooldowns,
  tickEffects,
  canUseSkill,
  getDefaultSkill,
  getUnlockedSkills,
  makeBar,
  randomLocation,
  RANK_MP_COST,
} from './battle';

export let currentQrCode: string | undefined;
export let connectionStatus: "CONNECTED" | "DISCONNECTED" | "WAITING_FOR_QR" = "DISCONNECTED";

const OWNER_NUMBER = "2347062301848@c.us";

// ══════════════════════════════════════════════════════════════════
//  IN-MEMORY BATTLE STATE
// ══════════════════════════════════════════════════════════════════

// Active battles: key = challengerPhoneId
const activeBattles = new Map<string, BattleState>();

// Pending challenges: key = challengerPhoneId, value = timeout handle
const challengeTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Turn timers: key = battleId
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();

// ══════════════════════════════════════════════════════════════════
//  HELP / SCROLL MENUS
// ══════════════════════════════════════════════════════════════════

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
  ⚔️  Battle & conquer
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
  ⚔️ BATTLE
  ⚔️ !challenge ↳ challenge user (reply)
  ✅ !accept ↳ accept challenge
  ❌ !decline ↳ decline challenge
  🔢 1 / 2 / 3 ↳ pick skill in battle
  📖 !skills ↳ view unlocked skills
  🎯 !equipskill [id] ↳ equip active skill
  🛡️ !equippassive [id] ↳ equip passive
  📊 !battlestats ↳ your battle stats
  🏆 !battleboard ↳ battle leaderboard
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
  "blood rune": { price: 50000, description: "Steal XP from another user." },
  "eclipse stone": { price: 60000, description: "Hide your race & XP for 24hrs." },
  "phantom seal": { price: 55000, description: "Vanish from the leaderboard for 24hrs." },
  "cursed coin": { price: 10000, description: "Unknown outcome. Flip and find out." },
  "mirror shard": { price: 65000, description: "Copy another user's race for 30mins." },
  "vampire tooth": { price: 75000, description: "Become a vampire for a week." },
  "cursed bone": { price: 100000, description: "Attract shadows for permanent protection." },
  "grey rot cure": { price: 25000, description: "Cures the Grey Rot. (Human)" },
  "hellfire suppressant": { price: 30000, description: "Cures Hellfire Fever. (Demon)" },
  "feral antidote": { price: 30000, description: "Cures the Feral Plague. (Beast Clan)" },
  "grace restoration vial": { price: 35000, description: "Cures Corruption Blight. (Fallen Angel)" },
  "scale restoration salve": { price: 40000, description: "Cures Scale Sickness. (Dragon)" },
  "rootwither remedy": { price: 35000, description: "Cures Rootwither. (Elf)" },
  "living core": { price: 100000, description: "Rebirth into a new random species." },
  "dragon egg": { price: 100000, description: "A mysterious egg that feeds on XP." },
  "void fragment": { price: 100000, description: "A fragment of the void. Extremely unstable." },
  "star dust": { price: 80000, description: "Dust from the stars. Grants a temporary domain." },
};

const DISEASES: Record<string, { name: string; race: string; startMsg: string; endMsg: string; cure: string }> = {
  "Human": { name: "The Grey Rot", race: "Human", startMsg: "A deadly disease has spread throughout the Human race. The Grey Rot is consuming them from within.", endMsg: "The Grey Rot has run its course. The Human race can breathe again.", cure: "grey rot cure" },
  "Demon": { name: "Hellfire Fever", race: "Demon", startMsg: "A plague has ignited within the Demon race. Hellfire Fever is burning through their ranks.", endMsg: "The flames have died down. Hellfire Fever has left the Demon race.", cure: "hellfire suppressant" },
  "Beast Clan": { name: "Feral Plague", race: "Beast Clan", startMsg: "A plague has broken loose within the Beast Clan. The Feral Plague is tearing through their kind.", endMsg: "The Feral Plague has been contained. The Beast Clan rises again.", cure: "feral antidote" },
  "Fallen Angel": { name: "Corruption Blight", race: "Fallen Angel", startMsg: "A blight has swept through the Fallen Angel race. Corruption Blight is consuming what little grace they have left.", endMsg: "The Corruption Blight has faded. The Fallen Angels endure once more.", cure: "grace restoration vial" },
  "Dragon": { name: "Scale Sickness", race: "Dragon", startMsg: "A sickness has infected the Dragon race. Scale Sickness is cracking through their legendary hides.", endMsg: "Scale Sickness has passed. The Dragon race stands unbroken.", cure: "scale restoration salve" },
  "Elf": { name: "Rootwither", race: "Elf", startMsg: "A withering has begun among the Elf race. Rootwither is severing their bond with the ancient world.", endMsg: "Rootwither has retreated into the earth. The Elf race is restored.", cure: "rootwither remedy" }
};

const ANNA = {
  name: "Anna",
  emoji: "🔴",
  image: "attached_assets/Anna.jpg",
  imageWithChild: "attached_assets/Annawithchild.jpg",
  greeting: `*A red-haired girl bursts in, nearly knocking over everything in sight~*\n\n🔴 *Anna:* "OH— you actually called for me?! Heheheh~ I'm Anna! Your guide, your partner, your absolute chaos companion! Let's make history together darling~! 🔥"\n\nType *!getguide* to claim Anna as your permanent guide!`,
  claimMsg: `*Anna beams at you like you just made the best decision of your life.*\n\n🔴 *Anna:* "You chose ME?! Darling~ I KNEW you had good taste!! Don't worry, I'll take GREAT care of you!! This is forever okay?! No take-backs~! 🔥"`,
  talkResponses: [
    `🔴 *Anna:* "Darling~! I was JUST thinking about you! Are you eating? Training? Smiling?! 😤"`,
    `🔴 *Anna:* "You know, I sorted your inventory in my head while you were gone. Don't ask how. I just did~ 💫"`,
    `🔴 *Anna:* "Ohhh you came to talk to me! Best decision of your LIFE darling, truly~! 🥰"`,
    `🔴 *Anna:* "I found THREE rare herbs today! ...I ate one. It was delicious. The other two are yours~ 🌿"`,
    `🔴 *Anna:* "You better be ranking up out there! I didn't sign up to guide someone mediocre~ Just kidding. Maybe. 😏"`,
    `🔴 *Anna:* "Sometimes I watch you from a distance and think... yeah. I made a good choice too~ 🌸"`,
    `🔴 *Anna:* "Don't get cocky out there okay?! I can't revive you from here darling~! 😤"`,
  ],
  pregnantMsg: `🔴 *Anna:* "Darling... I have something to tell you. I've been feeling different lately. Something is... different inside me. I think— I think I'm pregnant. 🌸\n...Don't look at me like that! This is YOUR fault~!"`,
  birthMsg: `🔴 *Anna:* "DARLING~!! It's time!! She's HERE! Our baby is HERE! 😭🌸\nShe's so tiny and perfect and— she has your eyes I think?!\n\nName her! Use *!namechild [name]* RIGHT NOW!!"`,
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
};

const GUIDES: Record<string, typeof ANNA> = { anna: ANNA };

let annaSpawned = false;
let annaSpawnedAt: Date | null = null;

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

function resolvePhoneId(msg: any): string {
  // In groups, msg.author is the sender. In DMs, msg.from is the sender.
  return msg.author || msg.from;
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
    let stats = await storage.getGlobalStats();
    if (!stats) {
      await storage.updateGlobalStats({ totalMessages: 0, activeDisease: null });
      stats = await storage.getGlobalStats() || { activeDisease: null, lastOutbreakAt: null };
    }
    const now = new Date();
    if (!stats.activeDisease && (!stats.lastOutbreakAt || now.getTime() - new Date(stats.lastOutbreakAt).getTime() > 604800000)) {
      const races = Object.keys(DISEASES);
      const randomRace = races[Math.floor(Math.random() * races.length)];
      const disease = DISEASES[randomRace];
      const endsAt = new Date(now.getTime() + (Math.floor(Math.random() * 7) + 1) * 86400000);
      await storage.updateGlobalStats({ activeDisease: disease.name, diseaseRace: disease.race, lastOutbreakAt: now, outbreakEndsAt: endsAt });
      await client.sendMessage(OWNER_NUMBER, `☣️ *DISEASE OUTBREAK*\n\n${disease.startMsg}\n\nAffected race: *${disease.race}*\nCure: *${disease.cure}*`);
      const atRiskUsers = await storage.getUsers();
      for (const u of atRiskUsers) {
        if (u.species === disease.race && !u.hasShadowVeil && !u.isDead) {
          await client.sendMessage(u.phoneId,
            `⚠️ *OUTBREAK WARNING*\n\n${disease.startMsg}\n\nAs a *${disease.race}*, you are at risk of infection.\nBuy *${disease.cure}* from !shop to protect yourself.\nOr use a *Cursed Bone* for permanent Shadow Veil immunity.`
          ).catch(() => {});
        }
      }
    } else if (stats.activeDisease && stats.outbreakEndsAt && now > new Date(stats.outbreakEndsAt)) {
      const disease = Object.values(DISEASES).find(d => d.name === stats.activeDisease);
      await storage.updateGlobalStats({ activeDisease: null, diseaseRace: null, outbreakEndsAt: null });
      await client.sendMessage(OWNER_NUMBER, `✨ *DISEASE CLEARED*\n\n${disease?.endMsg}`);
      const survivors = await storage.getUsers();
      for (const u of survivors) {
        if (u.species === disease?.race && !u.isDead) {
          await client.sendMessage(u.phoneId, `✨ *THE PLAGUE HAS PASSED*\n\n${disease?.endMsg}\n\nYou survived.`).catch(() => {});
        }
      }
    }
    // Expire old challenges
    await storage.expireOldChallenges();
  } catch (err) { console.error("Interval error:", err); }
}, 300000);

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
  client.on('ready', async () => {
    connectionStatus = "CONNECTED";
    currentQrCode = undefined;
    console.log('Bot is ready');
    // Clean up any users stuck in battle state from a previous crash/restart
    try {
      const allUsers = await storage.getUsers();
      for (const u of allUsers) {
        if ((u as any).inBattle) {
          await storage.updateUser(u.phoneId, { inBattle: false } as any);
        }
      }
      await storage.expireOldChallenges();
      console.log('[startup] inBattle cleanup complete.');
    } catch (err) { console.error('[startup] cleanup error:', err); }
  });
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

// ══════════════════════════════════════════════════════════════════
//  BATTLE HELPERS
// ══════════════════════════════════════════════════════════════════

function getBattleByParticipant(phoneId: string): BattleState | null {
  for (const battle of activeBattles.values()) {
    if (battle.challenger.phoneId === phoneId || battle.target.phoneId === phoneId) {
      return battle;
    }
  }
  return null;
}

function getDefaultEquippedActives(botRank: number): Skill[] {
  const unlocked = getUnlockedSkills(botRank);
  const actives = unlocked.filter(s => s.type === "active");
  return actives.slice(0, 3);
}

function getDefaultEquippedPassive(botRank: number): Skill | null {
  const unlocked = getUnlockedSkills(botRank);
  return unlocked.find(s => s.type === "passive") || null;
}

function buildCombatant(user: User): Combatant {
  const bExp = (user as any).battleExp || 0;
  const stats = computeStats(user, bExp);

  // Resolve equipped actives
  const equippedActiveIds: string[] = (user.equippedActives as string[]) || [];
  let equippedActives: Skill[] = equippedActiveIds
    .map(id => ALL_SKILLS.find(s => s.id === id))
    .filter(Boolean) as Skill[];

  if (equippedActives.length === 0) {
    equippedActives = getDefaultEquippedActives(user.rank);
  }

  // Ensure at least 1 active
  if (equippedActives.length === 0) {
    equippedActives = [ALL_SKILLS.find(s => s.type === "active")!];
  }

  const equippedPassiveId = (user as any).equippedPassive as string | null;
  let equippedPassive: Skill | null = null;
  if (equippedPassiveId) {
    equippedPassive = ALL_SKILLS.find(s => s.id === equippedPassiveId) || null;
  }
  if (!equippedPassive) {
    equippedPassive = getDefaultEquippedPassive(user.rank);
  }

  return {
    phoneId: user.phoneId,
    name: user.name,
    stats,
    hp: stats.maxHp,
    mp: stats.maxMp,
    equippedActives,
    equippedPassive,
    activeEffects: [],
    cooldowns: {},
    battleExp: bExp,
  };
}

// ── Announce turn and ask first mover for skill pick ─────────────
async function announceTurn(state: BattleState): Promise<void> {
  const turnBlock = formatTurnBlock(state);
  const firstMover = state.firstMoverId === state.challenger.phoneId
    ? state.challenger
    : state.target;

  const skillList = formatSkillList(firstMover);
  const stunned = firstMover.activeEffects.some(fx => fx.kind === "stun" || fx.kind === "freeze");

  let pickMsg: string;
  if (stunned) {
    pickMsg = `\n\n⚡ *${firstMover.name}* is stunned and cannot act this turn.`;
    state.challengerSkillChoice = firstMover.phoneId === state.challenger.phoneId ? "__stunned__" : state.challengerSkillChoice;
    state.targetSkillChoice = firstMover.phoneId === state.target.phoneId ? "__stunned__" : state.targetSkillChoice;
  } else {
    pickMsg = `\n\n*${firstMover.name}*, it is your turn.\nPick a skill:\n${skillList}\n\nType *1*, *2*, or *3* to use that skill.\nYou have 2 minutes.`;
    state.phase = firstMover.phoneId === state.challenger.phoneId
      ? "waiting_challenger"
      : "waiting_target";
  }

  await client.sendMessage(state.chatId, `${turnBlock}${pickMsg}`);

  // Start turn timer
  clearTurnTimer(state.id);
  if (!stunned) {
    const timer = setTimeout(async () => {
      await handleTurnTimeout(state, firstMover.phoneId);
    }, 120000);
    turnTimers.set(state.id, timer);
  } else {
    // Stunned — immediately auto-resolve this mover
    await resolveStunnedMover(state, firstMover.phoneId);
  }
}

async function resolveStunnedMover(state: BattleState, phoneId: string): Promise<void> {
  if (phoneId === state.challenger.phoneId) {
    state.challengerSkillChoice = "__stunned__";
  } else {
    state.targetSkillChoice = "__stunned__";
  }
  await promptSecondMoverOrResolve(state);
}

async function promptSecondMoverOrResolve(state: BattleState): Promise<void> {
  const firstMover = state.firstMoverId === state.challenger.phoneId ? state.challenger : state.target;
  const secondMover = state.firstMoverId === state.challenger.phoneId ? state.target : state.challenger;

  const firstChose = state.firstMoverId === state.challenger.phoneId
    ? state.challengerSkillChoice !== null
    : state.targetSkillChoice !== null;

  if (!firstChose) return; // Still waiting for first mover

  // Check if second mover also chose / auto
  const secondChose = state.firstMoverId === state.challenger.phoneId
    ? state.targetSkillChoice !== null
    : state.challengerSkillChoice !== null;

  if (!secondChose) {
    // Prompt second mover
    const stunned2 = secondMover.activeEffects.some(fx => fx.kind === "stun" || fx.kind === "freeze");
    if (stunned2) {
      // Announce the stun so the group sees it
      await client.sendMessage(
        state.chatId,
        `⚡ *${secondMover.name}* is stunned and cannot act this turn.`
      );
      if (secondMover.phoneId === state.challenger.phoneId) {
        state.challengerSkillChoice = "__stunned__";
      } else {
        state.targetSkillChoice = "__stunned__";
      }
      await resolveTurn(state);
    } else {
      const skillList2 = formatSkillList(secondMover);
      await client.sendMessage(
        state.chatId,
        `*${secondMover.name}*, it is your turn.\nPick a skill:\n${skillList2}\n\nType *1*, *2*, or *3*.\nYou have 2 minutes.`
      );
      state.phase = secondMover.phoneId === state.challenger.phoneId
        ? "waiting_challenger"
        : "waiting_target";

      clearTurnTimer(state.id);
      const timer = setTimeout(async () => {
        await handleTurnTimeout(state, secondMover.phoneId);
      }, 120000);
      turnTimers.set(state.id, timer);
    }
  } else {
    await resolveTurn(state);
  }
}

async function handleTurnTimeout(state: BattleState, phoneId: string): Promise<void> {
  const combatant = phoneId === state.challenger.phoneId ? state.challenger : state.target;
  const defaultSk = getDefaultSkill(combatant);
  await client.sendMessage(
    state.chatId,
    `⏱️ *${combatant.name}* took too long. Auto-using *${defaultSk.name}*.`
  );
  if (phoneId === state.challenger.phoneId) {
    state.challengerSkillChoice = defaultSk.id;
  } else {
    state.targetSkillChoice = defaultSk.id;
  }
  await promptSecondMoverOrResolve(state);
}

function clearTurnTimer(battleId: string): void {
  const t = turnTimers.get(battleId);
  if (t) { clearTimeout(t); turnTimers.delete(battleId); }
}

// ── Core turn resolution ──────────────────────────────────────────
async function resolveTurn(state: BattleState): Promise<void> {
  state.phase = "resolving";
  clearTurnTimer(state.id);

  const { challenger, target } = state;
  const firstMover = state.firstMoverId === challenger.phoneId ? challenger : target;
  const secondMover = state.firstMoverId === challenger.phoneId ? target : challenger;

  const firstSkillId = firstMover.phoneId === challenger.phoneId
    ? state.challengerSkillChoice
    : state.targetSkillChoice;
  const secondSkillId = firstMover.phoneId === challenger.phoneId
    ? state.targetSkillChoice
    : state.challengerSkillChoice;

  // Apply turn-start DoT/regen effects to both combatants
  const dotLogs: string[] = [
    ...applyTurnEffects(challenger),
    ...applyTurnEffects(target),
  ];

  const resolutionLines: string[] = [];
  if (dotLogs.length) resolutionLines.push(...dotLogs, "");

  // ── BUG FIX: Check if DoT killed someone before skill resolution ─────────
  if (challenger.hp <= 0 && target.hp <= 0) {
    await endBattle(state, null, null, resolutionLines);
    return;
  }
  if (challenger.hp <= 0) {
    resolutionLines.push(`💀 *${challenger.name}* has perished from their wounds before they could act.`);
    await endBattle(state, target, challenger, resolutionLines);
    return;
  }
  if (target.hp <= 0) {
    resolutionLines.push(`💀 *${target.name}* has perished from their wounds before they could act.`);
    await endBattle(state, challenger, target, resolutionLines);
    return;
  }

  // Resolve first mover's skill
  const firstResult = await resolveSkillAction(firstMover, secondMover, firstSkillId);
  resolutionLines.push(...firstResult.lines);

  // Check fatal after first mover
  if (secondMover.hp <= 0) {
    await endBattle(state, firstMover, secondMover, resolutionLines);
    return;
  }

  // Resolve second mover's skill
  const secondResult = await resolveSkillAction(secondMover, firstMover, secondSkillId);
  resolutionLines.push(...secondResult.lines);

  // Check fatal after second mover
  if (firstMover.hp <= 0 && secondMover.hp <= 0) {
    await endBattle(state, null, null, resolutionLines); // Draw
    return;
  }
  if (firstMover.hp <= 0) {
    await endBattle(state, secondMover, firstMover, resolutionLines);
    return;
  }

  // Tick cooldowns and effects for both
  tickCooldowns(challenger);
  tickCooldowns(target);
  const expiredCh = tickEffects(challenger);
  const expiredTg = tickEffects(target);
  if (expiredCh.length) resolutionLines.push(`⏸️ ${challenger.name}: ${expiredCh.join(", ")} effect(s) expired.`);
  if (expiredTg.length) resolutionLines.push(`⏸️ ${target.name}: ${expiredTg.join(", ")} effect(s) expired.`);

  // Compose result message
  const chHpBar = makeBar(challenger.hp, challenger.stats.maxHp);
  const chMpBar = makeBar(challenger.mp, challenger.stats.maxMp);
  const tgHpBar = makeBar(target.hp, target.stats.maxHp);
  const tgMpBar = makeBar(target.mp, target.stats.maxMp);

  const activeEffectsSummary: string[] = [];
  for (const fx of challenger.activeEffects) {
    if (fx.duration !== 999 && fx.turnsLeft > 0) {
      activeEffectsSummary.push(`• *${challenger.name}*: ${fx.source} — ${fx.kind} (${fx.turnsLeft} turn(s) left)`);
    }
  }
  for (const fx of target.activeEffects) {
    if (fx.duration !== 999 && fx.turnsLeft > 0) {
      activeEffectsSummary.push(`• *${target.name}*: ${fx.source} — ${fx.kind} (${fx.turnsLeft} turn(s) left)`);
    }
  }

  let resultMsg =
    `⚔️ *TURN ${state.turn} RESULT*\n\n` +
    resolutionLines.join("\n") +
    `\n\n*${challenger.name}*\n` +
    `HP: [${chHpBar}] ${challenger.hp}/${challenger.stats.maxHp}\n` +
    `MP: [${chMpBar}] ${challenger.mp}/${challenger.stats.maxMp}\n\n` +
    `*${target.name}*\n` +
    `HP: [${tgHpBar}] ${target.hp}/${target.stats.maxHp}\n` +
    `MP: [${tgMpBar}] ${target.mp}/${target.stats.maxMp}`;

  if (activeEffectsSummary.length) {
    resultMsg += `\n\n*Active effects:*\n${activeEffectsSummary.join("\n")}`;
  }

  resultMsg += `\n\n_Next turn begins shortly..._`;

  await client.sendMessage(state.chatId, resultMsg);

  // Advance turn
  state.turn++;
  state.challengerSkillChoice = null;
  state.targetSkillChoice = null;

  // Re-determine speed order for next turn
  const { firstId, speedLog } = determineFirstMover(challenger, target);
  state.firstMoverId = firstId;

  await new Promise(r => setTimeout(r, 2000));
  await announceTurn(state);
}

// ── Resolve a single skill action ────────────────────────────────
async function resolveSkillAction(
  attacker: Combatant,
  defender: Combatant,
  skillId: string | null
): Promise<{ lines: string[] }> {
  const lines: string[] = [];

  if (skillId === "__stunned__") {
    lines.push(`⚡ *${attacker.name}* is stunned. No action taken.`);
    return { lines };
  }

  const skill = skillId
    ? ALL_SKILLS.find(s => s.id === skillId) || getDefaultSkill(attacker)
    : getDefaultSkill(attacker);

  lines.push(`⚔️ *${attacker.name}* used *${skill.name}* (${skill.rank}-rank)`);

  // Deduct MP
  attacker.mp = Math.max(0, attacker.mp - skill.mpCost);

  // Calculate damage
  const { damage, dodged, crit } = calculateDamage(attacker, defender, skill);

  if (dodged) {
    lines.push(`💨 *${defender.name}* dodged the attack!`);
  } else if (damage > 0) {
    defender.hp = Math.max(0, defender.hp - damage);
    lines.push(`💥 Damage dealt: *${damage}*${crit ? " ✨ CRITICAL!" : ""}`);
    lines.push(`${defender.name} HP: *${defender.hp}/${defender.stats.maxHp}*`);

    // Lifesteal
    const lifesteal = attacker.activeEffects.find(fx => fx.kind === "lifesteal");
    if (lifesteal) {
      const healed = Math.floor(damage * lifesteal.value);
      attacker.hp = Math.min(attacker.stats.maxHp, attacker.hp + healed);
      lines.push(`🩸 *${attacker.name}* lifesteals *${healed} HP*. HP: ${attacker.hp}`);
      // Remove lifesteal effect
      attacker.activeEffects = attacker.activeEffects.filter(fx => fx.kind !== "lifesteal");
    }

    // Fatal blow check
    if (defender.hp <= 0) {
      lines.push(`\n💀 *A fatal blow.* ${defender.name} could not withstand the force.`);
      lines.push(`${defender.name} HP: 0`);
      lines.push(`\n*${defender.name} has been defeated. The battle ends now.*`);
    }
  } else if (skill.attackPercent === 0) {
    lines.push(`✨ Utility effect activated.`);
  }

  // Apply skill effect
  if (skill.effect) {
    const effectLogs = applySkillEffect(skill.effect, skill.name, attacker, defender);
    lines.push(...effectLogs);
  }

  // Apply cooldown
  if (skill.cooldown > 0) {
    attacker.cooldowns[skill.id] = skill.cooldown;
  }

  lines.push("");
  return { lines };
}

// ── End battle ────────────────────────────────────────────────────
async function endBattle(
  state: BattleState,
  winner: Combatant | null,
  loser: Combatant | null,
  resolutionLines: string[]
): Promise<void> {
  state.phase = "ended";
  clearTurnTimer(state.id);
  activeBattles.delete(state.challenger.phoneId);

  const { challenger, target, location } = state;

  // Mark both as not in battle
  await storage.updateUser(challenger.phoneId, { inBattle: false } as any);
  await storage.updateUser(target.phoneId, { inBattle: false } as any);

  if (!winner || !loser) {
    // Draw
    await client.sendMessage(
      state.chatId,
      `⚔️ *BATTLE OVER — DRAW*\n📍 ${location}\n\nBoth warriors fall at the same moment.\nNeither claims victory.\nNo XP or Battle EXP transferred.`
    );
    return;
  }

  const xpTransfer = state.xpTransfer;
  const battleExpGain = 50;

  // Update winner — re-fetch fresh DB values BEFORE updating so display is accurate
  const winnerUser = await storage.getUserByPhone(winner.phoneId);
  const loserUser = await storage.getUserByPhone(loser.phoneId);

  const freshWinnerXp = winnerUser?.xp || 0;
  const freshLoserXp = loserUser?.xp || 0;
  const loserLoss = Math.min(xpTransfer, freshLoserXp); // can't go below 0

  if (winnerUser) {
    await storage.updateUser(winner.phoneId, {
      xp: freshWinnerXp + loserLoss, // winner gets exactly what loser loses
      battleExp: ((winnerUser as any).battleExp || 0) + battleExpGain,
      battleWins: ((winnerUser as any).battleWins || 0) + 1,
    } as any);
  }

  if (loserUser) {
    await storage.updateUser(loser.phoneId, {
      xp: Math.max(0, freshLoserXp - xpTransfer),
      battleLosses: ((loserUser as any).battleLosses || 0) + 1,
    } as any);
  }

  const winnerNewXp = freshWinnerXp + loserLoss;
  const loserNewXp = Math.max(0, freshLoserXp - xpTransfer);
  const winnerNewBExp = ((winnerUser as any)?.battleExp || 0) + battleExpGain;

  await client.sendMessage(
    state.chatId,
    `⚔️ *BATTLE OVER*\n📍 ${location}\n\n` +
    `*${winner.name}* stands victorious.\n` +
    `*${loser.name}* has fallen.\n\n` +
    `🏆 *Winner:* ${winner.name}\n` +
    `💀 *Loser:* ${loser.name}\n\n` +
    `⚡ Battle EXP earned: *+${battleExpGain}*\n` +
    `💰 Chat XP transferred: *${loserLoss}*\n\n` +
    `${winner.name} Battle EXP: *${winnerNewBExp}*\n` +
    `${winner.name} Chat XP: *${winnerNewXp}*\n` +
    `${loser.name} Chat XP: *${loserNewXp}*`
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN MESSAGE HANDLER
// ══════════════════════════════════════════════════════════════════

const RULES_MENU = `╭══════════════════════╮
   ✦┊【 Ｓａｃｒｅｄ  Ｌａｗｓ 】┊✦
╰══════════════════════╯
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  1. No spamming commands.
  2. Respect all cultivators.
  3. No exploiting game bugs.
  4. Trading is at your own risk.
  5. The Dao is absolute.
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼
╰══════════════════════╯`;

async function handleMessage(msg: Message) {
  const phoneId = msg.author || msg.from;
  const contact = await msg.getContact();
  const name = contact.pushname || contact.number;
  const body = msg.body.trim().toLowerCase();
  let user = await storage.getUserByPhone(phoneId);

  if (user?.isBanned) return;

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
      user = await storage.createUser({
        phoneId, name, species: sp.name, isRegistered: true, xp: 0, messages: 0,
        condition: "Healthy", rank: 8, inventory: [], hp: 100,
      } as any);
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

  // ── Infection trigger ─────────────────────────────────────────────────────────
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
        `☣️ *INFECTED*\n\nYou have contracted *${stats.activeDisease}*.\nYour HP is draining *5 per 5 minutes*.\n\nBuy a cure from *!shop* before you perish.\nShadow Veil (*!buy cursed bone*) grants permanent immunity.`
      );
    }
  }

  // ── Battle skill pick: 1, 2, 3 ───────────────────────────────────────────────
  if (body === "1" || body === "2" || body === "3") {
    const battle = getBattleByParticipant(phoneId);
    if (battle && battle.phase !== "resolving" && battle.phase !== "ended") {
      const idx = parseInt(body) - 1;
      const combatant = phoneId === battle.challenger.phoneId ? battle.challenger : battle.target;
      const isChallenger = phoneId === battle.challenger.phoneId;

      // Prevent picking if already chosen this turn
      const myChoice = isChallenger ? battle.challengerSkillChoice : battle.targetSkillChoice;
      if (myChoice !== null) {
        return msg.reply("⚔️ You already chose your skill this turn. Wait for the turn to resolve.");
      }

      // Enforce turn order: second mover cannot pick before first mover has chosen
      const isFirstMover = battle.firstMoverId === phoneId;
      const firstMoverChose = battle.firstMoverId === battle.challenger.phoneId
        ? battle.challengerSkillChoice !== null
        : battle.targetSkillChoice !== null;

      if (!isFirstMover && !firstMoverChose) {
        return msg.reply("⏳ Wait for your opponent to pick their skill first.");
      }

      const skill = combatant.equippedActives[idx];
      if (!skill) {
        return msg.reply(`❌ Invalid choice. Pick 1–${combatant.equippedActives.length}.`);
      }

      const { ok, reason } = canUseSkill(combatant, skill);
      if (!ok) {
        return msg.reply(`❌ ${reason}\n\nPick another skill.`);
      }

      if (isChallenger) {
        battle.challengerSkillChoice = skill.id;
      } else {
        battle.targetSkillChoice = skill.id;
      }

      clearTurnTimer(battle.id);
      await msg.reply(`✅ *${skill.name}* selected.`);
      await promptSecondMoverOrResolve(battle);
      return;
    }
  }

  // ── XP gain on normal messages ─────────────────────────────────────────────
  if (body.length >= 3 && !body.startsWith("!")) {
    let activeSpecies = user.species;
    if ((user as any).mirrorUntil && new Date() < new Date((user as any).mirrorUntil)) {
      activeSpecies = (user as any).mirrorRace || user.species;
    } else if ((user as any).mirrorUntil && new Date() >= new Date((user as any).mirrorUntil) && (user as any).mirrorRace) {
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

        // Announce newly unlocked skills on rank-up
        const newUnlocked = getUnlockedSkills(newRank.level);
        const prevUnlocked = getUnlockedSkills(oldRank.level);
        const fresh = newUnlocked.filter(sk => !prevUnlocked.find(p => p.id === sk.id));
        if (fresh.length) {
          const freshList = fresh.map(sk => `  • *${sk.name}* [${sk.rank}] — ${sk.description}`).join("\n");
          await client.sendMessage(phoneId, `⚔️ *NEW SKILLS UNLOCKED!*\n\n${freshList}\n\nUse *!skills* to view all. Use *!equipskill [id]* to equip.`);
        }
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

  // ══════════════════════════════════════════════════════════════════
  //  COMMANDS
  // ══════════════════════════════════════════════════════════════════

  if (body === "!rules") {
    return msg.reply(RULES_MENU);
  }

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

  if (body === "!status") {
    const currentRank = getRankForXp(user.xp);
    let sectLine = "None";
    if (user.sectId) {
      const sect = await storage.getSect(user.sectId);
      if (sect) sectLine = `${sect.name} [${sect.tag}]`;
    }
    return msg.reply(
      `╭══════════════════════╮\n   ✦┊【Ｑｕｉｃｋ Ｓｔａｔｕｓ】┊✦\n╰══════════════════════╯\n` +
      `  👤 ${user.name}\n  📈 ${currentRank.name}\n  ✨ XP: ${user.xp}\n` +
      `  ❤️ HP: ${generateHpBar(user.hp)}\n  🩺 ${getHpStatus(user.hp)}\n  🏯 Sect: ${sectLine}\n╰══════════════════════╯`
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
      `╭══════════════════════╮\n   ✦┊【Ｃｕｌｔｉｖａｔｏｒ Ｐｒｏｆｉｌｅ】┊✦\n╰══════════════════════╯\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  👤 Name: ${user.name}\n  🧬 Species: ${user.species}\n  ⚡ XP Rate: ${SPECIES_XP_RATES[user.species] || 5}/msg\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  📈 Rank: 【${currentRank.level}】${currentRank.name}\n  ✨ Total XP: ${user.xp}\n  💬 Messages: ${user.messages}\n` +
      (nextRank ? `  🎯 Next Rank: ${nextRank.name}\n  📊 XP Needed: ${xpToNext}\n` : `  🏅 MAX RANK ACHIEVED\n`) +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  ❤️ HP: ${generateHpBar(user.hp)}\n  🩺 State: ${getHpStatus(user.hp)}\n  🩹 Condition: ${user.condition}\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  🏯 Sect: ${sectLine}\n  💞 Guide: ${guideLine}\n  🎒 Items: ${inv.length}\n  🃏 Cards: (use !cardcollection)\n` +
      (vampActive ? `  🦷 Vampire: Active\n` : "") +
      (dustActive ? `  ✨ Dust Domain: Active\n` : "") +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼\n╰══════════════════════╯`
    );
  }

  if (body === "!leaderboard") {
    const top = await storage.getUsers();
    const rank = top.findIndex(u => u.phoneId === phoneId) + 1;
    const visible = top.filter(u => {
      if (u.phoneId === phoneId) return true;
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

  // ══════════════════════════════════════════════════════════════════
  //  ⚔️ BATTLE COMMANDS
  // ══════════════════════════════════════════════════════════════════

  // !skills — view all unlocked skills
  if (body === "!skills") {
    const unlocked = getUnlockedSkills(user.rank);
    if (!unlocked.length) return msg.reply("📖 No skills unlocked yet.\nYou start unlocking skills at Rank 8. Keep chatting to earn XP!");
    const actives = unlocked.filter(s => s.type === "active");
    const passives = unlocked.filter(s => s.type === "passive");
    const equippedIds = (user.equippedActives as string[]) || [];
    const equippedPassiveId = (user as any).equippedPassive as string | null;

    const activeList = actives.map((sk, i) => {
      const equipped = equippedIds.includes(sk.id) ? " ✅" : "";
      return `  [${i + 1}] *${sk.id}*${equipped}\n  ${sk.name} [${sk.rank}] — ${sk.mpCost} MP — CD: ${sk.cooldown === 0 ? "None" : `${sk.cooldown} turn(s)`}\n  ${sk.description}`;
    }).join("\n\n");

    const passiveList = passives.map(sk => {
      const equipped = equippedPassiveId === sk.id ? " ✅" : "";
      return `  *${sk.id}*${equipped}\n  ${sk.name} [${sk.rank}]\n  ${sk.description}`;
    }).join("\n\n");

    return msg.reply(
      `╭══════════════════════╮\n  ⚔️ YOUR SKILLS\n╰══════════════════════╯\n\n` +
      `📖 *ACTIVE SKILLS* (equip up to 3):\n${activeList}\n\n` +
      `🛡️ *PASSIVE SKILLS* (equip 1):\n${passiveList || "  None unlocked yet."}\n\n` +
      `*!equipskill [id]* — equip active\n` +
      `*!unequipskill [num]* — unequip by slot number\n` +
      `*!equippassive [id]* — equip passive\n╰══════════════════════╯`
    );
  }

  // !equipskill [id]
  if (body.startsWith("!equipskill ")) {
    const skillId = body.replace("!equipskill ", "").trim();
    if (!skillId) return msg.reply("❌ Usage: *!equipskill [skill_id]*\nCheck *!skills* to see valid skill IDs.");
    const skill = ALL_SKILLS.find(s => s.id === skillId);
    if (!skill) return msg.reply(`❌ No skill with ID *${skillId}* exists.\nCheck *!skills* for valid IDs.`);
    if (skill.type !== "active") return msg.reply(`❌ *${skill.name}* is a passive skill.\nUse *!equippassive ${skill.id}* instead.`);
    const unlocked = getUnlockedSkills(user.rank);
    if (!unlocked.find(s => s.id === skillId)) return msg.reply(`🔒 *${skill.name}* [${skill.rank}-rank] is not unlocked yet.\nRank up higher to access it.`);
    const current = (user.equippedActives as string[]) || [];
    if (current.includes(skillId)) return msg.reply(`✅ *${skill.name}* is already in your equipped slots.`);
    if (current.length >= 3) {
      const currentNames = current.map((id, i) => {
        const sk = ALL_SKILLS.find(s => s.id === id);
        return `  Slot ${i + 1}: ${sk?.name || id} [${sk?.rank}]`;
      }).join("\n");
      return msg.reply(
        `❌ All 3 skill slots are full:\n${currentNames}\n\nUnequip one first:\n*!unequipskill [slot number]*`
      );
    }
    const newEquipped = [...current, skillId];
    await storage.updateUser(phoneId, { equippedActives: newEquipped } as any);
    return msg.reply(`✅ *${skill.name}* [${skill.rank}] equipped in slot ${newEquipped.length}! (${newEquipped.length}/3)`);
  }

  // !unequipskill [num]
  if (body.startsWith("!unequipskill ")) {
    const numStr = body.replace("!unequipskill ", "").trim();
    const idx = parseInt(numStr) - 1;
    const current = [...((user.equippedActives as string[]) || [])];
    if (!current.length) return msg.reply("❌ You have no active skills equipped to remove.");
    if (isNaN(idx) || idx < 0 || idx >= current.length) {
      const slotList = current.map((id, i) => {
        const sk = ALL_SKILLS.find(s => s.id === id);
        return `  Slot ${i + 1}: ${sk?.name || id}`;
      }).join("\n");
      return msg.reply(`❌ Invalid slot number. Your equipped actives:\n${slotList}\n\nUse *!unequipskill [1-${current.length}]*`);
    }
    const removed = ALL_SKILLS.find(s => s.id === current[idx]);
    current.splice(idx, 1);
    await storage.updateUser(phoneId, { equippedActives: current } as any);
    return msg.reply(`✅ *${removed?.name || "Skill"}* removed from slot ${idx + 1}. (${current.length}/3 slots used)`);
  }

  // !equippassive [id]
  if (body.startsWith("!equippassive ")) {
    const skillId = body.replace("!equippassive ", "").trim();
    if (!skillId) return msg.reply("❌ Usage: *!equippassive [skill_id]*\nCheck *!skills* to see passive IDs.");
    const skill = ALL_SKILLS.find(s => s.id === skillId);
    if (!skill) return msg.reply(`❌ No skill with ID *${skillId}* exists.\nCheck *!skills* for valid IDs.`);
    if (skill.type !== "passive") return msg.reply(`❌ *${skill.name}* is an active skill.\nUse *!equipskill ${skill.id}* instead.`);
    const unlocked = getUnlockedSkills(user.rank);
    if (!unlocked.find(s => s.id === skillId)) return msg.reply(`🔒 *${skill.name}* [${skill.rank}-rank] is not unlocked yet.\nRank up higher to access it.`);
    const currentPassiveId = (user as any).equippedPassive as string | null;
    if (currentPassiveId === skillId) return msg.reply(`✅ *${skill.name}* is already your equipped passive.`);
    await storage.updateUser(phoneId, { equippedPassive: skillId } as any);
    return msg.reply(`✅ Passive *${skill.name}* [${skill.rank}] equipped.\nIt will activate automatically at the start of your next battle.`);
  }

  // !battlestats
  if (body === "!battlestats") {
    const bExp = (user as any).battleExp || 0;
    const wins = (user as any).battleWins || 0;
    const losses = (user as any).battleLosses || 0;
    const stats = computeStats(user, bExp);
    const equippedIds = (user.equippedActives as string[]) || [];
    const equippedPassiveId = (user as any).equippedPassive as string | null;
    const activeNames = equippedIds.map(id => ALL_SKILLS.find(s => s.id === id)?.name || id).join(", ") || "None";
    const passiveName = equippedPassiveId ? (ALL_SKILLS.find(s => s.id === equippedPassiveId)?.name || equippedPassiveId) : "None";
    return msg.reply(
      `╭══════════════════════╮\n  ⚔️ BATTLE STATS\n╰══════════════════════╯\n\n` +
      `  👤 ${user.name} [${user.species}]\n\n` +
      `  💪 STR: ${stats.strength}\n` +
      `  🏃 AGI: ${stats.agility}\n` +
      `  🧠 INT: ${stats.intelligence}\n` +
      `  🍀 LUCK: ${stats.luck}\n` +
      `  ⚡ SPD: ${stats.speed}\n` +
      `  ❤️ Max HP: ${stats.maxHp}\n` +
      `  💙 Max MP: ${stats.maxMp}\n\n` +
      `  ⚔️ Battle EXP: ${bExp}\n` +
      `  🏆 Wins: ${wins}\n` +
      `  💀 Losses: ${losses}\n\n` +
      `  🎯 Actives: ${activeNames}\n` +
      `  🛡️ Passive: ${passiveName}\n╰══════════════════════╯`
    );
  }

  // !battleboard
  if (body === "!battleboard") {
    const allUsers = await storage.getUsers();
    const sorted = allUsers
      .filter(u => (u as any).battleWins > 0 || (u as any).battleExp > 0)
      .sort((a, b) => ((b as any).battleExp || 0) - ((a as any).battleExp || 0));
    if (!sorted.length) return msg.reply("⚔️ No battles have been fought yet.");
    const list = sorted.slice(0, 10).map((u, i) =>
      `  ${i + 1}. ${u.name} — ${(u as any).battleExp || 0} BattleEXP | W:${(u as any).battleWins || 0} L:${(u as any).battleLosses || 0}`
    ).join("\n");
    return msg.reply(`╭══════════════════════╮\n  ⚔️ BATTLE LEADERBOARD\n╰══════════════════════╯\n${list}\n╰══════════════════════╯`);
  }

  // !challenge — reply to target's message
  if (body === "!challenge") {
    if (!msg.hasQuotedMsg) return msg.reply("⚔️ *How to challenge:*\nReply to your opponent's message, then type *!challenge*.");
    if (user.isDead) return msg.reply("💀 You cannot issue a challenge while dead.\nGet revived first with *!revive*.");
    if (user.hp <= 0) return msg.reply("💔 Your HP is at 0. You are not battle-ready.");
    if ((user as any).inBattle) return msg.reply("⚔️ You are already in an active battle.\nFinish your current battle first.");

    // Check existing pending challenge
    const myPending = await storage.getPendingChallenge(phoneId);
    if (myPending) return msg.reply("⏳ You already have a pending challenge out.\nWait for it to expire or be answered before issuing another.");

    const quoted = await msg.getQuotedMessage();
    const targetId = resolvePhoneId(quoted);

    if (targetId === phoneId) return msg.reply("🪞 You cannot challenge yourself, Cultivator.");

    const target = await storage.getUserByPhone(targetId);
    if (!target || !target.isRegistered) return msg.reply("❌ That user hasn't registered yet.\nTell them to type *!start* to join the realm first.");
    if (target.isDead) return msg.reply(`💀 *${target.name}* is dead and cannot battle.\nThey must be revived first.`);
    if (target.hp <= 0) return msg.reply(`💔 *${target.name}* has no HP. They cannot battle right now.`);
    if ((target as any).inBattle) return msg.reply(`⚔️ *${target.name}* is already in an active battle.\nWait for them to finish.`);

    // Check if target has any outgoing OR incoming pending challenge
    const targetPendingIncoming = await storage.getPendingChallengeForTarget(targetId);
    const targetPendingOutgoing = await storage.getPendingChallenge(targetId);
    if (targetPendingIncoming || targetPendingOutgoing) return msg.reply(`⏳ *${target.name}* already has a pending challenge.\nWait for it to resolve before challenging them.`);

    const expiresAt = new Date(Date.now() + 300000); // 5 minutes
    const challenge = await storage.createChallenge({
      challengerPhoneId: phoneId,
      targetPhoneId: targetId,
      chatId: msg.from,
      expiresAt,
      status: "pending",
    });

    await client.sendMessage(msg.from,
      `╭══════════════════════╮\n  ⚔️ CHALLENGE ISSUED\n╰══════════════════════╯\n\n` +
      `*${user.name}* has challenged *${target.name}* to battle!\n\n` +
      `*${target.name}*, type *!accept* or *!decline*.\n` +
      `This challenge expires in *5 minutes*.\n╰══════════════════════╯`
    );

    // Set expiry timer
    const timer = setTimeout(async () => {
      const ch = await storage.getPendingChallengeForTarget(targetId);
      if (ch && ch.id === challenge.id && ch.status === "pending") {
        await storage.updateChallenge(challenge.id, { status: "expired" });
        await client.sendMessage(msg.from,
          `⚔️ *${target.name}* did not respond.\nThe challenge has expired.`
        );
      }
    }, 300000);
    challengeTimers.set(phoneId, timer);
    return;
  }

  // !accept
  if (body === "!accept") {
    const challenge = await storage.getPendingChallengeForTarget(phoneId);
    if (!challenge) return msg.reply("❌ You have no pending challenge to accept.\nSomeone needs to *!challenge* you first.");
    if (new Date(challenge.expiresAt) < new Date()) {
      await storage.updateChallenge(challenge.id, { status: "expired" });
      return msg.reply("⌛ That challenge has already expired.");
    }
    if (user.isDead) return msg.reply("💀 You cannot accept a challenge while dead.\nGet revived with *!revive* first.");
    if (user.hp <= 0) return msg.reply("💔 Your HP is at 0. You are not battle-ready.");
    if ((user as any).inBattle) return msg.reply("⚔️ You are already in an active battle.");

    const challengerUser = await storage.getUserByPhone(challenge.challengerPhoneId);
    if (!challengerUser) return msg.reply("❌ The challenger's account was not found. The challenge is cancelled.");
    if ((challengerUser as any).inBattle) return msg.reply(`⚔️ *${challengerUser.name}* jumped into another battle while waiting. Challenge cancelled.`);
    if (challengerUser.isDead) return msg.reply(`💀 *${challengerUser.name}* has perished. Challenge cancelled.`);

    // Mark challenge accepted
    await storage.updateChallenge(challenge.id, { status: "accepted" });
    const timer = challengeTimers.get(challenge.challengerPhoneId);
    if (timer) { clearTimeout(timer); challengeTimers.delete(challenge.challengerPhoneId); }

    // Mark both in battle
    await storage.updateUser(challenge.challengerPhoneId, { inBattle: true } as any);
    await storage.updateUser(phoneId, { inBattle: true } as any);

    // Build combatants
    const challengerCombatant = buildCombatant(challengerUser);
    const targetCombatant = buildCombatant(user);

    // Apply passives
    const passiveLogs = [
      ...applyPassive(challengerCombatant),
      ...applyPassive(targetCombatant),
    ];

    const location = randomLocation();
    const { firstId, speedLog } = determineFirstMover(challengerCombatant, targetCombatant);
    const xpTransfer = Math.floor(Math.random() * 401) + 100; // 100-500

    const battleId = `${challenge.challengerPhoneId}_${Date.now()}`;
    const state: BattleState = {
      id: battleId,
      challenger: challengerCombatant,
      target: targetCombatant,
      turn: 1,
      location,
      firstMoverId: firstId,
      phase: "waiting_challenger",
      challengerSkillChoice: null,
      targetSkillChoice: null,
      turnTimer: null,
      chatId: challenge.chatId,
      xpTransfer,
    };

    activeBattles.set(challenge.challengerPhoneId, state);

    let startMsg =
      `╭══════════════════════╮\n  ⚔️ BATTLE BEGIN\n╰══════════════════════╯\n\n` +
      `*${challengerCombatant.name}* vs *${targetCombatant.name}*\n` +
      `📍 Location: *${location}*\n\n` +
      `Checking speed...\n\n${speedLog}`;

    if (passiveLogs.length) {
      startMsg += `\n\n${passiveLogs.join("\n")}`;
    }

    await client.sendMessage(challenge.chatId, startMsg);
    await new Promise(r => setTimeout(r, 2000));
    await announceTurn(state);
    return;
  }

  // !decline
  if (body === "!decline") {
    const challenge = await storage.getPendingChallengeForTarget(phoneId);
    if (!challenge) return msg.reply("❌ You have no pending challenge to decline.");

    await storage.updateChallenge(challenge.id, { status: "declined" });
    const timer = challengeTimers.get(challenge.challengerPhoneId);
    if (timer) { clearTimeout(timer); challengeTimers.delete(challenge.challengerPhoneId); }

    await client.sendMessage(challenge.chatId,
      `🚶 *${user.name}* has walked away from the challenge.\nThe battle will not take place.`
    );
    return;
  }

  // ══════════════════════════════════════════════════════════════════
  //  INVENTORY / SHOP
  // ══════════════════════════════════════════════════════════════════

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
      "living core": "🌿", "dragon egg": "🥚", "void fragment": "🌑", "star dust": "✨",
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
    const updates: any = {};

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
      return msg.reply(`*The dust scatters. The air around you ripples.*\n\n✨ *DUST DOMAIN ACTIVATED*\n\nEvery *10 messages* you send earns *+5000 XP*.\n⏳ Domain expires at: *${expireStr}* (30 minutes).\n\n*Make every message count, Cultivator.*`);
    }

    if (itemLower === "void fragment") {
      inv.splice(num, 1);
      if (Math.random() > 0.03) {
        await storage.updateUser(phoneId, { inventory: inv });
        return msg.reply(`*You hold the Void Fragment up. Reality cracks around it.*\n\n🌑 The stars refused your call. The fragment dissolves into shadow.\n*Better luck next time.*`);
      }
      updates.inventory = inv;
      updates.species = "Constellation";
      updates.isConstellation = true;
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*The fragment shatters. The void opens.*\n\n🌑 *RACE TRANSFORMED*\n\nYou have transcended mortal flesh. You are now a *✨ Constellation*.\n⚡ XP Rate: *300 XP per message*\n\n*You are beyond them now.*`);
    }

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
      return msg.reply(`*The Living Core pulses in your hands. Ancient life floods your veins.*\n\n🌿 *REBIRTH*\n\n🧬 New Race: *${sp.name}* (${sp.rarity})\n⚡ XP Rate: *${SPECIES_XP_RATES[sp.name]} XP per message*\n\n*You are reborn. Start again. Climb higher.*`);
    }

    if (itemLower === "cursed bone") {
      if (user.hasShadowVeil) return msg.reply("🦴 Your Shadow Veil is already active. You are already immune to plagues.");
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.hasShadowVeil = true;
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*The bone crumbles to ash in your hand. Cold shadows curl around you.*\n\n🦴 *SHADOW VEIL ACTIVE*\n\nDarkness clings to your soul like armour. You are permanently immune to all disease outbreaks.\n\n*Let the others suffer. Not you.*`);
    }

    if (itemLower === "dragon egg") {
      if (user.dragonEggProgress > 0) return msg.reply("🥚 Your Dragon Egg is already active and feeding.");
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.dragonEggProgress = 1;
      updates.dragonEggHatched = false;
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*You place the egg on the ground. It twitches.*\n\n🥚 *DRAGON EGG AWAKENED*\n\nThe egg has begun feeding. Every 5 minutes, it silently drains *30 XP* from a random cultivator nearby.\nIt needs *1500 XP total* to hatch.\n\n*Something ancient stirs within the shell.*`);
    }

    if (itemLower === "vampire tooth") {
      if (user.isVampire && user.vampireUntil && new Date() < new Date(user.vampireUntil)) {
        return msg.reply("🦷 You are already a Vampire. Your fangs are still sharp.");
      }
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.isVampire = true;
      updates.vampireUntil = new Date(Date.now() + 604800000);
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*The tooth pierces your skin. Cold fire spreads through your veins.*\n\n🦷 *VAMPIRIC CURSE ACCEPTED*\n\nYou are now a Vampire for *1 week*.\nUse *!suck* (reply to someone's message) to drain their XP once per hour.\n\n*Feed well. The night is yours.*`);
    }

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
      const stolen = Math.floor(Math.random() * 401) + 100;
      const actualStolen = Math.min(stolen, victim.xp);
      inv.splice(num, 1);
      updates.inventory = inv;
      await storage.updateUser(phoneId, { ...updates, xp: user.xp + actualStolen });
      await storage.updateUser(victim.phoneId, { xp: Math.max(0, victim.xp - actualStolen) });
      await client.sendMessage(victim.phoneId, `*A dark sigil burns into your chest. Something takes from you in the night.*\n🩸 You lost *${actualStolen} XP* to a Blood Rune.`);
      return msg.reply(`*You press the rune to your palm. Blood answers blood.*\n\n🩸 *BLOOD RUNE ACTIVATED*\n\n💰 *+${actualStolen} XP* stolen from the shadows.\n\n*They will never know it was you.*`);
    }

    if (itemLower === "eclipse stone") {
      const expiresAt = new Date(Date.now() + 86400000);
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.eclipseUntil = expiresAt;
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*The stone pulses once — then goes dark.*\n\n🌒 *ECLIPSE ACTIVE*\n\nYour identity is cloaked for *24 hours*.\n\n*Move in shadow. Let no one track your ascension.*`);
    }

    if (itemLower === "phantom seal") {
      const expiresAt = new Date(Date.now() + 86400000);
      inv.splice(num, 1);
      updates.inventory = inv;
      updates.phantomUntil = expiresAt;
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*The seal dissolves into mist. Your presence fades.*\n\n👻 *PHANTOM SEAL ACTIVE*\n\nYou have vanished from the leaderboard for *24 hours*.\n\n*You were never there.*`);
    }

    if (itemLower === "cursed coin") {
      inv.splice(num, 1);
      updates.inventory = inv;
      const roll = Math.random();
      let coinResult = "";
      if (roll < 0.05) {
        updates.xp = user.xp + 2000;
        coinResult = `🪙 *JACKPOT!* The coin lands on a forgotten god's face.\n*+2000 XP* flows into you from nowhere.`;
      } else if (roll < 0.20) {
        updates.xp = user.xp + 500;
        coinResult = `🪙 The coin spins... and smiles at you.\n*+500 XP* granted by fortune.`;
      } else if (roll < 0.40) {
        coinResult = `🪙 The coin spins... and vanishes mid-air.\n*Nothing happens.* The curse offers nothing today.`;
      } else if (roll < 0.65) {
        updates.xp = Math.max(0, user.xp - 300);
        coinResult = `🪙 The coin lands face-down.\n💸 *-300 XP* drained by the curse.`;
      } else if (roll < 0.80) {
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
        updates.hasShadowVeil = true;
        coinResult = `🪙 *The coin glows black.*\n🦴 Against all odds — *Shadow Veil granted!* You are now immune to plagues.`;
      }
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*You flip the Cursed Coin into the air...*\n\n${coinResult}`);
    }

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
      updates.mirrorUntil = new Date(Date.now() + 1800000);
      await storage.updateUser(phoneId, updates);
      return msg.reply(`*The shard reflects a face that isn't yours.*\n\n🪞 *MIRROR ACTIVE*\n\n🧬 Temporary Race: *${target.species}*\n⚡ XP Rate: *${SPECIES_XP_RATES[target.species] || 5} XP per message*\n⏳ Duration: *30 minutes*\n\n*Become them. Then return to yourself.*`);
    }

    if (itemLower.includes("cure") || itemLower.includes("remedy") || itemLower.includes("antidote") || itemLower.includes("vial") || itemLower.includes("salve") || itemLower.includes("suppressant")) {
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
      return msg.reply(`*You drink the vial. The fever breaks. The shadows retreat.*\n\n💉 *CURED*\n\nYou have recovered from *${disease.name}*.\n❤️ HP restored to *100*.\n\n*You live to fight another day.*`);
    }

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
    if (!target || !target.isRegistered) return msg.reply("❌ That user is not registered.");
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
      } catch { }
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

  if (body.startsWith("!givecard ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give a card.");
    const num = parseInt(body.split(" ")[1]) - 1;
    const userCards = await storage.getUserCards(phoneId);
    if (isNaN(num) || !userCards[num]) return msg.reply("❌ Invalid card number. Check !cardcollection.");
    const quoted = await msg.getQuotedMessage();
    const targetId = resolvePhoneId(quoted);
    if (targetId === phoneId) return msg.reply("❌ You cannot give cards to yourself.");
    const target = await storage.getUserByPhone(targetId);
    if (!target || !target.isRegistered) return msg.reply("❌ That user is not registered.");
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
    return msg.reply(guide.smashScene.join("\n"));
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
    const nameMsg = `🔴 *Anna:* "~${childName}~!! Oh that's PERFECT darling!! She's already kicking like she approves!! 😭🌸 Welcome to the world, little ${childName}~"`;
    await msg.reply(nameMsg);
    await msg.reply(`✨ Your family is complete!\n👨 You + ${guide.emoji} ${guide.name} + 👶 ${childName}\n\n+5000 XP per week permanently added!`);
    return;
  }

  if (body === "!leaveguide") {
    if (!(user as any).guideName) return msg.reply("❌ You don't have a guide.");
    const guideName = (user as any).guideName?.toLowerCase();
    const guide = GUIDES[guideName];
    const leaveMsg = `🔴 *Anna:* "...Oh. You're leaving? ...Fine. Fine! Go! I'm not crying, YOU'RE crying!! 😤 Come back when you're ready, darling~"`;
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

  // ── OWNER COMMANDS ────────────────────────────────────────────────────────────

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

  if (body.startsWith("!ban ")) {
    const targetName = body.replace("!ban ", "").trim();
    const allUsers = await storage.getUsers();
    const target = allUsers.find(u => u.name.toLowerCase() === targetName.toLowerCase() || u.phoneId.includes(targetName));
    if (!target) return msg.reply(`❌ User *${targetName}* not found.`);
    if (target.isBanned) return msg.reply(`⚠️ *${target.name}* is already banned.`);
    await storage.updateUser(target.phoneId, { isBanned: true });
    await client.sendMessage(target.phoneId, `🔨 You have been banned from Astral Bot.`);
    return msg.reply(`🔨 *${target.name}* has been banned.`);
  }

  if (body.startsWith("!unban ")) {
    const targetName = body.replace("!unban ", "").trim();
    const allUsers = await storage.getUsers();
    const target = allUsers.find(u => (u.name.toLowerCase() === targetName.toLowerCase() || u.phoneId.includes(targetName)) && u.isBanned);
    if (!target) return msg.reply(`❌ Banned user *${targetName}* not found.`);
    await storage.updateUser(target.phoneId, { isBanned: false });
    await client.sendMessage(target.phoneId, `🔓 You have been unbanned. Welcome back to Astral Bot.`);
    return msg.reply(`🔓 *${target.name}* has been unbanned.`);
  }

  if (body.startsWith("!missastral")) {
    const missMsg = `*Miss Astral opens one eye slowly...*\n\n🐱 I am alive, yare yare.\nI may sleep soon tho.`;
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), "attached_assets/Missastral.jpg"));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "missastral.jpg");
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

  // Owner: force end battle
  if (body.startsWith("!endbattle ")) {
    const targetName = body.replace("!endbattle ", "").trim();
    for (const [key, battle] of activeBattles.entries()) {
      if (battle.challenger.name.toLowerCase() === targetName.toLowerCase() ||
          battle.target.name.toLowerCase() === targetName.toLowerCase()) {
        clearTurnTimer(battle.id);
        activeBattles.delete(key);
        await storage.updateUser(battle.challenger.phoneId, { inBattle: false } as any);
        await storage.updateUser(battle.target.phoneId, { inBattle: false } as any);
        await client.sendMessage(battle.chatId, `⚔️ Battle between *${battle.challenger.name}* and *${battle.target.name}* has been force-ended by the owner.`);
        return msg.reply(`✅ Battle ended.`);
      }
    }
    return msg.reply(`❌ No active battle found with *${targetName}*.`);
  }
}

// ── Jikan API card fetch ──────────────────────────────────────────
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
