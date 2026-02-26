// ═══════════════════════════════════════════════════════
//  DUNGEON ENGINE — index.ts
//  Tower of Ascension · 100 Floors
// ═══════════════════════════════════════════════════════

import type {
  Monster, MonsterMove, DungeonState, ActiveEffect, BossContext, ArcData
} from './types';

import arc1  from './arc1';
import arc2  from './arc2';
import arc3  from './arc3';
import arc4  from './arc4';
import arc5  from './arc5';
import arc6  from './arc6';
import arc7  from './arc7';
import arc8  from './arc8';
import arc9  from './arc9';
import arc10 from './arc10';

// ── Arc registry ──────────────────────────────────────
const ARCS: Record<number, ArcData> = {
  1: arc1, 2: arc2, 3: arc3, 4: arc4, 5: arc5,
  6: arc6, 7: arc7, 8: arc8, 9: arc9, 10: arc10,
};

// ── Floor → Arc mapping ───────────────────────────────
export function getArcForFloor(floor: number): ArcData {
  const arcNum = Math.ceil(floor / 10);
  return ARCS[Math.min(arcNum, 10)];
}

export function getFloorInArc(floor: number): number {
  return ((floor - 1) % 10) + 1;
}

export function isBossFloor(floor: number): boolean {
  return floor % 10 === 0;
}

// ── Build Monster from arc data ───────────────────────
export function buildMonster(floor: number): Monster {
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

  // Regular mob — scale stats slightly by floor
  const mob = arc.mobs[floorKey];
  if (!mob) throw new Error(`No mob for floor ${floor} (arc floor ${floorKey})`);

  const scale = 1 + (floor - 1) * 0.012; // gentle scaling
  return {
    id: mob.id, name: mob.name, emoji: mob.emoji,
    hp:  Math.floor(mob.maxHp  * scale),
    maxHp: Math.floor(mob.maxHp * scale),
    mp:  mob.maxMp, maxMp: mob.maxMp,
    attack:  Math.floor(mob.attack  * scale),
    defense: Math.floor(mob.defense * scale),
    speed:   mob.speed,
    isBoss: false, lore: mob.lore,
    moves: mob.moves,
  };
}

// ── Create fresh dungeon state ────────────────────────
export function createDungeonState(
  phoneId: string,
  chatId: string,
  floor: number,
  playerStats: any,
): DungeonState {
  const arc      = getArcForFloor(floor);
  const arcNum   = Math.ceil(floor / 10);
  const floorKey = getFloorInArc(floor);
  const isBoss   = isBossFloor(floor);

  // Waves: boss floors have 3 waves (2 mob + 1 boss), others have 1
  const totalWaves = isBoss ? 3 : 1;
  const wave       = isBoss ? 1 : 1; // start on wave 1

  const monster = isBoss
    ? buildMobWaveMonster(floor, 1) // first wave mob before boss
    : buildMonster(floor);

  const maxHp = playerStats.hp   ?? 1000;
  const maxMp = playerStats.mp   ?? 300;

  return {
    phoneId,
    chatId,
    floor,
    arc: arcNum,
    arcName: arc.name,
    wave,
    totalWaves,
    isBossWave: false,
    monster,
    playerHp: maxHp,
    playerMp: maxMp,
    playerMaxHp: maxHp,
    playerMaxMp: maxMp,
    playerStats,
    playerActiveEffects: [],
    playerCooldowns: {},
    monsterActiveEffects: [],
    turn: 1,
    xpEarned: 0,
    wavesCleared: 0,
    noDeathRun: true,
    phase: 'active',
    turnTimer: null,
    playerStreak: 0,
    bossEntranceDone: false,
    lastBossThinkTurn: 0,
    lastPlayerDmg: 0,
    lastPlayerSkillName: '',
    lastPlayerSkillKind: '',
  };
}

