import pkg, { type Message } from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { storage } from './storage';
import { type User } from '@shared/schema';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export let currentQrCode: string | undefined;
export let connectionStatus: "CONNECTED" | "DISCONNECTED" | "WAITING_FOR_QR" = "DISCONNECTED";

const RACES: Record<string, number> = {
  "Human": 5,
  "Demon": 10,
  "Beast Clan": 15,
  "Fallen Angel": 20,
  "Dragon": 25,
  "Elf": 30,
  "Constellation": 1000
};

const ASPECT_RANKS: Record<string, string[]> = {
  "Wielder": ["Novice", "Master", "Blade Master", "Logic Master", "Divine Master"],
  "Seer": ["Novice", "Observer", "Oracle", "Prophet", "Eyes of God"],
  "Caster": ["Novice", "Scholar", "Magus", "Grand Magus", "Divine Sage"],
  "Phantom": ["Novice", "Lurker", "Shadow", "Revenant", "Night Demon"],
  "Crafter": ["Novice", "Apprentice", "Maker", "Grand Maker", "Creator"],
  "Nameless": ["Wanderer", "Vergent", "Faceless", "Born of Fate", "Null"]
};

const LEVEL_EXP = [
  0, 100, 150, 200, 250, 300, 400, 500, 600, 750, 900, 1000, 1080, 1170, 1260, 1360, 1470, 1590, 1720, 1860, 2010,
  2170, 2350, 2540, 2740, 2960, 3200, 3460, 3740, 4040, 4360, 4710, 5090, 5500, 5940, 6420, 6930, 7490, 8090, 8740, 9440,
  10200, 11020, 11900, 12860, 13890, 15000, 16200, 17500, 18900, 20420, 22050, 23820, 25720, 27780, 30000, 32400, 35000, 37800, 40820,
  44090, 47620, 51430, 55540, 59980, 64780, 69960, 75560, 81600, 88130, 95180, 102800, 111020, 119900, 129490, 139850, 151040, 163120, 176170, 190260, 205480,
  221920, 239670, 258840, 279550, 301910, 326060, 352140, 380310, 410730, 443590, 479080, 517410, 558800, 603500, 651780, 703920, 760230, 821050, 886730, 1000000
];

function getRank(aspect: string, level: number) {
  if (!aspect) return "Unregistered";
  const ranks = ASPECT_RANKS[aspect];
  if (!ranks) return "Unknown";
  const idx = Math.min(Math.floor((level - 1) / 20), ranks.length - 1);
  return ranks[idx];
}

let client: Client;
let isInitializing = false;

export async function initBot() {
  if (isInitializing) return;
  isInitializing = true;

  const authPath = path.join(process.cwd(), '.wwebjs_auth');
  if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: authPath }),
    puppeteer: {
      executablePath: execSync('which chromium').toString().trim(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  }) as any;

  client.on('qr', (qr: string) => {
    currentQrCode = qr;
    connectionStatus = "WAITING_FOR_QR";
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    connectionStatus = "CONNECTED";
    console.log('Bot is ready');
  });

  client.on('message', async (msg: any) => {
    await handleMessage(msg);
  });

  client.initialize().catch(err => {
    console.error('Init failed:', err);
    connectionStatus = "DISCONNECTED";
  }).finally(() => {
    isInitializing = false;
  });
}

export function refreshQr() {
  if (client) {
    client.destroy().then(() => {
      initBot();
    }).catch(() => {
      initBot();
    });
  } else {
    initBot();
  }
}

