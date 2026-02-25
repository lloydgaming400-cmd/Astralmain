import pkg from 'whatsapp-web.js';
import fetch from 'node-fetch';
const { Client, LocalAuth, MessageMedia } = pkg;
type Message = pkg.Message;
import { storage } from './storage';
import { type User, type Card, type Sect } from '@shared/schema';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  ALL_SKILLS,
  computeStats,
  calculateDamage,
  applySkillEffect,
  applyPassive,
  applyTurnEffects,
  tickCooldowns,
  tickEffects,
  formatTurnBlock,
  formatSkillList,
  canUseSkill,
  getDefaultSkill,
  getUnlockedSkills,
  determineFirstMover,
  randomLocation,
  makeBar,
  type Combatant,
  type BattleState,
  type Skill,
} from './battle';
import {
  getMonsterForFloor,
  getFloorReward,
  resolveDungeonTurn,
  formatDungeonStatus,
  getDungeon,
  setDungeon,
  deleteDungeon,
  type DungeonState,
} from './dungeon';

export let currentQrCode: string | undefined;
export let connectionStatus: "CONNECTED" | "DISCONNECTED" | "WAITING_FOR_QR" = "DISCONNECTED";

const OWNER_LID = "87209327755401@lid";
const OWNER_CUS = process.env.OWNER_PHONE ? `${process.env.OWNER_PHONE}@c.us` : "";
const isOwner = (pid: string) => pid === OWNER_LID || (OWNER_CUS && pid === OWNER_CUS);
const OWNER_NUMBER = OWNER_LID;

// ── FIX: Helper to resolve quoted message to the correct registered phoneId ──
// In group chats, quoted.author returns @lid but users register with @c.us.
// This helper gets the contact properly so the ID always matches registration.
async function resolveQuotedUser(msg: Message): Promise<{ phoneId: string; contact: any } | null> {
  try {
    const quoted = await msg.getQuotedMessage();
    // Get the actual contact object from the quoted message — this gives @c.us format
    const contact = await quoted.getContact();
    const phoneId = contact.id._serialized;
    return { phoneId, contact };
  } catch {
    return null;
  }
}

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
  ➕ !createsect [name] [tag] ↳ found a sect
  🚪 !joinsect [name] ↳ join a sect
  🏯 !mysect ↳ view sect details
  💰 !donate [amount] ↳ donate XP
  📊 !sectranking ↳ sect leaderboard
  🚶 !sectleave ↳ leave your sect
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  ⚔️ BATTLE
  ⚔️ !challenge ↳ challenge someone (reply)
  ✅ !accept ↳ accept a challenge (reply)
  ❌ !decline ↳ decline a challenge (reply)
  🗡️ !pickskill [1/2/3] ↳ pick your skill
  📋 !skills ↳ view your equipped skills
  🔧 !equip [skillId] ↳ equip a skill
  🏳️ !forfeit ↳ surrender a battle
  📊 !battlestats ↳ your battle stats card
  🔍 !battlestats [name] ↳ view someone's stats
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🏰 DUNGEON
  🏰 !dungeon ↳ enter the Tower
  🗡️ !dpick [1/2/3] ↳ attack
  🏃 !descape ↳ flee dungeon
  📊 !dfloor ↳ check your floor
  🏆 !dtower ↳ tower leaderboard
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
  🚪 !leaveguide ↳ release your guide
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
  { level: 8, name: "Core Disciple of Mid",           threshold: 0,     messages: 0     },
  { level: 7, name: "Outer Disciple of Low Peak",      threshold: 100,   messages: 20    },
  { level: 6, name: "Inner Disciple of Mid Peak",      threshold: 500,   messages: 100   },
  { level: 5, name: "Core Disciple of Peak",           threshold: 2000,  messages: 400   },
  { level: 4, name: "Celestial Lord",                  threshold: 10000, messages: 2000  },
  { level: 3, name: "Dao of Heavenly Peak",            threshold: 20000, messages: 4000  },
  { level: 2, name: "Supreme Dao Ancestor",            threshold: 35000, messages: 6000  },
  { level: 1, name: "True Peak Dao of Astral Realm",  threshold: 50000, messages: 10000 },
];

function getRankForXp(xp: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].threshold) return RANKS[i];
  }
  return RANKS[0];
}

const SHOP_ITEMS: Record<string, { price: number; description: string }> = {
  "blood rune":               { price: 80000,  description: "Steal XP from another user. (reply to use)" },
  "eclipse stone":            { price: 90000,  description: "Hide your race & XP from others for 24hrs." },
  "phantom seal":             { price: 85000,  description: "Vanish from the leaderboard for 24hrs." },
  "cursed coin":              { price: 5000,   description: "Unknown outcome. Flip and find out." },
  "mirror shard":             { price: 95000,  description: "Copy another user's race for 30 mins. (reply to use)" },
  "vampire tooth":            { price: 100000, description: "Become a vampire for a week." },
  "cursed bone":              { price: 100000, description: "Attract shadows for permanent plague immunity." },
  "grey rot cure":            { price: 15000,  description: "Cures the Grey Rot. (Human)" },
  "hellfire suppressant":     { price: 18000,  description: "Cures Hellfire Fever. (Demon)" },
  "feral antidote":           { price: 18000,  description: "Cures the Feral Plague. (Beast Clan)" },
  "grace restoration vial":   { price: 20000,  description: "Cures Corruption Blight. (Fallen Angel)" },
  "scale restoration salve":  { price: 22000,  description: "Cures Scale Sickness. (Dragon)" },
  "rootwither remedy":        { price: 20000,  description: "Cures Rootwither. (Elf)" },
  "soul restoration tonic":   { price: 20000,  description: "Cures Soul Decay. (Spirit)" },
  "living core":              { price: 100000, description: "Rebirth into a new random species." },
  "dragon egg":               { price: 90000,  description: "A mysterious egg that feeds on nearby XP." },
  "void fragment":            { price: 100000, description: "A fragment of the void. Extremely unstable." },
  "star dust":                { price: 75000,  description: "Dust from the stars. Grants a temporary domain." },
};

const DISEASES: Record<string, { name: string; race: string; startMsg: string; endMsg: string; cure: string }> = {
  "Human":        { name: "The Grey Rot",        race: "Human",        startMsg: "A deadly disease has spread throughout the Human race. The Grey Rot is consuming them from within.",                  endMsg: "The Grey Rot has run its course. The Human race can breathe again.",           cure: "grey rot cure" },
  "Demon":        { name: "Hellfire Fever",       race: "Demon",        startMsg: "A plague has ignited within the Demon race. Hellfire Fever is burning through their ranks.",                         endMsg: "The flames have died down. Hellfire Fever has left the Demon race.",           cure: "hellfire suppressant" },
  "Beast Clan":   { name: "Feral Plague",         race: "Beast Clan",   startMsg: "A plague has broken loose within the Beast Clan. The Feral Plague is tearing through their kind.",                  endMsg: "The Feral Plague has been contained. The Beast Clan rises again.",            cure: "feral antidote" },
  "Fallen Angel": { name: "Corruption Blight",    race: "Fallen Angel", startMsg: "A blight has swept through the Fallen Angel race. Corruption Blight is consuming what little grace they have left.", endMsg: "The Corruption Blight has faded. The Fallen Angels endure once more.",       cure: "grace restoration vial" },
  "Dragon":       { name: "Scale Sickness",       race: "Dragon",       startMsg: "A sickness has infected the Dragon race. Scale Sickness is cracking through their legendary hides.",                endMsg: "Scale Sickness has passed. The Dragon race stands unbroken.",                 cure: "scale restoration salve" },
  "Elf":          { name: "Rootwither",           race: "Elf",          startMsg: "A withering has begun among the Elf race. Rootwither is severing their bond with the ancient world.",               endMsg: "Rootwither has retreated into the earth. The Elf race is restored.",          cure: "rootwither remedy" },
  "Spirit":       { name: "Soul Decay",           race: "Spirit",       startMsg: "A corruption has swept through the Spirit race. Soul Decay is dissolving their very essence.",                      endMsg: "Soul Decay has dissipated. The Spirit race endures once more.",               cure: "soul restoration tonic" },
};

async function fetchRandomAnimeCard(): Promise<{ characterId: number; name: string; series: string; rarity: string; imageUrl: string | null }> {
  try {
    const rarityRoll = Math.random();
    const rarity =
      rarityRoll < 0.05 ? "Legendary" :
      rarityRoll < 0.15 ? "Epic" :
      rarityRoll < 0.35 ? "Rare" :
      rarityRoll < 0.65 ? "Uncommon" : "Common";

    const page = Math.floor(Math.random() * 20) + 1;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let res: any;
    try {
      res = await fetch(`https://api.jikan.moe/v4/characters?page=${page}&limit=25`, {
        signal: controller.signal as any,
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await res.json() as any;
    if (!data?.data?.length) throw new Error("No data");
    const chars = data.data.filter((c: any) => c.images?.jpg?.image_url);
    const char = chars[Math.floor(Math.random() * chars.length)];
    const series = char.anime?.[0]?.anime?.title || char.manga?.[0]?.manga?.title || "Unknown Series";
    return { characterId: char.mal_id, name: char.name, series, rarity, imageUrl: char.images?.jpg?.image_url || null };
  } catch {
    const fallback = [
      { characterId: 1, name: "Naruto Uzumaki", series: "Naruto",        rarity: "Rare",      imageUrl: null },
      { characterId: 2, name: "Luffy",          series: "One Piece",     rarity: "Epic",      imageUrl: null },
      { characterId: 3, name: "Goku",           series: "Dragon Ball",   rarity: "Legendary", imageUrl: null },
      { characterId: 4, name: "Ichigo",         series: "Bleach",        rarity: "Rare",      imageUrl: null },
      { characterId: 5, name: "Saitama",        series: "One Punch Man", rarity: "Legendary", imageUrl: null },
    ];
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
}

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

const GUIDES: Record<string, typeof ANNA> = {
  anna: ANNA,
};

async function checkGuideEvents(user: any, phoneId: string) {
  if (!user.guideName || !user.guideSmashAt) return;
  const now = Date.now();
  const smashTime = new Date(user.guideSmashAt).getTime();

  if (!user.guidePregnant && now - smashTime >= 86400000) {
    await storage.updateUser(phoneId, { guidePregnant: true });
    await client.sendMessage(phoneId, ANNA.pregnantMsg);
  }

  if (user.guidePregnant && !user.guideChildName && now - smashTime >= 259200000) {
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), ANNA.imageWithChild));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "annawithchild.jpg");
      await client.sendMessage(phoneId, media, { caption: ANNA.birthMsg });
    } catch {
      await client.sendMessage(phoneId, ANNA.birthMsg);
    }
  }
}

