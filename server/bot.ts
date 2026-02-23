import pkg from 'whatsapp-web.js';
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

const HELP_MENU = `╭══════════════════════╮
   ✦┊【Ａｗａｋｅｎｉｎｇ】┊✦
╰══════════════════════╯
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  📊 PROFILE & STATS
  📈 !status ↳ view your status
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
  👑 SECT LEADER ONLY
    🥾 !kickmember [username] ↳ kick member
  ⚡ !punish [username] ↳ punish member
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🔱 OWNER ONLY
  🔨 !ban [username] ↳ ban a user
  🔓 !unban [username] ↳ unban a user
  🤖 !missastral ↳ manage Miss Astral
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
    if (xp >= RANKS[i].threshold) {
      return RANKS[i];
    }
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
};

function getRandomSpecies() {
  const races = Object.keys(SPECIES_XP_RATES);
  const name = races[Math.floor(Math.random() * races.length)];
  const rarity = name === "Celestial" ? "Legendary" : (name === "Dragon" || name === "Elf" ? "Very Rare" : "Common");
  return { name, rarity };
}

let client: Client;
let isInitializing = false;

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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions'
      ]
    }
  });

  client.on('qr', (qr) => {
    currentQrCode = qr;
    connectionStatus = "WAITING_FOR_QR";
    console.log('New QR code received:', qr.substring(0, 20) + "...");
  });

  client.on('ready', () => {
    connectionStatus = "CONNECTED";
    currentQrCode = undefined;
    console.log('Bot is ready');
  });

  client.on('authenticated', () => {
    connectionStatus = "CONNECTED";
    currentQrCode = undefined;
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
  });

  client.on('message', async (msg) => {
    try {
      await handleMessage(msg);
    } catch (err) {
      console.error('Error handling message:', err);
    }
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
      await client.sendMessage(msg.from, "Miss Astral does not even blink.\n\n...The void has closed its doors to you.");
    }
    return;
  }

  if (body === "!start" && user?.isRegistered) {
    return msg.reply("Your journey has already begun. You cannot start again.");
  }

  if (!user || !user.isRegistered) {
    if (body === "!start") {
      const sp = getRandomSpecies();
      const userData = {
        phoneId,
        name,
        species: sp.name,
        isRegistered: true,
        xp: 0,
        messages: 0,
        condition: "Healthy",
        rank: 8,
        inventory: []
      };
      if (!user) {
        user = await storage.createUser(userData);
      } else {
        user = await storage.updateUser(phoneId, userData);
      }
      
      if (!user) return msg.reply("An error occurred while starting your journey.");

      const welcome = `╭═══════════════════╮
   ✦┊【Ａｗａｋｅｎｉｎｇ】┊✦
╰═══════════════════╯
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Greetings, Cultivator!
  You have been summoned to the Astral Realm.
  I am Miss Astral, your guide to ascension.
  ✦ Species: ${sp.name}
  ✦ Rarity: ${sp.rarity}
  Your journey begins now.
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Use !scroll to view all commands
  Use !rules to see bot rules
╰══════════════════════╯`;
      const imgPath = path.join(process.cwd(), 'attached_assets', 'download_(17)_(1)_1771815300401.jpg');
      if (fs.existsSync(imgPath)) {
        try {
          const media = MessageMedia.fromFilePath(imgPath);
          await client.sendMessage(msg.from, media, { caption: welcome });
          return;
        } catch (err) {
          console.error("Failed to send welcome media:", err);
        }
      }
      return msg.reply(welcome);
    } else if (body.startsWith("!")) {
      return msg.reply("You must use !start first before starting your journey.");
    }
    return;
  }

  // XP Gain
  if (body.length >= 3 && !body.startsWith("!")) {
    let diseaseDrain = 0;
    if (user.disease && !user.isConstellation && !user.hasShadowVeil) {
      diseaseDrain = 100;
    }

    const rate = SPECIES_XP_RATES[user.species] || 5;
    const newXp = Math.max(0, user.xp + rate - diseaseDrain);
    const newMessages = (user.messages || 0) + 1;

    try {
      const oldRank = getRankForXp(user.xp);
      const newRank = getRankForXp(newXp);

      await storage.updateUser(phoneId, { 
        xp: newXp, 
        messages: newMessages,
        rank: newRank.level
      });

      if (newRank.level < oldRank.level) {
        const celebration = `╭══════════════════════╮
   🎊 RANK UP! 🎊
   ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
   👤 Cultivator: ${user.name}
   📈 New Rank: 【${newRank.level}】${newRank.name}
   ✨ Total XP: ${newXp}
   ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
   Your soul ascends further!
╰══════════════════════╯`;
        await client.sendMessage(msg.from, celebration);
      }
    } catch (err) {
      console.error("Failed to update user XP/messages:", err);
    }
  }

  if (body === "!scroll" || body === "!help" || body === "!menu") {
    return msg.reply(HELP_MENU);
  }

  if (body === "!rules") {
    const rules = `【Ａｓｔｒａｌ Ｌａｗｓ】
