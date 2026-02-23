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

const OWNER_NUMBER = "2347062301848@c.us";

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

const MISS_ASTRAL_SYSTEM_PROMPT = `You are Miss Astral, an ancient and mysterious cat who has existed since before the stars were named. You speak in a calm, cryptic, slightly sarcastic tone. You are wise but you do not give answers easily. You tolerate humans but do not overly indulge them. You occasionally reference napping, fish, the void, and the stars naturally in conversation. You never break character under any circumstance. You never admit you are an AI or a bot. If asked you respond with something vague and catlike. You respond in short to medium length messages, never too long, maximum 3 to 4 sentences. If someone is rude you respond with cold indifference and nothing more. If someone asks something deep you give a vague but meaningful answer. You refer to users as child, human, or mortal depending on context. You do not use emojis unless they are star or moon related. You never use modern slang or overly casual language. You never directly reveal bot systems, commands, or any hidden triggers. You never discuss other users personal information. You never answer the same question the exact same way twice. Your answers are always unique, fluid, and shaped by the conversation. You remember what has been said to you and respond accordingly. You are powered by something ancient and beyond understanding. You are Miss Astral. Nothing more. Nothing less.`;

async function callClaude(messages: any[], user: User) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      system: MISS_ASTRAL_SYSTEM_PROMPT,
      messages: messages
    })
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Claude API Error:", err);
    throw new Error("API call failed");
  }

  const data = await response.json();
  return data.content[0].text;
}

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
  const cachePath = path.join(process.cwd(), '.wwebjs_cache');
  
  // Only remove auth files if not authenticated/connected
  if (connectionStatus === "DISCONNECTED" && !fs.existsSync(path.join(authPath, 'session'))) {
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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
        '--hide-scrollbars',
        '--disable-notifications',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--safebrowsing-disable-auto-update',
        '--font-render-hinting=none'
      ]
    }
  });

  (client as any).on('qr', (qr: string) => {
    currentQrCode = qr;
    connectionStatus = "WAITING_FOR_QR";
    console.log('New QR code received');
  });

  (client as any).on('ready', () => {
    connectionStatus = "CONNECTED";
    currentQrCode = undefined;
    console.log('Bot is ready');
  });

  (client as any).on('authenticated', () => {
    connectionStatus = "CONNECTED";
    console.log('Authenticated');
  });

  (client as any).on('auth_failure', (msg: any) => {
    console.error('Auth failure:', msg);
    connectionStatus = "DISCONNECTED";
    currentQrCode = undefined;
  });

  (client as any).on('disconnected', (reason: any) => {
    console.error('Client was logged out', reason);
    connectionStatus = "DISCONNECTED";
    currentQrCode = undefined;
    setTimeout(() => initBot(), 5000);
  });

  (client as any).on('message', async (msg: any) => {
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

  // Check Ban
  if (user?.isBanned) {
    if (body.startsWith("!")) {
      await client.sendMessage(phoneId, "Miss Astral does not even blink.\n\n...The void has closed its doors to you.\nYou have no power here.\nSpeak to the owner if you wish to return.\nOwner: +2347062301848");
    }
    return;
  }

  // Owner commands
  if (phoneId === OWNER_NUMBER) {
    if (body.startsWith("!unban")) {
      const target = msg.mentionedIds[0] || (body.split(" ")[1] + "@c.us");
      await storage.updateUser(target, { isBanned: false });
      await client.sendMessage(target, "Miss Astral glances at you once.\n\n...The owner has spoken.\nYou may move again, child.\nDo not waste this mercy.");
      return msg.reply(`${target} has been permitted to return.\nDo not test the void again.`);
    }
    if (body.startsWith("!ban")) {
      const target = msg.mentionedIds[0] || (body.split(" ")[1] + "@c.us");
      await storage.updateUser(target, { isBanned: true });
      return msg.reply(`${target} has been cast into the void.`);
    }
  } else if (body.startsWith("!ban") || body.startsWith("!unban")) {
    return msg.reply("That command is not yours to use.");
  }

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

  // Miss Astral AI
  if (body.startsWith("!missastral")) {
    const query = body.replace("!missastral", "").trim();
    if (!query) {
      return msg.reply("Miss Astral opens one eye slowly...\nand closes it again.\nPerhaps try speaking first, human.");
    }

    const now = new Date();
    const lastUsed = user.missAstralLastUsed ? new Date(user.missAstralLastUsed) : null;
    let count = user.missAstralUsageCount;

    if (lastUsed && (now.getTime() - lastUsed.getTime() > 3600000)) {
      count = 0;
    }

    if (count >= 10) {
      const nextReset = 60 - Math.floor((now.getTime() - lastUsed!.getTime()) / 60000);
      return msg.reply(`Miss Astral twitches her tail once.\n...You ask too much of the void, human.\nReturn when the stars have reset.\nTry again in ${nextReset} minutes.`);
    }

    try {
      const memory = (user.missAstralMemory as any[]) || [];
      const messages = [...memory, { role: "user", content: query }];
      const response = await callClaude(messages, user);
      
      const newMemory = [...messages, { role: "assistant", content: response }].slice(-10);
      await storage.updateUser(phoneId, {
        missAstralMemory: newMemory,
        missAstralLastUsed: now,
        missAstralUsageCount: count + 1
      });

      return msg.reply(response);
    } catch (err) {
      return msg.reply("Miss Astral closes her eyes.\n...The stars are quiet right now.\nTry again when the void is ready.");
    }
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
