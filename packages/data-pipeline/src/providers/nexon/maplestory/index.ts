import { NexonHttpClient } from "../nexon-auth.js";
import { MapleCharacterApi } from "./character.api.js";
import type { IApiClientConfig } from "../../../core/interfaces/client.interface.js";

/**
 * Maplestory 통합 클라이언트 제공자
 */
export class MaplestoryClient {
  public readonly character: MapleCharacterApi;

  constructor(config: IApiClientConfig) {
    const httpClient = new NexonHttpClient(config);
    
    // 메이플스토리 하위 도메인 API 모듈 세팅
    this.character = new MapleCharacterApi(httpClient);
  }
}
