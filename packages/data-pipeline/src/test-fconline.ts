/**
 * ═══════════════════════════════════════════════════════════════
 * 🧪 FC Online API 커넥션 테스트 스크립트
 * ═══════════════════════════════════════════════════════════════
 *
 * 목적: .env 로딩 → FC Online API 인증 확인 → 기본 파이프라인 동작 검증
 *   Step 1) 닉네임 → OUID 조회
 *   Step 2) OUID → 매치 기록 조회
 *   Step 3) 매치 상세 정보 조회 (첫 번째 매치)
 *
 * 실행: npx tsx packages/data-pipeline/src/test-fconline.ts [닉네임]
 * ═══════════════════════════════════════════════════════════════
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FcOnlineClient } from "./providers/nexon/fconline/client.js";

// ─── .env 로딩 ─────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ─── 환경변수 검증 ─────────────────────────────────────────────
const FC_API_KEY = process.env.NEXON_FCONLINE_API_KEY;
if (!FC_API_KEY) {
  console.error("❌ NEXON_FCONLINE_API_KEY 가 .env에 설정되어 있지 않습니다.");
  process.exit(1);
}
console.log("✅ API Key 로드 성공:", FC_API_KEY.slice(0, 12) + "..." + FC_API_KEY.slice(-8));

// ─── 테스트 대상 닉네임 ────────────────────────────────────────
// FC Online 에서 활동 중인 유저 닉네임을 인자로 전달하세요
const TEST_NICKNAME = process.argv[2] || "킹갓제네럴";

// ─── 공식 매치 타입 (50 = 공식경기) ─────────────────────────────
const MATCH_TYPE_OFFICIAL = 50;

// ─── 메인 테스트 로직 ──────────────────────────────────────────
async function main() {
  const client = new FcOnlineClient({ apiKey: FC_API_KEY! });

  console.log("\n" + "═".repeat(60));
  console.log(`⚽ FC Online API 커넥션 테스트`);
  console.log(`📛 테스트 닉네임: "${TEST_NICKNAME}"`);
  console.log("═".repeat(60));

  // ── Step 1: 닉네임 → OUID 조회 ────────────────────────────────
  console.log("\n📌 [Step 1] OUID 조회 중...");
  try {
    const ouidResult = await client.getUserOuid(TEST_NICKNAME);
    console.log("✅ OUID 취득 성공:", ouidResult.ouid);

    // ── Step 2: 매치 기록 조회 ─────────────────────────────────────
    console.log("\n📌 [Step 2] 매치 기록 조회 중...");
    const matchList = await client.getMatchList(
      ouidResult.ouid,
      MATCH_TYPE_OFFICIAL,
      0,
      10 // 최근 10경기만
    );
    console.log(`✅ 매치 기록 취득 성공: ${matchList.length}경기`);
    if (matchList.length > 0) {
      matchList.slice(0, 3).forEach((matchId, i) => {
        console.log(`  [${i + 1}] Match ID: ${matchId}`);
      });
      if (matchList.length > 3) {
        console.log(`  ... 외 ${matchList.length - 3}경기`);
      }

      // ── Step 3: 매치 상세 조회 (첫 번째) ──────────────────────────
      console.log("\n📌 [Step 3] 첫 번째 매치 상세 조회 중...");
      const matchDetail = await client.getMatchDetail(matchList[0]) as Record<string, unknown>;
      if (matchDetail && typeof matchDetail === "object") {
        console.log("✅ 매치 상세 취득 성공!");
        const topKeys = Object.keys(matchDetail);
        console.log("  📦 응답 최상위 키:", topKeys.join(", "));
      }
    } else {
      console.log("⚠️ 매치 기록이 없습니다. 닉네임이 정확한지 확인하거나 다른 매치타입을 시도해주세요.");
    }
  } catch (err: any) {
    if (err.response) {
      console.error("\n❌ API 호출 실패:");
      console.error("  Status:", err.response.status);
      console.error("  Data:", JSON.stringify(err.response.data, null, 2));

      if (err.response.status === 400) {
        console.error("\n💡 Hint: 닉네임이 정확한지 확인하세요.");
      } else if (err.response.status === 403) {
        console.error("\n💡 Hint: API 키 권한을 확인하세요. FC Online API가 활성화되어 있는지 체크.");
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
  console.log("🎉 모든 테스트 통과! FC Online API 연결 정상.");
  console.log("═".repeat(60));
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
