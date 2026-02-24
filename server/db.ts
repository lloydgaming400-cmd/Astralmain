import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// ── Auto-migrate on startup ───────────────────────────────────────────────────
// This ensures all new schema columns are added to the database automatically
// without needing to run `npx drizzle-kit push` manually.
export async function runMigrations() {
  try {
    console.log("[db] Running database migrations...");
    await db.execute(`
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
    `);
    console.log("[db] Migrations complete ✅");
  } catch (err) {
    console.error("[db] Migration error:", err);
  }
}
