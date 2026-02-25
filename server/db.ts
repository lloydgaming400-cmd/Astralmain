import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function runMigrations() {
  try {
    console.log("[db] Running database migrations...");
    await db.execute(`
      -- Existing columns (safe to re-run with IF NOT EXISTS)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS eclipse_until TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phantom_until TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mirror_race TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mirror_original_race TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS mirror_until TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dust_domain_until TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dust_domain_messages INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS has_shadow_veil BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_suck_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS disease TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS infected_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_dead BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vampire BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS vampire_until TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_constellation BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dragon_egg_hatched BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dragon_egg_progress INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS guide_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS guide_smash_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS guide_pregnant BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS guide_child_name TEXT;

      -- Battle System columns
      ALTER TABLE users ADD COLUMN IF NOT EXISTS battle_exp INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS battle_wins INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS battle_losses INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_actives JSONB NOT NULL DEFAULT '[]';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_passive TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS in_battle BOOLEAN NOT NULL DEFAULT FALSE;

      -- Dungeon System columns
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dungeon_floor INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dungeon_active BOOLEAN NOT NULL DEFAULT FALSE;

      -- Pet System columns
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pet_type TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pet_name TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pet_xp_stolen INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pet_hatched BOOLEAN NOT NULL DEFAULT FALSE;

      -- Permanent Stat Bonus columns (earned through battles & dungeon)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS str_bonus INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS agi_bonus INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS int_bonus INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS lck_bonus INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS spd_bonus INTEGER NOT NULL DEFAULT 0;

      -- Reset any stuck battle/dungeon states from a previous crash/restart
      UPDATE users SET in_battle = FALSE WHERE in_battle = TRUE;
      UPDATE users SET dungeon_active = FALSE WHERE dungeon_active = TRUE;

      -- Challenges table
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        challenger_phone_id TEXT NOT NULL,
        target_phone_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
      );
    `);
    console.log("[db] Migrations complete ✅");
  } catch (err) {
    console.error("[db] Migration error:", err);
    // Don't rethrow — allow server to start even if migration partially fails
  }
}
