// ══════════════════════════════════════════════════════════════════
//  BATTLE ENGINE — Astral Bot
//  Solo Leveling inspired combat system
// ══════════════════════════════════════════════════════════════════

import { type User } from "@shared/schema";

// ─────────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────────

export type SkillRank = "D" | "C" | "B" | "A" | "S";
export type SkillType = "active" | "passive";
export type StatType = "strength" | "agility" | "intelligence" | "luck" | "speed";

export interface Skill {
  id: string;
  name: string;
  rank: SkillRank;
  type: SkillType;
  mpCost: number;
  cooldown: number;
  statBase: StatType;
  attackPercent: number;
  effect: SkillEffect | null;
  description: string;
}

export interface SkillEffect {
  kind:
    | "burn"
    | "freeze"
    | "bleed"
    | "stun"
    | "shield"
    | "haste"
    | "slow"
    | "regen"
    | "mp_drain"
    | "lifesteal"
    | "dodge_up"
    | "crit_up"
    | "str_up"
    | "agi_up"
    | "aoe_cleave"
    | "silence";
  value: number;
  duration: number;
  target: "self" | "opponent";
}

export interface BattleStats {
  strength: number;
  agility: number;
  intelligence: number;
  luck: number;
  speed: number;
  maxHp: number;
  maxMp: number;
}

export interface ActiveEffect {
  kind: SkillEffect["kind"];
  value: number;
  turnsLeft: number;
  source: string;
}

export interface Combatant {
  phoneId: string;
  name: string;
  stats: BattleStats;
  hp: number;
  mp: number;
  equippedActives: Skill[];
  equippedPassive: Skill | null;
  activeEffects: ActiveEffect[];
  cooldowns: Record<string, number>;
  battleExp: number;
}

export interface BattleState {
  id: string;
  challenger: Combatant;
  target: Combatant;
  turn: number;
  location: string;
  firstMoverId: string;
  phase: "waiting_challenger" | "waiting_target" | "resolving" | "ended";
  challengerSkillChoice: string | null;
  targetSkillChoice: string | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
  chatId: string;
  xpTransfer: number;
}

// ─────────────────────────────────────────────────────────────────
//  MP COST TABLE
// ─────────────────────────────────────────────────────────────────

export const RANK_MP_COST: Record<SkillRank, number> = {
  D: 10,
  C: 20,
  B: 35,
  A: 50,
  S: 75,
};

// ─────────────────────────────────────────────────────────────────
//  SKILL POOL
// ─────────────────────────────────────────────────────────────────

