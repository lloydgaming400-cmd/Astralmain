// ══════════════════════════════════════════════════════════════════
//  DUNGEON ENGINE — Astral Bot
//  Tower of Ascension — 100 Floors (10 Arcs × 10 Floors)
// ══════════════════════════════════════════════════════════════════

import { makeBar, type Skill } from './battle';

// ─────────────────────────────────────────────────────────────────
//  ARC DATA IMPORTS
//  ► Create folder: server/dungeon/
//  ► Place arc1.ts–arc10.ts and types.ts inside it
// ─────────────────────────────────────────────────────────────────

import arc1  from './dungeon/arc1';
import arc2  from './dungeon/arc2';
import arc3  from './dungeon/arc3';
import arc4  from './dungeon/arc4';
import arc5  from './dungeon/arc5';
import arc6  from './dungeon/arc6';
import arc7  from './dungeon/arc7';
import arc8  from './dungeon/arc8';
import arc9  from './dungeon/arc9';
import arc10 from './dungeon/arc10';
import type { ArcData } from './dungeon/types';

// ─────────────────────────────────────────────────────────────────
//  ARC REGISTRY
// ─────────────────────────────────────────────────────────────────

const ARCS: Record<number, ArcData> = {
  1: arc1, 2: arc2, 3: arc3, 4: arc4, 5: arc5,
  6: arc6, 7: arc7, 8: arc8, 9: arc9, 10: arc10,
};

function getArcForFloor(floor: number): ArcData {
  return ARCS[Math.min(Math.ceil(floor / 10), 10)];
}

function getFloorInArc(floor: number): number {
  return ((floor - 1) % 10) + 1;
}