function getRandomSpecies() {
  const races = Object.keys(SPECIES_XP_RATES).filter(r => r !== "Constellation");
  const name = races[Math.floor(Math.random() * races.length)];
  const rarity =
    name === "Celestial" ? "Legendary" :
    (name === "Dragon" || name === "Elf") ? "Very Rare" : "Common";
  return { name, rarity };
}

function getHpStatus(hp: number) {
  if (hp >= 100) return "Perfectly Healthy";
  if (hp >= 90)  return "Feeling Fine";
  if (hp >= 80)  return "Slightly Off";
  if (hp >= 70)  return "Under the Weather";
  if (hp >= 60)  return "Noticeably Sick";
  if (hp >= 50)  return "Unwell";
  if (hp >= 40)  return "Feverish";
  if (hp >= 30)  return "Seriously Ill";
  if (hp >= 20)  return "Deteriorating";
  if (hp >= 10)  return "Critical Condition";
  return "Perished";
}

function generateHpBar(hp: number) {
  const total = 10;
  const filled = Math.max(0, Math.ceil(hp / 10));
  const empty = total - filled;
  return "█".repeat(filled) + "░".repeat(empty) + ` ${hp}/100`;
}

async function resolveBattleTurn(battleId: string) {
  const record = storage.getBattle(battleId);
  if (!record) return;
  const state = record.state as BattleState;

  if (state.turnTimer) {
    clearTimeout(state.turnTimer);
    state.turnTimer = null;
  }

  const { challenger, target } = state;

  if (!state.challengerSkillChoice) {
    state.challengerSkillChoice = getDefaultSkill(challenger).id;
  }
  if (!state.targetSkillChoice) {
    state.targetSkillChoice = getDefaultSkill(target).id;
  }

  const cSkill = challenger.equippedActives.find(s => s.id === state.challengerSkillChoice) || getDefaultSkill(challenger);
  const tSkill = target.equippedActives.find(s => s.id === state.targetSkillChoice) || getDefaultSkill(target);

  state.phase = "resolving";
  const logs: string[] = [];

  const { firstId } = determineFirstMover(challenger, target);
  const [first, second, firstSkill, secondSkill] =
    firstId === challenger.phoneId
      ? [challenger, target, cSkill, tSkill]
      : [target, challenger, tSkill, cSkill];

  const firstStunned = first.activeEffects.some(fx => fx.kind === "stun" || fx.kind === "freeze");
  if (!firstStunned) {
    if (first.mp < firstSkill.mpCost) {
      logs.push(`💀 *${first.name}* doesn't have enough MP to use *${firstSkill.name}* and collapses from exhaustion!`);
      first.hp = 0;
    } else {
      first.mp = Math.max(0, first.mp - firstSkill.mpCost);
      // Cooldowns removed as per request

      const dmgResult = calculateDamage(first, second, firstSkill);
      if (dmgResult.dodged) {
        logs.push(`💨 *${second.name}* dodged *${firstSkill.name}*!`);
      } else {
        if (dmgResult.crit) logs.push(`💥 *CRITICAL HIT!*`);
        second.hp = Math.max(0, second.hp - dmgResult.damage);
        logs.push(`⚔️ *${first.name}* used *${firstSkill.name}* → ${dmgResult.damage} damage to *${second.name}*.`);

        const lifestealFx = first.activeEffects.find(fx => fx.kind === "lifesteal");
        if (lifestealFx && dmgResult.damage > 0) {
          const healed = Math.floor(dmgResult.damage * lifestealFx.value);
          first.hp = Math.min(first.stats.maxHp, first.hp + healed);
          first.activeEffects = first.activeEffects.filter(fx => fx.kind !== "lifesteal");
          logs.push(`🩸 *${first.name}* leeched ${healed} HP.`);
        }
      }

      if (firstSkill.effect) {
        const effectLogs = applySkillEffect(firstSkill.effect, firstSkill.name, first, second);
        logs.push(...effectLogs);
      }
    }
  } else {
    logs.push(`😴 *${first.name}* is stunned/frozen and loses their turn!`);
  }

  if (second.hp > 0) {
    const secondStunned = second.activeEffects.some(fx => fx.kind === "stun" || fx.kind === "freeze");
    if (!secondStunned) {
      if (second.mp < secondSkill.mpCost) {
        logs.push(`💀 *${second.name}* doesn't have enough MP to use *${secondSkill.name}* and collapses from exhaustion!`);
        second.hp = 0;
      } else {
        second.mp = Math.max(0, second.mp - secondSkill.mpCost);
        // Cooldowns removed as per request

        const dmgResult2 = calculateDamage(second, first, secondSkill);
        if (dmgResult2.dodged) {
          logs.push(`💨 *${first.name}* dodged *${secondSkill.name}*!`);
        } else {
          if (dmgResult2.crit) logs.push(`💥 *CRITICAL HIT!*`);
          first.hp = Math.max(0, first.hp - dmgResult2.damage);
          logs.push(`⚔️ *${second.name}* used *${secondSkill.name}* → ${dmgResult2.damage} damage to *${first.name}*.`);

          const lifestealFx2 = second.activeEffects.find(fx => fx.kind === "lifesteal");
          if (lifestealFx2 && dmgResult2.damage > 0) {
            const healed2 = Math.floor(dmgResult2.damage * lifestealFx2.value);
            first.hp = Math.min(first.stats.maxHp, first.hp + healed2); // Fixed from second.hp logic error in original code too
            second.activeEffects = second.activeEffects.filter(fx => fx.kind !== "lifesteal");
            logs.push(`🩸 *${second.name}* leeched ${healed2} HP.`);
          }
        }

        if (secondSkill.effect) {
          const effectLogs2 = applySkillEffect(secondSkill.effect, secondSkill.name, second, first);
          logs.push(...effectLogs2);
        }
      }
    } else {
      logs.push(`😴 *${second.name}* is stunned/frozen and loses their turn!`);
    }
  }

  logs.push(...applyTurnEffects(challenger));
  logs.push(...applyTurnEffects(target));

  tickCooldowns(challenger);
  tickCooldowns(target);
  const expiredC = tickEffects(challenger);
  const expiredT = tickEffects(target);
  if (expiredC.length) logs.push(`⏱️ Effects expired on *${challenger.name}*: ${expiredC.join(", ")}`);
  if (expiredT.length) logs.push(`⏱️ Effects expired on *${target.name}*: ${expiredT.join(", ")}`);

  const winner = challenger.hp <= 0 ? target : (target.hp <= 0 ? challenger : null);

  const logText = logs.join("\n");
  const statusBlock = formatTurnBlock(state);

  if (winner) {
    const loser = winner.phoneId === challenger.phoneId ? target : challenger;
    const xpGain = state.xpTransfer;
    state.phase = "ended";

    const winnerUser = await storage.getUserByPhone(winner.phoneId);
    const loserUser = await storage.getUserByPhone(loser.phoneId);
    if (winnerUser) {
      await storage.updateUser(winner.phoneId, {
        xp: winnerUser.xp + xpGain,
        battleExp: (winnerUser.battleExp || 0) + 100,
      });
    }
    if (loserUser) {
      await storage.updateUser(loser.phoneId, {
        xp: Math.max(0, loserUser.xp - xpGain),
        battleExp: (loserUser.battleExp || 0) + 30,
      });
    }

    await storage.endBattle(battleId, winner.phoneId);

    const endMsg =
      `${logText}\n\n` +
      `${statusBlock}\n\n` +
      `╭══════════════════════╮\n` +
      `  ⚔️ BATTLE OVER!\n` +
      `╰══════════════════════╯\n` +
      `  🏆 Winner: *${winner.name}*\n` +
      `  💀 Loser: *${loser.name}*\n` +
      `  💰 XP Transfer: +${xpGain} / -${xpGain}\n` +
      `╰══════════════════════╯`;

    await client.sendMessage(state.chatId, endMsg);
    return;
  }

  state.turn++;
  state.phase = "waiting_challenger";
  state.challengerSkillChoice = null;
  state.targetSkillChoice = null;
  storage.updateBattleState(battleId, state);

  const nextMsg =
    `${logText}\n\n` +
    `${statusBlock}\n\n` +
    `⏳ Pick your skill within 60 seconds!\n` +
    `${formatSkillList(challenger)}\n\n` +
    `${formatSkillList(target)}\n\n` +
    `Reply *!pickskill 1/2/3*`;

  await client.sendMessage(state.chatId, nextMsg);

  state.turnTimer = setTimeout(() => resolveBattleTurn(battleId), 60000);
  storage.updateBattleState(battleId, state);
}

let client: Client;
let isInitializing = false;
let isClientReady = false;

async function safeSend(to: string, message: string): Promise<void> {
  if (!client || !isClientReady) return;
  try {
    await client.sendMessage(to, message);
  } catch (err) {
    console.error(`[bot] safeSend failed to ${to}:`, err);
  }
}

setInterval(async () => {
  if (!client || !isClientReady) return;
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
          await safeSend(user.phoneId, "💀 Your life force has faded. You have perished. You cannot use commands until revived.");
        }
      }

      if (user.isVampire && user.vampireUntil && new Date() > new Date(user.vampireUntil)) {
        await storage.updateUser(user.phoneId, { isVampire: false, vampireUntil: null });
        await client.sendMessage(user.phoneId, "🦷 Your vampire powers have expired. The tooth crumbles to dust.");
      }

      if (user.eclipseUntil && new Date() > new Date(user.eclipseUntil)) {
        await storage.updateUser(user.phoneId, { eclipseUntil: null });
      }

      if (user.phantomUntil && new Date() > new Date(user.phantomUntil)) {
        await storage.updateUser(user.phoneId, { phantomUntil: null });
      }

      if (user.mirrorUntil && new Date() > new Date(user.mirrorUntil)) {
        if (user.mirrorOriginalRace) {
          await storage.updateUser(user.phoneId, {
            species: user.mirrorOriginalRace,
            mirrorRace: null,
            mirrorOriginalRace: null,
            mirrorUntil: null,
          });
          await safeSend(user.phoneId, `🪞 Mirror Shard expired. You have returned to your true form: *${user.mirrorOriginalRace}*.`);
        }
      }

      if (user.dragonEggProgress > 0 && !user.dragonEggHatched) {
        const others = users.filter(u => u.phoneId !== user.phoneId && u.xp >= 30);
        if (others.length > 0) {
          const victim = others[Math.floor(Math.random() * others.length)];
          await storage.updateUser(victim.phoneId, { xp: victim.xp - 30 });
          await storage.updateUser(user.phoneId, { dragonEggProgress: user.dragonEggProgress + 30 });
          await safeSend(victim.phoneId, "A strange fatigue washes over you. Something is feeding nearby.\nYou lost 30 XP.");
          if (user.dragonEggProgress + 30 >= 1500) {
            await storage.updateUser(user.phoneId, { dragonEggHatched: true });
            await safeSend(user.phoneId, "The shell shatters. Something ancient rises.\nYour Dragon Egg has fully hatched. +500 XP per day added permanently.");
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
      if (OWNER_NUMBER) await safeSend(OWNER_NUMBER, `⚠️ *DISEASE OUTBREAK*\n\n${disease.startMsg}`);
    } else if (stats.activeDisease && stats.outbreakEndsAt && now > new Date(stats.outbreakEndsAt)) {
      const disease = Object.values(DISEASES).find(d => d.name === stats.activeDisease);
      await storage.updateGlobalStats({ activeDisease: null, diseaseRace: null, outbreakEndsAt: null });
      if (OWNER_NUMBER) await safeSend(OWNER_NUMBER, `✨ *DISEASE CLEARED*\n\n${disease?.endMsg}`);
    }

    await storage.expireOldChallenges();
  } catch (err) {
    console.error("Interval error:", err);
  }
}, 300000);

