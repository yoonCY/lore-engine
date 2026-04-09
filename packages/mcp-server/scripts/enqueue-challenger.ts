import { riotQueue } from "../src/workers/riot-worker.js";

async function main() {
  console.log("Enqueuing SYNC_CHALLENGER job to BullMQ...");
  await riotQueue.add("sync-run-1", {
    type: "SYNC_CHALLENGER",
    maxUsers: 50,         // 우선 50명의 챌린저 유저를 가져옴
    matchesPerUser: 10,   // 각 유저당 10번의 매치를 수집 (총 500 매치)
  });
  console.log("Successfully enqueued. Start the worker to process them!");
  process.exit(0);
}

main().catch(console.error);
