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
    effect: { kind: "shield", value: 15, duration: 0, target: "self" },
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
    effect: { kind: "shield", value: 30, duration: 0, target: "self" },
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
    effect: { kind: "shield", value: 80, duration: 0, target: "self" },
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

  // ══════════════════════════════════════════════════════════════
  //  DUNGEON SKILLS — 100 new skills for the 100-floor tower
  // ══════════════════════════════════════════════════════════════

  // ── D RANK DUNGEON SKILLS ─────────────────────────────────────
  {
    id: "d_bash",
    name: "Stone Bash",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.09,
    effect: null,
    description: "A blunt stone strike. Raw and simple.",
  },
  {
    id: "d_flick",
    name: "Wind Flick",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.07,
    effect: { kind: "haste", value: 5, duration: 1, target: "self" },
    description: "Quick hit + haste 5 for 1 turn.",
  },
  {
    id: "d_spark",
    name: "Mana Spark",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.08,
    effect: null,
    description: "Raw mana bolt fired from fingertips.",
  },
  {
    id: "d_taunt",
    name: "Iron Will",
    rank: "D",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 10, duration: 0, target: "self" },
    description: "Passive: +10 flat shield per hit.",
  },
  {
    id: "d_focus",
    name: "Calm Mind",
    rank: "D",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 5, duration: 999, target: "self" },
    description: "Passive: +5% crit chance.",
  },
  {
    id: "d_sidestep",
    name: "Sidestep",
    rank: "D",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0,
    effect: { kind: "dodge_up", value: 6, duration: 999, target: "self" },
    description: "Passive: +6% dodge chance.",
  },
  {
    id: "d_claw",
    name: "Beast Claw",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.11,
    effect: null,
    description: "Raw savage scratch. No frills.",
  },
  {
    id: "d_pebble",
    name: "Pebble Shot",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.08,
    effect: { kind: "haste", value: 3, duration: 1, target: "self" },
    description: "Quick ranged pebble + minor haste.",
  },
  {
    id: "d_pulse",
    name: "Mana Pulse",
    rank: "D",
    type: "active",
    mpCost: 10,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.09,
    effect: null,
    description: "Pure INT mana shot.",
  },
  {
    id: "d_veins",
    name: "Iron Veins",
    rank: "D",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 12, duration: 0, target: "self" },
    description: "Passive: +12 flat shield per hit.",
  },
  {
    id: "d_instinct",
    name: "Survival Instinct",
    rank: "D",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0,
    effect: { kind: "dodge_up", value: 7, duration: 999, target: "self" },
    description: "Passive: +7% dodge chance.",
  },

  // ── C RANK DUNGEON SKILLS ─────────────────────────────────────
  {
    id: "c_poison",
    name: "Venom Sting",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.12,
    effect: { kind: "burn", value: 8, duration: 3, target: "opponent" },
    description: "Poisonous sting. Burns 8/turn × 3.",
  },
  {
    id: "c_rock",
    name: "Rock Throw",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.15,
    effect: null,
    description: "Pure STR damage. Hurls a massive rock.",
  },
  {
    id: "c_thunder",
    name: "Thunderclap",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.13,
    effect: { kind: "slow", value: 8, duration: 2, target: "opponent" },
    description: "Thunder strike. Slows 8 for 2 turns.",
  },
  {
    id: "c_barrier",
    name: "Crystal Barrier",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "shield", value: 60, duration: 1, target: "self" },
    description: "Crystal shield. Blocks 60 damage.",
  },
  {
    id: "c_whirl",
    name: "Whirlwind",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.11,
    effect: { kind: "haste", value: 8, duration: 2, target: "self" },
    description: "Spinning strike. Haste 8 for 2 turns.",
  },
  {
    id: "c_leech",
    name: "Leeching Strike",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.13,
    effect: { kind: "lifesteal", value: 0.20, duration: 1, target: "self" },
    description: "Lifesteal 20% of damage dealt.",
  },
  {
    id: "c_smoke",
    name: "Smoke Step",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.09,
    effect: { kind: "dodge_up", value: 18, duration: 2, target: "self" },
    description: "Vanish in smoke. Dodge +18% for 2 turns.",
  },
  {
    id: "c_static",
    name: "Static Charge",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 2,
    statBase: "intelligence",
    attackPercent: 0.10,
    effect: { kind: "stun", value: 0, duration: 1, target: "opponent" },
    description: "Electric jolt. Stuns opponent 1 turn.",
  },
  {
    id: "c_fortify",
    name: "Fortify",
    rank: "C",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 8, duration: 999, target: "self" },
    description: "Passive: +8 flat shield per hit.",
  },
  {
    id: "c_eagle",
    name: "Eagle Eye",
    rank: "C",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 8, duration: 999, target: "self" },
    description: "Passive: +8% crit chance.",
  },
  {
    id: "c_sandstorm",
    name: "Sandstorm",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.11,
    effect: { kind: "dodge_up", value: 15, duration: 2, target: "self" },
    description: "Blinding sand. Dodge +15% for 2 turns.",
  },
  {
    id: "c_toxin",
    name: "Toxin Dart",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.10,
    effect: { kind: "burn", value: 10, duration: 2, target: "opponent" },
    description: "Poison dart. Burns 10/turn × 2.",
  },
  {
    id: "c_bonecrush",
    name: "Bone Crush",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.16,
    effect: null,
    description: "Pure brute force. Heavy STR damage.",
  },
  {
    id: "c_lifetap",
    name: "Life Tap",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "regen", value: 20, duration: 2, target: "self" },
    description: "Regen 20 HP/turn for 2 turns.",
  },
  {
    id: "c_splinter",
    name: "Splinter Strike",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.13,
    effect: { kind: "bleed", value: 8, duration: 2, target: "opponent" },
    description: "Piercing hit. Bleeds 8/turn × 2.",
  },

  // ── B RANK DUNGEON SKILLS ─────────────────────────────────────
  {
    id: "b_magma",
    name: "Magma Fist",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.20,
    effect: { kind: "burn", value: 12, duration: 3, target: "opponent" },
    description: "Burning fist. Burns 12/turn × 3.",
  },
  {
    id: "b_cyclone",
    name: "Cyclone Kick",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.19,
    effect: { kind: "slow", value: 12, duration: 2, target: "opponent" },
    description: "Spinning kick. Slows 12 for 2 turns.",
  },
  {
    id: "b_hex",
    name: "Hex Bolt",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.18,
    effect: { kind: "mp_drain", value: 30, duration: 1, target: "opponent" },
    description: "Cursed bolt. Drains 30 MP.",
  },
  {
    id: "b_aegis",
    name: "Aegis Wall",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 120, duration: 1, target: "self" },
    description: "Massive aegis shield. Blocks 120 damage.",
  },
  {
    id: "b_frostbite",
    name: "Frostbite",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 2,
    statBase: "intelligence",
    attackPercent: 0.16,
    effect: { kind: "freeze", value: 0, duration: 1, target: "opponent" },
    description: "Freezes target. Skips 1 turn.",
  },
  {
    id: "b_bladerain",
    name: "Blade Rain",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.22,
    effect: null,
    description: "Pure AGI damage. Blades from all angles.",
  },
  {
    id: "b_serpent",
    name: "Serpent Fang",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.17,
    effect: { kind: "bleed", value: 12, duration: 3, target: "opponent" },
    description: "Serpent's bite. Bleeds 12/turn × 3.",
  },
  {
    id: "b_warcry",
    name: "War Cry",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "str_up", value: 15, duration: 2, target: "self" },
    description: "Fierce cry. STR +15 for 2 turns.",
  },
  {
    id: "b_chakra",
    name: "Chakra Burst",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.14,
    effect: { kind: "regen", value: 25, duration: 3, target: "self" },
    description: "Chakra release. Regen 25/turn × 3.",
  },
  {
    id: "b_mirrorshield",
    name: "Mirror Shield",
    rank: "B",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "shield", value: 20, duration: 999, target: "self" },
    description: "Passive: +20 flat shield per hit.",
  },
  {
    id: "b_hawkeye",
    name: "Hawk Eye",
    rank: "B",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 12, duration: 999, target: "self" },
    description: "Passive: +12% crit chance.",
  },
  {
    id: "b_fleetfoot",
    name: "Fleet Foot",
    rank: "B",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0,
    effect: { kind: "dodge_up", value: 10, duration: 999, target: "self" },
    description: "Passive: +10% dodge chance.",
  },
  {
    id: "b_berserker",
    name: "Berserker Pulse",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.24,
    effect: { kind: "str_up", value: 10, duration: 1, target: "self" },
    description: "Berserk strike. STR +10 for 1 turn.",
  },
  {
    id: "b_silence2",
    name: "Mute Brand",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 3,
    statBase: "intelligence",
    attackPercent: 0.10,
    effect: { kind: "silence", value: 0, duration: 2, target: "opponent" },
    description: "Silences opponent for 2 turns.",
  },
  {
    id: "b_gravity",
    name: "Gravity Slam",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.21,
    effect: { kind: "slow", value: 15, duration: 2, target: "opponent" },
    description: "Gravity crush. Heavy slow for 2 turns.",
  },
  {
    id: "b_thunderstep",
    name: "Thunder Step",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.20,
    effect: { kind: "dodge_up", value: 20, duration: 2, target: "self" },
    description: "Lightning dash. Dodge +20% for 2 turns.",
  },
  {
    id: "b_soulburn",
    name: "Soul Burn",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.17,
    effect: { kind: "burn", value: 18, duration: 2, target: "opponent" },
    description: "Soulfire. Burns 18/turn × 2.",
  },
  {
    id: "b_rampage",
    name: "Rampage",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.23,
    effect: { kind: "str_up", value: 12, duration: 2, target: "self" },
    description: "Pure fury. STR +12 for 2 turns.",
  },
  {
    id: "b_nether",
    name: "Nether Bolt",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.18,
    effect: { kind: "mp_drain", value: 35, duration: 1, target: "opponent" },
    description: "Nether energy. Drains 35 MP.",
  },
  {
    id: "b_phantomstep",
    name: "Phantom Step",
    rank: "B",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0,
    effect: { kind: "dodge_up", value: 15, duration: 999, target: "self" },
    description: "Passive: +15% dodge chance.",
  },
  {
    id: "b_warlord",
    name: "Warlord's Blood",
    rank: "B",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "str_up", value: 15, duration: 999, target: "self" },
    description: "Passive: STR +15 permanently.",
  },
  {
    id: "b_mindbreaker",
    name: "Mind Breaker",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 3,
    statBase: "intelligence",
    attackPercent: 0.15,
    effect: { kind: "silence", value: 0, duration: 1, target: "opponent" },
    description: "Mental overload. Silences 1 turn.",
  },
  {
    id: "b_regenfield",
    name: "Regen Field",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "regen", value: 35, duration: 3, target: "self" },
    description: "Healing field. Regen 35/turn × 3.",
  },

  // ── A RANK DUNGEON SKILLS ─────────────────────────────────────
  {
    id: "a_meteor",
    name: "Meteor Drop",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.30,
    effect: { kind: "burn", value: 20, duration: 3, target: "opponent" },
    description: "Cosmic meteor. Burns 20/turn × 3.",
  },
  {
    id: "a_thunder_god",
    name: "Thunder God Fist",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 2,
    statBase: "strength",
    attackPercent: 0.32,
    effect: { kind: "stun", value: 0, duration: 1, target: "opponent" },
    description: "Divine fist. Stuns 1 turn.",
  },
  {
    id: "a_galeforce",
    name: "Galeforce",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.28,
    effect: { kind: "agi_up", value: 20, duration: 2, target: "self" },
    description: "Gale slash. AGI +20 for 2 turns.",
  },
  {
    id: "a_bloodrite",
    name: "Blood Rite",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.26,
    effect: { kind: "lifesteal", value: 0.40, duration: 1, target: "self" },
    description: "Blood sacrifice. Lifesteal 40%.",
  },
  {
    id: "a_permafrost",
    name: "Permafrost",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 2,
    statBase: "intelligence",
    attackPercent: 0.24,
    effect: { kind: "freeze", value: 0, duration: 1, target: "opponent" },
    description: "Absolute cold. Freezes target.",
  },
  {
    id: "a_ruinblast",
    name: "Ruin Blast",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.35,
    effect: null,
    description: "Pure destruction. Massive INT damage.",
  },
  {
    id: "a_vortex",
    name: "Void Vortex",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.22,
    effect: { kind: "mp_drain", value: 50, duration: 1, target: "opponent" },
    description: "Vortex pull. Drains 50 MP.",
  },
  {
    id: "a_ironclad",
    name: "Ironclad",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 200, duration: 1, target: "self" },
    description: "Ironclad form. Shield 200 for 1 turn.",
  },
  {
    id: "a_deathmark",
    name: "Death Mark",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0.20,
    effect: { kind: "bleed", value: 20, duration: 4, target: "opponent" },
    description: "Mark of death. Bleeds 20/turn × 4.",
  },
  {
    id: "a_stormstep",
    name: "Storm Step",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.25,
    effect: { kind: "dodge_up", value: 30, duration: 2, target: "self" },
    description: "Storm dash. Dodge +30% for 2 turns.",
  },
  {
    id: "a_titan_roar",
    name: "Titan's Roar",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "str_up", value: 30, duration: 3, target: "self" },
    description: "Titan roar. STR +30 for 3 turns.",
  },
  {
    id: "a_soul_rend",
    name: "Soul Rend",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 3,
    statBase: "intelligence",
    attackPercent: 0.20,
    effect: { kind: "silence", value: 0, duration: 3, target: "opponent" },
    description: "Soul tear. Silences opponent 3 turns.",
  },
  {
    id: "a_overload",
    name: "Mana Overload",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.28,
    effect: { kind: "burn", value: 18, duration: 4, target: "opponent" },
    description: "MP overflow. Burns 18/turn × 4.",
  },
  {
    id: "a_bloodpact2",
    name: "Eternal Pact",
    rank: "A",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "regen", value: 15, duration: 999, target: "self" },
    description: "Passive: Regen 15 HP every turn.",
  },
  {
    id: "a_sharpened",
    name: "Sharpened Instinct",
    rank: "A",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 20, duration: 999, target: "self" },
    description: "Passive: +20% crit chance.",
  },
  {
    id: "a_sunfall",
    name: "Sunfall",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.33,
    effect: { kind: "burn", value: 22, duration: 3, target: "opponent" },
    description: "Solar strike. Burns 22/turn × 3.",
  },
  {
    id: "a_quake",
    name: "Earthquake",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.30,
    effect: { kind: "slow", value: 20, duration: 2, target: "opponent" },
    description: "Ground splits. Heavy slow for 2 turns.",
  },
  {
    id: "a_bloodfrenzy",
    name: "Blood Frenzy",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.28,
    effect: { kind: "str_up", value: 25, duration: 2, target: "self" },
    description: "Blood rage. STR +25 for 2 turns.",
  },
  {
    id: "a_icecage",
    name: "Ice Cage",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 2,
    statBase: "intelligence",
    attackPercent: 0.25,
    effect: { kind: "freeze", value: 0, duration: 1, target: "opponent" },
    description: "Prison of ice. Freeze + heavy damage.",
  },
  {
    id: "a_mirage",
    name: "Mirage Step",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.22,
    effect: { kind: "dodge_up", value: 40, duration: 2, target: "self" },
    description: "Illusion dash. Dodge +40% for 2 turns.",
  },
  {
    id: "a_ruination",
    name: "Ruination",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.38,
    effect: null,
    description: "Pure devastation. Highest A-rank damage.",
  },
  {
    id: "a_spiritdrain",
    name: "Spirit Drain",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.22,
    effect: { kind: "mp_drain", value: 55, duration: 1, target: "opponent" },
    description: "Spirit siphon. Drains 55 MP.",
  },
  {
    id: "a_battlehymn",
    name: "Battle Hymn",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "str_up", value: 35, duration: 2, target: "self" },
    description: "War anthem. STR +35 for 2 turns.",
  },
  {
    id: "a_lifesurge",
    name: "Life Surge",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "regen", value: 60, duration: 3, target: "self" },
    description: "Massive regen. Regen 60/turn × 3.",
  },
  {
    id: "a_cripplingblow",
    name: "Crippling Blow",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.26,
    effect: { kind: "slow", value: 25, duration: 3, target: "opponent" },
    description: "Devastating slow. -25 speed for 3 turns.",
  },
  {
    id: "a_wraithform",
    name: "Wraith Form",
    rank: "A",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0,
    effect: { kind: "dodge_up", value: 15, duration: 999, target: "self" },
    description: "Passive: +15% dodge as a wraith.",
  },
  {
    id: "a_warborn",
    name: "Warborn",
    rank: "A",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "str_up", value: 30, duration: 999, target: "self" },
    description: "Passive: STR +30 permanently.",
  },

  // ── S RANK DUNGEON SKILLS ─────────────────────────────────────
  {
    id: "s_catastrophe",
    name: "Catastrophe",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.55,
    effect: { kind: "burn", value: 30, duration: 4, target: "opponent" },
    description: "Catastrophic INT blast. Burns 30/turn × 4.",
  },
  {
    id: "s_godbreaker",
    name: "Godbreaker",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 2,
    statBase: "strength",
    attackPercent: 0.52,
    effect: { kind: "stun", value: 0, duration: 1, target: "opponent" },
    description: "God-slaying strike. Stuns 1 turn.",
  },
  {
    id: "s_annihilate",
    name: "Annihilate",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.60,
    effect: null,
    description: "Pure obliteration. Highest raw damage.",
  },
  {
    id: "s_oblivion",
    name: "Oblivion Strike",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 3,
    statBase: "intelligence",
    attackPercent: 0.50,
    effect: { kind: "silence", value: 0, duration: 3, target: "opponent" },
    description: "Erases skills. Silences 3 turns.",
  },
  {
    id: "s_tempest",
    name: "Tempest Dance",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.45,
    effect: { kind: "agi_up", value: 40, duration: 3, target: "self" },
    description: "Storm dance. AGI +40 for 3 turns.",
  },
  {
    id: "s_ragnarok",
    name: "Ragnarok",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.48,
    effect: { kind: "bleed", value: 35, duration: 4, target: "opponent" },
    description: "End of days. Bleeds 35/turn × 4.",
  },
  {
    id: "s_voidcurse",
    name: "Void Curse",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0.42,
    effect: { kind: "mp_drain", value: 80, duration: 1, target: "opponent" },
    description: "Void hex. Drains 80 MP.",
  },
  {
    id: "s_eternal_ice",
    name: "Eternal Ice",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 2,
    statBase: "intelligence",
    attackPercent: 0.44,
    effect: { kind: "freeze", value: 0, duration: 1, target: "opponent" },
    description: "Absolute freeze. Devastating INT hit.",
  },
  {
    id: "s_bloodgod",
    name: "Blood God's Touch",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.50,
    effect: { kind: "lifesteal", value: 0.60, duration: 1, target: "self" },
    description: "Blood god power. Lifesteal 60%.",
  },
  {
    id: "s_divine_aegis",
    name: "Divine Aegis",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 100, duration: 999, target: "self" },
    description: "Passive: +100 flat shield per hit.",
  },
  {
    id: "s_fated_eye",
    name: "Fated Eye",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 45, duration: 999, target: "self" },
    description: "Passive: +45% crit chance.",
  },
  {
    id: "s_phantom_lord",
    name: "Phantom Lord",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0,
    effect: { kind: "dodge_up", value: 20, duration: 999, target: "self" },
    description: "Passive: +20% dodge chance.",
  },
  {
    id: "s_worldrender",
    name: "World Render",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.55,
    effect: { kind: "bleed", value: 40, duration: 4, target: "opponent" },
    description: "Reality tears. Bleeds 40/turn × 4.",
  },
  {
    id: "s_manavoid",
    name: "Mana Void",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 2,
    statBase: "intelligence",
    attackPercent: 0.48,
    effect: { kind: "mp_drain", value: 90, duration: 1, target: "opponent" },
    description: "Total mana erasure. Drains 90 MP.",
  },
  {
    id: "s_colossus",
    name: "Colossus Form",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "str_up", value: 60, duration: 3, target: "self" },
    description: "Colossus awakens. STR +60 for 3 turns.",
  },
  {
    id: "s_glacial_era",
    name: "Glacial Era",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 2,
    statBase: "intelligence",
    attackPercent: 0.46,
    effect: { kind: "freeze", value: 0, duration: 1, target: "opponent" },
    description: "New ice age begins. Freeze + massive damage.",
  },
  {
    id: "s_wrathborn",
    name: "Wrathborn",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "str_up", value: 50, duration: 999, target: "self" },
    description: "Passive: STR +50 permanently.",
  },
  {
    id: "s_specter",
    name: "Specter's Veil",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0,
    effect: { kind: "dodge_up", value: 25, duration: 999, target: "self" },
    description: "Passive: +25% dodge as a specter.",
  },
  {
    id: "s_doom",
    name: "Doom Seal",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 3,
    statBase: "intelligence",
    attackPercent: 0.50,
    effect: { kind: "silence", value: 0, duration: 4, target: "opponent" },
    description: "Doom brand. Silences 4 turns.",
  },
  {
    id: "s_eternal_regen",
    name: "Eternal Bloom",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "intelligence",
    attackPercent: 0,
    effect: { kind: "regen", value: 30, duration: 999, target: "self" },
    description: "Passive: Regen 30 HP every turn.",
  },
  {
    id: "s_predator2",
    name: "Apex Predator",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "luck",
    attackPercent: 0,
    effect: { kind: "crit_up", value: 50, duration: 999, target: "self" },
    description: "Passive: +50% crit. At the top of the food chain.",
  },
  {
    id: "s_titanwall",
    name: "Titan Wall",
    rank: "S",
    type: "passive",
    mpCost: 0,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0,
    effect: { kind: "shield", value: 150, duration: 999, target: "self" },
    description: "Passive: +150 flat shield per hit.",
  },
  {
    id: "s_flashstrike",
    name: "Flash Strike",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "agility",
    attackPercent: 0.50,
    effect: { kind: "agi_up", value: 50, duration: 3, target: "self" },
    description: "Instant strike. AGI +50 for 3 turns.",
  },
  {
    id: "s_soulreaper",
    name: "Soul Reaper",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 0,
    statBase: "strength",
    attackPercent: 0.58,
    effect: { kind: "lifesteal", value: 0.55, duration: 1, target: "self" },
    description: "Soul harvest. 55% lifesteal.",
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
  const strContrib = Math.floor(attacker.stats.strength * 0.25);

  // ── Defender's agility reduces damage (counter-stat) ──────────
  const defAgi = defender.stats.agility;
  const agiMitigation = Math.floor(defAgi * 0.15);

  // ── Base formula ───────────────────────────────────────────────
  let dmg = Math.floor(primaryStat * 1.8 * (1 + skill.attackPercent) + strContrib);

  // Subtract agility mitigation
  dmg = Math.max(0, dmg - agiMitigation);

  // Small random variance (+/- 15%)
  const variance = 1 + (Math.random() * 0.30 - 0.15);
  dmg = Math.floor(dmg * variance);

  // Hard clamp: 30 minimum, 500 maximum (non-crit)
  dmg = Math.max(30, Math.min(500, dmg));

  // ── Crit calculation ───────────────────────────────────────────
  let critChance = attacker.stats.luck;
  for (const fx of attacker.activeEffects) {
    if (fx.kind === "crit_up") critChance += fx.value;
  }
  critChance = Math.min(critChance, 80);
  const crit = Math.random() * 100 < critChance;
  if (crit) {
    dmg = Math.floor(dmg * 1.6);
    dmg = Math.min(750, dmg);
  }

  // ── Dodge calculation ──────────────────────────────────────────
  let dodgeChance = 8 + Math.floor(defender.stats.speed / 20);
  for (const fx of defender.activeEffects) {
    if (fx.kind === "dodge_up") dodgeChance += fx.value;
    if (fx.kind === "slow")     dodgeChance = Math.max(2, dodgeChance - 10);
  }
  dodgeChance = Math.min(dodgeChance, 60);
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

  const fmtEffects = (c: Combatant) => {
    const efx = c.activeEffects
      .filter(fx => (fx.duration !== 999 && fx.duration !== 0) && fx.turnsLeft > 0)
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
  challengerStreak: number;
  targetStreak: number;
}

export function applyMomentumBonus(streak: number): number {
  const stacks = Math.min(streak, 5);
  return Math.floor(stacks * 0.05 * 100);
}
