// ══════════════════════════════════════════════════════════════════
//  DUNGEON ENGINE — Astral Bot
//  Tower of Ascension — 10 floor PvE system
// ══════════════════════════════════════════════════════════════════

import { type Combatant, type Skill, ALL_SKILLS, calculateDamage, applySkillEffect,
  applyTurnEffects, tickCooldowns, tickEffects, makeBar, canUseSkill, getDefaultSkill } from './battle';

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
  attack: number;       // base attack stat
  defense: number;      // flat damage reduction
  speed: number;
  moves: MonsterMove[];
  enrageAt?: number;    // HP % threshold to enrage (boss only)
  enrageMoves?: MonsterMove[];
  lore: string;         // flavour text shown on encounter
}

export interface MonsterMove {
  name: string;
  emoji: string;
  damage: number;       // flat damage (0 for utility)
  mpCost: number;
  weight: number;       // higher = picked more often
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
  playerActiveEffects: any[];
  playerCooldowns: Record<string, number>;
  monsterActiveEffects: any[];
  turn: number;
  xpEarned: number;
  noDeathRun: boolean;   // track if player took 0 deaths this run
  phase: "active" | "ended";
  chatId: string;
  turnTimer: ReturnType<typeof setTimeout> | null;
}

// ─────────────────────────────────────────────────────────────────
//  MONSTER DEFINITIONS
// ─────────────────────────────────────────────────────────────────

// Floor 1-3: Weak
const FLOOR_1_MONSTERS: Omit<Monster, 'hp' | 'mp'>[] = [
  {
    id: "shadow_wisp",
    name: "Shadow Wisp",
    emoji: "👻",
    floor: 1,
    maxHp: 150, maxMp: 50,
    attack: 15, defense: 0, speed: 20,
    lore: "*A faint shadow flickers at the dungeon entrance. It looks hungry.*",
    moves: [
      { name: "Scratch", emoji: "🌑", damage: 15, mpCost: 0, weight: 5, description: "A weak dark scratch." },
      { name: "Chill Touch", emoji: "❄️", damage: 10, mpCost: 10, weight: 3,
        effect: { kind: "slow", value: 5, duration: 2 }, description: "Slows the target." },
    ],
  },
  {
    id: "cave_rat",
    name: "Giant Cave Rat",
    emoji: "🐀",
    floor: 1,
    maxHp: 120, maxMp: 20,
    attack: 18, defense: 0, speed: 25,
    lore: "*Something skitters in the darkness. Very large. Very angry.*",
    moves: [
      { name: "Gnaw", emoji: "🦷", damage: 18, mpCost: 0, weight: 5, description: "Vicious biting attack." },
      { name: "Feral Bite", emoji: "🩸", damage: 12, mpCost: 10, weight: 3,
        effect: { kind: "bleed", value: 8, duration: 2 }, description: "Causes bleeding." },
    ],
  },
  {
    id: "bone_walker",
    name: "Bone Walker",
    emoji: "💀",
    floor: 2,
    maxHp: 180, maxMp: 40,
    attack: 20, defense: 5, speed: 15,
    lore: "*Bones scrape against stone. Something that should be dead refuses to stay that way.*",
    moves: [
      { name: "Bone Slam", emoji: "🦴", damage: 20, mpCost: 0, weight: 5, description: "Slams with a bone club." },
      { name: "Death Rattle", emoji: "💀", damage: 0, mpCost: 15, weight: 2,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "Terrifying scream. Stuns 1 turn." },
    ],
  },
  {
    id: "mud_golem",
    name: "Mud Golem",
    emoji: "🟫",
    floor: 3,
    maxHp: 250, maxMp: 30,
    attack: 22, defense: 10, speed: 8,
    lore: "*A hulking mass of dark earth rises from the dungeon floor.*",
    moves: [
      { name: "Crush", emoji: "👊", damage: 22, mpCost: 0, weight: 5, description: "Slow but devastating slam." },
      { name: "Mud Coat", emoji: "🟫", damage: 0, mpCost: 15, weight: 3,
        effect: { kind: "slow", value: 15, duration: 3 }, description: "Coats target in mud. Heavy slow." },
    ],
  },
];