export const ALL_SKILLS: Skill[] = [
  // ── D RANK ────────────────────────────────────────────────────
  {
    id: "d_slash",
    name: "Shadow Slash",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.10,
    effect: null,
    description: "A swift dark slash. No frills.",
  },
  {
    id: "d_strike",
    name: "Iron Strike",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.12,
    effect: null,
    description: "Heavy-handed blow. Basic but reliable.",
  },
  {
    id: "d_dart",
    name: "Void Dart",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.10,
    effect: null,
    description: "A mana dart fired from the fingertips.",
  },
  {
    id: "d_jab",
    name: "Quick Jab",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.08,
    effect: { kind: "haste", value: 5, duration: 1, target: "self" },
    description: "Rapid hit + tiny speed boost for 1 turn.",
  },
  {
    id: "d_read",
    name: "Pattern Read",
    rank: "D",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0,
    effect: { kind: "dodge_up", value: 5, duration: 999, target: "self" },
    description: "Passive: +5% dodge for entire battle.",
  },
  {
    id: "d_tough",
    name: "Hardened Skin",
    rank: "D",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 15, duration: 999, target: "self" },
    description: "Passive: absorb flat 15 damage per hit.",
  },

  // ── C RANK ────────────────────────────────────────────────────
  {
    id: "c_ember",
    name: "Ember Fang",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.14,
    effect: { kind: "burn", value: 15, duration: 2, target: "opponent" },
    description: "Burns the target for 15 dmg/turn × 2.",
  },
  {
    id: "c_frost",
    name: "Frost Needle",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.12,
    effect: { kind: "slow", value: 10, duration: 2, target: "opponent" },
    description: "Slows opponent speed by 10 for 2 turns.",
  },
  {
    id: "c_rend",
    name: "Rend",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.16,
    effect: { kind: "bleed", value: 10, duration: 3, target: "opponent" },
    description: "Tears a wound. Bleeds 10 dmg/turn × 3.",
  },
  {
    id: "c_deflect",
    name: "Arcane Deflect",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "shield", value: 80, duration: 1, target: "self" },
    description: "Blocks up to 80 damage next hit.",
  },
  {
    id: "c_bloodlust",
    name: "Bloodlust",
    rank: "C",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 10, duration: 999, target: "self" },
    description: "Passive: +10% critical chance forever.",
  },
  {
    id: "c_shadow_step",
    name: "Shadow Step",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 2,
    statBase: "agility",
    attackPercent: 0.10,
    effect: { kind: "dodge_up", value: 20, duration: 2, target: "self" },
    description: "Evade and strike. +20% dodge for 2 turns.",
  },

  // ── B RANK ────────────────────────────────────────────────────
  {
    id: "b_void_wave",
    name: "Void Wave",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.20,
    effect: null,
    description: "A crushing wave of void energy. Pure damage.",
  },
  {
    id: "b_titan",
    name: "Titan Smash",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.22,
    effect: { kind: "stun", value: 0, duration: 1, target: "opponent" },
    description: "Crushing blow. Stuns opponent 1 turn.",
  },
  {
    id: "b_gale",
    name: "Gale Slash",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.18,
    effect: { kind: "haste", value: 15, duration: 2, target: "self" },
    description: "Lightning-fast strike. Speed +15 for 2 turns.",
  },
  {
    id: "b_drain",
    name: "Mana Drain",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.10,
    effect: { kind: "mp_drain", value: 40, duration: 1, target: "opponent" },
    description: "Siphons 40 MP from the opponent.",
  },
  {
    id: "b_regen",
    name: "Blood Pact",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "regen", value: 30, duration: 3, target: "self" },
    description: "Restore 30 HP/turn for 3 turns.",
  },
  {
    id: "b_predator",
    name: "Predator's Eye",
    rank: "B",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 15, duration: 999, target: "self" },
    description: "Passive: +15% crit. The prey never sees it coming.",
  },
  {
    id: "b_iron_will",
    name: "Iron Will",
    rank: "B",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 30, duration: 999, target: "self" },
    description: "Passive: absorb 30 flat damage per hit.",
  },
  {
    id: "b_silence",
    name: "Sealing Brand",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 4,
    statBase: "intelligence",
    attackPercent: 0.12,
    effect: { kind: "silence", value: 0, duration: 2, target: "opponent" },
    description: "Seals opponent skills for 2 turns. Only basic attacks.",
  },
  {
    id: "b_lifesteal",
    name: "Dark Leech",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 2,
    statBase: "strength",
    attackPercent: 0.18,
    effect: { kind: "lifesteal", value: 0.3, duration: 1, target: "self" },
    description: "Steal 30% of damage dealt as HP.",
  },

  // ── A RANK ────────────────────────────────────────────────────
  {
    id: "a_sovereign",
    name: "Sovereign's Wrath",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.30,
    effect: { kind: "str_up", value: 20, duration: 2, target: "self" },
    description: "Massive strike. STR +20 for 2 turns.",
  },
  {
    id: "a_phantom",
    name: "Phantom Flicker",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.25,
    effect: { kind: "dodge_up", value: 35, duration: 2, target: "self" },
    description: "Blink strike. Dodge +35% for 2 turns.",
  },
  {
    id: "a_comet",
    name: "Comet Fall",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.28,
    effect: { kind: "burn", value: 25, duration: 3, target: "opponent" },
    description: "Cosmic impact. Burns 25/turn × 3.",
  },
  {
    id: "a_shadow_army",
    name: "Shadow Army",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.35,
    effect: null,
    description: "Shadows converge. Heavy pure damage.",
  },
  {
    id: "a_resonance",
    name: "Domain Resonance",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.20,
    effect: { kind: "regen", value: 50, duration: 3, target: "self" },
    description: "Open a domain. Regen 50 HP/turn × 3.",
  },
  {
    id: "a_counter",
    name: "Abyss Counter",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.22,
    effect: { kind: "agi_up", value: 25, duration: 3, target: "self" },
    description: "Counter-strike. AGI +25 for 3 turns.",
  },
  {
    id: "a_soul_chain",
    name: "Soul Chain",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.18,
    effect: { kind: "freeze", value: 0, duration: 1, target: "opponent" },
    description: "Binds the soul. Target skips next turn.",
  },
  {
    id: "a_undying",
    name: "Undying Flame",
    rank: "A",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "regen", value: 20, duration: 999, target: "self" },
    description: "Passive: Regen 20 HP every turn forever.",
  },
  {
    id: "a_death_touch",
    name: "Death Touch",
    rank: "A",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 25, duration: 999, target: "self" },
    description: "Passive: +25% crit. Death rides every strike.",
  },

  // ── S RANK ────────────────────────────────────────────────────
  {
    id: "s_arise",
    name: "ARISE",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.50,
    effect: { kind: "lifesteal", value: 0.5, duration: 1, target: "self" },
    description: "The hunter's ultimate. 50% damage as HP. Massive strike.",
  },
  {
    id: "s_void_ruler",
    name: "Void Ruler's Decree",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.45,
    effect: { kind: "silence", value: 0, duration: 3, target: "opponent" },
    description: "The ruler speaks. Silences foe 3 turns. Heavy INT damage.",
  },
  {
    id: "s_thousand_cuts",
    name: "Thousand Cuts",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.40,
    effect: { kind: "bleed", value: 30, duration: 4, target: "opponent" },
    description: "Blades everywhere. Bleeds 30/turn × 4.",
  },
  {
    id: "s_domain",
    name: "Infinite Domain",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.55,
    effect: { kind: "str_up", value: 50, duration: 3, target: "self" },
    description: "Reality bends. STR +50 for 3 turns. Enormous damage.",
  },
  {
    id: "s_reaper",
    name: "Reaper's Harvest",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.48,
    effect: { kind: "mp_drain", value: 75, duration: 1, target: "opponent" },
    description: "Drains all strength and 75 opponent MP.",
  },
  {
    id: "s_monarch",
    name: "Monarch's Bloodline",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "str_up", value: 40, duration: 999, target: "self" },
    description: "Passive: Monarch blood. STR +40 always.",
  },
  {
    id: "s_absolute_defense",
    name: "Absolute Defense",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 80, duration: 999, target: "self" },
    description: "Passive: Absorb 80 flat damage per hit.",
  },
  {
    id: "s_cursed_luck",
    name: "Cursed Luck",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 40, duration: 999, target: "self" },
    description: "Passive: +40% crit. Cursed by fortune itself.",
  },
];