function isBossFloor(floor: number): boolean {
  return floor % 10 === 0;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────────────────────────
//  ARC NAME LOOKUP
// ─────────────────────────────────────────────────────────────────

export const ARC_NAMES = [
  "The Forsaken Gate",
  "Tomb of the Ancients",
  "The Bleeding Maze",
  "Ashfall Caverns",
  "The Void Between",
  "Dominion of Shadows",
  "The Celestial Prison",
  "Realm of Shattered Kings",
  "The Edge of Everything",
  "The Sovereign's Throne",
] as const;

export function getArcName(arcNum: number): string {
  return ARC_NAMES[arcNum - 1] ?? `Arc ${arcNum}`;
}

// ─────────────────────────────────────────────────────────────────
//  EXPORTED TYPES  (bot.ts imports these)
// ─────────────────────────────────────────────────────────────────

export interface MonsterMove {
  name: string;
  emoji: string;
  damage: number;
  mpCost: number;
  weight: number;
  effect?: {
    kind: string;
    value: number;
    duration: number;
  };
  taunt?: string;
}

export interface Monster {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  isBoss: boolean;
  lore: string;
  moves: MonsterMove[];
  enrageAt?: number;
  enrageMoves?: MonsterMove[];
  entranceMonologue?: string[];
  deathMonologue?: string;
  playerKillTaunt?: string;
  reactToHeavyHit?: string[];
  reactToLightHit?: string[];
  reactToHeal?: string[];
  reactToPlayerLow?: string[];
  reactToBossLow?: string[];
  midBattleThoughts?: string[];
  enrageLines?: string[];
}

export interface DungeonState {
  phoneId: string;
  floor: number;
  // ── New 100-floor fields ──
  arc: number;
  arcName: string;
  wave: number;
  totalWaves: number;
  isBossWave: boolean;
  wavesCleared: number;
  bossEntranceDone: boolean;
  lastBossThinkTurn: number;
  lastPlayerDmg: number;
  lastPlayerSkillName: string;
  lastPlayerSkillKind: string;
  // ── Core fields ──
  monster: Monster;
  playerHp: number;
  playerMp: number;
  playerMaxHp: number;
  playerMaxMp: number;
  playerStats: any;
  playerActiveEffects: any[];
  playerCooldowns: Record<string, number>;
  monsterActiveEffects: any[];
  turn: number;
  xpEarned: number;
  noDeathRun: boolean;
  phase: "active" | "ended";
  chatId: string;
  turnTimer: ReturnType<typeof setTimeout> | null;
  playerStreak: number;
}

export interface FloorReward {
  xp: number;
  item?: string;
  statGains: { str: number; agi: number; int: number; lck: number; spd: number };
  message: string;
}

export interface DungeonTurnResult {
  logs: string[];
  playerDied: boolean;
  monsterDied: boolean;
  newState: DungeonState;
}

export interface WaveAdvanceResult {
  narration: string;
  bossEntrance?: string[];
  newState: DungeonState;
}

// ─────────────────────────────────────────────────────────────────
//  MONSTER BUILDERS
// ─────────────────────────────────────────────────────────────────

function buildMonster(floor: number): Monster {
  const arc      = getArcForFloor(floor);
  const floorKey = getFloorInArc(floor);
  const isBoss   = isBossFloor(floor);

  if (isBoss) {
    const b = arc.boss;
    return {
      id: b.id, name: b.name, emoji: b.emoji,
      hp: b.maxHp, maxHp: b.maxHp,
      mp: b.maxMp, maxMp: b.maxMp,
      attack: b.attack, defense: b.defense, speed: b.speed,
      isBoss: true, lore: b.lore,
      moves: b.moves,
      enrageAt: b.enrageAt,
      enrageMoves: b.enrageMoves,
      entranceMonologue: b.entranceMonologue,
      deathMonologue: b.deathMonologue,
      playerKillTaunt: b.playerKillTaunt,
      reactToHeavyHit: b.reactToHeavyHit,
      reactToLightHit: b.reactToLightHit,
      reactToHeal: b.reactToHeal,
      reactToPlayerLow: b.reactToPlayerLow,
      reactToBossLow: b.reactToBossLow,
      midBattleThoughts: b.midBattleThoughts,
      enrageLines: b.enrageLines,
    };
  }

  const mob = arc.mobs[floorKey];
  if (!mob) throw new Error(`No mob for floor ${floor} (arc floor ${floorKey})`);
  const scale = 1 + (floor - 1) * 0.012;
  return {
    id: mob.id, name: mob.name, emoji: mob.emoji,
    hp:      Math.floor(mob.maxHp  * scale),
    maxHp:   Math.floor(mob.maxHp  * scale),
    mp:      mob.maxMp, maxMp: mob.maxMp,
    attack:  Math.floor(mob.attack  * scale),
    defense: Math.floor(mob.defense * scale),
    speed:   mob.speed,
    isBoss: false, lore: mob.lore,
    moves: mob.moves,
  };
}

function buildMobWaveMonster(floor: number, wave: number): Monster {
  const arc      = getArcForFloor(floor);
  const floorKey = getFloorInArc(floor);
  const mobKey   = wave === 1 ? Math.max(1, floorKey - 1) : Math.max(1, floorKey - 2);
  const keys     = Object.keys(arc.mobs).map(Number);
  const fallback = arc.mobs[Math.max(...keys.filter(k => k < floorKey))] ?? arc.mobs[keys[0]];
  const mob      = arc.mobs[mobKey] ?? fallback;
  const scale    = 1 + (floor - 1) * 0.012;
  return {
    id: mob.id, name: mob.name, emoji: mob.emoji,
    hp:      Math.floor(mob.maxHp  * scale * 0.85),
    maxHp:   Math.floor(mob.maxHp  * scale * 0.85),
    mp:      mob.maxMp, maxMp: mob.maxMp,
    attack:  Math.floor(mob.attack  * scale),
    defense: Math.floor(mob.defense * scale),
    speed:   mob.speed,
    isBoss: false, lore: mob.lore,
    moves: mob.moves,
  };
}

// ─────────────────────────────────────────────────────────────────
//  getMonsterForFloor — called by bot.ts to init dungeon
// ─────────────────────────────────────────────────────────────────

export function getMonsterForFloor(floor: number): Monster {
  if (isBossFloor(floor)) return buildMobWaveMonster(floor, 1);
  return buildMonster(floor);
}

// ─────────────────────────────────────────────────────────────────
//  FLOOR REWARDS
// ─────────────────────────────────────────────────────────────────

export function getFloorReward(floor: number, noDeath: boolean): FloorReward {
  const isBoss = isBossFloor(floor);
  const base   = isBoss ? floor * 12 : floor * 5;
  const xp     = base + (noDeath ? Math.floor(base * 0.25) : 0);

  const itemDrops: Record<number, { item: string; chance: number }> = {
    10:  { item: "cursed coin",   chance: 0.80 },
    20:  { item: "star dust",     chance: 0.70 },
    30:  { item: "eclipse stone", chance: 0.55 },
    40:  { item: "vampire tooth", chance: 0.50 },
    50:  { item: "void fragment", chance: 0.45 },
    60:  { item: "living core",   chance: 0.50 },
    70:  { item: "dragon egg",    chance: 0.55 },
    80:  { item: "void fragment", chance: 0.65 },
    90:  { item: "living core",   chance: 0.70 },
    100: { item: "void fragment", chance: 1.00 },
  };

  const drop = itemDrops[floor];
  let item: string | undefined;
  if (drop && Math.random() < drop.chance) {
    item = drop.item;
  } else if (!isBoss && floor >= 5 && Math.random() < 0.10) {
    item = "cursed coin";
  } else if (!isBoss && floor >= 3 && Math.random() < 0.08) {
    item = "grey rot cure";
  }

  const statPool = Math.max(1, Math.floor(floor / 8));
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

  const arc      = getArcForFloor(floor);
  const floorMsg = floor === 100
    ? `👑 *THE SOVEREIGN'S TOWER IS CONQUERED!*`
    : isBoss
    ? `⚔️ *${arc.boss.name} defeated! Arc ${Math.ceil(floor / 10)} cleared!*`
    : `✅ *Floor ${floor} cleared!*`;

  return {
    xp,
    item,
    statGains,
    message:
      `${floorMsg}\n` +
      `💰 XP Earned: *+${xp}*${noDeath ? " (×1.25 no-death bonus!)" : ""}\n` +
      (item ? `🎁 Item Drop: *${item}*!\n` : "") +
      (statParts.length ? `📈 Stat Gains: ${statParts.join("  ")}\n` : "") +
      (floor < 100 ? `⬆️ Proceeding to floor ${floor + 1}...` : ""),
  };
}

// ─────────────────────────────────────────────────────────────────
//  MONSTER AI
// ─────────────────────────────────────────────────────────────────

function pickMonsterMove(
  monster: Monster,
  isEnraged: boolean,
  playerHpPercent: number,
  playerMp: number,
  monsterEffects: any[],
): MonsterMove {
  const isSilenced = monsterEffects.some((e: any) => e.kind === 'silence' && e.turnsLeft > 0);
  let pool: MonsterMove[] = isEnraged && monster.enrageMoves?.length
    ? monster.enrageMoves!
    : monster.moves;
  if (isSilenced) pool = pool.filter(m => m.mpCost === 0);
  if (!pool.length) pool = monster.moves.filter(m => m.mpCost === 0);
  if (!pool.length) pool = monster.moves;

  if (monster.isBoss) {
    if (playerMp > 60) {
      const drainer = pool.find(m => m.effect?.kind === 'mp_drain');
      if (drainer && Math.random() < 0.40) return drainer;
    }
    if (playerHpPercent < 30) {
      const heavy = [...pool].sort((a, b) => b.damage - a.damage)[0];
      if (heavy && Math.random() < 0.50) return heavy;
    }
  }
  const hpPct = (monster.hp / monster.maxHp) * 100;
  if (hpPct < 30) {
    const healer = pool.find(m => m.effect?.kind === 'regen' && m.damage === 0);
    if (healer && Math.random() < 0.55) return healer;
  }

  const total = pool.reduce((s, m) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const m of pool) { r -= m.weight; if (r <= 0) return m; }
  return pool[pool.length - 1];
}

// ─────────────────────────────────────────────────────────────────
//  BOSS REACTION
// ─────────────────────────────────────────────────────────────────

function getBossReaction(
  monster: Monster,
  dmgDealt: number,
  turn: number,
  playerHpPercent: number,
): string | null {
  if (!monster.isBoss) return null;
  const hpPct  = (monster.hp / monster.maxHp) * 100;
  const dmgPct = (dmgDealt / monster.maxHp) * 100;
  if (dmgPct >= 8   && monster.reactToHeavyHit?.length)  return pick(monster.reactToHeavyHit);
  if (dmgPct < 2    && dmgDealt > 0 && monster.reactToLightHit?.length) return pick(monster.reactToLightHit);
  if (playerHpPercent < 25 && monster.reactToPlayerLow?.length) return pick(monster.reactToPlayerLow);
  if (hpPct < 30    && monster.reactToBossLow?.length)   return pick(monster.reactToBossLow);
  if (turn % 3 === 0 && monster.midBattleThoughts?.length) return pick(monster.midBattleThoughts);
  return null;
}

// ─────────────────────────────────────────────────────────────────
//  TURN RESOLUTION
// ─────────────────────────────────────────────────────────────────

export function resolveDungeonTurn(
  state: DungeonState,
  playerSkill: Skill,
): DungeonTurnResult {
  const logs: string[] = [];
  const monster = state.monster;

  // ── Player attacks ────────────────────────────────────────────
  const playerStunned = state.playerActiveEffects.some(
    (fx: any) => fx.kind === "stun" || fx.kind === "freeze"
  );
  let playerDmgDealt = 0;

  if (!playerStunned) {
    state.playerMp = Math.max(0, state.playerMp - playerSkill.mpCost);
    if (playerSkill.cooldown > 0) state.playerCooldowns[playerSkill.id] = playerSkill.cooldown;

    const pStats = state.playerStats;
    let primaryStat = pStats?.strength || 30;
    if (playerSkill.statBase === "agility")      primaryStat = pStats?.agility || 25;
    if (playerSkill.statBase === "intelligence") primaryStat = pStats?.intelligence || 28;
    if (playerSkill.statBase === "luck")         primaryStat = pStats?.luck || 15;
    if (playerSkill.statBase === "speed")        primaryStat = pStats?.speed || 20;

    for (const fx of state.playerActiveEffects) {
      if (fx.kind === "str_up" && playerSkill.statBase === "strength") primaryStat += fx.value;
      if (fx.kind === "agi_up" && playerSkill.statBase === "agility")  primaryStat += fx.value;
      if (fx.kind === "haste"  && playerSkill.statBase === "speed")    primaryStat += fx.value;
    }

    const strContrib = Math.floor((pStats?.strength || 30) * 0.25);
    let dmg = Math.floor(primaryStat * 1.8 * (1 + playerSkill.attackPercent) + strContrib);
    dmg = Math.max(10, dmg - Math.floor(monster.defense * 0.5));
    dmg = Math.floor(dmg * (1 + (Math.random() * 0.30 - 0.15)));

    if (state.playerStreak >= 2) {
      const bonus = Math.min(state.playerStreak, 5) * 0.05;
      dmg = Math.floor(dmg * (1 + bonus));
      if (state.playerStreak >= 3) logs.push(`🔥 *${state.playerStreak}-hit streak!* Damage boosted!`);
    }

    let critChance = 10 + (pStats?.luck ? Math.floor(pStats.luck / 6) : 0);
    for (const fx of state.playerActiveEffects) {
      if (fx.kind === "crit_up") critChance += fx.value;
    }
    const crit = Math.random() * 100 < Math.min(critChance, 75);
    if (crit) { dmg = Math.floor(dmg * 1.6); logs.push(`💥 *CRITICAL HIT!*`); }
    dmg = crit ? Math.max(15, Math.min(900, dmg)) : Math.max(15, Math.min(600, dmg));

    monster.hp = Math.max(0, monster.hp - dmg);
    playerDmgDealt = dmg;
    state.lastPlayerDmg       = dmg;
    state.lastPlayerSkillName = playerSkill.name;
    state.lastPlayerSkillKind = playerSkill.statBase;
    state.playerStreak        = (state.playerStreak || 0) + 1;

    logs.push(`⚔️ You used *${playerSkill.name}* → *${dmg}* damage to ${monster.emoji} *${monster.name}*.`);

    if (playerSkill.effect && playerSkill.effect.target === "opponent") {
      state.monsterActiveEffects = state.monsterActiveEffects.filter(
        (fx: any) => fx.kind !== playerSkill.effect!.kind
      );
      if (playerSkill.effect.kind === "mp_drain") {
        const drained = Math.min(playerSkill.effect.value, monster.mp);
        monster.mp = Math.max(0, monster.mp - drained);
        logs.push(`🌀 *${playerSkill.name}* drained *${drained} MP* from ${monster.name}.`);
      } else {
        state.monsterActiveEffects.push({
          kind: playerSkill.effect.kind,
          value: playerSkill.effect.value,
          turnsLeft: playerSkill.effect.duration,
          source: playerSkill.name,
        });
        logs.push(`✨ *${playerSkill.effect.kind}* applied to *${monster.name}* for ${playerSkill.effect.duration} turn(s).`);
      }
    }

    if (playerSkill.effect && playerSkill.effect.target === "self" && playerSkill.effect.kind !== "lifesteal") {
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

    if (playerSkill.effect?.kind === "lifesteal" && dmg > 0) {
      const healed = Math.floor(dmg * playerSkill.effect.value);
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healed);
      logs.push(`🩸 You leeched *${healed} HP*.`);
    }

  } else {
    logs.push(`😴 You are stunned/frozen and lose your turn!`);
    state.playerActiveEffects = state.playerActiveEffects.filter(
      (fx: any) => fx.kind !== "stun" && fx.kind !== "freeze"
    );
    state.playerStreak = 0;
  }

  // ── Monster DoT ───────────────────────────────────────────────
  for (const fx of state.monsterActiveEffects) {
    if ((fx.kind === "burn" || fx.kind === "bleed") && fx.turnsLeft > 0) {
      monster.hp = Math.max(0, monster.hp - fx.value);
      logs.push(`🔥 *${monster.name}* takes *${fx.value}* ${fx.kind} damage. HP: ${monster.hp}`);
      if (monster.hp <= 0) {
        logs.push(`💀 ${monster.emoji} *${monster.name}* perished from ${fx.kind}!`);
        return { logs, playerDied: false, monsterDied: true, newState: state };
      }
    }
    if (fx.kind === "regen" && fx.turnsLeft > 0) {
      const h = Math.min(fx.value, monster.maxHp - monster.hp);
      monster.hp = Math.min(monster.maxHp, monster.hp + fx.value);
      if (h > 0) logs.push(`💚 *${monster.name}* regenerates *${h} HP*. HP: ${monster.hp}`);
    }
  }

  // ── Monster death ─────────────────────────────────────────────
  if (monster.hp <= 0) {
    if (monster.isBoss && monster.deathMonologue) {
      logs.push(`\n${monster.deathMonologue}`);
    } else {
      logs.push(`\n💀 ${monster.emoji} *${monster.name}* has been defeated!`);
    }
    return { logs, playerDied: false, monsterDied: true, newState: state };
  }

  // ── Enrage / reaction ─────────────────────────────────────────
  const hpPct     = (monster.hp / monster.maxHp) * 100;
  const isEnraged = !!(monster.enrageAt && hpPct <= monster.enrageAt);
  if (isEnraged && monster.enrageLines?.length && state.turn % 5 === 0) {
    logs.push(pick(monster.enrageLines));
  }
  if (monster.isBoss && playerDmgDealt > 0) {
    const pHpPct = (state.playerHp / state.playerMaxHp) * 100;
    const react  = getBossReaction(monster, playerDmgDealt, state.turn, pHpPct);
    if (react && state.turn !== state.lastBossThinkTurn) {
      logs.push(`\n${react}`);
      state.lastBossThinkTurn = state.turn;
    }
  }

  // ── Monster attacks ───────────────────────────────────────────
  const monsterStunned = state.monsterActiveEffects.some(
    (fx: any) => (fx.kind === "stun" || fx.kind === "freeze") && fx.turnsLeft > 0
  );

  if (!monsterStunned) {
    const pHpPct = (state.playerHp / state.playerMaxHp) * 100;
    const move   = pickMonsterMove(monster, isEnraged, pHpPct, state.playerMp, state.monsterActiveEffects);

    let dodgeChance = 5 + Math.floor((state.playerStats?.agility || 15) / 18);
    for (const fx of state.playerActiveEffects) {
      if (fx.kind === "dodge_up") dodgeChance += fx.value;
      if (fx.kind === "slow")     dodgeChance = Math.max(2, dodgeChance - 8);
    }
    dodgeChance = Math.min(dodgeChance, 45);

    if (Math.random() * 100 < dodgeChance) {
      logs.push(`💨 You dodged *${move.name}*!`);
    } else {
      let mDmg = move.damage;
      if (isEnraged) mDmg = Math.floor(mDmg * 1.2);

      let shield = 0;
      for (const fx of state.playerActiveEffects) {
        if (fx.kind === "shield") shield += fx.value;
      }
      if (shield > 0) {
        const absorbed = Math.min(shield, mDmg);
        mDmg = Math.max(0, mDmg - absorbed);
        if (absorbed > 0) logs.push(`🛡️ Your shield absorbed *${absorbed}* damage!`);
      }

      state.playerHp = Math.max(0, state.playerHp - mDmg);
      if (move.taunt) logs.push(move.taunt);
      logs.push(`${move.emoji} *${monster.name}* uses *${move.name}* → *${mDmg}* damage to you.`);

      if (move.effect) {
        if (move.effect.kind === "mp_drain") {
          const drained = Math.min(move.effect.value, state.playerMp);
          state.playerMp = Math.max(0, state.playerMp - drained);
          logs.push(`🌀 *${monster.name}* drained *${drained} MP* from you!`);
        } else {
          state.playerActiveEffects = state.playerActiveEffects.filter(
            (fx: any) => fx.kind !== move.effect!.kind
          );
          state.playerActiveEffects.push({
            kind: move.effect.kind,
            value: move.effect.value,
            turnsLeft: move.effect.duration,
            source: move.name,
          });
          logs.push(`⚠️ You are afflicted with *${move.effect.kind}* for ${move.effect.duration} turn(s).`);
        }
      }
      state.playerStreak = 0;
    }
  } else {
    logs.push(`😴 *${monster.name}* is stunned and loses their turn!`);
    state.monsterActiveEffects = state.monsterActiveEffects.filter(
      (fx: any) => fx.kind !== "stun" && fx.kind !== "freeze"
    );
  }

  // ── Player DoT / regen ────────────────────────────────────────
  for (const fx of state.playerActiveEffects) {
    if ((fx.kind === "burn" || fx.kind === "bleed") && fx.turnsLeft > 0) {
      state.playerHp = Math.max(0, state.playerHp - fx.value);
      logs.push(`🔥 You take *${fx.value}* ${fx.kind} damage. HP: ${state.playerHp}`);
    }
    if (fx.kind === "regen" && fx.turnsLeft > 0) {
      const h = Math.min(fx.value, state.playerMaxHp - state.playerHp);
      state.playerHp = Math.min(state.playerMaxHp, state.playerHp + fx.value);
      if (h > 0) logs.push(`💚 You regenerate *${h} HP*. HP: ${state.playerHp}`);
    }
  }

  // ── Tick ──────────────────────────────────────────────────────
  state.playerActiveEffects = state.playerActiveEffects.filter((fx: any) => {
    if (fx.duration === 999 || fx.turnsLeft === undefined) return true;
    fx.turnsLeft--;
    return fx.turnsLeft > 0;
  });
  state.monsterActiveEffects = state.monsterActiveEffects.filter((fx: any) => {
    fx.turnsLeft--;
    return fx.turnsLeft > 0;
  });
  for (const key of Object.keys(state.playerCooldowns)) {
    state.playerCooldowns[key]--;
    if (state.playerCooldowns[key] <= 0) delete state.playerCooldowns[key];
  }
  state.playerMp = Math.min(state.playerMaxMp, state.playerMp + 12);
  state.turn++;

  if (state.playerHp <= 0) {
    if (monster.isBoss && monster.playerKillTaunt) {
      logs.push(`\n${monster.playerKillTaunt}`);
    } else {
      logs.push(`\n💀 *You have fallen in the tower...*`);
    }
    return { logs, playerDied: true, monsterDied: false, newState: state };
  }

  return { logs, playerDied: false, monsterDied: false, newState: state };
}

// ─────────────────────────────────────────────────────────────────
//  WAVE ADVANCE (boss floors have 3 waves: 2 mobs + 1 boss)
// ─────────────────────────────────────────────────────────────────

export function advanceDungeonWave(state: DungeonState): WaveAdvanceResult {
  state.wavesCleared++;
  state.wave++;
  state.monsterActiveEffects = [];
  state.turn = 1;
  state.playerStreak = 0;
  state.lastPlayerDmg = 0;

  const arc        = getArcForFloor(state.floor);
  const isBossWave = state.wave >= state.totalWaves;

  if (isBossWave) {
    const boss       = buildMonster(state.floor);
    state.monster    = boss;
    state.isBossWave = true;
    const floorNarr  = arc.floorNarrations[state.floor] ?? '';
    const entrance   = boss.entranceMonologue ?? [];
    return { narration: floorNarr, bossEntrance: entrance, newState: state };
  } else {
    state.monster    = buildMobWaveMonster(state.floor, state.wave);
    state.isBossWave = false;
    const waveNarr   =
      `🌊 *Wave ${state.wave} of ${state.totalWaves} — ` +
      `${state.monster.emoji} **${state.monster.name}** appears!*\n${state.monster.lore}`;
    return { narration: waveNarr, newState: state };
  }
}

// ─────────────────────────────────────────────────────────────────
//  STATUS UI
// ─────────────────────────────────────────────────────────────────

export function formatDungeonStatus(state: DungeonState): string {
  const monster = state.monster;
  const pHpBar  = makeBar(state.playerHp, state.playerMaxHp);
  const pMpBar  = makeBar(state.playerMp, state.playerMaxMp);
  const mHpBar  = makeBar(monster.hp, monster.maxHp);

  const playerEffects = state.playerActiveEffects
    .filter((fx: any) => fx.duration !== 999 && fx.turnsLeft > 0)
    .map((fx: any) => `${fx.kind}(${fx.turnsLeft})`)
    .join(", ");
  const monsterEffects = state.monsterActiveEffects
    .filter((fx: any) => fx.turnsLeft > 0)
    .map((fx: any) => `${fx.kind}(${fx.turnsLeft})`)
    .join(", ");

  const hpPct = (monster.hp / monster.maxHp) * 100;
  const enrageWarning =
    monster.enrageAt && hpPct <= monster.enrageAt + 15 && hpPct > monster.enrageAt
      ? `\n  ⚠️ *Enrage incoming at ${monster.enrageAt}%!*`
      : monster.enrageAt && hpPct <= monster.enrageAt
      ? `\n  💢 *ENRAGED!*`
      : "";

  const streakLine = (state.playerStreak || 0) >= 2
    ? `\n  🔥 Streak: ${state.playerStreak} hit(s)!`
    : "";

  const waveInfo = state.totalWaves > 1
    ? `  🌊 Wave ${state.wave}/${state.totalWaves}${state.isBossWave ? " ⚠️ BOSS WAVE" : ""}\n`
    : "";

  return (
    `⚔️ *FLOOR ${state.floor} — TURN ${state.turn}*\n` +
    `📖 *Arc ${state.arc}: ${state.arcName}*\n` +
    waveInfo +
    `\n👤 *You*\n` +
    `HP: [${pHpBar}] ${state.playerHp}/${state.playerMaxHp}\n` +
    `MP: [${pMpBar}] ${state.playerMp}/${state.playerMaxMp}` +
    streakLine +
    (playerEffects ? `\n  ⚠️ Effects: ${playerEffects}` : "") +
    `\n\n${monster.emoji} *${monster.name}*${monster.isBoss ? " 👑 BOSS" : ""}\n` +
    `HP: [${mHpBar}] ${monster.hp}/${monster.maxHp}${enrageWarning}\n` +
    (monsterEffects ? `  Effects: ${monsterEffects}\n` : "")
  );
}

// ─────────────────────────────────────────────────────────────────
//  NARRATION HELPERS
// ─────────────────────────────────────────────────────────────────

export function getFloorNarration(floor: number): string {
  return getArcForFloor(floor).floorNarrations[floor] ?? '';
}

export function getArcEntryNarration(floor: number): string | null {
  if (getFloorInArc(floor) === 1) return getArcForFloor(floor).entryNarration;
  return null;
}

// ─────────────────────────────────────────────────────────────────
//  CREATE DUNGEON STATE
// ─────────────────────────────────────────────────────────────────

export function createDungeonState(
  phoneId: string,
  chatId: string,
  floor: number,
  stats: { maxHp: number; maxMp: number; [key: string]: any }
): DungeonState {
  const arc = Math.min(Math.ceil(floor / 10), 10);
  const arcName = getArcName(arc);
  const isBoss = isBossFloor(floor);
  const totalWaves = 1;
  const monster = getMonsterForFloor(floor);

  return {
    phoneId,
    chatId,
    floor,
    arc,
    arcName,
    wave: 1,
    totalWaves,
    isBossWave: isBoss,
    wavesCleared: 0,
    bossEntranceDone: false,
    lastBossThinkTurn: 0,
    lastPlayerDmg: 0,
    lastPlayerSkillName: "",
    lastPlayerSkillKind: "",
    monster,
    playerHp: stats.maxHp,
    playerMp: stats.maxMp,
    playerMaxHp: stats.maxHp,
    playerMaxMp: stats.maxMp,
    playerStats: stats,
    playerActiveEffects: [],
    playerCooldowns: {},
    monsterActiveEffects: [],
    turn: 0,
    xpEarned: 0,
    noDeathRun: true,
    phase: "active",
    turnTimer: null,
    playerStreak: 0,
  };
}

// ─────────────────────────────────────────────────────────────────
//  IN-MEMORY STORE
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