// Floor 4-6: Mid
const FLOOR_4_MONSTERS: Omit<Monster, 'hp' | 'mp'>[] = [
  {
    id: "void_serpent",
    name: "Void Serpent",
    emoji: "🐍",
    floor: 4,
    maxHp: 320, maxMp: 80,
    attack: 35, defense: 8, speed: 30,
    lore: "*A serpent made of pure void energy coils before you. Its eyes are stars going out.*",
    moves: [
      { name: "Venom Strike", emoji: "☠️", damage: 30, mpCost: 0, weight: 4,
        effect: { kind: "burn", value: 15, duration: 3 }, description: "Poisonous bite. Burns 15/turn." },
      { name: "Constrict", emoji: "🐍", damage: 25, mpCost: 20, weight: 3,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "Wraps around target. Stuns." },
      { name: "Void Lunge", emoji: "🌑", damage: 45, mpCost: 30, weight: 2, description: "Devastating lunge from shadow." },
    ],
  },
  {
    id: "cursed_knight",
    name: "Cursed Knight",
    emoji: "⚔️",
    floor: 5,
    maxHp: 380, maxMp: 100,
    attack: 40, defense: 15, speed: 22,
    lore: "*A knight in shattered armour. Their eyes glow red. They were once a cultivator like you.*",
    moves: [
      { name: "Cursed Slash", emoji: "⚔️", damage: 40, mpCost: 0, weight: 4,
        effect: { kind: "bleed", value: 12, duration: 3 }, description: "Cursed blade. Causes heavy bleed." },
      { name: "Shield Bash", emoji: "🛡️", damage: 30, mpCost: 20, weight: 3,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "Staggering blow." },
      { name: "Soul Drain", emoji: "💜", damage: 20, mpCost: 35, weight: 2,
        effect: { kind: "mp_drain", value: 40, duration: 1 }, description: "Drains 40 MP from target." },
    ],
  },
  {
    id: "flame_elemental",
    name: "Flame Elemental",
    emoji: "🔥",
    floor: 6,
    maxHp: 350, maxMp: 120,
    attack: 45, defense: 5, speed: 35,
    lore: "*Pure fire given shape and fury. The heat is suffocating before it even attacks.*",
    moves: [
      { name: "Fireball", emoji: "🔥", damage: 45, mpCost: 20, weight: 4,
        effect: { kind: "burn", value: 20, duration: 3 }, description: "Burns 20/turn for 3 turns." },
      { name: "Flame Burst", emoji: "💥", damage: 60, mpCost: 40, weight: 2, description: "Massive fire explosion." },
      { name: "Ember Rain", emoji: "🌋", damage: 25, mpCost: 15, weight: 3,
        effect: { kind: "burn", value: 10, duration: 4 }, description: "Lingering burn for 4 turns." },
    ],
  },
];

