import { RiotClient } from "./riot-client.js";
import { Database } from "../../config/database.js";
import { StaticDataSyncService } from "./static-data-sync.js";

/**
 * Match Pipeline
 * 동적 매치 데이터(매치 ID, 매치 세부 정보, 플레이어 승패 등)를 수집하여 
 * Neo4j의 시너지, 카운터, 승률 등의 통계 데이터를 생성/갱신합니다.
 */
export class MatchPipeline {
  private riotClient: RiotClient;
  private itemCache: Record<string, { gold: number, tags: string[], depth: number }> | null = null;

  constructor() {
    this.riotClient = new RiotClient();
  }

  /**
   * Data Dragon 아이템 메타데이터 로드 (Core 아이템, Boots 판별용)
   */
  private async loadItemCache() {
    if (this.itemCache) return;
    try {
      const syncService = new StaticDataSyncService();
      const items = await syncService.fetchItemsData();
      this.itemCache = {};
      for (const [id, details] of Object.entries<any>(items)) {
        this.itemCache[id] = {
          gold: details.gold ? details.gold.total : 0,
          tags: details.tags || [],
          depth: details.depth || 1
        };
      }
      console.log(`[MatchPipeline] Loaded ${Object.keys(this.itemCache).length} items into local cache.`);
    } catch (e) {
      console.warn(`[MatchPipeline] Failed to load item cache`, e);
      this.itemCache = {}; // 빈 객체로 fallback
    }
  }

  /**
   * 상위 티어(예: 챌린저)의 유저들의 매치를 수집하고 파싱하는 엔트리포인트
   */
  public async runChallengerSync(maxUsers = 10, matchesPerUser = 5) {
    console.log(`[MatchPipeline] Starting Challenger Data Sync... (maxUsers: ${maxUsers}, matchesPerUser: ${matchesPerUser})`);

    try {
      // 1. 챌린저 리그 유저 가져오기
      const leagueInfo = await this.riotClient.getChallengerLeague();
      const entries = leagueInfo.entries || [];
      const selectedEntries = entries.slice(0, maxUsers);

      console.log(`[MatchPipeline] Retrieved ${selectedEntries.length} challenger entries.`);

      // 고유 매치 ID 수집용 Set
      const matchIdSet = new Set<string>();

      for (const entry of selectedEntries) {
        // 최근 Riot API V4/V5 업데이트로 인해 리그 조회 시 summonerId 대신 puuid를 직접 반환하도록 변경되었습니다.
        try {
          const puuid = entry.puuid;
          if (!puuid) {
            console.warn(`[MatchPipeline] Skipping entry with no puuid:`, entry);
            continue;
          }

          // 발급된 puuid로 매치 목록 검색
          const matchIds = await this.riotClient.getMatchIdsByPuuid(puuid, matchesPerUser);
          matchIds.forEach(id => matchIdSet.add(id));

        } catch (err) {
          console.warn(`[MatchPipeline] Failed to process puuid ${entry.puuid}`, err);
        }
      }

      console.log(`[MatchPipeline] Collected ${matchIdSet.size} unique match IDs to process.`);

      // 2. 개별 매치 데이터 상세 조회 및 통계(ETL) 처리
      for (const matchId of matchIdSet) {
        try {
          const matchDetail = await this.riotClient.getMatchDetails(matchId);
          let matchTimeline = null;
          try {
            matchTimeline = await this.riotClient.getMatchTimeline(matchId);
          } catch (tErr) {
            console.warn(`[MatchPipeline] Timeline fetch failed for ${matchId}`);
          }
          await this.processMatchDetail(matchDetail, matchTimeline);
        } catch (err) {
          console.warn(`[MatchPipeline] Failed to process match ${matchId}`, err);
        }
      }

      console.log(`[MatchPipeline] Sync Completed Successfully.`);
      
    } catch (error) {
      console.error(`[MatchPipeline] Challenger Sync Error`, error);
      throw error;
    }
  }

