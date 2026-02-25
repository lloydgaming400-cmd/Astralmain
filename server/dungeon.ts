// ══════════════════════════════════════════════════════════════════
//  DUNGEON ENGINE — Astral Bot
//  Tower of Ascension — 10 floor PvE system
// ══════════════════════════════════════════════════════════════════

import {
  type Combatant, type Skill, ALL_SKILLS, calculateDamage, applySkillEffect,
  applyTurnEffects, tickCooldowns, tickEffects, makeBar, canUseSkill,
  getDefaultSkill, rollStatGains, formatStatGains,
} from './battle';

// ─────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────

export interface Monster {
  id: string;
  name: string;
  emoji: string;
  floor: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  moves: MonsterMove[];
  enrageAt?: number;
  enrageMoves?: MonsterMove[];
  lore: string;
}

export interface MonsterMove {
  name: string;
  emoji: string;
  damage: number;
  mpCost: number;
  weight: number;
  effect?: {
    kind: "burn" | "bleed" | "stun" | "freeze" | "slow" | "silence" | "mp_drain" | "regen";
    value: number;
    duration: number;
  };
  description: string;
}

export interface DungeonState {
  phoneId: string;
  floor: number;
  monster: Monster;
  playerHp: number;
  playerMp: number;
  playerMaxHp: number;
  playerMaxMp: number;
  playerStats: any; // BattleStats — stored for damage calculations
  playerActiveEffects: any[];
  playerCooldowns: Record<string, number>;
  monsterActiveEffects: any[];
  turn: number;
  xpEarned: number;
  noDeathRun: boolean;
  phase: "active" | "ended";
  chatId: string;
  turnTimer: ReturnType<typeof setTimeout> | null;
  // Streak tracking for momentum
  playerStreak: number;
}

// ─────────────────────────────────────────────────────────────────
//  MONSTER DEFINITIONS — tougher scaling per floor
// ─────────────────────────────────────────────────────────────────

const FLOOR_1_MONSTERS: Omit<Monster, 'hp' | 'mp'>[] = [
  {
    id: "shadow_wisp",
    name: "Shadow Wisp",
    emoji: "👻",
    floor: 1,
    maxHp: 180, maxMp: 50,
    attack: 22, defense: 3, speed: 20,
    lore: "*A faint shadow flickers at the dungeon entrance. It looks hungry.*",
    moves: [
      { name: "Scratch", emoji: "🌑", damage: 22, mpCost: 0, weight: 5, description: "A weak dark scratch." },
      { name: "Chill Touch", emoji: "❄️", damage: 15, mpCost: 10, weight: 3,
        effect: { kind: "slow", value: 8, duration: 2 }, description: "Slows the target." },
      { name: "Soul Bite", emoji: "😈", damage: 18, mpCost: 15, weight: 2,
        effect: { kind: "mp_drain", value: 15, duration: 1 }, description: "Drains 15 MP." },
    ],
  },
  {
    id: "cave_rat",
    name: "Giant Cave Rat",
    emoji: "🐀",
    floor: 1,
    maxHp: 150, maxMp: 20,
    attack: 28, defense: 0, speed: 30,
    lore: "*Something skitters in the darkness. Very large. Very angry.*",
    moves: [
      { name: "Gnaw", emoji: "🦷", damage: 28, mpCost: 0, weight: 5, description: "Vicious biting attack." },
      { name: "Feral Bite", emoji: "🩸", damage: 20, mpCost: 10, weight: 3,
        effect: { kind: "bleed", value: 10, duration: 3 }, description: "Causes bleeding." },
      { name: "Screech", emoji: "📣", damage: 0, mpCost: 10, weight: 2,
        effect: { kind: "slow", value: 10, duration: 1 }, description: "Ear-splitting screech. Slows." },
    ],
  },
  {
    id: "bone_walker",
    name: "Bone Walker",
    emoji: "💀",
    floor: 2,
    maxHp: 220, maxMp: 50,
    attack: 30, defense: 8, speed: 15,
    lore: "*Bones scrape against stone. Something that should be dead refuses to stay that way.*",
    moves: [
      { name: "Bone Slam", emoji: "🦴", damage: 30, mpCost: 0, weight: 4, description: "Slams with a bone club." },
      { name: "Death Rattle", emoji: "💀", damage: 10, mpCost: 15, weight: 3,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "Terrifying scream. Stuns 1 turn." },
      { name: "Bone Shards", emoji: "🌑", damage: 25, mpCost: 20, weight: 2,
        effect: { kind: "bleed", value: 8, duration: 2 }, description: "Flying shards cause bleed." },
    ],
  },
  {
    id: "mud_golem",
    name: "Mud Golem",
    emoji: "🟫",
    floor: 3,
    maxHp: 300, maxMp: 40,
    attack: 35, defense: 15, speed: 8,
    lore: "*A hulking mass of dark earth rises from the dungeon floor.*",
    moves: [
      { name: "Crush", emoji: "👊", damage: 35, mpCost: 0, weight: 4, description: "Slow but devastating slam." },
      { name: "Mud Coat", emoji: "🟫", damage: 15, mpCost: 15, weight: 3,
        effect: { kind: "slow", value: 18, duration: 3 }, description: "Coats target in mud. Heavy slow." },
      { name: "Boulder Throw", emoji: "🪨", damage: 45, mpCost: 25, weight: 2, description: "Hurls a massive rock." },
    ],
  },
];

