import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { initBot, connectionStatus, currentQrCode, refreshQr } from "./bot";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Start the WhatsApp bot (fire-and-forget — migrations already ran in index.ts)
  initBot();

  // ── QR / Connection ─────────────────────────────────────────────────────────
  app.get(api.qr.status.path, (_req, res) => {
    res.status(200).json({
      status: connectionStatus,
      qrCode: currentQrCode,
    });
  });

  app.post(api.qr.refresh.path, (_req, res) => {
    refreshQr();
    res.status(200).json({ success: true });
  });

  // ── Leaderboard — returns real users AND real sects ─────────────────────────
  app.get(api.stats.leaderboard.path, async (_req, res) => {
    try {
      const [users, sects] = await Promise.all([
        storage.getUsers(),
        storage.getSects(),
      ]);
      res.status(200).json({ users, sects });
    } catch (err) {
      console.error("Leaderboard error:", err);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // ── Active battles (for dashboard if needed) ────────────────────────────────
  app.get("/api/battles", (_req, res) => {
    try {
      const battles = storage.getAllActiveBattles().map(b => ({
        id: b.id,
        challenger: b.challengerPhoneId,
        opponent: b.opponentPhoneId,
        startedAt: b.startedAt,
        turn: b.state?.turn ?? 0,
      }));
      res.status(200).json({ battles });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch battles" });
    }
  });

  // ── Reset DB (owner tool) ────────────────────────────────────────────────────
  app.post("/api/reset", async (_req, res) => {
    try {
      await storage.resetDatabase();
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("Reset error:", err);
      res.status(500).json({ error: "Reset failed" });
    }
  });

  return httpServer;
}
