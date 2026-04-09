import { NexonHttpClient } from "../nexon-auth.js";
import type { IGameClient, IApiClientConfig } from "../../../core/interfaces/client.interface.js";

// ─── Response Type Definitions ─────────────────────────────────
/**
 * FC Online 유저 기본 정보 응답
 */
export interface FcOnlineUserResponse {
  ouid: string;
  nickname: string;
  level: number;
}

// ─── FC Online Client ──────────────────────────────────────────
/**
 * FC Online API 클라이언트
 *
 * 넥슨 OpenAPI 기반 FC 온라인(구 피파온라인) 데이터 수집 어댑터.
 * - 유저 조회: /fconline/v1/id
 * - 매치 기록: /fconline/v1/user/match
 * - 메타데이터: /static/fconline/meta/*.json (선수, 시즌, 포지션 등)
 *
 * @see https://open.api.nexon.com — FC Online API 문서
 */
export class FcOnlineClient implements IGameClient {
  public readonly provider = "nexon";
  public readonly game = "fconline";

  private readonly client: NexonHttpClient;

  constructor(config: IApiClientConfig) {
    this.client = new NexonHttpClient(config);
  }

  /**
   * 닉네임으로 유저 고유 식별자(ouid) 조회
   */
  async getUserOuid(nickname: string): Promise<{ ouid: string }> {
    return this.client.get<{ ouid: string }>(
      `/fconline/v1/id?nickname=${encodeURIComponent(nickname)}`
    );
  }

  /**
   * 유저의 매치 기록 목록 조회
   *
   * @param ouid      - 유저 고유 식별자
   * @param matchtype - 매치 종류 (공식/친선 등, 메타데이터 참조)
   * @param offset    - 페이지 오프셋 (기본 0)
   * @param limit     - 조회 개수 (기본 100, 최대 100)
   */
  async getMatchList(
    ouid: string,
    matchtype: number,
    offset = 0,
    limit = 100
  ): Promise<string[]> {
    const params = new URLSearchParams({
      ouid,
      matchtype: String(matchtype),
      offset: String(offset),
      limit: String(limit),
    });
    return this.client.get<string[]>(`/fconline/v1/user/match?${params.toString()}`);
  }

  /**
   * 매치 상세 정보 조회
   */
  async getMatchDetail(matchId: string): Promise<unknown> {
    return this.client.get<unknown>(`/fconline/v1/match-detail?matchid=${matchId}`);
  }

  // ── Static Metadata ────────────────────────────────────────
  /**
   * 선수 메타데이터(spid) 조회
   */
  async getMetaSpid(): Promise<unknown[]> {
    return this.client.get<unknown[]>("/static/fconline/meta/spid.json");
  }

  /**
   * 시즌 메타데이터 조회
   */
  async getMetaSeason(): Promise<unknown[]> {
    return this.client.get<unknown[]>("/static/fconline/meta/seasonid.json");
  }

  /**
   * 매치 종류 메타데이터 조회
   */
  async getMetaMatchType(): Promise<unknown[]> {
    return this.client.get<unknown[]>("/static/fconline/meta/matchtype.json");
  }
}
