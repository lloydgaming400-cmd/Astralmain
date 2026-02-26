// ═══════════════════════════════════════════════════════
//  DUNGEON SYSTEM — Shared Types
//  Tower of Ascension · 100 Floors
// ═══════════════════════════════════════════════════════

export interface MonsterMove {
  name: string;
  emoji: string;
  damage: number;
  mpCost: number;
  weight: number;
  effect?: {
    kind: "burn"|"bleed"|"stun"|"freeze"|"slow"|"silence"|"mp_drain"|"regen"|"str_up"|"agi_up"|"crit_up";
    value: number;
    duration: number;
  };
  taunt?: string;
}

export interface FloorMob {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  isBoss: false;
  lore: string;
  moves: MonsterMove[];
}

export interface BossMonster {
  id: string;
  name: string;
  emoji: string;
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  isBoss: true;
  lore: string;
  entranceMonologue: string[];
  deathMonologue: string;
  playerKillTaunt: string;
  reactToHeavyHit: string[];
  reactToLightHit: string[];
  reactToHeal: string[];
  reactToPlayerLow: string[];
  reactToBossLow: string[];
  midBattleThoughts: string[];
  enrageLines: string[];
  moves: MonsterMove[];
  enrageAt: number;
  enrageMoves: MonsterMove[];
}

export type MonsterTemplate = FloorMob | BossMonster;

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

export interface ActiveEffect {
  kind: string;
  value: number;
  turnsLeft: number;
  source: string;
  duration?: number;
}

export interface BossContext {
  lastPlayerDmg: number;
  lastPlayerSkillName: string;
  lastPlayerSkillKind: string;
  playerHpPercent: number;
  bossHpPercent: number;
  turn: number;
  streak: number;
  isEnraged: boolean;
  justHealed: boolean;
}

export interface DungeonState {
  phoneId: string;
  floor: number;
  arc: number;
  arcName: string;
  wave: number;
  totalWaves: number;
  isBossWave: boolean;
  monster: Monster;
  playerHp: number;
  playerMp: number;
  playerMaxHp: number;
  playerMaxMp: number;
  playerStats: any;
  playerActiveEffects: ActiveEffect[];
  playerCooldowns: Record<string, number>;
  monsterActiveEffects: ActiveEffect[];
  turn: number;
  xpEarned: number;
  wavesCleared: number;
  noDeathRun: boolean;
  phase: "active" | "ended";
  chatId: string;
  turnTimer: ReturnType<typeof setTimeout> | null;
  playerStreak: number;
  bossEntranceDone: boolean;
  lastBossThinkTurn: number;
  lastPlayerDmg: number;
  lastPlayerSkillName: string;
  lastPlayerSkillKind: string;
}

export interface ArcData {
  arc: number;
  name: string;
  theme: string;
  entryNarration: string;
  floorNarrations: Record<number, string>;
  mobs: Record<number, FloorMob>;
  boss: BossMonster;
}
