import { db } from "./db";
import {
  users, sects, cards, globalStats, challenges,
  type User, type InsertUser,
  type Sect, type InsertSect,
  type Card, type InsertCard,
  type Challenge, type InsertChallenge,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

// ── In-memory battle state store (battles are ephemeral, not persisted) ────────
export interface ActiveBattleRecord {
  id: string;
  challengerPhoneId: string;
  opponentPhoneId: string;
  chatId: string;
  startedAt: Date;
  state: any; // BattleState from battle.ts
}

const activeBattles = new Map<string, ActiveBattleRecord>();
// phoneId → battleId lookup for fast player queries
const playerBattleMap = new Map<string, string>();

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
  updateCard(id: number, updates: Partial<InsertCard>): Promise<Card>;
  deleteCard(id: number): Promise<void>;

  // Global Stats
  getGlobalStats(): Promise<any>;
  updateGlobalStats(updates: any): Promise<void>;
  resetDatabase(): Promise<void>;

  // Challenges
  createChallenge(c: InsertChallenge): Promise<Challenge>;
  getPendingChallenge(challengerPhoneId: string): Promise<Challenge | undefined>;
  getPendingChallengeForTarget(targetPhoneId: string): Promise<Challenge | undefined>;
  updateChallenge(id: number, updates: Partial<InsertChallenge>): Promise<Challenge>;
  expireOldChallenges(): Promise<void>;

  // ── Battle (in-memory) ───────────────────────────────────────────────────────
  createBattle(record: ActiveBattleRecord): void;
  getBattle(battleId: string): ActiveBattleRecord | undefined;
  getActiveBattleByPlayer(phoneId: string): ActiveBattleRecord | undefined;
  updateBattleState(battleId: string, state: any): void;
  endBattle(battleId: string, winnerPhoneId: string): Promise<void>;
  getAllActiveBattles(): ActiveBattleRecord[];
}

export class DatabaseStorage implements IStorage {
  async getUserByPhone(phoneId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneId, phoneId));
    return user;
  }

  async resetDatabase(): Promise<void> {
    await db.delete(cards);
    await db.delete(sects);
    await db.delete(users);
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
    const [updated] = await db
      .update(users)
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

  async updateCard(id: number, updates: Partial<InsertCard>): Promise<Card> {
    const [updated] = await db.update(cards).set(updates).where(eq(cards.id, id)).returning();
    return updated;
  }

  async deleteCard(id: number): Promise<void> {
    await db.delete(cards).where(eq(cards.id, id));
  }

  async getGlobalStats(): Promise<any> {
    const [stats] = await db.select().from(globalStats).where(eq(globalStats.id, 1));
    return stats;
  }

  async updateGlobalStats(updates: any): Promise<void> {
    const [stats] = await db.select().from(globalStats).where(eq(globalStats.id, 1));
    if (!stats) {
      await db.insert(globalStats).values({ id: 1, ...updates });
    } else {
      await db.update(globalStats).set(updates).where(eq(globalStats.id, 1));
    }
  }

  // ── Challenges ────────────────────────────────────────────────────────────────

  async createChallenge(c: InsertChallenge): Promise<Challenge> {
    const [created] = await db.insert(challenges).values(c).returning();
    return created;
  }

  async getPendingChallenge(challengerPhoneId: string): Promise<Challenge | undefined> {
    const [c] = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.challengerPhoneId, challengerPhoneId), eq(challenges.status, "pending")));
    return c;
  }

  async getPendingChallengeForTarget(targetPhoneId: string): Promise<Challenge | undefined> {
    const [c] = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.targetPhoneId, targetPhoneId), eq(challenges.status, "pending")));
    return c;
  }

  async updateChallenge(id: number, updates: Partial<InsertChallenge>): Promise<Challenge> {
    const [updated] = await db
      .update(challenges)
      .set(updates)
      .where(eq(challenges.id, id))
      .returning();
    return updated;
  }

  async expireOldChallenges(): Promise<void> {
    const now = new Date();
    const pending = await db
      .select()
      .from(challenges)
      .where(eq(challenges.status, "pending"));
    for (const ch of pending) {
      if (new Date(ch.expiresAt) < now) {
        await db.update(challenges).set({ status: "expired" }).where(eq(challenges.id, ch.id));
      }
    }
  }

  // ── In-memory Battle Methods ──────────────────────────────────────────────────

  createBattle(record: ActiveBattleRecord): void {
    activeBattles.set(record.id, record);
    playerBattleMap.set(record.challengerPhoneId, record.id);
    playerBattleMap.set(record.opponentPhoneId, record.id);
  }

  getBattle(battleId: string): ActiveBattleRecord | undefined {
    return activeBattles.get(battleId);
  }

  getActiveBattleByPlayer(phoneId: string): ActiveBattleRecord | undefined {
    const battleId = playerBattleMap.get(phoneId);
    if (!battleId) return undefined;
    return activeBattles.get(battleId);
  }

  updateBattleState(battleId: string, state: any): void {
    const record = activeBattles.get(battleId);
    if (record) record.state = state;
  }

  // ── FIX: wins/losses are already handled inside resolveBattleTurn in bot.ts.
  //         This method only clears inBattle to avoid double-counting.
  async endBattle(battleId: string, winnerPhoneId: string): Promise<void> {
    const record = activeBattles.get(battleId);
    if (!record) return;

    const loserPhoneId =
      record.challengerPhoneId === winnerPhoneId
        ? record.opponentPhoneId
        : record.challengerPhoneId;

    // Only set inBattle = false — DO NOT increment wins/losses here
    await this.updateUser(winnerPhoneId, { inBattle: false });
    await this.updateUser(loserPhoneId,  { inBattle: false });

    // Clean up maps
    playerBattleMap.delete(record.challengerPhoneId);
    playerBattleMap.delete(record.opponentPhoneId);
    activeBattles.delete(battleId);
  }

  getAllActiveBattles(): ActiveBattleRecord[] {
    return Array.from(activeBattles.values());
  }
}

export const storage = new DatabaseStorage();