const FLOOR_4_MONSTERS: Omit<Monster, 'hp' | 'mp'>[] = [
  {
    id: "void_serpent",
    name: "Void Serpent",
    emoji: "🐍",
    floor: 4,
    maxHp: 380, maxMp: 100,
    attack: 50, defense: 10, speed: 35,
    lore: "*A serpent made of pure void energy coils before you. Its eyes are stars going out.*",
    moves: [
      { name: "Venom Strike", emoji: "☠️", damage: 45, mpCost: 0, weight: 4,
        effect: { kind: "burn", value: 18, duration: 3 }, description: "Poisonous bite. Burns 18/turn." },
      { name: "Constrict", emoji: "🐍", damage: 35, mpCost: 20, weight: 3,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "Wraps around target. Stuns." },
      { name: "Void Lunge", emoji: "🌑", damage: 65, mpCost: 35, weight: 2, description: "Devastating lunge from shadow." },
      { name: "Shedding", emoji: "✨", damage: 0, mpCost: 25, weight: 1,
        effect: { kind: "regen", value: 30, duration: 3 }, description: "Regenerates 30 HP/turn for 3 turns." },
    ],
  },
  {
    id: "cursed_knight",
    name: "Cursed Knight",
    emoji: "⚔️",
    floor: 5,
    maxHp: 450, maxMp: 120,
    attack: 60, defense: 20, speed: 25,
    lore: "*A knight in shattered armour. Their eyes glow red. They were once a cultivator like you.*",
    moves: [
      { name: "Cursed Slash", emoji: "⚔️", damage: 55, mpCost: 0, weight: 4,
        effect: { kind: "bleed", value: 15, duration: 3 }, description: "Cursed blade. Causes heavy bleed." },
      { name: "Shield Bash", emoji: "🛡️", damage: 40, mpCost: 20, weight: 3,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "Staggering blow." },
      { name: "Soul Drain", emoji: "💜", damage: 30, mpCost: 35, weight: 2,
        effect: { kind: "mp_drain", value: 50, duration: 1 }, description: "Drains 50 MP from target." },
      { name: "Dark Guard", emoji: "🌑", damage: 0, mpCost: 30, weight: 1,
        effect: { kind: "regen", value: 25, duration: 2 }, description: "Recovers 25 HP/turn for 2 turns." },
    ],
  },
  {
    id: "flame_elemental",
    name: "Flame Elemental",
    emoji: "🔥",
    floor: 6,
    maxHp: 420, maxMp: 150,
    attack: 65, defense: 8, speed: 40,
    lore: "*Pure fire given shape and fury. The heat is suffocating before it even attacks.*",
    moves: [
      { name: "Fireball", emoji: "🔥", damage: 60, mpCost: 20, weight: 4,
        effect: { kind: "burn", value: 22, duration: 3 }, description: "Burns 22/turn for 3 turns." },
      { name: "Flame Burst", emoji: "💥", damage: 85, mpCost: 45, weight: 2, description: "Massive fire explosion." },
      { name: "Ember Rain", emoji: "🌋", damage: 40, mpCost: 20, weight: 3,
        effect: { kind: "burn", value: 12, duration: 4 }, description: "Lingering burn for 4 turns." },
      { name: "Ignite", emoji: "🕯️", damage: 30, mpCost: 15, weight: 2,
        effect: { kind: "silence", value: 0, duration: 1 }, description: "Fire fills lungs. Silences 1 turn." },
    ],
  },
];

