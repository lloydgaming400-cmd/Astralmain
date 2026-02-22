import { db } from "../server/db";
import { users, cards } from "../shared/schema";
import fs from "fs";
import path from "path";

async function main() {
  const usersJson = JSON.parse(fs.readFileSync("attached_assets/users_(1)_1771803963317.json", "utf-8"));
  const cardsJson = JSON.parse(fs.readFileSync("attached_assets/cards_1771803963316.json", "utf-8"));

  console.log("Importing users...");
  for (const u of usersJson) {
    try {
      await db.insert(users).values({
        phoneId: u.phone_id,
        name: u.name,
        xp: u.xp,
        messages: u.messages,
        sectId: u.sect_id,
        sectTag: u.sect_tag,
        species: u.species,
        lastCardClaim: u.last_card_claim ? new Date(u.last_card_claim) : null,
        inventory: []
      }).onConflictDoUpdate({
        target: users.phoneId,
        set: {
          name: u.name,
          xp: u.xp,
          messages: u.messages,
          sectId: u.sect_id,
          sectTag: u.sect_tag,
          species: u.species,
          lastCardClaim: u.last_card_claim ? new Date(u.last_card_claim) : null,
        }
      });
    } catch (e) {
      console.error("Error importing user", u.phone_id, e);
    }
  }

  console.log("Importing cards...");
  for (const c of cardsJson) {
    try {
      await db.insert(cards).values({
        ownerPhoneId: c.owner_phone_id,
        characterId: c.character_id,
        name: c.name,
        series: c.series,
        imageUrl: c.image_url,
        rarity: c.rarity
      });
    } catch (e) {
      console.error("Error importing card", c.id, e);
    }
  }
  console.log("Import completed!");
  process.exit(0);
}

main();
