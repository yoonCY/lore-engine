/**
 * Tool: Champion Recommendation
 *
 * 팀 구성, 상대 챔피언, 포지션을 기반으로 챔피언을 추천합니다.
 * v0.3: Neo4j Graph API 통계 연동 완료
 */
import { Database } from "../config/database.js";

export interface ChampionRecommendInput {
  position: "top" | "jungle" | "mid" | "bot" | "support";
  allies: string[];
  enemies: string[];
  rankTier?: string;
}

export interface ChampionRecommendResult {
  recommendations: ChampionSuggestion[];
  reasoning: string;
  metaNote?: string;
}

export interface ChampionSuggestion {
  champion: string;
  winRate: number;
  pickRate: number;
  synergyScore: number; // 아군 시너지 점수 (0~100)
  counterScore: number; // 적군 카운터 점수 (0~100)
  reason: string;
}

/**
 * 챔피언 추천 핵심 로직
 * TODO v0.1: Mock → v0.2: Riot API 통계 연동 → v0.3: RAG 보강
 */
export async function getChampionRecommendation(
  input: ChampionRecommendInput
): Promise<ChampionRecommendResult> {
  const driver = await Database.getDriver();
  const session = driver.session();

  try {
    const pickedSet = new Set([...input.allies, ...input.enemies]);
    const picked = Array.from(pickedSet);

    // Cypher 쿼리: 지정된 allies/enemies 와의 승률/게임수 데이터를 합산해 점수를 냄
    const result = await session.run(`
      MATCH (c:Champion)
      WHERE NOT c.name IN $picked

      OPTIONAL MATCH (c)-[s:SYNERGY]-(a:Champion)
      WHERE a.name IN $allies
      WITH c, sum(s.wins) as sWins, sum(s.games) as sGames

      OPTIONAL MATCH (c)-[ct:COUNTERS]->(e:Champion)
      WHERE e.name IN $enemies
      WITH c, sWins, sGames, sum(ct.wins) as cWins, sum(ct.games) as cGames

      WITH c, sGames, cGames,
           CASE WHEN sGames > 0 THEN (toFloat(sWins) / sGames) * 100 ELSE 0.0 END AS synergyScore,
           CASE WHEN cGames > 0 THEN (toFloat(cWins) / cGames) * 100 ELSE 0.0 END AS counterScore

      RETURN c.name AS champion, synergyScore, counterScore, sGames, cGames
      ORDER BY (synergyScore + counterScore) DESC
      LIMIT 3
    `, {
      picked,
      allies: input.allies,
      enemies: input.enemies
    });

    const recommendations: ChampionSuggestion[] = result.records.map(r => ({
      champion: r.get("champion"),
      winRate: 50.0, // Mock, 추후 전역 챔피언 승률 통계 활용
      pickRate: 10.0, // Mock, 추후 전역 챔피언 픽률 통계 활용
      synergyScore: Math.round(Number(r.get("synergyScore")) * 10) / 10,
      counterScore: Math.round(Number(r.get("counterScore")) * 10) / 10,
      reason: `팀 시너지 점수 ${Math.round(Number(r.get("synergyScore")))}점, 카운터 점수 ${Math.round(Number(r.get("counterScore")))}점 기반 추천입니다. (분석 풀: SYNERGY ${Number(r.get("sGames"))}, COUNTER ${Number(r.get("cGames"))})`
    }));

    return {
      recommendations: recommendations.length > 0 ? recommendations : [
        {
          champion: "Garen", // fallback
          winRate: 50.0,
          pickRate: 5.0,
          synergyScore: 0,
          counterScore: 0,
          reason: "데이터 수집량 부족으로 인한 기본 추천입니다."
        }
      ],
      reasoning: "그래프 DB에서 과거 매치 전적 데이터를 조회하여, 해당 아군/적군 조합에 따른 시너지 및 카운터 승률을 기반으로 챔피언을 검색했습니다.",
      metaNote: "v0.3: RAG(Graph DB) 연동 로직 활성화 완료."
    };
  } catch (error) {
    console.error("[champion-recommend] Failed to query Neo4j:", error);
    throw error;
  } finally {
    await session.close();
  }
}
