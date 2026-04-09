import { RiotHttpClient } from "../riot-auth";
import { SummonerApi } from "./summoner.api";
import { ChampionApi } from "./champion.api";
import type { IApiClientConfig } from "../../../core/interfaces/client.interface";

/**
 * League of Legends (LoL) 통합 클라이언트 제공자
 */
export class LolClient {
  public readonly summoner: SummonerApi;
  public readonly champion: ChampionApi;

  constructor(config: IApiClientConfig) {
    const httpClient = new RiotHttpClient(config);
    
    // LoL 하위 도메인 API 모듈에 HTTP 클라이언트 주입
    this.summoner = new SummonerApi(httpClient);
    this.champion = new ChampionApi(httpClient);
  }
}