const FLOOR_7_MONSTERS: Omit<Monster, 'hp' | 'mp'>[] = [
  {
    id: "shadow_monarch_echo",
    name: "Shadow Monarch Echo",
    emoji: "👑",
    floor: 7,
    maxHp: 600, maxMp: 180,
    attack: 80, defense: 25, speed: 45,
    enrageAt: 50,
    lore: "*An echo of the Shadow Monarch's power. Not the real thing — but close enough to kill you.*",
    moves: [
      { name: "Shadow Strike", emoji: "🌑", damage: 75, mpCost: 0, weight: 3, description: "Blade of pure shadow." },
      { name: "Army Fragment", emoji: "👥", damage: 65, mpCost: 30, weight: 3,
        effect: { kind: "bleed", value: 22, duration: 3 }, description: "Shadow soldiers tear at you." },
      { name: "Arise Echo", emoji: "⚡", damage: 100, mpCost: 65, weight: 2, description: "A pale imitation of ARISE. Still devastating." },
      { name: "Silence Field", emoji: "🔇", damage: 20, mpCost: 40, weight: 2,
        effect: { kind: "silence", value: 0, duration: 2 }, description: "Seals your skills for 2 turns." },
    ],
    enrageMoves: [
      { name: "MONARCH'S DECREE", emoji: "👑", damage: 130, mpCost: 0, weight: 4, description: "ENRAGED: Unstoppable command." },
      { name: "Shadow Army Full", emoji: "🌑", damage: 100, mpCost: 50, weight: 3,
        effect: { kind: "bleed", value: 30, duration: 4 }, description: "ENRAGED: Full army. Severe bleed." },
    ],
  },
  {
    id: "storm_dragon",
    name: "Storm Dragon",
    emoji: "🐉",
    floor: 8,
    maxHp: 750, maxMp: 200,
    attack: 90, defense: 30, speed: 40,
    enrageAt: 40,
    lore: "*Thunder rolls as the dragon unfurls its wings. The air crackles with lightning.*",
    moves: [
      { name: "Thunder Claw", emoji: "⚡", damage: 85, mpCost: 0, weight: 3,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "Lightning-fast claw. May stun." },
      { name: "Storm Breath", emoji: "🌩️", damage: 110, mpCost: 55, weight: 2, description: "Devastating lightning breath." },
      { name: "Gale Force", emoji: "🌪️", damage: 55, mpCost: 30, weight: 3,
        effect: { kind: "slow", value: 25, duration: 3 }, description: "Massive wind blast. Heavy slow." },
      { name: "Scale Rend", emoji: "🐉", damage: 70, mpCost: 25, weight: 3,
        effect: { kind: "bleed", value: 28, duration: 4 }, description: "Rips with scales. Severe bleed." },
    ],
    enrageMoves: [
      { name: "THUNDERSTORM", emoji: "⛈️", damage: 150, mpCost: 0, weight: 3, description: "ENRAGED: Calls down a thunderstorm." },
      { name: "Lightning Breath", emoji: "⚡", damage: 120, mpCost: 60, weight: 2,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "ENRAGED: Pure lightning. Guaranteed stun." },
    ],
  },
  {
    id: "void_titan",
    name: "Void Titan",
    emoji: "🌑",
    floor: 9,
    maxHp: 900, maxMp: 250,
    attack: 100, defense: 35, speed: 28,
    enrageAt: 35,
    lore: "*A being from beyond the void. It shouldn't exist. Yet here it stands, waiting.*",
    moves: [
      { name: "Void Crush", emoji: "🌑", damage: 95, mpCost: 0, weight: 3, description: "Reality-warping slam." },
      { name: "Consume", emoji: "🕳️", damage: 60, mpCost: 40, weight: 3,
        effect: { kind: "mp_drain", value: 70, duration: 1 }, description: "Devours your mana. Drains 70 MP." },
      { name: "Annihilate", emoji: "💥", damage: 140, mpCost: 90, weight: 1, description: "Near-instant kill attack. Lethal." },
      { name: "Void Pulse", emoji: "⭕", damage: 70, mpCost: 40, weight: 3,
        effect: { kind: "silence", value: 0, duration: 2 }, description: "Silences all skills 2 turns." },
    ],
    enrageMoves: [
      { name: "VOID COLLAPSE", emoji: "🌌", damage: 170, mpCost: 0, weight: 3, description: "ENRAGED: Collapses reality around you." },
      { name: "Total Annihilation", emoji: "💥", damage: 200, mpCost: 80, weight: 1, description: "ENRAGED: Devastating. Near-fatal." },
      { name: "Corrupting Void", emoji: "🌑", damage: 80, mpCost: 50, weight: 3,
        effect: { kind: "bleed", value: 35, duration: 5 }, description: "ENRAGED: Corrupts blood. Long bleed." },
    ],
  },
];

