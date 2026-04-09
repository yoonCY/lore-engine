/**
 * MCP Tools: FC Online (FC 온라인)
 *
 * AI 에이전트가 FC 온라인 유저 및 매치 데이터를 실시간 조회할 수 있도록
 * MCP Tool 인터페이스를 제공합니다.
 *
 * Tools:
 * - fconline_lookup_user:     닉네임 → OUID 및 기본 정보 조회
 * - fconline_get_matches:     유저 매치 기록 목록 조회
 * - fconline_get_match_detail: 매치 상세 정보 조회
 */

import { NexonClients } from "../services/nexon/nexon-client.js";

// ─── Tool Input/Output Types ────────────────────────────────────

export interface FcLookupInput {
  nickname: string;
}

export interface FcLookupResult {
  ouid: string;
  nickname: string;
}

export interface FcMatchListInput {
  nickname: string;
  /** 매치 종류 ID (메타데이터 참조, 기본 50 = 공식경기) */
  matchtype?: number;
  /** 조회 개수 (기본 10, 최대 100) */
  limit?: number;
}

export interface FcMatchListResult {
  ouid: string;
  nickname: string;
  matchtype: number;
  matchIds: string[];
  totalReturned: number;
}

export interface FcMatchDetailInput {
  matchId: string;
}

// ─── Tool Handlers ──────────────────────────────────────────────

/**
 * FC Online 유저 조회
 *
 * 닉네임으로 OUID(고유 식별자)를 취득합니다.
 */
export async function fcLookupUser(
  input: FcLookupInput
): Promise<FcLookupResult> {
  const { fconline } = NexonClients.getInstance();
  const { nickname } = input;

  console.error(`[fconline_lookup_user] Looking up "${nickname}"...`);

  const { ouid } = await fconline.getUserOuid(nickname);

  return {
    ouid,
    nickname,
  };
}

/**
 * FC Online 매치 기록 조회
 *
 * 닉네임으로 OUID를 먼저 취득한 뒤, 매치 ID 목록을 반환합니다.
 */
export async function fcGetMatches(
  input: FcMatchListInput
): Promise<FcMatchListResult> {
  const { fconline } = NexonClients.getInstance();
  const { nickname, matchtype = 50, limit = 10 } = input;

  console.error(
    `[fconline_get_matches] Fetching matches for "${nickname}" (type=${matchtype}, limit=${limit})...`
  );

  // Step 1: OUID 취득
  const { ouid } = await fconline.getUserOuid(nickname);

  // Step 2: 매치 목록 조회
  const matchIds = await fconline.getMatchList(ouid, matchtype, 0, limit);

  return {
    ouid,
    nickname,
    matchtype,
    matchIds,
    totalReturned: matchIds.length,
  };
}

/**
 * FC Online 매치 상세 조회
 *
 * 매치 ID를 직접 입력받아 상세 정보를 반환합니다.
 */
export async function fcGetMatchDetail(
  input: FcMatchDetailInput
): Promise<unknown> {
  const { fconline } = NexonClients.getInstance();
  const { matchId } = input;

  console.error(`[fconline_get_match_detail] Fetching match ${matchId}...`);

  return fconline.getMatchDetail(matchId);
}
