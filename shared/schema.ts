import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneId: text("phone_id").notNull().unique(),
  name: text("name").notNull(),
  xp: integer("xp").notNull().default(0),
  messages: integer("messages").notNull().default(0),
  sectId: integer("sect_id"),
  sectTag: text("sect_tag"),
  species: text("species").notNull().default("Human"),
  lastCardClaim: timestamp("last_card_claim"),
  inventory: jsonb("inventory").notNull().default([]),
  isBanned: boolean("is_banned").notNull().default(false),
  missAstralMemory: jsonb("miss_astral_memory").notNull().default([]),
  missAstralLastUsed: timestamp("miss_astral_last_used"),
  missAstralUsageCount: integer("miss_astral_usage_count").notNull().default(0),
  isRegistered: boolean("is_registered").notNull().default(false),
  // FIX: default was 1 (highest rank) — new users should start at 8 (lowest)
  rank: integer("rank").notNull().default(8),
  condition: text("condition").notNull().default("Healthy"),
  hp: integer("hp").notNull().default(100),
  lastDailyReset: timestamp("last_daily_reset").notNull().defaultNow(),
  dailyMessageCount: integer("daily_message_count").notNull().default(0),
  dragonEggHatched: boolean("dragon_egg_hatched").notNull().default(false),
  dragonEggProgress: integer("dragon_egg_progress").notNull().default(0),
  isVampire: boolean("is_vampire").notNull().default(false),
  vampireUntil: timestamp("vampire_until"),
  isConstellation: boolean("is_constellation").notNull().default(false),
  dustDomainUntil: timestamp("dust_domain_until"),
  dustDomainMessages: integer("dust_domain_messages").notNull().default(0),
  hasShadowVeil: boolean("has_shadow_veil").notNull().default(false),
  lastSuckAt: timestamp("last_suck_at"),
  lastMessageReset: timestamp("last_message_reset").notNull().defaultNow(),
  disease: text("disease"),
  infectedAt: timestamp("infected_at"),
  isDead: boolean("is_dead").notNull().default(false),

  // ── Guide System ────────────────────────────────────────────────────────────
  guideName: text("guide_name"),
  guideSmashAt: timestamp("guide_smash_at"),
  guidePregnant: boolean("guide_pregnant").notNull().default(false),
  guideChildName: text("guide_child_name"),

  // ── Item Effects ─────────────────────────────────────────────────────────────
  eclipseUntil: timestamp("eclipse_until"),
  phantomUntil: timestamp("phantom_until"),
  mirrorRace: text("mirror_race"),
  mirrorOriginalRace: text("mirror_original_race"),
  mirrorUntil: timestamp("mirror_until"),

  // ── Battle System ─────────────────────────────────────────────────────────────
  battleExp: integer("battle_exp").notNull().default(0),
  battleWins: integer("battle_wins").notNull().default(0),
  battleLosses: integer("battle_losses").notNull().default(0),
  equippedActives: jsonb("equipped_actives").notNull().default([]),  // string[] skill IDs
  equippedPassive: text("equipped_passive"),                          // skill ID or null
  inBattle: boolean("in_battle").notNull().default(false),

  // FIX: These were missing from schema — caused runtime `as any` casts and silent DB errors
  dungeonFloor: integer("dungeon_floor").notNull().default(1),
  dungeonActive: boolean("dungeon_active").notNull().default(false),
});

export const globalStats = pgTable("global_stats", {
  id: serial("id").primaryKey(),
  totalMessages: integer("total_messages").notNull().default(0),
  voidFragmentThreshold: integer("void_fragment_threshold").notNull().default(300000),
  starDustThreshold: integer("star_dust_threshold").notNull().default(10000),
  activeDisease: text("active_disease"),
  diseaseRace: text("disease_race"),
  lastOutbreakAt: timestamp("last_outbreak_at"),
  outbreakEndsAt: timestamp("outbreak_ends_at"),
});

export const sects = pgTable("sects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  tag: text("tag").notNull().unique(),
  leaderPhoneId: text("leader_phone_id").notNull(),
  treasuryXp: integer("treasury_xp").notNull().default(0),
  membersCount: integer("members_count").notNull().default(1),
  imageUrl: text("image_url"),
});

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  ownerPhoneId: text("owner_phone_id").notNull(),
  characterId: integer("character_id").notNull(),
  name: text("name").notNull(),
  series: text("series").notNull(),
  imageUrl: text("image_url"),
  rarity: text("rarity").notNull(),
});

// ── Challenges (pending, expires 5 min) ───────────────────────────────────────
export const challenges = pgTable("challenges", {
  id: serial("id").primaryKey(),
  challengerPhoneId: text("challenger_phone_id").notNull(),
  targetPhoneId: text("target_phone_id").notNull(),
  chatId: text("chat_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // pending | accepted | declined | expired
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSectSchema = createInsertSchema(sects).omit({ id: true });
export const insertCardSchema = createInsertSchema(cards).omit({ id: true });
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Sect = typeof sects.$inferSelect;
export type InsertSect = z.infer<typeof insertSectSchema>;
export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