const FLOOR_10_BOSS: Omit<Monster, 'hp' | 'mp'> = {
  id: "astral_sovereign",
  name: "Astral Sovereign",
  emoji: "🌌",
  floor: 10,
  maxHp: 1500, maxMp: 350,
  attack: 120, defense: 50, speed: 55,
  lore: `*The tower shudders. The walls dissolve into stars.*\n*A being of absolute power descends.*\n*"You dare reach the summit? Then face your end."*`,
  moves: [
    { name: "Stellar Slash", emoji: "⭐", damage: 120, mpCost: 0, weight: 3, description: "A blade of condensed starlight." },
    { name: "Cosmic Burn", emoji: "☄️", damage: 95, mpCost: 45, weight: 3,
      effect: { kind: "burn", value: 35, duration: 4 }, description: "Burns with cosmic fire. 35/turn × 4." },
    { name: "Gravity Well", emoji: "🌀", damage: 80, mpCost: 55, weight: 2,
      effect: { kind: "stun", value: 0, duration: 1 }, description: "Traps in a gravity well. Stuns." },
    { name: "Domain: Infinite Cosmos", emoji: "🌌", damage: 180, mpCost: 100, weight: 1, description: "Ultimate attack. Devastating." },
    { name: "Star Drain", emoji: "💫", damage: 50, mpCost: 65, weight: 2,
      effect: { kind: "mp_drain", value: 90, duration: 1 }, description: "Drains 90 MP from target." },
  ],
  enrageAt: 40,
  enrageMoves: [
    { name: "SUPERNOVA", emoji: "💥", damage: 240, mpCost: 0, weight: 3, description: "ENRAGED: Pure cosmic destruction." },
    { name: "Void Collapse", emoji: "🌑", damage: 160, mpCost: 55, weight: 3,
      effect: { kind: "silence", value: 0, duration: 3 }, description: "ENRAGED: Silence 3 turns + heavy damage." },
    { name: "Absolute Zero", emoji: "❄️", damage: 130, mpCost: 65, weight: 2,
      effect: { kind: "freeze", value: 0, duration: 1 }, description: "ENRAGED: Freeze + massive damage." },
    { name: "Star Collapse", emoji: "💫", damage: 110, mpCost: 50, weight: 2,
      effect: { kind: "bleed", value: 40, duration: 5 }, description: "ENRAGED: Cosmic bleed. 40/turn × 5." },
  ],
};

// ─────────────────────────────────────────────────────────────────
//  FLOOR → MONSTER POOL
// ─────────────────────────────────────────────────────────────────

export function getMonsterForFloor(floor: number): Monster {
  let pool: Omit<Monster, 'hp' | 'mp'>[];

  if (floor <= 3)       pool = FLOOR_1_MONSTERS.filter(m => m.floor <= floor);
  else if (floor <= 6)  pool = FLOOR_4_MONSTERS.filter(m => m.floor <= floor);
  else if (floor <= 9)  pool = FLOOR_7_MONSTERS.filter(m => m.floor <= floor);
  else                  return { ...FLOOR_10_BOSS, hp: FLOOR_10_BOSS.maxHp, mp: FLOOR_10_BOSS.maxMp };

  const template = pool[Math.floor(Math.random() * pool.length)];

  // Scale stats per floor beyond template's base floor
  const scale = 1 + (floor - template.floor) * 0.20;
  return {
    ...template,
    hp: Math.floor(template.maxHp * scale),
    mp: template.maxMp,
    maxHp: Math.floor(template.maxHp * scale),
    attack: Math.floor(template.attack * scale),
    defense: Math.floor(template.defense * scale),
  };
}

// ─────────────────────────────────────────────────────────────────
//  FLOOR REWARDS — include stat gains
// ─────────────────────────────────────────────────────────────────

export interface FloorReward {
  xp: number;
  item?: string;
  statGains: { str: number; agi: number; int: number; lck: number; spd: number };
  message: string;
}

