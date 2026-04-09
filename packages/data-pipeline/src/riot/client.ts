/**
 * Riot API Data Fetcher
 *
 * League of Legends 챔피언 통계를 Riot API에서 가져옵니다.
 * 지원 엔드포인트:
 *  - Champion Mastery (챔피언 숙련도)
 *  - Match-V5 (매치 히스토리)
 *  - League-V4 (리그/랭크 정보)
 *
 * @see https://developer.riotgames.com/apis
 */

import axios, { type AxiosInstance } from "axios";

interface RiotClientConfig {
  apiKey: string;
  region: "kr" | "na1" | "euw1" | "jp1";
}

interface ChampionStats {
  championId: number;
  championName: string;
  winRate: number;
  pickRate: number;
  banRate: number;
  sampleSize: number;
}

// 리전별 라우팅 호스트 매핑
const REGIONAL_HOSTS: Record<string, string> = {
  kr: "https://kr.api.riotgames.com",
  na1: "https://na1.api.riotgames.com",
  euw1: "https://euw1.api.riotgames.com",
  jp1: "https://jp1.api.riotgames.com",
};

export class RiotApiClient {
  private readonly http: AxiosInstance;
  private readonly region: string;

  constructor(config: RiotClientConfig) {
    this.region = config.region;
    this.http = axios.create({
      baseURL: REGIONAL_HOSTS[config.region],
      headers: {
        "X-Riot-Token": config.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 10_000,
    });

    // Rate limit 대응: 429 응답 시 재시도 로직
    this.http.interceptors.response.use(
      (res) => res,
      async (error) => {
        if (error.response?.status === 429) {
          const retryAfter = Number(error.response.headers["retry-after"] ?? 1) * 1000;
          console.warn(`[RiotApiClient] Rate limited. Retrying after ${retryAfter}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryAfter));
          return this.http.request(error.config);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 특정 소환사의 챔피언 숙련도 목록을 가져옵니다.
   */
  async getChampionMastery(summonerId: string): Promise<unknown[]> {
    const { data } = await this.http.get(
      `/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}/top`
    );
    return data as unknown[];
  }

  /**
   * 현재 패치 챔피언 통계를 외부 통계 소스에서 가져옵니다.
   * TODO: champion.gg 또는 u.gg API 연동으로 대체
   */
  async getChampionStats(_patch?: string): Promise<ChampionStats[]> {
    // 현재는 Data Dragon(CDN) 기반 데이터 반환 예정
    // v0.2에서 실제 통계 API로 교체
    console.warn("[RiotApiClient] getChampionStats: 실제 통계 API 연동 예정 (v0.2)");
    return [];
  }

  /**
   * 데이터 드래곤에서 챔피언 기본 메타데이터를 가져옵니다.
   */
  async getChampionList(patch: string = "14.8.1"): Promise<Record<string, unknown>> {
    const { data } = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${patch}/data/ko_KR/champion.json`
    );
    return (data as { data: Record<string, unknown> }).data;
  }
}

// ─── CLI 직접 실행 엔트리포인트 ────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new RiotApiClient({
    apiKey: process.env["RIOT_API_KEY"] ?? "",
    region: (process.env["RIOT_REGION"] ?? "kr") as "kr",
  });

  (async () => {
    console.log("챔피언 목록 가져오는 중...");
    const champions = await client.getChampionList();
    console.log(`총 챔피언 수: ${Object.keys(champions).length}`);
  })().catch(console.error);
}
