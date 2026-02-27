// ═══════════════════════════════════════════════════════
//  ARC 8: REALM OF SHATTERED KINGS — Floors 71–80
//  Theme: Fallen royalty, broken crowns, wars that never ended
//  "Every king who ever fell came here. They're still fighting."
// ═══════════════════════════════════════════════════════
import type { ArcData } from './types';

const arc8: ArcData = {
  arc: 8,
  name: "Realm of Shattered Kings",
  theme: "royalty",
  entryNarration: "*Broken thrones. Shattered crowns half-buried in stone. Banners from kingdoms that no longer exist hanging from walls that shouldn't still be standing. The dead kings of a hundred fallen dynasties refused to move on. They are still here. They are still fighting each other. You have walked into the middle of an eternal war.*",

  floorNarrations: {
    71: "*The battlefield entry. Two armies of the dead locked in combat that has been ongoing for centuries. They part to let you through. Then close behind you.*",
    72: "*A throne room with three thrones. Three kings on them, all dead, all glaring at the others. They turn to look at you simultaneously.*",
    73: "*The armory of a dead kingdom. The weapons here are still sharp. The spirits of the soldiers who wielded them are still attached.*",
    74: "*A great hall. A feast table still set. The food long gone to dust. The guests still seated, waiting for a meal that will never come.*",
    75: "*Halfway through the Realm. The kings' war is louder here. Battles echo from every corridor. You can't tell if they're happening now or in memory.*",
    76: "*A crown room — hundreds of crowns on pedestals. Every one of them cracked. Every one of them humming faintly.*",
    77: "*The war council chamber. Maps on the table of kingdoms that fell centuries ago. The generals around the table are still arguing strategy.*",
    78: "*The execution yard. Whatever was executed here — the executions didn't take.*",
    79: "*The final approach: a corridor lined with the portraits of every king who ever ruled here. Their painted eyes follow you. The paintings move.*",
    80: "*The last throne room. One throne. One king. He has been sitting here since all the others fell. He watched them all go.*",
  },

  mobs: {
    1: {
      id: "war_revenant", name: "War Revenant", emoji: "⚔️",
      maxHp: 1340, maxMp: 160, attack: 152, defense: 38, speed: 42, isBoss: false,
      lore: "*A soldier who died mid-charge and never stopped charging. It has been mid-charge for two hundred years.*",
      moves: [
        { name: "Eternal Charge",  emoji: "💨", damage: 152, mpCost: 0,  weight: 4, taunt: "*Two hundred years of forward momentum.*" },
        { name: "War Cry",         emoji: "📣", damage: 118, mpCost: 35, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*A battle cry from before you were born.*" },
        { name: "Battle Regen",    emoji: "💚", damage: 0,   mpCost: 40, weight: 2, effect: { kind: "regen", value: 95, duration: 3 } },
      ],
    },
    2: {
      id: "three_kings_shade", name: "Triclaimant Shade", emoji: "👑",
      maxHp: 1380, maxMp: 180, attack: 156, defense: 36, speed: 40, isBoss: false,
      lore: "*Three kings who all claimed the same throne. They're still fighting over it. It fused them together. None of them have noticed.*",
      moves: [
        { name: "Triple Strike",   emoji: "👑", damage: 156, mpCost: 0,  weight: 3, taunt: "*Three different fighting styles at once. Chaotic.*" },
        { name: "Royal Dispute",   emoji: "💢", damage: 125, mpCost: 45, weight: 3, effect: { kind: "slow", value: 40, duration: 3 }, taunt: "*The internal argument becomes external.*" },
        { name: "Claim the Throne",emoji: "🪑", damage: 0,   mpCost: 50, weight: 2, effect: { kind: "regen", value: 100, duration: 3 } },
      ],
    },
    3: {
      id: "armory_spirit", name: "Armory Spirit", emoji: "🗡️",
      maxHp: 1360, maxMp: 140, attack: 158, defense: 32, speed: 46, isBoss: false,
      lore: "*The collective spirit of an armory. Every weapon in it, fighting as one. You cannot disarm what IS an armory.*",
      moves: [
        { name: "Arsenal Barrage", emoji: "🗡️", damage: 158, mpCost: 0,  weight: 3, effect: { kind: "bleed", value: 42, duration: 4 }, taunt: "*Every weapon in the armory, simultaneously.*" },
        { name: "Blade Wall",      emoji: "🛡️", damage: 120, mpCost: 40, weight: 3, taunt: "*A wall of spinning blades.*" },
        { name: "Rearm",           emoji: "🔧", damage: 0,   mpCost: 45, weight: 2, effect: { kind: "regen", value: 102, duration: 3 } },
      ],
    },
    4: {
      id: "feast_ghost", name: "Feast Ghost", emoji: "🍽️",
      maxHp: 1320, maxMp: 200, attack: 148, defense: 34, speed: 48, isBoss: false,
      lore: "*One of the eternal feast guests. It has been hungry for centuries. It has decided to eat you instead.*",
      moves: [
        { name: "Starving Rage",   emoji: "😤", damage: 148, mpCost: 0,  weight: 4, taunt: "*Centuries of hunger in every swing.*" },
        { name: "Table Slam",      emoji: "🪨", damage: 125, mpCost: 30, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*Picks up the feast table. Uses it.*" },
        { name: "Feast Drain",     emoji: "🌀", damage: 105, mpCost: 45, weight: 2, effect: { kind: "mp_drain", value: 75, duration: 1 }, taunt: "*Takes energy the way a feast takes hunger.*" },
      ],
    },
    5: {
      id: "echo_war", name: "Echo of War", emoji: "🔊",
      maxHp: 1400, maxMp: 160, attack: 162, defense: 36, speed: 44, isBoss: false,
      lore: "*The sound of the eternal war, given form. Every battle cry, every death scream, every sword clash from the last three centuries — compressed into one.*",
      moves: [
        { name: "War Echo",        emoji: "🔊", damage: 162, mpCost: 0,  weight: 3, taunt: "*The sound physically damages.*" },
        { name: "Cacophony",       emoji: "💥", damage: 132, mpCost: 50, weight: 3, effect: { kind: "stun", value: 0, duration: 1 }, taunt: "*Three centuries of screaming, all at once.*" },
        { name: "Battle Hymn",     emoji: "🎵", damage: 0,   mpCost: 55, weight: 2, effect: { kind: "regen", value: 108, duration: 3 } },
      ],
    },
    6: {
      id: "cracked_crown", name: "Cracked Crown Wraith", emoji: "💎",
      maxHp: 1440, maxMp: 180, attack: 166, defense: 38, speed: 42, isBoss: false,
      lore: "*A crown with no king — just the power that lingered in the metal after the king died. The power has opinions about who's worthy.*",
      moves: [
        { name: "Crown's Judgment",emoji: "💎", damage: 166, mpCost: 0,  weight: 3, taunt: "*The judgment of every king who ever wore it.*" },
        { name: "Royal Authority",  emoji: "📜", damage: 138, mpCost: 55, weight: 3, effect: { kind: "silence", value: 0, duration: 2 }, taunt: "*Commands, in the voice of a hundred dead kings.*" },
        { name: "Regal Restore",    emoji: "💚", damage: 0,   mpCost: 60, weight: 2, effect: { kind: "regen", value: 115, duration: 3 } },
      ],
    },
    7: {
      id: "dead_general", name: "Dead General", emoji: "🎖️",
      maxHp: 1480, maxMp: 200, attack: 170, defense: 40, speed: 38, isBoss: false,
      lore: "*Still arguing strategy in the war council. You interrupted an important point it was making. It will finish its point. Then kill you.*",
      moves: [
        { name: "Strategic Strike", emoji: "🎖️", damage: 170, mpCost: 0,  weight: 3, taunt: "*Perfectly calculated. Zero waste.*" },
        { name: "Flank",            emoji: "💨", damage: 142, mpCost: 45, weight: 3, effect: { kind: "bleed", value: 48, duration: 4 }, taunt: "*Attacks from exactly where you aren't covering.*" },
        { name: "Command Regen",    emoji: "💚", damage: 0,   mpCost: 55, weight: 2, effect: { kind: "regen", value: 118, duration: 3 } },
        { name: "Execute Order",    emoji: "💥", damage: 210, mpCost: 75, weight: 1, taunt: "*Final order. No appeal.*" },
      ],
    },
    8: {
      id: "execution_risen", name: "Execution Risen", emoji: "💀",
      maxHp: 1520, maxMp: 180, attack: 174, defense: 38, speed: 50, isBoss: false,
      lore: "*Was executed. Didn't stay executed. Has strong feelings about this.*",
      moves: [
        { name: "Risen Wrath",     emoji: "💀", damage: 174, mpCost: 0,  weight: 4, taunt: "*The fury of someone who was executed wrongfully.*" },
        { name: "Undying Lunge",   emoji: "💨", damage: 148, mpCost: 40, weight: 3, effect: { kind: "bleed", value: 50, duration: 4 }, taunt: "*Won't stay down. Won't slow down.*" },
        { name: "Refusal",         emoji: "🔁", damage: 0,   mpCost: 50, weight: 2, effect: { kind: "regen", value: 122, duration: 3 }, taunt: "*Refuses to stop. Again.*" },
      ],
    },
    9: {
      id: "portrait_king", name: "Portrait King", emoji: "🖼️",
      maxHp: 1580, maxMp: 200, attack: 180, defense: 42, speed: 44, isBoss: false,
      lore: "*Stepped out of its portrait. Has been watching every warrior approach the final throne room for centuries and has decided it doesn't approve of you.*",
      moves: [
        { name: "Portrait Strike",  emoji: "🖼️", damage: 180, mpCost: 0,  weight: 3, taunt: "*Attacks with painted conviction.*" },
        { name: "Disapproval",      emoji: "😤", damage: 155, mpCost: 50, weight: 3, effect: { kind: "slow", value: 45, duration: 4 }, taunt: "*Radiates centuries of judgment.*" },
        { name: "Canvas Defense",   emoji: "🛡️", damage: 0,   mpCost: 60, weight: 2, effect: { kind: "regen", value: 128, duration: 3 } },
        { name: "The Final Look",   emoji: "👁️", damage: 225, mpCost: 80, weight: 1, taunt: "*The look it gives warriors who reach the throne uninvited.*" },
      ],
    },
  },

  boss: {
    id: "king_aldrath_the_last", name: "King Aldrath, the Last", emoji: "♚",
    maxHp: 6000, maxMp: 900, attack: 198, defense: 68, speed: 58, isBoss: true,
    lore: "*He was the last king standing when all the others fell. He watched every dynasty crumble, every throne shatter, every crown crack. He is still here. Not because he is the strongest — because he refused to stop. He has watched warriors come to this floor for centuries. He has never let one pass. Not because he wants the power. Because he has nothing else left.*",

    entranceMonologue: [
      `♚ *One throne. One king.*`,
      `♚ *He doesn't rise when you enter.*`,
      `♚ *He looks at you the way a man looks at the thousandth sunrise — without wonder, without contempt. Just recognition.*`,
      `♚ **Aldrath:** *"Another one."*`,
      `♚ *He sets down a goblet. Empty. Has been for a long time.*`,
      `♚ **Aldrath:** *"You know how many warriors have come to this floor?"*`,
      `♚ *He looks at the ceiling.*`,
      `♚ **Aldrath:** *"I stopped counting at three thousand."*`,
      `♚ **Aldrath:** *"That was four centuries ago."*`,
      `♚ *He finally rises. Slowly. His armor is battered beyond description — every dent a story.*`,
      `♚ **Aldrath:** *"I have lost everything. My kingdom. My people. My purpose."*`,
      `♚ **Aldrath:** *"All I have left is this throne room and this fight."*`,
      `♚ *He draws his sword.*`,
      `♚ **Aldrath:** *"Don't make me feel bad about taking it from you too."*`,
    ],

    deathMonologue: `♚ *Aldrath goes to one knee.*\n♚ *The sword falls.*\n♚ **Aldrath:** *"...Finally."*\n♚ *A long silence. He looks at his hands.*\n♚ **Aldrath:** *"I've been waiting a long time for someone to do that."*\n♚ **Aldrath:** *"I didn't know I was waiting."*\n♚ *He looks up at you.*\n♚ **Aldrath:** *"Take the next floors. You earned the right."*\n♚ *A pause.*\n♚ **Aldrath:** *"I hope it was worth it. The climbing."*`,

    playerKillTaunt: `♚ **Aldrath:** *"Three thousand and one."*\n♚ *He sheathes his sword.*\n♚ **Aldrath:** *"Rest. Come back. Try again."*\n♚ **Aldrath:** *"I'll be here."*`,

    reactToHeavyHit: [
      `♚ **Aldrath:** *"Good."*\n♚ *He doesn't move back.*\n♚ **Aldrath:** *"That's what I needed to see."*`,
      `♚ **Aldrath:** *"Three thousand warriors. That hit harder than most."*`,
      `♚ **Aldrath:** *"You have something in you. I can feel it."*\n♚ **Aldrath:** *"Good. Make it count."*`,
    ],

    reactToLightHit: [
      `♚ **Aldrath:** *"You're better than that. I can tell."*`,
      `♚ **Aldrath:** *"Don't hold back on my account. I've taken worse."*`,
      `♚ **Aldrath:** *"Fight properly. You insult both of us otherwise."*`,
    ],

    reactToHeal: [
      `♚ **Aldrath:** *"Four centuries of battle. I know how to endure."*`,
      `♚ **Aldrath:** *"The throne room sustains me. It always has."*`,
    ],

    reactToPlayerLow: [
      `♚ **Aldrath:** *"You're fading."*\n♚ **Aldrath:** *"Don't. Not yet."*`,
      `♚ **Aldrath:** *"Find something to hold onto. Then hold on."*`,
    ],

    reactToBossLow: [
      `♚ **Aldrath:** *"..."*\n♚ *He looks down at himself.*\n♚ **Aldrath:** *"Four centuries."*\n♚ **Aldrath:** *"And today is the day."*`,
      `♚ **Aldrath:** *"You're doing it."*\n♚ *He sounds — relieved.*\n♚ **Aldrath:** *"Finish it. Don't stop now."*`,
    ],

    midBattleThoughts: [
      `♚ **Aldrath:** *"Every warrior who came here taught me something. You're teaching me something too."*`,
      `♚ **Aldrath:** *"I don't enjoy this. I want you to know that."*\n♚ **Aldrath:** *"But I can't stop until one of us falls."*`,
      `♚ **Aldrath:** *"Four hundred years alone in this throne room. This fight is all I have left."*`,
      `♚ **Aldrath:** *"Hit harder. I've waited too long for a worthy fight to waste it."*`,
      `♚ **Aldrath:** *"You remind me of my best general."*\n♚ **Aldrath:** *"He died four centuries ago."*`,
    ],

    enrageLines: [
      `♚ *Aldrath's exhaustion falls away.*`,
      `♚ **Aldrath:** *"Four hundred years."*`,
      `♚ **Aldrath:** *"If this is the end — then I fight it as a KING."*`,
      `♚ **Aldrath — ENRAGED:** *"EVERYTHING I HAVE LEFT — ALL OF IT — NOW."*`,
    ],

    enrageAt: 25,

    moves: [
      { name: "King's Verdict",    emoji: "♚", damage: 192, mpCost: 0,  weight: 3,
        taunt: `♚ **Aldrath:** *"King's Verdict."*\n♚ *Four centuries of judgment, in one strike.*` },
      { name: "Shattered Kingdom", emoji: "💥", damage: 158, mpCost: 65, weight: 3, effect: { kind: "bleed", value: 55, duration: 5 },
        taunt: `♚ **Aldrath:** *"Shattered Kingdom."*\n♚ *"Everything I lost — I use it."*` },
      { name: "Iron Throne",       emoji: "🪑", damage: 120, mpCost: 70, weight: 2, effect: { kind: "slow", value: 48, duration: 4 },
        taunt: `♚ **Aldrath:** *"Iron Throne."*\n♚ *"The throne still has power."*` },
      { name: "Last King's Guard",  emoji: "🛡️", damage: 0,   mpCost: 65, weight: 2, effect: { kind: "regen", value: 148, duration: 3 },
        taunt: `♚ **Aldrath:** *"Last King's Guard."*\n♚ *"I guard what I have left."*` },
      { name: "Dynasty's End",     emoji: "⚔️", damage: 240, mpCost: 100, weight: 1,
        taunt: `♚ **Aldrath:** *"Dynasty's End."*\n♚ *"This is how every dynasty ends."*` },
    ],

    enrageMoves: [
      { name: "LAST KING STANDING", emoji: "♚", damage: 312, mpCost: 0,  weight: 3,
        taunt: `♚ **Aldrath — ENRAGED:** *"LAST KING STANDING."*\n♚ *"FOUR CENTURIES. I AM STILL HERE."*` },
      { name: "Kingdom Come",       emoji: "💥", damage: 258, mpCost: 110, weight: 3, effect: { kind: "stun", value: 0, duration: 1 },
        taunt: `♚ **Aldrath — ENRAGED:** *"Kingdom Come."*\n♚ *"EVERY FALLEN KINGDOM — CHANNELED THROUGH ME."*` },
      { name: "Undying Crown",      emoji: "💎", damage: 0,   mpCost: 90,  weight: 2, effect: { kind: "regen", value: 175, duration: 3 },
        taunt: `♚ **Aldrath — ENRAGED:** *"Undying Crown."*\n♚ *"A king does not fall. A king does not fall."*` },
    ],
  },
};

export default arc8;