// ─────────────────────────────────────────────────────────────────
//  RANK → SKILL UNLOCK TIER MAP
// ─────────────────────────────────────────────────────────────────

export function getUnlockedSkillRanks(botRank: number): SkillRank[] {
  const unlocks: SkillRank[] = ["D"];
  if (botRank <= 7) unlocks.push("C");
  if (botRank <= 6) unlocks.push("B");
  if (botRank <= 5) unlocks.push("A");
  if (botRank <= 4) unlocks.push("S");
  return unlocks;
}

export function getUnlockedSkills(botRank: number): Skill[] {
  const ranks = getUnlockedSkillRanks(botRank);
  return ALL_SKILLS.filter(s => ranks.includes(s.rank));
}

// ─────────────────────────────────────────────────────────────────
//  SPECIES STAT BONUSES
// ─────────────────────────────────────────────────────────────────

const SPECIES_BONUSES: Record<string, Partial<BattleStats>> = {
  Human:          { luck: 5 },
  Demon:          { strength: 10 },
  "Beast Clan":   { agility: 12, strength: 5 },
  "Fallen Angel": { intelligence: 10, agility: 5 },
  Undead:         { strength: 8, luck: 8 },
  Spirit:         { intelligence: 15, speed: 5 },
  Elf:            { agility: 15, intelligence: 5 },
  Dragon:         { strength: 20, maxHp: 50 },
  Celestial:      { intelligence: 20, speed: 10 },
  Constellation:  { strength: 25, intelligence: 25, agility: 25, luck: 25, speed: 25 },
};

// ─────────────────────────────────────────────────────────────────
//  STAT SCALING
// ─────────────────────────────────────────────────────────────────

