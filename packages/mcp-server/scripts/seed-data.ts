import { StaticDataSyncService } from "../src/services/riot/static-data-sync.js";
import { MatchPipeline } from "../src/services/riot/match-pipeline.js";
import { Database } from "../src/config/database.js";

async function main() {
  console.log("=== Starting Data Seeding ===");

  try {
    const staticSync = new StaticDataSyncService();
    await staticSync.syncToDatabase();

    const matchPipeline = new MatchPipeline();
    // Use limited counts to ensure the seeding script runs relatively fast during tests.
    await matchPipeline.runChallengerSync(2, 2);

    console.log("=== Data Seeding Complete ===");
  } catch (error) {
    console.error("Data Seeding Failed:", error);
    process.exit(1);
  } finally {
    const driver = await Database.getDriver();
    await driver.close();
    process.exit(0);
  }
}

main();
