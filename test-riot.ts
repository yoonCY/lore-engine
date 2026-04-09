import { RiotClient } from "./packages/mcp-server/src/services/riot/riot-client.js";

async function run() {
  const c = new RiotClient();
  const lg = await c.getChallengerLeague();
  console.log(lg.entries[0]);
}

run();
