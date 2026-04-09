/**
 * MCP Tools: The First Descendant (TFD / 퍼스트 디센던트)
 *
 * AI 에이전트가 TFD 유저, 계승자, 무기 데이터를 실시간 조회할 수 있도록
 * MCP Tool 인터페이스를 제공합니다.
 *
 * Tools:
 * - tfd_lookup_user:    유저명(닉네임#태그) → OUID 및 기본 정보 조회
 * - tfd_get_descendant: 유저 장착 계승자 조회
 * - tfd_get_weapon:     유저 장착 무기 조회
 *
 * ⚠️ 주의: test_ prefix 키로는 `/tfd/v1/meta/*` 엔드포인트에 접근 불가 (403)
 */

import { NexonClients } from "../services/nexon/nexon-client.js";
import type { TfdUserBasicResponse } from "../../../data-pipeline/src/providers/nexon/tfd/client.js";

// ─── Tool Input/Output Types ────────────────────────────────────

export interface TfdLookupInput {
  /** 유저명 (닉네임#태그 형식, 예: "Player#1234") */
  userName: string;
}

export interface TfdLookupResult {
  ouid: string;
  userName: string;
  platformType: string;
  masteryRankLevel: number;
  osLanguage: string;
  gameLanguage: string;
}

export interface TfdDescendantInput {
  userName: string;
}

export interface TfdWeaponInput {
  userName: string;
}

// ─── Tool Handlers ──────────────────────────────────────────────

/**
 * TFD 유저 기본 정보 조회
 *
 * 유저명으로 OUID를 취득한 뒤 기본 정보를 반환합니다.
 * 유저명은 반드시 `닉네임#태그` 형식이어야 합니다. (대소문자 구분)
 */
export async function tfdLookupUser(
  input: TfdLookupInput
): Promise<TfdLookupResult> {
  const { tfd } = NexonClients.getInstance();
  const { userName } = input;

  console.error(`[tfd_lookup_user] Looking up "${userName}"...`);

  // Step 1: OUID 취득
  const { ouid } = await tfd.getUserOuid(userName);

  // Step 2: 기본 정보 조회
  let basic: TfdUserBasicResponse;
  try {
    basic = await tfd.getUserBasic(ouid);
  } catch (error) {
    // test_ 키 환경에서 일부 엔드포인트가 실패할 수 있으므로 graceful fallback
    console.error("[tfd_lookup_user] getUserBasic failed, returning minimal data:", error);
    return {
      ouid,
      userName,
      platformType: "unknown",
      masteryRankLevel: 0,
      osLanguage: "unknown",
      gameLanguage: "unknown",
    };
  }

  return {
    ouid,
    userName: basic.user_name,
    platformType: basic.platform_type,
    masteryRankLevel: basic.mastery_rank_level,
    osLanguage: basic.os_language,
    gameLanguage: basic.game_language,
  };
}

/**
 * TFD 유저 장착 계승자 조회
 *
 * 유저명으로 OUID를 취득한 뒤, 현재 장착 중인 계승자(Descendant) 정보를 반환합니다.
 */
export async function tfdGetDescendant(
  input: TfdDescendantInput
): Promise<unknown> {
  const { tfd } = NexonClients.getInstance();
  const { userName } = input;

  console.error(`[tfd_get_descendant] Fetching descendant for "${userName}"...`);

  const { ouid } = await tfd.getUserOuid(userName);
  return tfd.getUserDescendant(ouid);
}

/**
 * TFD 유저 장착 무기 조회
 *
 * 유저명으로 OUID를 취득한 뒤, 현재 장착 중인 무기 정보를 반환합니다.
 */
export async function tfdGetWeapon(
  input: TfdWeaponInput
): Promise<unknown> {
  const { tfd } = NexonClients.getInstance();
  const { userName } = input;

  console.error(`[tfd_get_weapon] Fetching weapon for "${userName}"...`);

  const { ouid } = await tfd.getUserOuid(userName);
  return tfd.getUserWeapon(ouid);
}
