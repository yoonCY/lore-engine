export interface IGameClient {
  /**
   * 퍼블리셔(Riot, Nexon 등) 식별자
   */
  readonly provider: string;

  /**
   * 해당 게임 내 식별자 (lol, maplestory 등)
   */
  readonly game: string;
}

export interface IApiClientConfig {
  apiKey: string;
  region?: string;
}