export function getFloorReward(floor: number, noDeath: boolean): FloorReward {
  const baseXp: Record<number, number> = {
    1: 250, 2: 500, 3: 900,
    4: 1500, 5: 2200, 6: 3000,
    7: 5000, 8: 7500, 9: 12000,
    10: 25000,
  };

  const xp = Math.floor((baseXp[floor] || 250) * (noDeath ? 1.5 : 1));

  const itemDrops: Record<number, { item: string; chance: number }> = {
    3:  { item: "cursed coin",    chance: 0.45 },
    5:  { item: "star dust",      chance: 0.35 },
    6:  { item: "vampire tooth",  chance: 0.25 },
    7:  { item: "void fragment",  chance: 0.20 },
    8:  { item: "living core",    chance: 0.25 },
    9:  { item: "dragon egg",     chance: 0.30 },
    10: { item: "void fragment",  chance: 1.0 },
  };

  const drop = itemDrops[floor];
  const item = drop && Math.random() < drop.chance ? drop.item : undefined;

  // Stat gains per floor — scale with floor number
  const statPool = Math.max(1, Math.floor(floor / 2));
  const roll = (max: number) => Math.floor(Math.random() * (max + 1));
  const statGains = {
    str: roll(statPool + 1),
    agi: roll(statPool),
    int: roll(statPool),
    lck: roll(Math.max(1, Math.floor(statPool / 2))),
    spd: roll(statPool),
  };

  const statParts: string[] = [];
  if (statGains.str > 0) statParts.push(`💪 STR +${statGains.str}`);
  if (statGains.agi > 0) statParts.push(`🏃 AGI +${statGains.agi}`);
  if (statGains.int > 0) statParts.push(`🧠 INT +${statGains.int}`);
  if (statGains.lck > 0) statParts.push(`🍀 LCK +${statGains.lck}`);
  if (statGains.spd > 0) statParts.push(`💨 SPD +${statGains.spd}`);

  const floorMsg = floor === 10
    ? `🌌 *THE TOWER IS CONQUERED!*`
    : `✅ *Floor ${floor} cleared!*`;

  return {
    xp,
    item,
    statGains,
    message:
      `${floorMsg}\n` +
      `💰 XP Earned: *+${xp}*${noDeath ? " (×1.5 no-death bonus!)" : ""}\n` +
      (item ? `🎁 Item Drop: *${item}*!\n` : "") +
      (statParts.length ? `📈 Stat Gains: ${statParts.join("  ")}\n` : "") +
      (floor < 10 ? `⬆️ Proceeding to floor ${floor + 1}...` : ""),
  };
}

// ─────────────────────────────────────────────────────────────────
//  MONSTER AI — pick a move (smarter: uses effects strategically)
// ─────────────────────────────────────────────────────────────────

export function pickMonsterMove(
  monster: Monster,
  isEnraged: boolean,
  playerHpPercent: number,
  playerMp: number
): MonsterMove {
  const moves = isEnraged && monster.enrageMoves ? monster.enrageMoves : monster.moves;

  // Smart AI: if player has high MP, prefer mp_drain moves
  // If player has low HP, prefer high-damage finishers
  let weightedMoves = [...moves];

  if (playerMp > 50) {
    weightedMoves = weightedMoves.map(m =>
      m.effect?.kind === "mp_drain" ? { ...m, weight: m.weight + 3 } : m
    );
  }

  if (playerHpPercent < 35) {
    // Go for the kill — boost heavy damage moves
    weightedMoves = weightedMoves.map(m =>
      m.damage >= 80 ? { ...m, weight: m.weight + 4 } : m
    );
  }

  // If monster is low on HP and has regen, prioritize it
  const monsterHpPercent = (monster.hp / monster.maxHp) * 100;
  if (monsterHpPercent < 30) {
    weightedMoves = weightedMoves.map(m =>
      m.effect?.kind === "regen" ? { ...m, weight: m.weight + 5 } : m
    );
  }

  const totalWeight = weightedMoves.reduce((sum, m) => sum + m.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const move of weightedMoves) {
    roll -= move.weight;
    if (roll <= 0) return move;
  }
  return weightedMoves[0];
}

// ─────────────────────────────────────────────────────────────────
//  DUNGEON TURN RESOLUTION — tougher, uses playerStats for damage
// ─────────────────────────────────────────────────────────────────

export interface DungeonTurnResult {
  logs: string[];
  playerDied: boolean;
  monsterDied: boolean;
  newState: DungeonState;
}