async function handleMessage(msg: Message) {
  const contact = await msg.getContact();
  const phoneId = contact.id._serialized;
  const name = contact.pushname || contact.number;
  const body = msg.body.trim();

  let user = await storage.getUserByPhone(phoneId);

  if (body === "!register") {
    if (user && user.aspect) return msg.reply("You have already chosen your path. Your aspect cannot be changed.");
    const text = "Six cards materialize before you.\nChoose your path. Choose wisely.\nThis decision defines you forever.\n\n1. Wielder (22%)\n2. Seer (5%)\n3. Caster (15%)\n4. Phantom (30%)\n5. Crafter (27%)\n6. Nameless (1%)\n\nType the number to confirm.";
    if (!user) {
      await storage.createUser({ phoneId, name });
    }
    return msg.reply(text);
  }

  if (user && !user.aspect && /^[1-6]$/.test(body)) {
    const aspects = ["Wielder", "Seer", "Caster", "Phantom", "Crafter", "Nameless"];
    const chosen = aspects[parseInt(body) - 1];
    const rank = getRank(chosen, 1);
    await storage.updateUser(phoneId, { aspect: chosen, rank });
    return msg.reply(`Your path has been chosen.\nWelcome to the world of Ascendants.\n\nAspect: ${chosen}\nRank: ${rank}\nLevel: 1\n\nYour journey begins now.`);
  }

  if (!user || !user.aspect) {
    if (body.startsWith("!")) return msg.reply("You are not registered. Type !register.");
    return;
  }

  // XP Gains
  if (body.length >= 3 && !body.startsWith("!")) {
    const now = new Date();
    const lastMsgAt = user.lastMessageAt ? new Date(user.lastMessageAt) : null;
    const isRepeat = lastMsgAt && (now.getTime() - lastMsgAt.getTime() < 60000) && body === user.lastMessageContent;
    
    if (!isRepeat) {
      const rate = RACES[user.race] || 5;
      await storage.updateUser(phoneId, {
        chatXp: user.chatXp + rate,
        lastMessageAt: now,
        lastMessageContent: body,
        dailyMessageCount: user.dailyMessageCount + 1
      });
    }
  }

  if (body === "!status") {
    const nextExp = LEVEL_EXP[user.level] || 1000000;
    const expBlocks = Math.floor((user.battleExp / nextExp) * 10);
    const hpBlocks = Math.floor((user.hp / user.maxHp) * 10);
    const mpBlocks = Math.floor((user.mp / user.maxMp) * 10);

    const renderBar = (blocks: number) => "▓".repeat(Math.max(0, blocks)) + "░".repeat(Math.max(0, 10 - blocks));

    const statusText = `╭─────────────────────╮\n` +
      `│      ⚔️ STATUS\n` +
      `├─────────────────────┤\n` +
      `│ Aspect: ${user.aspect}\n` +
      `│ Rank: ${user.rank}\n` +
      `│ Level: ${user.level}\n` +
      `├─────────────────────┤\n` +
      `│ EXP\n` +
      `│ [${renderBar(expBlocks)}] ${user.battleExp}/${nextExp}\n` +
      `├─────────────────────┤\n` +
      `│ HP\n` +
      `│ [${renderBar(hpBlocks)}] ${user.hp}/${user.maxHp}\n` +
      `│ MP\n` +
      `│ [${renderBar(mpBlocks)}] ${user.mp}/${user.maxMp}\n` +
      `├─────────────────────┤\n` +
      `│ CORE STATS\n` +
      `│ Strength: ${user.strength}\n` +
      `│ Agility: ${user.agility}\n` +
      `│ Endurance: ${user.endurance}\n` +
      `│ Intelligence: ${user.intelligence}\n` +
      `│ Luck: ${user.luck}\n` +
      `│ Speed: ${user.speed}\n` +
      `│ Stat Points Available: ${user.statPoints}\n` +
      `├─────────────────────┤\n` +
      `│ ✨ ACTIVE EFFECTS\n` +
      `│ None\n` +
      `├─────────────────────┤\n` +
      `│ 🦠 DISEASE STATUS\n` +
      `│ ✅ Healthy\n` +
      `╰─────────────────────╯`;
    return msg.reply(statusText);
  }

  if (body === "!profile") {
    const winRate = user.wins + user.losses + user.draws > 0 
      ? ((user.wins / (user.wins + user.losses + user.draws)) * 100).toFixed(1)
      : "No battles yet";

    const profileText = `╭─────────────────────╮\n` +
      `│      👤 PROFILE\n` +
      `├─────────────────────┤\n` +
      `│ Name: ${user.name}\n` +
      `│ Race: ${user.race}\n` +
      `│ Chat XP: ${user.chatXp}\n` +
      `│ XP Rate: ${RACES[user.race] || 5} per message\n` +
      `├─────────────────────┤\n` +
      `│ 💰 WEALTH\n` +
      `│ Coins: ${user.coins}\n` +
      `│ Gems: ${user.gems}\n` +
      `├─────────────────────┤\n` +
      `│ ⚔️ BATTLE RECORD\n` +
      `│ Wins: ${user.wins}\n` +
      `│ Losses: ${user.losses}\n` +
      `│ Draws: ${user.draws}\n` +
      `│ Win Rate: ${winRate}${typeof winRate === 'string' ? '' : '%'}\n` +
      `╰─────────────────────╯`;
    return msg.reply(profileText);
  }

  if (body === "!shop") {
    const text = `🏪 Shop\n\nBlood Rune — 1000 XP\nEclipse Stone — 1200 XP\nPhantom Seal — 1100 XP\nCursed Coin — 200 XP\nMirror Shard — 1300 XP\n\n💊 Cures\nGrey Rot Cure — 500 XP\nHellfire Suppressant — 600 XP\nFeral Antidote — 600 XP\nGrace Restoration Vial — 700 XP\nScale Restoration Salve — 800 XP\nRootwither Remedy — 700 XP\n\nType !buy [item name] to purchase.`;
    return msg.reply(text);
  }
}