// Floor 7-9: Elite
const FLOOR_7_MONSTERS: Omit<Monster, 'hp' | 'mp'>[] = [
  {
    id: "shadow_monarch_echo",
    name: "Shadow Monarch Echo",
    emoji: "👑",
    floor: 7,
    maxHp: 500, maxMp: 150,
    attack: 60, defense: 20, speed: 40,
    lore: "*An echo of the Shadow Monarch's power. Not the real thing — but close enough to kill you.*",
    moves: [
      { name: "Shadow Strike", emoji: "🌑", damage: 60, mpCost: 0, weight: 3, description: "Blade of pure shadow." },
      { name: "Army Fragment", emoji: "👥", damage: 50, mpCost: 30, weight: 3,
        effect: { kind: "bleed", value: 20, duration: 3 }, description: "Shadow soldiers tear at you." },
      { name: "Arise Echo", emoji: "⚡", damage: 80, mpCost: 60, weight: 2, description: "A pale imitation of ARISE. Still devastating." },
      { name: "Silence Field", emoji: "🔇", damage: 0, mpCost: 40, weight: 2,
        effect: { kind: "silence", value: 0, duration: 2 }, description: "Seals your skills for 2 turns." },
    ],
  },
  {
    id: "storm_dragon",
    name: "Storm Dragon",
    emoji: "🐉",
    floor: 8,
    maxHp: 600, maxMp: 180,
    attack: 70, defense: 25, speed: 35,
    lore: "*Thunder rolls as the dragon unfurls its wings. The air crackles with lightning.*",
    moves: [
      { name: "Thunder Claw", emoji: "⚡", damage: 70, mpCost: 0, weight: 3,
        effect: { kind: "stun", value: 0, duration: 1 }, description: "Lightning-fast claw. Chance to stun." },
      { name: "Storm Breath", emoji: "🌩️", damage: 85, mpCost: 50, weight: 2, description: "Devastating lightning breath." },
      { name: "Gale Force", emoji: "🌪️", damage: 40, mpCost: 30, weight: 3,
        effect: { kind: "slow", value: 20, duration: 3 }, description: "Massive wind blast. Heavy slow." },
      { name: "Scale Rend", emoji: "🐉", damage: 55, mpCost: 20, weight: 3,
        effect: { kind: "bleed", value: 25, duration: 4 }, description: "Rips with scales. Severe bleed." },
    ],
  },
  {
    id: "void_titan",
    name: "Void Titan",
    emoji: "🌑",
    floor: 9,
    maxHp: 700, maxMp: 200,
    attack: 80, defense: 30, speed: 25,
    lore: "*A being from beyond the void. It shouldn't exist. Yet here it stands, waiting.*",
    moves: [
      { name: "Void Crush", emoji: "🌑", damage: 80, mpCost: 0, weight: 3, description: "Reality-warping slam." },
      { name: "Consume", emoji: "🕳️", damage: 50, mpCost: 40, weight: 3,
        effect: { kind: "mp_drain", value: 60, duration: 1 }, description: "Devours your mana. Drains 60 MP." },
      { name: "Annihilate", emoji: "💥", damage: 110, mpCost: 80, weight: 1, description: "Near-instant kill attack. Rare but lethal." },
      { name: "Void Pulse", emoji: "⭕", damage: 60, mpCost: 35, weight: 3,
        effect: { kind: "silence", value: 0, duration: 2 }, description: "Silences all skills 2 turns." },
    ],
  },
];

