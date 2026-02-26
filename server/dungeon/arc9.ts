// ═══════════════════════════════════════════════════════
//  ARC 9: THE EDGE OF EVERYTHING — Floors 81–90
//  Theme: Reality unraveling, the boundary of existence
//  "Past this point, the tower stops pretending to have rules."
// ═══════════════════════════════════════════════════════
import type { ArcData } from './types';

const arc9: ArcData = {
  arc: 9,
  name: "The Edge of Everything",
  theme: "reality",
  entryNarration: "*The walls stop being walls. They're still there — you can touch them — but they flicker. The floor exists only because you expect it to. The further you go, the less the tower agrees with itself. At the end of this arc is the boundary of what the tower is willing to be. Past that — the sovereign's throne.*",

  floorNarrations: {
    81: "*The first floor where the ceiling isn't sure it's a ceiling. It keeps becoming other things and correcting itself.*",
    82: "*You pass through a doorway and come out the same doorway from the other side. The third time this happens you stop questioning it.*",
    83: "*The gravity here has preferences. It cooperates — mostly. You learn quickly not to move with confidence.*",
    84: "*A creature passes through you. Not around — through. You're fine. It seems surprised.*",
    85: "*Halfway. The concept of halfway is doing its best here. You're approximately halfway. The tower is trying.*",
    86: "*Your memories become visible briefly — hanging in the air like smoke. The things on this floor can read them.*",
    87: "*The floor here is made of decisions. Every step sounds different based on what you chose to get here.*",
    88: "*Something looks at you that doesn't have eyes, a face, or a form. It looks at you anyway. With great interest.*",
    89: "*The final floor before the boundary. The tower here is at its most honest — it shows you the seams. The places it was put together. The places it's coming apart.*",
    90: "*The Cosmic Eye's floor. There is nothing here except open space and something the size of a planet, suspended, watching.*",
  },

  mobs: {
    81: {
      id: "ceiling_thing", name: "Flickering Ceiling Thing", emoji: "🔄",
      maxHp: 1620, maxMp: 220, attack: 188, defense: 44, speed: 52, isBoss: false,
      lore: "*Was a ceiling. Is now a creature. Is trying to go back to being a ceiling. You are in the way.*",
      moves: [
        { name: "Reality Slam",    emoji: "🔄", damage: 188, mpCost: 0,  weight: 4, taunt: "*Solidifies at the wrong moment to catch you.*" },
        { name: "Phase Shift",     emoji: "💨", damage: 155, mpCost: 45, weight: 3, effect: { kind: "slow", value: 45, duration: 3 }, taunt: "*Half real. Half not. All dangerous.*" },
        { name: "Reconstitute",    emoji: "🔁", damage: 0,   mpCost: 55, weight: 2, effect: { kind: "regen", value: 130, duration: 3 } },
      ],
    },
    82: {
      id: "doorway_paradox", name: "Doorway Paradox", emoji: "🚪",
      maxHp: 1660, maxMp: 200, attack: 192, defense: 40, speed: 58, isBoss: false,
      lore: "*The paradox that causes the doorways to loop. It's been doing this so long it's forgotten why. It attacks anyone who tries to solve it.*",
      moves: [
        { name: "Loop Strike",     emoji: "🔁", damage: 192, mpCost: 0,  weight: 3, taunt: "*Hits you from the same direction three times simultaneously.*" },
        { name: "Paradox Pulse",   emoji: "🌀", damage: 162, mpCost: 50, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*Causes a local paradox. Very uncomfortable.*" },
        { name: "Reset",           emoji: "🔄", damage: 0,   mpCost: 55, weight: 2, effect: { kind: "regen", value: 135, duration: 3 } },
      ],
    },
    83: {
      id: "gravity_wyrm", name: "Gravity Wyrm", emoji: "🌀",
      maxHp: 1700, maxMp: 240, attack: 196, defense: 46, speed: 48, isBoss: false,
      lore: "*The thing that makes gravity have preferences here. It finds you interesting. It expresses this through violence.*",
      moves: [
        { name: "Gravity Crush",   emoji: "⬇️", damage: 196, mpCost: 0,  weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*Triples your weight for one moment.*" },
        { name: "Anti-Grav",       emoji: "⬆️", damage: 165, mpCost: 45, weight: 3, effect: { kind: "slow", value: 48, duration: 4 }, taunt: "*Removes your gravity. You float. It hits you.*" },
        { name: "Equilibrium",     emoji: "⚖️", damage: 0,   mpCost: 60, weight: 2, effect: { kind: "regen", value: 140, duration: 3 } },
      ],
    },
    84: {
      id: "phase_walker", name: "Phase Walker", emoji: "👻",
      maxHp: 1680, maxMp: 220, attack: 194, defense: 38, speed: 65, isBoss: false,
      lore: "*Passes through solid matter as a matter of preference. It finds the concept of being stopped to be quaint.*",
      moves: [
        { name: "Phase Strike",    emoji: "👻", damage: 194, mpCost: 30, weight: 4, taunt: "*Attacks from inside your defense.*" },
        { name: "Through",         emoji: "💨", damage: 168, mpCost: 50, weight: 3, effect: { kind: "bleed", value: 55, duration: 4 }, taunt: "*Passes through you once. It hurts.*" },
        { name: "Phase Regen",     emoji: "🔁", damage: 0,   mpCost: 55, weight: 2, effect: { kind: "regen", value: 138, duration: 3 } },
      ],
    },
    85: {
      id: "halfway_horror", name: "The Halfway Horror", emoji: "❓",
      maxHp: 1740, maxMp: 260, attack: 200, defense: 50, speed: 54, isBoss: false,
      lore: "*Exists at exactly the halfway point of every possible measurement. You are exactly halfway through the arc. It has been waiting for you.*",
      moves: [
        { name: "Half Measure",    emoji: "⚖️", damage: 200, mpCost: 0,  weight: 3, taunt: "*Does exactly half of what it could do. Still devastating.*" },
        { name: "Full Measure",    emoji: "💥", damage: 170, mpCost: 60, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*Decides to stop measuring.*" },
        { name: "Equidistant",     emoji: "🔁", damage: 0,   mpCost: 65, weight: 2, effect: { kind: "regen", value: 145, duration: 3 } },
      ],
    },
    86: {
      id: "memory_feeder", name: "Memory Feeder", emoji: "🧠",
      maxHp: 1780, maxMp: 280, attack: 204, defense: 48, speed: 50, isBoss: false,
      lore: "*Reads your memories from the air where they've become visible. It uses what it finds. It has found things you forgot you remembered.*",
      moves: [
        { name: "Memory Strike",   emoji: "🧠", damage: 204, mpCost: 35, weight: 3, taunt: "*Uses a memory you'd forgotten. It hurts in a specific way.*" },
        { name: "Dredge",          emoji: "🌊", damage: 175, mpCost: 55, weight: 3, effect: { kind: "slow", value: 50, duration: 4 }, taunt: "*Pulls something from deep in your memory. You freeze for a moment.*" },
        { name: "Feed",            emoji: "🔁", damage: 0,   mpCost: 60, weight: 2, effect: { kind: "regen", value: 148, duration: 3 } },
      ],
    },
    87: {
      id: "decision_specter", name: "Decision Specter", emoji: "🔀",
      maxHp: 1820, maxMp: 260, attack: 208, defense: 52, speed: 46, isBoss: false,
      lore: "*Made from the sound of your footsteps on the floor of decisions. It is every path you didn't take, animated.*",
      moves: [
        { name: "Unmade Choice",   emoji: "🔀", damage: 208, mpCost: 0,  weight: 3, taunt: "*Attacks with the weight of every decision you ever made.*" },
        { name: "Other Path",      emoji: "💨", damage: 180, mpCost: 55, weight: 3, effect: { kind: "bleed", value: 58, duration: 4 }, taunt: "*Shows you what happens on the other path. It isn't better.*" },
        { name: "Reconsider",      emoji: "🔁", damage: 0,   mpCost: 65, weight: 2, effect: { kind: "regen", value: 152, duration: 3 } },
      ],
    },
    88: {
      id: "formless_interest", name: "Formless Interest", emoji: "🌌",
      maxHp: 1880, maxMp: 300, attack: 214, defense: 56, speed: 58, isBoss: false,
      lore: "*The thing that was looking at you with great interest. It has decided to express this interest more physically.*",
      moves: [
        { name: "Interested Strike",emoji: "🌌", damage: 214, mpCost: 0,  weight: 3, taunt: "*Expresses its fascination through impact.*" },
        { name: "Close Study",      emoji: "🔍", damage: 185, mpCost: 60, weight: 3, effect: { kind: "silence", value: 0, duration: 2 }, taunt: "*Examines you too closely. Too close.*" },
        { name: "Absorb Interest",  emoji: "🔁", damage: 0,   mpCost: 70, weight: 2, effect: { kind: "regen", value: 158, duration: 3 } },
      ],
    },
    89: {
      id: "seam_guardian", name: "Seam Guardian", emoji: "🪡",
      maxHp: 1960, maxMp: 320, attack: 222, defense: 58, speed: 52, isBoss: false,
      lore: "*Guards the seams where the tower was put together. It does not want you examining them too closely. You have been examining them too closely.*",
      moves: [
        { name: "Seam Seal",       emoji: "🪡", damage: 222, mpCost: 0,  weight: 3, taunt: "*Closes a seam directly through you.*" },
        { name: "Patch",           emoji: "🔧", damage: 192, mpCost: 65, weight: 3, effect: { kind: "slow", value: 52, duration: 4 }, taunt: "*Patches the reality around you. You get caught in it.*" },
        { name: "Reinforce",       emoji: "💪", damage: 0,   mpCost: 75, weight: 2, effect: { kind: "regen", value: 165, duration: 3 } },
        { name: "Final Seal",      emoji: "🔒", damage: 275, mpCost: 95, weight: 1, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*Seals the floor behind you too. No going back from here.*" },
      ],
    },
  },

  boss: {
    id: "the_cosmic_eye", name: "The Cosmic Eye", emoji: "🌌",
    maxHp: 6800, maxMp: 1000, attack: 228, defense: 75, speed: 68, isBoss: true,
    lore: "*It has watched every version of this fight. In every possible timeline, across every iteration of this tower, The Cosmic Eye has watched warriors climb these floors. It has seen every choice, every mistake, every triumph. It knows every version of you. It is fighting the composite of them all.*",

    entranceMonologue: [
      `🌌 *Open space.*`,
      `🌌 *Then — slowly — a pupil.*`,
      `🌌 *The size of a moon.*`,
      `🌌 *Looking at you.*`,
      `🌌 **The Cosmic Eye:** *"I have watched you."*`,
      `🌌 *The voice comes from everywhere.*`,
      `🌌 **The Cosmic Eye:** *"Not just today. Every version of today."*`,
      `🌌 **The Cosmic Eye:** *"In 4,847 timelines, you did not reach this floor."*`,
      `🌌 **The Cosmic Eye:** *"In 312, you reached it and turned back."*`,
      `🌌 **The Cosmic Eye:** *"In 7, you reached it and fought."*`,
      `🌌 *A pause.*`,
      `🌌 **The Cosmic Eye:** *"In 3 of those 7 — you won."*`,
      `🌌 **The Cosmic Eye:** *"I know which version of you is standing here."*`,
      `🌌 **The Cosmic Eye:** *"The question is — do you?"*`,
    ],

    deathMonologue: `🌌 *The pupil contracts.*\n🌌 *Then expands.*\n🌌 **The Cosmic Eye:** *"...This timeline."*\n🌌 **The Cosmic Eye:** *"Out of 5,166 — this is the one."*\n🌌 *A long silence.*\n🌌 **The Cosmic Eye:** *"I watched you become this."*\n🌌 **The Cosmic Eye:** *"I am glad I was watching."*\n🌌 *The eye closes.*`,

    playerKillTaunt: `🌌 **The Cosmic Eye:** *"4,848 timelines where you do not reach the next floor."*\n🌌 **The Cosmic Eye:** *"The data is updated."*\n🌌 **The Cosmic Eye:** *"Return. I will watch for the version that succeeds."*`,

    reactToHeavyHit: [
      `🌌 **The Cosmic Eye:** *"In only 41 timelines did a warrior strike me that hard."*\n🌌 **The Cosmic Eye:** *"You are performing above projection."*`,
      `🌌 **The Cosmic Eye:** *"Unexpected. I am updating my model."*`,
      `🌌 **The Cosmic Eye:** *"I have seen this hit before. Not often."*\n🌌 **The Cosmic Eye:** *"You are in rare company."*`,
    ],

    reactToLightHit: [
      `🌌 **The Cosmic Eye:** *"97.3% of warriors hit harder at this stage."*`,
      `🌌 **The Cosmic Eye:** *"You are holding back. I have watched you not hold back. Do that."*`,
      `🌌 **The Cosmic Eye:** *"That is below your capability. I have observed your capability."*`,
    ],

    reactToHeal: [
      `🌌 **The Cosmic Eye:** *"I have watched this tower for longer than it has existed. I regenerate from observation itself."*`,
      `🌌 **The Cosmic Eye:** *"Every timeline sustains me."*`,
    ],

    reactToPlayerLow: [
      `🌌 **The Cosmic Eye:** *"In the 3 timelines where you won — you were at this HP at this point."*\n🌌 **The Cosmic Eye:** *"You survived it before. You can survive it now."*`,
      `🌌 **The Cosmic Eye:** *"Low. But this is where the timelines diverge."*\n🌌 **The Cosmic Eye:** *"Choose carefully."*`,
    ],

    reactToBossLow: [
      `🌌 **The Cosmic Eye:** *"...You are matching the winning timelines."*\n🌌 *The pupil widens.*\n🌌 **The Cosmic Eye:** *"This is the moment."*`,
      `🌌 **The Cosmic Eye:** *"I have watched 5,166 versions of this fight."*\n🌌 **The Cosmic Eye:** *"I have never seen this far into the winning path."*`,
    ],

    midBattleThoughts: [
      `🌌 **The Cosmic Eye:** *"You fight differently than your other selves. More... present."*`,
      `🌌 **The Cosmic Eye:** *"I've watched you make that choice before. In other timelines, you chose differently."*`,
      `🌌 **The Cosmic Eye:** *"The version of you that turned back on floor 81 — I wonder if it regrets it."*`,
      `🌌 **The Cosmic Eye:** *"You are not the strongest version of yourself I've watched. You are the most determined."*`,
      `🌌 **The Cosmic Eye:** *"Every timeline that brought you here — every choice that led to this moment — was necessary."*`,
    ],

    enrageLines: [
      `🌌 *The pupil cracks.*`,
      `🌌 **The Cosmic Eye:** *"I have watched this tower fall before."*`,
      `🌌 **The Cosmic Eye:** *"I will not watch it fall TODAY."*`,
      `🌌 **The Cosmic Eye — ENRAGED:** *"5,166 TIMELINES OF WATCHING — AND THIS IS THE ONE THAT TESTS ME?"*`,
    ],

    enrageAt: 22,

    moves: [
      { name: "Timeline Strike",    emoji: "🌌", damage: 222, mpCost: 0,  weight: 3,
        taunt: `🌌 **The Cosmic Eye:** *"Timeline Strike."*\n🌌 *"From every timeline at once."*` },
      { name: "Cosmic Vision",      emoji: "👁️", damage: 180, mpCost: 75, weight: 3, effect: { kind: "stun", value: 0, duration: 1 },
        taunt: `🌌 **The Cosmic Eye:** *"Cosmic Vision."*\n🌌 *"I show you every version of this fight you lose."*` },
      { name: "Reality Sunder",     emoji: "💥", damage: 200, mpCost: 85, weight: 2, effect: { kind: "bleed", value: 62, duration: 5 },
        taunt: `🌌 **The Cosmic Eye:** *"Reality Sunder."*\n🌌 *"The boundary tears."*` },
      { name: "Observation",        emoji: "🔍", damage: 155, mpCost: 80, weight: 2, effect: { kind: "silence", value: 0, duration: 3 },
        taunt: `🌌 **The Cosmic Eye:** *"Observation."*\n🌌 *"I watch so closely that the watching becomes damage."*` },
      { name: "Cosmic Regen",       emoji: "🔁", damage: 0,   mpCost: 80, weight: 1, effect: { kind: "regen", value: 170, duration: 3 },
        taunt: `🌌 **The Cosmic Eye:** *"Cosmic Regen."*\n🌌 *"Every timeline where I survived restores me."*` },
    ],

    enrageMoves: [
      { name: "ALL TIMELINES",      emoji: "🌌", damage: 355, mpCost: 0,   weight: 3,
        taunt: `🌌 **The Cosmic Eye — ENRAGED:** *"ALL TIMELINES."*\n🌌 *"EVERY VERSION OF THIS FIGHT. SIMULTANEOUSLY."*` },
      { name: "Existence Breach",   emoji: "💥", damage: 288, mpCost: 120, weight: 3, effect: { kind: "silence", value: 0, duration: 3 },
        taunt: `🌌 **The Cosmic Eye — ENRAGED:** *"Existence Breach."*\n🌌 *"THE BOUNDARY BETWEEN TIMELINES BREAKS."*` },
      { name: "Omniscient Wrath",   emoji: "🌟", damage: 235, mpCost: 100, weight: 2, effect: { kind: "stun", value: 0, duration: 1 },
        taunt: `🌌 **The Cosmic Eye — ENRAGED:** *"Omniscient Wrath."*\n🌌 *"I KNOW EVERY WEAKNESS YOU HAVE. ALL OF THEM. NOW."*` },
    ],
  },
};

export default arc9;
