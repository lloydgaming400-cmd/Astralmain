// ═══════════════════════════════════════════════════════
//  ARC 2: TOMB OF THE ANCIENTS — Floors 11–20
// ═══════════════════════════════════════════════════════
import type { ArcData } from './types';

const arc2: ArcData = {
  arc: 2,
  name: "Tomb of the Ancients",
  theme: "undead",
  entryNarration: "*Carved hieroglyphs cover every surface — warnings in a language older than your civilization. The air tastes of embalming oil and old gold. Something royal is buried here. It did not stay buried.*",
  floorNarrations: {
    11: "*The descent into the tomb. Gold-plated walls. Torches that burn without fuel. You get the feeling you've been expected.*",
    12: "*Sarcophagi line the walls — all open. All empty. Whatever was inside them is now somewhere ahead of you.*",
    13: "*A throne room. The throne is occupied by a skeleton wearing a crown. The skeleton turns its head as you enter.*",
    14: "*The floor is covered in sand. It shouldn't be this deep underground. The sand is moving.*",
    15: "*Halfway through the tomb. The carvings on the walls change here — they start showing a warrior descending. The warrior looks like you.*",
    16: "*Canopic jars line the shelves, thousands of them. One of them is breathing.*",
    17: "*The temperature drops twenty degrees. Frost forms on the gold. A voice begins chanting in a dead language.*",
    18: "*You find a room full of mirrors. Every reflection shows you dead on the floor. The reflections are smiling.*",
    19: "*The final corridor before the throne room. One set of massive footprints leading toward the sealed door.*",
    20: "*The door to the throne room is sealed with seven locks. As you approach, all seven unlock themselves.*",
  },
  mobs: {
    1: {
      id: "mummy_warrior", name: "Mummy Warrior", emoji: "🧟",
      maxHp: 340, maxMp: 40, attack: 38, defense: 16, speed: 13, isBoss: false,
      lore: "*It was a general once. It remembers the commands given to it centuries ago. It is still following them.*",
      moves: [
        { name: "Ancient Strike", emoji: "⚔️", damage: 38, mpCost: 0,  weight: 4 },
        { name: "Curse Wrap",     emoji: "🌀", damage: 22, mpCost: 20, weight: 3, effect: { kind: "slow", value: 20, duration: 3 } },
        { name: "Death Rattle",   emoji: "💀", damage: 16, mpCost: 15, weight: 2, effect: { kind: "stun", value: 0, duration: 1 } },
      ],
    },
    2: {
      id: "scarab_swarm", name: "Scarab Swarm", emoji: "🪲",
      maxHp: 300, maxMp: 0, attack: 32, defense: 5, speed: 44, isBoss: false,
      lore: "*Individually harmless. Together they stripped a pharaoh to bones in four seconds.*",
      moves: [
        { name: "Devour",         emoji: "🪲", damage: 32, mpCost: 0, weight: 4, effect: { kind: "bleed", value: 12, duration: 4 } },
        { name: "Shell Barrage",  emoji: "💥", damage: 26, mpCost: 0, weight: 3 },
        { name: "Scatter Reform", emoji: "💨", damage: 0,  mpCost: 0, weight: 2, effect: { kind: "regen", value: 20, duration: 1 } },
      ],
    },
    3: {
      id: "tomb_shade", name: "Tomb Shade", emoji: "🌫️",
      maxHp: 320, maxMp: 80, attack: 36, defense: 9, speed: 32, isBoss: false,
      lore: "*The ghost of someone buried alive. It has had centuries to be angry about that.*",
      moves: [
        { name: "Grievous Touch",  emoji: "👋", damage: 36, mpCost: 20, weight: 3, effect: { kind: "burn", value: 14, duration: 3 } },
        { name: "Phantom Shriek",  emoji: "😱", damage: 22, mpCost: 25, weight: 3, effect: { kind: "silence", value: 0, duration: 1 } },
        { name: "Phase Out",       emoji: "🌀", damage: 0,  mpCost: 20, weight: 2, effect: { kind: "regen", value: 26, duration: 2 } },
      ],
    },
    4: {
      id: "sand_serpent", name: "Sand Serpent", emoji: "🐍",
      maxHp: 360, maxMp: 50, attack: 40, defense: 10, speed: 38, isBoss: false,
      lore: "*Ancient burial guardian. Coiled in the sand for centuries. It has been waiting.*",
      moves: [
        { name: "Tomb Strike",   emoji: "🐍", damage: 40, mpCost: 0,  weight: 4 },
        { name: "Constrict",     emoji: "🌀", damage: 28, mpCost: 20, weight: 3, effect: { kind: "slow", value: 22, duration: 3 } },
        { name: "Ancient Venom", emoji: "☠️", damage: 20, mpCost: 30, weight: 2, effect: { kind: "burn", value: 16, duration: 5 } },
      ],
    },
    5: {
      id: "cursed_soldier", name: "Cursed Soldier", emoji: "⚔️",
      maxHp: 380, maxMp: 60, attack: 42, defense: 18, speed: 20, isBoss: false,
      lore: "*A soldier cursed to guard this floor forever.*",
      moves: [
        { name: "Cursed Blade", emoji: "⚔️", damage: 42, mpCost: 0,  weight: 4 },
        { name: "War Cry",      emoji: "📣", damage: 15, mpCost: 25, weight: 3, effect: { kind: "stun", value: 0, duration: 1 } },
        { name: "Bone Shield",  emoji: "🛡️", damage: 0,  mpCost: 30, weight: 2, effect: { kind: "regen", value: 30, duration: 2 } },
      ],
    },
    6: {
      id: "canopic_horror", name: "Canopic Horror", emoji: "🫙",
      maxHp: 350, maxMp: 70, attack: 38, defense: 14, speed: 22, isBoss: false,
      lore: "*The organs removed during mummification were stored in jars. The organs have opinions about that.*",
      moves: [
        { name: "Organ Lash",   emoji: "🩸", damage: 38, mpCost: 0,  weight: 3, effect: { kind: "bleed", value: 16, duration: 4 } },
        { name: "Decay Cloud",  emoji: "☠️", damage: 25, mpCost: 30, weight: 3, effect: { kind: "burn", value: 14, duration: 3 } },
        { name: "Jar Shatter",  emoji: "💥", damage: 45, mpCost: 35, weight: 2 },
      ],
    },
    7: {
      id: "frost_priest", name: "Frost Priest", emoji: "🧊",
      maxHp: 400, maxMp: 100, attack: 44, defense: 15, speed: 18, isBoss: false,
      lore: "*A high priest preserved by the cold. It stopped chanting for a moment to fight you.*",
      moves: [
        { name: "Ice Curse",     emoji: "❄️", damage: 44, mpCost: 30, weight: 3, effect: { kind: "freeze", value: 0, duration: 1 } },
        { name: "Ritual Strike", emoji: "⚡", damage: 38, mpCost: 20, weight: 3 },
        { name: "Frostbind",     emoji: "🌀", damage: 18, mpCost: 35, weight: 2, effect: { kind: "slow", value: 28, duration: 4 } },
        { name: "Preservation",  emoji: "💚", damage: 0,  mpCost: 40, weight: 2, effect: { kind: "regen", value: 35, duration: 3 } },
      ],
    },
    8: {
      id: "mirror_revenant", name: "Mirror Revenant", emoji: "🪞",
      maxHp: 420, maxMp: 80, attack: 46, defense: 12, speed: 35, isBoss: false,
      lore: "*Your own reflection, stepped out of the mirror.*",
      moves: [
        { name: "Mirror Strike", emoji: "🪞", damage: 46, mpCost: 0,  weight: 4 },
        { name: "Reflection",    emoji: "💥", damage: 36, mpCost: 25, weight: 3, effect: { kind: "bleed", value: 18, duration: 3 } },
        { name: "False Image",   emoji: "💨", damage: 0,  mpCost: 30, weight: 2, effect: { kind: "slow", value: 20, duration: 2 } },
      ],
    },
    9: {
      id: "royal_champion", name: "Royal Champion", emoji: "🏆",
      maxHp: 480, maxMp: 90, attack: 50, defense: 22, speed: 28, isBoss: false,
      lore: "*The pharaoh's personal bodyguard. Rewarded with undeath so it could keep serving.*",
      moves: [
        { name: "Champion's Blow", emoji: "🏆", damage: 50, mpCost: 0,  weight: 3 },
        { name: "Royal Decree",    emoji: "📜", damage: 35, mpCost: 30, weight: 3, effect: { kind: "stun", value: 0, duration: 1 } },
        { name: "Last Guard",      emoji: "🛡️", damage: 0,  mpCost: 35, weight: 2, effect: { kind: "regen", value: 40, duration: 3 } },
        { name: "Execute",         emoji: "⚔️", damage: 65, mpCost: 50, weight: 1 },
      ],
    },
  },
  boss: {
    id: "pharaoh_azenkhem", name: "Pharaoh Azenkhem", emoji: "𓂀",
    maxHp: 2800, maxMp: 400, attack: 88, defense: 30, speed: 30, isBoss: true,
    lore: "*He ruled for a thousand years. Then he died. Then he kept ruling.*",
    entranceMonologue: [
      `𓂀 *The seven locks on the throne room door open in sequence.*`,
      `𓂀 *A hand reaches out — adorned with ten rings, each worth more than your life.*`,
      `𓂀 **Pharaoh Azenkhem:** *"You walk into my tomb... as though you belong here."*`,
      `𓂀 **Azenkhem:** *"I have added every warrior who preceded you to my collection. Their shadows decorate my walls."*`,
      `𓂀 **Azenkhem:** *"Kneel, or bleed. Either way — I win."*`,
    ],
    deathMonologue: `𓂀 *The gold cracks. The crown falls.*\n𓂀 **Azenkhem:** *"A thousand years... ruling... dying... ruling again..."*\n𓂀 **Azenkhem:** *"...You were worthy of the fight. I'll admit that."*`,
    playerKillTaunt: `𓂀 **Azenkhem:** *"Your shadow now belongs to me. As it always would."*`,
    reactToHeavyHit: [
      `𓂀 **Azenkhem:** *"...That was not nothing. Careful. I take notes."*`,
      `𓂀 **Azenkhem:** *"I have not been struck like that in three centuries."*\n𓂀 **Azenkhem:** *"Don't expect it to work twice."*`,
    ],
    reactToLightHit: [
      `𓂀 **Azenkhem:** *"Was that meant to hurt me?"*`,
      `𓂀 **Azenkhem:** *"You're not trying. Or you can't. I'm not sure which is worse."*`,
    ],
    reactToHeal: [
      `𓂀 **Azenkhem:** *"I have regenerated from far worse than you across a thousand years."*`,
    ],
    reactToPlayerLow: [
      `𓂀 **Azenkhem:** *"Your strength fades. Dignity, warrior. Don't beg at the end."*`,
    ],
    reactToBossLow: [
      `𓂀 **Azenkhem:** *"...Impossible. In a thousand years — not one warrior has brought me this low."*`,
      `𓂀 **Azenkhem:** *"I see now. You are different from the others."*`,
    ],
    midBattleThoughts: [
      `𓂀 **Azenkhem:** *"You fight with conviction. Not yet enough."*`,
      `𓂀 **Azenkhem:** *"I have killed gods. You are not a god. But you are... something."*`,
    ],
    enrageLines: [
      `𓂀 *The thousand-year composure finally cracks.*`,
      `𓂀 **Azenkhem — ENRAGED:** *"I WILL NOT LET A THOUSAND YEARS END LIKE THIS."*`,
    ],
    enrageAt: 25,
    moves: [
      { name: "Royal Decree",      emoji: "📜", damage: 82,  mpCost: 0,  weight: 3, taunt: `𓂀 **Azenkhem:** *"Royal Decree."*` },
      { name: "Scarab Summon",     emoji: "🪲", damage: 60,  mpCost: 35, weight: 3, effect: { kind: "bleed", value: 22, duration: 4 }, taunt: `𓂀 **Azenkhem:** *"Scarab Summon."*` },
      { name: "Curse of Ages",     emoji: "⏳", damage: 40,  mpCost: 50, weight: 2, effect: { kind: "slow", value: 30, duration: 4 }, taunt: `𓂀 **Azenkhem:** *"Curse of Ages."*` },
      { name: "Sarcophagus Crush", emoji: "📦", damage: 105, mpCost: 45, weight: 2, effect: { kind: "stun", value: 0, duration: 1 }, taunt: `𓂀 **Azenkhem:** *"Sarcophagus Crush."*` },
      { name: "Eternal Guard",     emoji: "🏛️", damage: 0,   mpCost: 40, weight: 1, effect: { kind: "regen", value: 70, duration: 3 }, taunt: `𓂀 **Azenkhem:** *"Eternal Guard."*` },
    ],
    enrageMoves: [
      { name: "DIVINE WRATH",  emoji: "☀️", damage: 185, mpCost: 0,  weight: 3, taunt: `𓂀 **Azenkhem — ENRAGED:** *"DIVINE WRATH. A PHARAOH IS A GOD."*` },
      { name: "Mummy Legion",  emoji: "🧟", damage: 140, mpCost: 60, weight: 3, effect: { kind: "bleed", value: 38, duration: 5 }, taunt: `𓂀 **Azenkhem — ENRAGED:** *"Mummy Legion. RISE."*` },
      { name: "Eternal Curse", emoji: "⛓️", damage: 100, mpCost: 70, weight: 2, effect: { kind: "silence", value: 0, duration: 3 }, taunt: `𓂀 **Azenkhem — ENRAGED:** *"Eternal Curse. BE SILENT."*` },
    ],
  },
};

export default arc2;