// Floor 10: Boss
const FLOOR_10_BOSS: Omit<Monster, 'hp' | 'mp'> = {
  id: "astral_sovereign",
  name: "Astral Sovereign",
  emoji: "🌌",
  floor: 10,
  maxHp: 1200, maxMp: 300,
  attack: 100, defense: 40, speed: 50,
  lore: `*The tower shudders. The walls dissolve into stars.*\n*A being of absolute power descends.*\n*"You dare reach the summit? Then face your end."*`,
  moves: [
    { name: "Stellar Slash", emoji: "⭐", damage: 100, mpCost: 0, weight: 3, description: "A blade of condensed starlight." },
    { name: "Cosmic Burn", emoji: "☄️", damage: 80, mpCost: 40, weight: 3,
      effect: { kind: "burn", value: 30, duration: 4 }, description: "Burns with cosmic fire. 30/turn × 4." },
    { name: "Gravity Well", emoji: "🌀", damage: 60, mpCost: 50, weight: 2,
      effect: { kind: "stun", value: 0, duration: 1 }, description: "Traps in a gravity well. Stuns." },
    { name: "Domain: Infinite Cosmos", emoji: "🌌", damage: 150, mpCost: 100, weight: 1, description: "Ultimate attack. Rarely used. Devastating." },
    { name: "Star Drain", emoji: "💫", damage: 40, mpCost: 60, weight: 2,
      effect: { kind: "mp_drain", value: 80, duration: 1 }, description: "Drains 80 MP from target." },
  ],
  enrageAt: 40, // enrages at 40% HP
  enrageMoves: [
    { name: "SUPERNOVA", emoji: "💥", damage: 200, mpCost: 0, weight: 3, description: "ENRAGED: Pure destruction." },
    { name: "Void Collapse", emoji: "🌑", damage: 130, mpCost: 50, weight: 3,
      effect: { kind: "silence", value: 0, duration: 3 }, description: "ENRAGED: Silence 3 turns + heavy damage." },
    { name: "Absolute Zero", emoji: "❄️", damage: 100, mpCost: 60, weight: 2,
      effect: { kind: "freeze", value: 0, duration: 1 }, description: "ENRAGED: Freeze + massive damage." },
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

  // Pick random monster from pool
  const template = pool[Math.floor(Math.random() * pool.length)];

  // Scale stats slightly per floor
  const scale = 1 + (floor - template.floor) * 0.15;
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
//  FLOOR REWARDS
// ─────────────────────────────────────────────────────────────────

export interface FloorReward {
  xp: number;
  item?: string;
  message: string;
}

export function getFloorReward(floor: number, noDeath: boolean): FloorReward {
  const baseXp: Record<number, number> = {
    1: 200, 2: 400, 3: 700,
    4: 1200, 5: 1800, 6: 2500,
    7: 4000, 8: 6000, 9: 9000,
    10: 20000,
  };

  const xp = (baseXp[floor] || 200) * (noDeath ? 1.5 : 1);

  // Item drop chances
  const itemDrops: Record<number, { item: string; chance: number }> = {
    3:  { item: "cursed coin",    chance: 0.4 },
    5:  { item: "star dust",      chance: 0.3 },
    6:  { item: "vampire tooth",  chance: 0.2 },
    7:  { item: "void fragment",  chance: 0.15 },
    8:  { item: "living core",    chance: 0.2 },
    9:  { item: "dragon egg",     chance: 0.25 },
    10: { item: "void fragment",  chance: 1.0 }, // guaranteed on floor 10
  };

  const drop = itemDrops[floor];
  const item = drop && Math.random() < drop.chance ? drop.item : undefined;

  const floorMsg = floor === 10
    ? `🌌 *THE TOWER IS CONQUERED!*`
    : `✅ *Floor ${floor} cleared!*`;

  return {
    xp: Math.floor(xp),
    item,
    message:
      `${floorMsg}\n` +
      `💰 XP Earned: *+${Math.floor(xp)}*${noDeath ? " (×1.5 no-death bonus!)" : ""}\n` +
      (item ? `🎁 Item Drop: *${item}*!\n` : "") +
      (floor < 10 ? `⬆️ Proceeding to floor ${floor + 1}...` : ""),
  };
}

// ─────────────────────────────────────────────────────────────────
//  MONSTER AI — pick a move
// ─────────────────────────────────────────────────────────────────

export function pickMonsterMove(monster: Monster, isEnraged: boolean): MonsterMove {
  const moves = isEnraged && monster.enrageMoves ? monster.enrageMoves : monster.moves;
  const totalWeight = moves.reduce((sum, m) => sum + m.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const move of moves) {
    roll -= move.weight;
    if (roll <= 0) return move;
  }
  return moves[0];
}

// ─────────────────────────────────────────────────────────────────
//  DUNGEON TURN RESOLUTION
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
    // Deduct MP and set cooldown
    state.playerMp = Math.max(0, state.playerMp - playerSkill.mpCost);
    if (playerSkill.cooldown > 0) {
      state.playerCooldowns[playerSkill.id] = playerSkill.cooldown;
    }

    // Calculate damage to monster
    const statMap: Record<string, number> = {
      strength: 30, agility: 25, intelligence: 28, luck: 15, speed: 20,
    };
    let baseStat = statMap[playerSkill.statBase] || 25;

    // Apply player buffs
    for (const fx of state.playerActiveEffects) {
      if (fx.kind === "str_up" && playerSkill.statBase === "strength") baseStat += fx.value;
      if (fx.kind === "agi_up" && playerSkill.statBase === "agility") baseStat += fx.value;
      if (fx.kind === "haste" && playerSkill.statBase === "speed") baseStat += fx.value;
    }

    let dmg = Math.floor(baseStat * 10 * playerSkill.attackPercent);

    // Crit check
    let critChance = 15;
    for (const fx of state.playerActiveEffects) {
      if (fx.kind === "crit_up") critChance += fx.value;
    }
    const crit = Math.random() * 100 < Math.min(critChance, 85);
    if (crit) { dmg = Math.floor(dmg * 1.5); logs.push(`💥 *CRITICAL HIT!*`); }

    // Monster defense
    dmg = Math.max(0, dmg - monster.defense);

    monster.hp = Math.max(0, monster.hp - dmg);
    logs.push(`⚔️ You used *${playerSkill.name}* → *${dmg}* damage to ${monster.emoji} ${monster.name}.`);

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
      logs.push(`✨ *${playerSkill.effect.kind}* applied to ${monster.name}.`);
    }

    // Lifesteal
    if (playerSkill.effect?.kind === "lifesteal" && dmg > 0) {
      const healed = Math.floor(dmg * playerSkill.effect.value);
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healed);
      logs.push(`🩸 You leeched *${healed} HP*.`);
    }
  } else {
    logs.push(`😴 You are stunned/frozen and lose your turn!`);
    // Remove stun after consuming it
    state.playerActiveEffects = state.playerActiveEffects.filter(
      (fx: any) => fx.kind !== "stun" && fx.kind !== "freeze"
    );
  }

  // ── Check monster death ────────────────────────────────────────
  if (monster.hp <= 0) {
    logs.push(`\n💀 ${monster.emoji} *${monster.name}* has been defeated!`);
    return { logs, playerDied: false, monsterDied: true, newState: state };
  }

  // ── Monster applies DoT effects first ─────────────────────────
  for (const fx of state.monsterActiveEffects) {
    if (fx.kind === "burn" || fx.kind === "bleed") {
      monster.hp = Math.max(0, monster.hp - fx.value);
      logs.push(`🔥 ${monster.name} takes ${fx.value} ${fx.kind} damage. HP: ${monster.hp}`);
      if (monster.hp <= 0) {
        logs.push(`💀 ${monster.emoji} *${monster.name}* perished from ${fx.kind}!`);
        return { logs, playerDied: false, monsterDied: true, newState: state };
      }
    }
  }

  // ── Monster attacks player ─────────────────────────────────────
  const monsterStunned = state.monsterActiveEffects.some(
    (fx: any) => fx.kind === "stun" || fx.kind === "freeze"
  );

  if (!monsterStunned) {
    // Check if enraged
    const hpPercent = (monster.hp / monster.maxHp) * 100;
    const isEnraged = !!(monster.enrageAt && hpPercent <= monster.enrageAt);

    if (isEnraged && monster.enrageMoves) {
      logs.push(`💢 *${monster.name} ENRAGES!* [${Math.floor(hpPercent)}% HP]`);
    }

    const move = pickMonsterMove(monster, isEnraged);

    // Check if player is silenced (monster can silence player)
    const playerSilenced = state.playerActiveEffects.some((fx: any) => fx.kind === "silence");
    if (playerSilenced && move.damage === 0) {
      logs.push(`🔇 ${monster.name} tries ${move.name} but you resist!`);
    } else {
      let mDmg = move.damage;

      // Monster speed vs player (simple dodge check using player agility)
      const dodgeChance = Math.min(15, 5); // flat 5% base dodge in dungeon
      if (Math.random() * 100 < dodgeChance) {
        logs.push(`💨 You dodged *${move.name}*!`);
      } else {
        state.playerHp = Math.max(0, state.playerHp - mDmg);
        logs.push(`${move.emoji} ${monster.name} uses *${move.name}* → *${mDmg}* damage to you.`);

        // Apply monster move effect to player
        if (move.effect) {
          state.playerActiveEffects = state.playerActiveEffects.filter(
            (fx: any) => fx.kind !== move.effect!.kind
          );
          if (move.effect.kind === "mp_drain") {
            const drained = Math.min(move.effect.value, state.playerMp);
            state.playerMp = Math.max(0, state.playerMp - drained);
            logs.push(`🌀 ${monster.name} drained *${drained} MP* from you!`);
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
    }
  } else {
    logs.push(`😴 ${monster.name} is stunned and loses their turn!`);
    state.monsterActiveEffects = state.monsterActiveEffects.filter(
      (fx: any) => fx.kind !== "stun" && fx.kind !== "freeze"
    );
  }

  // ── Player DoT/regen effects ───────────────────────────────────
  for (const fx of state.playerActiveEffects) {
    if (fx.kind === "burn" || fx.kind === "bleed") {
      state.playerHp = Math.max(0, state.playerHp - fx.value);
      logs.push(`🔥 You take ${fx.value} ${fx.kind} damage. HP: ${state.playerHp}`);
    }
    if (fx.kind === "regen") {
      const healed = Math.min(fx.value, state.playerMaxHp - state.playerHp);
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + fx.value);
      if (healed > 0) logs.push(`💚 You regenerate ${healed} HP.`);
    }
  }

  // ── Tick effect durations ──────────────────────────────────────
  state.playerActiveEffects = state.playerActiveEffects.filter((fx: any) => {
    if (fx.duration === 999) return true;
    fx.turnsLeft--;
    return fx.turnsLeft > 0;
  });
  state.monsterActiveEffects = state.monsterActiveEffects.filter((fx: any) => {
    fx.turnsLeft--;
    return fx.turnsLeft > 0;
  });

  // ── Tick player cooldowns ──────────────────────────────────────
  for (const key of Object.keys(state.playerCooldowns)) {
    state.playerCooldowns[key]--;
    if (state.playerCooldowns[key] <= 0) delete state.playerCooldowns[key];
  }

  // ── MP passive regen ───────────────────────────────────────────
  state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 10);

  state.turn++;

  // ── Check player death ─────────────────────────────────────────
  if (state.playerHp <= 0) {
    logs.push(`\n💀 *You have fallen in the dungeon...*`);
    return { logs, playerDied: true, monsterDied: false, newState: state };
  }

  return { logs, playerDied: false, monsterDied: false, newState: state };
}

// ─────────────────────────────────────────────────────────────────
//  HP/MP BAR FOR DUNGEON UI
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
  const enrageWarning = monster.enrageAt && hpPercent <= monster.enrageAt + 10 && hpPercent > monster.enrageAt
    ? `\n  ⚠️ *Enrage incoming!*`
    : monster.enrageAt && hpPercent <= monster.enrageAt
    ? `\n  💢 *ENRAGED!*`
    : "";

  return (
    `⚔️ *FLOOR ${state.floor} — TURN ${state.turn}*\n\n` +
    `👤 *You*\n` +
    `HP: [${pHpBar}] ${state.playerHp}/${state.playerMaxHp}\n` +
    `MP: [${pMpBar}] ${state.playerMp}/${state.playerMaxMp}\n` +
    (playerEffects ? `Effects: ${playerEffects}\n` : "") +
    `\n${monster.emoji} *${monster.name}*\n` +
    `HP: [${mHpBar}] ${monster.hp}/${monster.maxHp}${enrageWarning}\n` +
    (monsterEffects ? `Effects: ${monsterEffects}\n` : "")
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
