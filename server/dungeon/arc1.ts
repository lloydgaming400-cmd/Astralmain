// ═══════════════════════════════════════════════════════
//  ARC 1: THE FORSAKEN GATE — Floors 1–10
// ═══════════════════════════════════════════════════════
import type { ArcData } from './types';

const arc1: ArcData = {
  arc: 1,
  name: "The Forsaken Gate",
  theme: "ruins",
  entryNarration: "*The gate looms above you — cracked stone, dead vines, the smell of iron and age. Somewhere ahead, something shifts. It heard you arrive.*",
  floorNarrations: {
    1:  "*The first step. The stone groans beneath your weight as if warning you. Something scurries in the dark ahead.*",
    2:  "*The corridor narrows. Claw marks line the walls — long, deep, desperate. Whatever made them was trying to get OUT.*",
    3:  "*A statue of a warrior stands cracked in the corner. Its face has been scratched out. Recently.*",
    4:  "*The air smells of rust and old armor. The torches are lit — but there's no one here to light them.*",
    5:  "*Halfway through the first arc. The darkness ahead is different. Thicker. Like it has weight.*",
    6:  "*You step over the remains of someone who made it this far. Their weapon is broken. Their hand is still gripping it.*",
    7:  "*The walls begin to pulse faintly. Not light. Not sound. Something else. Like the gate itself is breathing.*",
    8:  "*A whisper moves through the corridor. You can't make out the words. You're not sure you want to.*",
    9:  "*The gate's final corridor. You can feel something on the other side of the door ahead. It's been waiting. It knows you're here.*",
    10: "*The door at the end has one eye carved into it. As you approach — the carving blinks.*",
  },
  mobs: {
    1: {
      id: "rotting_hound", name: "Rotting Hound", emoji: "🐕",
      maxHp: 160, maxMp: 0, attack: 20, defense: 2, speed: 28, isBoss: false,
      lore: "*A beast that should be dead. Its ribcage shows. It doesn't notice. It only knows forward.*",
      moves: [
        { name: "Savage Bite",  emoji: "🦷", damage: 20, mpCost: 0, weight: 5, taunt: "*It snarls and lunges low.*" },
        { name: "Rabid Lunge",  emoji: "💨", damage: 28, mpCost: 0, weight: 3, effect: { kind: "bleed", value: 8, duration: 3 }, taunt: "*A burst of rotten speed.*" },
        { name: "Death Howl",   emoji: "🌑", damage: 5,  mpCost: 0, weight: 2, effect: { kind: "slow", value: 10, duration: 2 }, taunt: "*A howl that shouldn't come from a corpse.*" },
      ],
    },
    2: {
      id: "gate_rat", name: "Gate Rat", emoji: "🐀",
      maxHp: 140, maxMp: 0, attack: 16, defense: 1, speed: 42, isBoss: false,
      lore: "*The size of a small dog. It has been eating the dead here for years. You can tell.*",
      moves: [
        { name: "Gnaw",           emoji: "🦷", damage: 16, mpCost: 0, weight: 5 },
        { name: "Swarm Pounce",   emoji: "💥", damage: 24, mpCost: 0, weight: 3, effect: { kind: "bleed", value: 6, duration: 2 } },
        { name: "Scatter-Dodge",  emoji: "💨", damage: 0,  mpCost: 0, weight: 2, effect: { kind: "slow", value: 8, duration: 1 } },
      ],
    },
    3: {
      id: "stone_crawler", name: "Stone Crawler", emoji: "🦂",
      maxHp: 210, maxMp: 30, attack: 20, defense: 9, speed: 15, isBoss: false,
      lore: "*A scorpion fused with the rubble of the gate. Slow. Patient. It has nowhere to be.*",
      moves: [
        { name: "Claw Crush",   emoji: "🦀", damage: 20, mpCost: 0,  weight: 4 },
        { name: "Venom Sting",  emoji: "☠️", damage: 14, mpCost: 15, weight: 3, effect: { kind: "burn", value: 10, duration: 4 } },
        { name: "Shell Harden", emoji: "🪨", damage: 0,  mpCost: 15, weight: 2, effect: { kind: "regen", value: 20, duration: 2 } },
      ],
    },
    4: {
      id: "hollow_guard", name: "Hollow Guard", emoji: "🪖",
      maxHp: 260, maxMp: 40, attack: 26, defense: 13, speed: 18, isBoss: false,
      lore: "*Armor that kept fighting after the knight inside rotted away. The knight has been gone for three hundred years.*",
      moves: [
        { name: "Rusted Slash",  emoji: "⚔️", damage: 26, mpCost: 0,  weight: 4 },
        { name: "Shield Bash",   emoji: "🛡️", damage: 20, mpCost: 15, weight: 3, effect: { kind: "stun", value: 0, duration: 1 } },
        { name: "Iron Stance",   emoji: "🔩", damage: 0,  mpCost: 20, weight: 2, effect: { kind: "regen", value: 18, duration: 2 } },
      ],
    },
    5: {
      id: "wraith_wisp", name: "Wraith Wisp", emoji: "👻",
      maxHp: 190, maxMp: 60, attack: 22, defense: 3, speed: 38, isBoss: false,
      lore: "*The spirit of someone who died confused. It's still confused. That doesn't make it less dangerous.*",
      moves: [
        { name: "Soul Drain",    emoji: "💀", damage: 22, mpCost: 15, weight: 4, effect: { kind: "mp_drain", value: 20, duration: 1 } },
        { name: "Chill Pass",    emoji: "❄️", damage: 16, mpCost: 10, weight: 3, effect: { kind: "slow", value: 14, duration: 2 } },
        { name: "Wail",          emoji: "😱", damage: 10, mpCost: 20, weight: 2, effect: { kind: "stun", value: 0, duration: 1 } },
      ],
    },
    6: {
      id: "bone_archer", name: "Bone Archer", emoji: "🏹",
      maxHp: 220, maxMp: 50, attack: 28, defense: 5, speed: 30, isBoss: false,
      lore: "*A skeleton that found a bow. It has had a long time to practice.*",
      moves: [
        { name: "Rib Arrow",     emoji: "🏹", damage: 28, mpCost: 0,  weight: 4 },
        { name: "Volley",        emoji: "💥", damage: 22, mpCost: 20, weight: 3, effect: { kind: "bleed", value: 10, duration: 3 } },
        { name: "Bone Step",     emoji: "💨", damage: 0,  mpCost: 15, weight: 2, effect: { kind: "slow", value: 12, duration: 2 } },
      ],
    },
    7: {
      id: "grave_ogre", name: "Grave Ogre", emoji: "👹",
      maxHp: 320, maxMp: 20, attack: 32, defense: 16, speed: 10, isBoss: false,
      lore: "*Buried under this gate for centuries as a punishment. It is very angry about that.*",
      moves: [
        { name: "Tombstone Fist", emoji: "💪", damage: 32, mpCost: 0,  weight: 4 },
        { name: "Grave Slam",     emoji: "🪨", damage: 28, mpCost: 0,  weight: 3, effect: { kind: "stun", value: 0, duration: 1 } },
        { name: "Dirt Roar",      emoji: "💢", damage: 5,  mpCost: 20, weight: 2, effect: { kind: "slow", value: 18, duration: 2 } },
      ],
    },
    8: {
      id: "runic_sentinel", name: "Runic Sentinel", emoji: "🔮",
      maxHp: 280, maxMp: 80, attack: 30, defense: 14, speed: 22, isBoss: false,
      lore: "*A magical construct designed to guard the inner gate. It was never told what it was guarding. It guards anyway.*",
      moves: [
        { name: "Rune Blast",    emoji: "🔮", damage: 30, mpCost: 20, weight: 3 },
        { name: "Magic Bind",    emoji: "⛓️", damage: 15, mpCost: 30, weight: 3, effect: { kind: "silence", value: 0, duration: 2 } },
        { name: "Power Surge",   emoji: "⚡", damage: 38, mpCost: 35, weight: 2 },
        { name: "Rune Shield",   emoji: "🛡️", damage: 0,  mpCost: 25, weight: 2, effect: { kind: "regen", value: 22, duration: 2 } },
      ],
    },
    9: {
      id: "gate_specter", name: "Gate Specter", emoji: "🌫️",
      maxHp: 300, maxMp: 100, attack: 35, defense: 8, speed: 35, isBoss: false,
      lore: "*The ghost of a warrior who died trying to reach the boss. It failed. Now it stands guard in death.*",
      moves: [
        { name: "Specter Slash", emoji: "⚔️", damage: 35, mpCost: 0,  weight: 3 },
        { name: "Haunt",         emoji: "👻", damage: 20, mpCost: 25, weight: 3, effect: { kind: "burn", value: 14, duration: 3 } },
        { name: "Drain Will",    emoji: "🌀", damage: 18, mpCost: 30, weight: 2, effect: { kind: "mp_drain", value: 35, duration: 1 } },
        { name: "Phaseshift",    emoji: "💨", damage: 0,  mpCost: 20, weight: 2, effect: { kind: "regen", value: 28, duration: 2 } },
      ],
    },
  },
  boss: {
    id: "gatekeeper_malveth", name: "Gatekeeper Malveth", emoji: "👁️",
    maxHp: 2200, maxMp: 300, attack: 72, defense: 20, speed: 32, isBoss: true,
    lore: "*The original guardian of this gate. One enormous eye, suspended in stone and shadow, watching every approach.*",
    entranceMonologue: [
      `👁️ *The door at the end of floor 9 opens on its own.*`,
      `👁️ *The chamber beyond is vast. Quiet. Then — from the ceiling — a single eye opens.*`,
      `👁️ **Malveth:** *"...You made it this far."*`,
      `👁️ **Malveth:** *"Nine floors. Most stop at five."*`,
      `👁️ **Malveth:** *"I've been guardian of this gate for nine hundred years. Not one warrior has passed me."*`,
      `👁️ **Malveth:** *"I don't expect you to be the first. But I'd like to be surprised."*`,
      `👁️ **Malveth:** *"Come then. Let's see what you are."*`,
    ],
    deathMonologue: `👁️ *The eye dims slowly.*\n👁️ **Malveth:** *"Nine... hundred... years..."*\n👁️ **Malveth:** *"...Go. You've earned the next floor."*`,
    playerKillTaunt: `👁️ **Malveth:** *"Nine hundred years of watching. I know every mistake a warrior can make. You made yours."*\n👁️ **Malveth:** *"Rest. Come back stronger. I'll be here."*`,
    reactToHeavyHit: [
      `👁️ **Malveth:** *"...That actually hurt. Adjust."*`,
      `👁️ **Malveth:** *"You found something. Don't let go of it."*`,
      `👁️ **Malveth:** *"Strong. But strength alone didn't get any of the others past me."*`,
    ],
    reactToLightHit: [
      `👁️ **Malveth:** *"You're holding back. Stop it."*`,
      `👁️ **Malveth:** *"That was tentative. I've been alive nine centuries — I recognize hesitation."*`,
      `👁️ **Malveth:** *"Try harder. I'm not going to respect you for a soft hit."*`,
    ],
    reactToHeal: [
      `👁️ **Malveth:** *"Nine centuries of this. I will not be worn down."*`,
      `👁️ **Malveth:** *"You can't outlast the gate itself."*`,
    ],
    reactToPlayerLow: [
      `👁️ **Malveth:** *"You're fading. Don't give up now. That would disappoint me."*`,
      `👁️ **Malveth:** *"Low HP. Don't panic here."*`,
    ],
    reactToBossLow: [
      `👁️ **Malveth:** *"...Nine hundred years... and this is the one."*`,
      `👁️ **Malveth:** *"Don't stop now. Finish what you started."*`,
    ],
    midBattleThoughts: [
      `👁️ **Malveth:** *"You lead with your right. I've noticed."*`,
      `👁️ **Malveth:** *"You're better than the last fifty who tried this floor. Keep earning it."*`,
      `👁️ **Malveth:** *"Pain is information. Stop wincing and start using it."*`,
    ],
    enrageLines: [
      `👁️ *The eye cracks at the edges. Golden light bleeds from the fissures.*`,
      `👁️ **Malveth:** *"I will not fall QUIETLY."*`,
      `👁️ **Malveth — ENRAGED:** *"NINE HUNDRED YEARS OF WATCHING. THIS IS WHAT I'VE LEARNED."*`,
    ],
    enrageAt: 28,
    moves: [
      { name: "Eye of Judgment",     emoji: "👁️", damage: 68,  mpCost: 0,  weight: 3, taunt: `👁️ **Malveth:** *"Eye of Judgment."*` },
      { name: "Gate Slam",           emoji: "🚪", damage: 80,  mpCost: 30, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: `👁️ **Malveth:** *"Gate Slam."*` },
      { name: "Void Gaze",           emoji: "🌑", damage: 55,  mpCost: 40, weight: 2, effect: { kind: "silence", value: 0, duration: 2 }, taunt: `👁️ **Malveth:** *"Void Gaze."*` },
      { name: "Ancient Ward",        emoji: "🛡️", damage: 0,   mpCost: 35, weight: 2, effect: { kind: "regen", value: 55, duration: 3 }, taunt: `👁️ **Malveth:** *"Ancient Ward."*` },
      { name: "Thousand-Year Slash", emoji: "⚡", damage: 110, mpCost: 60, weight: 1, taunt: `👁️ **Malveth:** *"Thousand-Year Slash."*` },
    ],
    enrageMoves: [
      { name: "FINAL JUDGMENT",  emoji: "👁️‍🗨️", damage: 160, mpCost: 0,  weight: 3, taunt: `👁️ **Malveth — ENRAGED:** *"FINAL JUDGMENT."*` },
      { name: "Gate Collapse",   emoji: "💥",     damage: 130, mpCost: 50, weight: 3, effect: { kind: "bleed", value: 30, duration: 4 }, taunt: `👁️ **Malveth — ENRAGED:** *"Gate Collapse."*` },
      { name: "Undying Watch",   emoji: "🔁",     damage: 25,  mpCost: 45, weight: 2, effect: { kind: "regen", value: 75, duration: 3 }, taunt: `👁️ **Malveth — ENRAGED:** *"Undying Watch."*` },
    ],
  },
};

export default arc1;
