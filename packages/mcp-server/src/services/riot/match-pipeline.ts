import { RiotClient } from "./riot-client.js";
import { Database } from "../../config/database.js";

/**
 * Match Pipeline
 * 동적 매치 데이터(매치 ID, 매치 세부 정보, 플레이어 승패 등)를 수집하여 
 * Neo4j의 시너지, 카운터, 승률 등의 통계 데이터를 생성/갱신합니다.
 */
export class MatchPipeline {
  private riotClient: RiotClient;

  constructor() {
    this.riotClient = new RiotClient();
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
        // 주의: League API에서는 summonerId를 반환. Match API는 puuid를 요구함.
        try {
          const summonerId = entry.summonerId;
          const summonerData = await this.riotClient.get<any>(`/lol/summoner/v4/summoners/${summonerId}`);
          
          if (!summonerData.puuid) continue;

          // 발급된 puuid로 매치 목록 검색
          const matchIds = await this.riotClient.getMatchIdsByPuuid(summonerData.puuid, matchesPerUser);
          matchIds.forEach(id => matchIdSet.add(id));

        } catch (err) {
          console.warn(`[MatchPipeline] Failed to process user ${entry.summonerId}`, err);
        }
      }

      console.log(`[MatchPipeline] Collected ${matchIdSet.size} unique match IDs to process.`);

      // 2. 개별 매치 데이터 상세 조회 및 통계(ETL) 처리
      for (const matchId of matchIdSet) {
        try {
          const matchDetail = await this.riotClient.getMatchDetails(matchId);
          await this.processMatchDetail(matchDetail);
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
  private async processMatchDetail(matchData: any) {
    const info = matchData.info;
    if (!info || info.queueId !== 420) return; // 솔랭 검증

    const participants = info.participants || [];
    const driver = await Database.getDriver();
    const session = driver.session();

    try {
      // 아주 기초적인 예제: 같은 팀 챔피언 간의 SYNERGY 카운트 증가 로직
      // 승리한 팀(win=true)의 조합만 SYNERGY 통계에 가산
      const winners = participants.filter((p: any) => p.win === true);
      const losers = participants.filter((p: any) => p.win === false);

      // (승리조합) A 챔피언 -> SYNERGY -> B 챔피언
      for (let i = 0; i < winners.length; i++) {
        for (let j = i + 1; j < winners.length; j++) {
          const champA = winners[i].championName;
          const champB = winners[j].championName;

          await session.run(`
            MATCH (a:Champion {name: $champA})
            MATCH (b:Champion {name: $champB})
            MERGE (a)-[s:SYNERGY]-(b)
            ON CREATE SET s.games = 1, s.wins = 1
            ON MATCH SET s.games = s.games + 1, s.wins = s.wins + 1
          `, { champA, champB });
        }
      }

      // (상성) A챔피언(승) -> COUNTERS -> B챔피언(패)
      for (let w = 0; w < winners.length; w++) {
        for (let l = 0; l < losers.length; l++) {
          const champW = winners[w].championName;
          const champL = losers[l].championName;
          
          await session.run(`
            MATCH (w:Champion {name: $champW})
            MATCH (l:Champion {name: $champL})
            MERGE (w)-[c:COUNTERS]->(l)
            ON CREATE SET c.games = 1, c.wins = 1
            ON MATCH SET c.games = c.games + 1, c.wins = c.wins + 1
          `, { champW, champL });
        }
      }

    } catch (error) {
      console.error(`[MatchPipeline] Neo4j Sync Error for match ${matchData.metadata.matchId}`, error);
    } finally {
      await session.close();
    }
  }
}