// ── Build mob for wave (before boss) ─────────────────
function buildMobWaveMonster(floor: number, wave: number): Monster {
  const arc      = getArcForFloor(floor);
  const arcNum   = Math.ceil(floor / 10);
  const arcStart = (arcNum - 1) * 10 + 1; // arc1→1, arc2→11, arc3→21...
  const floorKey = getFloorInArc(floor);   // 1–10 (relative)
  // Convert to absolute floor keys that match arc data (e.g. arc2 uses keys 11-19)
  const absFloor = arcStart + floorKey - 1;
  const mobKey   = wave === 1 ? Math.max(arcStart, absFloor - 1) : Math.max(arcStart, absFloor - 2);
  const fallback = arc.mobs[arcStart] ?? arc.mobs[Object.keys(arc.mobs)[0] as unknown as number];
  const mob      = arc.mobs[mobKey] ?? fallback;
  const scale    = 1 + (floor - 1) * 0.012;

  return {
    id: mob.id, name: mob.name, emoji: mob.emoji,
    hp:  Math.floor(mob.maxHp  * scale * 0.85),
    maxHp: Math.floor(mob.maxHp * scale * 0.85),
    mp:  mob.maxMp, maxMp: mob.maxMp,
    attack:  Math.floor(mob.attack  * scale),
    defense: Math.floor(mob.defense * scale),
    speed:   mob.speed,
    isBoss: false, lore: mob.lore,
    moves: mob.moves,
  };
}

// ── Advance to next wave ──────────────────────────────
export function advanceWave(state: DungeonState): {
  state: DungeonState;
  narration: string;
  bossEntrance?: string[];
} {
  state.wavesCleared++;
  state.wave++;
  state.monsterActiveEffects = [];
  state.turn = 1;

  const arc        = getArcForFloor(state.floor);
  const isBossWave = state.isBossWave || state.wave >= state.totalWaves;

  if (isBossWave) {
    // Spawn boss
    const boss      = buildMonster(state.floor); // isBossFloor → returns boss
    state.monster   = boss;
    state.isBossWave = true;

    const floorKey  = getFloorInArc(state.floor);
    const floorNarr = arc.floorNarrations[state.floor] ?? '';
    const entrance  = boss.entranceMonologue ?? [];

    return {
      state,
      narration: floorNarr,
      bossEntrance: entrance,
    };
  } else {
    // Next mob wave
    state.monster   = buildMobWaveMonster(state.floor, state.wave);
    state.isBossWave = false;

    const waveNarr = `🌊 *Wave ${state.wave} of ${state.totalWaves} — ${state.monster.emoji} **${state.monster.name}** appears!*\n${state.monster.lore}`;
    return { state, narration: waveNarr };
  }
}

// ── Get floor entry narration ─────────────────────────
export function getFloorNarration(floor: number): string {
  const arc      = getArcForFloor(floor);
  const floorKey = getFloorInArc(floor);
  // If it's a boss floor, show the arc-level narration for floor X0
  return arc.floorNarrations[floor] ?? arc.floorNarrations[floorKey] ?? '';
}

export function getArcEntryNarration(floor: number): string | null {
  if (getFloorInArc(floor) === 1) {
    return getArcForFloor(floor).entryNarration;
  }
  return null;
}

// ── Pick monster move (AI) ────────────────────────────
export function pickMonsterMove(
  monster: Monster,
  effects: ActiveEffect[],
  ctx: BossContext,
): MonsterMove {
  const isSilenced = effects.some(e => e.kind === 'silence' && e.turnsLeft > 0);
  const isEnraged  = monster.isBoss
    && ctx.isEnraged
    && monster.enrageMoves
    && monster.enrageMoves.length > 0;

  let pool = isEnraged ? monster.enrageMoves! : monster.moves;
  if (isSilenced) pool = pool.filter(m => m.mpCost === 0);
  if (!pool.length) pool = monster.moves.filter(m => m.mpCost === 0);
  if (!pool.length) pool = monster.moves;

  // Boss contextual override
  if (monster.isBoss && !isSilenced) {
    // If player is on a streak → try to stun / silence
    if (ctx.streak >= 3) {
      const disruptor = pool.find(m =>
        m.effect && (m.effect.kind === 'stun' || m.effect.kind === 'silence')
      );
      if (disruptor) return disruptor;
    }
    // Player MP high → drain it
    if (ctx.playerHpPercent > 60 && ctx.bossHpPercent < 50) {
      const drainer = pool.find(m => m.effect?.kind === 'mp_drain');
      if (drainer && Math.random() < 0.45) return drainer;
    }
    // Boss low HP → try to heal
    if (ctx.bossHpPercent < 30) {
      const healer = pool.find(m => m.effect?.kind === 'regen' && m.damage === 0);
      if (healer && Math.random() < 0.55) return healer;
    }
  }

  // Weighted random
  const total  = pool.reduce((s, m) => s + m.weight, 0);
  let   roll   = Math.random() * total;
  for (const move of pool) {
    roll -= move.weight;
    if (roll <= 0) return move;
  }
  return pool[pool.length - 1];
}

