/**
 * Nexon Game Clients — MCP 서버 전용 서비스 래퍼
 *
 * data-pipeline 패키지의 API 클라이언트를 import 하여
 * MCP Tool 에서 편리하게 사용할 수 있도록 싱글톤으로 제공합니다.
 *
 * 각 게임별 클라이언트는 ServerConfig 에서 API 키를 로드해 초기화합니다.
 */

import { MaplestoryClient } from "../../../../data-pipeline/src/providers/nexon/maplestory/index.js";
import { FcOnlineClient } from "../../../../data-pipeline/src/providers/nexon/fconline/client.js";
import { TfdClient } from "../../../../data-pipeline/src/providers/nexon/tfd/client.js";
import { ServerConfig } from "../../config/server.js";

/**
 * 넥슨 3개 게임 클라이언트를 통합 관리하는 싱글톤
 *
 * Database.ts 의 싱글톤 패턴을 따릅니다.
 * - 초기화 시점: 첫 호출 시 lazy init
 * - 각 게임 클라이언트는 독립된 API 키와 Rate Limiter 를 가짐
 */
export class NexonClients {
  private static instance: NexonClients | null = null;

  public readonly maplestory: MaplestoryClient;
  public readonly fconline: FcOnlineClient;
  public readonly tfd: TfdClient;

  private constructor(config: ServerConfig) {
    this.maplestory = new MaplestoryClient({
      apiKey: config.nexonMaplestoryApiKey,
    });
    this.fconline = new FcOnlineClient({
      apiKey: config.nexonFcOnlineApiKey,
    });
    this.tfd = new TfdClient({
      apiKey: config.nexonTfdApiKey,
    });

    console.error("[NexonClients] All 3 game clients initialized.");
  }

  /**
   * 싱글톤 인스턴스 반환
   * ServerConfig.fromEnv() 를 통해 환경 변수에서 API 키를 로드합니다.
   */
  public static getInstance(): NexonClients {
    if (!this.instance) {
      const config = ServerConfig.fromEnv();
      this.instance = new NexonClients(config);
    }
    return this.instance;
  }

  /**
   * 테스트 등에서 싱글톤을 초기화할 때 사용
   */
  public static reset(): void {
    this.instance = null;
  }
}
