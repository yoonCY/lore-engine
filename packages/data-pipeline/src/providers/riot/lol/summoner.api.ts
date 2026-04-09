import type { IGameClient } from "../../../core/interfaces/client.interface";
import { RiotHttpClient } from "../riot-auth";

export class SummonerApi implements IGameClient {
  public readonly provider = "riot";
  public readonly game = "lol";

  constructor(private readonly client: RiotHttpClient) {}

  /**
   * 특정 소환사의 챔피언 숙련도 최상위 목록을 가져옵니다.
   */
  async getTopChampionMasteries(summonerId: string): Promise<unknown[]> {
    return this.client.get<unknown[]>(
      `/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}/top`
    );
  }
}