setInterval(async () => {
  if (!client || !isClientReady) return;
  try {
    const users = await storage.getUsers();
    for (const user of users) {
      const hasGuide = !!user.guideName;
      const hasChild = !!user.guideChildName;
      if (!hasGuide) continue;
      const weeklyXp = hasChild ? 5000 : 1000;
      await storage.updateUser(user.phoneId, { xp: user.xp + weeklyXp });
      await safeSend(user.phoneId, `✨ Weekly guide bonus received!\n+${weeklyXp} XP from your companion${hasChild ? " and child" : ""}~`);
      await checkGuideEvents(user, user.phoneId);
    }
  } catch (err) {
    console.error("Weekly interval error:", err);
  }
}, 604800000);

setInterval(async () => {
  if (!client || !isClientReady) return;
  try {
    const users = await storage.getUsers();
    for (const user of users) {
      if (user.dragonEggHatched) {
        await storage.updateUser(user.phoneId, { xp: user.xp + 500 });
        await safeSend(user.phoneId, "🐉 Your hatched dragon stirs. +500 XP.");
      }
    }
  } catch (err) {
    console.error("Dragon egg daily XP error:", err);
  }
}, 86400000);

function cleanupChromiumTemp(): void {
  try {
    const tmpFiles = fs.readdirSync('/tmp').filter(f => f.startsWith('.org.chromium') || f.startsWith('.com.google.Chrome'));
    for (const f of tmpFiles) {
      try {
        fs.rmSync(path.join('/tmp', f), { recursive: true, force: true });
        console.log(`[bot] Cleaned up stale Chromium temp: /tmp/${f}`);
      } catch { /* ignore */ }
    }
  } catch { /* /tmp not accessible, ignore */ }
}

function findChromiumPath(): string {
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];
  for (const cmd of ['chromium', 'chromium-browser', 'google-chrome']) {
    try {
      const result = execSync(`which ${cmd} 2>/dev/null`).toString().trim();
      if (result) return result;
    } catch { /* not found */ }
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chromium not found. Install chromium or google-chrome.');
}

export async function initBot() {
  if (isInitializing) return;
  isInitializing = true;
  isClientReady = false;

  cleanupChromiumTemp();

  const authPath = path.join(process.cwd(), '.wwebjs_auth');
  const cachePath = path.join(process.cwd(), '.wwebjs_cache');

  if (connectionStatus === "DISCONNECTED" && !fs.existsSync(path.join(authPath, 'session'))) {
    if (fs.existsSync(authPath)) fs.rmSync(authPath, { recursive: true, force: true });
    if (fs.existsSync(cachePath)) fs.rmSync(cachePath, { recursive: true, force: true });
  }

  if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
  if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

  let chromiumPath: string;
  try {
    chromiumPath = findChromiumPath();
    console.log(`[bot] Using chromium at: ${chromiumPath}`);
  } catch (err) {
    console.error('[bot] Chromium not found:', err);
    connectionStatus = "DISCONNECTED";
    isInitializing = false;
    setTimeout(() => initBot(), 30000);
    return;
  }

  try {
    client = new Client({
      authStrategy: new LocalAuth({ 
        clientId: "astral-bot",
        dataPath: authPath 
      }),
      restartOnAuthFail: true,
      puppeteer: {
        executablePath: chromiumPath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions',
          '--single-process',
          '--user-data-dir=/tmp/whatsapp-session-' + Date.now(),
          '--disable-web-security',
          '--no-default-browser-check'
        ],
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
      },
    });

    client.on('qr', (qr) => {
      currentQrCode = qr;
      connectionStatus = "WAITING_FOR_QR";
      console.log('[bot] QR code ready — scan to connect.');
    });

    client.on('ready', () => {
      connectionStatus = "CONNECTED";
      isClientReady = true;
      currentQrCode = undefined;
      console.log('[bot] WhatsApp connected and ready.');
    });

    client.on('authenticated', () => {
      connectionStatus = "CONNECTED";
      currentQrCode = undefined;
      console.log('[bot] Authenticated.');
    });

    client.on('auth_failure', (msg) => {
      connectionStatus = "DISCONNECTED";
      isClientReady = false;
      console.error('[bot] Auth failure:', msg);
      cleanupChromiumTemp();
      setTimeout(() => { isInitializing = false; initBot(); }, 10000);
    });

    client.on('disconnected', (reason) => {
      connectionStatus = "DISCONNECTED";
      isClientReady = false;
      console.warn('[bot] Disconnected:', reason);
      cleanupChromiumTemp();
      setTimeout(() => { isInitializing = false; initBot(); }, 15000);
    });

    client.on('message', async (msg) => {
      try { await handleMessage(msg); }
      catch (err) { console.error('[bot] Message handler error:', err); }
    });

    await client.initialize();
    console.log('[bot] Client initialized.');
  } catch (err) {
    console.error('[bot] Failed to initialize client:', err);
    connectionStatus = "DISCONNECTED";
    setTimeout(() => { isInitializing = false; initBot(); }, 20000);
  } finally {
    isInitializing = false;
  }
}