export function computeStats(user: User, battleExp: number): BattleStats {
  const botRank = user.rank;
  const xpScale = Math.floor(user.xp / 1000);
  const rankBonus = (8 - botRank) * 10;
  const bExpScale = Math.floor(battleExp / 50) * 3;

  // Per-battle permanent stat gains (stored on user)
  const strBonus = (user as any).strBonus || 0;
  const agiBonus = (user as any).agiBonus || 0;
  const intBonus = (user as any).intBonus || 0;
  const lckBonus = (user as any).lckBonus || 0;
  const spdBonus = (user as any).spdBonus || 0;

  const base: BattleStats = {
    strength:     20 + rankBonus + xpScale + bExpScale + strBonus,
    agility:      15 + rankBonus + xpScale + bExpScale + agiBonus,
    intelligence: 15 + rankBonus + xpScale + bExpScale + intBonus,
    luck:         10 + Math.floor(rankBonus / 2) + Math.floor(xpScale / 2) + lckBonus,
    speed:        20 + rankBonus + xpScale + bExpScale + spdBonus,
    maxHp:        200 + (8 - botRank) * 50 + xpScale * 5,
    maxMp:        100 + (8 - botRank) * 20 + xpScale * 2,
  };

  const bonus = SPECIES_BONUSES[user.species] || {};
  return {
    strength:     base.strength     + (bonus.strength     || 0),
    agility:      base.agility      + (bonus.agility      || 0),
    intelligence: base.intelligence + (bonus.intelligence || 0),
    luck:         base.luck         + (bonus.luck         || 0),
    speed:        base.speed        + (bonus.speed        || 0),
    maxHp:        base.maxHp        + (bonus.maxHp        || 0),
    maxMp:        base.maxMp        + (bonus.maxMp        || 0),
  };
}

// ─────────────────────────────────────────────────────────────────
//  STAT GROWTH REWARD (called after battle ends)
//  Returns the stat gains to apply to winner & loser
// ─────────────────────────────────────────────────────────────────

export interface StatGain {
  str: number;
  agi: number;
  int: number;
  lck: number;
  spd: number;
}

export function rollStatGains(isWinner: boolean): StatGain {
  // Winners get 3-6 gains, losers get 1-3
  const roll = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  if (isWinner) {
    return {
      str: roll(2, 6),
      agi: roll(1, 5),
      int: roll(1, 5),
      lck: roll(0, 3),
      spd: roll(1, 4),
    };
  } else {
    return {
      str: roll(0, 3),
      agi: roll(0, 2),
      int: roll(0, 2),
      lck: roll(0, 1),
      spd: roll(0, 2),
    };
  }
}

export function formatStatGains(gains: StatGain, label: string): string {
  const parts: string[] = [];
  if (gains.str > 0) parts.push(`💪 STR +${gains.str}`);
  if (gains.agi > 0) parts.push(`🏃 AGI +${gains.agi}`);
  if (gains.int > 0) parts.push(`🧠 INT +${gains.int}`);
  if (gains.lck > 0) parts.push(`🍀 LCK +${gains.lck}`);
  if (gains.spd > 0) parts.push(`💨 SPD +${gains.spd}`);
  if (!parts.length) return `${label}: No stat gains this time.`;
  return `${label}\n${parts.join("  ")}`;
}

// ─────────────────────────────────────────────────────────────────
//  DAMAGE CALCULATION — 30 to 500, strength-driven, tough battles
// ─────────────────────────────────────────────────────────────────

export interface DamageResult {
  damage: number;
  dodged: boolean;
  crit: boolean;
  message: string;
}

