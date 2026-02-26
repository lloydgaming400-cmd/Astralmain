// ═══════════════════════════════════════════════════════
//  ARC 10: THE SOVEREIGN'S THRONE — Floors 91–100
//  Theme: The architect of the tower, the final truth
//  "He built all of this. He has been waiting at the top. Alone."
// ═══════════════════════════════════════════════════════
import type { ArcData } from './types';

const arc10: ArcData = {
  arc: 10,
  name: "The Sovereign's Throne",
  theme: "sovereign",
  entryNarration: "*The tower changes one final time. Clean stone. No decay, no fire, no void, no shadows. Just the tower as it was meant to be — perfect and cold and immovable. Whoever built this did so with intention. Every floor below was a test. This arc is the answer.*",

  floorNarrations: {
    91: "*The ascent corridor. Straight up. No enemies yet — just the walk. The tower wants you to think about what you've done to get here.*",
    92: "*The first guardians appear. Constructs — not creatures. Built. They move with the precision of things designed to end challenges.*",
    93: "*The walls here are lined with the names of warriors who reached this arc. Thousands of names. None of them made it further than floor 95.*",
    94: "*A room where everything you've fought is memorialized. Malveth. Azenkhem. The Nothing. All of them, carved into the walls. Like a trophy room — but the trophies are the challengers.*",
    95: "*Halfway through the final arc. The Sovereign's presence is palpable here — not a person yet, just the weight of intent. The tower was built FOR something. You're about to find out what.*",
    96: "*The constructs here are different — not guards. Servants. They're preparing something. They don't acknowledge you until you get too close.*",
    97: "*A great observatory. You can see the entire tower from here — all 97 floors below. Every arc. Every boss. Every challenge. From up here it looks intentional. Designed.*",
    98: "*The final preparation room. Weapons on the walls — better than anything you've seen. They are not for you. They are the Sovereign's.*",
    99: "*The antechamber. One door. On the other side — you can feel something that has been absolutely still for a very long time.*",
    100: "*The Sovereign's Throne room. At the center — a throne. On it — someone who built everything you've walked through. He looks up when you enter. He has been waiting.*",
  },

  mobs: {
    91: {
      id: "ascent_sentinel", name: "Ascent Sentinel", emoji: "🗿",
      maxHp: 2100, maxMp: 240, attack: 238, defense: 62, speed: 48, isBoss: false,
      lore: "*Built to guard the ascent corridor. It has one job. It has always done it perfectly.*",
      moves: [
        { name: "Sentinel Strike",  emoji: "🗿", damage: 238, mpCost: 0,  weight: 4, taunt: "*Precise. Efficient. No wasted motion.*" },
        { name: "Guard Stance",     emoji: "🛡️", damage: 0,   mpCost: 55, weight: 3, effect: { kind: "regen", value: 165, duration: 3 } },
        { name: "Corridor Seal",    emoji: "🔒", damage: 195, mpCost: 60, weight: 2, effect: { kind: "slow", value: 55, duration: 4 }, taunt: "*Seals the space around you.*" },
      ],
    },
    92: {
      id: "sovereign_construct", name: "Sovereign Construct", emoji: "🤖",
      maxHp: 2160, maxMp: 260, attack: 244, defense: 64, speed: 52, isBoss: false,
      lore: "*Built by the Sovereign himself. It fights with the precision of the man who designed it.*",
      moves: [
        { name: "Designed Strike",  emoji: "🤖", damage: 244, mpCost: 0,  weight: 3, taunt: "*Exactly as much force as required. Not one unit more.*" },
        { name: "Construct Beam",   emoji: "⚡", damage: 208, mpCost: 55, weight: 3, effect: { kind: "burn", value: 62, duration: 4 }, taunt: "*Energy weapon. Immaculately calibrated.*" },
        { name: "Self Repair",      emoji: "🔧", damage: 0,   mpCost: 65, weight: 2, effect: { kind: "regen", value: 172, duration: 3 } },
      ],
    },
    93: {
      id: "name_warden", name: "Name Warden", emoji: "📜",
      maxHp: 2220, maxMp: 280, attack: 250, defense: 66, speed: 50, isBoss: false,
      lore: "*Guards the wall of names. It has recorded every warrior who reached this floor. It will record yours — one way or another.*",
      moves: [
        { name: "Record Strike",    emoji: "📜", damage: 250, mpCost: 0,  weight: 3, taunt: "*Adds another entry to the wall.*" },
        { name: "Name Seal",        emoji: "⚖️", damage: 215, mpCost: 60, weight: 3, effect: { kind: "silence", value: 0, duration: 2 }, taunt: "*Seals your name in judgment.*" },
        { name: "Chronicle",        emoji: "📖", damage: 0,   mpCost: 70, weight: 2, effect: { kind: "regen", value: 178, duration: 3 } },
      ],
    },
    94: {
      id: "memorial_guardian", name: "Memorial Guardian", emoji: "🏛️",
      maxHp: 2280, maxMp: 300, attack: 256, defense: 68, speed: 48, isBoss: false,
      lore: "*Guards the memorial of every boss you've fought. It carries a piece of each of them. You have fought all of this before.*",
      moves: [
        { name: "Memorial Strike",  emoji: "🏛️", damage: 256, mpCost: 0,  weight: 3, taunt: "*Every boss you've defeated, echoed in this blow.*" },
        { name: "Echo Blast",       emoji: "💥", damage: 222, mpCost: 65, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*The echo of every boss fight at once.*" },
        { name: "Honor Guard",      emoji: "🛡️", damage: 0,   mpCost: 75, weight: 2, effect: { kind: "regen", value: 185, duration: 3 } },
        { name: "Final Memorial",   emoji: "⚔️", damage: 310, mpCost: 95, weight: 1, taunt: "*A tribute to every battle that brought you here.*" },
      ],
    },
    95: {
      id: "sovereign_intent", name: "Sovereign's Intent", emoji: "🎯",
      maxHp: 2360, maxMp: 320, attack: 264, defense: 72, speed: 55, isBoss: false,
      lore: "*The will of the Sovereign, given form. Not the man — just the intention. The tower's purpose, distilled.*",
      moves: [
        { name: "Purpose Strike",   emoji: "🎯", damage: 264, mpCost: 0,  weight: 3, taunt: "*Strikes with total conviction.*" },
        { name: "Sovereign Will",   emoji: "💢", damage: 230, mpCost: 70, weight: 3, effect: { kind: "slow", value: 58, duration: 4 }, taunt: "*Presses the full weight of the tower's purpose.*" },
        { name: "Intentional Heal", emoji: "💚", damage: 0,   mpCost: 80, weight: 2, effect: { kind: "regen", value: 192, duration: 3 } },
      ],
    },
    96: {
      id: "preparing_servant", name: "Throne Servant", emoji: "🧎",
      maxHp: 2420, maxMp: 300, attack: 270, defense: 70, speed: 52, isBoss: false,
      lore: "*Was preparing the throne room for — something. You interrupted. It does not enjoy being interrupted while serving.*",
      moves: [
        { name: "Servant Strike",   emoji: "🧎", damage: 270, mpCost: 0,  weight: 3, taunt: "*Efficient and practiced. It has been serving for centuries.*" },
        { name: "Disruption",       emoji: "💢", damage: 235, mpCost: 65, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*You interrupted its work. It is making a point.*" },
        { name: "Restore Order",    emoji: "🔧", damage: 0,   mpCost: 75, weight: 2, effect: { kind: "regen", value: 198, duration: 3 } },
      ],
    },
    97: {
      id: "observatory_watcher", name: "Observatory Watcher", emoji: "🔭",
      maxHp: 2500, maxMp: 340, attack: 278, defense: 74, speed: 54, isBoss: false,
      lore: "*Has watched every warrior from the observatory. Knows every arc they struggled with. Knows exactly where to hit you.*",
      moves: [
        { name: "Observed Weakness",emoji: "🔭", damage: 278, mpCost: 0,  weight: 3, taunt: "*Attacks exactly where watching revealed you're weakest.*" },
        { name: "Full Span",        emoji: "🌍", damage: 245, mpCost: 70, weight: 3, effect: { kind: "bleed", value: 68, duration: 5 }, taunt: "*The full span of your journey, used against you.*" },
        { name: "Distant Watch",    emoji: "💚", damage: 0,   mpCost: 80, weight: 2, effect: { kind: "regen", value: 205, duration: 3 } },
      ],
    },
    98: {
      id: "weapon_keeper", name: "Weapon Keeper", emoji: "⚔️",
      maxHp: 2600, maxMp: 360, attack: 288, defense: 76, speed: 56, isBoss: false,
      lore: "*Keeps the Sovereign's weapons. It knows exactly what every weapon does. It uses that knowledge against you.*",
      moves: [
        { name: "Keeper Strike",    emoji: "⚔️", damage: 288, mpCost: 0,  weight: 3, taunt: "*A weapon worthy of the Sovereign, used against you.*" },
        { name: "Arsenal Blast",    emoji: "💥", damage: 255, mpCost: 75, weight: 3, effect: { kind: "burn", value: 70, duration: 5 }, taunt: "*Every weapon in the room, in sequence.*" },
        { name: "Preserve",         emoji: "🛡️", damage: 0,   mpCost: 85, weight: 2, effect: { kind: "regen", value: 212, duration: 3 } },
        { name: "Sovereign's Blade",emoji: "🗡️", damage: 355, mpCost: 110, weight: 1, taunt: "*Uses the Sovereign's own weapon. Just briefly. Just enough.*" },
      ],
    },
    99: {
      id: "antechamber_silence", name: "The Antechamber Silence", emoji: "🤫",
      maxHp: 2720, maxMp: 380, attack: 298, defense: 80, speed: 58, isBoss: false,
      lore: "*The silence of the antechamber, given form. It has been guarding this door for the entire life of the tower. It does not want you to open it.*",
      moves: [
        { name: "Silence Strike",   emoji: "🤫", damage: 298, mpCost: 0,  weight: 3, taunt: "*Hits with the weight of absolute silence.*" },
        { name: "Final Ward",       emoji: "🔒", damage: 262, mpCost: 80, weight: 3, effect: { kind: "silence", value: 0, duration: 3 }, taunt: "*Seals the last door. You are not meant to pass.*" },
        { name: "Eternal Guard",    emoji: "🛡️", damage: 0,   mpCost: 90, weight: 2, effect: { kind: "regen", value: 220, duration: 3 } },
        { name: "Do Not Enter",     emoji: "🚫", damage: 380, mpCost: 120, weight: 1, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*Every force in the tower saying: stop.*" },
      ],
    },
  },

  boss: {
    id: "the_sovereign_absolute", name: "The Sovereign Absolute", emoji: "👑",
    maxHp: 8000, maxMp: 1200, attack: 265, defense: 88, speed: 75, isBoss: true,
    lore: "*He built the tower. Every floor. Every boss. Every arc. Malveth was his first creation. The Cosmic Eye was his greatest. He designed the tests, populated the floors, built the mechanics — and then sat down on the throne at the top and waited. Not to stop warriors. To find one who was worthy. He has been waiting alone for a very long time. He is not cruel. He is not a villain. He is someone who built something magnificent and has been sitting at the top of it, completely alone, for centuries.*",

    entranceMonologue: [
      `👑 *The throne room is simple.*`,
      `👑 *After everything below — no gold, no fire, no void. Just a room.*`,
      `👑 *And a man on a throne.*`,
      `👑 *He looks up.*`,
      `👑 *He sets down a book.*`,
      `👑 **The Sovereign:** *"You made it."*`,
      `👑 *He stands. Not with ceremony. Just — gets up.*`,
      `👑 **The Sovereign:** *"I built this tower three hundred years ago."*`,
      `👑 **The Sovereign:** *"I built Malveth. I built the Maze. I built the void."*`,
      `👑 **The Sovereign:** *"I built every test you walked through."*`,
      `👑 *He looks at you — really looks.*`,
      `👑 **The Sovereign:** *"You are the first person to reach this room in one hundred and twelve years."*`,
      `👑 *A long pause.*`,
      `👑 **The Sovereign:** *"I have been alone up here for a long time."*`,
      `👑 **The Sovereign:** *"I built all of this... because I wanted to find someone."*`,
      `👑 *He picks up his weapon. Something he built himself.*`,
      `👑 **The Sovereign:** *"Let me see if you're the one."*`,
    ],

    deathMonologue: `👑 *The Sovereign sits back down. Slowly.*\n👑 *He sets his weapon across his knees.*\n👑 **The Sovereign:** *"Three hundred years."*\n👑 *He's quiet for a long moment.*\n👑 **The Sovereign:** *"I built a hundred floors. I designed nine arcs. I created seventeen bosses."*\n👑 **The Sovereign:** *"All of it... to find you."*\n👑 *He looks at you.*\n👑 **The Sovereign:** *"You were worth the wait."*\n👑 *A pause.*\n👑 **The Sovereign:** *"The tower is yours."*\n👑 **The Sovereign:** *"I built it for someone worthy. Now someone worthy has it."*\n👑 *He closes his eyes.*\n👑 **The Sovereign:** *"It's quiet up here. I hope you like quiet."*`,

    playerKillTaunt: `👑 **The Sovereign:** *"Not yet."*\n👑 *He says it gently.*\n👑 **The Sovereign:** *"The tower has more to teach you."*\n👑 **The Sovereign:** *"Come back when it has."*`,

    reactToHeavyHit: [
      `👑 **The Sovereign:** *"I designed every test in this tower."*\n👑 **The Sovereign:** *"I know what it takes to reach me."*\n👑 **The Sovereign:** *"That... was more than what it takes."*`,
      `👑 **The Sovereign:** *"Good. That's what I built all of this to find."*`,
      `👑 **The Sovereign:** *"Three hundred years and someone finally hit me like that."*\n👑 *He nods, once.*`,
    ],

    reactToLightHit: [
      `👑 **The Sovereign:** *"You climbed 99 floors. I know you have more than that."*`,
      `👑 **The Sovereign:** *"Don't hold back in front of me. You've earned the right to everything you have."*`,
      `👑 **The Sovereign:** *"I built this tower to find someone extraordinary. Show me extraordinary."*`,
    ],

    reactToHeal: [
      `👑 **The Sovereign:** *"I built this tower. I sustain from it."*`,
      `👑 **The Sovereign:** *"Three centuries of design. It does not break easily."*`,
    ],

    reactToPlayerLow: [
      `👑 **The Sovereign:** *"You came too far to stop now."*\n👑 **The Sovereign:** *"Find the thing that got you through 99 floors and use it."*`,
      `👑 **The Sovereign:** *"Low. But you've been low before. I watched."*`,
    ],

    reactToBossLow: [
      `👑 **The Sovereign:** *"..."*\n👑 *He smiles. For the first time.*\n👑 **The Sovereign:** *"There it is."*`,
      `👑 **The Sovereign:** *"I have been alone up here for a hundred and twelve years."*\n👑 **The Sovereign:** *"And this is what it was for."*`,
    ],

    midBattleThoughts: [
      `👑 **The Sovereign:** *"I watched you through Malveth. Through the tomb. Through the void."*\n👑 **The Sovereign:** *"I designed those tests. I know what it costs to pass them."*`,
      `👑 **The Sovereign:** *"Vael told you your shadow was proud. He was right."*`,
      `👑 **The Sovereign:** *"The Cosmic Eye called you determined. That's the rarest thing I look for."*`,
      `👑 **The Sovereign:** *"Aldrath has been alone for four centuries. You gave him a proper fight. Thank you for that."*`,
      `👑 **The Sovereign:** *"Every test below was a question. You answered all of them."*\n👑 **The Sovereign:** *"This is the last one."*`,
    ],

    enrageLines: [
      `👑 *The Sovereign stands fully upright for the first time.*`,
      `👑 **The Sovereign:** *"Three hundred years."*`,
      `👑 **The Sovereign:** *"I built all of this with these hands."*`,
      `👑 **The Sovereign — ENRAGED:** *"IF YOU WANT THIS TOWER — TAKE IT FROM ME COMPLETELY."*`,
    ],

    enrageAt: 20,

    moves: [
      { name: "Architect's Strike",  emoji: "👑", damage: 258, mpCost: 0,  weight: 3,
        taunt: `👑 **The Sovereign:** *"Architect's Strike."*\n👑 *"I designed this move for someone who earned it."*` },
      { name: "Tower's Weight",      emoji: "🏰", damage: 215, mpCost: 80, weight: 3, effect: { kind: "slow", value: 60, duration: 4 },
        taunt: `👑 **The Sovereign:** *"Tower's Weight."*\n👑 *"Three hundred years of construction, pressed down."*` },
      { name: "Sovereign Decree",    emoji: "📜", damage: 188, mpCost: 90, weight: 2, effect: { kind: "silence", value: 0, duration: 3 },
        taunt: `👑 **The Sovereign:** *"Sovereign Decree."*\n👑 *"The tower has one ruler. Still me."*` },
      { name: "Foundation Regen",    emoji: "💚", damage: 0,   mpCost: 85, weight: 2, effect: { kind: "regen", value: 200, duration: 3 },
        taunt: `👑 **The Sovereign:** *"Foundation Regen."*\n👑 *"The tower sustains its builder."*` },
      { name: "The Final Design",    emoji: "⚔️", damage: 320, mpCost: 120, weight: 1,
        taunt: `👑 **The Sovereign:** *"The Final Design."*\n👑 *"The move I built this tower to use. On someone worthy."*` },
    ],

    enrageMoves: [
      { name: "SOVEREIGN ABSOLUTE",  emoji: "👑", damage: 420, mpCost: 0,   weight: 3,
        taunt: `👑 **The Sovereign — ENRAGED:** *"SOVEREIGN ABSOLUTE."*\n👑 *"THREE HUNDRED YEARS OF WAITING. THIS IS EVERYTHING."*` },
      { name: "Tower Collapse",      emoji: "🏰", damage: 345, mpCost: 135, weight: 3, effect: { kind: "stun", value: 0, duration: 1 },
        taunt: `👑 **The Sovereign — ENRAGED:** *"Tower Collapse."*\n👑 *"I BUILT IT. I CAN BRING IT DOWN."*` },
      { name: "Builder's Will",      emoji: "💥", damage: 280, mpCost: 110, weight: 2, effect: { kind: "bleed", value: 80, duration: 5 },
        taunt: `👑 **The Sovereign — ENRAGED:** *"Builder's Will."*\n👑 *"THE WILL THAT BUILT 100 FLOORS — ALL OF IT — ON YOU."*` },
    ],
  },
};

export default arc10;
