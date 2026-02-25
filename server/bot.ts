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
  rollStatGains,
  formatStatGains,
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

const PET_HATCH_THRESHOLD = 50000;
const PET_TYPES = ["dragon", "fairy", "phoenix", "griffin", "wolf", "kraken"];

const PET_DESCRIPTIONS: Record<string, string> = {
  dragon: "A majestic beast of fire and scale. Its breath incinerates all who dare oppose its master.",
  fairy: "A shimmering spirit of the woods. Its light blinds foes and mends the wounds of its chosen one.",
  phoenix: "A bird of eternal flame. It rises from the ashes, scorching enemies with every beat of its wings.",
  griffin: "The king of the skies. Its sharp talons and powerful shrieks strike terror into the hearts of mortals.",
  wolf: "A shadow of the frozen wastes. It hunts in silence, tearing through armor with icy fangs.",
  kraken: "A terror from the deep abyss. Its tentacles drag the unworthy into the dark, crushing pressure of the sea.",
};

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

  // PATCH 5: Improved applyPetHelp
  const applyPetHelp = async (owner: Combatant, opponent: Combatant) => {
    const ownerUser = await storage.getUserByPhone(owner.phoneId);
    if (!ownerUser?.petHatched) return;

    const hpPercent = owner.hp / owner.stats.maxHp;

    // Pet activates when owner is below 40% HP, chance increases as HP drops
    const activateChance = hpPercent < 0.15 ? 0.65 :
                           hpPercent < 0.25 ? 0.50 :
                           hpPercent < 0.40 ? 0.30 : 0;

    if (activateChance > 0 && Math.random() < activateChance) {
      const petType = ownerUser.petType || "pet";
      const petName = ownerUser.petName || petType.charAt(0).toUpperCase() + petType.slice(1);

      // Pet damage scales with owner's strength
      const petDmg = Math.floor(owner.stats.strength * 0.9 + Math.random() * 30 + 20);
      opponent.hp = Math.max(0, opponent.hp - petDmg);

      const PET_BATTLE_MSGS: Record<string, string[]> = {
        dragon:  [`🐉 *${petName}* breathes fire!`, `🐉 *${petName}* tears through with dragon claws!`],
        phoenix: [`🔥 *${petName}* scorches the enemy!`, `🔥 *${petName}* rises and strikes!`],
        wolf:    [`🐺 *${petName}* lunges with icy fangs!`, `🐺 *${petName}* howls and attacks!`],
        griffin: [`🦅 *${petName}* dives with sharp talons!`, `🦅 *${petName}* shrieks and tears!`],
        fairy:   [`🧚 *${petName}* blinds the enemy with light!`, `🧚 *${petName}* casts a healing aura!`],
        kraken:  [`🐙 *${petName}* slams with a tentacle!`, `🐙 *${petName}* crushes with the deep!`],
      };

      const msgs = PET_BATTLE_MSGS[petType] || [`🐾 *${petName}* attacks!`];
      const petMsg = msgs[Math.floor(Math.random() * msgs.length)];

      // Fairy has a chance to heal instead of attack
      if (petType === "fairy" && Math.random() < 0.4) {
        const healAmt = Math.floor(owner.stats.intelligence * 0.5 + 20);
        owner.hp = Math.min(owner.stats.maxHp, owner.hp + healAmt);
        logs.push(`🧚 *${petName}* senses *${owner.name}* is in danger and heals them for *${healAmt} HP*!`);
      } else {
        logs.push(`${petMsg} → *${petDmg}* damage to *${opponent.name}*! (Owner at ${Math.floor(hpPercent * 100)}% HP)`);
      }
    }
  };

  const firstStunned = first.activeEffects.some(fx => fx.kind === "stun" || fx.kind === "freeze");
  if (!firstStunned) {
    if (first.mp < firstSkill.mpCost) {
      logs.push(`💀 *${first.name}* doesn't have enough MP to use *${firstSkill.name}* and collapses from exhaustion!`);
      first.hp = 0;
    } else {
      first.mp = Math.max(0, first.mp - firstSkill.mpCost);
      
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
      
      await applyPetHelp(first, second);
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
            first.hp = Math.min(first.stats.maxHp, first.hp + healed2); 
            second.activeEffects = second.activeEffects.filter(fx => fx.kind !== "lifesteal");
            logs.push(`🩸 *${second.name}* leeched ${healed2} HP.`);
          }
        }

        if (secondSkill.effect) {
          const effectLogs2 = applySkillEffect(secondSkill.effect, secondSkill.name, second, first);
          logs.push(...effectLogs2);
        }
        
        await applyPetHelp(second, first);
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

  // PATCH 1: winner block with stat gains
  if (winner) {
    const loser = winner.phoneId === challenger.phoneId ? target : challenger;
    const xpGain = state.xpTransfer;
    state.phase = "ended";

    const winnerUser = await storage.getUserByPhone(winner.phoneId);
    const loserUser  = await storage.getUserByPhone(loser.phoneId);

    const winnerGains = rollStatGains(true);
    const loserGains  = rollStatGains(false);

    if (winnerUser) {
      await storage.updateUser(winner.phoneId, {
        xp:         winnerUser.xp + xpGain,
        battleExp:  (winnerUser.battleExp || 0) + 100,
        battleWins: (winnerUser.battleWins || 0) + 1,
        strBonus:   ((winnerUser as any).strBonus || 0) + winnerGains.str,
        agiBonus:   ((winnerUser as any).agiBonus || 0) + winnerGains.agi,
        intBonus:   ((winnerUser as any).intBonus || 0) + winnerGains.int,
        lckBonus:   ((winnerUser as any).lckBonus || 0) + winnerGains.lck,
        spdBonus:   ((winnerUser as any).spdBonus || 0) + winnerGains.spd,
      });
    }
    if (loserUser) {
      await storage.updateUser(loser.phoneId, {
        xp:           Math.max(0, loserUser.xp - xpGain),
        battleExp:    (loserUser.battleExp || 0) + 30,
        battleLosses: (loserUser.battleLosses || 0) + 1,
        strBonus:     ((loserUser as any).strBonus || 0) + loserGains.str,
        agiBonus:     ((loserUser as any).agiBonus || 0) + loserGains.agi,
        intBonus:     ((loserUser as any).intBonus || 0) + loserGains.int,
        lckBonus:     ((loserUser as any).lckBonus || 0) + loserGains.lck,
        spdBonus:     ((loserUser as any).spdBonus || 0) + loserGains.spd,
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
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  📈 ${formatStatGains(winnerGains, `*${winner.name}* stat gains:`)}\n` +
      `  📈 ${formatStatGains(loserGains, `*${loser.name}* stat gains:`)}\n` +
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

    // PATCH 4: Improved petLine with emojis and progress bar
    const PET_EMOJIS: Record<string, string> = {
      dragon: "🐉", fairy: "🧚", phoenix: "🔥", griffin: "🦅", wolf: "🐺", kraken: "🐙",
    };

    let petLine = "None";
    if (user.petType) {
      const petEmoji = PET_EMOJIS[user.petType] || "🐾";
      const petTypeCap = user.petType.charAt(0).toUpperCase() + user.petType.slice(1);
      if (user.petHatched) {
        petLine =
          `${petEmoji} *${petTypeCap}* — ${user.petName || "Unnamed"}\n` +
          `     _${PET_DESCRIPTIONS[user.petType] || ''}_`;
      } else {
        const progress = user.petXpStolen || 0;
        const pct = Math.min(100, Math.floor((progress / PET_HATCH_THRESHOLD) * 100));
        const barFilled = Math.floor(pct / 10);
        const bar = "▓".repeat(barFilled) + "░".repeat(10 - barFilled);
        petLine =
          `${petEmoji} *${petTypeCap} Egg* [Pending hatch]\n` +
          `     [${bar}] ${progress}/${PET_HATCH_THRESHOLD} XP stolen\n` +
          `     *(${pct}% — steal XP with Blood Rune / Vampire to hatch)*`;
      }
    }

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
      `  🐾 Pet: ${petLine}\n` +
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

    const isFindable = ["dragon egg", "void fragment", "star dust", "vampire tooth", "cursed bone", "living core", "pet egg"].includes(itemLower);
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

    } else if (itemLower === "pet egg") {
      if (user.petType) return msg.reply("❌ You already have a pet or an egg.");
      const type = PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
      updates.petType = type;
      updates.petXpStolen = 0;
      updates.petHatched = false;
      reply = `🥚 You found a mysterious *${type.charAt(0).toUpperCase() + type.slice(1)} Egg*! It will hatch once it witnesses you stealing 50,000 XP using Blood Runes or Vampire abilities.`;

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
      
      // Update Pet Progress
      if (user.petType && !user.petHatched) {
        const newXp = user.petXpStolen + actualSteal;
        const hatched = newXp >= PET_HATCH_THRESHOLD;
        await storage.updateUser(phoneId, { 
          petXpStolen: newXp,
          petHatched: hatched
        });
        if (hatched) {
          await client.sendMessage(phoneId, `🎊 *CONGRATULATIONS!* Your ${user.petType} egg has hatched! You can now name it with !petname [name]. It will assist you in battles when your HP is low.`);
        }
      }

      await client.sendMessage(targetId, `🩸 A Blood Rune was used against you. You lost *${actualSteal} XP*.`);
      inv.splice(num, 1);
      await storage.updateUser(phoneId, { inventory: inv });
      return msg.reply(`🩸 *Blood Rune activated!* You stole *${actualSteal} XP* from *${target.name}*.`);

    } else if (itemLower === "mirror shard") {
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
    if (user.xp < amt) return msg.reply(`❌ Not enough XP. You have ${user.xp} XP.`);
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
    if (targetId === phoneId) return msg.reply("❌ You cannot give XP to yourself.");
    await storage.updateUser(phoneId, { xp: user.xp - amt });
    await storage.updateUser(targetId, { xp: target.xp + amt });
    await client.sendMessage(targetId, `✨ *${user.name}* gifted you *${amt} XP*!`);
    return msg.reply(`✅ You gave *${amt} XP* to *${target.name}*.`);
  }

  if (body.startsWith("!giveitem ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to give an item.");
    const num = parseInt(body.split(" ")[1]) - 1;
    const inv = [...(user.inventory as string[])];
    if (isNaN(num) || !inv[num]) return msg.reply("❌ Invalid item number. Check !inventory.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
    if (targetId === phoneId) return msg.reply("❌ You cannot give items to yourself.");
    const itemName = inv[num];
    inv.splice(num, 1);
    await storage.updateUser(phoneId, { inventory: inv });
    await storage.updateUser(targetId, { inventory: [...(target.inventory as string[]), itemName] });
    await client.sendMessage(targetId, `🎁 *${user.name}* gave you a *${itemName}*!`);
    return msg.reply(`✅ You gave *${itemName}* to *${target.name}*.`);
  }

  if (body.startsWith("!givecard ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to trade a card.");
    const num = parseInt(body.split(" ")[1]) - 1;
    const cards = await storage.getUserCards(phoneId);
    if (isNaN(num) || !cards[num]) return msg.reply("❌ Invalid card number. Check !cardcollection.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target. Try again.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
    if (targetId === phoneId) return msg.reply("❌ You cannot give cards to yourself.");
    const card = cards[num];
    await storage.transferCard(card.id, targetId);
    await client.sendMessage(targetId, `🎴 *${user.name}* traded you *${card.name}* [${card.rarity}] from *${card.series}*!`);
    return msg.reply(`✅ You traded *${card.name}* to *${target.name}*.`);
  }

  if (body === "!getcard") {
    const lastClaim = user.lastCardClaim ? new Date(user.lastCardClaim).getTime() : 0;
    const now = Date.now();
    const cooldown = 86400000;
    if (now - lastClaim < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastClaim)) / 3600000);
      return msg.reply(`⏳ You already claimed your card today. Come back in *${remaining}* hour(s).`);
    }
    const cardData = await fetchRandomAnimeCard();
    await storage.createCard({
      ownerPhoneId: phoneId,
      characterId:  cardData.characterId,
      name:         cardData.name,
      series:       cardData.series,
      rarity:       cardData.rarity,
      imageUrl:     cardData.imageUrl,
    });
    await storage.updateUser(phoneId, { lastCardClaim: new Date() });
    const caption =
      `╭══════════════════════╮\n` +
      `   🎴 NEW CARD CLAIMED!\n` +
      `╰══════════════════════╯\n` +
      `  📛 Name: ${cardData.name}\n` +
      `  📺 Series: ${cardData.series}\n` +
      `  ✨ Rarity: ${cardData.rarity}\n` +
      `╰══════════════════════╯`;
    if (cardData.imageUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let imgRes: any;
        try {
          imgRes = await fetch(cardData.imageUrl, { signal: controller.signal as any });
        } finally {
          clearTimeout(timeout);
        }
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const media = new MessageMedia("image/jpeg", buffer.toString("base64"), `${cardData.name}.jpg`);
        return msg.reply(media, undefined, { caption });
      } catch { /* fall through to text reply */ }
    }
    return msg.reply(caption);
  }

  if (body === "!cardcollection") {
    const cards = await storage.getUserCards(phoneId);
    if (!cards.length) return msg.reply("🎴 You have no cards yet. Use !getcard to claim your daily card.");
    const list = cards.map((c, i) =>
      `  【${i + 1}】 ${c.name} — ${c.series} [${c.rarity}]`
    ).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n` +
      `   🎴 CARD COLLECTION\n` +
      `╰══════════════════════╯\n` +
      `${list}\n` +
      `╰══════════════════════╯\n` +
      `  Use !card [num] to view details.`
    );
  }

  if (body.startsWith("!card ")) {
    const num = parseInt(body.split(" ")[1]) - 1;
    const cards = await storage.getUserCards(phoneId);
    if (isNaN(num) || !cards[num]) return msg.reply("❌ Invalid card number. Check !cardcollection.");
    const card = cards[num];
    const caption =
      `╭══════════════════════╮\n` +
      `   🎴 CARD DETAILS\n` +
      `╰══════════════════════╯\n` +
      `  📛 Name: ${card.name}\n` +
      `  📺 Series: ${card.series}\n` +
      `  ✨ Rarity: ${card.rarity}\n` +
      `╰══════════════════════╯`;
    if (card.imageUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let imgRes: any;
        try {
          imgRes = await fetch(card.imageUrl, { signal: controller.signal as any });
        } finally {
          clearTimeout(timeout);
        }
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const media = new MessageMedia("image/jpeg", buffer.toString("base64"), `${card.name}.jpg`);
        return msg.reply(media, undefined, { caption });
      } catch { /* fall through */ }
    }
    return msg.reply(caption);
  }

  // ── SECT COMMANDS ────────────────────────────────────────────────────────

  if (body.startsWith("!createsect ")) {
    const parts = body.replace("!createsect ", "").trim().split(" ");
    if (parts.length < 2) return msg.reply("❌ Usage: !createsect [name] [tag]");
    const tag = parts.pop()!.toUpperCase();
    const sectName = parts.join(" ");
    if (user.sectId) return msg.reply("❌ You are already in a sect. Leave first with !sectleave.");
    if (user.xp < 5000) return msg.reply("❌ You need at least 5,000 XP to found a sect.");
    const existing = await storage.getSectByName(sectName);
    if (existing) return msg.reply("❌ A sect with that name already exists.");
    const sect = await storage.createSect({ name: sectName, tag, leaderId: phoneId, xp: 0 });
    await storage.updateUser(phoneId, { sectId: sect.id, sectRole: "leader" });
    return msg.reply(
      `╭══════════════════════╮\n` +
      `   🏯 SECT FOUNDED!\n` +
      `╰══════════════════════╯\n` +
      `  📛 Name: ${sectName}\n` +
      `  🏷️ Tag: [${tag}]\n` +
      `  👑 Leader: ${user.name}\n` +
      `╰══════════════════════╯`
    );
  }

  if (body.startsWith("!joinsect ")) {
    const sectName = body.replace("!joinsect ", "").trim();
    if (user.sectId) return msg.reply("❌ You are already in a sect. Leave first with !sectleave.");
    const sect = await storage.getSectByName(sectName);
    if (!sect) return msg.reply("❌ Sect not found.");
    await storage.updateUser(phoneId, { sectId: sect.id, sectRole: "member" });
    return msg.reply(`✅ You joined *${sect.name}* [${sect.tag}]!`);
  }

  if (body === "!sectleave") {
    if (!user.sectId) return msg.reply("❌ You are not in a sect.");
    const sect = await storage.getSect(user.sectId);
    if (sect?.leaderId === phoneId) return msg.reply("❌ Leaders cannot leave. Transfer leadership or disband first.");
    await storage.updateUser(phoneId, { sectId: null, sectRole: null });
    return msg.reply(`✅ You have left *${sect?.name}*.`);
  }

  if (body === "!mysect") {
    if (!user.sectId) return msg.reply("❌ You are not in a sect. Join one with !joinsect [name].");
    const sect = await storage.getSect(user.sectId);
    if (!sect) return msg.reply("❌ Sect data not found.");
    const members = await storage.getSectMembers(user.sectId);
    const memberList = members.map((m, i) =>
      `  ${i + 1}. ${m.name} ${m.sectRole === "leader" ? "👑" : ""}— ${m.xp} XP`
    ).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n` +
      `   🏯 ${sect.name} [${sect.tag}]\n` +
      `╰══════════════════════╯\n` +
      `  👑 Leader: ${members.find(m => m.phoneId === sect.leaderId)?.name || "Unknown"}\n` +
      `  💰 Sect XP: ${sect.xp}\n` +
      `  👥 Members (${members.length}):\n` +
      `${memberList}\n` +
      `╰══════════════════════╯`
    );
  }

  if (body.startsWith("!donate ")) {
    const amt = parseInt(body.split(" ")[1]);
    if (isNaN(amt) || amt <= 0) return msg.reply("❌ Invalid amount.");
    if (!user.sectId) return msg.reply("❌ You are not in a sect.");
    if (user.xp < amt) return msg.reply(`❌ Not enough XP. You have ${user.xp}.`);
    const sect = await storage.getSect(user.sectId);
    if (!sect) return msg.reply("❌ Sect not found.");
    await storage.updateUser(phoneId, { xp: user.xp - amt });
    await storage.updateSect(user.sectId, { xp: sect.xp + amt });
    return msg.reply(`💰 You donated *${amt} XP* to *${sect.name}*. Sect XP: ${sect.xp + amt}`);
  }

  if (body === "!sectranking") {
    const sects = await storage.getSects();
    if (!sects.length) return msg.reply("No sects exist yet.");
    const sorted = sects.sort((a, b) => b.xp - a.xp);
    const list = sorted.slice(0, 10).map((s, i) =>
      `  ${i + 1}. ${s.name} [${s.tag}] — ${s.xp} XP`
    ).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n` +
      `  📊 SECT RANKING\n` +
      `╰══════════════════════╯\n` +
      `${list}\n` +
      `╰══════════════════════╯`
    );
  }

  if (body.startsWith("!kickmember ")) {
    if (!user.sectId || user.sectRole !== "leader") return msg.reply("❌ Only sect leaders can kick members.");
    const targetName = body.replace("!kickmember ", "").trim().toLowerCase();
    const members = await storage.getSectMembers(user.sectId);
    const target = members.find(m => m.name.toLowerCase() === targetName && m.phoneId !== phoneId);
    if (!target) return msg.reply("❌ Member not found in your sect.");
    await storage.updateUser(target.phoneId, { sectId: null, sectRole: null });
    await client.sendMessage(target.phoneId, `⚠️ You have been kicked from *${(await storage.getSect(user.sectId))?.name}* by the leader.`);
    return msg.reply(`✅ *${target.name}* has been kicked from the sect.`);
  }

  if (body.startsWith("!punish ")) {
    if (!user.sectId || user.sectRole !== "leader") return msg.reply("❌ Only sect leaders can punish members.");
    const targetName = body.replace("!punish ", "").trim().toLowerCase();
    const members = await storage.getSectMembers(user.sectId);
    const target = members.find(m => m.name.toLowerCase() === targetName && m.phoneId !== phoneId);
    if (!target) return msg.reply("❌ Member not found in your sect.");
    const penalty = Math.floor(target.xp * 0.1);
    await storage.updateUser(target.phoneId, { xp: Math.max(0, target.xp - penalty) });
    await client.sendMessage(target.phoneId, `⚡ You were punished by your sect leader. You lost *${penalty} XP*.`);
    return msg.reply(`⚡ *${target.name}* has been punished. They lost *${penalty} XP*.`);
  }

  // ── REVIVE ────────────────────────────────────────────────────────────────

  if (body === "!revive") {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a dead person's message to revive them.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found.");
    if (!target.isDead) return msg.reply("❌ That person is not dead.");
    await storage.updateUser(targetId, { isDead: false, hp: 50, condition: "Healthy", disease: null });
    await client.sendMessage(targetId, `💫 *${user.name}* has revived you! You have 50 HP. Be careful out there.`);
    return msg.reply(`✅ You revived *${target.name}*!`);
  }

  // ── BATTLE COMMANDS ───────────────────────────────────────────────────────

  if (body === "!challenge") {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to someone's message to challenge them.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target.");
    const targetId = resolved.phoneId;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found or not registered.");
    if (targetId === phoneId) return msg.reply("❌ You cannot challenge yourself.");
    if (storage.getUserBattle(phoneId)) return msg.reply("❌ You are already in a battle.");
    if (storage.getUserBattle(targetId)) return msg.reply("❌ That person is already in a battle.");
    const existing = await storage.getPendingChallenge(phoneId, targetId);
    if (existing) return msg.reply("❌ You already have a pending challenge against this person.");
    await storage.createChallenge({ challengerId: phoneId, targetId, chatId: msg.from });
    await client.sendMessage(targetId,
      `⚔️ *${user.name}* has challenged you to a battle!\n` +
      `Reply with *!accept* or *!decline* to their message.`
    );
    return msg.reply(`⚔️ Challenge sent to *${target.name}*! Waiting for their response...`);
  }

  if (body === "!accept") {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to the challenger's message to accept.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve challenger.");
    const challengerId = resolved.phoneId;
    const challenge = await storage.getPendingChallenge(challengerId, phoneId);
    if (!challenge) return msg.reply("❌ No pending challenge from that person.");
    if (storage.getUserBattle(phoneId)) return msg.reply("❌ You are already in a battle.");
    if (storage.getUserBattle(challengerId)) return msg.reply("❌ Challenger is already in a battle.");

    const challenger = await storage.getUserByPhone(challengerId);
    if (!challenger) return msg.reply("❌ Challenger not found.");

    const cStats  = computeStats(challenger, challenger.battleExp || 0);
    const tStats  = computeStats(user, user.battleExp || 0);

    const cCombatant: Combatant = {
      phoneId:        challengerId,
      name:           challenger.name,
      hp:             cStats.maxHp,
      mp:             cStats.maxMp,
      stats:          cStats,
      activeEffects:  [],
      skillCooldowns: {},
      equippedActives: getUnlockedSkills(challenger.battleExp || 0, (challenger as any).equippedSkills || []),
      equippedPassive: null,
    };
    applyPassive(cCombatant);

    const tCombatant: Combatant = {
      phoneId:        phoneId,
      name:           user.name,
      hp:             tStats.maxHp,
      mp:             tStats.maxMp,
      stats:          tStats,
      activeEffects:  [],
      skillCooldowns: {},
      equippedActives: getUnlockedSkills(user.battleExp || 0, (user as any).equippedSkills || []),
      equippedPassive: null,
    };
    applyPassive(tCombatant);

    const xpTransfer = Math.floor(Math.min(challenger.xp, user.xp) * 0.1);

    const battleState: BattleState = {
      challenger:           cCombatant,
      target:               tCombatant,
      turn:                 1,
      phase:                "waiting_challenger",
      challengerSkillChoice: null,
      targetSkillChoice:    null,
      xpTransfer,
      chatId:               challenge.chatId,
      turnTimer:            null,
    };

    const battleId = await storage.createBattle({
      challengerId,
      targetId:  phoneId,
      chatId:    challenge.chatId,
      state:     battleState,
    });

    await storage.deleteChallenge(challenge.id);

    const startMsg =
      `╭══════════════════════╮\n` +
      `   ⚔️ BATTLE START!\n` +
      `╰══════════════════════╯\n` +
      `  🔴 ${challenger.name} vs 🔵 ${user.name}\n` +
      `  💰 XP at stake: ${xpTransfer}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `${formatTurnBlock(battleState)}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `${formatSkillList(cCombatant)}\n\n` +
      `${formatSkillList(tCombatant)}\n\n` +
      `⏳ Pick your skill within 60 seconds!\n` +
      `Reply *!pickskill 1/2/3*`;

    await client.sendMessage(challenge.chatId, startMsg);

    battleState.turnTimer = setTimeout(() => resolveBattleTurn(battleId), 60000);
    storage.updateBattleState(battleId, battleState);
    return;
  }

  if (body === "!decline") {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to the challenger's message to decline.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve challenger.");
    const challengerId = resolved.phoneId;
    const challenge = await storage.getPendingChallenge(challengerId, phoneId);
    if (!challenge) return msg.reply("❌ No pending challenge from that person.");
    await storage.deleteChallenge(challenge.id);
    const challenger = await storage.getUserByPhone(challengerId);
    if (challenger) await client.sendMessage(challengerId, `❌ *${user.name}* declined your challenge.`);
    return msg.reply("✅ Challenge declined.");
  }

  if (body.startsWith("!pickskill ")) {
    const pick = parseInt(body.split(" ")[1]);
    if (isNaN(pick) || pick < 1 || pick > 3) return msg.reply("❌ Choose 1, 2, or 3.");
    const battleId = storage.getUserBattle(phoneId);
    if (!battleId) return msg.reply("❌ You are not in a battle.");
    const record = storage.getBattle(battleId);
    if (!record) return msg.reply("❌ Battle not found.");
    const state = record.state as BattleState;
    if (state.phase === "resolving" || state.phase === "ended") return msg.reply("❌ The turn is already resolving.");

    const isChallenger = state.challenger.phoneId === phoneId;
    const combatant = isChallenger ? state.challenger : state.target;
    const skills = combatant.equippedActives;
    const chosen = skills[pick - 1];
    if (!chosen) return msg.reply(`❌ You only have ${skills.length} skill(s) equipped.`);
    if (!canUseSkill(combatant, chosen)) return msg.reply(`❌ *${chosen.name}* is on cooldown.`);

    if (isChallenger) {
      state.challengerSkillChoice = chosen.id;
      state.phase = state.targetSkillChoice ? "resolving" : "waiting_target";
    } else {
      state.targetSkillChoice = chosen.id;
      state.phase = state.challengerSkillChoice ? "resolving" : "waiting_challenger";
    }

    storage.updateBattleState(battleId, state);
    await msg.reply(`✅ *${chosen.name}* selected!`);

    if (state.challengerSkillChoice && state.targetSkillChoice) {
      if (state.turnTimer) { clearTimeout(state.turnTimer); state.turnTimer = null; }
      await resolveBattleTurn(battleId);
    }
    return;
  }

  if (body === "!forfeit") {
    const battleId = storage.getUserBattle(phoneId);
    if (!battleId) return msg.reply("❌ You are not in a battle.");
    const record = storage.getBattle(battleId);
    if (!record) return msg.reply("❌ Battle not found.");
    const state = record.state as BattleState;
    const winner = state.challenger.phoneId === phoneId ? state.target : state.challenger;
    const loser  = state.challenger.phoneId === phoneId ? state.challenger : state.target;

    const winnerUser = await storage.getUserByPhone(winner.phoneId);
    const loserUser  = await storage.getUserByPhone(loser.phoneId);
    const xpGain = state.xpTransfer;

    if (winnerUser) await storage.updateUser(winner.phoneId, { xp: winnerUser.xp + xpGain, battleWins: (winnerUser.battleWins || 0) + 1 });
    if (loserUser)  await storage.updateUser(loser.phoneId, { xp: Math.max(0, loserUser.xp - xpGain), battleLosses: (loserUser.battleLosses || 0) + 1 });

    if (state.turnTimer) clearTimeout(state.turnTimer);
    await storage.endBattle(battleId, winner.phoneId);
    await client.sendMessage(state.chatId,
      `🏳️ *${loser.name}* forfeited the battle!\n🏆 *${winner.name}* wins +${xpGain} XP!`
    );
    return;
  }

  if (body === "!skills") {
    const skills = getUnlockedSkills(user.battleExp || 0, (user as any).equippedSkills || []);
    return msg.reply(
      `╭══════════════════════╮\n` +
      `   📋 YOUR SKILLS\n` +
      `╰══════════════════════╯\n` +
      skills.map((s, i) =>
        `  【${i + 1}】 *${s.name}*\n     ${s.description}\n     MP: ${s.mpCost} | CD: ${s.cooldown}t`
      ).join("\n") +
      `\n╰══════════════════════╯`
    );
  }

  if (body.startsWith("!equip ")) {
    const skillId = body.replace("!equip ", "").trim();
    const allSkills = ALL_SKILLS;
    const skill = allSkills.find(s => s.id === skillId);
    if (!skill) return msg.reply("❌ Skill not found.");
    const unlocked = getUnlockedSkills(user.battleExp || 0, []);
    if (!unlocked.find(s => s.id === skillId)) return msg.reply("❌ You have not unlocked this skill yet.");
    const currentEquipped: string[] = (user as any).equippedSkills || [];
    if (currentEquipped.includes(skillId)) return msg.reply("❌ Skill already equipped.");
    if (currentEquipped.length >= 3) return msg.reply("❌ You can only equip 3 skills. Unequip one first.");
    await storage.updateUser(phoneId, { equippedSkills: [...currentEquipped, skillId] } as any);
    return msg.reply(`✅ *${skill.name}* equipped!`);
  }

  if (body === "!battlestats" || body.startsWith("!battlestats ")) {
    let target = user;
    if (body.startsWith("!battlestats ")) {
      const targetName = body.replace("!battlestats ", "").trim().toLowerCase();
      const allUsers = await storage.getUsers();
      const found = allUsers.find(u => u.name.toLowerCase() === targetName);
      if (!found) return msg.reply("❌ User not found.");
      target = found;
    }
    const stats = computeStats(target, target.battleExp || 0);
    return msg.reply(
      `╭══════════════════════╮\n` +
      `   📊 BATTLE STATS\n` +
      `╰══════════════════════╯\n` +
      `  👤 ${target.name}\n` +
      `  ⚡ Battle EXP: ${target.battleExp || 0}\n` +
      `  🏅 Wins: ${target.battleWins || 0}  💀 Losses: ${target.battleLosses || 0}\n` +
      ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
      `  ❤️ Max HP: ${stats.maxHp}\n` +
      `  💙 Max MP: ${stats.maxMp}\n` +
      `  💪 STR: ${stats.strength}\n` +
      `  🏃 AGI: ${stats.agility}\n` +
      `  🧠 INT: ${stats.intelligence}\n` +
      `  🍀 LCK: ${stats.luck}\n` +
      `  ⚡ SPD: ${stats.speed}\n` +
      `╰══════════════════════╯`
    );
  }

  // ── DUNGEON COMMANDS ─────────────────────────────────────────────────────

  if (body === "!dungeon") {
    if (getDungeon(phoneId)) return msg.reply("❌ You are already in the dungeon. Use !dpick or !descape.");
    const userStats = computeStats(user, user.battleExp || 0);
    const floor = (user as any).dungeonFloor || 1;
    const monster = getMonsterForFloor(floor);
    const dungeonState: DungeonState = {
      phoneId,
      floor,
      playerHp:    userStats.maxHp,
      playerMaxHp: userStats.maxHp,
      playerMp:    userStats.maxMp,
      playerMaxMp: userStats.maxMp,
      monsterHp:   monster.hp,
      monsterMaxHp: monster.hp,
      monsterName:  monster.name,
      turn:         1,
    };
    setDungeon(phoneId, dungeonState);
    return msg.reply(
      `╭══════════════════════╮\n` +
      `   🏰 TOWER OF TRIALS\n` +
      `╰══════════════════════╯\n` +
      `  ⚠️ Floor ${floor}: *${monster.name}* appears!\n\n` +
      `${formatDungeonStatus(dungeonState)}\n\n` +
      `  Use *!dpick 1/2/3* to attack\n` +
      `  Use *!descape* to flee\n` +
      `╰══════════════════════╯`
    );
  }

  if (body.startsWith("!dpick ")) {
    const pick = parseInt(body.split(" ")[1]);
    if (isNaN(pick) || pick < 1 || pick > 3) return msg.reply("❌ Choose 1, 2, or 3.");
    const dungeonState = getDungeon(phoneId);
    if (!dungeonState) return msg.reply("❌ You are not in the dungeon. Use !dungeon to enter.");
    const userStats = computeStats(user, user.battleExp || 0);
    const skills = getUnlockedSkills(user.battleExp || 0, (user as any).equippedSkills || []);
    const chosenSkill = skills[pick - 1] || skills[0];
    const result = resolveDungeonTurn(dungeonState, userStats, chosenSkill);
    if (result.playerDied) {
      deleteDungeon(phoneId);
      await storage.updateUser(phoneId, { dungeonFloor: 1 } as any);
      return msg.reply(
        `╭══════════════════════╮\n` +
        `   💀 YOU FELL!\n` +
        `╰══════════════════════╯\n` +
        `${result.log}\n\n` +
        `  You have been expelled from the Tower.\n` +
        `  Floor reset to 1.\n` +
        `╰══════════════════════╯`
      );
    }
    if (result.monsterDied) {
      const floor = dungeonState.floor;
      const reward = getFloorReward(floor);
      const newFloor = floor + 1;
      const nextMonster = getMonsterForFloor(newFloor);
      await storage.updateUser(phoneId, { xp: user.xp + reward, dungeonFloor: newFloor } as any);
      const newState: DungeonState = {
        ...dungeonState,
        floor:       newFloor,
        playerHp:    result.newPlayerHp,
        monsterHp:   nextMonster.hp,
        monsterMaxHp: nextMonster.hp,
        monsterName:  nextMonster.name,
        turn:         dungeonState.turn + 1,
      };
      setDungeon(phoneId, newState);
      return msg.reply(
        `╭══════════════════════╮\n` +
        `   ✅ FLOOR ${floor} CLEARED!\n` +
        `╰══════════════════════╯\n` +
        `${result.log}\n\n` +
        `  🏆 Reward: +${reward} XP\n` +
        `  ⬆️ Advancing to Floor ${newFloor}...\n\n` +
        `  ⚠️ Floor ${newFloor}: *${nextMonster.name}* appears!\n\n` +
        `${formatDungeonStatus(newState)}\n` +
        `╰══════════════════════╯`
      );
    }
    setDungeon(phoneId, { ...dungeonState, playerHp: result.newPlayerHp, monsterHp: result.newMonsterHp, turn: dungeonState.turn + 1 });
    return msg.reply(
      `${result.log}\n\n` +
      `${formatDungeonStatus({ ...dungeonState, playerHp: result.newPlayerHp, monsterHp: result.newMonsterHp })}\n\n` +
      `  Use *!dpick 1/2/3* to continue or *!descape* to flee.`
    );
  }

  if (body === "!descape") {
    if (!getDungeon(phoneId)) return msg.reply("❌ You are not in the dungeon.");
    deleteDungeon(phoneId);
    return msg.reply("🏃 You fled the Tower. Your progress on this floor is lost.");
  }

  if (body === "!dfloor") {
    const floor = (user as any).dungeonFloor || 1;
    return msg.reply(`🏰 You are on Tower Floor *${floor}*.`);
  }

  if (body === "!dtower") {
    const allUsers = await storage.getUsers();
    const sorted = allUsers
      .filter(u => (u as any).dungeonFloor > 1)
      .sort((a, b) => ((b as any).dungeonFloor || 1) - ((a as any).dungeonFloor || 1));
    if (!sorted.length) return msg.reply("🏰 No cultivators have progressed in the Tower yet.");
    const list = sorted.slice(0, 10).map((u, i) =>
      `  ${i + 1}. ${u.name} — Floor ${(u as any).dungeonFloor}`
    ).join("\n");
    return msg.reply(
      `╭══════════════════════╮\n` +
      `  🏆 TOWER LEADERBOARD\n` +
      `╰══════════════════════╯\n` +
      `${list}\n` +
      `╰══════════════════════╯`
    );
  }

  // ── GUIDE COMMANDS ────────────────────────────────────────────────────────

  if (body === "!getguide") {
    if (user.guideName) return msg.reply(`You already have a guide: *${user.guideName}*. Use !talkguide to speak with them.`);
    try {
      const imgBuffer = fs.readFileSync(path.join(process.cwd(), ANNA.image));
      const media = new MessageMedia("image/jpeg", imgBuffer.toString("base64"), "anna.jpg");
      await msg.reply(media, undefined, { caption: ANNA.greeting });
    } catch { await msg.reply(ANNA.greeting); }
    return;
  }

  if (body === "!claimguide anna") {
    if (user.guideName) return msg.reply("You already have a guide.");
    await storage.updateUser(phoneId, { guideName: "Anna" });
    return msg.reply(ANNA.claimMsg);
  }

  if (body === "!talkguide") {
    if (!user.guideName) return msg.reply("You have no guide. Use !getguide to find one.");
    const guide = GUIDES[user.guideName.toLowerCase()];
    if (!guide) return msg.reply("Guide data not found.");
    const response = guide.talkResponses[Math.floor(Math.random() * guide.talkResponses.length)];
    return msg.reply(response);
  }

  if (body === "!smashmyguide") {
    if (!user.guideName) return msg.reply("You have no guide to smash.");
    if (user.guidePregnant) return msg.reply("🔴 *Anna:* \"Darling... I'm already carrying your child. Settle down~! 😤\"");
    await storage.updateUser(phoneId, { guideSmashAt: new Date() });
    for (const line of ANNA.smashScene) {
      await client.sendMessage(phoneId, line);
      await new Promise(r => setTimeout(r, 1200));
    }
    return;
  }

  if (body.startsWith("!namechild ")) {
    if (!user.guidePregnant) return msg.reply("🔴 *Anna:* \"There's no child yet, darling~!\"");
    if (user.guideChildName) return msg.reply(`🔴 *Anna:* "Our child already has a name: *${user.guideChildName}*~!"`);
    const childName = body.replace("!namechild ", "").trim();
    if (!childName) return msg.reply("❌ Please provide a name.");
    await storage.updateUser(phoneId, { guideChildName: childName });
    return msg.reply(
      `🔴 *Anna:* "....*${childName}*. That's a beautiful name, darling. 🌸\n` +
      `She'll grow up strong. I just know it.\n` +
      `*Thank you.* For everything~ 💕"`
    );
  }

  if (body === "!leaveguide") {
    if (!user.guideName) return msg.reply("You have no guide.");
    await storage.updateUser(phoneId, {
      guideName: null, guideSmashAt: null,
      guidePregnant: false, guideChildName: null
    });
    return msg.reply("🔴 *Anna:* \"...Fine. I'll go. But you'll miss me, darling. You always do.~ 💔\"");
  }

  // ── PET NAME ─────────────────────────────────────────────────────────────

  if (body.startsWith("!petname ")) {
    if (!user.petType || !user.petHatched) return msg.reply("❌ You don't have a hatched pet to name.");
    const petName = body.replace("!petname ", "").trim();
    if (!petName) return msg.reply("❌ Please provide a name.");
    await storage.updateUser(phoneId, { petName } as any);
    return msg.reply(`🐾 Your ${user.petType} has been named *${petName}*!`);
  }

  // ── OWNER COMMANDS ────────────────────────────────────────────────────────

  if (!isOwner(phoneId)) return;

  if (body.startsWith("!ban ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a user's message to ban them.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target.");
    await storage.updateUser(resolved.phoneId, { isBanned: true });
    return msg.reply(`✅ *${resolved.contact.pushname || resolved.phoneId}* has been banned.`);
  }

  if (body.startsWith("!unban ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a user's message to unban them.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target.");
    await storage.updateUser(resolved.phoneId, { isBanned: false });
    return msg.reply(`✅ User unbanned.`);
  }

  if (body.startsWith("!addxp ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a user's message.");
    const amt = parseInt(body.split(" ")[1]);
    if (isNaN(amt)) return msg.reply("❌ Invalid amount.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target.");
    const target = await storage.getUserByPhone(resolved.phoneId);
    if (!target) return msg.reply("❌ User not found.");
    await storage.updateUser(resolved.phoneId, { xp: target.xp + amt });
    return msg.reply(`✅ Added *${amt} XP* to *${target.name}*.`);
  }

  if (body.startsWith("!removexp ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a user's message.");
    const amt = parseInt(body.split(" ")[1]);
    if (isNaN(amt)) return msg.reply("❌ Invalid amount.");
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target.");
    const target = await storage.getUserByPhone(resolved.phoneId);
    if (!target) return msg.reply("❌ User not found.");
    await storage.updateUser(resolved.phoneId, { xp: Math.max(0, target.xp - amt) });
    return msg.reply(`✅ Removed *${amt} XP* from *${target.name}*.`);
  }

  if (body === "!resetall") {
    await storage.resetAllUsers();
    return msg.reply("✅ All user data has been reset.");
  }

  if (body.startsWith("!setrace ")) {
    if (!msg.hasQuotedMsg) return msg.reply("❌ Reply to a user's message.");
    const race = body.replace("!setrace ", "").trim();
    const resolved = await resolveQuotedUser(msg);
    if (!resolved) return msg.reply("❌ Could not resolve target.");
    await storage.updateUser(resolved.phoneId, { species: race });
    return msg.reply(`✅ Race set to *${race}*.`);
  }

  if (body === "!outbreak") {
    const races = Object.keys(DISEASES);
    const randomRace = races[Math.floor(Math.random() * races.length)];
    const disease = DISEASES[randomRace];
    const endsAt = new Date(Date.now() + 86400000 * 3);
    await storage.updateGlobalStats({
      activeDisease: disease.name,
      diseaseRace:   disease.race,
      lastOutbreakAt: new Date(),
      outbreakEndsAt: endsAt,
    });
    return msg.reply(`⚠️ *FORCED OUTBREAK*\n\n${disease.startMsg}`);
  }

  if (body === "!curedisease") {
    const stats = await storage.getGlobalStats();
    const disease = Object.values(DISEASES).find(d => d.name === stats.activeDisease);
    await storage.updateGlobalStats({ activeDisease: null, diseaseRace: null, outbreakEndsAt: null });
    return msg.reply(`✅ *DISEASE CLEARED*\n\n${disease?.endMsg || "The plague has ended."}`);
  }
}
