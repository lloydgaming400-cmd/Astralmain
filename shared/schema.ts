import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phoneId: text("phone_id").notNull().unique(), // WhatsApp ID
  name: text("name").notNull(),
  xp: integer("xp").notNull().default(0),
  sectId: integer("sect_id"), 
  sectTag: text("sect_tag"),
  lastCardClaim: timestamp("last_card_claim"),
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
  malCharacterId: integer("mal_character_id").notNull(),
  name: text("name").notNull(),
  series: text("series").notNull(),
  imageUrl: text("image_url").notNull(),
  rarity: text("rarity").notNull(), // Common, Rare, Epic, Legendary
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertSectSchema = createInsertSchema(sects).omit({ id: true });
export const insertCardSchema = createInsertSchema(cards).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Sect = typeof sects.$inferSelect;
export type InsertSect = z.infer<typeof insertSectSchema>;
export type Card = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;
