import fs from "fs";
import path from "path";
import { db } from "../server/db";
import { users, cards, challenges, globalStats } from "../shared/schema";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importData() {
  console.log("Starting data import...");

  try {
    // 1. Import Users
    const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, "../attached_assets/users_1772017827130.json"), "utf8"));
    console.log(`Importing ${usersData.length} users...`);
    for (const u of usersData) {
      await db.insert(users).values({
        phoneId: u.phone_id,
        name: u.name,
        xp: u.xp,
        messages: u.messages,
        sectId: u.sect_id,
        sectTag: u.sect_tag,
        species: u.species,
        lastCardClaim: u.last_card_claim ? new Date(u.last_card_claim) : null,
        inventory: u.inventory || [],
        isBanned: u.is_banned,
        missAstralMemory: u.miss_astral_memory || [],
        missAstralLastUsed: u.miss_astral_last_used ? new Date(u.miss_astral_last_used) : null,
        missAstralUsageCount: u.miss_astral_usage_count,
        isRegistered: u.is_registered,
        rank: u.rank,
        condition: u.condition,
        hp: u.hp,
        lastDailyReset: u.last_daily_reset ? new Date(u.last_daily_reset) : new Date(),
        dailyMessageCount: u.daily_message_count,
        dragonEggHatched: u.dragon_egg_hatched,
        dragonEggProgress: u.dragon_egg_progress,
        isVampire: u.is_vampire,
        vampireUntil: u.vampire_until ? new Date(u.vampire_until) : null,
        isConstellation: u.is_constellation,
        dustDomainUntil: u.dust_domain_until ? new Date(u.dust_domain_until) : null,
        dustDomainMessages: u.dust_domain_messages,
        hasShadowVeil: u.has_shadow_veil,
        lastSuckAt: u.last_suck_at ? new Date(u.last_suck_at) : null,
        lastMessageReset: u.last_message_reset ? new Date(u.last_message_reset) : new Date(),
        disease: u.disease,
        infectedAt: u.infected_at ? new Date(u.infected_at) : null,
        isDead: u.is_dead,
        guideName: u.guide_name,
        guideSmashAt: u.guide_smash_at ? new Date(u.guide_smash_at) : null,
        guidePregnant: u.guide_pregnant,
        guideChildName: u.guide_child_name,
        eclipseUntil: u.eclipse_until ? new Date(u.eclipse_until) : null,
        phantomUntil: u.phantom_until ? new Date(u.phantom_until) : null,
        mirrorRace: u.mirror_race,
        mirrorOriginalRace: u.mirror_original_race,
        mirrorUntil: u.mirror_until ? new Date(u.mirror_until) : null,
        battleExp: u.battle_exp || 0,
        battleWins: u.battle_wins || 0,
        battleLosses: u.battle_losses || 0,
        equippedActives: u.equipped_actives || [],
        equippedPassive: u.equipped_passive,
        inBattle: u.in_battle || false,
        dungeonFloor: u.dungeon_floor || 1,
        dungeonActive: u.dungeon_active || false,
      }).onConflictDoUpdate({
        target: users.phoneId,
        set: {
          name: u.name,
          xp: u.xp,
          messages: u.messages,
          sectId: u.sect_id,
          sectTag: u.sect_tag,
          species: u.species,
          lastCardClaim: u.last_card_claim ? new Date(u.last_card_claim) : null,
          inventory: u.inventory || [],
          isBanned: u.is_banned,
          missAstralMemory: u.miss_astral_memory || [],
          missAstralLastUsed: u.miss_astral_last_used ? new Date(u.miss_astral_last_used) : null,
          missAstralUsageCount: u.miss_astral_usage_count,
          isRegistered: u.is_registered,
          rank: u.rank,
          condition: u.condition,
          hp: u.hp,
          lastDailyReset: u.last_daily_reset ? new Date(u.last_daily_reset) : new Date(),
          dailyMessageCount: u.daily_message_count,
          dragonEggHatched: u.dragon_egg_hatched,
          dragonEggProgress: u.dragon_egg_progress,
          isVampire: u.is_vampire,
          vampireUntil: u.vampire_until ? new Date(u.vampire_until) : null,
          isConstellation: u.is_constellation,
          dustDomainUntil: u.dust_domain_until ? new Date(u.dust_domain_until) : null,
          dustDomainMessages: u.dust_domain_messages,
          hasShadowVeil: u.has_shadow_veil,
          lastSuckAt: u.last_suck_at ? new Date(u.last_suck_at) : null,
          lastMessageReset: u.last_message_reset ? new Date(u.last_message_reset) : new Date(),
          disease: u.disease,
          infectedAt: u.infected_at ? new Date(u.infected_at) : null,
          isDead: u.is_dead,
          guideName: u.guide_name,
          guideSmashAt: u.guide_smash_at ? new Date(u.guide_smash_at) : null,
          guidePregnant: u.guide_pregnant,
          guideChildName: u.guide_child_name,
          eclipseUntil: u.eclipse_until ? new Date(u.eclipse_until) : null,
          phantomUntil: u.phantom_until ? new Date(u.phantom_until) : null,
          mirrorRace: u.mirror_race,
          mirrorOriginalRace: u.mirror_original_race,
          mirrorUntil: u.mirror_until ? new Date(u.mirror_until) : null,
          battleExp: u.battle_exp || 0,
          battleWins: u.battle_wins || 0,
          battleLosses: u.battle_losses || 0,
          equippedActives: u.equipped_actives || [],
          equippedPassive: u.equipped_passive,
          inBattle: u.in_battle || false,
          dungeonFloor: u.dungeon_floor || 1,
          dungeonActive: u.dungeon_active || false,
        }
      });
    }

    // 2. Import Cards
    const cardsData = JSON.parse(fs.readFileSync(path.join(__dirname, "../attached_assets/cards_1772017827127.json"), "utf8"));
    console.log(`Importing ${cardsData.length} cards...`);
    for (const c of cardsData) {
      await db.insert(cards).values({
        ownerPhoneId: c.owner_phone_id,
        characterId: c.character_id,
        name: c.name,
        series: c.series,
        imageUrl: c.image_url,
        rarity: c.rarity,
      });
    }

    // 3. Import Challenges
    const challengesData = JSON.parse(fs.readFileSync(path.join(__dirname, "../attached_assets/challenges_1772017827128.json"), "utf8"));
    console.log(`Importing ${challengesData.length} challenges...`);
    for (const ch of challengesData) {
      await db.insert(challenges).values({
        challengerPhoneId: ch.challenger_phone_id,
        targetPhoneId: ch.target_phone_id,
        chatId: ch.chat_id,
        expiresAt: new Date(ch.expires_at),
        status: ch.status,
      });
    }

    // 4. Import Global Stats
    const statsData = JSON.parse(fs.readFileSync(path.join(__dirname, "../attached_assets/global_stats_1772017827129.json"), "utf8"));
    console.log(`Importing global stats...`);
    if (statsData.length > 0) {
      const s = statsData[0];
      await db.insert(globalStats).values({
        id: 1,
        totalMessages: s.total_messages,
        voidFragmentThreshold: s.void_fragment_threshold,
        starDustThreshold: s.star_dust_threshold,
        activeDisease: s.active_disease,
        diseaseRace: s.disease_race,
        lastOutbreakAt: s.last_outbreak_at ? new Date(s.last_outbreak_at) : null,
        outbreakEndsAt: s.outbreak_ends_at ? new Date(s.outbreak_ends_at) : null,
      }).onConflictDoUpdate({
        target: globalStats.id,
        set: {
          totalMessages: s.total_messages,
          voidFragmentThreshold: s.void_fragment_threshold,
          starDustThreshold: s.star_dust_threshold,
          activeDisease: s.active_disease,
          diseaseRace: s.disease_race,
          lastOutbreakAt: s.last_outbreak_at ? new Date(s.last_outbreak_at) : null,
          outbreakEndsAt: s.outbreak_ends_at ? new Date(s.outbreak_ends_at) : null,
        }
      });
    }

    console.log("Data import completed successfully!");
  } catch (error) {
    console.error("Error importing data:", error);
    process.exit(1);
  }
}

importData();
