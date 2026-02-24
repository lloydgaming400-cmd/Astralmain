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
  cooldown: number;            // turns
  statBase: StatType;
  attackPercent: number;       // e.g. 0.10 = 10%
  effect: SkillEffect | null;
  description: string;         // shown in pick list
}

export interface SkillEffect {
  kind:
    | "burn"           // damage over time
    | "freeze"         // skip turn
    | "bleed"          // damage over time physical
    | "stun"           // skip turn
    | "shield"         // absorb damage
    | "haste"          // speed boost
    | "slow"           // speed reduction
    | "regen"          // HP recovery per turn
    | "mp_drain"       // drain MP from opponent
    | "lifesteal"      // heal self on hit
    | "dodge_up"       // raise dodge chance
    | "crit_up"        // raise crit chance
    | "str_up"         // raise strength
    | "agi_up"         // raise agility
    | "aoe_cleave"     // future use
    | "silence";       // block skill use
  value: number;       // amount (damage per turn, %, stat points, etc.)
  duration: number;    // turns
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
  source: string;    // skill name that applied it
}

export interface Combatant {
  phoneId: string;
  name: string;
  stats: BattleStats;
  hp: number;
  mp: number;
  equippedActives: Skill[];   // up to 3
  equippedPassive: Skill | null;
  activeEffects: ActiveEffect[];
  cooldowns: Record<string, number>; // skillId -> turnsLeft
  battleExp: number;
}

