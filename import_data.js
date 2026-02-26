const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function processJson() {
  const client = await pool.connect();
  try {
    const usersData = JSON.parse(fs.readFileSync('attached_assets/users_(1)_1772149632839.json', 'utf8'));
    const challengesData = JSON.parse(fs.readFileSync('attached_assets/challenges_(1)_1772149632838.json', 'utf8'));
    const globalStatsData = JSON.parse(fs.readFileSync('attached_assets/global_stats_(1)_1772149640694.json', 'utf8'));

    console.log(\`Starting to process \${usersData.length} users...\`);
    for (const user of usersData) {
      const query = \`
        INSERT INTO users (
          phone_id, name, xp, messages, sect_id, sect_tag, species, last_card_claim, 
          inventory, is_banned, miss_astral_memory, miss_astral_last_used, miss_astral_usage_count, 
          is_registered, rank, condition, hp, last_daily_reset, daily_message_count, 
          dragon_egg_hatched, dragon_egg_progress, is_vampire, vampire_until, is_constellation, 
          dust_domain_until, dust_domain_messages, has_shadow_veil, last_suck_at, last_message_reset, 
          disease, infected_at, is_dead, guide_name, guide_smash_at, guide_pregnant, 
          guide_child_name, eclipse_until, phantom_until, mirror_race, mirror_original_race, 
          mirror_until, battle_exp, battle_wins, battle_losses, equipped_actives, 
          equipped_passive, in_battle, dungeon_floor, dungeon_active, pet_type, 
          pet_name, pet_xp_stolen, pet_hatched, str_bonus, agi_bonus, int_bonus, lck_bonus, spd_bonus
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 
          $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, 
          $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, 
          $54, $55, $56, $57, $58
        ) ON CONFLICT (phone_id) DO UPDATE SET
          name = EXCLUDED.name, xp = EXCLUDED.xp, messages = EXCLUDED.messages, 
          sect_id = EXCLUDED.sect_id, sect_tag = EXCLUDED.sect_tag, species = EXCLUDED.species, 
          last_card_claim = EXCLUDED.last_card_claim, inventory = EXCLUDED.inventory, 
          is_banned = EXCLUDED.is_banned, miss_astral_memory = EXCLUDED.miss_astral_memory, 
          miss_astral_last_used = EXCLUDED.miss_astral_last_used, 
          miss_astral_usage_count = EXCLUDED.miss_astral_usage_count, 
          is_registered = EXCLUDED.is_registered, rank = EXCLUDED.rank, 
          condition = EXCLUDED.condition, hp = EXCLUDED.hp, 
          last_daily_reset = EXCLUDED.last_daily_reset, daily_message_count = EXCLUDED.daily_message_count, 
          dragon_egg_hatched = EXCLUDED.dragon_egg_hatched, dragon_egg_progress = EXCLUDED.dragon_egg_progress, 
          is_vampire = EXCLUDED.is_vampire, vampire_until = EXCLUDED.vampire_until, 
          is_constellation = EXCLUDED.is_constellation, dust_domain_until = EXCLUDED.dust_domain_until, 
          dust_domain_messages = EXCLUDED.dust_domain_messages, has_shadow_veil = EXCLUDED.has_shadow_veil, 
          last_suck_at = EXCLUDED.last_suck_at, last_message_reset = EXCLUDED.last_message_reset, 
          disease = EXCLUDED.disease, infected_at = EXCLUDED.infected_at, is_dead = EXCLUDED.is_dead, 
          guide_name = EXCLUDED.guide_name, guide_smash_at = EXCLUDED.guide_smash_at, 
          guide_pregnant = EXCLUDED.guide_pregnant, guide_child_name = EXCLUDED.guide_child_name, 
          eclipse_until = EXCLUDED.eclipse_until, phantom_until = EXCLUDED.phantom_until, 
          mirror_race = EXCLUDED.mirror_race, mirror_original_race = EXCLUDED.mirror_original_race, 
          mirror_until = EXCLUDED.mirror_until, battle_exp = EXCLUDED.battle_exp, 
          battle_wins = EXCLUDED.battle_wins, battle_losses = EXCLUDED.battle_losses, 
          equipped_actives = EXCLUDED.equipped_actives, equipped_passive = EXCLUDED.equipped_passive, 
          in_battle = EXCLUDED.in_battle, dungeon_floor = EXCLUDED.dungeon_floor, 
          dungeon_active = EXCLUDED.dungeon_active, pet_type = EXCLUDED.pet_type, 
          pet_name = EXCLUDED.pet_name, pet_xp_stolen = EXCLUDED.pet_xp_stolen, 
          pet_hatched = EXCLUDED.pet_hatched, str_bonus = EXCLUDED.str_bonus, 
          agi_bonus = EXCLUDED.agi_bonus, int_bonus = EXCLUDED.int_bonus, 
          lck_bonus = EXCLUDED.lck_bonus, spd_bonus = EXCLUDED.spd_bonus
      \`;
      const values = [
        user.phone_id, user.name, user.xp || 0, user.messages || 0, user.sect_id, user.sect_tag, user.species || "Human", 
        user.last_card_claim ? new Date(user.last_card_claim) : null, JSON.stringify(user.inventory || []), 
        user.is_banned || false, JSON.stringify(user.miss_astral_memory || []), 
        user.miss_astral_last_used ? new Date(user.miss_astral_last_used) : null, user.miss_astral_usage_count || 0, 
        user.is_registered || false, user.rank || 8, user.condition || "Healthy", user.hp || 100, 
        user.last_daily_reset ? new Date(user.last_daily_reset) : new Date(), user.daily_message_count || 0, 
        user.dragon_egg_hatched || false, user.dragon_egg_progress || 0, user.is_vampire || false, 
        user.vampire_until ? new Date(user.vampire_until) : null, user.is_constellation || false, 
        user.dust_domain_until ? new Date(user.dust_domain_until) : null, user.dust_domain_messages || 0, 
        user.has_shadow_veil || false, user.last_suck_at ? new Date(user.last_suck_at) : null, 
        user.last_message_reset ? new Date(user.last_message_reset) : new Date(), user.disease, 
        user.infected_at ? new Date(user.infected_at) : null, user.is_dead || false, user.guide_name, 
        user.guide_smash_at ? new Date(user.guide_smash_at) : null, user.guide_pregnant || false, 
        user.guide_child_name, user.eclipse_until ? new Date(user.eclipse_until) : null, 
        user.phantom_until ? new Date(user.phantom_until) : null, user.mirror_race, user.mirror_original_race, 
        user.mirror_until ? new Date(user.mirror_until) : null, user.battle_exp || 0, user.battle_wins || 0, 
        user.battle_losses || 0, JSON.stringify(user.equipped_actives || []), user.equipped_passive, 
        user.in_battle || false, user.dungeon_floor || 1, user.dungeon_active || false, user.pet_type, 
        user.pet_name, user.pet_xp_stolen || 0, user.pet_hatched || false, user.str_bonus || 0, 
        user.agi_bonus || 0, user.int_bonus || 0, user.lck_bonus || 0, user.spd_bonus || 0
      ];
      await client.query(query, values);
    }
    console.log(\`Successfully processed \${usersData.length} users.\`);

    console.log(\`Starting to process \${challengesData.length} challenges...\`);
    for (const challenge of challengesData) {
      const query = \`
        INSERT INTO challenges (challenger_phone_id, target_phone_id, chat_id, expires_at, status)
        VALUES ($1, $2, $3, $4, $5)
      \`;
      const values = [
        challenge.challenger_phone_id, challenge.target_phone_id, challenge.chat_id, 
        new Date(challenge.expires_at), challenge.status || "pending"
      ];
      await client.query(query, values);
    }
    console.log(\`Successfully processed \${challengesData.length} challenges.\`);

    if (globalStatsData.length > 0) {
      const stats = globalStatsData[0];
      const query = \`
        INSERT INTO global_stats (
          id, total_messages, void_fragment_threshold, star_dust_threshold, active_disease, 
          disease_race, last_outbreak_at, outbreak_ends_at, last_weekly_bonus_at
        ) VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          total_messages = EXCLUDED.total_messages, 
          void_fragment_threshold = EXCLUDED.void_fragment_threshold, 
          star_dust_threshold = EXCLUDED.star_dust_threshold, 
          active_disease = EXCLUDED.active_disease, 
          disease_race = EXCLUDED.disease_race, 
          last_outbreak_at = EXCLUDED.last_outbreak_at, 
          outbreak_ends_at = EXCLUDED.outbreak_ends_at, 
          last_weekly_bonus_at = EXCLUDED.last_weekly_bonus_at
      \`;
      const values = [
        stats.total_messages || 0, stats.void_fragment_threshold || 300000, stats.star_dust_threshold || 10000, 
        stats.active_disease, stats.disease_race, 
        stats.last_outbreak_at ? new Date(stats.last_outbreak_at) : null, 
        stats.outbreak_ends_at ? new Date(stats.outbreak_ends_at) : null, 
        stats.last_weekly_bonus_at ? new Date(stats.last_weekly_bonus_at) : null
      ];
      await client.query(query, values);
      console.log('Successfully processed global stats.');
    }
  } catch (err) {
    console.error('Error processing JSON files:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

processJson();
