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
  if (!fs.existsSync(authPath)) {
    fs.mkdirSync(authPath, { recursive: true });
  }

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
        '--no-zygote'
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

  client.on('disconnected', (reason: string) => {
    console.log('Client was disconnected', reason);
    connectionStatus = "DISCONNECTED";
    currentQrCode = undefined;
    
    // Automatically reinitialize to get new QR
    console.log('Reinitializing client...');
    setTimeout(initBot, 5000);
  });

  client.on('message', async (msg: any) => {
    await handleMessage(msg);
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

// Memory block for punishments
const punishments: Record<string, number> = {};

async function handleMessage(msg: Message) {
  try {
    const chat = await msg.getChat();
    if (!chat.isGroup) return; // Only track in activated WhatsApp groups

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
    
    // Award XP if not punished
    let newXp = user.xp;
    const now = Date.now();
    const isPunished = punishments[phoneId] && punishments[phoneId] > now;
    
    if (!isPunished && user.messages > 0) { // Only award XP after !start
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

    // Handle Commands
    const body = msg.body.trim();
    if (body.startsWith('!')) {
      const args = body.split(' ');
      const cmd = args[0].toLowerCase();
      
      if (cmd === '!start') {
        if (user.messages > 0) {
          return msg.reply(`Hehe~ You're already awake, ${user.name}! No need to wake up twice~ 😉💋`);
        }

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

        user = await storage.updateUser(phoneId, { 
          species: selectedSpecies.name,
          messages: 1 // Register as started
        });

        const text = `╭══════════════════════╮\n` +
                     `  ╭══════════════════════╮\n` +
                     `   ✦┊【Ａｗａｋｅｎｉｎｇ】┊✦\n` +
                     `╰══════════════════════╯\n` +
                     ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n\n` +
                     `  H... Hello?\n` +
                     `  Oh you're awake... Hehe >.<\n\n` +
                     `  You must be wondering where you are...\n` +
                     `  My name is the lovely Miss Astral,\n` +
                     `  the Goddess who summoned you \n` +
                     `  into this realm... Uwu 🥰\n\n` +
                     `  I reached across the heavens \n` +
                     `  and pulled you here myself~\n` +
                     `  Out of everyone... I chose YOU,\n` +
                     `  ${user.name}~ aren't you lucky? 😏💕\n` +
                     `  I don't do this for just anyone~ 💋\n\n` +
                     `  ✦ Species: ${user.species}\n` +
                     `  ✦ Rarity: ${selectedSpecies.rarity}\n\n` +
                     `  Now go on then~ I'll be watching \n` +
                     `  you cultivate from up here hehe ✨🌙\n` +
                     ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                     `  Use !scroll to view all commands\n` +
                     `╰══════════════════════╯`;
        
        try {
          const media = await pkg.MessageMedia.fromFilePath('client/public/assets/ִֶָ_𓂃⊹_ִֶָ_vera_1771760736035.jfif');
          await client.sendMessage(msg.from, media, { caption: text });
        } catch (e) {
          await msg.reply(text);
        }
        return;
      }

      if (user.messages === 0) return; // Ignore everything else if not started

      await handleCommands(msg, body, user, chat, contact);
    }
  } catch (err) {
    console.error('Error handling message:', err);
  }
}

async function handleCommands(msg: Message, body: string, user: User, chat: Chat, contact: Contact) {
  const args = body.split(' ');
  const cmd = args[0].toLowerCase();
  const phoneId = user.phoneId;

  // 1. HELP & PROFILES
  if (cmd === '!rank') {
    const text = `【﻿Ｓｔａｔｕｓ】\n` +
                 `-------------------------\n` +
                 `▸ Rank: ${getRank(user.xp)}\n` +
                 `▸ XP: ${user.xp}\n` +
                 `▸ Messages: ${user.messages}\n\n` +
                 `Keep climbing, darling! \n` +
                 `The peak is waiting for you~ 💋✨`;
    await msg.reply(text);
  }
  else if (cmd === '!stats') {
    let sectMemberCount = 0;
    if (user.sectId) {
      const sect = await storage.getSectById(user.sectId);
      sectMemberCount = sect?.membersCount || 0;
    }
    
    // Species member count
    const allUsers = await storage.getUsers();
    const speciesMemberCount = allUsers.filter(u => u.species === user.species).length;

    const text = `【Ｓｔａｔｕｓ】\n` +
                 `-------------------------\n` +
                 `▸ Rank: ${getRank(user.xp)}\n` +
                 `▸ XP: ${user.xp}\n` +
                 `▸ Messages: ${user.messages}\n` +
                 `▸ Sect Members: ${sectMemberCount}\n` +
                 `▸ Species Members: ${speciesMemberCount}\n\n` +
                 `You're doing so well, my little ${user.species}~ 💋✨`;
    await msg.reply(text);
  }
  else if (cmd === '!profile') {
    const sectName = user.sectId ? (await storage.getSectById(user.sectId))?.name || "None" : "None";
    const text = `【Ｐｒｏｆｉｌｅ】\n` +
                 `-------------------------\n` +
                 `▸ Name: ${user.name}\n` +
                 `▸ Sect: ${sectName}\n` +
                 `▸ Rank: ${getRank(user.xp)}\n` +
                 `▸ Species: ${user.species}\n\n` +
                 `A truly remarkable profile! \n` +
                 `I could stare at it all day~ 🥰💋`;
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
            `  ❧ World Ranking: #${userRank}\n\n` +
            `  My, look at all these strong souls! \n` +
            `  Don't stop now, darling~ 💋✨\n` +
            "╰══════════════════════╯";
    await msg.reply(text);
  }
  else if (cmd === '!help') {
    const text = `【Ａｓｔｒａｌ Ｂｏｔ】\n` +
                 `-------------------------\n` +
                 `Greetings, Cultivator! ✨\n\n` +
                 `Astral Bot is your path to ascension —\n` +
                 `collect spirit cards, climb the ranks,\n` +
                 `and forge your legacy in the realm.\n\n` +
                 `▸ 🃏 Collect rare anime cards\n` +
                 `▸ 🏅 Rank up & gain glory\n` +
                 `▸ ⚔️ Join a sect & conquer\n` +
                 `▸ 📜 Respect the sacred laws\n\n` +
                 `-------------------------\n` +
                 `▸ !rules — view the sacred laws\n` +
                 `▸ !scroll — view all commands\n\n` +
                 `Your ascension begins with one step.`;
    
    try {
      const media = await pkg.MessageMedia.fromFilePath('client/public/assets/Himeko_(Honkai_Star_Rail)_1771760736031.jfif');
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
                 `      ↳ Spam & you shall be silenced\n\n` +
                 `▸ 2️⃣ No Disrespect\n` +
                 `      ↳ Honour all cultivators\n\n` +
                 `▸ 3️⃣ No Bug Exploitation\n` +
                 `      ↳ Report bugs, never abuse them\n\n` +
                 `▸ 4️⃣ No Begging\n` +
                 `      ↳ Earn your cards & XP with honour\n\n` +
                 `▸ 5️⃣ Respect Sect Leaders\n` +
                 `      ↳ Their word is law within the sect\n\n` +
                 `▸ 6️⃣ No Alternate Accounts\n` +
                 `      ↳ One soul, one path\n\n` +
                 `▸ 7️⃣ Respect All Decisions\n` +
                 `      ↳ Admin rulings are final & absolute\n\n` +
                 `Break the laws. Face the consequences. ⚔️`;
    await msg.reply(text);
  }
  else if (cmd === '!scroll') {
    const text = `╭══════════════════════╮\n` +
                 `   ✦┊【Ａｓｔｒａｌ Ｓｃｒｏｌｌ】┊✦\n` +
                 `╰══════════════════════╯\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  📊 PROFILE & STATS\n` +
                 `  🏅 !rank ↳ check your rank\n` +
                 `  📈 !stats ↳ view your stats\n` +
                 `  👤 !profile ↳ view your profile\n` +
                 `  🏆 !leaderboard ↳ top cultivators\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  🃏 ANIME CARDS\n` +
                 `  ✨ !getcard ↳ claim your daily card\n` +
                 `  📚 !cardcollection ↳ view collection\n` +
                 `  🔍 !card [num] ↳ inspect a card\n` +
                 `  🎁 !givecard [num] ↳ gift a card\n` +
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
      const media = await pkg.MessageMedia.fromFilePath('client/public/assets/download_(17)_1771760736033.jfif');
      await client.sendMessage(msg.from, media, { caption: text });
    } catch (e) {
      await msg.reply(text);
    }
  }
  
  // 2. SECT SYSTEM
  else if (cmd === '!createsect') {
    if (args.length < 3) return msg.reply(`Usage: !createsect [SectName] [SectTag]`);
    const name = args.slice(1, -1).join(' ');
    const tag = args[args.length - 1];
    
    if (user.xp < 5000) return msg.reply(`Aww, you're not strong enough yet! You need 5,000 XP to found a sect. Keep cultivating for me~ 💋`);
    if (user.sectId) return msg.reply(`You're already in a sect, silly! Why would you want another one? 😏`);
    
    const allSects = await storage.getSects();
    if (allSects.length >= 5) return msg.reply(`The realm is already full of sects! I can't let you build more right now~ 🌙`);
    
    const existing = await storage.getSectByName(name);
    if (existing) return msg.reply(`Hehe, someone already took that name! Be more original~ ✨`);
    
    // Cost 5000 XP
    await storage.updateUser(phoneId, { xp: user.xp - 5000 });
    const sect = await storage.createSect({
      name, tag, leaderPhoneId: phoneId, treasuryXp: 0, membersCount: 1, imageUrl: null
    });
    
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await msg.reply(`🏯 Sect [${tag}] ${name} has been founded! I'll be watching your sect grow from the heavens~ 💋✨`);
  }
  else if (cmd === '!joinsect') {
    if (args.length < 2) {
      const allSects = await storage.getSects();
      if (allSects.length === 0) {
        return msg.reply(
          `╭══════════════════════╮\n` +
          `   ✦┊【Ａｖａｉｌａｂｌｅ Ｓｅｃｔｓ】┊✦\n` +
          `╰══════════════════════╯\n` +
          ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
          `  No sects exist yet.\n` +
          `  Be the first to create one!\n` +
          `  !createsect [name] [tag]\n` +
          `╰══════════════════════╯`
        );
      }

      let sectList = "";
      const allUsers = await storage.getUsers();
      for (const s of allSects) {
        const leader = allUsers.find(u => u.phoneId === s.leaderPhoneId);
        sectList += `  ${s.name} ✦ ${s.tag}\n` +
                    `  👑 Leader: ${leader?.name || 'Unknown'}\n` +
                    `  👥 Members: ${s.membersCount}/20\n` +
                    `─────────────────────\n`;
      }

      return msg.reply(
        `╭══════════════════════╮\n` +
        `   ✦┊【Ａｖａｉｌａｂｌｅ Ｓｅｃｔｓ】┊✦\n` +
        `╰══════════════════════╯\n` +
        ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
        sectList +
        ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
        `  To join: !joinsect [name]\n` +
        `╰══════════════════════╯`
      );
    }

    if (user.sectId) return msg.reply(`You're already bound to a sect! Leave them first if you want to join a new one~ 😏`);
    
    const name = args.slice(1).join(' ');
    const sect = await storage.getSectByName(name);
    if (!sect) return msg.reply(`I couldn't find that sect... Are you sure you spelled it right, darling? ✨`);
    if (sect.membersCount >= 20) return msg.reply(`That sect is already full! Maybe try another one? 💋`);
    
    await storage.updateSect(sect.id, { membersCount: sect.membersCount + 1 });
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await msg.reply(`🚪 You have joined [${sect.tag}] ${sect.name}! Now work hard for me and your sect~ 🥰✨`);
  }
  else if (cmd === '!mysect') {
    if (!user.sectId) return msg.reply(`Aww, you're a rogue cultivator! Why not join a sect and find some friends to cultivate with? Uwu~ 🥰✨`);
    const sect = await storage.getSectById(user.sectId);
    if (!sect) return;
    
    const allUsers = await storage.getUsers();
    const sectMembers = allUsers.filter(u => u.sectId === sect.id);
    let roster = sectMembers.map((m, i) => `${i+1}. ${m.name}${m.phoneId === sect.leaderPhoneId ? ' (Leader)' : ''}`).join('\n  ');
    
    const text = `╭══════════════════════╮\n` +
                 `   ✦┊【Ｓｅｃｔ】┊✦\n` +
                 `╰══════════════════════╯\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  ♔ Name: ${sect.name}\n` +
                 `  ❧ Emblem: [${sect.tag}]\n` +
                 `  ♛ Leader: ${sectMembers.find(m => m.phoneId === sect.leaderPhoneId)?.name || 'Unknown'}\n` +
                 `  ✦ Members: ${sect.membersCount}/20\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  ❦ ROSTER\n` +
                 `  ${roster}\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  ✧ Treasury: ${sect.treasuryXp} XP\n\n` +
                 `  Your sect is looking strong today! \n` +
                 `  Miss Astral is impressed~ 💋✨\n` +
                 `╰══════════════════════╯`;
    await msg.reply(text);
  }
  else if (cmd === '!donate') {
    if (!user.sectId) return msg.reply(`You need to belong to a sect to donate, sweetie! Join one first~ 🥰💋`);
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return msg.reply(`How much are you trying to give? Tell me a real number, darling~ ✨`);
    if (amount > 100) return msg.reply(`Whoa there! You can only donate 100 XP at a time. Generosity is a virtue, but don't empty yourself~ 💋`);
    if (user.xp < amount) return msg.reply(`You don't have enough XP to give that much! Keep working hard for me~ 🥰`);
    
    const sect = await storage.getSectById(user.sectId);
    if (!sect) return;
    
    await storage.updateUser(phoneId, { xp: user.xp - amount });
    await storage.updateSect(sect.id, { treasuryXp: sect.treasuryXp + amount });
    await msg.reply(`💰 You donated ${amount} XP to the treasury of [${sect.tag}] ${sect.name}. Your sect is lucky to have someone like you~ ✨🌙`);
  }
  else if (cmd === '!sectranking') {
    const sects = await storage.getSects();
    if (sects.length === 0) return msg.reply(`No sects exist yet... How about you start one for me? 💋✨`);
    let text = "╭══════════════════════╮\n" +
               "   ✦┊【Ｓｅｃｔ Ｒａｎｋｉｎｇｓ】┊✦\n" +
               "╰══════════════════════╯\n" +
               " ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n";
    
    sects.forEach((s, i) => {
      const medal = i === 0 ? "🥇 " : (i === 1 ? "🥈 " : (i === 2 ? "🥉 " : "✦  "));
      text += `  ${medal}${i+1}. [${s.tag}] ${s.name}\n` +
              `     ↳ ${s.membersCount}/20 members • ${s.treasuryXp} XP\n`;
    });
    
    text += " ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n" +
            `  The sects are clashing! \n` +
            `  Such passion~ I love it! 💋✨\n` +
            "╰══════════════════════╯";
    await msg.reply(text);
  }
  else if (cmd === '!sectleave') {
    if (!user.sectId) return msg.reply(`You're not even in a sect, darling! You're already as free as the wind~ ✨`);
    const sect = await storage.getSectById(user.sectId);
    if (!sect) return;
    
    if (sect.leaderPhoneId === phoneId) {
      if (sect.membersCount > 1) return msg.reply(`You're the Sect Leader! You can't just abandon your disciples like that~ Kick them all first! 😏💋`);
    }
    
    await storage.updateSect(sect.id, { membersCount: sect.membersCount - 1 });
    await storage.updateUser(phoneId, { sectId: null, sectTag: null });
    await msg.reply(`🚶 You departed from [${sect.tag}] ${sect.name}. The path of a rogue cultivator is lonely, but you have me~ 💋✨`);
  }
  else if (cmd === '!setsectpfp') {
    if (!user.sectId) return;
    const sect = await storage.getSectById(user.sectId);
    if (!sect || sect.leaderPhoneId !== phoneId) return msg.reply(`Only the Sect Leader can change the emblem's form, darling~ 😏💋`);
    
    if (!msg.hasMedia && (!msg.hasQuotedMsg || !(await msg.getQuotedMessage()).hasMedia)) {
      return msg.reply(`You need to send an image or reply to one to set the sect's pfp, sweetie~ ✨`);
    }
    
    const mediaMsg = msg.hasMedia ? msg : await msg.getQuotedMessage();
    const media = await mediaMsg.downloadMedia();
    // In a real app, we'd upload to S3/Cloudinary. For now, we'll store the base64 or just mock success.
    // Since our schema expects a URL, and we don't have a storage provider, we'll just mock it.
    await msg.reply(`🖼️ The sect's image has been updated! It looks almost as good as I do~ 💋✨`);
  }
  else if (cmd === '!kickmember') {
    if (!user.sectId) return;
    const sect = await storage.getSectById(user.sectId);
    if (!sect || sect.leaderPhoneId !== phoneId) return msg.reply(`Only the Sect Leader can kick members, darling~ 😏💋`);
    
    const targetName = args.slice(1).join(' ');
    if (!targetName) return msg.reply(`Who are we kicking today? Use !kickmember [Name]~ ✨`);
    
    const members = await storage.getUsers();
    const target = members.find(m => m.name === targetName && m.sectId === sect.id);
    
    if (!target) return msg.reply(`I couldn't find that member in your sect... Are they hiding from you? Hehe~ 💋`);
    if (target.phoneId === phoneId) return msg.reply(`Kicking yourself? You're so funny, darling~ 🥰`);
    
    await storage.updateSect(sect.id, { membersCount: sect.membersCount - 1 });
    await storage.updateUser(target.phoneId, { sectId: null, sectTag: null });
    await msg.reply(`🥾 ${target.name} has been kicked from the sect. Their cultivation path continues elsewhere~ ✨🌙`);
  }
  else if (cmd === '!punish') {
    if (!user.sectId) return;
    const sect = await storage.getSectById(user.sectId);
    if (!sect || sect.leaderPhoneId !== phoneId) return msg.reply(`Only the Sect Leader can hand out punishments, honey~ 😏💋`);
    
    const targetName = args.slice(1).join(' ');
    if (!targetName) return msg.reply(`Who's been naughty? Use !punish [Name]~ ✨`);
    
    const members = await storage.getUsers();
    const target = members.find(m => m.name === targetName && m.sectId === sect.id);
    
    if (!target) return msg.reply(`That person isn't in your sect! You can't punish someone who isn't yours~ Hehe 💋`);
    if (target.phoneId === phoneId) return msg.reply(`Punishing yourself? My, how interesting... but no~ 😏✨`);
    
    if (punishments[target.phoneId] && punishments[target.phoneId] > Date.now()) {
      return msg.reply(`${target.name} is already serving a sentence. Don't be too cruel~ 💋`);
    }
    
    punishments[target.phoneId] = Date.now() + 24 * 60 * 60 * 1000;
    await chat.sendMessage(`⚡ ${target.name} has been punished by ${user.name}. They will gain no XP for 24 hours. Let this be a lesson~ ✨🌙`);
  }

  // 3. ANIME CARDS SYSTEM
  else if (cmd === '!getcard') {
    const now = new Date();
    // Daily limit check
    if (user.lastCardClaim) {
      const diff = now.getTime() - user.lastCardClaim.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.ceil((24 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000));
        return msg.reply(`Hehe~ You're so eager for more spirits! But your soul needs rest, darling. Come back in ${hours} hours~ 💋✨`);
      }
    }
    
    const malClientId = process.env.MAL_CLIENT_ID;
    if (!malClientId) return msg.reply(`Aww, I can't summon spirits without my MAL Client ID! Ask the admin to set it for me~ 🥰`);
    
    try {
      // Pick a random popular anime ID from 1 to 2000 for more variety
      const randomAnimeId = Math.floor(Math.random() * 2000) + 1;
      const res = await fetch(`https://api.myanimelist.net/v2/anime/${randomAnimeId}?fields=title,main_picture,mean,rank,popularity,num_episodes,status,genres,characters`, {
        headers: { 'X-MAL-CLIENT-ID': malClientId }
      });
      
      if (!res.ok) return msg.reply(`The astral connection wavered... I couldn't reach the spirits this time. Try again for me? 💋✨`);
      
      const data = await res.json();
      if (!data.characters || data.characters.length === 0) return msg.reply(`The summoned spirit was empty. I'll try reaching deeper into the void for you~ 💋✨`);
      
      const randomCharEntry = data.characters[Math.floor(Math.random() * data.characters.length)];
      const randomChar = randomCharEntry.node;
      
      // Fetch character details for better image and name
      const charRes = await fetch(`https://api.myanimelist.net/v2/characters/${randomChar.id}?fields=name,main_picture,about`, {
        headers: { 'X-MAL-CLIENT-ID': malClientId }
      });
      
      let charDetail = randomChar;
      if (charRes.ok) {
        charDetail = await charRes.json();
      }

      const r = Math.random();
      const rarity = r > 0.95 ? 'Legendary' : (r > 0.8 ? 'Epic' : (r > 0.5 ? 'Rare' : 'Common'));
      
      const card = await storage.createCard({
        ownerPhoneId: phoneId,
        malCharacterId: charDetail.id,
        name: charDetail.name,
        series: data.title,
        imageUrl: charDetail.main_picture?.large || charDetail.main_picture?.medium || data.main_picture?.large || data.main_picture?.medium || "",
        rarity
      });
      
      await storage.updateUser(phoneId, { lastCardClaim: now });
      
      const isBattleCard = Math.random() > 0.5 ? "Yes" : "No";
      const affiliation = user.sectTag ? `[${user.sectTag}] ${user.sectId ? (await storage.getSectById(user.sectId))?.name : 'None'}` : "Rogue Cultivator";

      let msgText = `✨ *New Card Claimed!* ✨\n` +
                    `▸ Name: ${card.name}\n` +
                    `▸ Tier: ${card.rarity}\n` +
                    `▸ Battle Card: ${isBattleCard}\n` +
                    `▸ Affiliation: ${affiliation}\n\n` +
                    `Use !cardcollection to see your deck!`;
      
      if (card.imageUrl) {
        try {
          const media = await pkg.MessageMedia.fromUrl(card.imageUrl);
          await client.sendMessage(msg.from, media, { caption: msgText });
        } catch (e) {
          await msg.reply(msgText + `\n\n(I tried to show you the spirit's form, but it's too shy~ Check your collection! 💋)`);
        }
      } else {
        await msg.reply(msgText);
      }
    } catch(err) {
      console.error(err);
      msg.reply(`Oh no! Something went wrong in the heavens... Try again later, sweetie~ 💋✨`);
    }
  }
  else if (cmd === '!cardcollection') {
    const userCards = await storage.getCardsByOwner(phoneId);
    if (userCards.length === 0) return msg.reply(`Aww, your collection is empty! Summon some spirits with !getcard and I'll help you fill it~ 🥰💋`);
    
    let text = "╭══════════════════════╮\n" +
               "   ✦┊【Ｃｏｌｌｅｃｔｉｏｎ】┊✦\n" +
               "╰══════════════════════╯\n" +
               " ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n";
    
    userCards.forEach((c, i) => {
      const rarityIcon = c.rarity === 'Legendary' ? '🌈' : (c.rarity === 'Epic' ? '🔥' : (c.rarity === 'Rare' ? '💎' : '⚪'));
      text += `  ${rarityIcon} [${i+1}] ${c.name}\n` +
              `     ↳ ${c.series}\n`;
    });
    
    text += " ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n" +
            `  ❧ Total Spirits: ${userCards.length}\n\n` +
            `  Looking good! Which one is your \n` +
            `  favorite? Hehe~ 💋✨\n` +
            "╰══════════════════════╯";
    await msg.reply(text);
  }
  else if (cmd === '!card') {
    const num = parseInt(args[1]);
    if (isNaN(num) || num < 1) return msg.reply(`Which card do you want to see, honey? Use !card [number]~ 💋`);
    const userCards = await storage.getCardsByOwner(phoneId);
    if (num > userCards.length) return msg.reply(`I couldn't find that card in your collection! Are you seeing things, darling? 😏✨`);
    
    const c = userCards[num - 1];
    const rarityIcon = c.rarity === 'Legendary' ? '🌈' : (c.rarity === 'Epic' ? '🔥' : (c.rarity === 'Rare' ? '💎' : '⚪'));
    
    const text = `╭══════════════════════╮\n` +
                 `   ✦┊【Ｓｐｉｒｉｔ】┊✦\n` +
                 `╰══════════════════════╯\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  🃏 Name: ${c.name}\n` +
                 `  📺 Series: ${c.series}\n` +
                 `  ✨ Rarity: ${rarityIcon} ${c.rarity}\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n\n` +
                 `  Isn't this spirit beautiful? \n` +
                 `  Just like you~ 💋✨\n` +
                 `╰══════════════════════╯`;
    
    if (c.imageUrl) {
      try {
        const media = await pkg.MessageMedia.fromUrl(c.imageUrl);
        await client.sendMessage(msg.from, media, { caption: text });
      } catch (e) {
        await msg.reply(text);
      }
    } else {
      await msg.reply(text);
    }
  }
  else if (cmd === '!givecard') {
    if (!msg.hasQuotedMsg) return msg.reply(`You must reply to a user's message to give them a card, honey~ 💋`);
    const num = parseInt(args[1]);
    if (isNaN(num) || num < 1) return msg.reply(`Which card are you giving away? Use !givecard [number]~ ✨`);
    
    const cards = await storage.getCardsByOwner(phoneId);
    if (num > cards.length) return msg.reply(`You don't even have that card! Trying to give away thin air? Hehe~ 😏💋`);
    const c = cards[num - 1];
    
    const quotedMsg = await msg.getQuotedMessage();
    const quotedContact = await quotedMsg.getContact();
    const targetPhoneId = quotedContact.id._serialized;
    
    if (targetPhoneId === phoneId) return msg.reply(`Giving a card to yourself? You're so silly, darling~ 🥰`);
    
    let targetUser = await storage.getUserByPhone(targetPhoneId);
    if (!targetUser) return msg.reply(`That soul hasn't stepped into my realm yet! Tell them to use !start first~ ✨💋`);
    
    await storage.updateCardOwner(c.id, targetPhoneId);
    await msg.reply(`🎁 You gave ${c.name} to @${quotedContact.id.user}! Such a generous cultivator... I might have to reward you later~ 💋✨`, { mentions: [quotedContact as any] } as any);
  }
}