// ── Apply active effects (tick) ───────────────────────
export interface TickResult {
  damage: number;
  heal: number;
  messages: string[];
}

export function tickEffects(effects: ActiveEffect[], label: string): TickResult {
  let damage = 0, heal = 0;
  const messages: string[] = [];

  for (const eff of effects) {
    if (eff.turnsLeft <= 0) continue;

    switch (eff.kind) {
      case 'burn':
      case 'bleed':
        damage += eff.value;
        messages.push(
          eff.kind === 'burn'
            ? `🔥 *${label} burns for **${eff.value}** damage!*`
            : `🩸 *${label} bleeds for **${eff.value}** damage!*`
        );
        break;
      case 'regen':
        heal += eff.value;
        messages.push(`💚 *${label} regenerates **${eff.value}** HP!*`);
        break;
    }
    eff.turnsLeft--;
  }

  return { damage, heal, messages };
}

// ── Apply a move's effect to a target ────────────────
export function applyMoveEffect(
  move: MonsterMove,
  targetEffects: ActiveEffect[],
  source: string,
): string[] {
  if (!move.effect) return [];
  const { kind, value, duration } = move.effect;
  const msgs: string[] = [];

  // Remove existing same-kind effect and replace
  const idx = targetEffects.findIndex(e => e.kind === kind);
  const eff: ActiveEffect = { kind, value, turnsLeft: duration, source, duration };
  if (idx >= 0) targetEffects[idx] = eff;
  else targetEffects.push(eff);

  switch (kind) {
    case 'burn':    msgs.push(`🔥 *${source} inflicts **Burn** (${value}/turn × ${duration})!*`); break;
    case 'bleed':   msgs.push(`🩸 *${source} inflicts **Bleed** (${value}/turn × ${duration})!*`); break;
    case 'freeze':  msgs.push(`❄️ *${source} inflicts **Freeze** for ${duration} turn(s)!*`); break;
    case 'stun':    msgs.push(`⚡ *${source} inflicts **Stun** for ${duration} turn(s)!*`); break;
    case 'silence': msgs.push(`🤫 *${source} inflicts **Silence** for ${duration} turn(s)!*`); break;
    case 'slow':    msgs.push(`🐢 *${source} inflicts **Slow** (−${value} speed) for ${duration} turn(s)!*`); break;
    case 'mp_drain':msgs.push(`💜 *${source} drains **${value} MP**!*`); break;
    case 'regen':   msgs.push(`💚 *${source} gains **Regen** (${value}/turn × ${duration})!*`); break;
    case 'str_up':  msgs.push(`💪 *${source} gains **STR +${value}** for ${duration} turn(s)!*`); break;
    case 'agi_up':  msgs.push(`💨 *${source} gains **AGI +${value}** for ${duration} turn(s)!*`); break;
    case 'crit_up': msgs.push(`🎯 *${source} gains **CRIT +${value}%** for ${duration} turn(s)!*`); break;
  }

  return msgs;
}

// ── Check enrage ──────────────────────────────────────
export function checkEnrage(monster: Monster): boolean {
  if (!monster.isBoss || !monster.enrageAt) return false;
  return (monster.hp / monster.maxHp) * 100 <= monster.enrageAt;
}