export function calculateDamage(
  attacker: Combatant,
  defender: Combatant,
  skill: Skill
): DamageResult {
  // ── Get the attacker's primary stat for this skill ─────────────
  let primaryStat = attacker.stats.strength; // default
  if (skill.statBase === "agility")      primaryStat = attacker.stats.agility;
  if (skill.statBase === "intelligence") primaryStat = attacker.stats.intelligence;
  if (skill.statBase === "luck")         primaryStat = attacker.stats.luck;
  if (skill.statBase === "speed")        primaryStat = attacker.stats.speed;

  // ── Apply active buffs to the primary stat ─────────────────────
  for (const fx of attacker.activeEffects) {
    if (fx.kind === "str_up" && skill.statBase === "strength")      primaryStat += fx.value;
    if (fx.kind === "agi_up" && skill.statBase === "agility")       primaryStat += fx.value;
    if (fx.kind === "haste"  && skill.statBase === "speed")         primaryStat += fx.value;
  }

  // ── Strength always contributes partially to every hit ─────────
  // This ensures strength matters even for INT/AGI skills
  const strContrib = Math.floor(attacker.stats.strength * 0.25);

  // ── Defender's agility reduces damage (counter-stat) ──────────
  // High AGI defenders are harder to land full hits on
  const defAgi = defender.stats.agility;
  const agiMitigation = Math.floor(defAgi * 0.15); // 15% of defender's agility as damage reduction

  // ── Base formula ───────────────────────────────────────────────
  // Range: a mid-rank player (str=50) with a B-rank skill (0.22) → ~50*1.8*(1.22) ≈ 110
  // Low player (str=20, D-rank 0.10) → 20*1.4*(1.10) ≈ 30
  // High player (str=150, S-rank 0.50) → 150*1.8*(1.50) ≈ 405 — safely under 500
  let dmg = Math.floor(primaryStat * 1.8 * (1 + skill.attackPercent) + strContrib);

  // Subtract agility mitigation (makes battles tougher — defense matters)
  dmg = Math.max(0, dmg - agiMitigation);

  // Small random variance (+/- 15%)
  const variance = 1 + (Math.random() * 0.30 - 0.15);
  dmg = Math.floor(dmg * variance);

  // Hard clamp: 30 minimum, 500 maximum (non-crit)
  dmg = Math.max(30, Math.min(500, dmg));

  // ── Crit calculation ───────────────────────────────────────────
  let critChance = attacker.stats.luck; // luck drives crit
  for (const fx of attacker.activeEffects) {
    if (fx.kind === "crit_up") critChance += fx.value;
  }
  critChance = Math.min(critChance, 80); // cap at 80%
  const crit = Math.random() * 100 < critChance;
  if (crit) {
    dmg = Math.floor(dmg * 1.6);
    dmg = Math.min(750, dmg); // crits can go up to 750
  }

  // ── Dodge calculation ──────────────────────────────────────────
  // Defender's speed matters for dodge: higher speed = better dodge
  let dodgeChance = 8 + Math.floor(defender.stats.speed / 20);
  for (const fx of defender.activeEffects) {
    if (fx.kind === "dodge_up") dodgeChance += fx.value;
    if (fx.kind === "slow")     dodgeChance = Math.max(2, dodgeChance - 10);
  }
  dodgeChance = Math.min(dodgeChance, 60); // cap dodge at 60%
  const dodged = Math.random() * 100 < dodgeChance;
  if (dodged) dmg = 0;

  // ── Shield absorption ──────────────────────────────────────────
  if (!dodged && dmg > 0) {
    let shieldTotal = 0;
    for (const fx of defender.activeEffects) {
      if (fx.kind === "shield") shieldTotal += fx.value;
    }
    if (shieldTotal > 0) {
      const absorbed = Math.min(shieldTotal, dmg);
      dmg = Math.max(0, dmg - absorbed);
    }
  }

  return { damage: dmg, dodged, crit, message: "" };
}

// ─────────────────────────────────────────────────────────────────
//  BATTLE LOCATIONS
// ─────────────────────────────────────────────────────────────────

export const BATTLE_LOCATIONS = [
  "The Ashen Wastes",
  "The Frozen Tundra",
  "The Cursed Swamp",
  "The Shadow Realm",
  "The Burning Colosseum",
  "The Ancient Ruins",
  "The Void Plains",
  "The Crimson Forest",
  "The Sky Fortress",
  "The Sunken Temple",
  "The Dark Abyss",
  "The Storm Peak",
];

export function randomLocation(): string {
  return BATTLE_LOCATIONS[Math.floor(Math.random() * BATTLE_LOCATIONS.length)];
}

// ─────────────────────────────────────────────────────────────────
//  HP / MP BAR GENERATOR
// ─────────────────────────────────────────────────────────────────

export function makeBar(current: number, max: number, size = 10): string {
  const ratio = Math.max(0, Math.min(current, max)) / max;
  const filled = Math.round(ratio * size);
  const empty = size - filled;
  return "▓".repeat(filled) + "░".repeat(empty);
}

// ─────────────────────────────────────────────────────────────────
//  APPLY TURN EFFECTS (DoT, regen, etc.)
// ─────────────────────────────────────────────────────────────────

