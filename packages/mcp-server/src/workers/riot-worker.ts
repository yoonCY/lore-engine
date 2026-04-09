import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { RiotClient } from "../services/riot/riot-client.js";
import { MatchPipeline } from "../services/riot/match-pipeline.js";
import { ServerConfig } from "../config/server.js";

const config = ServerConfig.fromEnv();
const redisConnection = new Redis(config.redisUrl || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const riotQueue = new Queue("riot-sync", {
  connection: redisConnection,
});

// 타입 정리
interface SyncChallengerData {
  type: "SYNC_CHALLENGER";
  maxUsers: number;
  matchesPerUser: number;
}
interface FetchUserMatchesData {
  type: "FETCH_USER_MATCHES";
  puuid: string;
  matchesPerUser: number;
}
interface FetchMatchData {
  type: "FETCH_MATCH";
  matchId: string;
}

type RiotJobData = SyncChallengerData | FetchUserMatchesData | FetchMatchData;

export async function createRiotWorker() {
  const riotClient = new RiotClient();
  // processMatchDetail은 private이지만 파이프라인 우회를 위해 인스턴스를 사용하거나
  // 깔끔하게 접근 가능한 래퍼를 둬야 합니다. 임시로 형변환으로 호출.
  const pipeline = new MatchPipeline() as any; 

  console.log(`[RiotWorker] Starting Worker with Enterprise Rate Limit (40 jobs / 2 mins)...`);

  const worker = new Worker<RiotJobData>(
    "riot-sync",
    async (job: Job<RiotJobData>) => {
      const data = job.data;

      if (data.type === "SYNC_CHALLENGER") {
        console.log(`[Job:${job.id}] SYNC_CHALLENGER`);
        const leagueInfo = await riotClient.getChallengerLeague();
        const entries = (leagueInfo.entries || []).slice(0, data.maxUsers);
        
        for (const entry of entries) {
          if (entry.puuid) {
            await riotQueue.add("fetch-user", {
              type: "FETCH_USER_MATCHES",
              puuid: entry.puuid,
              matchesPerUser: data.matchesPerUser
            });
          }
        }
        return `Queued ${entries.length} users`;
      } 
      
      else if (data.type === "FETCH_USER_MATCHES") {
        console.log(`[Job:${job.id}] FETCH_USER_MATCHES for ${data.puuid}`);
        const matchIds = await riotClient.getMatchIdsByPuuid(data.puuid, data.matchesPerUser);
        
        for (const matchId of matchIds) {
          await riotQueue.add("fetch-match", {
            type: "FETCH_MATCH",
            matchId
          });
        }
        return `Queued ${matchIds.length} matches`;
      }

      else if (data.type === "FETCH_MATCH") {
        console.log(`[Job:${job.id}] FETCH_MATCH ${data.matchId}`);
        const matchDetail = await riotClient.getMatchDetails(data.matchId);
        let matchTimeline = null;
        try {
          matchTimeline = await riotClient.getMatchTimeline(data.matchId);
        } catch (e) {
          console.warn(`[Job:${job.id}] Timeline failed, skipping skill tree`);
        }
        
        await pipeline.processMatchDetail(matchDetail, matchTimeline);
        return `Processed match ${data.matchId}`;
      }
    },
    {
      connection: redisConnection,
      // API Rate Limit 방어 (총 100건/2분이므로 여유롭게 40개의 Job(최대 80 API)으로 제한)
      limiter: {
        max: 40,
        duration: 120000, 
      },
      concurrency: 1, // 안전하게 동시 1개 실행
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} (${job.data.type}) completed: ${job.returnvalue}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

// 이 파일을 직접 실행하면 워커가 가동되도록 함
if (import.meta.url === `file://${process.argv[1]}`) {
  createRiotWorker().catch(console.error);
}
