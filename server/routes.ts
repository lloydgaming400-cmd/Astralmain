import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { initBot, connectionStatus, currentQrCode, refreshQr } from "./bot";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Start the bot
  initBot();

  app.get(api.qr.status.path, (req, res) => {
    res.status(200).json({
      status: connectionStatus,
      qrCode: currentQrCode
    });
  });

  app.post(api.qr.refresh.path, (req, res) => {
    refreshQr();
    res.status(200).json({ success: true });
  });

  app.get(api.stats.leaderboard.path, async (req, res) => {
    const users = await storage.getUsers();
    const sects = await storage.getSects();
    res.status(200).json({ users, sects });
  });

  app.post("/api/reset", async (req, res) => {
    await storage.resetDatabase();
    res.status(200).json({ success: true });
  });

  return httpServer;
}