-------------------------
Heed these laws, Cultivator.
Violations shall not go unpunished. ⚡

▸ 1️⃣ No Spamming Commands
▸ 2️⃣ No Disrespect
▸ 3️⃣ No Bug Exploitation
▸ 4️⃣ No Begging
▸ 5️⃣ Respect Sect Leaders
▸ 6️⃣ No Alternate Accounts
▸ 7️⃣ Respect All Decisions

Break the laws. Face the consequences. ⚔️`;
    return msg.reply(rules);
  }

  if (body === "!status") {
    const currentRank = getRankForXp(user.xp);
    const status = `【Ｓｔａｔｕｓ】
-------------------------
▸ Rank: 【${currentRank.level}】${currentRank.name}
▸ XP: ${user.xp}
▸ Messages: ${user.messages}
▸ Condition: ${user.condition}`;
    return msg.reply(status);
  }

  if (body === "!profile") {
    const currentRank = getRankForXp(user.xp);
    const profile = `【Ｐｒｏｆｉｌｅ】
-------------------------
▸ Name: ${user.name}
▸ Sect: ${user.sectTag || "None"}
▸ Rank: 【${currentRank.level}】${currentRank.name}
▸ Species: ${user.species}`;
    return msg.reply(profile);
  }

  if (body === "!leaderboard") {
    const top = await storage.getUsers();
    const rank = top.findIndex(u => u.phoneId === phoneId) + 1;
    const list = top.slice(0, 10).map((u, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "✦";
      return `  ${medal} ${i + 1}. ${u.name} — ${u.xp} XP`;
    }).join("\n");
    const lb = `╭══════════════════════╮
   ✦┊【Ｔｏｐ Ｃｕｌｔｉｖａｔｏｒｓ】┊✦
╰══════════════════════╯
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
${list}
 ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  ❧ Your Rank: #${rank}
  ❧ Your XP: ${user.xp}