export function applyTurnEffects(combatant: Combatant): string[] {
  const lines: string[] = [];
  for (const fx of combatant.activeEffects) {
    if (fx.kind === "burn" || fx.kind === "bleed") {
      combatant.hp = Math.max(0, combatant.hp - fx.value);
      lines.push(`🔥 *${combatant.name}* takes *${fx.value}* ${fx.kind === "burn" ? "burn" : "bleed"} damage. HP: ${combatant.hp}`);
    }
    if (fx.kind === "regen") {
      const healed = Math.min(fx.value, combatant.stats.maxHp - combatant.hp);
      combatant.hp = Math.min(combatant.stats.maxHp, combatant.hp + fx.value);
      if (healed > 0) lines.push(`💚 *${combatant.name}* regenerates *${healed} HP*. HP: ${combatant.hp}`);
    }
  }
  return lines;
}

// ─────────────────────────────────────────────────────────────────
//  TICK COOLDOWNS AND EFFECT DURATIONS
// ─────────────────────────────────────────────────────────────────

export function tickCooldowns(combatant: Combatant): void {
  for (const key of Object.keys(combatant.cooldowns)) {
    combatant.cooldowns[key] = Math.max(0, combatant.cooldowns[key] - 1);
    if (combatant.cooldowns[key] === 0) delete combatant.cooldowns[key];
  }
}

export function tickEffects(combatant: Combatant): string[] {
  const expired: string[] = [];
  combatant.activeEffects = combatant.activeEffects.filter(fx => {
    if (fx.duration === 999) return true;
    fx.turnsLeft--;
    if (fx.turnsLeft <= 0) {
      expired.push(fx.source);
      return false;
    }
    return true;
  });
  return expired;
}

// ─────────────────────────────────────────────────────────────────
//  APPLY SKILL EFFECT TO COMBATANT
// ─────────────────────────────────────────────────────────────────

export function applySkillEffect(
  effect: SkillEffect,
  skillName: string,
  attacker: Combatant,
  defender: Combatant
): string[] {
  const logs: string[] = [];
  const target = effect.target === "self" ? attacker : defender;

  switch (effect.kind) {
    case "burn":
    case "bleed":
    case "regen":
    case "shield":
    case "haste":
    case "slow":
    case "dodge_up":
    case "crit_up":
    case "str_up":
    case "agi_up":
    case "silence":
    case "freeze":
    case "stun":
      target.activeEffects = target.activeEffects.filter(fx => fx.kind !== effect.kind || fx.duration === 999);
      target.activeEffects.push({
        kind: effect.kind,
        value: effect.value,
        turnsLeft: effect.duration,
        source: skillName,
      });
      logs.push(`✨ *${skillName}* applied *${effect.kind}* to ${target.name} for ${effect.duration === 999 ? "battle" : `${effect.duration} turn(s)`}.`);
      break;

    case "mp_drain":
      const drained = Math.min(effect.value, defender.mp);
      defender.mp = Math.max(0, defender.mp - drained);
      attacker.mp = Math.min(attacker.stats.maxMp, attacker.mp + Math.floor(drained * 0.5));
      logs.push(`🌀 *${skillName}* drained *${drained} MP* from ${defender.name}.`);
      break;

    case "lifesteal":
      target.activeEffects.push({
        kind: "lifesteal",
        value: effect.value,
        turnsLeft: 1,
        source: skillName,
      });
      break;
  }
  return logs;
}

// ─────────────────────────────────────────────────────────────────
//  APPLY PASSIVES AT BATTLE START
// ─────────────────────────────────────────────────────────────────

export function applyPassive(combatant: Combatant): string[] {
  if (!combatant.equippedPassive) return [];
  const passive = combatant.equippedPassive;
  if (!passive.effect) return [];
  const logs: string[] = [`⚡ *${combatant.name}* passive *${passive.name}* is active.`];
  combatant.activeEffects.push({
    kind: passive.effect.kind,
    value: passive.effect.value,
    turnsLeft: 999,
    source: passive.name,
  });
  return logs;
}

// ─────────────────────────────────────────────────────────────────
//  SKILL PICK VALIDATION
// ─────────────────────────────────────────────────────────────────

export function canUseSkill(
  combatant: Combatant,
  skill: Skill
): { ok: boolean; reason: string } {
  if (combatant.mp < skill.mpCost) {
    return { ok: false, reason: `Not enough MP for *${skill.name}*. Need ${skill.mpCost} MP, have ${combatant.mp}.` };
  }
  const silenced = combatant.activeEffects.some(fx => fx.kind === "silence");
  if (silenced && skill.rank !== "D") {
    return { ok: false, reason: `You are *silenced*. Only D-rank skills can be used.` };
  }
  const stunned = combatant.activeEffects.some(fx => fx.kind === "stun" || fx.kind === "freeze");
  if (stunned) {
    return { ok: false, reason: `You are *stunned/frozen*. You cannot act this turn.` };
  }
  return { ok: true, reason: "" };
}