export function resolveDungeonTurn(
  state: DungeonState,
  playerSkill: Skill,
): DungeonTurnResult {
  const logs: string[] = [];
  const monster = state.monster;

  // ── Player attacks monster ─────────────────────────────────────
  const playerStunned = state.playerActiveEffects.some(
    (fx: any) => fx.kind === "stun" || fx.kind === "freeze"
  );

  if (!playerStunned) {
    state.playerMp = Math.max(0, state.playerMp - playerSkill.mpCost);
    if (playerSkill.cooldown > 0) {
      state.playerCooldowns[playerSkill.id] = playerSkill.cooldown;
    }

    // ── Use playerStats for proper strength-based damage ──────────
    const pStats = state.playerStats;
    let primaryStat = pStats?.strength || 30;
    if (playerSkill.statBase === "agility")      primaryStat = pStats?.agility || 25;
    if (playerSkill.statBase === "intelligence") primaryStat = pStats?.intelligence || 28;
    if (playerSkill.statBase === "luck")         primaryStat = pStats?.luck || 15;
    if (playerSkill.statBase === "speed")        primaryStat = pStats?.speed || 20;

    // Apply player buffs
    for (const fx of state.playerActiveEffects) {
      if (fx.kind === "str_up" && playerSkill.statBase === "strength")      primaryStat += fx.value;
      if (fx.kind === "agi_up" && playerSkill.statBase === "agility")       primaryStat += fx.value;
      if (fx.kind === "haste"  && playerSkill.statBase === "speed")         primaryStat += fx.value;
    }

    // Strength always contributes partially
    const strContrib = Math.floor((pStats?.strength || 30) * 0.25);

    // Damage formula — same logic as PvP
    let dmg = Math.floor(primaryStat * 1.8 * (1 + playerSkill.attackPercent) + strContrib);

    // Variance ±15%
    dmg = Math.floor(dmg * (1 + (Math.random() * 0.30 - 0.15)));

    // Momentum bonus
    if (state.playerStreak > 0) {
      const bonus = Math.min(state.playerStreak, 5) * 0.05;
      dmg = Math.floor(dmg * (1 + bonus));
      if (state.playerStreak >= 3) {
        logs.push(`🔥 *${state.playerStreak}-hit streak!* Damage boosted!`);
      }
    }

    // Crit check
    let critChance = 15 + (pStats?.luck ? Math.floor(pStats.luck / 5) : 0);
    for (const fx of state.playerActiveEffects) {
      if (fx.kind === "crit_up") critChance += fx.value;
    }
    const crit = Math.random() * 100 < Math.min(critChance, 80);
    if (crit) {
      dmg = Math.floor(dmg * 1.6);
      logs.push(`💥 *CRITICAL HIT!*`);
    }

    // Hard clamp 30-500 (non-crit), crits up to 750
    if (!crit) dmg = Math.max(30, Math.min(500, dmg));
    else       dmg = Math.max(30, Math.min(750, dmg));

    // Monster defense
    dmg = Math.max(10, dmg - monster.defense);

    monster.hp = Math.max(0, monster.hp - dmg);
    logs.push(`⚔️ You used *${playerSkill.name}* → *${dmg}* damage to ${monster.emoji} *${monster.name}*.`);

    // Track streak
    state.playerStreak = (state.playerStreak || 0) + 1;

    // Apply skill effects to monster
    if (playerSkill.effect && playerSkill.effect.target === "opponent") {
      state.monsterActiveEffects = state.monsterActiveEffects.filter(
        (fx: any) => fx.kind !== playerSkill.effect!.kind
      );
      state.monsterActiveEffects.push({
        kind: playerSkill.effect.kind,
        value: playerSkill.effect.value,
        turnsLeft: playerSkill.effect.duration,
        source: playerSkill.name,
      });
      logs.push(`✨ *${playerSkill.effect.kind}* applied to *${monster.name}* for ${playerSkill.effect.duration} turn(s).`);
    }

    // Lifesteal
    if (playerSkill.effect?.kind === "lifesteal" && dmg > 0) {
      const healed = Math.floor(dmg * playerSkill.effect.value);
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healed);
      logs.push(`🩸 You leeched *${healed} HP*.`);
    }

    // Self-buff skills
    if (playerSkill.effect && playerSkill.effect.target === "self" &&
        playerSkill.effect.kind !== "lifesteal") {
      state.playerActiveEffects = state.playerActiveEffects.filter(
        (fx: any) => fx.kind !== playerSkill.effect!.kind || fx.duration === 999
      );
      state.playerActiveEffects.push({
        kind: playerSkill.effect.kind,
        value: playerSkill.effect.value,
        turnsLeft: playerSkill.effect.duration,
        source: playerSkill.name,
      });
      logs.push(`✨ *${playerSkill.effect.kind}* applied to you for ${playerSkill.effect.duration} turn(s).`);
    }
  } else {
    logs.push(`😴 You are stunned/frozen and lose your turn!`);
    state.playerActiveEffects = state.playerActiveEffects.filter(
      (fx: any) => fx.kind !== "stun" && fx.kind !== "freeze"
    );
    state.playerStreak = 0; // break streak on stun
  }

  // ── Monster DoT first ─────────────────────────────────────────
  for (const fx of state.monsterActiveEffects) {
    if (fx.kind === "burn" || fx.kind === "bleed") {
      monster.hp = Math.max(0, monster.hp - fx.value);
      logs.push(`🔥 *${monster.name}* takes *${fx.value}* ${fx.kind} damage. HP: ${monster.hp}`);
      if (monster.hp <= 0) {
        logs.push(`💀 ${monster.emoji} *${monster.name}* perished from ${fx.kind}!`);
        return { logs, playerDied: false, monsterDied: true, newState: state };
      }
    }
    if (fx.kind === "regen") {
      const healed = Math.min(fx.value, monster.maxHp - monster.hp);
      monster.hp = Math.min(monster.maxHp, monster.hp + fx.value);
      if (healed > 0) logs.push(`💚 *${monster.name}* regenerates *${healed} HP*. HP: ${monster.hp}`);
    }
  }

  // ── Check monster death ────────────────────────────────────────
  if (monster.hp <= 0) {
    logs.push(`\n💀 ${monster.emoji} *${monster.name}* has been defeated!`);
    return { logs, playerDied: false, monsterDied: true, newState: state };
  }

  // ── Monster attacks player ─────────────────────────────────────
  const monsterStunned = state.monsterActiveEffects.some(
    (fx: any) => fx.kind === "stun" || fx.kind === "freeze"
  );

  if (!monsterStunned) {
    const hpPercent = (monster.hp / monster.maxHp) * 100;
    const playerHpPercent = (state.playerHp / state.playerMaxHp) * 100;
    const isEnraged = !!(monster.enrageAt && hpPercent <= monster.enrageAt);

    if (isEnraged) {
      logs.push(`💢 *${monster.name} ENRAGES!* [${Math.floor(hpPercent)}% HP]`);
    }

    const move = pickMonsterMove(monster, isEnraged, playerHpPercent, state.playerMp);

    // Player dodge: agility-based
    const playerAgi = state.playerStats?.agility || 15;
    let dodgeChance = 5 + Math.floor(playerAgi / 15);
    for (const fx of state.playerActiveEffects) {
      if (fx.kind === "dodge_up") dodgeChance += fx.value;
      if (fx.kind === "slow")     dodgeChance = Math.max(2, dodgeChance - 8);
    }
    dodgeChance = Math.min(dodgeChance, 50);

    if (Math.random() * 100 < dodgeChance) {
      logs.push(`💨 You dodged *${move.name}*!`);
      state.playerStreak = Math.max(0, (state.playerStreak || 0)); // keep streak on dodge
    } else {
      let mDmg = move.damage;

      // Enrage adds extra damage multiplier
      if (isEnraged) mDmg = Math.floor(mDmg * 1.25);

      state.playerHp = Math.max(0, state.playerHp - mDmg);
      logs.push(`${move.emoji} *${monster.name}* uses *${move.name}* → *${mDmg}* damage to you.`);

      if (move.effect) {
        state.playerActiveEffects = state.playerActiveEffects.filter(
          (fx: any) => fx.kind !== move.effect!.kind
        );
        if (move.effect.kind === "mp_drain") {
          const drained = Math.min(move.effect.value, state.playerMp);
          state.playerMp = Math.max(0, state.playerMp - drained);
          logs.push(`🌀 *${monster.name}* drained *${drained} MP* from you!`);
        } else {
          state.playerActiveEffects.push({
            kind: move.effect.kind,
            value: move.effect.value,
            turnsLeft: move.effect.duration,
            source: move.name,
          });
          logs.push(`⚠️ You are afflicted with *${move.effect.kind}* for ${move.effect.duration} turn(s).`);
        }
      }
    }
  } else {
    logs.push(`😴 *${monster.name}* is stunned and loses their turn!`);
    state.monsterActiveEffects = state.monsterActiveEffects.filter(
      (fx: any) => fx.kind !== "stun" && fx.kind !== "freeze"
    );
  }

  // ── Player DoT/regen ──────────────────────────────────────────
  for (const fx of state.playerActiveEffects) {
    if (fx.kind === "burn" || fx.kind === "bleed") {
      state.playerHp = Math.max(0, state.playerHp - fx.value);
      logs.push(`🔥 You take *${fx.value}* ${fx.kind} damage. HP: ${state.playerHp}`);
    }
    if (fx.kind === "regen") {
      const healed = Math.min(fx.value, state.playerMaxHp - state.playerHp);
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + fx.value);
      if (healed > 0) logs.push(`💚 You regenerate *${healed} HP*. HP: ${state.playerHp}`);
    }
  }

  // ── Tick effect durations ─────────────────────────────────────
  state.playerActiveEffects = state.playerActiveEffects.filter((fx: any) => {
    if (fx.duration === 999) return true;
    fx.turnsLeft--;
    return fx.turnsLeft > 0;
  });
  state.monsterActiveEffects = state.monsterActiveEffects.filter((fx: any) => {
    fx.turnsLeft--;
    return fx.turnsLeft > 0;
  });

  // ── Tick player cooldowns ─────────────────────────────────────
  for (const key of Object.keys(state.playerCooldowns)) {
    state.playerCooldowns[key]--;
    if (state.playerCooldowns[key] <= 0) delete state.playerCooldowns[key];
  }

  // ── MP regen ──────────────────────────────────────────────────
  state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 10);

  state.turn++;

  if (state.playerHp <= 0) {
    logs.push(`\n💀 *You have fallen in the dungeon...*`);
    return { logs, playerDied: true, monsterDied: false, newState: state };
  }

  return { logs, playerDied: false, monsterDied: false, newState: state };
}

