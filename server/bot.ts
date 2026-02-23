import pkg, { type Message } from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import { storage } from './storage';
import { type User, type Card, type Sect } from '@shared/schema';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export let currentQrCode: string | undefined;
export let connectionStatus: "CONNECTED" | "DISCONNECTED" | "WAITING_FOR_QR" = "DISCONNECTED";

const OWNER_NUMBER = "2347062301848@c.us";

const HELP_MENU = `╭══════════════════════╮
   ✦┊【Ａｗａｋｅｎｉｎｇ】┊✦
╰══════════════════════╯
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  📊 PROFILE & STATS
  🏅 !rank ↳ check your rank
  📈 !stats ↳ view your stats
  👤 !profile ↳ view your profile
  🏆 !leaderboard ↳ top cultivators
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🛒 SHOP & ITEMS
  🏪 !shop ↳ view shop
  🛍️ !buy [item] ↳ purchase item
  🎒 !inventory ↳ view items
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🎴 CARDS
  🎁 !getcard ↳ daily claim
  📚 !cardcollection ↳ view cards
  🔍 !card [num] ↳ view card info
  🤝 !givecard @user [num] ↳ trade card
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🏯 SECT
  🚪 !joinsect [name] ↳ join a sect
  🏯 !mysect ↳ view sect details
  💰 !donate [amount] ↳ donate XP
  📊 !sectranking ↳ sect leaderboard
  🚶 !sectleave ↳ leave your sect
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👑 LEADER ONLY
  🖼️ !setsectpfp ↳ set sect image
  🥾 !kickmember [username] ↳ kick member
  ⚡ !punish [username] ↳ punish member
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆𝖑 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼
╰══════════════════════╯`;

const MISS_ASTRAL_SYSTEM_PROMPT = `You are Miss Astral, an ancient and mysterious cat who has existed since before the stars were named...`;

async function callClaude(messages: any[], user: User) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
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
  if (!response.ok) throw new Error("API call failed");
  const data = await response.json();
  return data.content[0].text;
}

let client: Client;
let isInitializing = false;

export async function initBot() {
  if (isInitializing) return;
  isInitializing = true;
  const authPath = path.join(process.cwd(), '.wwebjs_auth');
  const cachePath = path.join(process.cwd(), '.wwebjs_cache');
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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process']
    }
  });

  client.on('qr', (qr) => {
    currentQrCode = qr;
    connectionStatus = "WAITING_FOR_QR";
    console.log('New QR code received');
  });

  client.on('ready', () => {
    connectionStatus = "CONNECTED";
    currentQrCode = undefined;
    console.log('Bot is ready');
  });

  client.on('authenticated', () => {
    connectionStatus = "CONNECTED";
    console.log('Authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error('Auth failure:', msg);
    connectionStatus = "DISCONNECTED";
    currentQrCode = undefined;
  });

  client.on('disconnected', (reason) => {
    console.error('Client was logged out', reason);
    connectionStatus = "DISCONNECTED";
    currentQrCode = undefined;
    setTimeout(() => initBot(), 5000);
  });

  client.on('message', async (msg) => {
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
    client.destroy().then(() => initBot()).catch(() => initBot());
  } else {
    initBot();
  }
}

async function handleMessage(msg: Message) {
  const contact = await msg.getContact();
  const phoneId = contact.id._serialized;
  const name = contact.pushname || contact.number;
  const body = msg.body.trim().toLowerCase();

  let user = await storage.getUserByPhone(phoneId);

  if (user?.isBanned) {
    if (body.startsWith("!")) {
      await client.sendMessage(phoneId, "Miss Astral does not even blink.\n\n...The void has closed its doors to you.");
    }
    return;
  }

  if (phoneId === OWNER_NUMBER) {
    if (body.startsWith("!unban")) {
      const target = msg.mentionedIds[0] || (body.split(" ")[1] + "@c.us");
      await storage.updateUser(target, { isBanned: false });
      return msg.reply(`${target} has been permitted to return.`);
    }
    if (body.startsWith("!ban")) {
      const target = msg.mentionedIds[0] || (body.split(" ")[1] + "@c.us");
      await storage.updateUser(target, { isBanned: true });
      return msg.reply(`${target} has been cast into the void.`);
    }
  }

  if (body === "!help" || body === "!menu") {
    return msg.reply(HELP_MENU);
  }

  if (!user) {
    user = await storage.createUser({ phoneId, name });
  }

  // XP Gain
  if (body.length >= 3 && !body.startsWith("!")) {
    await storage.updateUser(phoneId, { xp: user.xp + 5, messages: user.messages + 1 });
  }

  if (body === "!stats" || body === "!rank") {
    return msg.reply(`📊 STATS - ${user.name}\n\nSpecies: ${user.species}\nXP: ${user.xp}\nMessages: ${user.messages}\nSect: ${user.sectTag || "None"}`);
  }

  if (body === "!profile") {
    const cardCount = (await storage.getUserCards(phoneId)).length;
    return msg.reply(`👤 PROFILE - ${user.name}\n\nSpecies: ${user.species}\nXP: ${user.xp}\nCards Owned: ${cardCount}\nSect: ${user.sectTag || "None"}`);
  }

  if (body === "!leaderboard") {
    const top = await storage.getUsers();
    const list = top.slice(0, 10).map((u, i) => `${i + 1}. ${u.name} - ${u.xp} XP`).join("\n");
    return msg.reply(`🏆 TOP CULTIVATORS\n\n${list}`);
  }

  if (body === "!shop") {
    return msg.reply(`🏪 SHOP\n\n1. Species Change: Elf (500 XP)\n2. Species Change: Dragon (1000 XP)\n\nUse !buy [item] to purchase.`);
  }

  if (body.startsWith("!missastral")) {
    const query = body.replace("!missastral", "").trim();
    if (!query) return msg.reply("Miss Astral opens one eye slowly...");
    try {
      const memory = (user.missAstralMemory as any[]) || [];
      const messages = [...memory, { role: "user", content: query }];
      const response = await callClaude(messages, user);
      await storage.updateUser(phoneId, {
        missAstralMemory: [...messages, { role: "assistant", content: response }].slice(-10),
        missAstralLastUsed: new Date(),
        missAstralUsageCount: user.missAstralUsageCount + 1
      });
      return msg.reply(response);
    } catch (err) {
      return msg.reply("Miss Astral closes her eyes.");
    }
  }
  
  if (body === "!getcard") {
    const now = new Date();
    if (user.lastCardClaim && (now.getTime() - new Date(user.lastCardClaim).getTime() < 86400000)) {
       return msg.reply("You have already claimed your card for today.");
    }
    // Mock card generation for now
    await storage.createCard({
      ownerPhoneId: phoneId,
      characterId: Math.floor(Math.random() * 10000),
      name: "Random Character",
      series: "Unknown Series",
      imageUrl: "https://via.placeholder.com/150",
      rarity: "C"
    });
    await storage.updateUser(phoneId, { lastCardClaim: now });
    return msg.reply("🎁 A new card has materialized in your inventory!");
  }

  if (body === "!cardcollection") {
    const cards = await storage.getUserCards(phoneId);
    if (cards.length === 0) return msg.reply("Your collection is empty.");
    const list = cards.map((c, i) => `${i + 1}. ${c.name} [${c.rarity}]`).join("\n");
    return msg.reply(`🎴 YOUR COLLECTION\n\n${list}`);
  }
}
