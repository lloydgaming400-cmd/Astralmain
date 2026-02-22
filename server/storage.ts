import { db } from "./db";
import {
  users, sects, cards,
  type User, type InsertUser,
  type Sect, type InsertSect,
  type Card, type InsertCard
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserByPhone(phoneId: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(phoneId: string, updates: Partial<InsertUser>): Promise<User>;

  // Sects
  getSectById(id: number): Promise<Sect | undefined>;
  getSectByName(name: string): Promise<Sect | undefined>;
  getSects(): Promise<Sect[]>;
  createSect(sect: InsertSect): Promise<Sect>;
  updateSect(id: number, updates: Partial<InsertSect>): Promise<Sect>;

  // Cards
  getCardsByOwner(phoneId: string): Promise<Card[]>;
  createCard(card: InsertCard): Promise<Card>;
  deleteCard(id: number): Promise<void>;
  updateCard(id: number, updates: Partial<InsertCard>): Promise<Card>;
  resetDatabase(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserByPhone(phoneId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneId, phoneId));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.xp));
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

  async getSectById(id: number): Promise<Sect | undefined> {
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
    const [updated] = await db.update(sects)
      .set(updates)
      .where(eq(sects.id, id))
      .returning();
    return updated;
  }

  async getCardsByOwner(phoneId: string): Promise<Card[]> {
    return await db.select().from(cards).where(eq(cards.ownerPhoneId, phoneId));
  }

  async createCard(card: InsertCard): Promise<Card> {
    const [created] = await db.insert(cards).values(card).returning();
    return created;
  }

  async deleteCard(id: number): Promise<void> {
    await db.delete(cards).where(eq(cards.id, id));
  }

  async updateCard(id: number, updates: Partial<InsertCard>): Promise<Card> {
    const [updated] = await db.update(cards)
      .set(updates)
      .where(eq(cards.id, id))
      .returning();
    return updated;
  }

  async resetDatabase(): Promise<void> {
    await db.delete(cards);
    await db.delete(sects);
    await db.delete(users);
  }
}

export const storage = new DatabaseStorage();