// ─────────────────────────────────────────────────────────────────
//  DUNGEON STATUS UI
// ─────────────────────────────────────────────────────────────────

export function formatDungeonStatus(state: DungeonState): string {
  const monster = state.monster;
  const pHpBar = makeBar(state.playerHp, state.playerMaxHp);
  const pMpBar = makeBar(state.playerMp, state.playerMaxMp);
  const mHpBar = makeBar(monster.hp, monster.maxHp);

  const playerEffects = state.playerActiveEffects
    .filter((fx: any) => fx.duration !== 999)
    .map((fx: any) => `${fx.kind}(${fx.turnsLeft})`)
    .join(", ");
  const monsterEffects = state.monsterActiveEffects
    .map((fx: any) => `${fx.kind}(${fx.turnsLeft})`)
    .join(", ");

  const hpPercent = (monster.hp / monster.maxHp) * 100;
  const enrageWarning = monster.enrageAt && hpPercent <= monster.enrageAt + 15 && hpPercent > monster.enrageAt
    ? `\n  ⚠️ *Enrage incoming at ${monster.enrageAt}%!*`
    : monster.enrageAt && hpPercent <= monster.enrageAt
    ? `\n  💢 *ENRAGED!*`
    : "";

  const streakLine = (state.playerStreak || 0) >= 2
    ? `\n  🔥 Streak: ${state.playerStreak} hit(s)!`
    : "";

  return (
    `⚔️ *FLOOR ${state.floor} — TURN ${state.turn}*\n\n` +
    `👤 *You*\n` +
    `HP: [${pHpBar}] ${state.playerHp}/${state.playerMaxHp}\n` +
    `MP: [${pMpBar}] ${state.playerMp}/${state.playerMaxMp}` +
    streakLine +
    (playerEffects ? `\n  ⚠️ Effects: ${playerEffects}` : "") +
    `\n\n${monster.emoji} *${monster.name}*\n` +
    `HP: [${mHpBar}] ${monster.hp}/${monster.maxHp}${enrageWarning}\n` +
    (monsterEffects ? `  Effects: ${monsterEffects}\n` : "")
  );
}

// ─────────────────────────────────────────────────────────────────
//  IN-MEMORY DUNGEON STATE STORE
// ─────────────────────────────────────────────────────────────────

const activeDungeons = new Map<string, DungeonState>();

export function getDungeon(phoneId: string): DungeonState | undefined {
  return activeDungeons.get(phoneId);
}

export function setDungeon(phoneId: string, state: DungeonState): void {
  activeDungeons.set(phoneId, state);
}

export function deleteDungeon(phoneId: string): void {
  activeDungeons.delete(phoneId);
}

export function getAllDungeons(): DungeonState[] {
  return Array.from(activeDungeons.values());
}
