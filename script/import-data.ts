import { storage } from "../server/storage";
import fs from "fs";
import path from "path";

async function importData() {
  try {
    const usersData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "attached_assets/users_(1)_1771808977440.json"), "utf-8"));
    const cardsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "attached_assets/cards_1771808977439.json"), "utf-8"));

    console.log(`Importing ${usersData.length} users...`);
    for (const u of usersData) {
      const existing = await storage.getUserByPhone(u.phone_id);
      if (!existing) {
        await storage.createUser({
          phoneId: u.phone_id,
          name: u.name,
          xp: u.xp || 0,
          messages: u.messages || 0,
          species: u.species || "Human",
          lastCardClaim: u.last_card_claim ? new Date(u.last_card_claim) : null,
        });
      }
    }

    console.log(`Importing ${cardsData.length} cards...`);
    for (const c of cardsData) {
      await storage.createCard({
        ownerPhoneId: c.owner_phone_id,
        characterId: c.character_id,
        name: c.name,
        series: c.series,
        imageUrl: c.image_url,
        rarity: c.rarity,
      });
    }

    console.log("Import complete!");
    process.exit(0);
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  }
}

importData();
