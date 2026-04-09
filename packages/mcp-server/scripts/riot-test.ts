import { RiotClient } from "../src/services/riot/riot-client.js";
import { StaticDataSyncService } from "../src/services/riot/static-data-sync.js";

async function main() {
  console.log("=== Riot API Initialization Test ===");
  
  // 1. Static Data Test
  console.log("\n[1] Testing Static Data Sync Service");
  const staticService = new StaticDataSyncService();
  const version = await staticService.getLatestVersion();
  console.log(`Latest Patch Version: ${version}`);
  
  // 2. Riot Client Test (requires API Key)
  if (!process.env.RIOT_API_KEY) {
    console.warn("\n[!] RIOT_API_KEY is not set in the environment. Skipping dynamic API tests.");
    console.log("Please set RIOT_API_KEY in your .env file or export it before running this script.");
    return;
  }

  console.log("\n[2] Testing Riot Client (Dynamic API)");
  const client = new RiotClient();

  try {
    const fakerAccount = await client.getAccountByRiotId("Hide on bush", "KR1");
    console.log("Faker Account Info:", fakerAccount);

    if (fakerAccount?.puuid) {
      console.log("\n[3] Fetching Recent Matches for PUUID");
      const matchIds = await client.getMatchIdsByPuuid(fakerAccount.puuid, 3);
      console.log("Recent Match IDs:", matchIds);
    }
  } catch (error: any) {
    console.error("Riot API Test Failed:", error.message);
  }
}

main().catch(console.error);
