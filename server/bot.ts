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

const SPECIES_WEIGHTS = [
  { name: "Human", weight: 55, rarity: "Common" },
  { name: "Demon", weight: 13, rarity: "Uncommon" },
  { name: "Beast Clan", weight: 7, rarity: "Uncommon" },
  { name: "Fallen Angel", weight: 5, rarity: "Rare" },
  { name: "Undead", weight: 5, rarity: "Rare" },
  { name: "Spirit", weight: 4, rarity: "Rare" },
  { name: "Elf", weight: 2, rarity: "Very Rare" },
  { name: "Dragon", weight: 2, rarity: "Very Rare" },
  { name: "Celestial", weight: 1, rarity: "Legendary" },
];

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
  const totalWeight = SPECIES_WEIGHTS.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (const s of SPECIES_WEIGHTS) {
    if (random < s.weight) return s;
    random -= s.weight;
  }
  return SPECIES_WEIGHTS[0];
}

async function getAnimeCard() {
  try {
    const page = Math.floor(Math.random() * 50) + 1;
    const response = await fetch(`https://api.jikan.moe/v4/top/characters?page=${page}`);
    const data = await response.json();
    const char = data.data[Math.floor(Math.random() * data.data.length)];
    const rarity = ["Common", "Uncommon", "Rare", "Epic", "Legendary"][Math.floor(Math.random() * 5)];
    return {
      name: char.name,
      image_url: char.images.jpg.image_url,
      series: char.about?.split('\n')[0].substring(0, 100) || "Unknown",
      rarity: rarity,
      character_id: char.mal_id
    };
  } catch (err) {
    console.error("Card API error:", err);
    return null;
  }
}

let client: Client;
let isInitializing = false;

