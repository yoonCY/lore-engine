import type { IGameClient } from "../../../core/interfaces/client.interface.js";
import { NexonHttpClient } from "../nexon-auth.js";

// ─── Response Type Definitions ─────────────────────────────────
/**
 * /maplestory/v1/id 응답
 */
export interface MapleOcidResponse {
  ocid: string;
}

/**
 * /maplestory/v1/character/basic 응답 (주요 필드)
 */
export interface MapleCharacterBasicResponse {
  date: string | null;
  character_name: string;
  world_name: string;
  character_gender: string;
  character_class: string;
  character_class_level: string;
  character_level: number;
  character_exp: number;
  character_exp_rate: string;
  character_guild_name: string | null;
  character_image: string;
  character_date_create: string;
  access_flag: string;
  liberation_quest_clear_flag: string;
}

// ─── API Class ─────────────────────────────────────────────────
export class MapleCharacterApi implements IGameClient {
  public readonly provider = "nexon";
  public readonly game = "maplestory";

  constructor(private readonly client: NexonHttpClient) {}

  /**
   * 캐릭터 닉네임으로 OCID(범용 식별자)를 조회합니다.
   * 넥슨 API의 거의 모든 조회는 이 OCID를 필수 파라미터로 요구합니다.
   *
   * @param characterName - 메이플스토리 캐릭터 닉네임
   * @returns OCID 문자열을 포함한 응답 객체
   * @see https://open.api.nexon.com/maplestory/v1/id
   */
  async getOcid(characterName: string): Promise<MapleOcidResponse> {
    return this.client.get<MapleOcidResponse>(
      `/maplestory/v1/id?character_name=${encodeURIComponent(characterName)}`
    );
  }

  /**
   * 메이플스토리 캐릭터의 기본 정보를 조회합니다.
   *
   * @param ocid  - 캐릭터 고유 식별자 (getOcid 로 취득)
   * @param date  - 조회 기준일 (YYYY-MM-DD, KST). 미입력 시 최신 데이터 반환
   */
  async getCharacterBasic(
    ocid: string,
    date?: string
  ): Promise<MapleCharacterBasicResponse> {
    const params = new URLSearchParams({ ocid });
    if (date) params.append("date", date);
    return this.client.get<MapleCharacterBasicResponse>(
      `/maplestory/v1/character/basic?${params.toString()}`
    );
  }

  /**
   * 캐릭터의 장착 장비 정보를 조회합니다.
   *
   * @param ocid  - 캐릭터 고유 식별자
   * @param date  - 조회 기준일 (YYYY-MM-DD, KST)
   */
  async getCharacterItemEquipment(
    ocid: string,
    date?: string
  ): Promise<unknown> {
    const params = new URLSearchParams({ ocid });
    if (date) params.append("date", date);
    return this.client.get<unknown>(
      `/maplestory/v1/character/item-equipment?${params.toString()}`
    );
  }
}
