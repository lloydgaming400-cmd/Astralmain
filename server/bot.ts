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
  🎒 !useitem [num] ↳ use item
  🤝 !giveitem [num] ↳ give item (reply)
  💰 !givexp [amt] ↳ give XP (reply)
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
  👼 SURVIVAL
  🕊️ !revive @user ↳ revive a fallen ally
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
  "Constellation": 300,
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
    if (xp >= RANKS[i].threshold) return RANKS[i];
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
  "living core": { price: 2500, description: "Rebirth into a new random species." },
  "dragon egg": { price: 5000, description: "A mysterious egg that feeds on XP." },
  "void fragment": { price: 8000, description: "A fragment of the void. Extremely unstable." },
  "star dust": { price: 3000, description: "Dust from the stars. Grants a temporary domain." },
};

const DISEASES: Record<string, { name: string; race: string; startMsg: string; endMsg: string; cure: string }> = {
  "Human": { name: "The Grey Rot", race: "Human", startMsg: "A deadly disease has spread throughout the Human race. The Grey Rot is consuming them from within. Humans are advised to avoid !leaderboard and !profile for the time being.", endMsg: "The Grey Rot has run its course. The Human race can breathe again.", cure: "grey rot cure" },
  "Demon": { name: "Hellfire Fever", race: "Demon", startMsg: "A plague has ignited within the Demon race. Hellfire Fever is burning through their ranks. Demons are advised to avoid !leaderboard and !profile for the time being.", endMsg: "The flames have died down. Hellfire Fever has left the Demon race.", cure: "hellfire suppressant" },
  "Beast Clan": { name: "Feral Plague", race: "Beast Clan", startMsg: "A plague has broken loose within the Beast Clan. The Feral Plague is tearing through their kind. Beast Clan members are advised to avoid !leaderboard and !profile for the time being.", endMsg: "The Feral Plague has been contained. The Beast Clan rises again.", cure: "feral antidote" },
  "Fallen Angel": { name: "Corruption Blight", race: "Fallen Angel", startMsg: "A blight has swept through the Fallen Angel race. Corruption Blight is consuming what little grace they have left. Fallen Angels are advised to avoid !leaderboard and !profile for the time being.", endMsg: "The Corruption Blight has faded. The Fallen Angels endure once more.", cure: "grace restoration vial" },
  "Dragon": { name: "Scale Sickness", race: "Dragon", startMsg: "A sickness has infected the Dragon race. Scale Sickness is cracking through their legendary hides. Dragons are advised to avoid !leaderboard and !profile for the time being.", endMsg: "Scale Sickness has passed. The Dragon race stands unbroken.", cure: "scale restoration salve" },
  "Elf": { name: "Rootwither", race: "Elf", startMsg: "A withering has begun among the Elf race. Rootwither is severing their bond with the ancient world. Elves are advised to avoid !leaderboard and !profile for the time being.", endMsg: "Rootwither has retreated into the earth. The Elf race is restored.", cure: "rootwither remedy" }
};

function getRandomSpecies() {
  const races = Object.keys(SPECIES_XP_RATES).filter(r => r !== "Constellation");
  const name = races[Math.floor(Math.random() * races.length)];
  const rarity = name === "Celestial" ? "Legendary" : (name === "Dragon" || name === "Elf" ? "Very Rare" : "Common");
  return { name, rarity };
}

function getHpStatus(hp: number) {
  if (hp >= 100) return "Perfectly Healthy";
  if (hp >= 90) return "Feeling Fine";
  if (hp >= 80) return "Slightly Off";
  if (hp >= 70) return "Under the Weather";
  if (hp >= 60) return "Noticeably Sick";
  if (hp >= 50) return "Unwell";
  if (hp >= 40) return "Feverish";
  if (hp >= 30) return "Seriously Ill";
  if (hp >= 20) return "Deteriorating";
  if (hp >= 10) return "Critical Condition";
  return "Perished";
}

function generateHpBar(hp: number) {
  const total = 10;
  const filled = Math.ceil(hp / 10);
  const empty = total - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty)) + ` ${hp}/100`;
}

let client: Client;
let isInitializing = false;

