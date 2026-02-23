import { db } from "./db";
import { users, sects, cards, globalStats, type User, type InsertUser, type Sect, type InsertSect, type Card, type InsertCard } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUserByPhone(phoneId: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(phoneId: string, updates: Partial<InsertUser>): Promise<User>;
  getBannedUsers(): Promise<User[]>;
  
  // Sects
  getSect(id: number): Promise<Sect | undefined>;
  getSectByName(name: string): Promise<Sect | undefined>;
  getSects(): Promise<Sect[]>;
  createSect(sect: InsertSect): Promise<Sect>;
  updateSect(id: number, updates: Partial<InsertSect>): Promise<Sect>;
  
  // Cards
  getUserCards(phoneId: string): Promise<Card[]>;
  createCard(card: InsertCard): Promise<Card>;
  getCard(id: number): Promise<Card | undefined>;
  deleteCard(id: number): Promise<void>;

  // Global Stats
  getGlobalStats(): Promise<any>;
  updateGlobalStats(updates: any): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserByPhone(phoneId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneId, phoneId));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isBanned, false)).orderBy(desc(users.xp));
  }

  async getBannedUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isBanned, true)).orderBy(desc(users.xp));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(phoneId: string, updates: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users)
      .set(updates)
      .where(eq(users.phoneId, phoneId))
      .returning();
    return updated;
  }

  async getSect(id: number): Promise<Sect | undefined> {
    const [sect] = await db.select().from(sects).where(eq(sects.id, id));
    return sect;
  }

  async getSectByName(name: string): Promise<Sect | undefined> {
    const [sect] = await db.select().from(sects).where(eq(sects.name, name));
    return sect;
  }

  async getSects(): Promise<Sect[]> {
    return await db.select().from(sects).orderBy(desc(sects.treasuryXp));
  }

  async createSect(sect: InsertSect): Promise<Sect> {
    const [created] = await db.insert(sects).values(sect).returning();
    return created;
  }

  async updateSect(id: number, updates: Partial<InsertSect>): Promise<Sect> {
    const [updated] = await db.update(sects).set(updates).where(eq(sects.id, id)).returning();
    return updated;
  }

  async getUserCards(phoneId: string): Promise<Card[]> {
    return await db.select().from(cards).where(eq(cards.ownerPhoneId, phoneId));
  }

  async createCard(card: InsertCard): Promise<Card> {
    const [created] = await db.insert(cards).values(card).returning();
    return created;
  }

  async getCard(id: number): Promise<Card | undefined> {
    const [card] = await db.select().from(cards).where(eq(cards.id, id));
    return card;
  }

  async deleteCard(id: number): Promise<void> {
    await db.delete(cards).where(eq(cards.id, id));
  }

  async getGlobalStats(): Promise<any> {
    const [stats] = await db.select().from(globalStats).where(eq(globalStats.id, 1));
    return stats;
  }

  async updateGlobalStats(updates: any): Promise<void> {
    await db.update(globalStats).set(updates).where(eq(globalStats.id, 1));
  }
}

export const storage = new DatabaseStorage();

export const storage = new DatabaseStorage();
