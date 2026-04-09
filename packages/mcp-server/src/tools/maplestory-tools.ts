/**
 * MCP Tools: MapleStory (메이플스토리)
 *
 * AI 에이전트가 메이플스토리 캐릭터 정보를 실시간 조회할 수 있도록
 * MCP Tool 인터페이스를 제공합니다.
 *
 * Tools:
 * - maple_lookup_character: 캐릭터 닉네임 → 기본 정보 조회
 * - maple_get_equipment:    캐릭터 장착 장비 상세 조회
 */

import { NexonClients } from "../services/nexon/nexon-client.js";

// ─── Tool Input/Output Types ────────────────────────────────────

export interface MapleLookupInput {
  characterName: string;
}

export interface MapleLookupResult {
  ocid: string;
  characterName: string;
  worldName: string;
  characterClass: string;
  level: number;
  guildName: string | null;
  imageUrl: string;
  expRate: string;
  createdAt: string;
}

export interface MapleEquipmentInput {
  characterName: string;
  date?: string;
}

// ─── Tool Handlers ──────────────────────────────────────────────

/**
 * 메이플스토리 캐릭터 기본 정보 조회
 *
 * 내부적으로 OCID 취득 → 기본 정보 조회의 2-step API 호출을 수행합니다.
 * AI 에이전트에게는 단일 호출로 노출됩니다.
 */
export async function mapleLookupCharacter(
  input: MapleLookupInput
): Promise<MapleLookupResult> {
  const { maplestory } = NexonClients.getInstance();
  const { characterName } = input;

  console.error(`[maple_lookup_character] Looking up "${characterName}"...`);

  // Step 1: 닉네임 → OCID
  const { ocid } = await maplestory.character.getOcid(characterName);

  // Step 2: OCID → 기본 정보
  const basic = await maplestory.character.getCharacterBasic(ocid);

  return {
    ocid,
    characterName: basic.character_name,
    worldName: basic.world_name,
    characterClass: basic.character_class,
    level: basic.character_level,
    guildName: basic.character_guild_name,
    imageUrl: basic.character_image,
    expRate: basic.character_exp_rate,
    createdAt: basic.character_date_create,
  };
}

/**
 * 메이플스토리 캐릭터 장착 장비 조회
 *
 * 닉네임으로 OCID를 먼저 취득한 뒤, 장비 정보를 조회합니다.
 * date 파라미터를 통해 특정 날짜의 장비 스냅샷도 조회 가능합니다.
 */
export async function mapleGetEquipment(
  input: MapleEquipmentInput
): Promise<unknown> {
  const { maplestory } = NexonClients.getInstance();
  const { characterName, date } = input;

  console.error(
    `[maple_get_equipment] Looking up equipment for "${characterName}"${date ? ` at ${date}` : ""}...`
  );

  // Step 1: 닉네임 → OCID
  const { ocid } = await maplestory.character.getOcid(characterName);

  // Step 2: OCID → 장비 정보
  return maplestory.character.getCharacterItemEquipment(ocid, date);
}