export async function initBot() {
  if (isInitializing) return;
  isInitializing = true;
  const authPath = path.join(process.cwd(), '.wwebjs_auth');
  const cachePath = path.join(process.cwd(), '.wwebjs_cache');
  
  // Clean up old session if disconnected to force fresh login if requested
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
    // Don't auto-restart to allow manual intervention if glitched
    // setTimeout(() => initBot(), 5000);
  });

  client.on('message', async (msg) => {
    await handleMessage(msg);
  });

  client.initialize().catch(err => {
    console.error('Init failed:', err);
    connectionStatus = "DISCONNECTED";
  }).finally(() => {
    isInitializing = false;
    // If it failed due to profile lock, we might want to try one more time after a delay
    // but be careful of infinite loops.
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

  if (body === "!start" && user.isRegistered) {
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
        rank: 1,
        inventory: []
      };
      if (!user) {
        user = await storage.createUser(userData);
      } else {
        user = await storage.updateUser(phoneId, userData);
      }
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
    const now = new Date();
    const lastReset = user.lastMessageReset ? new Date(user.lastMessageReset) : new Date(0);
    
    // Reset daily count at midnight
    if (now.setHours(0,0,0,0) !== lastReset.setHours(0,0,0,0)) {
      await storage.updateUser(phoneId, { dailyMessageCount: 1, lastMessageReset: new Date() });
    } else {
      const newCount = (user.dailyMessageCount || 0) + 1;
      await storage.updateUser(phoneId, { dailyMessageCount: newCount });
      
      // Item Drop Logic
      if (newCount === 1100) {
        const inventory = (user.inventory as any[]) || [];
        const hasBone = inventory.some(i => i.name.toLowerCase() === "cursed bone");
        
        if (!hasBone && Math.random() < 0.65) {
          const newInv = [...inventory, { name: "Cursed Bone", quantity: 1 }];
          await storage.updateUser(phoneId, { inventory: newInv });
          await client.sendMessage(msg.from, "Something cold and wrong materializes near you.\n\n🦴 A Cursed Bone has appeared in your inventory.\nType !inventory to see your items.");
        }
      }
    }

    // diseaseDrain is used elsewhere in the XP logic, ensuring it's defined
    let diseaseDrain = 0;
    if (user.disease && !user.isConstellation && !user.hasShadowVeil) {
      diseaseDrain = 100;
    }

    const rate = user.isConstellation ? 1000 : (user.dustDomainUntil && new Date() < new Date(user.dustDomainUntil) ? 500 : 5);
    const newXp = Math.max(0, user.xp + rate - diseaseDrain);
    const newMessages = (user.messages || 0) + 1;

    try {
      await storage.updateUser(phoneId, { 
        xp: newXp, 
        messages: newMessages 
      });
    } catch (err) {
      console.error("Failed to update user XP/messages:", err);
    }

    // Random Outbreak Check
    if (Math.random() < 0.005) { // 0.5% chance per message to trigger outbreak check
      const stats = await storage.getGlobalStats();
      if (!stats.activeDisease) {
        const races = ["Human", "Demon", "Beast Clan", "Fallen Angel", "Dragon", "Elf"];
        const targetRace = races[Math.floor(Math.random() * races.length)];
        const diseaseNames: Record<string, string> = {
          "Human": "Grey Rot",
          "Demon": "Hellfire Fever",
          "Beast Clan": "Feral Plague",
          "Fallen Angel": "Corruption Blight",
          "Dragon": "Scale Sickness",
          "Elf": "Rootwither"
        };
        const diseaseName = diseaseNames[targetRace];
        
        await storage.updateGlobalStats({ 
          activeDisease: diseaseName, 
          diseaseRace: targetRace,
          lastOutbreakAt: new Date()
        });

        const announcement = `A sickness has infected the ${targetRace} race.\n${diseaseName} is spreading through their ranks.\n${targetRace}s are advised to avoid !leaderboard and !profile for the time being.\nEven the mightiest can be brought low.`;
        await client.sendMessage(msg.from, announcement);

        // Infect users of that race
        const allUsers = await storage.getUsers();
        for (const u of allUsers) {
          if (u.species === targetRace && !u.isConstellation && !u.hasShadowVeil) {
            await storage.updateUser(u.phoneId, { disease: diseaseName, infectedAt: new Date() });
          }
        }
      }
    }
  }

  if (body === "!scroll" || body === "!help" || body === "!menu") {
    const scroll = `╭══════════════════════╮
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
     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆𝖑 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼
╰══════════════════════╯`;
    const imgPath = path.join(process.cwd(), 'attached_assets', 'ִֶָ_𓂃⊹_ִֶָ_vera_1771815300400.jpg');
    if (fs.existsSync(imgPath)) {
      const media = MessageMedia.fromFilePath(imgPath);
      try {
        await client.sendMessage(msg.from, media, { caption: scroll });
        return;
      } catch (err) {
        console.error("Failed to send media scroll:", err);
      }
    }
    return msg.reply(scroll);
  }

  if (body === "!rules") {
    const rules = `【Ａｓｔｒａｌ Ｌａｗｓ】
-------------------------
Heed these laws, Cultivator.
Violations shall not go unpunished. ⚡

▸ 1️⃣ No Spamming Commands
      ↳ Spam & you shall be silenced

▸ 2️⃣ No Disrespect
      ↳ Honour all cultivators

▸ 3️⃣ No Bug Exploitation
      ↳ Report bugs, never abuse them

▸ 4️⃣ No Begging
      ↳ Earn your cards & XP with honour

▸ 5️⃣ Respect Sect Leaders
      ↳ Their word is law within the sect

▸ 6️⃣ No Alternate Accounts
      ↳ One soul, one path

▸ 7️⃣ Respect All Decisions
      ↳ Admin rulings are final & absolute

Break the laws. Face the consequences. ⚔️`;
    return msg.reply(rules);
  }

  if (body === "!status") {
    const status = `【Ｓｔａｔｕｓ】
-------------------------
▸ Rank: 【${user.rank}】Novice
▸ XP: ${user.xp}
▸ Messages: ${user.messages}
▸ Condition: ${user.condition}`;
    return msg.reply(status);
  }

  if (body === "!profile") {
    const profile = `【Ｐｒｏｆｉｌｅ】
-------------------------
▸ Name: ${user.name}
▸ Sect: ${user.sectTag || "None"}
▸ Rank: 【${user.rank}】Novice
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
  ❧ World Ranking: #${rank}
╰══════════════════════╯`;
    return msg.reply(lb);
  }

  if (body === "!getcard") {
    const now = new Date();
    if (user.lastCardClaim && (now.getTime() - new Date(user.lastCardClaim).getTime() < 86400000)) {
       return msg.reply("You have already claimed your card for today.");
    }
    const cardData = await getAnimeCard();
    if (!cardData) return msg.reply("The stars are clouded. Try again later.");
    
    await storage.createCard({
      ownerPhoneId: phoneId,
      ...cardData,
      characterId: cardData.character_id
    });
    await storage.updateUser(phoneId, { lastCardClaim: now });
    
    const media = await MessageMedia.fromUrl(cardData.image_url);
    const text = `✨ *New Card Claimed!* ✨\n▸ Name: ${cardData.name}\n▸ Tier: ${cardData.rarity}\n▸ Battle Card: No\n▸ Affiliation: ${cardData.series}\n\nUse !cardcollection to see your deck!`;
    return client.sendMessage(msg.from, media, { caption: text });
  }

  if (body === "!cardcollection") {
    const cards = await storage.getUserCards(phoneId);
    if (cards.length === 0) return msg.reply("Your collection is empty.");
    const list = cards.map((c, i) => `${i + 1}. ${c.name} [${c.rarity}]`).join("\n");
    return msg.reply(`🎴 YOUR COLLECTION\n\n${list}`);
  }

  if (body.startsWith("!card ")) {
    const num = parseInt(body.split(" ")[1]) - 1;
    const cards = await storage.getUserCards(phoneId);
    if (cards[num]) {
      const c = cards[num];
      const media = await MessageMedia.fromUrl(c.imageUrl);
      return client.sendMessage(msg.from, media, { caption: `🎴 CARD INFO\n\nName: ${c.name}\nSeries: ${c.series}\nRarity: ${c.rarity}` });
    }
    return msg.reply("Invalid card number.");
  }

  if (body === "!shop") {
    const shop = `╭══════════════════════╮
  🏪 SHOP
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🩸 Blood Rune ↳ 1000 XP
  Steal XP from another user.

  🌑 Eclipse Stone ↳ 1200 XP
  Hide your race & XP for 24hrs.

  👻 Phantom Seal ↳ 1100 XP
  Vanish from the leaderboard for 24hrs.

  🪙 Cursed Coin ↳ 200 XP
  Unknown outcome. Flip and find out.

  🔮 Mirror Shard ↳ 1300 XP
  Copy another user's race for 30mins.
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  💊 CURES
  💉 Grey Rot Cure ↳ 500 XP
  Cures the Grey Rot. (Human)

  💉 Hellfire Suppressant ↳ 600 XP
  Cures Hellfire Fever. (Demon)

  💉 Feral Antidote ↳ 600 XP
  Cures the Feral Plague. (Beast Clan)

  💉 Grace Restoration Vial ↳ 700 XP
  Cures Corruption Blight. (Fallen Angel)

  💉 Scale Restoration Salve ↳ 800 XP
  Cures Scale Sickness. (Dragon)

  💉 Rootwither Remedy ↳ 700 XP
  Cures Rootwither. (Elf)
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Use !buy [item name] to purchase
╰══════════════════════╯`;
    return msg.reply(shop);
  }

  if (body.startsWith("!buy")) {
    const itemName = body.replace("!buy", "").trim();
    if (!itemName) {
      return msg.reply(`╭══════════════════════╮
  ⚠️ MISSING ITEM NAME
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Type !buy followed by an item name.
  Example: !buy Cursed Coin
╰══════════════════════╯`);
    }

    const item = SHOP_ITEMS[itemName];
    if (!item) {
      return msg.reply(`╭══════════════════════╮
  ❌ ITEM NOT FOUND
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  That item does not exist in the shop.
  Use !shop to see available items.
╰══════════════════════╯`);
    }

    if (user.xp < item.price) {
      return msg.reply(`╭══════════════════════╮
  ⚠️ INSUFFICIENT XP
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
  🛍️ Item: ${itemName.toUpperCase()} ↳ ${item.price} XP
  ✨ Your XP: ${user.xp} XP
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Keep chatting to earn more XP!
╰══════════════════════╯`);
    }

    const inventory = (user.inventory as any[]) || [];
    if (inventory.some(i => i.name.toLowerCase() === itemName.toLowerCase())) {
      return msg.reply(`╭══════════════════════╮
  ❌ ITEM ALREADY OWNED
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
  🛍️ Item: ${itemName.toUpperCase()}
  ⚠️ Use it before buying another.
╰══════════════════════╯`);
    }

    const newInventory = [...inventory, { name: itemName, quantity: 1 }];
    const remainingXp = user.xp - item.price;
    await storage.updateUser(phoneId, { xp: remainingXp, inventory: newInventory });
    
    let useMessage = "";
    if (itemName.toLowerCase() === "vampire tooth") {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      await storage.updateUser(phoneId, { isVampire: true, vampireUntil: expiry });
      useMessage = `\n\n🦷 You are now a Vampire.\nUse !suck @user to feed.\nYour thirst lasts for one week.\nExpires: ${expiry.toDateString()}`;
    } else if (itemName.toLowerCase() === "cursed bone") {
      await storage.updateUser(phoneId, { hasShadowVeil: true });
      useMessage = `\n\n🦴 Shadow Veil active.\nYou are now protected from all races diseases and plagues.\nThe shadows walk with you.`;
    } else if (itemName.toLowerCase().includes("cure") || itemName.toLowerCase().includes("suppressant") || itemName.toLowerCase().includes("antidote") || itemName.toLowerCase().includes("vial") || itemName.toLowerCase().includes("salve") || itemName.toLowerCase().includes("remedy")) {
      const cures: Record<string, string> = {
        "grey rot cure": "Grey Rot",
        "hellfire suppressant": "Hellfire Fever",
        "feral antidote": "Feral Plague",
        "grace restoration vial": "Corruption Blight",
        "scale restoration salve": "Scale Sickness",
        "rootwither remedy": "Rootwither"
      };
      const diseaseForCure = cures[itemName.toLowerCase()];
      if (user.disease === diseaseForCure) {
        await storage.updateUser(phoneId, { disease: null, condition: "Healthy" });
        useMessage = `\n\nThe sickness retreats. Your strength returns.\n\n💊 You have been cured of ${diseaseForCure}.\nYour XP drain has stopped.\nCurrent XP: ${remainingXp}`;
      } else if (!user.disease) {
        useMessage = `\n\nYou are not infected. Save it for when you need it.`;
      } else {
        useMessage = `\n\nThis cure was not made for you.\nIt has no effect.`;
      }
    }

    return msg.reply(`╭══════════════════════╮
  ✅ PURCHASE SUCCESSFUL
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
  🛍️ Item: ${itemName.toUpperCase()}
  💰 Cost: ${item.price} XP
  ✨ Remaining XP: ${remainingXp}
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Use !inventory to see your items${useMessage}
╰══════════════════════╯`);
  }

  if (body.startsWith("!suck ") && user.isVampire) {
    if (user.vampireUntil && new Date() > new Date(user.vampireUntil)) {
      await storage.updateUser(phoneId, { isVampire: false });
      return msg.reply("Your fangs are gone. The hunger has passed.\nYou are no longer a Vampire.");
    }

    const mentions = await msg.getMentions();
    if (mentions.length === 0) return msg.reply("You must mention a user to feed.");
    const targetContact = mentions[0];
    const targetPhoneId = targetContact.id._serialized;
    const target = await storage.getUserByPhone(targetPhoneId);

    if (!target) return msg.reply("That soul does not exist in this realm.");
    
    if (target.xp > user.xp * 1.5) {
      return msg.reply(`Your prey senses you coming.\nTheir power repels you.\n\n🦷 @${targetContact.pushname || targetContact.number} resisted your suck.\nThey are too powerful for you right now.`);
    }

    const amount = Math.floor(Math.random() * 200) + 50;
    await storage.updateUser(targetPhoneId, { xp: Math.max(0, target.xp - amount) });
    await storage.updateUser(phoneId, { xp: user.xp + amount, lastSuckAt: new Date() });

    await client.sendMessage(targetPhoneId, `Something cold grips you in the dark.\nYou lost ${amount} XP to an unknown force.\nRemaining XP: ${Math.max(0, target.xp - amount)}`);
    return msg.reply(`You sink into the shadows and feed.\n\n🦷 You drained ${amount} XP from @${targetContact.pushname || targetContact.number}.\nYour XP: ${user.xp + amount}`);
  }

  if (body === "!inventory") {
    const inventory = (user.inventory as any[]) || [];
    if (inventory.length === 0) {
      return msg.reply(`╭══════════════════════╮
  🎒 INVENTORY
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
  ❌ Your inventory is empty.
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Use !shop to browse items
╰══════════════════════╯`);
    }
    const itemsList = inventory.map(item => `  🛍️ ${item.name.toUpperCase()} x${item.quantity}`).join("\n");
    return msg.reply(`╭══════════════════════╮
  🎒 INVENTORY
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
${itemsList}
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Use !shop to browse items
╰══════════════════════╯`);
  }

  if (body.startsWith("!joinsect ")) {
    const sectName = body.replace("!joinsect ", "").trim();
    if (user.sectId) {
      const currentSect = await storage.getSect(user.sectId);
      return msg.reply(`╭══════════════════════╮
  ❌ ALREADY IN A SECT
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
  🏯 Current Sect: ${currentSect?.name || "Unknown"}
  ⚠️ Leave your sect first to join another.
  Use !sectleave to leave.
╰══════════════════════╯`);
    }

    const sect = await storage.getSectByName(sectName);
    if (!sect) {
      return msg.reply(`╭══════════════════════╮
  ❌ SECT NOT FOUND
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  That sect does not exist.
  Use !sectranking to see all sects.
╰══════════════════════╯`);
    }

    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await storage.updateSect(sect.id, { membersCount: sect.membersCount + 1 });

    return msg.reply(`╭══════════════════════╮
  🚪 SECT JOINED
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
  🏯 Sect: ${sect.name}
  ✅ Welcome to the sect!
╰══════════════════════╯`);
  }

  if (body.startsWith("!createsect ")) {
    const sectName = body.replace("!createsect ", "").trim();
    if (user.sectId) {
      const currentSect = await storage.getSect(user.sectId);
      return msg.reply(`╭══════════════════════╮
  ❌ ALREADY IN A SECT
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
  🏯 Current Sect: ${currentSect?.name || "Unknown"}
  ⚠️ Leave your sect before creating a new one.
  Use !sectleave to leave.
╰══════════════════════╯`);
    }

    const sects = await storage.getSects();
    if (sects.length >= 3) {
      return msg.reply(`╭══════════════════════╮
  ❌ SECT LIMIT REACHED
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  The maximum of 3 sects have been created.
  No new sects can be formed.
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Use !sectranking to see all sects
  and !joinsect [name] to join one.
╰══════════════════════╯`);
    }

    if (user.xp < 5000) {
      return msg.reply(`╭══════════════════════╮
  ⚠️ INSUFFICIENT XP
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Cultivator: ${user.name}
  💰 Required: 5000 XP
  ✨ Your XP: ${user.xp} XP
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  Keep chatting to earn more XP!
╰══════════════════════╯`);
    }

    const tag = sectName.substring(0, 3).toUpperCase();
    const newSect = await storage.createSect({
      name: sectName,
      tag: tag,
      leaderPhoneId: phoneId,
      membersCount: 1,
      treasuryXp: 0
    });

    const remainingXp = user.xp - 5000;
    await storage.updateUser(phoneId, { xp: remainingXp, sectId: newSect.id, sectTag: tag });

    return msg.reply(`╭══════════════════════╮
  🏯 SECT CREATED
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  👤 Founder: ${user.name}
  🏯 Sect: ${sectName}
  💰 Cost: 5000 XP
  ✨ Remaining XP: ${remainingXp}
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  You are now the sect leader!
╰══════════════════════╯`);
  }

  if (body === "!mysect") {
    if (!user.sectId) return msg.reply("You are not in a sect.");
    const sect = await storage.getSect(user.sectId);
    if (!sect) return msg.reply("Sect details not found.");
    return msg.reply(`╭══════════════════════╮
  🏯 MY SECT
  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷
  🏯 Sect: ${sect.name}
  🏷️ Tag: ${sect.tag}
  👑 Leader: ${sect.leaderPhoneId === phoneId ? "You" : sect.leaderPhoneId}
  👥 Members: ${sect.membersCount}
  💰 Treasury: ${sect.treasuryXp} XP
╰══════════════════════╯`);
  }

  if (body.startsWith("!givecard ") && msg.hasQuotedMsg) {
    const quotedMsg = await msg.getQuotedMessage();
    const receiverPhoneId = quotedMsg.from;
    const num = parseInt(body.replace("!givecard ", "").trim()) - 1;
    const cards = await storage.getUserCards(phoneId);
    
    if (cards[num]) {
      const card = cards[num];
      await storage.deleteCard(card.id);
      await storage.createCard({
        ...card,
        id: undefined as any,
        ownerPhoneId: receiverPhoneId
      });
      return msg.reply(`🤝 You have given ${card.name} to the recipient.`);
    }
    return msg.reply("Invalid card number.");
  }
}