// Interval logic for HP drain, Plagues, and Egg Hatching
setInterval(async () => {
  try {
    const users = await storage.getUsers();
    for (const user of users) {
      let hpDrain = 0;
      if (user.condition === "Infected") hpDrain += 5;
      
      if (hpDrain > 0 && !user.isDead) {
        const newHp = Math.max(0, user.hp - hpDrain);
        const isDead = newHp <= 0;
        await storage.updateUser(user.phoneId, { hp: newHp, isDead });
        if (isDead) {
          await client.sendMessage(user.phoneId, "💀 Your life force has faded. You have perished. You cannot use commands until revived.");
        }
      }

      // Dragon Egg Progress
      if (user.dragonEggProgress > 0 && !user.dragonEggHatched) {
        const others = users.filter(u => u.phoneId !== user.phoneId && u.xp >= 30);
        if (others.length > 0) {
          const victim = others[Math.floor(Math.random() * others.length)];
          await storage.updateUser(victim.phoneId, { xp: victim.xp - 30 });
          await storage.updateUser(user.phoneId, { dragonEggProgress: user.dragonEggProgress + 30 });
          await client.sendMessage(victim.phoneId, "A strange fatigue washes over you. Something is feeding nearby.\nYou lost 30 XP.");
          
          if (user.dragonEggProgress + 30 >= 1500) {
            await storage.updateUser(user.phoneId, { dragonEggHatched: true });
            await client.sendMessage(user.phoneId, "The shell shatters. Something ancient rises.\nYour Dragon Egg has fully hatched. +500 XP per day added permanently.");
          }
        }
      }
    }

    const stats = await storage.getGlobalStats();
    const now = new Date();
    if (!stats.activeDisease && (!stats.lastOutbreakAt || now.getTime() - new Date(stats.lastOutbreakAt).getTime() > 604800000)) {
      const races = Object.keys(DISEASES);
      const randomRace = races[Math.floor(Math.random() * races.length)];
      const disease = DISEASES[randomRace];
      const endsAt = new Date(now.getTime() + (Math.floor(Math.random() * 7) + 1) * 86400000);
      await storage.updateGlobalStats({ activeDisease: disease.name, diseaseRace: disease.race, lastOutbreakAt: now, outbreakEndsAt: endsAt });
      await client.sendMessage(OWNER_NUMBER, `⚠️ *DISEASE OUTBREAK*\n\n${disease.startMsg}`);
    } else if (stats.activeDisease && stats.outbreakEndsAt && now > new Date(stats.outbreakEndsAt)) {
      const disease = Object.values(DISEASES).find(d => d.name === stats.activeDisease);
      await storage.updateGlobalStats({ activeDisease: null, diseaseRace: null, outbreakEndsAt: null });
      await client.sendMessage(OWNER_NUMBER, `✨ *DISEASE CLEARED*\n\n${disease?.endMsg}`);
    }
  } catch (err) { console.error("Interval error:", err); }
}, 300000);

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
  client = new Client({ authStrategy: new LocalAuth({ dataPath: authPath }), restartOnAuthFail: true, puppeteer: { executablePath: execSync('which chromium').toString().trim(), headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu', '--disable-software-rasterizer', '--disable-extensions'] } });
  client.on('qr', (qr) => { currentQrCode = qr; connectionStatus = "WAITING_FOR_QR"; });
  client.on('ready', () => { connectionStatus = "CONNECTED"; currentQrCode = undefined; console.log('Bot is ready'); });
  client.on('authenticated', () => { connectionStatus = "CONNECTED"; currentQrCode = undefined; });
  client.on('auth_failure', () => { connectionStatus = "DISCONNECTED"; });
  client.on('disconnected', () => { connectionStatus = "DISCONNECTED"; });
  client.on('message', async (msg) => { try { await handleMessage(msg); } catch (err) { console.error('Error handling message:', err); } });
  client.initialize().catch(() => { connectionStatus = "DISCONNECTED"; }).finally(() => { isInitializing = false; });
}

export function refreshQr() { if (client) { client.destroy().then(() => initBot()).catch(() => initBot()); } else { initBot(); } }

async function handleMessage(msg: Message) {
  const contact = await msg.getContact();
  const phoneId = contact.id._serialized;
  const name = contact.pushname || contact.number;
  const body = msg.body.trim().toLowerCase();
  let user = await storage.getUserByPhone(phoneId);
  if (user?.isBanned) return;
  if (user?.isDead && !body.startsWith("!revive")) {
    if (body.startsWith("!")) return msg.reply("💀 You are dead. Use !revive @user to return.");
    return;
  }
  if (!user || !user.isRegistered) {
    if (body === "!start") {
      const sp = getRandomSpecies();
      user = await storage.createUser({ phoneId, name, species: sp.name, isRegistered: true, xp: 0, messages: 0, condition: "Healthy", rank: 8, inventory: [], hp: 100 });
      return msg.reply(`Welcome Cultivator! You are a ${sp.name} (${sp.rarity}). Use !scroll to begin.`);
    }
    return;
  }

  // Infection trigger for leaderboard/profile/status
  if (["!leaderboard", "!profile", "!status"].includes(body)) {
    const stats = await storage.getGlobalStats();
    if (stats?.diseaseRace === user.species && !user.hasShadowVeil && user.species !== "Constellation" && user.condition === "Healthy") {
      await storage.updateUser(phoneId, { condition: "Infected", disease: stats.activeDisease, infectedAt: new Date() });
      await client.sendMessage(phoneId, `☣️ You have been infected with ${stats.activeDisease}! You are losing 5 HP every 5 minutes.`);
    }
  }

  // XP & Findables
  if (body.length >= 1 && !body.startsWith("!")) {
    const rate = user.species === "Constellation" ? 300 : (SPECIES_XP_RATES[user.species] || 5);
    
    try {
      const oldRank = getRankForXp(user.xp);
      const newXp = user.xp + rate;
      const newRank = getRankForXp(newXp);
      
      const updates: any = { 
        xp: newXp, 
        messages: user.messages + 1,
        rank: newRank.level
      };

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

      if (Math.random() < 0.05) {
        const items = ["Dragon Egg", "Void Fragment", "Star Dust", "Vampire Tooth", "Cursed Bone", "Living Core"];
        const item = items[Math.floor(Math.random() * items.length)];
        if (!(user.inventory as string[]).includes(item)) {
          updates.inventory = [...(user.inventory as string[]), item];
          await client.sendMessage(msg.from, `✨ You found a [${item}]!`);
        }
      }
      await storage.updateUser(phoneId, updates);
    } catch (err) {
      console.error("XP/Rank update error:", err);
    }
  }

  if (body === "!scroll" || body === "!help") return msg.reply(HELP_MENU);
  if (body === "!status" || body === "!profile") {
    const currentRank = getRankForXp(user.xp);
    return msg.reply(`╭══════════════════════╮
   ✦┊【Ｓｔａｔｕｓ】┊✦
╰══════════════════════╯
  👤 Cultivator: ${user.name}
  📈 Rank: ${currentRank.name}
  ✨ XP: ${user.xp}
  💬 Msg: ${user.messages}
  🧬 Species: ${user.species}
  🩹 Condition: ${user.condition}
  ❤️ HP: ${generateHpBar(user.hp)}
  🩺 State: ${getHpStatus(user.hp)}
╰══════════════════════╯`);
  }

  if (body === "!leaderboard") {
    const top = await storage.getUsers();
    const rank = top.findIndex(u => u.phoneId === phoneId) + 1;
    const list = top.slice(0, 10).map((u, i) => `  ${i + 1}. ${u.name} — ${u.xp} XP`).join("\n");
    return msg.reply(`🏆 *TOP CULTIVATORS*\n\n${list}\n\nYour Rank: #${rank}`);
  }

  if (body === "!inventory") {
    const inv = user.inventory as string[];
    const list = inv.map((item, i) => `【${i + 1}】 ${item}`).join("\n");
    return msg.reply(`🎒 *INVENTORY*\n\n${list || "Empty."}\n\nUse !useitem [num]`);
  }

  if (body.startsWith("!useitem ")) {
    const num = parseInt(body.split(" ")[1]) - 1;
    const inv = [...(user.inventory as string[])];
    if (!inv[num]) return msg.reply("❌ Invalid index.");
    const itemName = inv[num];
    const itemLower = itemName.toLowerCase();
    const isFindable = ["dragon egg", "void fragment", "star dust", "vampire tooth", "cursed bone", "living core"].includes(itemLower);
    if (isFindable && Math.random() > 0.11) {
      inv.splice(num, 1);
      await storage.updateUser(phoneId, { inventory: inv });
      return msg.reply(`✨ You used ${itemName}, but its power remains dormant.`);
    }
    let reply = `✨ You used ${itemName}!`;
    const updates: any = {};
    if (itemLower === "star dust") { 
      updates.dustDomainUntil = new Date(Date.now() + 300000); 
      reply = `✨ Dust Domain active for 5 minutes! Make it count.`; 
    }
    else if (itemLower === "void fragment") { 
      if (Math.random() > 0.03) {
        inv.splice(num, 1);
        await storage.updateUser(phoneId, { inventory: inv });
        return msg.reply(`🌑 You used the Void Fragment, but the stars refused your call. It dissolved into shadow.`);
      }
      updates.species = "Constellation"; 
      updates.isConstellation = true; 
      reply = `🌑 Race Transformed to ✨ Constellation! Your power is now 300 XP per message.`; 
    }
    else if (itemLower === "living core") {
      const sp = getRandomSpecies();
      updates.species = sp.name;
      updates.isConstellation = false;
      reply = `🌿 The Living Core pulses with life! You have been reborn as a ${sp.name}.`;
    }
    else if (itemLower === "cursed bone") { updates.hasShadowVeil = true; reply = `🦴 Shadow Veil active! You are immune to plagues.`; }
    else if (itemLower === "dragon egg") { updates.dragonEggProgress = 1; reply = `🥚 The egg begins to pulse. It has begun feeding.`; }
    else if (itemLower === "vampire tooth") { updates.isVampire = true; updates.vampireUntil = new Date(Date.now() + 604800000); reply = `🦷 You are now a Vampire for 1 week! Use !suck @user to feed.`; }
    else if (itemLower.includes("cure") || itemLower.includes("remedy") || itemLower.includes("antidote") || itemLower.includes("vial") || itemLower.includes("salve") || itemLower.includes("suppressant")) {
      const disease = Object.values(DISEASES).find(d => d.cure === itemLower);
      if (disease && user.species === disease.race) { updates.condition = "Healthy"; updates.disease = null; updates.hp = 100; reply = `💉 Cured of ${disease.name}!`; }
      else return msg.reply("❌ This cure was not made for you.");
    }
    inv.splice(num, 1);
    updates.inventory = inv;
    await storage.updateUser(phoneId, updates);
    return msg.reply(reply);
  }

  if (body.startsWith("!suck ") && user.isVampire) {
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (!target) return msg.reply("❌ Target not found.");
    if (target.xp > user.xp * 2) return msg.reply("🦷 @target resisted. They are too powerful.");
    const amt = Math.floor(Math.random() * 251) + 50;
    await storage.updateUser(phoneId, { xp: user.xp + amt });
    await storage.updateUser(targetId, { xp: Math.max(0, target.xp - amt) });
    await client.sendMessage(targetId, `Something cold grips you in the dark. You lost ${amt} XP.`);
    return msg.reply(`🦷 You drained ${amt} XP from ${target.name}.`);
  }

  if (body.startsWith("!givexp ") && msg.hasQuotedMsg) {
    const amt = parseInt(body.split(" ")[1]);
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (isNaN(amt) || amt <= 0 || user.xp < amt || !target) return msg.reply("❌ Error.");
    await storage.updateUser(phoneId, { xp: user.xp - amt });
    await storage.updateUser(targetId, { xp: target.xp + amt });
    return msg.reply(`💰 You gave ${amt} XP to ${target.name}.`);
  }

  if (body.startsWith("!giveitem ") && msg.hasQuotedMsg) {
    const num = parseInt(body.split(" ")[1]) - 1;
    const inv = [...(user.inventory as string[])];
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (!inv[num] || !target) return msg.reply("❌ Error.");
    const item = inv.splice(num, 1)[0];
    await storage.updateUser(phoneId, { inventory: inv });
    await storage.updateUser(targetId, { inventory: [...(target.inventory as string[]), item] });
    return msg.reply(`🎁 You gave [${item}] to ${target.name}.`);
  }

  if (body.startsWith("!revive")) {
    const quoted = await msg.getQuotedMessage();
    const targetId = quoted.author || quoted.from;
    const target = await storage.getUserByPhone(targetId);
    if (!target || !target.isDead) return msg.reply("❌ Target is not dead.");
    if (target.species !== user.species) return msg.reply("❌ species mismatch.");
    await storage.updateUser(targetId, { isDead: false, hp: 10 });
    return msg.reply(`🕊️ You revived ${target.name}!`);
  }

  if (body === "!shop") return msg.reply(`🏪 *SHOP*\n\n💊 *Cures*\nGrey Rot Cure - 500 XP\nHellfire Suppressant - 600 XP\nFeral Antidote - 600 XP\nGrace Restoration Vial - 700 XP\nScale Restoration Salve - 800 XP\nRootwither Remedy - 700 XP\n\nUse !buy [name]`);
  if (body.startsWith("!buy ")) {
    const itemName = body.replace("!buy ", "").trim();
    const item = SHOP_ITEMS[itemName];
    if (!item || user.xp < item.price) return msg.reply("❌ Error.");
    await storage.updateUser(phoneId, { xp: user.xp - item.price, inventory: [...(user.inventory as string[]), itemName] });
    return msg.reply(`✅ Purchased ${itemName}!`);
  }
}
