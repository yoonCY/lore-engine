/**
 * ═══════════════════════════════════════════════════════════════
 * 🧪 Nexon OpenAPI 커넥션 테스트 스크립트
 * ═══════════════════════════════════════════════════════════════
 *
 * 목적: .env 로딩 → 넥슨 인증 확인 → 메이플스토리 API 파이프라인 동작 검증
 *   Step 1) 캐릭터 닉네임 → OCID 변환
 *   Step 2) OCID → 캐릭터 기본 정보 조회
 *   Step 3) OCID → 장비 정보 조회 (일부만 출력)
 *
 * 실행: npx tsx packages/data-pipeline/src/test-nexon.ts
 * ═══════════════════════════════════════════════════════════════
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MaplestoryClient } from "./providers/nexon/maplestory/index.js";

// ─── .env 로딩 ─────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// data-pipeline/src/ 기준으로 프로젝트 루트의 .env 로드
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ─── 환경변수 검증 ─────────────────────────────────────────────
const MAPLE_API_KEY = process.env.NEXON_MAPLESTORY_API_KEY;
if (!MAPLE_API_KEY) {
  console.error("❌ NEXON_MAPLESTORY_API_KEY 가 .env에 설정되어 있지 않습니다.");
  process.exit(1);
}
console.log("✅ API Key 로드 성공:", MAPLE_API_KEY.slice(0, 12) + "..." + MAPLE_API_KEY.slice(-8));

// ─── 테스트 대상 캐릭터 ────────────────────────────────────────
// 유명 캐릭터 또는 본인 캐릭터 닉네임을 넣어주세요
const TEST_CHARACTER_NAME = process.argv[2] || "은월";

// ─── 메인 테스트 로직 ──────────────────────────────────────────
async function main() {
  const client = new MaplestoryClient({ apiKey: MAPLE_API_KEY! });

  console.log("\n" + "═".repeat(60));
  console.log(`🎮 메이플스토리 API 커넥션 테스트`);
  console.log(`📛 테스트 캐릭터: "${TEST_CHARACTER_NAME}"`);
  console.log("═".repeat(60));

  // ── Step 1: 닉네임 → OCID 변환 ──────────────────────────────
  console.log("\n📌 [Step 1] OCID 조회 중...");
  try {
    const ocidResult = await client.character.getOcid(TEST_CHARACTER_NAME);
    console.log("✅ OCID 취득 성공:", ocidResult.ocid);

    // ── Step 2: 캐릭터 기본 정보 조회 ────────────────────────────
    console.log("\n📌 [Step 2] 캐릭터 기본 정보 조회 중...");
    const basicInfo = await client.character.getCharacterBasic(ocidResult.ocid);
    console.log("✅ 기본 정보 취득 성공:");
    console.log("  🧑 캐릭터명:", basicInfo.character_name);
    console.log("  🌍 월드:", basicInfo.world_name);
    console.log("  ⚔️  직업:", basicInfo.character_class);
    console.log("  📊 레벨:", basicInfo.character_level);
    console.log("  🏆 길드:", basicInfo.character_guild_name || "(없음)");
    console.log("  📅 생성일:", basicInfo.character_date_create);
    console.log("  🖼️  이미지 URL:", basicInfo.character_image?.slice(0, 60) + "...");

    // ── Step 3: 장비 정보 조회 (요약) ────────────────────────────
    console.log("\n📌 [Step 3] 장비 정보 조회 중...");
    const equipData = await client.character.getCharacterItemEquipment(ocidResult.ocid) as any;
    if (equipData && typeof equipData === "object") {
      console.log("✅ 장비 정보 취득 성공!");
      // 최상위 키만 보여주기 (방대한 데이터이므로)
      const topKeys = Object.keys(equipData);
      console.log("  📦 응답 최상위 키:", topKeys.join(", "));
      // 장비 아이템 갯수 표시 (item_equipment 배열이 있을 경우)
      if (Array.isArray(equipData.item_equipment)) {
        console.log("  🛡️  장착 장비 수:", equipData.item_equipment.length, "개");
        // 첫 3개만 미리보기
        equipData.item_equipment.slice(0, 3).forEach((item: any, i: number) => {
          console.log(`    [${i + 1}] ${item.item_name || "unknown"} (${item.item_equipment_slot || "?"})`);
        });
        if (equipData.item_equipment.length > 3) {
          console.log(`    ... 외 ${equipData.item_equipment.length - 3}개`);
        }
      }
    } else {
      console.log("⚠️ 장비 정보가 비어있거나 예상과 다른 포맷입니다.");
    }
  } catch (err: any) {
    if (err.response) {
      // Axios HTTP 에러
      console.error("\n❌ API 호출 실패:");
      console.error("  Status:", err.response.status);
      console.error("  Data:", JSON.stringify(err.response.data, null, 2));

      if (err.response.status === 400) {
        console.error("\n💡 Hint: 캐릭터 이름이 정확한지 확인하세요.");
      } else if (err.response.status === 403) {
        console.error("\n💡 Hint: API 키 권한을 확인하세요. 메이플스토리 API가 활성화되어 있는지 체크.");
      } else if (err.response.status === 429) {
        console.error("\n💡 Hint: Rate Limit 초과. 잠시 후 재시도하세요.");
      }
    } else {
      console.error("\n❌ 네트워크/예외 에러:", err.message);
    }
    process.exit(1);
  }

  // ── 결과 요약 ────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("🎉 모든 테스트 통과! 넥슨 메이플스토리 API 연결 정상.");
  console.log("═".repeat(60));
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
