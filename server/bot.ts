import pkg, { type Message, type Chat, type Contact } from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import { storage } from './storage';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, sects, cards, type User } from '@shared/schema';
import { execSync } from 'child_process';

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

export function initBot() {
  if (client) {
    try {
      client.destroy();
    } catch(e) {}
  }

  connectionStatus = "DISCONNECTED";
  currentQrCode = undefined;
  
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      executablePath: execSync('which chromium').toString().trim(),
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', (qr) => {
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

  client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    connectionStatus = "DISCONNECTED";
    currentQrCode = undefined;
    
    // Automatically reinitialize to get new QR
    console.log('Reinitializing client...');
    setTimeout(initBot, 5000);
  });

  client.on('message', async (msg) => {
    await handleMessage(msg);
  });

  client.on('group_join', async (notification) => {
    try {
      const groupChat = await notification.getChat();
      for (const participant of notification.recipientIds) {
        await groupChat.sendMessage(`Welcome to the Sect, Cultivator! You start as a 【8】Core Disciple of Mid. Send messages to earn XP and ascend!`);
      }
    } catch(err) {
      console.error(err);
    }
  });

  client.initialize().catch(err => {
    console.error('Failed to initialize client:', err);
    connectionStatus = "DISCONNECTED";
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
        sectId: null,
        sectTag: null,
        lastCardClaim: null
      });
    } else if (user.name !== name) {
      user = await storage.updateUser(phoneId, { name });
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
        { mentions: [contact] }
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
  if (cmd === '!rank' || cmd === '!stats') {
    const sectInfo = user.sectTag ? `\n🏯 Sect: [${user.sectTag}]` : "";
    await msg.reply(`🏅 Rank: ${getRank(user.xp)}\n📈 XP: ${user.xp}${sectInfo}`);
  }
  else if (cmd === '!leaderboard') {
    const users = await storage.getUsers();
    let text = "🏆 *Top Cultivators* 🏆\n";
    for(let i=0; i < Math.min(10, users.length); i++) {
      text += `${i+1}. ${users[i].name} - ${users[i].xp} XP\n`;
    }
    await msg.reply(text);
  }
  else if (cmd === '!help' || cmd === '!scroll') {
    await msg.reply(`🌌 *ASTRAL BOT* 🌌\n\nProfile:\n!rank, !stats, !leaderboard\n\nCards:\n!getcard, !cardcollection, !card [num], !givecard [num]\n\nSects:\n!createsect [Name] [Tag], !joinsect [Name], !mysect, !donate [amount], !sectranking, !sectleave\n\nSect Leader:\n!setsectpfp, !kickmember [username], !punish [username]`);
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
    let roster = sectMembers.map((m, i) => `${i+1}. ${m.name} ${m.phoneId === sect.leaderPhoneId ? '(Leader)' : ''}`).join('\n  ');
    
    let text = `――――――――――――――――――――――\n        [${sect.tag}] ${sect.name}        \n――――――――――――――――――――――\n  Leader: ${sectMembers.find(m => m.phoneId === sect.leaderPhoneId)?.name || 'Unknown'}\n  Members: ${sect.membersCount}/20\n――――――――――――――――――――――\n  ROSTER\n  ${roster}\n――――――――――――――――――――――\n  TREASURY: ${sect.treasuryXp} XP\n――――――――――――――――――――――`;
    await msg.reply(text);
  }
  else if (cmd === '!donate') {
    if (!user.sectId) return msg.reply(`You are not in a sect.`);
    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return msg.reply(`Invalid amount.`);
    if (amount > 100) return msg.reply(`You can only donate up to 100 XP per day.`);
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
    let text = "🏯 *Sect Rankings* 🏯\n\n";
    sects.forEach((s, i) => {
      text += `${i+1}. [${s.tag}] ${s.name} - ${s.membersCount}/20 members - ${s.treasuryXp} XP\n`;
    });
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
      // Pick a random popular anime ID from 1 to 10000 
      const randomAnimeId = Math.floor(Math.random() * 5000) + 1;
      const res = await fetch(`https://api.myanimelist.net/v2/anime/${randomAnimeId}?fields=characters`, {
        headers: { 'X-MAL-CLIENT-ID': malClientId }
      });
      
      if (!res.ok) return msg.reply(`Failed to summon a spirit card. The astral connection wavered.`);
      
      const data = await res.json();
      if (!data.characters || data.characters.length === 0) return msg.reply(`The summoned spirit was empty. Try again.`);
      
      const randomChar = data.characters[Math.floor(Math.random() * data.characters.length)].node;
      
      const r = Math.random();
      const rarity = r > 0.95 ? 'Legendary' : (r > 0.8 ? 'Epic' : (r > 0.5 ? 'Rare' : 'Common'));
      
      const card = await storage.createCard({
        ownerPhoneId: phoneId,
        malCharacterId: randomChar.id,
        name: randomChar.name,
        series: data.title,
        imageUrl: randomChar.main_picture?.large || randomChar.main_picture?.medium || "",
        rarity
      });
      
      await storage.updateUser(phoneId, { lastCardClaim: now });
      
      let msgText = `✨ You claimed a ${rarity} card!\n\nName: ${card.name}\nSeries: ${card.series}`;
      await msg.reply(msgText);
    } catch(err) {
      console.error(err);
      msg.reply(`Error claiming card.`);
    }
  }
  else if (cmd === '!cardcollection') {
    const cards = await storage.getCardsByOwner(phoneId);
    if (cards.length === 0) return msg.reply(`You have no spirit cards.`);
    
    let text = `📚 *Your Card Collection*\n\n`;
    cards.forEach((c, i) => {
      text += `[${i+1}] ${c.name} (${c.series}) - ${c.rarity}\n`;
    });
    await msg.reply(text);
  }
  else if (cmd === '!card') {
    const num = parseInt(args[1]);
    if (isNaN(num) || num < 1) return msg.reply(`Usage: !card [num]`);
    const cards = await storage.getCardsByOwner(phoneId);
    if (num > cards.length) return msg.reply(`Card not found in collection.`);
    
    const c = cards[num - 1];
    await msg.reply(`🃏 *${c.name}*\nSeries: ${c.series}\nRarity: ${c.rarity}\nImage: ${c.imageUrl}`);
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
    await msg.reply(`🎁 You gave ${c.name} to @${quotedContact.id.user}!`, { mentions: [quotedContact] });
  }
}