export interface BattleState {
  id: string;
  challenger: Combatant;
  target: Combatant;
  turn: number;
  location: string;
  firstMoverId: string;        // phoneId of who moves first this turn
  phase: "waiting_challenger" | "waiting_target" | "resolving" | "ended";
  challengerSkillChoice: string | null;   // skillId chosen this turn
  targetSkillChoice: string | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
  chatId: string;              // group chat or DM id
  xpTransfer: number;          // random 100-500 for end
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
//  SKILL POOL (60 skills, D→S, Solo-Leveling flavoured)
// ─────────────────────────────────────────────────────────────────

export const ALL_SKILLS: Skill[] = [
  // ── D RANK (unlock at rank 8) ──────────────────────────────────
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

  // ── C RANK (unlock at rank 7) ──────────────────────────────────
  {
    id: "c_ember",
    name: "Ember Fang",
    rank: "C",
    type: "active",
    mpCost: 20,
    cooldown: 1,
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
    cooldown: 2,
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
    cooldown: 1,
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
    cooldown: 2,
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

  // ── B RANK (unlock at rank 6) ──────────────────────────────────
  {
    id: "b_void_wave",
    name: "Void Wave",
    rank: "B",
    type: "active",
    mpCost: 35,
    cooldown: 2,
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
    cooldown: 2,
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
    cooldown: 1,
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
    cooldown: 3,
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
    cooldown: 3,
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

  // ── A RANK (unlock at rank 5) ──────────────────────────────────
  {
    id: "a_sovereign",
    name: "Sovereign's Wrath",
    rank: "A",
    type: "active",
    mpCost: 50,
    cooldown: 3,
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
    cooldown: 3,
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
    cooldown: 3,
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
    cooldown: 4,
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
    cooldown: 4,
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
    cooldown: 3,
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
    cooldown: 4,
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

  // ── S RANK (unlock at rank 4 and below) ───────────────────────
  {
    id: "s_arise",
    name: "ARISE",
    rank: "S",
    type: "active",
    mpCost: 75,
    cooldown: 5,
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
    cooldown: 5,
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
    cooldown: 4,
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
    cooldown: 6,
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
    cooldown: 5,
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
//  Bot rank 8 = lowest, rank 1 = highest
// ─────────────────────────────────────────────────────────────────

export function getUnlockedSkillRanks(botRank: number): SkillRank[] {
  // botRank 8 = D only, 7 = D+C, 6 = D+C+B, 5 = +A, 4-1 = +S
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
//  STAT SCALING FROM CHAT XP + BATTLE EXP + RANK
// ─────────────────────────────────────────────────────────────────

export function computeStats(user: User, battleExp: number): BattleStats {
  const botRank = user.rank; // 8=lowest, 1=highest

  // Base scaling from chat XP
  const xpScale = Math.floor(user.xp / 1000);

  // Rank bonus (inverted: rank 8 = 0 bonus, rank 1 = 70 bonus)
  const rankBonus = (8 - botRank) * 10;

  // Battle EXP bonus
  const bExpScale = Math.floor(battleExp / 50) * 3;

  const base: BattleStats = {
    strength:     20 + rankBonus + xpScale + bExpScale,
    agility:      15 + rankBonus + xpScale + bExpScale,
    intelligence: 15 + rankBonus + xpScale + bExpScale,
    luck:         10 + Math.floor(rankBonus / 2) + Math.floor(xpScale / 2),
    speed:        20 + rankBonus + xpScale + bExpScale,
    maxHp:        200 + (8 - botRank) * 50 + xpScale * 5,
    maxMp:        100 + (8 - botRank) * 20 + xpScale * 2,
  };

  // Species bonuses
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
//  DAMAGE CALCULATION
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
  // Get effective stat (may be buffed by active effects)
  const statMap: Record<StatType, keyof BattleStats> = {
    strength: "strength",
    agility: "agility",
    intelligence: "intelligence",
    luck: "luck",
    speed: "speed",
  };
  let baseStat = attacker.stats[statMap[skill.statBase]];

  // Apply STR/AGI buffs from active effects
  for (const fx of attacker.activeEffects) {
    if (fx.kind === "str_up" && skill.statBase === "strength") baseStat += fx.value;
    if (fx.kind === "agi_up" && skill.statBase === "agility") baseStat += fx.value;
    if (fx.kind === "haste" && skill.statBase === "speed") baseStat += fx.value;
  }

  // Silence check — if silenced, can't use any skill ranked C+
  const silenced = defender.activeEffects.some(fx => fx.kind === "silence");
  // (silenced check is handled in pick validation, not here)

  // Raw damage
  let dmg = Math.floor(baseStat * 10 * skill.attackPercent);

  if (dmg === 0 && skill.type === "active" && skill.attackPercent === 0) {
    // pure utility skill, no damage
    return { damage: 0, dodged: false, crit: false, message: "" };
  }

  // Crit chance = luck stat + any crit_up effects
  let critChance = attacker.stats.luck;
  for (const fx of attacker.activeEffects) {
    if (fx.kind === "crit_up") critChance += fx.value;
  }
  critChance = Math.min(critChance, 85); // cap 85%
  const crit = Math.random() * 100 < critChance;
  if (crit) dmg = Math.floor(dmg * 1.5);

  // Dodge chance = defender agility + dodge_up effects
  let dodgeChance = defender.stats.agility;
  for (const fx of defender.activeEffects) {
    if (fx.kind === "dodge_up") dodgeChance += fx.value;
  }
  dodgeChance = Math.min(dodgeChance, 80); // cap 80%
  const dodged = Math.random() * 100 < dodgeChance;
  if (dodged) dmg = 0;

  // Shield absorption (flat passive or active)
  if (!dodged && dmg > 0) {
    let shieldLeft = 0;
    for (const fx of defender.activeEffects) {
      if (fx.kind === "shield") shieldLeft += fx.value;
    }
    if (shieldLeft > 0) {
      const absorbed = Math.min(shieldLeft, dmg);
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
//  Returns log lines describing what happened
// ─────────────────────────────────────────────────────────────────

export function applyTurnEffects(combatant: Combatant): string[] {
  const lines: string[] = [];
  for (const fx of combatant.activeEffects) {
    if (fx.kind === "burn" || fx.kind === "bleed") {
      combatant.hp = Math.max(0, combatant.hp - fx.value);
      lines.push(`🔥 ${combatant.name} takes ${fx.value} ${fx.kind === "burn" ? "burn" : "bleed"} damage. HP: ${combatant.hp}`);
    }
    if (fx.kind === "regen") {
      const healed = Math.min(fx.value, combatant.stats.maxHp - combatant.hp);
      combatant.hp = Math.min(combatant.stats.maxHp, combatant.hp + fx.value);
      if (healed > 0) lines.push(`💚 ${combatant.name} regenerates ${healed} HP. HP: ${combatant.hp}`);
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
    if (fx.duration === 999) return true; // permanent (passive)
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
      // Remove existing same-kind effect (refresh)
      target.activeEffects = target.activeEffects.filter(fx => fx.kind !== effect.kind || fx.duration === 999);
      target.activeEffects.push({
        kind: effect.kind,
        value: effect.value,
        turnsLeft: effect.duration,
        source: skillName,
      });
      logs.push(`✨ ${skillName} applied *${effect.kind}* to ${target.name} for ${effect.duration === 999 ? "battle" : `${effect.duration} turn(s)`}.`);
      break;

    case "mp_drain":
      const drained = Math.min(effect.value, defender.mp);
      defender.mp = Math.max(0, defender.mp - drained);
      attacker.mp = Math.min(attacker.stats.maxMp, attacker.mp + Math.floor(drained * 0.5));
      logs.push(`🌀 ${skillName} drained *${drained} MP* from ${defender.name}.`);
      break;

    case "lifesteal":
      // handled after damage in resolution — stored as effect
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
  if (combatant.cooldowns[skill.id]) {
    return { ok: false, reason: `*${skill.name}* is on cooldown. ${combatant.cooldowns[skill.id]} turn(s) remaining.` };
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
    const cd = combatant.cooldowns[sk.id];
    const status = cd ? `CD: ${cd} turn(s)` : "Ready";
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

  return (
    `⚔️ *TURN ${turn}*\n` +
    `📍 ${location}\n\n` +
    `*${challenger.name}*\n` +
    `HP: [${chHpBar}] ${challenger.hp}/${challenger.stats.maxHp}\n` +
    `MP: [${chMpBar}] ${challenger.mp}/${challenger.stats.maxMp}\n\n` +
    `*${target.name}*\n` +
    `HP: [${tgHpBar}] ${target.hp}/${target.stats.maxHp}\n` +
    `MP: [${tgMpBar}] ${target.mp}/${target.stats.maxMp}`
  );
}

// ─────────────────────────────────────────────────────────────────
//  DEFAULT SKILL (auto-pick on timeout)
// ─────────────────────────────────────────────────────────────────

export function getDefaultSkill(combatant: Combatant): Skill {
  // Pick first active skill that user can afford and isn't on cooldown
  for (const sk of combatant.equippedActives) {
    const check = canUseSkill(combatant, sk);
    if (check.ok) return sk;
  }
  // If nothing works, return first active anyway (0 mp cost fallback)
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
