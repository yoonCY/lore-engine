import { ServerConfig } from "../../config/server.js";

interface RiotAPIError {
  status: {
    message: string;
    status_code: number;
  };
}

/**
 * Riot API Client
 * - 429 Too Many Requests에 대한 기본적인 Rate-Limiting 및 Retry 기능 제공
 * - 기본적으로 Development Key의 20 requests per 1 second / 100 requests per 2 minutes 한도를 고려
 */
export class RiotClient {
  private apiKey: string;
  private region: string;
  private defaultTimeoutMs = 15000;

  // Rate Limiting 용 상태
  private static reqsInCurrentSecond = 0;
  private static lastReqSecond = Date.now() / 1000 | 0;

  constructor() {
    // 환경변수나 기존 작성된 config.ts에서 읽어오는 로직. TODO: config.ts 확장 필요성 확인
    this.apiKey = process.env.RIOT_API_KEY || "";
    this.region = process.env.RIOT_REGION || "kr";
    
    if (!this.apiKey) {
      console.warn("[RiotClient] RIOT_API_KEY is not set in environment variables!");
    }
  }

  /**
   * 초당 20회 요청 제한을 방지하기 위한 쓰로틀링 (Naive implementation)
   */
  private async throttle(): Promise<void> {
    const currentSecond = Date.now() / 1000 | 0;
    if (RiotClient.lastReqSecond !== currentSecond) {
      RiotClient.lastReqSecond = currentSecond;
      RiotClient.reqsInCurrentSecond = 0;
    }

    if (RiotClient.reqsInCurrentSecond >= 19) {
      const waitMs = 1000 - (Date.now() % 1000) + 100;
      await new Promise(resolve => setTimeout(resolve, waitMs));
      return this.throttle();
    }
    
    RiotClient.reqsInCurrentSecond++;
  }

  /**
   * Riot API 범용 HTTP GET 래퍼
   */
  public async get<T>(
    endpoint: string, 
    params?: Record<string, string>, 
    baseDomain: string = `https://${this.region}.api.riotgames.com`
  ): Promise<T> {
    const url = new URL(`${baseDomain}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    let retries = 3;
    let delayMs = 1000;

    while (retries > 0) {
      await this.throttle();
      const startTime = Date.now();

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            "X-Riot-Token": this.apiKey,
            "Accept": "application/json" // Node 20 fetch
          },
          // Node 20에서는 AbortController를 통해 timeout 구현.
          signal: AbortSignal.timeout(this.defaultTimeoutMs)
        });

        if (response.ok) {
          return await response.json() as T;
        }

        // 429 Rate Limit 핸들링
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayMs;
          console.warn(`[RiotClient] 429 Rate Limit Reached. Waiting ${waitTime}ms...`);
          await new Promise(res => setTimeout(res, waitTime));
          
          delayMs *= 2; // 지수 백오프
          // 실패 시 재시도 횟수는 차감하지 않거나 늦은 횟수 처리 (429는 특별 취급)
          continue; 
        }

        const errorData = await response.json() as RiotAPIError;
        throw new Error(`Riot API Error ${response.status}: ${errorData?.status?.message || 'Unknown'}`);

      } catch (error: any) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          console.warn(`[RiotClient] Request Timeout (${Date.now() - startTime}ms) for ${url.pathname}. Retries left: ${retries - 1}`);
        } else {
          console.error(`[RiotClient] Fetch Error:`, error.message);
        }

        retries--;
        if (retries === 0) throw error;
        await new Promise(res => setTimeout(res, delayMs));
        delayMs *= 2;
      }
    }
    
    throw new Error(`Max retries reached for API call: ${endpoint}`);
  }

  // ============== Domain Specific Methods ============== //

  /**
   * Summoner 정보 가져오기 (소환사명 + 태그) - /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
   * 예) gameName: 'Hide on bush', tagLine: 'KR1'
   */
  public async getAccountByRiotId(gameName: string, tagLine: string) {
    // Account API는 보통 아시아 지역 통합(asia) Endpoint 사용
    return this.get<any>(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`, undefined, 'https://asia.api.riotgames.com');
  }

  /**
   * 계정 PUUID로 소환사 정보(SummonerId 등) 가져오기 - /lol/summoner/v4/summoners/by-puuid/{puuid}
   */
  public async getSummonerByPuuid(puuid: string) {
    return this.get<any>(`/lol/summoner/v4/summoners/by-puuid/${puuid}`);
  }

  /**
   * 특정 리그(e.g., Challenger, Grandmaster) 유저 목록 가져오기 - /lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5
   */
  public async getChallengerLeague() {
    return this.get<any>(`/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`);
  }

  /**
   * 소환사의 최근 매치 리스트 가져오기 (PUUID 기준) - /lol/match/v5/matches/by-puuid/{puuid}/ids
   */
  public async getMatchIdsByPuuid(puuid: string, count = 20) {
    // Match V5 플랫폼 역시 asia 통합
    return this.get<string[]>(`/lol/match/v5/matches/by-puuid/${puuid}/ids`, { count: count.toString() }, 'https://asia.api.riotgames.com');
  }

  /**
   * 매치 상세 데이터 가져오기 - /lol/match/v5/matches/{matchId}
   */
  public async getMatchDetails(matchId: string) {
    return this.get<any>(`/lol/match/v5/matches/${matchId}`, undefined, 'https://asia.api.riotgames.com');
  }
}
