/**
 * Nexon Data Sync Worker
 *
 * BullMQ 기반 넥슨 3개 게임 데이터 수집 워커.
 * riot-worker.ts 와 동일한 Queue/Worker 아키텍처를 따릅니다.
 *
 * Job Types:
 * - SYNC_MAPLE_CHARACTER: 메이플 캐릭터 정보 수집 → Neo4j 적재
 * - SYNC_FC_MATCHES:      FC Online 매치 기록 수집
 * - SYNC_TFD_USER:        TFD 유저 + 계승자/무기 데이터 수집
 *
 * Rate Limit 전략:
 * 넥슨 API는 게임별로 초당 5회(test 키 기준) 제한이므로,
 * BullMQ limiter 로 안전하게 30 jobs / 60초로 운영합니다.
 */

import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { NexonClients } from "../services/nexon/nexon-client.js";
import { ServerConfig } from "../config/server.js";

const config = ServerConfig.fromEnv();
const redisConnection = new Redis(config.redisUrl || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const nexonQueue = new Queue("nexon-sync", {
  connection: redisConnection,
});

// ─── Job Type Definitions ──────────────────────────────────────

interface SyncMapleCharacterData {
  type: "SYNC_MAPLE_CHARACTER";
  characterName: string;
}

interface SyncFcMatchesData {
  type: "SYNC_FC_MATCHES";
  nickname: string;
  matchtype?: number;
  limit?: number;
}

interface SyncTfdUserData {
  type: "SYNC_TFD_USER";
  userName: string;
}

type NexonJobData = SyncMapleCharacterData | SyncFcMatchesData | SyncTfdUserData;

// ─── Worker Factory ────────────────────────────────────────────

export async function createNexonWorker() {
  const clients = NexonClients.getInstance();

  console.log("[NexonWorker] Starting Worker (30 jobs / 60s rate limit)...");

  const worker = new Worker<NexonJobData>(
    "nexon-sync",
    async (job: Job<NexonJobData>) => {
      const data = job.data;

      // ── MapleStory: 캐릭터 정보 수집 ─────────────────────────
      if (data.type === "SYNC_MAPLE_CHARACTER") {
        console.log(`[Job:${job.id}] SYNC_MAPLE_CHARACTER: ${data.characterName}`);

        const { ocid } = await clients.maplestory.character.getOcid(data.characterName);
        const basic = await clients.maplestory.character.getCharacterBasic(ocid);
        const equipment = await clients.maplestory.character.getCharacterItemEquipment(ocid);

        // TODO: Neo4j 적재 로직 추가
        // await neo4jImporter.upsertMapleCharacter(basic, equipment);

        return `Synced MapleStory character: ${basic.character_name} (Lv.${basic.character_level}, ${basic.character_class})`;
      }

      // ── FC Online: 매치 기록 수집 ────────────────────────────
      else if (data.type === "SYNC_FC_MATCHES") {
        console.log(`[Job:${job.id}] SYNC_FC_MATCHES: ${data.nickname}`);

        const { ouid } = await clients.fconline.getUserOuid(data.nickname);
        const matchIds = await clients.fconline.getMatchList(
          ouid,
          data.matchtype ?? 50,
          0,
          data.limit ?? 20
        );

        // 각 매치 상세를 개별 Job으로 큐잉할 수도 있지만,
        // 현재는 매치 ID 목록만 수집하여 반환
        // TODO: 매치 상세 → Neo4j 적재 체인 구현

        return `Collected ${matchIds.length} FC Online matches for ${data.nickname}`;
      }

      // ── TFD: 유저 데이터 수집 ────────────────────────────────
      else if (data.type === "SYNC_TFD_USER") {
        console.log(`[Job:${job.id}] SYNC_TFD_USER: ${data.userName}`);

        const { ouid } = await clients.tfd.getUserOuid(data.userName);

        let basicInfo = null;
        let descendant = null;
        let weapon = null;

        try {
          basicInfo = await clients.tfd.getUserBasic(ouid);
        } catch {
          console.warn(`[Job:${job.id}] TFD getUserBasic failed (test key limitation?)`);
        }

        try {
          descendant = await clients.tfd.getUserDescendant(ouid);
        } catch {
          console.warn(`[Job:${job.id}] TFD getUserDescendant failed`);
        }

        try {
          weapon = await clients.tfd.getUserWeapon(ouid);
        } catch {
          console.warn(`[Job:${job.id}] TFD getUserWeapon failed`);
        }

        // TODO: Neo4j 적재 로직 추가
        // await neo4jImporter.upsertTfdUser(basicInfo, descendant, weapon);

        const userName = basicInfo?.user_name ?? data.userName;
        return `Synced TFD user: ${userName} (Rank Lv.${basicInfo?.mastery_rank_level ?? "?"})`;
      }
    },
    {
      connection: redisConnection,
      // 넥슨 API Rate Limit 방어: test 키 = 초당 5회 → 안전하게 30 jobs/60s
      limiter: {
        max: 30,
        duration: 60_000,
      },
      concurrency: 1,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[NexonWorker] Job ${job.id} (${job.data.type}) completed: ${job.returnvalue}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[NexonWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

// 직접 실행 시 워커 가동
if (import.meta.url === `file://${process.argv[1]}`) {
  createNexonWorker().catch(console.error);
}
