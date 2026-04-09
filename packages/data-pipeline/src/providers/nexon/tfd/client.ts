import { NexonHttpClient } from "../nexon-auth.js";
import type { IGameClient, IApiClientConfig } from "../../../core/interfaces/client.interface.js";

// ─── Response Type Definitions ─────────────────────────────────
/**
 * TFD OUID 응답
 */
export interface TfdOuidResponse {
  ouid: string;
}

/**
 * TFD 유저 기본 정보 응답 (주요 필드)
 */
export interface TfdUserBasicResponse {
  ouid: string;
  user_name: string;
  platform_type: string;
  mastery_rank_level: number;
  mastery_rank_exp: number;
  title_prefix_id: string;
  title_suffix_id: string;
  os_language: string;
  game_language: string;
}

// ─── TFD (The First Descendant) Client ─────────────────────────
/**
 * 퍼스트 디센던트 API 클라이언트
 *
 * 넥슨 OpenAPI 기반 TFD 데이터 수집 어댑터.
 * - 유저 조회: /tfd/v1/id
 * - 유저 기본 정보: /tfd/v1/user/basic
 * - 계승자(장착) 정보: /tfd/v1/user/descendant
 * - 메타데이터: /tfd/v1/meta/* (계승자, 무기, 모듈 등)
 *
 * @see https://open.api.nexon.com — TFD API 문서
 */
export class TfdClient implements IGameClient {
  public readonly provider = "nexon";
  public readonly game = "tfd";

  private readonly client: NexonHttpClient;

  constructor(config: IApiClientConfig) {
    this.client = new NexonHttpClient(config);
  }

  /**
   * 유저명으로 OUID(고유 식별자) 조회
   */
  async getUserOuid(userName: string): Promise<TfdOuidResponse> {
    return this.client.get<TfdOuidResponse>(
      `/tfd/v1/id?user_name=${encodeURIComponent(userName)}`
    );
  }

  /**
   * 유저 기본 정보 조회
   */
  async getUserBasic(ouid: string): Promise<TfdUserBasicResponse> {
    return this.client.get<TfdUserBasicResponse>(
      `/tfd/v1/user/basic?ouid=${ouid}`
    );
  }

  /**
   * 유저의 장착 계승자 정보 조회
   */
  async getUserDescendant(ouid: string): Promise<unknown> {
    return this.client.get<unknown>(
      `/tfd/v1/user/descendant?ouid=${ouid}`
    );
  }

  /**
   * 유저의 장착 무기 정보 조회
   */
  async getUserWeapon(ouid: string): Promise<unknown> {
    return this.client.get<unknown>(
      `/tfd/v1/user/weapon?ouid=${ouid}`
    );
  }

  // ── Static Metadata ────────────────────────────────────────
  /**
   * 계승자(Descendant) 메타데이터 조회
   */
  async getMetaDescendant(): Promise<unknown[]> {
    return this.client.get<unknown[]>("/tfd/v1/meta/descendant");
  }

  /**
   * 무기 메타데이터 조회
   */
  async getMetaWeapon(): Promise<unknown[]> {
    return this.client.get<unknown[]>("/tfd/v1/meta/weapon");
  }

  /**
   * 모듈 메타데이터 조회
   */
  async getMetaModule(): Promise<unknown[]> {
    return this.client.get<unknown[]>("/tfd/v1/meta/module");
  }
}
