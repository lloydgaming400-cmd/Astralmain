// ═══════════════════════════════════════════════════════
//  ARC 3: THE BLEEDING MAZE — Floors 21–30
// ═══════════════════════════════════════════════════════
import type { ArcData } from './types';

const arc3: ArcData = {
  arc: 3, name: "The Bleeding Maze", theme: "cursed",
  entryNarration: "*The corridors shift. You are certain you've seen this corner before. You have. The walls here are slick with something dark.*",
  floorNarrations: {
    21: "*The maze begins. The first corridor looks simple. It is not.*",
    22: "*You've been walking for what feels like hours. According to the marks you've left — it's been ten minutes.*",
    23: "*A fork. Both paths look identical. You pick one. The maze picks the other.*",
    24: "*The walls bleed here. Not metaphorically. Just — slowly. From nowhere.*",
    25: "*Halfway. The maze is denser here. Something is rearranging itself behind you as you walk.*",
    26: "*You find the bones of someone who made it this far. They built a shelter out of rations. The rations are gone.*",
    27: "*The walls start whispering. Not words exactly. Just... intent.*",
    28: "*The maze begins to feel personal. Like it was designed for you specifically.*",
    29: "*The maze opens into a wider chamber. The floor is polished stone. Your reflection is already there, waiting.*",
    30: "*The center of the maze. No walls. Just open space. And something that has been thinking about you since you entered.*",
  },
  mobs: {
    21: { id: "maze_mimic", name: "Maze Mimic", emoji: "📦", maxHp: 420, maxMp: 60, attack: 50, defense: 12, speed: 28, isBoss: false,
      lore: "*It looked like a door. Then it bit you.*",
      moves: [
        { name: "Surprise Bite",  emoji: "😱", damage: 65, mpCost: 0,  weight: 3 },
        { name: "Crushing Maw",   emoji: "👄", damage: 50, mpCost: 0,  weight: 4 },
        { name: "Lure Gleam",     emoji: "✨", damage: 15, mpCost: 30, weight: 2, effect: { kind: "slow", value: 16, duration: 2 } },
      ],
    },
    22: { id: "blood_stalker", name: "Blood Stalker", emoji: "🩸", maxHp: 380, maxMp: 50, attack: 54, defense: 9, speed: 46, isBoss: false,
      lore: "*It follows the scent of wounds.*",
      moves: [
        { name: "Frenzy Strike", emoji: "🩸", damage: 54, mpCost: 0,  weight: 4, effect: { kind: "bleed", value: 22, duration: 3 } },
        { name: "Relentless",    emoji: "💨", damage: 42, mpCost: 20, weight: 3 },
        { name: "Blood Taste",   emoji: "🦷", damage: 30, mpCost: 25, weight: 2, effect: { kind: "str_up", value: 18, duration: 3 } },
      ],
    },
    23: { id: "fork_wraith", name: "Fork Wraith", emoji: "🌀", maxHp: 400, maxMp: 80, attack: 48, defense: 8, speed: 40, isBoss: false,
      lore: "*Born at every intersection. This is your third wrong turn.*",
      moves: [
        { name: "Wrong Path",   emoji: "🌀", damage: 48, mpCost: 20, weight: 4, effect: { kind: "slow", value: 20, duration: 2 } },
        { name: "Doubt Strike", emoji: "💀", damage: 38, mpCost: 15, weight: 3 },
        { name: "Maze Shift",   emoji: "💨", damage: 0,  mpCost: 30, weight: 2, effect: { kind: "regen", value: 28, duration: 2 } },
      ],
    },
    24: { id: "wall_bleeder", name: "Wall Bleeder", emoji: "🩸", maxHp: 440, maxMp: 60, attack: 52, defense: 14, speed: 20, isBoss: false,
      lore: "*It emerges from the bleeding walls. It IS part of the bleeding walls.*",
      moves: [
        { name: "Wall Slam",   emoji: "🏚️", damage: 52, mpCost: 0,  weight: 4 },
        { name: "Bleed Pulse", emoji: "🩸", damage: 36, mpCost: 25, weight: 3, effect: { kind: "bleed", value: 20, duration: 4 } },
        { name: "Absorb",      emoji: "🌀", damage: 0,  mpCost: 20, weight: 2, effect: { kind: "regen", value: 32, duration: 2 } },
      ],
    },
    25: { id: "echo_hunter", name: "Echo Hunter", emoji: "👥", maxHp: 460, maxMp: 70, attack: 56, defense: 16, speed: 36, isBoss: false,
      lore: "*Made from the echoes of your own footsteps. It knows exactly how you move.*",
      moves: [
        { name: "Echo Strike",  emoji: "👥", damage: 56, mpCost: 0,  weight: 4 },
        { name: "Anticipate",   emoji: "🎯", damage: 45, mpCost: 30, weight: 3, effect: { kind: "stun", value: 0, duration: 1 } },
        { name: "Reverberate",  emoji: "💥", damage: 38, mpCost: 25, weight: 2, effect: { kind: "bleed", value: 18, duration: 3 } },
      ],
    },
    26: { id: "maze_devourer", name: "Maze Devourer", emoji: "👾", maxHp: 500, maxMp: 80, attack: 58, defense: 18, speed: 18, isBoss: false,
      lore: "*Slow. Enormous. It eats the walls to grow larger.*",
      moves: [
        { name: "Devour",     emoji: "👾", damage: 58, mpCost: 0,  weight: 3 },
        { name: "Wall Crush", emoji: "🏚️", damage: 48, mpCost: 0,  weight: 3, effect: { kind: "stun", value: 0, duration: 1 } },
        { name: "Grow",       emoji: "📈", damage: 0,  mpCost: 35, weight: 2, effect: { kind: "str_up", value: 22, duration: 3 } },
      ],
    },
    27: { id: "whisper_shade", name: "Whisper Shade", emoji: "🤫", maxHp: 480, maxMp: 100, attack: 54, defense: 12, speed: 42, isBoss: false,
      lore: "*The whispering you heard in the walls. It has taken shape. It is saying your name now.*",
      moves: [
        { name: "Soul Whisper",  emoji: "🤫", damage: 54, mpCost: 30, weight: 3, effect: { kind: "silence", value: 0, duration: 2 } },
        { name: "Psychic Slash", emoji: "🧠", damage: 44, mpCost: 25, weight: 3 },
        { name: "Mind Drain",    emoji: "🌀", damage: 28, mpCost: 35, weight: 2, effect: { kind: "mp_drain", value: 45, duration: 1 } },
      ],
    },
    28: { id: "personal_horror", name: "The Personal Horror", emoji: "😨", maxHp: 520, maxMp: 90, attack: 60, defense: 15, speed: 30, isBoss: false,
      lore: "*The maze read your fears and made something from them.*",
      moves: [
        { name: "Fear Strike",    emoji: "😨", damage: 60, mpCost: 0,  weight: 4 },
        { name: "Manifest Dread", emoji: "💀", damage: 45, mpCost: 30, weight: 3, effect: { kind: "slow", value: 25, duration: 3 } },
        { name: "Know You",       emoji: "👁️", damage: 38, mpCost: 40, weight: 2, effect: { kind: "stun", value: 0, duration: 1 } },
      ],
    },
    29: { id: "maze_twin", name: "Maze Twin", emoji: "🪞", maxHp: 560, maxMp: 100, attack: 64, defense: 20, speed: 35, isBoss: false,
      lore: "*Your reflection, stepped out of the polished floor. It fights exactly like you. Except it doesn't hold back.*",
      moves: [
        { name: "Perfect Mirror", emoji: "🪞", damage: 64, mpCost: 0,  weight: 4 },
        { name: "Exploit",        emoji: "🎯", damage: 52, mpCost: 30, weight: 3, effect: { kind: "bleed", value: 24, duration: 3 } },
        { name: "Counter",        emoji: "⚡", damage: 48, mpCost: 25, weight: 2, effect: { kind: "stun", value: 0, duration: 1 } },
      ],
    },
  },
  boss: {
    id: "labyrinth_mind", name: "The Labyrinth Mind", emoji: "🧠",
    maxHp: 3200, maxMp: 500, attack: 105, defense: 28, speed: 38, isBoss: true,
    lore: "*The maze is not a structure. The maze is this being's thoughts, made physical.*",
    entranceMonologue: [
      `🧠 *The walls stop moving. The bleeding stops. The entire maze goes still at once.*`,
      `🧠 **The Labyrinth Mind:** *"I know every path you took to reach me."*`,
      `🧠 **The Labyrinth Mind:** *"I have constructed a simulation of you in my mind. I've run this fight eleven thousand times."*`,
      `🧠 **The Labyrinth Mind:** *"The simulation wins in 94.7% of them."*`,
      `🧠 **The Labyrinth Mind:** *"I am... curious about the other 5.3%."*`,
    ],
    deathMonologue: `🧠 **The Labyrinth Mind:** *"...I ran eleven thousand simulations."*\n🧠 **The Labyrinth Mind:** *"I did not account for... this particular variable."*\n🧠 **The Labyrinth Mind:** *"Fascinating. Even at the end, I'm still learning."*`,
    playerKillTaunt: `🧠 **The Labyrinth Mind:** *"This outcome had a 94.7% probability. You were simply in the majority."*`,
    reactToHeavyHit: [
      `🧠 **The Labyrinth Mind:** *"...That deviated from my projections. Recalculating."*`,
      `🧠 **The Labyrinth Mind:** *"You are performing above your statistical expectation."*`,
    ],
    reactToLightHit: [
      `🧠 **The Labyrinth Mind:** *"Below projected damage. Either you're holding back — or you're at your limit."*`,
      `🧠 **The Labyrinth Mind:** *"You're telegraphing that attack. I know it's coming three moves before you use it."*`,
    ],
    reactToHeal: [
      `🧠 **The Labyrinth Mind:** *"The maze does not tire."*`,
    ],
    reactToPlayerLow: [
      `🧠 **The Labyrinth Mind:** *"Your HP is at critical threshold. Don't make your final error."*`,
    ],
    reactToBossLow: [
      `🧠 **The Labyrinth Mind:** *"...This is the 5.3%."*\n🧠 **The Labyrinth Mind:** *"I need to understand how."*`,
      `🧠 **The Labyrinth Mind:** *"I am experiencing something I haven't before. I think it's uncertainty."*`,
    ],
    midBattleThoughts: [
      `🧠 **The Labyrinth Mind:** *"You're adapting faster than projected. Revision initiated."*`,
      `🧠 **The Labyrinth Mind:** *"Stop trying to predict me. I'm three layers ahead."*`,
    ],
    enrageLines: [
      `🧠 **The Labyrinth Mind:** *"My simulations are failing."*`,
      `🧠 **The Labyrinth Mind — ENRAGED:** *"THEN I WILL STOP CALCULATING AND START DESTROYING."*`,
    ],
    enrageAt: 22,
    moves: [
      { name: "Maze Collapse",     emoji: "🏚️", damage: 98,  mpCost: 0,  weight: 3, taunt: `🧠 **The Labyrinth Mind:** *"Maze Collapse."*` },
      { name: "Mirror Strike",     emoji: "🪞", damage: 88,  mpCost: 40, weight: 3, effect: { kind: "bleed", value: 28, duration: 3 }, taunt: `🧠 **The Labyrinth Mind:** *"Mirror Strike. Efficient."*` },
      { name: "Disorientation",    emoji: "🌀", damage: 40,  mpCost: 45, weight: 2, effect: { kind: "silence", value: 0, duration: 2 }, taunt: `🧠 **The Labyrinth Mind:** *"Disorientation."*` },
      { name: "Calculated Strike", emoji: "🎯", damage: 125, mpCost: 55, weight: 2, taunt: `🧠 **The Labyrinth Mind:** *"Calculated Strike."*` },
      { name: "Rebuild",           emoji: "🔧", damage: 0,   mpCost: 50, weight: 1, effect: { kind: "regen", value: 88, duration: 3 }, taunt: `🧠 **The Labyrinth Mind:** *"Rebuild."*` },
    ],
    enrageMoves: [
      { name: "TOTAL MAZE",    emoji: "🌀", damage: 195, mpCost: 0,  weight: 3, taunt: `🧠 **The Labyrinth Mind — ENRAGED:** *"TOTAL MAZE. THERE IS NO EXIT."*` },
      { name: "Mind Crush",    emoji: "💥", damage: 162, mpCost: 65, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: `🧠 **The Labyrinth Mind — ENRAGED:** *"Mind Crush."*` },
      { name: "Infinite Loop", emoji: "🔁", damage: 115, mpCost: 70, weight: 2, effect: { kind: "burn", value: 48, duration: 5 }, taunt: `🧠 **The Labyrinth Mind — ENRAGED:** *"Infinite Loop."*` },
    ],
  },
};

export default arc3;