// ── Build boss context for AI / dialogue ─────────────
export function buildBossContext(state: DungeonState, isEnraged: boolean): BossContext {
  return {
    lastPlayerDmg:      state.lastPlayerDmg,
    lastPlayerSkillName: state.lastPlayerSkillName,
    lastPlayerSkillKind: state.lastPlayerSkillKind,
    playerHpPercent:    Math.floor((state.playerHp / state.playerMaxHp) * 100),
    bossHpPercent:      Math.floor((state.monster.hp / state.monster.maxHp) * 100),
    turn:               state.turn,
    streak:             state.playerStreak,
    isEnraged,
    justHealed:         false,
  };
}

// ── Boss contextual dialogue ──────────────────────────
export function getBossReactionLine(
  monster: Monster,
  ctx: BossContext,
  dmgDealt: number,
): string | null {
  if (!monster.isBoss) return null;

  const hpPercent  = (monster.hp / monster.maxHp) * 100;
  const dmgPercent = (dmgDealt / monster.maxHp) * 100;

  // Priority order
  if (dmgPercent >= 40 && monster.reactToHeavyHit?.length) {
    return pick(monster.reactToHeavyHit);
  }
  if (dmgPercent < 10 && dmgDealt > 0 && monster.reactToLightHit?.length) {
    return pick(monster.reactToLightHit);
  }
  if (ctx.playerHpPercent < 25 && monster.reactToPlayerLow?.length) {
    return pick(monster.reactToPlayerLow);
  }
  if (hpPercent < 30 && !ctx.isEnraged && monster.reactToBossLow?.length) {
    return pick(monster.reactToBossLow);
  }
  // Mid battle thoughts every 3 turns
  if (ctx.turn % 3 === 0 && monster.midBattleThoughts?.length) {
    return pick(monster.midBattleThoughts);
  }

  return null;
}

// ── Death eulogy ──────────────────────────────────────
export function getDeathEulogy(state: DungeonState): string {
  const arc    = getArcForFloor(state.floor);
  const boss   = state.monster;

  const killLine = boss.isBoss && boss.playerKillTaunt
    ? `\n\n${boss.playerKillTaunt}`
    : '';

  return (
    `💀 *Your journey ends on floor **${state.floor}** — ${arc.name}.*\n` +
    `💀 *You cleared **${state.wavesCleared}** wave(s) and earned **${state.xpEarned} XP**.*` +
    killLine +
    `\n\n⚔️ *Your name is carved into the tower wall.*`
  );
}

// ── XP reward ────────────────────────────────────────
export function calcXpReward(floor: number, isBoss: boolean, noDeathRun: boolean): number {
  const base   = isBoss ? floor * 12 : floor * 5;
  const bonus  = noDeathRun ? Math.floor(base * 0.25) : 0;
  return base + bonus;
}

// ── Damage formula ────────────────────────────────────
export function calcDamage(
  baseDamage: number,
  attackerAtk: number,
  defenderDef: number,
  isCrit: boolean,
  effects: ActiveEffect[],
): number {
  const strBuff = effects.find(e => e.kind === 'str_up');
  const atk     = attackerAtk + (strBuff ? strBuff.value : 0);
  const raw     = baseDamage + Math.floor(atk * 0.6) - Math.floor(defenderDef * 0.4);
  const crit    = isCrit ? 1.5 : 1;
  return Math.max(1, Math.floor(raw * crit));
}

// ── Clean up expired effects ──────────────────────────
export function cleanEffects(effects: ActiveEffect[]): ActiveEffect[] {
  return effects.filter(e => e.turnsLeft > 0);
}

// ── Utility ───────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function isStunned(effects: ActiveEffect[]): boolean {
  return effects.some(e => (e.kind === 'stun' || e.kind === 'freeze') && e.turnsLeft > 0);
}

export function isSilenced(effects: ActiveEffect[]): boolean {
  return effects.some(e => e.kind === 'silence' && e.turnsLeft > 0);
}

export function getSpeedMod(effects: ActiveEffect[]): number {
  const haste = effects.find(e => e.kind === 'haste');
  const slow  = effects.find(e => e.kind === 'slow');
  return (haste ? haste.value : 0) - (slow ? slow.value : 0);
}
