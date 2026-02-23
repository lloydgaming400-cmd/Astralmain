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

  // Handle unregistered users
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
      const welcome = `╭═══════════════════╮\n   ✦┊【Ａｗａｋｅｎｉｎｇ】┊✦\n╰═══════════════════╯\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Greetings, Cultivator!\n  You have been summoned to the Astral Realm.\n  I am Miss Astral, your guide to ascension.\n  ✦ Species: ${sp.name}\n  ✦ Rarity: ${sp.rarity}\n  Your journey begins now.\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Use !scroll to view all commands\n  Use !rules to see bot rules\n╰══════════════════════╯`;
      const imgPath = path.join(process.cwd(), 'attached_assets', 'download_(17)_(1)_1771813308970.jpg');
      if (fs.existsSync(imgPath)) {
        const media = MessageMedia.fromFilePath(imgPath);
        return client.sendMessage(msg.from, media, { caption: welcome });
      }
      return msg.reply(welcome);
    } else if (body.startsWith("!")) {
      return msg.reply("You must use !start first before starting your journey.");
    }
    return;
  }

  if (body === "!start" && user.isRegistered) {
    return msg.reply("Your journey has already begun. You cannot start again.");
  }

  // XP Gain
  if (body.length >= 3 && !body.startsWith("!")) {
    const rate = user.isConstellation ? 1000 : (user.dustDomainUntil && new Date() < new Date(user.dustDomainUntil) ? 500 : 5);
    await storage.updateUser(phoneId, { xp: user.xp + rate, messages: user.messages + 1 });
  }

  // Commands
  if (body === "!scroll" || body === "!help" || body === "!menu") {
    const imgPath = path.join(process.cwd(), 'attached_assets', 'ִֶָ_𓂃⊹_ִֶָ_vera_1771813308969.jpg');
    if (fs.existsSync(imgPath)) {
      const media = MessageMedia.fromFilePath(imgPath);
      return client.sendMessage(msg.from, media, { caption: HELP_MENU });
    }
    return msg.reply(HELP_MENU);
  }

  if (body === "!rules") {
    const rules = `【Ａｓｔｒａｌ Ｌａｗｓ】\n-------------------------\nHeed these laws, Cultivator.\nViolations shall not go unpunished. ⚡\n\n▸ 1️⃣ No Spamming Commands\n      ↳ Spam & you shall be silenced\n\n▸ 2️⃣ No Disrespect\n      ↳ Honour all cultivators\n\n▸ 3️⃣ No Bug Exploitation\n      ↳ Report bugs, never abuse them\n\n▸ 4️⃣ No Begging\n      ↳ Earn your cards & XP with honour\n\n▸ 5️⃣ Respect Sect Leaders\n      ↳ Their word is law within the sect\n\n▸ 6️⃣ No Alternate Accounts\n      ↳ One soul, one path\n\n▸ 7️⃣ Respect All Decisions\n      ↳ Admin rulings are final & absolute\n\nBreak the laws. Face the consequences. ⚔️`;
    return msg.reply(rules);
  }

  if (body === "!status") {
    const status = `【Ｓｔａｔｕｓ】\n-------------------------\n▸ Rank: 【${user.rank}】Novice\n▸ XP: ${user.xp}\n▸ Messages: ${user.messages}\n▸ Condition: ${user.condition}`;
    return msg.reply(status);
  }

  if (body === "!profile") {
    const profile = `【Ｐｒｏｆｉｌｅ】\n-------------------------\n▸ Name: ${user.name}\n▸ Sect: ${user.sectTag || "None"}\n▸ Rank: 【${user.rank}】Novice\n▸ Species: ${user.species}`;
    return msg.reply(profile);
  }

  if (body === "!leaderboard") {
    const top = await storage.getUsers();
    const rank = top.findIndex(u => u.phoneId === phoneId) + 1;
    const list = top.slice(0, 10).map((u, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "✦";
      return `  ${medal} ${i + 1}. ${u.name} — ${u.xp} XP`;
    }).join("\n");
    const lb = `╭══════════════════════╮\n   ✦┊【Ｔｏｐ Ｃｕｌｔｉｖａｔｏｒｓ】┊✦\n╰══════════════════════╯\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n${list}\n ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  ❧ Your Rank: #${rank}\n  ❧ Your XP: ${user.xp}\n  ❧ World Ranking: #${rank}\n╰══════════════════════╯`;
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
    const shop = `╭══════════════════════╮\n  🏪 SHOP\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  🩸 Blood Rune ↳ 1000 XP\n  Steal XP from another user.\n\n  🌑 Eclipse Stone ↳ 1200 XP\n  Hide your race & XP for 24hrs.\n\n  👻 Phantom Seal ↳ 1100 XP\n  Vanish from the leaderboard for 24hrs.\n\n  🪙 Cursed Coin ↳ 200 XP\n  Unknown outcome. Flip and find out.\n\n  🔮 Mirror Shard ↳ 1300 XP\n  Copy another user's race for 30mins.\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  💊 CURES\n  💉 Grey Rot Cure ↳ 500 XP\n  Cures the Grey Rot. (Human)\n\n  💉 Hellfire Suppressant ↳ 600 XP\n  Cures Hellfire Fever. (Demon)\n\n  💉 Feral Antidote ↳ 600 XP\n  Cures the Feral Plague. (Beast Clan)\n\n  💉 Grace Restoration Vial ↳ 700 XP\n  Cures Corruption Blight. (Fallen Angel)\n\n  💉 Scale Restoration Salve ↳ 800 XP\n  Cures Scale Sickness. (Dragon)\n\n  💉 Rootwither Remedy ↳ 700 XP\n  Cures Rootwither. (Elf)\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Use !buy [item name] to purchase\n╰══════════════════════╯`;
    return msg.reply(shop);
  }

  if (body.startsWith("!buy ")) {
    const itemName = body.replace("!buy ", "").trim();
    const item = SHOP_ITEMS[itemName];
    if (!item) return msg.reply("╭══════════════════════╮\n  ❌ ITEM NOT FOUND\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  That item does not exist in the shop.\n  Use !shop to see available items.\n╰══════════════════════╯");
    
    if (user.xp < item.price) {
      return msg.reply(`╭══════════════════════╮\n  ⚠️ INSUFFICIENT XP\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  👤 Cultivator: ${user.name}\n  🛍️ Item: ${itemName.toUpperCase()} ↳ ${item.price} XP\n  ✨ Your XP: ${user.xp} XP\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Keep chatting to earn more XP!\n╰══════════════════════╯`);
    }

    const inventory = (user.inventory as any[]) || [];
    if (inventory.includes(itemName)) {
      return msg.reply(`╭══════════════════════╮\n  ❌ ITEM ALREADY OWNED\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  👤 Cultivator: ${user.name}\n  🛍️ Item: ${itemName.toUpperCase()}\n  ⚠️ Use it before buying another.\n╰══════════════════════╯`);
    }

    const newInventory = [...inventory, itemName];
    const remainingXp = user.xp - item.price;
    await storage.updateUser(phoneId, { xp: remainingXp, inventory: newInventory });
    
    return msg.reply(`╭══════════════════════╮\n  ✅ PURCHASE SUCCESSFUL\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  👤 Cultivator: ${user.name}\n  🛍️ Item: ${itemName.toUpperCase()}\n  💰 Cost: ${item.price} XP\n  ✨ Remaining XP: ${remainingXp}\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Use !inventory to see your items\n╰══════════════════════╯`);
  }

  if (body === "!inventory") {
    const inventory = (user.inventory as any[]) || [];
    if (inventory.length === 0) {
      return msg.reply(`╭══════════════════════╮\n  🎒 INVENTORY\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  👤 Cultivator: ${user.name}\n  ❌ Your inventory is empty.\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Use !shop to browse items\n╰══════════════════════╯`);
    }
    const itemsList = inventory.map(item => `  🛍️ ${item.toUpperCase()} x1`).join("\n");
    return msg.reply(`╭══════════════════════╮\n  🎒 INVENTORY\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  👤 Cultivator: ${user.name}\n${itemsList}\n  ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n  Use !shop to browse items\n╰══════════════════════╯`);
  }
}
