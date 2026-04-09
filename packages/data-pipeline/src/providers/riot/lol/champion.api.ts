import type { IGameClient } from "../../../core/interfaces/client.interface";
import { RiotHttpClient } from "../riot-auth";
import axios from "axios";

export class ChampionApi implements IGameClient {
  public readonly provider = "riot";
  public readonly game = "lol";

  constructor(private readonly client: RiotHttpClient) {}

  /**
   * 데이터 드래곤에서 챔피언 기본 메타데이터(JSON)를 가져옵니다.
   */
  async getChampionList(patch: string = "14.8.1"): Promise<Record<string, unknown>> {
    // Data Dragon은 인증이 필요 없으므로 axios 직접 사용
    const { data } = await axios.get(
      `https://ddragon.leagueoflegends.com/cdn/${patch}/data/ko_KR/champion.json`
    );
    return (data as { data: Record<string, unknown> }).data;
  }

  /**
   * 현재 패치 챔피언 통계를 외부 통계 소스에서 가져옵니다.
   */
  async getChampionStats(_patch?: string): Promise<unknown[]> {
    console.warn("[ChampionApi] 실제 통계 API 연동 예정 (v0.2)");
    return [];
  }
}
