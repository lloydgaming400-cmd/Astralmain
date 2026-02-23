import { db } from "./db";
import { users, type User, type InsertUser } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUserByPhone(phoneId: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(phoneId: string, updates: Partial<InsertUser>): Promise<User>;
  getBannedUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  async getUserByPhone(phoneId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneId, phoneId));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isBanned, false)).orderBy(desc(users.chatXp));
  }

  async getBannedUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isBanned, true)).orderBy(desc(users.chatXp));
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
}

export const storage = new DatabaseStorage();
