/**
 * Tool: Champion Recommendation
 *
 * 팀 구성, 상대 챔피언, 포지션을 기반으로 챔피언을 추천합니다.
 * v0.1: Riot API 통계 기반 (Mock 데이터 → 실제 API 연동 예정)
 */

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
  // TODO: 실제 Riot API 데이터 + Neo4j 그래프 + RAG 결합
  // 현재는 구조 확립용 플레이스홀더
  console.error(`[champion-recommend] Querying for position=${input.position}, enemies=${input.enemies.join(",")}`);

  return {
    recommendations: [
      {
        champion: "Jinx",
        winRate: 52.3,
        pickRate: 14.7,
        synergyScore: 85,
        counterScore: 70,
        reason: "현재 메타에서 후반 지속 딜링이 유리하며, 팀 구성과 시너지가 높습니다.",
      },
    ],
    reasoning: "데이터 수집 파이프라인 연동 전 초기 플레이스홀더 응답입니다.",
    metaNote: "v0.2에서 Riot API 통계 데이터로 대체됩니다.",
  };
}
