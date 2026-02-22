import pkg, { type Message, type Chat, type Contact } from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { storage } from './storage';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, sects, cards, type User } from '@shared/schema';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export let currentQrCode: string | undefined;
export let connectionStatus: "CONNECTED" | "DISCONNECTED" | "WAITING_FOR_QR" = "DISCONNECTED";

const RANKS = [
  { xp: 50000, name: "【1】True Peak Dao of Astral Realm" },
  { xp: 35000, name: "【2】Supreme Dao Ancestor" },
  { xp: 20000, name: "【3】Dao of Heavenly Peak" },
  { xp: 10000, name: "【4】Celestial Lord" },
  { xp: 2000,  name: "【5】Core Disciple of Peak" },
  { xp: 500,   name: "【6】Inner Disciple of Mid Peak" },
  { xp: 100,   name: "【7】Outer Disciple of Low Peak" },
  { xp: 0,     name: "【8】Core Disciple of Mid" }
];

function getRank(xp: number) {
  for (const rank of RANKS) {
    if (xp >= rank.xp) return rank.name;
  }
  return RANKS[RANKS.length - 1].name;
}

let client: Client;
let isInitializing = false;

export async function initBot() {
  if (isInitializing) return;
  isInitializing = true;

  if (client) {
    try {
      await client.destroy();
    } catch(e) {}
  }

  connectionStatus = "DISCONNECTED";
  currentQrCode = undefined;
  
    const authPath = path.join(process.cwd(), '.wwebjs_auth');
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to clear auth path:', e);
      }
    }
    fs.mkdirSync(authPath, { recursive: true });

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: authPath
    }),
    puppeteer: {
      executablePath: execSync('which chromium').toString().trim(),
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process'
      ]
    }
  }) as any;

  client.on('qr', (qr: string) => {
    currentQrCode = qr;
    connectionStatus = "WAITING_FOR_QR";
    console.log('SCAN THIS QR CODE TO CONNECT:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('Client is ready!');
    currentQrCode = undefined;
    connectionStatus = "CONNECTED";
  });

  client.on('authenticated', () => {
    console.log('Authenticated!');
  });

  client.on('auth_failure', (msg: string) => {
    console.error('Authentication failure', msg);
    connectionStatus = "DISCONNECTED";
    currentQrCode = undefined;
    setTimeout(initBot, 5000);
  });

    client.on('disconnected', async (reason: string) => {
      console.log('Client was disconnected', reason);
      connectionStatus = "DISCONNECTED";
      currentQrCode = undefined;
      
      try {
        await client.destroy();
      } catch (e) {}

      console.log('Reinitializing client...');
      setTimeout(initBot, 2000);
    });

  client.on('message', async (msg: any) => {
    try {
      await handleMessage(msg);
    } catch (err) {
      console.error('Error in message handler:', err);
    }
  });

  client.on('group_join', async (notification: any) => {
    try {
      const groupChat = await notification.getChat();
      for (const participant of notification.recipientIds) {
        await groupChat.sendMessage(`Welcome to the Sect, Cultivator! You start as a 【8】Core Disciple of Mid. Send messages to earn XP and ascend!`);
      }
    } catch(err) {
      console.error(err);
    }
  });

  client.initialize()
    .then(() => {
      isInitializing = false;
    })
    .catch(err => {
      console.error('Failed to initialize client:', err);
      connectionStatus = "DISCONNECTED";
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

const punishments: Record<string, number> = {};

async function handleMessage(msg: Message) {
  try {
    const chat = await msg.getChat();
    if (!chat.isGroup) return;

    const contact = await msg.getContact();
    const phoneId = contact.id._serialized;
    const name = contact.pushname || contact.number;

    let user = await storage.getUserByPhone(phoneId);
    const isNew = !user;
    
    if (!user) {
      user = await storage.createUser({
        phoneId,
        name,
        xp: 0,
        messages: 0,
        sectId: null,
        sectTag: null,
        species: "Human",
        lastCardClaim: null
      });
    } else {
      const update: Partial<User> = {};
      if (user.name !== name) update.name = name;
      update.messages = (user.messages || 0) + 1;
      user = await storage.updateUser(phoneId, update);
    }

    const oldRank = getRank(user.xp);
    
    let newXp = user.xp;
    const now = Date.now();
    const isPunished = punishments[phoneId] && punishments[phoneId] > now;
    
    if (!isPunished && user.messages > 0) {
      const xpGain = user.sectId ? 10 : 5;
      newXp = user.xp + xpGain;
      user = await storage.updateUser(phoneId, { xp: newXp });
    }

    const newRank = getRank(newXp);

    if (oldRank !== newRank && !isNew && !isPunished) {
      let nextReq = "MAX RANK";
      for (let i = RANKS.length - 1; i >= 0; i--) {
        if (RANKS[i].xp > newXp) {
          nextReq = RANKS[i].xp.toString();
          break;
        }
      }
      
      await chat.sendMessage(
        `🎉 Congratulations @${contact.id.user}!\n\n` +
        `You ascended from ${oldRank} to ${newRank}!\n` +
        `Current XP: ${newXp}\n` +
        `Next Rank at: ${nextReq} XP`,
        { mentions: [contact as any] }
      );
    }

    const body = msg.body.trim();
    if (body.startsWith('!')) {
      const args = body.split(' ');
      const cmd = args[0].toLowerCase();
      
      if (cmd === '!start') {
        const speciesOptions = [
          { name: "Human", weight: 65, rarity: "Common" },
          { name: "Demon", weight: 15, rarity: "Uncommon" },
          { name: "Beast Clan", weight: 8, rarity: "Rare" },
          { name: "Fallen Angel", weight: 6, rarity: "Epic" },
          { name: "Dragon", weight: 3, rarity: "Legendary" },
          { name: "Elf", weight: 3, rarity: "Legendary" }
        ];

        let random = Math.random() * 100;
        let selectedSpecies = speciesOptions[0];
        let sum = 0;
        for (const s of speciesOptions) {
          sum += s.weight;
          if (random <= sum) {
            selectedSpecies = s;
            break;
          }
        }

        if (!user || user.messages === 0) {
          user = await storage.createUser({
            phoneId,
            name,
            xp: 0,
            messages: 2,
            sectId: null,
            sectTag: null,
            species: selectedSpecies.name,
            lastCardClaim: null
          });
        } else {
          user = await storage.updateUser(phoneId, { 
            species: selectedSpecies.name,
            messages: user.messages + 1
          });
        }

        const text = `╭══════════════════════╮\n` +
                 `   ✦┊【Ａｗａｋｅｎｉｎｇ】┊✦\n` +
                 `╰══════════════════════╯\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n\n` +
                 `  Greetings, Cultivator!\n\n` +
                 `  You have been summoned to the Astral Realm.\n` +
                 `  I am Miss Astral, your guide to ascension.\n\n` +
                 `  ✦ Species: ${user.species}\n` +
                 `  ✦ Rarity: ${selectedSpecies.rarity}\n\n` +
                 `  Your journey begins now.\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  Use !scroll to view all commands\n` +
                 `╰══════════════════════╯`;
        
        try {
          const media = await pkg.MessageMedia.fromFilePath('client/public/assets/start.jpg');
          await client.sendMessage(msg.from, media, { caption: text });
        } catch (e) {
          console.error('Failed to send media:', e);
          await msg.reply(text);
        }
        return;
      }

      if (!user || user.messages === 0) {
        return msg.reply("You must use !start to awaken and register before using any other commands!");
      }

      await handleCommands(msg, body, user, chat, contact);
    }
  } catch (err) {
    console.error('Error handling message:', err);
  }
}

async function fetchRandomCharacter() {
  const rarities = [
    { tier: 'D', chance: 40 },
    { tier: 'C', chance: 30 },
    { tier: 'B', chance: 15 },
    { tier: 'A', chance: 10 },
    { tier: 'S', chance: 5 }
  ];
  
  const random = Math.random() * 100;
  let tier = 'D';
  let sum = 0;
  for (const r of rarities) {
    sum += r.chance;
    if (random <= sum) {
      tier = r.tier;
      break;
    }
  }

  // Use Jikan API (MyAnimeList) for characters as it's free and reliable
  // We'll pick a random ID range for variety
  const randomPage = Math.floor(Math.random() * 50) + 1;
  const response = await fetch(`https://api.jikan.moe/v4/top/characters?page=${randomPage}`);
  const data = await response.json();
  const characters = data.data;
  const character = characters[Math.floor(Math.random() * characters.length)];
  
  return {
    characterId: character.mal_id,
    name: character.name,
    series: character.about?.split('\n')[0] || "Unknown Anime",
    imageUrl: character.images.jpg.image_url,
    rarity: tier
  };
}

const SHOP_ITEMS = [
  { name: "Blood Rune", price: 1000, description: "Steal XP from another user." },
  { name: "Eclipse Stone", price: 1200, description: "Hide your race and XP from everyone for 24 hours." },
  { name: "Phantom Seal", price: 1100, description: "Vanish from the leaderboard for 24 hours." },
  { name: "Cursed Coin", price: 200, description: "Unknown outcome. Flip and find out." },
  { name: "Mirror Shard", price: 1300, description: "Copy another user's race for 30 minutes." }
];

async function handleCommands(msg: Message, body: string, user: User, chat: Chat, contact: Contact) {
  const args = body.split(' ');
  const cmd = args[0].toLowerCase();
  const phoneId = user.phoneId;

  if (cmd === '!shop') {
    let text = `🏪 *Shop*\n\n`;
    SHOP_ITEMS.forEach(item => {
      text += `*${item.name}* — ${item.price} XP\n${item.description}\n\n`;
    });
    text += `Type !buy [item name] to purchase.`;
    await msg.reply(text);
  }
  else if (cmd === '!buy') {
    const itemName = args.slice(1).join(' ').trim();
    if (!itemName) return msg.reply("Type !buy followed by an item name. Example: !buy Cursed Coin");

    if (itemName.toLowerCase() === "living core") {
      return msg.reply("❌ The Living Core is not for sale. It cannot be bought.");
    }

    const item = SHOP_ITEMS.find(i => i.name.toLowerCase() === itemName.toLowerCase());
    if (!item) return msg.reply("❌ That item does not exist in the shop. Type !shop to see available items.");

    const inventory = user.inventory || [];
    if (inventory.some(i => i.toLowerCase() === itemName.toLowerCase())) {
      return msg.reply(`❌ You already own a ${item.name}. Use it before buying another.`);
    }

    if (user.xp < item.price) {
      return msg.reply(`⚠️ *Insufficient XP*\n\nYou do not have enough XP to purchase ${item.name}.\n\n${item.name} — ${item.price} XP\nYour XP — ${user.xp} XP\n\nEarn more XP by chatting and come back.`);
    }

    const updatedUser = await storage.updateUser(phoneId, {
      xp: user.xp - item.price,
      inventory: [...inventory, item.name]
    });

    await msg.reply(`✅ *Purchase Successful*\n\nYou bought a ${item.name}.\nIt has been added to your inventory.\n\nRemaining XP: ${updatedUser.xp}\n\nType !inventory to see your items.`);
  }
  else if (cmd === '!inventory') {
    const inventory = user.inventory || [];
    if (inventory.length === 0) return msg.reply("Your inventory is empty!");
    
    let text = `🎒 *Your Inventory*\n\n`;
    inventory.forEach((item, i) => {
      text += `${i + 1}. ${item}\n`;
    });
    await msg.reply(text);
  }
  else if (cmd === '!rank') {
    const text = `【﻿Ｓｔａｔｕｓ】\n` +
                 `-------------------------\n` +
                 `▸ Rank: ${getRank(user.xp)}\n` +
                 `▸ XP: ${user.xp}\n` +
                 `▸ Messages: ${user.messages}`;
    await msg.reply(text);
  }
  else if (cmd === '!getcard') {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (user.lastCardClaim && (now - new Date(user.lastCardClaim).getTime() < oneDay)) {
      const timeLeft = oneDay - (now - new Date(user.lastCardClaim).getTime());
      const hours = Math.floor(timeLeft / (60 * 60 * 1000));
      const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
      return msg.reply(`You must wait ${hours}h ${minutes}m before claiming another card!`);
    }

    try {
      const char = await fetchRandomCharacter();
      await storage.createCard({
        ownerPhoneId: phoneId,
        characterId: char.characterId,
        name: char.name,
        series: char.series,
        imageUrl: char.imageUrl,
        rarity: char.rarity
      });
      await storage.updateUser(phoneId, { lastCardClaim: new Date() });

      const text = `╭══════════════════════╮\n` +
                   `   ✦┊【Ｎｅｗ Ｃｈａｒａｃｔｅｒ】┊✦\n` +
                   `╰══════════════════════╯\n` +
                   `  ▸ Name: ${char.name}\n` +
                   `  ▸ Series: ${char.series}\n` +
                   `  ▸ Tier: ${char.rarity}\n` +
                   `╰══════════════════════╯`;
      
      const media = await pkg.MessageMedia.fromUrl(char.imageUrl);
      await client.sendMessage(msg.from, media, { caption: text });
    } catch (e) {
      console.error(e);
      await msg.reply("Failed to summon a character. Try again later!");
    }
  }
  else if (cmd === '!cardcollection') {
    const userCards = await storage.getCardsByOwner(phoneId);
    if (userCards.length === 0) return msg.reply("Your collection is empty! Use !getcard to start.");
    
    let text = `╭══════════════════════╮\n` +
               `   ✦┊【Ｃｏｌｌｅｃｔｉｏｎ】┊✦\n` +
               `╰══════════════════════╯\n`;
    userCards.forEach((c, i) => {
      text += `  ${i + 1}. [${c.rarity}] ${c.name}\n`;
    });
    text += `╰══════════════════════╯\n` +
            `Use !card [number] to view a character!`;
    await msg.reply(text);
  }
  else if (cmd === '!card') {
    const index = parseInt(args[1]) - 1;
    const userCards = await storage.getCardsByOwner(phoneId);
    if (isNaN(index) || index < 0 || index >= userCards.length) {
      return msg.reply("Invalid card number!");
    }
    
    const card = userCards[index];
    const text = `╭══════════════════════╮\n` +
                 `   ✦┊【Ｃｈａｒａｃｔｅｒ】┊✦\n` +
                 `╰══════════════════════╯\n` +
                 `  ▸ Name: ${card.name}\n` +
                 `  ▸ Series: ${card.series}\n` +
                 `  ▸ Tier: ${card.rarity}\n` +
                 `╰══════════════════════╯`;
    
    try {
      const media = await pkg.MessageMedia.fromUrl(card.imageUrl);
      await client.sendMessage(msg.from, media, { caption: text });
    } catch (e) {
      await msg.reply(text + `\n(Image failed to load: ${card.imageUrl})`);
    }
  }
  else if (cmd === '!stats') {
    let sectMemberCount = 0;
    if (user.sectId) {
      const sect = await storage.getSectById(user.sectId);
      sectMemberCount = sect?.membersCount || 0;
    }
    const allUsers = await storage.getUsers();
    const speciesMemberCount = allUsers.filter(u => u.species === user.species).length;

    const text = `【Ｓｔａｔｕｓ】\n` +
                 `-------------------------\n` +
                 `▸ Rank: ${getRank(user.xp)}\n` +
                 `▸ XP: ${user.xp}\n` +
                 `▸ Messages: ${user.messages}\n` +
                 `▸ Sect Members: ${sectMemberCount}\n` +
                 `▸ Species Members: ${speciesMemberCount}`;
    await msg.reply(text);
  }
  else if (cmd === '!profile') {
    const sectName = user.sectId ? (await storage.getSectById(user.sectId))?.name || "None" : "None";
    const text = `【Ｐｒｏｆｉｌｅ】\n` +
                 `-------------------------\n` +
                 `▸ Name: ${user.name}\n` +
                 `▸ Sect: ${sectName}\n` +
                 `▸ Rank: ${getRank(user.xp)}\n` +
                 `▸ Species: ${user.species}`;
    await msg.reply(text);
  }
  else if (cmd === '!leaderboard') {
    const usersList = await storage.getUsers();
    let text = "╭══════════════════════╮\n" +
               "   ✦┊【Ｔｏｐ Ｃｕｌｔｉｖａｔｏｒｓ】┊✦\n" +
               "╰══════════════════════╯\n" +
               " ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n";
    
    const medals = ["🥇", "🥈", "🥉"];
    for(let i=0; i < Math.min(10, usersList.length); i++) {
      const prefix = i < 3 ? medals[i] : "✦ ";
      text += `  ${prefix} ${i+1}. ${usersList[i].name} — ${usersList[i].xp} XP\n`;
    }
    
    const userRank = usersList.findIndex(u => u.phoneId === phoneId) + 1;
    text += " ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n" +
            `  ❧ Your Rank: #${userRank}\n` +
            `  ❧ Your XP: ${user.xp}\n` +
            "╰══════════════════════╯";
    await msg.reply(text);
  }
  else if (cmd === '!help') {
    const text = `【Ａｓｔｒａｌ Ｂｏｔ】\n` +
                 `-------------------------\n` +
                 `Greetings, Cultivator! ✨\n\n` +
                 `Astral Bot is your path to ascension —\n` +
                 `climb the ranks and forge your legacy in the realm.\n\n` +
                 `▸ 🏅 Rank up & gain glory\n` +
                 `▸ ⚔️ Join a sect & conquer\n` +
                 `▸ 📜 Respect the sacred laws\n\n` +
                 `-------------------------\n` +
                 `▸ !rules — view the sacred laws\n` +
                 `▸ !scroll — view all commands`;
    
    try {
      const media = await pkg.MessageMedia.fromFilePath('client/public/assets/help.jpg');
      await client.sendMessage(msg.from, media, { caption: text });
    } catch (e) {
      await msg.reply(text);
    }
  }
  else if (cmd === '!rules') {
    const text = `【Ａｓｔｒａｌ Ｌａｗｓ】\n` +
                 `-------------------------\n` +
                 `Heed these laws, Cultivator.\n` +
                 `Violations shall not go unpunished. ⚡\n\n` +
                 `▸ 1️⃣ No Spamming Commands\n` +
                 `▸ 2️⃣ No Disrespect\n` +
                 `▸ 3️⃣ No Bug Exploitation\n` +
                 `▸ 4️⃣ No Begging\n` +
                 `▸ 5️⃣ Respect Sect Leaders\n` +
                 `▸ 6️⃣ No Alternate Accounts\n` +
                 `▸ 7️⃣ Respect All Decisions\n\n` +
                 `Break the laws. Face the consequences. ⚔️`;
    await msg.reply(text);
  }
  else if (cmd === '!scroll') {
    const text = `╭══════════════════════╮\n` +
                 `   ✦┊【Ａｗａｋｅｎｉｎｇ】┊✦\n` +
                 `╰══════════════════════╯\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  📊 PROFILE & STATS\n` +
                 `  🏅 !rank ↳ check your rank\n` +
                 `  📈 !stats ↳ view your stats\n` +
                 `  👤 !profile ↳ view your profile\n` +
                 `  🏆 !leaderboard ↳ top cultivators\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  🛒 SHOP & ITEMS\n` +
                 `  🏪 !shop ↳ view shop\n` +
                 `  🛍️ !buy [item] ↳ purchase item\n` +
                 `  🎒 !inventory ↳ view items\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  🎴 CARDS\n` +
                 `  🎁 !getcard ↳ daily claim\n` +
                 `  📚 !cardcollection ↳ view cards\n` +
                 `  🔍 !card [num] ↳ view card info\n` +
                 `  🤝 !givecard @user [num] ↳ trade card\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  🏯 SECT\n` +
                 `  🚪 !joinsect [name] ↳ join a sect\n` +
                 `  🏯 !mysect ↳ view sect details\n` +
                 `  💰 !donate [amount] ↳ donate XP\n` +
                 `  📊 !sectranking ↳ sect leaderboard\n` +
                 `  🚶 !sectleave ↳ leave your sect\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  👑 LEADER ONLY\n` +
                 `  🖼️ !setsectpfp ↳ set sect image\n` +
                 `  🥾 !kickmember [username] ↳ kick member\n` +
                 `  ⚡ !punish [username] ↳ punish member\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `     𝕭𝖞 𝕬𝖘𝖙𝖗𝖆𝖑 𝕿𝖊𝖆𝖒 ™ 𝟸𝟶𝟸𝟼\n` +
                 `╰══════════════════════╯`;

    try {
      const media = await pkg.MessageMedia.fromFilePath('client/public/assets/scroll.jpg');
      await client.sendMessage(msg.from, media, { caption: text });
    } catch (e) {
      console.error('Failed to send media:', e);
      await msg.reply(text);
    }
  }
  else if (cmd === '!givecard') {
    if (args.length < 3) return msg.reply(`Usage: !givecard @user [card_number]`);
    const targetMention = args[1];
    const cardIndex = parseInt(args[2]) - 1;

    const targetPhoneId = targetMention.replace('@', '').replace(/[^0-9]/g, '') + '@c.us';
    const userCards = await storage.getCardsByOwner(phoneId);

    if (isNaN(cardIndex) || cardIndex < 0 || cardIndex >= userCards.length) {
      return msg.reply("Invalid card number!");
    }

    const card = userCards[cardIndex];
    const targetUser = await storage.getUserByPhone(targetPhoneId);
    
    if (!targetUser) return msg.reply("Target user not found in the realm!");

    await storage.updateCard(card.id, { ownerPhoneId: targetPhoneId });
    await msg.reply(`Successfully transferred [${card.rarity}] ${card.name} to @${targetUser.phoneId.split('@')[0]}!`, {
      mentions: [targetPhoneId] as any
    });
  }
  else if (cmd === '!createsect') {
    if (args.length < 3) return msg.reply(`Usage: !createsect [SectName] [SectTag]`);
    const name = args.slice(1, -1).join(' ');
    const tag = args[args.length - 1];
    if (user.xp < 5000) return msg.reply(`You need 5,000 XP to found a sect.`);
    if (user.sectId) return msg.reply(`You're already in a sect!`);
    const allSects = await storage.getSects();
    if (allSects.length >= 5) return msg.reply(`The realm is full of sects!`);
    const existing = await storage.getSectByName(name);
    if (existing) return msg.reply(`Name already taken!`);
    await storage.updateUser(phoneId, { xp: user.xp - 5000 });
    const sect = await storage.createSect({
      name, tag, leaderPhoneId: phoneId, treasuryXp: 0, membersCount: 1, imageUrl: null
    });
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await msg.reply(`Sect [${tag}] ${name} has been founded!`);
  }
  else if (cmd === '!joinsect') {
    if (args.length < 2) {
      const allSects = await storage.getSects();
      if (allSects.length === 0) return msg.reply(`No sects exist yet.`);
      let sectList = "";
      for (const s of allSects) {
        sectList += `  ${s.name} ✦ ${s.tag}\n`;
      }
      return msg.reply(`Available Sects:\n${sectList}`);
    }
    if (user.sectId) return msg.reply(`Leave your sect first!`);
    const name = args.slice(1).join(' ');
    const sect = await storage.getSectByName(name);
    if (!sect) return msg.reply(`Sect not found.`);
    if (sect.membersCount >= 20) return msg.reply(`Sect full.`);
    await storage.updateSect(sect.id, { membersCount: sect.membersCount + 1 });
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await msg.reply(`Joined ${sect.name}!`);
  }
  else if (cmd === '!mysect') {
    if (!user.sectId) return msg.reply(`Join a sect first!`);
    const sect = await storage.getSectById(user.sectId);
    if (!sect) return;
    const allUsers = await storage.getUsers();
    const sectMembers = allUsers.filter(u => u.sectId === sect.id);
    let roster = sectMembers.map((m, i) => `${i+1}. ${m.name}`).join('\n  ');
    const text = `Sect: ${sect.name} [${sect.tag}]\nMembers: ${sect.membersCount}/20\n\nRoster:\n${roster}`;
    await msg.reply(text);
  }
  else if (cmd === '!donate') {
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return msg.reply(`Invalid amount.`);
    if (user.xp < amount) return msg.reply(`Not enough XP.`);
    const sect = await storage.getSectById(user.sectId!);
    if (!sect) return;
    await storage.updateUser(phoneId, { xp: user.xp - amount });
    await storage.updateSect(sect.id, { treasuryXp: sect.treasuryXp + amount });
    await msg.reply(`Donated ${amount} XP!`);
  }
}