// ─────────────────────────────────────────────────────────────────
//  FORMAT SKILL LIST FOR PICK MESSAGE
// ─────────────────────────────────────────────────────────────────

export function formatSkillList(combatant: Combatant): string {
  return combatant.equippedActives.map((sk, i) => {
    const status = "Ready";
    const mpOk = combatant.mp >= sk.mpCost ? "" : " ⚠️ low MP";
    return `  ${i + 1}. *${sk.name}* — ${sk.rank} — ${status}${mpOk}\n     ${sk.description}`;
  }).join("\n");
}

// ─────────────────────────────────────────────────────────────────
//  FORMAT TURN STATUS BLOCK
// ─────────────────────────────────────────────────────────────────

export function formatTurnBlock(state: BattleState): string {
  const { challenger, target, turn, location } = state;
  const chHpBar = makeBar(challenger.hp, challenger.stats.maxHp);
  const chMpBar = makeBar(challenger.mp, challenger.stats.maxMp);
  const tgHpBar = makeBar(target.hp, target.stats.maxHp);
  const tgMpBar = makeBar(target.mp, target.stats.maxMp);

  // Show active effects (non-permanent)
  const fmtEffects = (c: Combatant) => {
    const efx = c.activeEffects
      .filter(fx => fx.duration !== 999 && fx.turnsLeft > 0)
      .map(fx => `${fx.kind}(${fx.turnsLeft})`)
      .join(", ");
    return efx ? `\n  ⚠️ Effects: ${efx}` : "";
  };

  return (
    `⚔️ *TURN ${turn}*\n` +
    `📍 ${location}\n\n` +
    `*${challenger.name}*\n` +
    `HP: [${chHpBar}] ${challenger.hp}/${challenger.stats.maxHp}\n` +
    `MP: [${chMpBar}] ${challenger.mp}/${challenger.stats.maxMp}` +
    `${fmtEffects(challenger)}\n\n` +
    `*${target.name}*\n` +
    `HP: [${tgHpBar}] ${target.hp}/${target.stats.maxHp}\n` +
    `MP: [${tgMpBar}] ${target.mp}/${target.stats.maxMp}` +
    `${fmtEffects(target)}`
  );
}

// ─────────────────────────────────────────────────────────────────
//  DEFAULT SKILL (auto-pick on timeout)
// ─────────────────────────────────────────────────────────────────

export function getDefaultSkill(combatant: Combatant): Skill {
  for (const sk of combatant.equippedActives) {
    const check = canUseSkill(combatant, sk);
    if (check.ok) return sk;
  }
  return combatant.equippedActives[0];
}

// ─────────────────────────────────────────────────────────────────
//  DETERMINE WHO GOES FIRST
// ─────────────────────────────────────────────────────────────────

export function determineFirstMover(
  challenger: Combatant,
  target: Combatant
): { firstId: string; speedLog: string } {
  const cs = challenger.stats.speed;
  const ts = target.stats.speed;
  if (cs === ts) {
    const first = Math.random() < 0.5 ? challenger : target;
    return {
      firstId: first.phoneId,
      speedLog:
        `Equal speed. The wind decides.\n` +
        `⚡ *${first.name}* moves first this turn.\n` +
        `Speed: ${cs} vs ${ts}`,
    };
  }
  const first = cs > ts ? challenger : target;
  const second = cs > ts ? target : challenger;
  return {
    firstId: first.phoneId,
    speedLog:
      `⚡ *${first.name}* moves first this turn.\n` +
      `Speed: ${first.stats.speed} vs ${second.stats.speed}`,
  };
}

// ─────────────────────────────────────────────────────────────────
//  MOMENTUM SYSTEM — consecutive hits build momentum
//  Stored on combatant, resets on dodge/miss
// ─────────────────────────────────────────────────────────────────

export interface MomentumTracker {
  challengerStreak: number; // consecutive hits without being dodged
  targetStreak: number;
}

export function applyMomentumBonus(streak: number): number {
  // Each consecutive hit adds a small damage bonus (max 5 stacks = +25%)
  const stacks = Math.min(streak, 5);
  return Math.floor(stacks * 0.05 * 100); // returns as percentage bonus
}