  /**
   * 단일 매치 데이터(JSON)를 파싱하여 승률 및 빌드 통계를 계산하고 Neo4j에 기록
   */
  private async processMatchDetail(matchData: any, timelineData: any) {
    const info = matchData.info;
    if (!info || info.queueId !== 420) return; // 솔랭 검증

    await this.loadItemCache();

    const participants = info.participants || [];
    const durationMin = (info.gameDuration || 1) / 60;
    const driver = await Database.getDriver();
    const session = driver.session();

    try {
      const winners = participants.filter((p: any) => p.win === true);
      const losers = participants.filter((p: any) => p.win === false);

      // (승리조합) 동일 팀 내 챔피언 SYNERGY (championId 기준)
      for (let i = 0; i < winners.length; i++) {
        for (let j = i + 1; j < winners.length; j++) {
          const champA = winners[i].championId.toString();
          const champB = winners[j].championId.toString();

          await session.run(`
            MATCH (a:Champion {id: $champA})
            MATCH (b:Champion {id: $champB})
            MERGE (a)-[s:SYNERGY]-(b)
            ON CREATE SET s.games = 1, s.wins = 1
            ON MATCH SET s.games = s.games + 1, s.wins = s.wins + 1
          `, { champA, champB });
        }
      }

      // (상성) 승리 챔피언 -> 패배 챔피언 COUNTERS
      for (let w = 0; w < winners.length; w++) {
        for (let l = 0; l < losers.length; l++) {
          const champW = winners[w].championId.toString();
          const champL = losers[l].championId.toString();
          
          await session.run(`
            MATCH (w:Champion {id: $champW})
            MATCH (l:Champion {id: $champL})
            MERGE (w)-[c:COUNTERS]->(l)
            ON CREATE SET c.games = 1, c.wins = 1
            ON MATCH SET c.games = c.games + 1, c.wins = c.wins + 1
          `, { champW, champL });
        }
      }

      // 개별 챔피언 상세 퍼포먼스 (상점/룬/스킬/CS)
      for (const p of participants) {
        const champId = p.championId.toString();
        const winVal = p.win ? 1 : 0;
        
        // 1. 단순 평균치 산출용 누적
        const totalCS = (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
        const csm = totalCS / durationMin;
        const gpm = (p.goldEarned || 0) / durationMin;

        await session.run(`
          MATCH (c:Champion {id: $champId})
          SET c.totalGames = coalesce(c.totalGames, 0) + 1,
              c.totalWin = coalesce(c.totalWin, 0) + $winVal,
              c.totalCSM = coalesce(c.totalCSM, 0.0) + $csm,
              c.totalGPM = coalesce(c.totalGPM, 0.0) + $gpm
        `, { champId, winVal, csm, gpm });

        // 2. 아이템 빌드 (BUILDS_ITEM)
        const items = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].filter(i => i > 0);
        for (const itemId of items) {
          await session.run(`
            MATCH (c:Champion {id: $champId})
            MATCH (i:Item {id: $itemId})
            MERGE (c)-[b:BUILDS_ITEM]->(i)
            ON CREATE SET b.games = 1, b.wins = $winVal
            ON MATCH SET b.games = b.games + 1, b.wins = b.wins + $winVal
          `, { champId, itemId: itemId.toString(), winVal });
        }

        // 3. 룬 (USES_RUNE)
        for (const style of p.perks?.styles || []) {
          for (const sel of style.selections || []) {
            const perkId = sel.perk.toString();
            await session.run(`
              MATCH (c:Champion {id: $champId})
              MERGE (r:Rune {id: $perkId})
              MERGE (c)-[u:USES_RUNE]->(r)
              ON CREATE SET u.games = 1, u.wins = $winVal
              ON MATCH SET u.games = u.games + 1, u.wins = u.wins + $winVal
            `, { champId, perkId, winVal });
          }
        }

        // 4. 스킬 트리 추출 및 조합/장화/코어 아이템 타임라인 추출
        if (timelineData && timelineData.info && timelineData.info.frames) {
          const levels: number[] = [];
          const purchasedItems: string[] = []; // 시간 순으로 구매한 모든 아이템 ID
          let purchasedBoots = null;

          for (const f of timelineData.info.frames) {
            for (const ev of (f.events || [])) {
              if (ev.participantId !== p.participantId) continue;

              // 스킬 레벨업
              if (ev.type === "SKILL_LEVEL_UP") {
                levels.push(ev.skillSlot);
              }
              // 아이템 구매
              else if (ev.type === "ITEM_PURCHASED") {
                const itemIdStr = ev.itemId.toString();
                // 1) 신발 트래킹 (Boot 속성이거나 장화들) 검색
                const itemMeta = this.itemCache?.[itemIdStr];
                if (itemMeta) {
                  if (itemMeta.tags.includes("Boots") && itemMeta.gold >= 300) {
                    if (!purchasedBoots || itemMeta.gold > (this.itemCache?.[purchasedBoots]?.gold || 0)) {
                      purchasedBoots = itemIdStr; // 상위 신발로 교체
                    }
                  }
                  // 2) 코어템(전설급 완성템) 트래킹 (가격 2200 이상 또는 depth가 깊은 완성템)
                  if (!itemMeta.tags.includes("Boots") && itemMeta.gold >= 2200) {
                    // 동일 아이템 중복 방지 (가끔 타임라인상 undo 이슈 등)
                    if (!purchasedItems.includes(itemIdStr)) {
                      purchasedItems.push(itemIdStr);
                    }
                  }
                }
              }
              // 단, ITEM_UNDO가 있을 시 purchasedItems 배열에서 빼는 로직 등 더 엄밀한 관리도 가능 (현재는 심플 버전)
            }
          }
          
          // 4-1. 스킬 경로 노드 업데이트 (USES_SKILL_PATH)
          if (levels.length > 0) {
            const skillMap = ["", "Q", "W", "E", "R"];
            const skillOrder = levels.slice(0, 15).map(s => skillMap[s] || "?").join("");
            await session.run(`
              MATCH (c:Champion {id: $champId})
              MERGE (sp:SkillPath {path: $skillOrder})
              MERGE (c)-[u:USES_SKILL_PATH]->(sp)
              ON CREATE SET u.games = 1, u.wins = $winVal
              ON MATCH SET u.games = u.games + 1, u.wins = u.wins + $winVal
            `, { champId, skillOrder, winVal });
          }

          // 4-2. 장화 노드 업데이트 (BUILDS_BOOTS)
          if (purchasedBoots) {
            await session.run(`
              MATCH (c:Champion {id: $champId})
              MERGE (i:Item {id: $purchasedBoots})
              MERGE (c)-[b:BUILDS_BOOTS]->(i)
              ON CREATE SET b.games = 1, b.wins = $winVal
              ON MATCH SET b.games = b.games + 1, b.wins = b.wins + $winVal
            `, { champId, purchasedBoots, winVal });
          }

          // 4-3. 코어 아이템 시퀀스 업데이트 (CORE_BUILD_PATH)
          // 최대 3코어까지만 의미를 둠 (가장 대중적인 지표)
          if (purchasedItems.length > 0) {
            const buildOrder = purchasedItems.slice(0, 3).join("-");
            await session.run(`
              MATCH (c:Champion {id: $champId})
              MERGE (cp:CorePath {path: $buildOrder})
              MERGE (c)-[u:BUILDS_CORE_PATH]->(cp)
              ON CREATE SET u.games = 1, u.wins = $winVal
              ON MATCH SET u.games = u.games + 1, u.wins = u.wins + $winVal
            `, { champId, buildOrder, winVal });
          }
        }
      }

    } catch (error) {
      console.error(`[MatchPipeline] Neo4j Sync Error for match ${matchData.metadata.matchId}`, error);
    } finally {
      await session.close();
    }
  }
}