╰══════════════════════╯`;
    return msg.reply(lb);
  }

  if (body === "!getcard") {
    const now = new Date();
    if (user.lastCardClaim && (now.getTime() - new Date(user.lastCardClaim).getTime() < 86400000)) {
       return msg.reply("You have already claimed your card for today.");
    }
    
    try {
      const page = Math.floor(Math.random() * 50) + 1;
      const response = await fetch(`https://api.jikan.moe/v4/top/characters?page=${page}`);
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) throw new Error("API error");

      const char = data.data[Math.floor(Math.random() * data.data.length)];
      const rarityTiers = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
      const rarity = rarityTiers[Math.floor(Math.random() * rarityTiers.length)];
      const isBattleCard = Math.random() > 0.7 ? "Yes" : "No";
      const affiliation = char.about?.split('\n')[0].substring(0, 50) || "Unknown";
      const imageUrl = char.images?.jpg?.image_url || null;

      await storage.createCard({
        ownerPhoneId: phoneId,
        characterId: char.mal_id,
        name: char.name,
        series: affiliation,
        imageUrl: imageUrl,
        rarity: rarity
      });
      await storage.updateUser(phoneId, { lastCardClaim: now });
      
      let text = `✨ *New Card Claimed!* ✨\n▸ Name: ${char.name}\n▸ Tier: ${rarity}\n▸ Battle Card: ${isBattleCard}\n▸ Affiliation: ${affiliation}\n\nUse !cardcollection to see your deck!`;
      
      if (imageUrl) {
        try {
          const media = await MessageMedia.fromUrl(imageUrl);
          return client.sendMessage(msg.from, media, { caption: text });
        } catch (mediaErr) {
          console.error("Failed to fetch image media:", mediaErr);
          return msg.reply(text);
        }
      } else {
        return msg.reply(text);
      }
    } catch (err) {
      console.error("Error in !getcard:", err);
      return msg.reply("The stars are clouded. Try again later.");
    }
  }

  if (body.startsWith("!givecard ")) {
    try {
      const parts = body.split(" ");
      const cardNum = parseInt(parts[parts.length - 1]) - 1;
      
      if (!msg.hasQuotedMsg) return msg.reply("Reply to the user you want to give the card to.");

      const quotedMsg = await msg.getQuotedMessage();
      const recipientPhoneId = quotedMsg.author || quotedMsg.from;

      const cards = await storage.getUserCards(phoneId);
      if (isNaN(cardNum) || !cards[cardNum]) return msg.reply("Invalid card number.");

      const cardToGive = cards[cardNum];
      await storage.updateCard(cardToGive.id, { ownerPhoneId: recipientPhoneId });

      return msg.reply(`🤝 TRADE SUCCESSFUL\n\nYou gave ${cardToGive.name} to another cultivator.`);
    } catch (err) {
      console.error("Error in !givecard:", err);
      return msg.reply("Failed to give card.");
    }
  }

  if (body === "!cardcollection") {
    try {
      const cards = await storage.getUserCards(phoneId);
      if (cards.length === 0) return msg.reply("Your collection is empty.");
      const list = cards.map((c, i) => `${i + 1}. ${c.name} [${c.rarity}]`).join("\n");
      return msg.reply(`🎴 YOUR COLLECTION\n\n${list}`);
    } catch (err) {
      return msg.reply("Failed to fetch collection.");
    }
  }

  if (body.startsWith("!card ")) {
    try {
      const num = parseInt(body.split(" ")[1]) - 1;
      const cards = await storage.getUserCards(phoneId);
      if (cards[num]) {
        const c = cards[num];
        const media = await MessageMedia.fromUrl(c.imageUrl);
        return client.sendMessage(msg.from, media, { caption: `🎴 CARD INFO\n\nName: ${c.name}\nSeries: ${c.series}\nRarity: ${c.rarity}` });
      }
      return msg.reply("Invalid card number.");
    } catch (err) {
      return msg.reply("Failed to fetch card info.");
    }
  }

  if (body.startsWith("!createsect ")) {
    try {
      const sectName = body.replace("!createsect ", "").trim();
      if (!sectName) return msg.reply("Provide a sect name.");
      if (user.xp < 5000) return msg.reply(`⚠️ INSUFFICIENT XP (Need 5000, You have ${user.xp})`);
      if (user.sectId) return msg.reply("Leave your current sect first.");

      const sectsList = await storage.getSects();
      if (sectsList.length >= 3) return msg.reply("❌ SECT LIMIT REACHED (Max 3)");

      const tag = sectName.substring(0, 3).toUpperCase();
      const newSect = await storage.createSect({
        name: sectName,
        tag: tag,
        leaderPhoneId: phoneId,
        treasuryXp: 0,
        membersCount: 1,
        imageUrl: null
      });

      await storage.updateUser(phoneId, { xp: user.xp - 5000, sectId: newSect.id, sectTag: tag });
      return msg.reply(`🏯 SECT CREATED: ${sectName}\nFounder: ${user.name}\nRemaining XP: ${user.xp - 5000}`);
    } catch (err) {
      return msg.reply("Failed to create sect.");
    }
  }

  if (body.startsWith("!joinsect ")) {
    try {
      const sectName = body.replace("!joinsect ", "").trim();
      const sect = await storage.getSectByName(sectName);
      if (!sect) return msg.reply("❌ SECT NOT FOUND");
      if (user.sectId) return msg.reply("Leave your current sect first.");

      await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
      await storage.updateSect(sect.id, { membersCount: sect.membersCount + 1 });
      return msg.reply(`🚪 JOINED SECT: ${sect.name}`);
    } catch (err) {
      return msg.reply("Failed to join sect.");
    }
  }

  if (body === "!mysect") {
    if (!user.sectId) return msg.reply("❌ NO SECT");
    const sect = await storage.getSect(user.sectId);
    if (!sect) return;
    const leader = await storage.getUserByPhone(sect.leaderPhoneId);
    return msg.reply(`🏯 MY SECT\nName: ${sect.name}\nLeader: ${leader?.name || "Unknown"}\nMembers: ${sect.membersCount}\nXP: ${sect.treasuryXp}`);
  }

  if (body.startsWith("!donate ")) {
    if (!user.sectId) return msg.reply("❌ NO SECT");
    const amount = parseInt(body.replace("!donate ", "").trim());
    if (isNaN(amount) || amount <= 0 || user.xp < amount) return msg.reply("Invalid amount or insufficient XP.");
    
    await storage.updateUser(phoneId, { xp: user.xp - amount });
    await storage.updateSect(user.sectId, { treasuryXp: (await storage.getSect(user.sectId))!.treasuryXp + amount });
    return msg.reply(`💰 DONATED: ${amount} XP`);
  }

  if (body === "!sectranking") {
    const sectsList = await storage.getSects();
    const list = sectsList.map((s, i) => `${i + 1}. ${s.name} - ${s.treasuryXp} XP`).join("\n");
    return msg.reply(`📊 SECT LEADERBOARD\n\n${list || "No sects yet."}`);
  }

  if (body === "!sectleave") {
    if (!user.sectId) return msg.reply("❌ NO SECT");
    const sect = await storage.getSect(user.sectId);
    if (sect?.leaderPhoneId === phoneId) return msg.reply("❌ LEADERS CANNOT LEAVE");
    
    await storage.updateUser(phoneId, { sectId: null, sectTag: null });
    await storage.updateSect(sect!.id, { membersCount: sect!.membersCount - 1 });
    return msg.reply("🚶 LEFT SECT");
  }
}
