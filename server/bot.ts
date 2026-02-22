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
    
    if (!isPunished) {
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
                 `▸ Messages: ${user.messages}`;
    await msg.reply(text);
  }
  else if (cmd === '!stats') {
    let sectMemberCount = 0;
    if (user.sectId) {
      const sect = await storage.getSectById(user.sectId);
      sectMemberCount = sect?.membersCount || 0;
    }
    
    // Species member count (mock for now since we don't have species table)
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
            `  ❧ World Ranking: #${userRank}\n` +
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
    await msg.reply(text);
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
    await msg.reply(text);
  }
  
  // 2. SECT SYSTEM
  else if (cmd === '!createsect') {
    if (args.length < 3) return msg.reply(`Usage: !createsect [SectName] [SectTag]`);
    const name = args.slice(1, -1).join(' ');
    const tag = args[args.length - 1];
    
    if (user.xp < 10000) return msg.reply(`You need at least 10,000 XP to found a sect.`);
    if (user.sectId) return msg.reply(`You are already in a sect!`);
    
    const allSects = await storage.getSects();
    if (allSects.length >= 5) return msg.reply(`The realm can only support 5 sects. No more can be founded.`);
    
    const existing = await storage.getSectByName(name);
    if (existing) return msg.reply(`A sect with this name already exists.`);
    
    // Cost 1000 XP
    await storage.updateUser(phoneId, { xp: user.xp - 1000 });
    const sect = await storage.createSect({
      name, tag, leaderPhoneId: phoneId, treasuryXp: 0, membersCount: 1, imageUrl: null
    });
    
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await msg.reply(`🏯 Sect [${tag}] ${name} has been founded! You are now the Sect Leader.`);
  }
  else if (cmd === '!joinsect') {
    if (args.length < 2) return msg.reply(`Usage: !joinsect [SectName]`);
    if (user.sectId) return msg.reply(`You are already in a sect. Use !sectleave first.`);
    
    const name = args.slice(1).join(' ');
    const sect = await storage.getSectByName(name);
    if (!sect) return msg.reply(`Sect not found.`);
    if (sect.membersCount >= 20) return msg.reply(`This sect has reached the maximum of 20 members.`);
    
    await storage.updateSect(sect.id, { membersCount: sect.membersCount + 1 });
    await storage.updateUser(phoneId, { sectId: sect.id, sectTag: sect.tag });
    await msg.reply(`🚪 You have joined [${sect.tag}] ${sect.name}! You now earn 10 XP per message.`);
  }
  else if (cmd === '!mysect') {
    if (!user.sectId) return msg.reply(`You are not in any sect. Use !joinsect [SectName] to join one.`);
    const sect = await storage.getSectById(user.sectId);
    if (!sect) return;
    
    const sectMembers = (await storage.getUsers()).filter(u => u.sectId === sect.id);
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
                 `  ✧ Treasury: ${sect.treasuryXp} XP\n` +
                 `╰══════════════════════╯`;
    await msg.reply(text);
  }
  else if (cmd === '!donate') {
    if (!user.sectId) return msg.reply(`You are not in a sect.`);
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return msg.reply(`Invalid amount.`);
    if (amount > 100) return msg.reply(`You can only donate up to 100 XP at a time.`);
    if (user.xp < amount) return msg.reply(`You don't have enough XP.`);
    
    const sect = await storage.getSectById(user.sectId);
    if (!sect) return;
    
    await storage.updateUser(phoneId, { xp: user.xp - amount });
    await storage.updateSect(sect.id, { treasuryXp: sect.treasuryXp + amount });
    await msg.reply(`💰 You donated ${amount} XP to the treasury of [${sect.tag}] ${sect.name}.`);
  }
  else if (cmd === '!sectranking') {
    const sects = await storage.getSects();
    if (sects.length === 0) return msg.reply(`No sects exist yet.`);
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
            "╰══════════════════════╯";
    await msg.reply(text);
  }
  else if (cmd === '!sectleave') {
    if (!user.sectId) return msg.reply(`You are not in a sect.`);
    const sect = await storage.getSectById(user.sectId);
    if (!sect) return;
    
    if (sect.leaderPhoneId === phoneId) {
      if (sect.membersCount > 1) return msg.reply(`You are the Sect Leader. Kick all members first.`);
      // If alone, dissolve sect? 
      // For now, prompt says: "If the leader tries to leave: You are the Sect Leader. Kick all members first."
      // If it's 1 member, wait, maybe they can leave. I'll let them leave if 1 member.
    }
    
    await storage.updateSect(sect.id, { membersCount: sect.membersCount - 1 });
    await storage.updateUser(phoneId, { sectId: null, sectTag: null });
    await msg.reply(`🚶 You departed from [${sect.tag}] ${sect.name}.`);
  }
  else if (cmd === '!kickmember') {
    if (!user.sectId) return;
    const sect = await storage.getSectById(user.sectId);
    if (!sect || sect.leaderPhoneId !== phoneId) return msg.reply(`Only the Sect Leader can kick members.`);
    
    const targetName = args.slice(1).join(' ');
    const members = await storage.getUsers();
    const target = members.find(m => m.name === targetName && m.sectId === sect.id);
    
    if (!target) return msg.reply(`Member not found in sect.`);
    if (target.phoneId === phoneId) return msg.reply(`You cannot kick yourself.`);
    
    await storage.updateSect(sect.id, { membersCount: sect.membersCount - 1 });
    await storage.updateUser(target.phoneId, { sectId: null, sectTag: null });
    await msg.reply(`🥾 ${target.name} has been kicked from the sect.`);
  }
  else if (cmd === '!punish') {
    if (!user.sectId) return;
    const sect = await storage.getSectById(user.sectId);
    if (!sect || sect.leaderPhoneId !== phoneId) return msg.reply(`Only the Sect Leader can punish members.`);
    
    const targetName = args.slice(1).join(' ');
    const members = await storage.getUsers();
    const target = members.find(m => m.name === targetName && m.sectId === sect.id);
    
    if (!target) return msg.reply(`Member not found in sect.`);
    if (target.phoneId === phoneId) return msg.reply(`You cannot punish yourself.`);
    
    if (punishments[target.phoneId] && punishments[target.phoneId] > Date.now()) {
      return msg.reply(`${target.name} is already serving a punishment.`);
    }
    
    punishments[target.phoneId] = Date.now() + 24 * 60 * 60 * 1000;
    await chat.sendMessage(`⚡ ${target.name} has been punished by ${user.name}. They will gain no XP for 24 hours.`);
  }

  // 3. ANIME CARDS SYSTEM
  else if (cmd === '!getcard') {
    const now = new Date();
    // Daily limit check
    if (user.lastCardClaim) {
      const diff = now.getTime() - user.lastCardClaim.getTime();
      if (diff < 24 * 60 * 60 * 1000) {
        const hours = Math.ceil((24 * 60 * 60 * 1000 - diff) / (60 * 60 * 1000));
        return msg.reply(`You have already claimed a card today. Come back in ${hours} hours.`);
      }
    }
    
    const malClientId = process.env.MAL_CLIENT_ID;
    if (!malClientId) return msg.reply(`MAL_CLIENT_ID is not configured. Admin needs to set it in secrets.`);
    
    try {
      // Pick a random popular anime ID from 1 to 500
      // We limit to top 500 to ensure we get results with characters
      const randomAnimeId = Math.floor(Math.random() * 500) + 1;
      const res = await fetch(`https://api.myanimelist.net/v2/anime/${randomAnimeId}?fields=characters`, {
        headers: { 'X-MAL-CLIENT-ID': malClientId }
      });
      
      if (!res.ok) return msg.reply(`Failed to summon a spirit card. The astral connection wavered.`);
      
      const data = await res.json();
      if (!data.characters || data.characters.length === 0) return msg.reply(`The summoned spirit was empty. Try again.`);
      
      const randomChar = data.characters[Math.floor(Math.random() * data.characters.length)].node;
      
      // Fetch character details for better image and name
      const charRes = await fetch(`https://api.myanimelist.net/v2/characters/${randomChar.id}?fields=name,main_picture`, {
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
        imageUrl: charDetail.main_picture?.large || charDetail.main_picture?.medium || "",
        rarity
      });
      
      await storage.updateUser(phoneId, { lastCardClaim: now });
      
      let msgText = `✨ You claimed a ${rarity} card!\n\n` +
                    `🃏 *${card.name}*\n` +
                    `📺 Series: ${card.series}\n` +
                    `🌟 Rarity: ${card.rarity}`;
      
      if (card.imageUrl) {
        try {
          const media = await pkg.MessageMedia.fromUrl(card.imageUrl);
          await client.sendMessage(msg.from, media, { caption: msgText });
        } catch (e) {
          await msg.reply(msgText + `\n\n(Spirit visualization failed, but card is in your collection)`);
        }
      } else {
        await msg.reply(msgText);
      }
    } catch(err) {
      console.error(err);
      msg.reply(`Error claiming card.`);
    }
  }
  else if (cmd === '!cardcollection') {
    const userCards = await storage.getCardsByOwner(phoneId);
    if (userCards.length === 0) return msg.reply(`You have no spirit cards.`);
    
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
            `  ❧ Total Spirits: ${userCards.length}\n` +
            "╰══════════════════════╯";
    await msg.reply(text);
  }
  else if (cmd === '!card') {
    const num = parseInt(args[1]);
    if (isNaN(num) || num < 1) return msg.reply(`Usage: !card [num]`);
    const userCards = await storage.getCardsByOwner(phoneId);
    if (num > userCards.length) return msg.reply(`Card not found in collection.`);
    
    const c = userCards[num - 1];
    const rarityIcon = c.rarity === 'Legendary' ? '🌈' : (c.rarity === 'Epic' ? '🔥' : (c.rarity === 'Rare' ? '💎' : '⚪'));
    
    const text = `╭══════════════════════╮\n` +
                 `   ✦┊【Ｓｐｉｒｉｔ】┊✦\n` +
                 `╰══════════════════════╯\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
                 `  🃏 Name: ${c.name}\n` +
                 `  📺 Series: ${c.series}\n` +
                 `  ✨ Rarity: ${rarityIcon} ${c.rarity}\n` +
                 ` ꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷꒦꒷\n` +
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
    if (!msg.hasQuotedMsg) return msg.reply(`You must reply to a user's message to give them a card.`);
    const num = parseInt(args[1]);
    if (isNaN(num) || num < 1) return msg.reply(`Usage: !givecard [num]`);
    
    const cards = await storage.getCardsByOwner(phoneId);
    if (num > cards.length) return msg.reply(`Card not found in collection.`);
    const c = cards[num - 1];
    
    const quotedMsg = await msg.getQuotedMessage();
    const quotedContact = await quotedMsg.getContact();
    const targetPhoneId = quotedContact.id._serialized;
    
    if (targetPhoneId === phoneId) return msg.reply(`You cannot give a card to yourself.`);
    
    let targetUser = await storage.getUserByPhone(targetPhoneId);
    if (!targetUser) return msg.reply(`That user hasn't registered in the bot yet.`);
    
    await storage.updateCardOwner(c.id, targetPhoneId);
    await msg.reply(`🎁 You gave ${c.name} to @${quotedContact.id.user}!`, { mentions: [quotedContact as any] } as any);
  }
}

