/**
 * Tool: Meta Stats
 *
 * 챔피언의 현재 패치 기준 메타 통계를 반환합니다.
 * 데이터 출처: Riot API (Match-V5, Champion Stats)
 */

export interface MetaStatsInput {
  champion: string;
  position?: "top" | "jungle" | "mid" | "bot" | "support";
  patch?: string;
}

export interface MetaStatsResult {
  champion: string;
  position: string;
  patch: string;
  stats: {
    winRate: number;       // 승률 (%)
    pickRate: number;      // 픽률 (%)
    banRate: number;       // 밴률 (%)
    avgKDA: number;        // 평균 KDA
    avgCS: number;         // 평균 분당 CS
    avgGameLength: number; // 평균 게임 시간 (분)
    sampleSize: number;    // 통계 샘플 수
  };
  tierRating: "S" | "A" | "B" | "C" | "D";
  trend: "rising" | "stable" | "falling";
  source: string;
}

/**
 * 메타 통계 조회 로직
 * TODO v0.2: Riot Match-V5 API + 외부 통계 사이트(OP.GG 등) 데이터 연동
 */
export async function getMetaStats(input: MetaStatsInput): Promise<MetaStatsResult> {
  console.error(`[meta-stats] Champion=${input.champion}, Patch=${input.patch ?? "latest"}`);

  // 플레이스홀더 응답
  return {
    champion: input.champion,
    position: input.position ?? "bot",
    patch: input.patch ?? "14.8",
    stats: {
      winRate: 52.3,
      pickRate: 14.7,
      banRate: 8.2,
      avgKDA: 3.21,
      avgCS: 8.4,
      avgGameLength: 28.3,
      sampleSize: 125000,
    },
    tierRating: "A",
    trend: "rising",
    source: "placeholder — v0.2에서 Riot API 실데이터로 대체됩니다.",
  };
}
