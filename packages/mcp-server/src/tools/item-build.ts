/**
 * Tool: Item Build Recommendation
 *
 * 챔피언, 포지션, 게임 단계에 따라 최적 아이템 빌드를 제안합니다.
 * v0.1: Riot API 아이템 통계 기반 (연동 예정)
 */

export interface ItemBuildInput {
  champion: string;
  position: "top" | "jungle" | "mid" | "bot" | "support";
  enemies?: string[];
  gamePhase?: "early" | "mid" | "late";
}

export interface ItemBuildResult {
  coreItems: ItemEntry[];
  situationalItems: ItemEntry[];
  bootOptions: ItemEntry[];
  starterItems: ItemEntry[];
  skillOrder: string[];
  buildNote: string;
}

export interface ItemEntry {
  name: string;
  itemId: number;
  reason: string;
  statSummary?: string;
}

/**
 * 아이템 빌드 추천 핵심 로직
 * TODO v0.2: Riot API 아이템 승률 데이터 연동
 * TODO v0.3: 상대 챔피언 구성에 따른 대항 아이템 RAG 보강
 */
export async function getItemBuild(input: ItemBuildInput): Promise<ItemBuildResult> {
  console.error(`[item-build] Champion=${input.champion}, Position=${input.position}`);

  // 플레이스홀더 응답
  return {
    coreItems: [
      { name: "크라켄 슬레이어", itemId: 6672, reason: "탱커 관통 및 지속 딜링 최적화", statSummary: "공격력 65, 공격 속도 20%" },
      { name: "런난의 허리케인", itemId: 3085, reason: "광역 청소 및 오브젝트 처리 효율", statSummary: "공격 속도 40%" },
    ],
    situationalItems: [
      { name: "가고일 돌갑옷", itemId: 3193, reason: "적팀에 AP 딜러가 많을 경우 채택" },
    ],
    bootOptions: [
      { name: "베르세르커 그리브", itemId: 3006, reason: "기본 선택지, 공격 속도 보완" },
    ],
    starterItems: [
      { name: "도란의 검", itemId: 1055, reason: "기본 지속 능력치 및 체력 회복" },
    ],
    skillOrder: ["E", "Q", "W", "R(6/11/16)", "Q→E→W"],
    buildNote: "v0.2에서 Riot API 통계 기반 실제 데이터로 대체됩니다.",
  };
}
