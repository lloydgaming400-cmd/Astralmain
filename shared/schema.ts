import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneId: text("phone_id").notNull().unique(), // WhatsApp ID
  name: text("name").notNull(),
  race: text("race").notNull().default("Human"),
  aspect: text("aspect"),
  rank: text("rank"),
  level: integer("level").notNull().default(1),
  battleExp: integer("battle_exp").notNull().default(0),
  chatXp: integer("chat_xp").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  gems: integer("gems").notNull().default(0),
  strength: integer("strength").notNull().default(10),
  agility: integer("agility").notNull().default(12),
  endurance: integer("endurance").notNull().default(11),
  intelligence: integer("intelligence").notNull().default(14),
  luck: integer("luck").notNull().default(9),
  speed: integer("speed").notNull().default(10),
  statPoints: integer("stat_points").notNull().default(0),
  hp: integer("hp").notNull().default(220),
  maxHp: integer("max_hp").notNull().default(220),
  mp: integer("mp").notNull().default(280),
  maxMp: integer("max_mp").notNull().default(280),
  inventory: jsonb("inventory").notNull().default([]),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  disease: text("disease"),
  diseaseImmunity: boolean("disease_immunity").notNull().default(false),
  vampireUntil: timestamp("vampire_until"),
  eclipseUntil: timestamp("eclipse_until"),
  phantomUntil: timestamp("phantom_until"),
  dustDomainUntil: timestamp("dust_domain_until"),
  isConstellation: boolean("is_constellation").notNull().default(false),
  lastMessageAt: timestamp("last_message_at"),
  lastMessageContent: text("last_message_content"),
  dailyMessageCount: integer("daily_message_count").notNull().default(0),
  lastDailyReset: timestamp("last_daily_reset").notNull().defaultNow(),
  dragonEggHatched: boolean("dragon_egg_hatched").notNull().default(false),
  dragonEggProgress: integer("dragon_egg_progress").notNull().default(0),
  activeEffects: jsonb("active_effects").notNull().default([]),
  missAstralMemory: jsonb("miss_astral_memory").notNull().default([]),
  missAstralLastUsed: timestamp("miss_astral_last_used"),
  missAstralUsageCount: integer("miss_astral_usage_count").notNull().default(0),
  isBanned: boolean("is_banned").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