export function refreshQr() {
  if (client) {
    client.destroy()
      .catch((err) => console.error('[bot] Destroy error on refresh:', err))
      .finally(() => { isInitializing = false; initBot(); });
  } else {
    isInitializing = false;
    initBot();
  }
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

  // ── Registration ──────────────────────────────────────────────────────────
  if (!user || !user.isRegistered) {
    if (body === "!start") {
      const sp = getRandomSpecies();
      user = await storage.createUser({
        phoneId, name, species: sp.name, isRegistered: true,
        xp: 0, messages: 0, condition: "Healthy",
        rank: 8,
        inventory: [], hp: 100,
      });
      const startMsg =
        `╭══════════════════════╮\n` +
        `   ✦┊【Welcome】┊✦\n` +
        `╰══════════════════════╯\n` +
        `  👤 Cultivator: ${name}\n` +
        `  🧬 Species: ${sp.name} (${sp.rarity})\n\n` +
        `  Your journey begins.\n` +
        `  Use !scroll or !help to see commands.\n` +
        `╰══════════════════════╯`;
      try {
        const imgBuffer = fs.readFileSync(path.join(process.cwd(), "attached_assets/Start.jpg"));
        const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "start.jpg");
        await msg.reply(media, undefined, { caption: startMsg });
      } catch { await msg.reply(startMsg); }
    }
    return;
  }

  // ── Infection trigger ────────────────────────────────────────────────────
  if (["!leaderboard", "!profile", "!status"].includes(body)) {
    const stats = await storage.getGlobalStats();
    if (
      stats?.diseaseRace === user.species &&
      !user.hasShadowVeil &&
      user.species !== "Constellation" &&
      user.condition === "Healthy"
    ) {
      await storage.updateUser(phoneId, { condition: "Infected", disease: stats.activeDisease, infectedAt: new Date() });
      await client.sendMessage(phoneId, `☣️ You have been infected with ${stats.activeDisease}! You are losing 5 HP every 5 minutes. Buy a cure from !shop.`);
    }
  }

  // ── XP gain on normal messages ────────────────────────────────────────────
  if (body.length >= 3 && !body.startsWith("!")) {
    let rate = user.species === "Constellation" ? 300 : (SPECIES_XP_RATES[user.species] || 5);
    let dustBonus = 0;

    if (user.dustDomainUntil && new Date() < new Date(user.dustDomainUntil)) {
      const newDustMsgs = (user.dustDomainMessages || 0) + 1;
      if (newDustMsgs % 10 === 0) {
        dustBonus = 5000;
        await client.sendMessage(phoneId, `✨ Dust Domain: +5000 XP earned! (${newDustMsgs} domain messages)`);
      }
      await storage.updateUser(phoneId, { dustDomainMessages: newDustMsgs });
    } else if (user.dustDomainUntil && new Date() >= new Date(user.dustDomainUntil) && user.dustDomainMessages > 0) {
      await storage.updateUser(phoneId, { dustDomainUntil: null, dustDomainMessages: 0 });
      await client.sendMessage(phoneId, `*The light fades. The domain closes. You have returned.*\n✨ Dust Domain has ended.`);
    }

    try {
      const oldRank = getRankForXp(user.xp);
      const freshUser = await storage.getUserByPhone(phoneId);
      if (!freshUser) return;
      const newXp = freshUser.xp + rate + dustBonus;
      const newRank = getRankForXp(newXp);
      const updates: Partial<typeof user> = { xp: newXp, messages: freshUser.messages + 1, rank: newRank.level };

      if (newRank.level < oldRank.level) {
        await client.sendMessage(msg.from,
          `╭══════════════════════╮\n   🎊 RANK UP! 🎊\n` +
          `   ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
          `   👤 Cultivator: ${freshUser.name}\n` +
          `   📈 New Rank: 【${newRank.level}】${newRank.name}\n` +
          `   ✨ Total XP: ${newXp}\n` +
          `   ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
          `   Your soul ascends further!\n╰══════════════════════╯`
        );
      }

      if (Math.random() < 0.01) {
        const itemPool: Record<string, string> = {
          "Dragon Egg":     "*Something warm and heavy settles into your possession.*\n🥚 A Dragon Egg has appeared in your inventory.",
          "Void Fragment":  "*A crack in reality slips into your possession.*\n🌑 A Void Fragment has appeared in your inventory.",
          "Star Dust":      "*Something shimmering and weightless drifts into your possession.*\n✨ Star Dust has appeared in your inventory.",
          "Vampire Tooth":  "*Something sharp and ancient pierces into your possession.*\n🦷 A Vampire Tooth has appeared in your inventory.",
          "Cursed Bone":    "*Something cold and wrong materializes near you.*\n🦴 A Cursed Bone has appeared in your inventory.",
          "Living Core":    "*Something ancient and alive pulses into your possession.*\n🌿 A Living Core has appeared in your inventory.",
        };
        const itemNames = Object.keys(itemPool);
        const item = itemNames[Math.floor(Math.random() * itemNames.length)];
        if (!(freshUser.inventory as string[]).includes(item)) {
          (updates as any).inventory = [...(freshUser.inventory as string[]), item];
          await client.sendMessage(phoneId, `${itemPool[item]}\nType !inventory to see your items.`);
        }
      }
      await storage.updateUser(phoneId, updates as any);
    } catch (err) { console.error("XP/Rank update error:", err); }
    return;
  }

  // ════════════════════════════════════════════════════════════════
  //  COMMANDS
  // ════════════════════════════════════════════════════════════════

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

  if (body === "!rules") {
    return msg.reply(
      `╭══════════════════════════╮\n` +
      `   ✦┊【 S A C R E D  L A W S 】┊✦\n` +
      `╰══════════════════════════╯\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  📜 THE SACRED LAWS\n\n` +
      `  1. Respect all cultivators.\n     Harassment leads to a ban.\n\n` +
      `  2. No exploiting bugs or glitches.\n     Report them to the owner.\n\n` +
      `  3. No spamming commands.\n     Abuse will result in a mute.\n\n` +
      `  4. Dead cultivators cannot act.\n     Find an ally to revive you.\n\n` +
      `  5. Sect leaders hold authority.\n     Obey or leave your sect.\n\n` +
      `  6. XP gained through messages only.\n     No bots, no scripts.\n\n` +
      `  7. The Owner's word is final law.\n     All rulings are absolute.\n\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  Violators face punishment,\n  exile, or permanent death.\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼\n` +
      `╰══════════════════════════╯`
    );
  }

  if (body === "!status") {
    const currentRank = getRankForXp(user.xp);
    let sectLine = "None";
    if (user.sectId) {
      const sect = await storage.getSect(user.sectId);
      if (sect) sectLine = `${sect.name} [${sect.tag}]`;
    }
    return msg.reply(
      `╭══════════════════════╮\n` +
      `   ✦┊【Ｓｔａｔｕｓ】┊✦\n` +
      `╰══════════════════════╯\n` +
      `  👤 Cultivator: ${user.name}\n` +
      `  📈 Rank: ${currentRank.name}\n` +
      `  ✨ XP: ${user.xp}\n` +
      `  💬 Msg: ${user.messages}\n` +
      `  🧬 Species: ${user.species}\n` +
      `  🏯 Sect: ${sectLine}\n` +
      `  🩹 Condition: ${user.condition}\n` +
      `  ❤️ HP: ${generateHpBar(user.hp)}\n` +
      `  🩺 State: ${getHpStatus(user.hp)}\n` +
      `╰══════════════════════╯`
    );
  }

  if (body === "!profile") {
    const currentRank = getRankForXp(user.xp);
    let sectLine = "None";
    if (user.sectId) {
      const sect = await storage.getSect(user.sectId);
      if (sect) sectLine = `${sect.name} [${sect.tag}]`;
    }
    const battleStats = computeStats(user, user.battleExp || 0);
    const allUsers = await storage.getUsers();
    const leaderboardRank = allUsers.findIndex(u => u.phoneId === phoneId) + 1;
    const guideLine = user.guideName
      ? `${GUIDES[user.guideName.toLowerCase()]?.emoji || "✨"} ${user.guideName}${user.guideChildName ? ` + 👶 ${user.guideChildName}` : ""}`
      : "None";

    return msg.reply(
      `╭══════════════════════╮\n` +
      `   ✦┊【 P R O F I L E 】┊✦\n` +
      `╰══════════════════════╯\n` +
      `  👤 ${user.name}\n` +
      `  🧬 Species: ${user.species}\n` +
      `  📈 Rank: ${currentRank.name}\n` +
      `  ✨ XP: ${user.xp}\n` +
      `  💬 Messages: ${user.messages}\n` +
      `  🏆 Leaderboard: #${leaderboardRank}\n` +
      `  🏯 Sect: ${sectLine}\n` +
      `  ❤️ HP: ${generateHpBar(user.hp)}\n` +
      `  🩺 Condition: ${user.condition}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  ⚔️ BATTLE RECORD\n` +
      `  🏅 Wins: ${user.battleWins || 0}  💀 Losses: ${user.battleLosses || 0}\n` +
      `  ⚡ Battle EXP: ${user.battleExp || 0}\n` +
      `  💪 STR: ${battleStats.strength}  🏃 AGI: ${battleStats.agility}\n` +
      `  🧠 INT: ${battleStats.intelligence}  🍀 LCK: ${battleStats.luck}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  💞 Guide: ${guideLine}\n` +
      `╰══════════════════════╯`
    );
  }

  if (body === "!leaderboard") {
    const allUsers = await storage.getUsers();
    const visibleUsers = allUsers.filter(u => {
      if (u.phantomUntil && new Date() < new Date(u.phantomUntil)) return false;
      return true;
    });
    const myRank = allUsers.findIndex(u => u.phoneId === phoneId) + 1;
    const list = visibleUsers.slice(0, 10).map((u, i) => {
      const xpDisplay = u.eclipseUntil && new Date() < new Date(u.eclipseUntil) ? "???" : `${u.xp} XP`;
      const speciesDisplay = u.eclipseUntil && new Date() < new Date(u.eclipseUntil) ? "???" : u.species;
      return `  ${i + 1}. ${u.name} — ${xpDisplay} [${speciesDisplay}]`;
    }).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n` +
      `  🏆 TOP CULTIVATORS\n` +
      `╰══════════════════════╯\n` +
      `${list}\n\n` +
      `  Your Rank: #${myRank}\n` +
      `╰══════════════════════╯`
    );
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
      "soul restoration tonic": "💊", "living core": "🌿",
      "dragon egg": "🥚", "void fragment": "🌑", "star dust": "✨",
    };
    if (!inv.length) {
      return msg.reply(
        `╭══════════════════════╮\n   ✦┊【Ｉｎｖｅｎｔｏｒｙ】┊✦\n╰══════════════════════╯\n` +
        ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Your satchel is empty.\n  Chat to find hidden items.\n` +
        ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Use !useitem [num]\n╰══════════════════════╯`
      );
    }
    const list = inv.map((item, i) => {
      const emoji = itemEmojis[item] || itemEmojis[item.toLowerCase()] || "📦";
      return `  【${i + 1}】 ${emoji} ${item}`;
    }).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n   ✦┊【Ｉｎｖｅｎｔｏｒｙ】┊✦\n╰══════════════════════╯\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n${list}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  ${inv.length} item(s) — !useitem [num]\n╰══════════════════════╯`
    );
  }

  if (body === "!shop") {
    return msg.reply(
      `╭══════════════════════╮\n  🏪 SHOP\n╰══════════════════════╯\n\n` +
      `  💊 *Cures*\n` +
      `  Grey Rot Cure — 15,000 XP\n` +
      `  Hellfire Suppressant — 18,000 XP\n` +
      `  Feral Antidote — 18,000 XP\n` +
      `  Grace Restoration Vial — 20,000 XP\n` +
      `  Scale Restoration Salve — 22,000 XP\n` +
      `  Rootwither Remedy — 20,000 XP\n` +
      `  Soul Restoration Tonic — 20,000 XP\n\n` +
      `  ⚗️ *Special Items*\n` +
      `  Blood Rune — 80,000 XP\n` +
      `  Eclipse Stone — 90,000 XP\n` +
      `  Phantom Seal — 85,000 XP\n` +
      `  Cursed Coin — 5,000 XP\n` +
      `  Mirror Shard — 95,000 XP\n` +
      `  Vampire Tooth — 100,000 XP\n` +
      `  Cursed Bone — 100,000 XP\n` +
      `  Living Core — 100,000 XP\n` +
      `  Star Dust — 75,000 XP\n` +
      `  Dragon Egg — 90,000 XP\n` +
      `  Void Fragment — 100,000 XP\n\n` +
      `  Use !buy [item name]\n╰══════════════════════╯`
    );
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

    if ((itemLower === "blood rune" || itemLower === "mirror shard") && !msg.hasQuotedMsg) {
      return msg.reply(`❌ *${itemName}* requires a target. Reply to someone's message to use it.`);
    }

    const isFindable = ["dragon egg", "void fragment", "star dust", "vampire tooth", "cursed bone", "living core"].includes(itemLower);
    if (isFindable && Math.random() > 0.11) {
      inv.splice(num, 1);
      await storage.updateUser(phoneId, { inventory: inv });
      return msg.reply(`✨ You used ${itemName}, but its power remains dormant. The item was consumed.`);
    }

    let reply = `✨ You used ${itemName}!`;
    const updates: any = {};

    if (itemLower === "star dust") {
      const expiresAt = new Date(Date.now() + 1800000);
      updates.dustDomainUntil = expiresAt;
      updates.dustDomainMessages = 0;
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
      updates.hasShadowVeil = false;
      updates.condition = "Healthy";
      updates.disease = null;
      reply = `*The Living Core pulses with ancient life. Your form dissolves and reshapes.*\n🌿 Race Transformed.\nNew Race: ${sp.name} (${sp.rarity})\nXP Rate: ${SPECIES_XP_RATES[sp.name]} XP per message\n*You are reborn.*`;

    } else if (itemLower === "cursed bone") {
      updates.hasShadowVeil = true;
      reply = `🦴 Shadow Veil active! You are now permanently immune to plagues.`;

    } else if (itemLower === "dragon egg") {
      if (user.dragonEggProgress > 0) return msg.reply("❌ You already have a Dragon Egg incubating.");
      updates.dragonEggProgress = 1;
      reply = `🥚 The egg begins to pulse. It has begun feeding on nearby XP. (needs 1500 XP to hatch)`;

    } else if (itemLower === "vampire tooth") {
      updates.isVampire = true;
      updates.vampireUntil = new Date(Date.now() + 604800000);
      reply = `🦷 You are now a Vampire for 1 week! Use !suck (reply to a message) to feed.`;

    } else if (itemLower === "eclipse stone") {
      updates.eclipseUntil = new Date(Date.now() + 86400000);
      reply = `🌒 *Eclipse Stone* activated! Your race and XP are hidden from the leaderboard for 24 hours.`;

    } else if (itemLower === "phantom seal") {
      updates.phantomUntil = new Date(Date.now() + 86400000);
      reply = `👻 *Phantom Seal* activated! You have vanished from the leaderboard for 24 hours.`;

    } else if (itemLower === "cursed coin") {
      const outcomes = [
        async () => {
          const bonus = Math.floor(Math.random() * 5000) + 1000;
          await storage.updateUser(phoneId, { xp: user.xp + bonus });
          return `🪙 The coin lands on a sigil of fortune. You gained *${bonus} XP*!`;
        },
        async () => {
          const loss = Math.floor(Math.random() * 3000) + 500;
          await storage.updateUser(phoneId, { xp: Math.max(0, user.xp - loss) });
          return `🪙 The coin lands on a sigil of ruin. You lost *${loss} XP*.`;
        },
        async () => {
          await storage.updateUser(phoneId, { hp: 100, condition: "Healthy", disease: null });
          return `🪙 The coin glows gold. Your HP is fully restored and all conditions are cured!`;
        },
        async () => {
          await storage.updateUser(phoneId, { isDead: true, hp: 0 });
          return `🪙 The coin falls silent. The curse takes hold.\n💀 You have perished. Find someone to revive you.`;
        },
        async () => {
          const sp = getRandomSpecies();
          await storage.updateUser(phoneId, { species: sp.name, isConstellation: false, hasShadowVeil: false, condition: "Healthy", disease: null });
          return `🪙 The coin spins endlessly... and stops.\n🌀 Your race has changed to *${sp.name}*!`;
        },
      ];
      const chosen = outcomes[Math.floor(Math.random() * outcomes.length)];
      const outcomeMsg = await chosen();
      inv.splice(num, 1);
      await storage.updateUser(phoneId, { inventory: inv });
      return msg.reply(`🪙 *Cursed Coin flipped...*\n\n${outcomeMsg}`);

    } else if (itemLower === "blood rune") {
      // FIX: use resolveQuotedUser for correct @c.us ID
      const resolved = await resolveQuotedUser(msg);
      if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
      const targetId = resolved.phoneId;
      const target = await storage.getUserByPhone(targetId);
      if (!target) return msg.reply("❌ Target not found or not registered.");
      if (targetId === phoneId) return msg.reply("❌ You cannot use a Blood Rune on yourself.");
      const stealAmt = Math.floor(Math.random() * 5000) + 2000;
      const actualSteal = Math.min(stealAmt, target.xp);
      if (actualSteal <= 0) return msg.reply("❌ Target has no XP to steal.");
      await storage.updateUser(targetId, { xp: target.xp - actualSteal });
      await storage.updateUser(phoneId, { xp: user.xp + actualSteal });
      await client.sendMessage(targetId, `🩸 A Blood Rune was used against you. You lost *${actualSteal} XP*.`);
      inv.splice(num, 1);
      await storage.updateUser(phoneId, { inventory: inv });
      return msg.reply(`🩸 *Blood Rune activated!* You stole *${actualSteal} XP* from *${target.name}*.`);

    } else if (itemLower === "mirror shard") {
      // FIX: use resolveQuotedUser for correct @c.us ID
      const resolved = await resolveQuotedUser(msg);
      if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
      const targetId = resolved.phoneId;
      const target = await storage.getUserByPhone(targetId);
      if (!target) return msg.reply("❌ Target not found or not registered.");
      if (targetId === phoneId) return msg.reply("❌ You cannot mirror yourself.");
      updates.mirrorRace = target.species;
      updates.mirrorOriginalRace = user.species;
      updates.mirrorUntil = new Date(Date.now() + 1800000);
      updates.species = target.species;
      reply = `🪞 *Mirror Shard shattered!* You have copied *${target.name}*'s race: *${target.species}* for 30 minutes.`;

    } else if (
      itemLower.includes("cure") || itemLower.includes("remedy") ||
      itemLower.includes("antidote") || itemLower.includes("vial") ||
      itemLower.includes("salve") || itemLower.includes("suppressant") ||
      itemLower.includes("tonic")
    ) {
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

  if (body.startsWith("!suck")) {
    if (!user.isVampire || (user.vampireUntil && new Date() > new Date(user.vampireUntil))) {
      await storage.updateUser(phoneId, { isVampire: false, vampireUntil: null });
      return msg.reply("🦷 You are not a vampire.");
    }
    if (!msg.hasQuotedMsg) return msg.reply("🦷 Reply to someone's message to suck their XP.");
    // FIX: use resolveQuotedUser
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
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
    // FIX: use resolveQuotedUser
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;
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
    // FIX: use resolveQuotedUser
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
    const item = inv.splice(num, 1)[0];
    await storage.updateUser(phoneId, { inventory: inv });
    await storage.updateUser(targetId, { inventory: [...(target.inventory as string[]), item] });
    await client.sendMessage(targetId, `🎁 ${user.name} gave you [${item}]!`);
    return msg.reply(`🎁 You gave *[${item}]* to ${target.name}.`);
  }

  if (body.startsWith("!givecard ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give a card.");
    const num = parseInt(body.split(" ")[1]) - 1;
    const userCards = await storage.getUserCards(phoneId);
    if (isNaN(num) || !userCards[num]) return msg.reply("❌ Invalid card number.");
    // FIX: use resolveQuotedUser
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
    if (targetId === phoneId) return msg.reply("❌ You cannot give cards to yourself.");
    const card = userCards[num];
    await storage.updateCard(card.id, { ownerPhoneId: targetId });
    await client.sendMessage(targetId, `🎴 ${user.name} gave you the card *${card.name}* [${card.rarity}]!`);
    return msg.reply(`🎴 You gave *${card.name}* to ${target.name}.`);
  }

  if (body.startsWith("!revive")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a dead person's message to revive them.");
    // FIX: use resolveQuotedUser
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
    if (!target.isDead) return msg.reply("❌ That person is not dead.");
    await storage.updateUser(targetId, { isDead: false, hp: 10 });
    await client.sendMessage(targetId, `🕊️ ${user.name} has revived you! You are back with 10 HP. Stay safe.`);
    return msg.reply(`🕊️ You revived *${target.name}*!`);
  }

  // ════════════════════════════════════════════════════════════════
  //  BATTLE SYSTEM
  // ════════════════════════════════════════════════════════════════

  if (body === "!skills") {
    const unlockedSkills = getUnlockedSkills(user.rank);
    const actives = unlockedSkills.filter(s => s.type === "active");
    const passives = unlockedSkills.filter(s => s.type === "passive");
    const equippedIds = (user.equippedActives as string[]) || [];
    const equippedPassiveId = user.equippedPassive || null;

    const activeList = actives.map(s => {
      const isEquipped = equippedIds.includes(s.id) ? "✅" : "  ";
      return `${isEquipped} [${s.rank}] *${s.name}* (${s.id})\n     ${s.description}`;
    }).join("\n");

    const passiveList = passives.map(s => {
      const isEquipped = equippedPassiveId === s.id ? "✅" : "  ";
      return `${isEquipped} [${s.rank}] *${s.name}* (${s.id})\n     ${s.description}`;
    }).join("\n");

    return msg.reply(
      `╭══════════════════════╮\n  ⚔️ YOUR SKILLS\n╰══════════════════════╯\n\n` +
      `  🗡️ *Active Skills* (equip up to 3)\n${activeList || "  None unlocked."}\n\n` +
      `  🛡️ *Passive Skills* (equip 1)\n${passiveList || "  None unlocked."}\n\n` +
      `  Use *!equip [skillId]* to equip.\n╰══════════════════════╯`
    );
  }

  if (body.startsWith("!equip ")) {
    const skillId = body.replace("!equip ", "").trim();
    const unlockedSkills = getUnlockedSkills(user.rank);
    const skill = unlockedSkills.find(s => s.id === skillId);
    if (!skill) return msg.reply(`❌ Skill *${skillId}* not found or not unlocked yet. Check !skills.`);

    if (skill.type === "passive") {
      await storage.updateUser(phoneId, { equippedPassive: skillId });
      return msg.reply(`✅ Passive *${skill.name}* equipped!`);
    } else {
      const currentActives = [...((user.equippedActives as string[]) || [])];
      if (currentActives.includes(skillId)) return msg.reply(`❌ *${skill.name}* is already equipped.`);
      if (currentActives.length >= 3) {
        return msg.reply(
          `❌ You already have 3 active skills equipped.\n` +
          `Current: ${currentActives.join(", ")}\n` +
          `Use *!unequip [skillId]* to remove one first.`
        );
      }
      currentActives.push(skillId);
      await storage.updateUser(phoneId, { equippedActives: currentActives });
      return msg.reply(`✅ *${skill.name}* equipped! (${currentActives.length}/3 active slots used)`);
    }
  }

  if (body.startsWith("!unequip ")) {
    const skillId = body.replace("!unequip ", "").trim();
    const currentActives = [...((user.equippedActives as string[]) || [])];
    const idx = currentActives.indexOf(skillId);
    if (idx === -1) {
      if (user.equippedPassive === skillId) {
        await storage.updateUser(phoneId, { equippedPassive: null });
        return msg.reply(`✅ Passive skill *${skillId}* unequipped.`);
      }
      return msg.reply(`❌ Skill *${skillId}* is not equipped.`);
    }
    currentActives.splice(idx, 1);
    await storage.updateUser(phoneId, { equippedActives: currentActives });
    return msg.reply(`✅ *${skillId}* unequipped. (${currentActives.length}/3 active slots used)`);
  }

  if (body === "!challenge") {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to challenge them.");
    if (user.inBattle) return msg.reply("❌ You are already in a battle.");

    // FIX: use resolveQuotedUser so @lid vs @c.us is normalized
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;

    if (targetId === phoneId) return msg.reply("❌ You cannot challenge yourself.");

    const target = await storage.getUserByPhone(targetId);
    if (!target || !target.isRegistered) return msg.reply("❌ That person is not registered. They need to use !start first.");
    if (target.isDead) return msg.reply("❌ You cannot challenge a dead person.");
    if (target.inBattle) return msg.reply("❌ That person is already in a battle.");

    const existingChallenge = await storage.getPendingChallenge(phoneId);
    if (existingChallenge) return msg.reply("❌ You already have a pending challenge. Wait for it to expire or be answered.");

    const challengerActives = (user.equippedActives as string[]) || [];
    const targetActives = (target.equippedActives as string[]) || [];
    const noSkillsWarning: string[] = [];
    if (challengerActives.length === 0) noSkillsWarning.push(`⚠️ *You* have no skills equipped! Use *!equip [skillId]* before battling or you'll fight with basic D-rank defaults.\nSee available skills with *!skills*`);
    if (targetActives.length === 0) noSkillsWarning.push(`⚠️ *${target.name}* has no skills equipped either.`);
    if (noSkillsWarning.length > 0) {
      await msg.reply(noSkillsWarning.join("\n"));
    }

    const expiresAt = new Date(Date.now() + 300000);
    await storage.createChallenge({
      challengerPhoneId: phoneId,
      targetPhoneId: targetId,
      chatId: msg.from,
      expiresAt,
      status: "pending",
    });

    await client.sendMessage(targetId,
      `⚔️ *${user.name}* has challenged you to a battle!\n\n` +
      `Reply *!accept* to accept or *!decline* to refuse.\n` +
      `This challenge expires in 5 minutes.`
    );
    return msg.reply(`⚔️ Challenge sent to *${target.name}*! Waiting for their response...`);
  }

  if (body === "!accept") {
    const challenge = await storage.getPendingChallengeForTarget(phoneId);
    if (!challenge) return msg.reply("❌ You have no pending challenge to accept.");
    if (new Date() > new Date(challenge.expiresAt)) {
      await storage.updateChallenge(challenge.id, { status: "expired" });
      return msg.reply("❌ That challenge has expired.");
    }
    if (user.inBattle) return msg.reply("❌ You are already in a battle.");

    const challenger = await storage.getUserByPhone(challenge.challengerPhoneId);
    if (!challenger) return msg.reply("❌ Challenger not found.");
    if (challenger.inBattle) return msg.reply("❌ The challenger is already in another battle.");

    await storage.updateChallenge(challenge.id, { status: "accepted" });
    await storage.updateUser(phoneId, { inBattle: true });
    await storage.updateUser(challenge.challengerPhoneId, { inBattle: true });

    const cStats = computeStats(challenger, challenger.battleExp || 0);
    const tStats = computeStats(user, user.battleExp || 0);

    const cActives = ((challenger.equippedActives as string[]) || [])
      .map(id => ALL_SKILLS.find(s => s.id === id))
      .filter(Boolean) as Skill[];
    const tActives = ((user.equippedActives as string[]) || [])
      .map(id => ALL_SKILLS.find(s => s.id === id))
      .filter(Boolean) as Skill[];

    const defaultActives = getUnlockedSkills(challenger.rank).filter(s => s.type === "active");
    const defaultActivesT = getUnlockedSkills(user.rank).filter(s => s.type === "active");
    while (cActives.length < 3 && defaultActives.length > cActives.length) cActives.push(defaultActives[cActives.length]);
    while (tActives.length < 3 && defaultActivesT.length > tActives.length) tActives.push(defaultActivesT[tActives.length]);

    const cPassiveSkill = challenger.equippedPassive
      ? ALL_SKILLS.find(s => s.id === challenger.equippedPassive) || null
      : null;
    const tPassiveSkill = user.equippedPassive
      ? ALL_SKILLS.find(s => s.id === user.equippedPassive) || null
      : null;

    const cCombatant: Combatant = {
      phoneId: challenger.phoneId,
      name: challenger.name,
      stats: cStats,
      hp: cStats.maxHp,
      mp: cStats.maxMp,
      equippedActives: cActives,
      equippedPassive: cPassiveSkill,
      activeEffects: [],
      cooldowns: {},
      battleExp: challenger.battleExp || 0,
    };

    const tCombatant: Combatant = {
      phoneId: user.phoneId,
      name: user.name,
      stats: tStats,
      hp: tStats.maxHp,
      mp: tStats.maxMp,
      equippedActives: tActives,
      equippedPassive: tPassiveSkill,
      activeEffects: [],
      cooldowns: {},
      battleExp: user.battleExp || 0,
    };

    const passiveLogs: string[] = [
      ...applyPassive(cCombatant),
      ...applyPassive(tCombatant),
    ];

    const xpTransfer = Math.floor(Math.random() * 401) + 100;
    const battleId = randomUUID();
    const { firstId, speedLog } = determineFirstMover(cCombatant, tCombatant);

    const battleState: BattleState = {
      id: battleId,
      challenger: cCombatant,
      target: tCombatant,
      turn: 1,
      location: randomLocation(),
      firstMoverId: firstId,
      phase: "waiting_challenger",
      challengerSkillChoice: null,
      targetSkillChoice: null,
      turnTimer: null,
      chatId: challenge.chatId,
      xpTransfer,
    };

    storage.createBattle({
      id: battleId,
      challengerPhoneId: challenger.phoneId,
      opponentPhoneId: user.phoneId,
      chatId: challenge.chatId,
      startedAt: new Date(),
      state: battleState,
    });

    const startMsg =
      `╭══════════════════════╮\n  ⚔️ BATTLE BEGINS!\n╰══════════════════════╯\n` +
      `📍 ${battleState.location}\n\n` +
      `${passiveLogs.join("\n")}\n\n` +
      `${speedLog}\n\n` +
      `${formatTurnBlock(battleState)}\n\n` +
      `⚔️ Stakes: *${xpTransfer} XP*\n\n` +
      `⏳ Pick your skill within 60 seconds!\n\n` +
      `*${challenger.name}*'s skills:\n${formatSkillList(cCombatant)}\n\n` +
      `*${user.name}*'s skills:\n${formatSkillList(tCombatant)}\n\n` +
      `Reply *!pickskill 1 / 2 / 3*`;

    await client.sendMessage(challenge.chatId, startMsg);

    battleState.turnTimer = setTimeout(() => resolveBattleTurn(battleId), 60000);
    storage.updateBattleState(battleId, battleState);
    return;
  }

  if (body === "!decline") {
    const challenge = await storage.getPendingChallengeForTarget(phoneId);
    if (!challenge) return msg.reply("❌ You have no pending challenge to decline.");
    await storage.updateChallenge(challenge.id, { status: "declined" });
    const challenger = await storage.getUserByPhone(challenge.challengerPhoneId);
    if (challenger) {
      await client.sendMessage(challenge.challengerPhoneId, `❌ *${user.name}* declined your challenge.`);
    }
    return msg.reply("❌ Challenge declined.");
  }

  if (body.startsWith("!pickskill ")) {
    const numStr = body.replace("!pickskill ", "").trim();
    const skillNum = parseInt(numStr) - 1;
    const battle = storage.getActiveBattleByPlayer(phoneId);
    if (!battle) return msg.reply("❌ You are not in a battle.");

    const state = battle.state as BattleState;
    if (state.phase === "ended") return msg.reply("❌ The battle is already over.");
    if (state.phase === "resolving") return msg.reply("⏳ Turn is being resolved, please wait.");

    const isChallenger = state.challenger.phoneId === phoneId;
    const combatant = isChallenger ? state.challenger : state.target;

    if (isNaN(skillNum) || skillNum < 0 || skillNum >= combatant.equippedActives.length) {
      return msg.reply(`❌ Invalid skill number. Pick 1–${combatant.equippedActives.length}.`);
    }

    const chosenSkill = combatant.equippedActives[skillNum];
    const check = canUseSkill(combatant, chosenSkill);
    if (!check.ok) return msg.reply(`❌ ${check.reason}`);

    if (isChallenger) {
      if (state.challengerSkillChoice) return msg.reply("✅ You already picked your skill this turn.");
      state.challengerSkillChoice = chosenSkill.id;
    } else {
      if (state.targetSkillChoice) return msg.reply("✅ You already picked your skill this turn.");
      state.targetSkillChoice = chosenSkill.id;
    }

    storage.updateBattleState(battle.id, state);
    await msg.reply(`✅ *${chosenSkill.name}* selected!`);

    if (state.challengerSkillChoice && state.targetSkillChoice) {
      await resolveBattleTurn(battle.id);
    }
    return;
  }

  if (body === "!forfeit") {
    const activeBattle = storage.getActiveBattleByPlayer(phoneId);
    if (!activeBattle) return msg.reply("🏳️ You are not currently in a battle. Nothing to forfeit.");

    const state = activeBattle.state as BattleState;
    if (state.turnTimer) clearTimeout(state.turnTimer);

    const isChallenger = activeBattle.challengerPhoneId === phoneId;
    const opponentId = isChallenger ? activeBattle.opponentPhoneId : activeBattle.challengerPhoneId;
    const opponent = await storage.getUserByPhone(opponentId);

    const penalty = Math.floor(user.xp * 0.1);
    await storage.updateUser(phoneId, { xp: Math.max(0, user.xp - penalty) });
    await storage.endBattle(activeBattle.id, opponentId);

    if (opponent) {
      await client.sendMessage(opponentId, `🏳️ *${user.name}* has forfeited! You win!\n🏆 Victory recorded.`);
    }
    return msg.reply(`🏳️ You have forfeited against *${opponent?.name || "your opponent"}*.\n💸 Penalty: -${penalty} XP for surrendering.`);
  }

  if (body === "!battlestats" || body.startsWith("!battlestats ")) {
    const isLookup = body.startsWith("!battlestats ") && body.length > "!battlestats ".length;
    let target = user;

    if (isLookup) {
      const targetName = body.replace("!battlestats ", "").trim();
      const allUsers = await storage.getUsers();
      const found = allUsers.find(u => u.name.toLowerCase().includes(targetName.toLowerCase()));
      if (!found) return msg.reply(`❌ Cultivator *${targetName}* not found.`);
      target = found;
    }

    const stats = computeStats(target, target.battleExp || 0);
    const wins = target.battleWins || 0;
    const losses = target.battleLosses || 0;
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    const wrFilled = Math.round(winRate / 10);
    const wrBar = "█".repeat(wrFilled) + "░".repeat(10 - wrFilled);

    const getBattleTitle = (w: number): string => {
      if (w === 0)   return "Unproven";
      if (w < 3)     return "Initiate";
      if (w < 7)     return "Brawler";
      if (w < 15)    return "Warrior";
      if (w < 30)    return "Veteran";
      if (w < 50)    return "Champion";
      if (w < 100)   return "Conqueror";
      return "Sovereign";
    };

    const getForm = (): string => {
      if (total === 0) return "—";
      if (winRate >= 75) return "🔥 Hot";
      if (winRate >= 50) return "⚡ Good";
      if (winRate >= 25) return "🌧️ Cold";
      return "💀 Struggling";
    };

    const statEntries: [string, number][] = [
      ["STR", stats.strength],
      ["AGI", stats.agility],
      ["INT", stats.intelligence],
      ["LCK", stats.luck],
      ["SPD", stats.speed],
    ];
    const topStat = statEntries.reduce((a, b) => b[1] > a[1] ? b : a);

    const getBexpTier = (bexp: number): string => {
      if (bexp === 0)   return "Untested";
      if (bexp < 100)   return "Fledgling";
      if (bexp < 300)   return "Seasoned";
      if (bexp < 600)   return "Hardened";
      if (bexp < 1000)  return "Elite";
      return "Legend";
    };

    const equippedActives = (target.equippedActives as string[]) || [];
    const equippedPassive = target.equippedPassive || null;
    const activeNames = equippedActives.map(id => {
      const sk = ALL_SKILLS.find(s => s.id === id);
      return sk ? `${sk.name} [${sk.rank}]` : id;
    });
    const passiveName = equippedPassive
      ? (ALL_SKILLS.find(s => s.id === equippedPassive)?.name || equippedPassive)
      : "None";

    const isSelf = target.phoneId === user.phoneId;

    return msg.reply(
      `╭══════════════════════════╮\n` +
      `   ✦┊【 B A T T L E  S T A T S 】┊✦\n` +
      `╰══════════════════════════╯\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  👤 ${target.name}\n` +
      `  🧬 ${target.species}  |  🏅 ${getBattleTitle(wins)}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  ⚔️  COMBAT RECORD\n` +
      `  🏆 Wins:    ${wins}\n` +
      `  💀 Losses:  ${losses}\n` +
      `  📊 Total:   ${total}\n` +
      `  📈 Win Rate: [${wrBar}] ${winRate}%\n` +
      (isSelf ? `  🌡️  Form: ${getForm()}\n` : "") +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  💪 BATTLE ATTRIBUTES\n` +
      `  ⚡ Battle EXP: ${target.battleExp || 0} (${getBexpTier(target.battleExp || 0)})\n` +
      `  💪 STR: ${stats.strength}${topStat[0] === "STR" ? " ◄" : ""}\n` +
      `  🏃 AGI: ${stats.agility}${topStat[0] === "AGI" ? " ◄" : ""}\n` +
      `  🧠 INT: ${stats.intelligence}${topStat[0] === "INT" ? " ◄" : ""}\n` +
      `  🍀 LCK: ${stats.luck}${topStat[0] === "LCK" ? " ◄" : ""}\n` +
      `  💨 SPD: ${stats.speed}${topStat[0] === "SPD" ? " ◄" : ""}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  ❤️  Max HP: ${stats.maxHp}  |  🔷 Max MP: ${stats.maxMp}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  🗡️  Equipped Skills\n` +
      (activeNames.length > 0
        ? activeNames.map((n, i) => `  ${i + 1}. ${n}`).join("\n")
        : "  ⚠️ No actives — use !equip [skillId]") + "\n" +
      `  Passive: ${passiveName}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼\n` +
      `╰══════════════════════════╯`
    );
  }

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
    const rarityEmoji =
      card.rarity === "Legendary" ? "🌟" :
      card.rarity === "Epic" ? "💜" :
      card.rarity === "Rare" ? "💙" :
      card.rarity === "Uncommon" ? "💚" : "⬜";
    const cardMsg =
      `╭══════════════════════╮\n  🎴 CARD OBTAINED!\n╰══════════════════════╯\n` +
      `  📛 Name: ${card.name}\n  📺 Series: ${card.series}\n` +
      `  ${rarityEmoji} Rarity: ${card.rarity}\n\n` +
      `  Use !cardcollection to view all.\n╰══════════════════════╯`;
    if (card.imageUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let imgBuffer: Buffer;
        try {
          const imgRes = await fetch(card.imageUrl, { signal: controller.signal as any });
          imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        } finally {
          clearTimeout(timeout);
        }
        const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), `${card.name}.jpg`);
        await msg.reply(media, undefined, { caption: cardMsg });
      } catch { await msg.reply(cardMsg); }
    } else { await msg.reply(cardMsg); }
    return;
  }

  if (body === "!cardcollection") {
    const userCards = await storage.getUserCards(phoneId);
    if (!userCards.length) return msg.reply("🎴 You have no cards yet. Use !getcard to claim your daily card.");
    const list = userCards.map((c, i) => `  【${i + 1}】 ${c.name} [${c.rarity}] — ${c.series}`).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n  📚 CARD COLLECTION\n╰══════════════════════╯\n${list}\n\n  Use !card [num] for details.\n╰══════════════════════╯`
    );
  }

  if (body.startsWith("!card ")) {
    const num = parseInt(body.split(" ")[1]) - 1;
    const userCards = await storage.getUserCards(phoneId);
    if (isNaN(num) || !userCards[num]) return msg.reply("❌ Invalid card number. Check !cardcollection.");
    const card = userCards[num];
    return msg.reply(
      `╭══════════════════════╮\n  🔍 CARD DETAILS\n╰══════════════════════╯\n` +
      `  📛 Name: ${card.name}\n  📺 Series: ${card.series}\n` +
      `  ✨ Rarity: ${card.rarity}\n  🆔 Card ID: #${card.id}\n╰══════════════════════╯`
    );
  }

  // ════════════════════════════════════════════════════════════════
  //  GUIDE SYSTEM
  // ════════════════════════════════════════════════════════════════

  if (body === "!getguide") {
    if (user.guideName) {
      const existing = GUIDES[user.guideName.toLowerCase()];
      return msg.reply(`${existing?.emoji || "✨"} You already have *${user.guideName}* as your guide.`);
    }
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), ANNA.image));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "anna.jpg");
      await msg.reply(media, undefined, { caption: ANNA.greeting });
    } catch { await msg.reply(ANNA.greeting); }
    await storage.updateUser(phoneId, { guideName: "Anna" });
    await msg.reply(ANNA.claimMsg);
    return;
  }

  if (body === "!talkguide") {
    const guideName = user.guideName?.toLowerCase();
    if (!guideName) return msg.reply("❌ You don't have a guide. Use !getguide to claim one.");
    const guide = GUIDES[guideName];
    if (!guide) return msg.reply("❌ Guide not found.");
    const response = guide.talkResponses[Math.floor(Math.random() * guide.talkResponses.length)];
    return msg.reply(response);
  }

  if (body === "!smashmyguide") {
    const guideName = user.guideName?.toLowerCase();
    if (!guideName) return msg.reply("❌ You don't have a guide. Use !getguide to claim one.");
    const guide = GUIDES[guideName];
    if (!guide) return msg.reply("❌ Guide not found.");
    if (user.guideSmashAt) return msg.reply(`${guide.emoji} *${guide.name}:* "...Again? Give me a moment to breathe, will you? 😳"`);
    await storage.updateUser(phoneId, { guideSmashAt: new Date(), guidePregnant: false });
    return msg.reply(guide.smashScene.join("\n"));
  }

  if (body.startsWith("!namechild ")) {
    const guideName = user.guideName?.toLowerCase();
    if (!guideName) return msg.reply("❌ You don't have a guide.");
    const guide = GUIDES[guideName];
    if (!guide) return msg.reply("❌ Guide not found.");
    if (!user.guidePregnant) return msg.reply("❌ No child to name yet.");
    if (user.guideChildName) return msg.reply(`❌ Your child is already named *${user.guideChildName}*.`);
    const childName = body.replace("!namechild ", "").trim();
    if (!childName || childName.length > 20) return msg.reply("❌ Invalid name. Keep it under 20 characters.");
    await storage.updateUser(phoneId, { guideChildName: childName });
    const nameMsg = guide.name === "Anna"
      ? `🔴 *Anna:* "~${childName}~!! Oh that's PERFECT darling!! She's already kicking like she approves!! 😭🌸 Welcome to the world, little ${childName}~\nYour daddy is... well. He's trying his best. 💕"`
      : `✨ *${guide.name}:* "...${childName}. ...Yeah. That fits her. Good choice."`;
    await msg.reply(nameMsg);
    await msg.reply(`✨ Your family is complete!\n👨 You + ${guide.emoji} ${guide.name} + 👶 ${childName}\n\n+5000 XP per week permanently added!`);
    return;
  }

  if (body === "!leaveguide") {
    if (!user.guideName) return msg.reply("❌ You don't have a guide.");
    const guideName = user.guideName?.toLowerCase();
    const guide = GUIDES[guideName ?? ""];
    const leaveMsg = guide?.name === "Anna"
      ? `🔴 *Anna:* "...Oh. You're leaving? ...Fine. Fine! Go! I'm not crying, YOU'RE crying!! 😤 Come back when you're ready, darling~"`
      : `✨ *${guide?.name}:* "...Understood. Take care of yourself."`;
    await storage.updateUser(phoneId, { guideName: null, guideSmashAt: null, guidePregnant: false, guideChildName: null });
    return msg.reply(leaveMsg);
  }

  // ════════════════════════════════════════════════════════════════
  //  SECTS
  // ════════════════════════════════════════════════════════════════

  if (body.startsWith("!createsect ")) {
    if (user.sectId) return msg.reply("❌ You are already in a sect. Leave your sect first with !sectleave.");
    const parts = body.replace("!createsect ", "").trim().split(" ");
    if (parts.length < 2) return msg.reply("❌ Usage: !createsect [name] [tag]\nExample: !createsect ShadowClan SC");
    const tag = parts.pop()!.toUpperCase();
    const sectName = parts.join(" ");
    if (sectName.length < 2 || sectName.length > 30) return msg.reply("❌ Sect name must be 2–30 characters.");
    if (tag.length < 2 || tag.length > 5) return msg.reply("❌ Tag must be 2–5 characters.");
    const existing = await storage.getSectByName(sectName);
    if (existing) return msg.reply(`❌ A sect named *${sectName}* already exists.`);
    if (user.xp < 5000) return msg.reply("❌ You need at least 5,000 XP to found a sect.");
    const sect = await storage.createSect({ name: sectName, tag, leaderPhoneId: phoneId, treasuryXp: 0, membersCount: 1 });
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: tag, xp: user.xp - 5000 });
    return msg.reply(
      `╭══════════════════════╮\n  🏯 SECT FOUNDED!\n╰══════════════════════╯\n` +
      `  📛 Name: ${sectName}\n  🏷️ Tag: [${tag}]\n` +
      `  👑 Leader: ${user.name}\n  💰 Cost: 5,000 XP\n\n` +
      `  Others can join with !joinsect ${sectName}\n╰══════════════════════╯`
    );
  }

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
    return msg.reply(
      `╭══════════════════════╮\n  🏯 ${sect.name} [${sect.tag}]\n╰══════════════════════╯\n` +
      `  👑 Leader: ${sect.leaderPhoneId}\n  👥 Members: ${sect.membersCount}\n` +
      `  💰 Treasury: ${sect.treasuryXp} XP\n\n  Top Members:\n${memberList}\n╰══════════════════════╯`
    );
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
    if (!sects.length) return msg.reply("🏯 No sects exist yet. Use !createsect [name] [tag] to found the first!");
    const list = sects.slice(0, 10).map((s, i) => `  ${i + 1}. ${s.name} [${s.tag}] — ${s.treasuryXp} XP | ${s.membersCount} members`).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n  📊 SECT RANKING\n╰══════════════════════╯\n${list}\n╰══════════════════════╯`
    );
  }

  if (body === "!sectleave") {
    if (!user.sectId) return msg.reply("❌ You are not in a sect.");
    const sect = await storage.getSect(user.sectId);
    if (sect && sect.leaderPhoneId === phoneId) return msg.reply("❌ You are the sect leader. Transfer leadership or disband the sect before leaving.");
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
    await client.sendMessage(target.phoneId, `⚡ You have been punished by your sect leader! You lost ${penalty} XP.`);
    return msg.reply(`⚡ *${target.name}* has been punished. They lost ${penalty} XP.`);
  }

  // ════════════════════════════════════════════════════════════════
  //  DUNGEON SYSTEM
  // ════════════════════════════════════════════════════════════════

  if (body === "!dungeon") {
    if (user.inBattle && !user.dungeonActive) return msg.reply("❌ You are in a PvP battle. Finish it first.");
    const existing = getDungeon(phoneId);
    if (existing) {
      const status = formatDungeonStatus(existing);
      const skillList = (user.equippedActives as string[])
        .map((id, i) => {
          const sk = ALL_SKILLS.find(s => s.id === id);
          if (!sk) return null;
          const cd = existing.playerCooldowns[id];
          const mpOk = existing.playerMp >= sk.mpCost ? "" : " ⚠️ low MP";
          const cdStr = cd ? `CD: ${cd}` : "Ready";
          return `  ${i + 1}. *${sk.name}* [${sk.rank}] — ${cdStr}${mpOk}`;
        })
        .filter(Boolean)
        .join("\n");
      return msg.reply(
        `╭══════════════════════╮\n  🏰 TOWER OF ASCENSION\n╰══════════════════════╯\n` +
        `  Resuming your run...\n\n${status}\n\n` +
        `  🗡️ Pick your skill:\n${skillList}\n\n` +
        `  Reply *!dpick [1/2/3]* or *!descape* to flee.`
      );
    }

    const stats = computeStats(user, user.battleExp || 0);
    const startFloor = user.dungeonFloor || 1;
    const monster = getMonsterForFloor(startFloor);

    const dungeonState: DungeonState = {
      phoneId,
      floor: startFloor,
      monster,
      playerHp: stats.maxHp,
      playerMp: stats.maxMp,
      playerMaxHp: stats.maxHp,
      playerMaxMp: stats.maxMp,
      playerStats: stats,
      playerActiveEffects: [],
      playerCooldowns: {},
      monsterActiveEffects: [],
      turn: 1,
      xpEarned: 0,
      noDeathRun: true,
      phase: "active",
      chatId: msg.from,
      turnTimer: null,
    };

    if (user.equippedPassive) {
      const passive = ALL_SKILLS.find(s => s.id === user.equippedPassive);
      if (passive?.effect) {
        dungeonState.playerActiveEffects.push({
          kind: passive.effect.kind,
          value: passive.effect.value,
          turnsLeft: 999,
          source: passive.name,
        });
      }
    }

    setDungeon(phoneId, dungeonState);
    await storage.updateUser(phoneId, { inBattle: true, dungeonActive: true });

    const skillList = (user.equippedActives as string[])
      .map((id, i) => {
        const sk = ALL_SKILLS.find(s => s.id === id);
        if (!sk) return null;
        return `  ${i + 1}. *${sk.name}* [${sk.rank}] — ${sk.description}`;
      })
      .filter(Boolean)
      .join("\n");

    return msg.reply(
      `╭══════════════════════╮\n  🏰 TOWER OF ASCENSION\n╰══════════════════════╯\n\n` +
      `${monster.lore}\n\n` +
      `  📍 *Floor ${startFloor}*\n` +
      `  ${monster.emoji} *${monster.name}* appears!\n\n` +
      `${formatDungeonStatus(dungeonState)}\n\n` +
      `  🗡️ Your skills:\n${skillList || "  ⚠️ No skills equipped! Use !equip first."}\n\n` +
      `  Reply *!dpick [1/2/3]* to attack\n  or *!descape* to flee.`
    );
  }

  if (body.startsWith("!dpick ")) {
    const dungeon = getDungeon(phoneId);
    if (!dungeon) return msg.reply("❌ You are not in the dungeon. Use !dungeon to enter.");
    if (dungeon.phase === "ended") return msg.reply("❌ Your dungeon run has ended.");

    const num = parseInt(body.replace("!dpick ", "").trim()) - 1;
    const equippedIds = (user.equippedActives as string[]) || [];
    if (isNaN(num) || num < 0 || num >= equippedIds.length) {
      return msg.reply(`❌ Invalid skill. Pick 1–${equippedIds.length}.`);
    }

    const skillId = equippedIds[num];
    const skill = ALL_SKILLS.find(s => s.id === skillId);
    if (!skill) return msg.reply("❌ Skill not found. Use !equip to set up your skills.");

    const mockCombatant: any = {
      mp: dungeon.playerMp,
      cooldowns: dungeon.playerCooldowns,
      activeEffects: dungeon.playerActiveEffects,
      stats: { luck: 15 },
    };
    const check = canUseSkill(mockCombatant, skill);
    if (!check.ok) return msg.reply(`❌ ${check.reason}`);

    if (dungeon.turnTimer) clearTimeout(dungeon.turnTimer);

    const result = resolveDungeonTurn(dungeon, skill);
    const { logs, playerDied, monsterDied, newState } = result;

    const logText = logs.join("\n");

    if (monsterDied) {
      const reward = getFloorReward(newState.floor, newState.noDeathRun);
      newState.xpEarned += reward.xp;

      const updates: any = { xp: user.xp + reward.xp };
      if (reward.item) {
        updates.inventory = [...(user.inventory as string[]), reward.item];
      }
      await storage.updateUser(phoneId, updates);

      if (newState.floor >= 10) {
        deleteDungeon(phoneId);
        await storage.updateUser(phoneId, { inBattle: false, dungeonActive: false, dungeonFloor: 1 });
        return msg.reply(
          `${logText}\n\n${reward.message}\n\n` +
          `╭══════════════════════╮\n` +
          `  🌌 TOWER CONQUERED!\n` +
          `╰══════════════════════╯\n` +
          `  Total XP this run: *${newState.xpEarned}*\n` +
          `  You have reached the summit.\n` +
          `  The Astral Realm bows to you.\n` +
          `╰══════════════════════╯`
        );
      }

      newState.floor++;
      const nextMonster = getMonsterForFloor(newState.floor);
      newState.monster = nextMonster;
      newState.monsterActiveEffects = [];
      newState.turn = 1;
      const healAmt = Math.floor(newState.playerMaxHp * 0.3);
      newState.playerHp = Math.min(newState.playerMaxHp, newState.playerHp + healAmt);
      newState.playerMp = Math.min(newState.playerMaxMp, newState.playerMp + 30);

      await storage.updateUser(phoneId, { dungeonFloor: newState.floor });
      setDungeon(phoneId, newState);

      const skillList = equippedIds
        .map((id, i) => {
          const sk = ALL_SKILLS.find(s => s.id === id);
          if (!sk) return null;
          const cd = newState.playerCooldowns[id];
          return `  ${i + 1}. *${sk.name}* [${sk.rank}] — ${cd ? `CD: ${cd}` : "Ready"}`;
        })
        .filter(Boolean)
        .join("\n");

      return msg.reply(
        `${logText}\n\n${reward.message}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💚 Healed *${healAmt} HP* between floors.\n\n` +
        `${nextMonster.lore}\n\n` +
        `  📍 *Floor ${newState.floor}*\n` +
        `  ${nextMonster.emoji} *${nextMonster.name}* appears!\n\n` +
        `${formatDungeonStatus(newState)}\n\n` +
        `  🗡️ Skills:\n${skillList}\n\n` +
        `  Reply *!dpick [1/2/3]* or *!descape*`
      );
    }

    if (playerDied) {
      newState.noDeathRun = false;
      const lostXp = Math.floor(newState.xpEarned * 0.2);
      const keptXp = newState.xpEarned - lostXp;

      await storage.updateUser(phoneId, {
        xp: user.xp + keptXp,
        inBattle: false,
        dungeonActive: false,
        dungeonFloor: 1,
      });
      deleteDungeon(phoneId);

      return msg.reply(
        `${logText}\n\n` +
        `╭══════════════════════╮\n` +
        `  💀 YOU HAVE FALLEN\n` +
        `╰══════════════════════╯\n` +
        `  Floor Reached: *${newState.floor}*\n` +
        `  XP Earned: *+${keptXp}* (lost ${lostXp} on death)\n` +
        `  You have been returned to Floor 1.\n` +
        `  Use !dungeon to try again.\n` +
        `╰══════════════════════╯`
      );
    }

    setDungeon(phoneId, newState);

    const skillListContinue = equippedIds
      .map((id, i) => {
        const sk = ALL_SKILLS.find(s => s.id === id);
        if (!sk) return null;
        const cd = newState.playerCooldowns[id];
        const mpOk = newState.playerMp >= sk.mpCost ? "" : " ⚠️";
        return `  ${i + 1}. *${sk.name}* — ${cd ? `CD: ${cd}` : "Ready"}${mpOk}`;
      })
      .filter(Boolean)
      .join("\n");

    return msg.reply(
      `${logText}\n\n` +
      `${formatDungeonStatus(newState)}\n\n` +
      `  🗡️ Skills:\n${skillListContinue}\n\n` +
      `  Reply *!dpick [1/2/3]* or *!descape*`
    );
  }

  if (body === "!descape") {
    const dungeon = getDungeon(phoneId);
    if (!dungeon) return msg.reply("❌ You are not in the dungeon.");
    if (dungeon.turnTimer) clearTimeout(dungeon.turnTimer);

    const keptXp = dungeon.xpEarned;
    await storage.updateUser(phoneId, {
      xp: user.xp + keptXp,
      inBattle: false,
      dungeonActive: false,
      dungeonFloor: dungeon.floor,
    });
    deleteDungeon(phoneId);

    return msg.reply(
      `🏃 *You flee the tower.*\n\n` +
      `  Floor Reached: *${dungeon.floor}*\n` +
      `  XP Kept: *+${keptXp}*\n\n` +
      `  Your progress is saved at Floor ${dungeon.floor}.\n` +
      `  Use !dungeon to continue your climb.`
    );
  }

  if (body === "!dfloor") {
    const dungeon = getDungeon(phoneId);
    const savedFloor = user.dungeonFloor || 1;
    if (dungeon) {
      return msg.reply(
        `🏰 *Tower Status*\n\n` +
        `  📍 Currently on: *Floor ${dungeon.floor}*\n` +
        `  ❤️ HP: ${dungeon.playerHp}/${dungeon.playerMaxHp}\n` +
        `  ✨ XP earned this run: *${dungeon.xpEarned}*\n\n` +
        `  Use !dpick to continue or !descape to flee.`
      );
    }
    return msg.reply(
      `🏰 *Tower Status*\n\n` +
      `  📍 Saved floor: *${savedFloor}*\n` +
      `  Use !dungeon to enter the tower.`
    );
  }

  if (body === "!dtower") {
    const allUsers = await storage.getUsers();
    const ranked = allUsers
      .filter(u => u.dungeonFloor > 1)
      .sort((a, b) => (b.dungeonFloor || 1) - (a.dungeonFloor || 1));
    if (!ranked.length) return msg.reply("🏰 No cultivators have climbed the tower yet.");
    const list = ranked.slice(0, 10).map((u, i) =>
      `  ${i + 1}. ${u.name} — Floor *${u.dungeonFloor}*`
    ).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n` +
      `  🏰 TOWER LEADERBOARD\n` +
      `╰══════════════════════╯\n${list}\n╰══════════════════════╯`
    );
  }

  // ════════════════════════════════════════════════════════════════
  //  OWNER COMMANDS
  // ════════════════════════════════════════════════════════════════

  if (!isOwner(phoneId)) return;

  if (body === "!guidespawn") {
    const announcement =
      `╭══════════════════════╮\n   ✦┊【 A G U I D E 】┊✦\n╰══════════════════════╯\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  A guide has appeared!\n  She wanders into the realm,\n` +
      `  searching for a worthy\n  cultivator to walk beside.\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Type *!getguide* to claim her.\n  She stays forever.\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆l 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼\n╰══════════════════════╯`;
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

  if (body === "!resetdb") {
    await storage.resetDatabase();
    return msg.reply("🗑️ Database has been reset.");
  }
}
