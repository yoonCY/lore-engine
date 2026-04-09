/**
 * ═══════════════════════════════════════════════════════════════
 * 🧪 TFD (The First Descendant) API 커넥션 테스트 스크립트
 * ═══════════════════════════════════════════════════════════════
 *
 * 목적: .env 로딩 → TFD API 인증 확인 → 기본 파이프라인 동작 검증
 *   Step 1) 유저명 → OUID 조회
 *   Step 2) OUID → 유저 기본 정보 조회
 *   Step 3) OUID → 장착 계승자 정보 조회
 *
 * 실행: npx tsx packages/data-pipeline/src/test-tfd.ts [유저명]
 * ═══════════════════════════════════════════════════════════════
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TfdClient } from "./providers/nexon/tfd/client.js";

// ─── .env 로딩 ─────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

// ─── 환경변수 검증 ─────────────────────────────────────────────
const TFD_API_KEY = process.env.NEXON_TFD_API_KEY;
if (!TFD_API_KEY) {
  console.error("❌ NEXON_TFD_API_KEY 가 .env에 설정되어 있지 않습니다.");
  process.exit(1);
}
console.log("✅ API Key 로드 성공:", TFD_API_KEY.slice(0, 12) + "..." + TFD_API_KEY.slice(-8));

// ─── 테스트 대상 유저명 ────────────────────────────────────────
// ⚠️ TFD 유저명은 반드시 "닉네임#0000" 형식이어야 합니다 (대소문자 구분)
// 예: npx tsx packages/data-pipeline/src/test-tfd.ts "Player#1234"
const TEST_USERNAME = process.argv[2] || "";

if (!TEST_USERNAME || !TEST_USERNAME.includes("#")) {
  console.error("❌ TFD 유저명을 인자로 전달해주세요. 형식: '닉네임#0000'");
  console.error("   예: npx tsx packages/data-pipeline/src/test-tfd.ts \"Player#1234\"");
  console.log("\n⚡ 유저명 없이 인증 테스트만 수행합니다...");
  // 인증만 테스트: 메타데이터 API는 유저명 없이도 가능
  runMetaOnlyTest().catch(() => process.exit(1));
} else {
  main().catch((err) => {
    console.error("Unhandled error:", err);
    process.exit(1);
  });
}

// ─── 메인 테스트 로직 ──────────────────────────────────────────
async function main() {
  const client = new TfdClient({ apiKey: TFD_API_KEY! });

  console.log("\n" + "═".repeat(60));
  console.log(`🎯 TFD (The First Descendant) API 커넥션 테스트`);
  console.log(`📛 테스트 유저명: "${TEST_USERNAME}"`);
  console.log("═".repeat(60));

  // ── Step 1: 유저명 → OUID 조회 ────────────────────────────────
  console.log("\n📌 [Step 1] OUID 조회 중...");
  try {
    const ouidResult = await client.getUserOuid(TEST_USERNAME);
    console.log("✅ OUID 취득 성공:", ouidResult.ouid);

    // ── Step 2: 유저 기본 정보 조회 ─────────────────────────────────
    console.log("\n📌 [Step 2] 유저 기본 정보 조회 중...");
    const basicInfo = await client.getUserBasic(ouidResult.ouid);
    console.log("✅ 기본 정보 취득 성공:");
    console.log("  🧑 유저명:", basicInfo.user_name);
    console.log("  🎮 플랫폼:", basicInfo.platform_type);
    console.log("  📊 마스터리 랭크:", basicInfo.mastery_rank_level);
    console.log("  ⭐ 마스터리 경험치:", basicInfo.mastery_rank_exp);
    console.log("  🌍 OS 언어:", basicInfo.os_language);
    console.log("  🗣️  게임 언어:", basicInfo.game_language);

    // ── Step 3: 장착 계승자 정보 조회 ───────────────────────────────
    console.log("\n📌 [Step 3] 장착 계승자 정보 조회 중...");
    const descendantInfo = await client.getUserDescendant(ouidResult.ouid) as Record<string, unknown>;
    if (descendantInfo && typeof descendantInfo === "object") {
      console.log("✅ 계승자 정보 취득 성공!");
      const topKeys = Object.keys(descendantInfo);
      console.log("  📦 응답 최상위 키:", topKeys.join(", "));
    }
  } catch (err: any) {
    if (err.response) {
      console.error("\n❌ API 호출 실패:");
      console.error("  Status:", err.response.status);
      console.error("  Data:", JSON.stringify(err.response.data, null, 2));

      if (err.response.status === 400) {
        console.error("\n💡 Hint: 유저명이 정확한지 확인하세요.");
      } else if (err.response.status === 403) {
        console.error("\n💡 Hint: API 키 권한을 확인하세요. TFD API가 활성화되어 있는지 체크.");
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
  console.log("🎉 모든 테스트 통과! TFD API 연결 정상.");
  console.log("═".repeat(60));
}

/**
 * 유저명 없이 API 인증만 검증하는 메타데이터 테스트
 * 계승자/무기 메타데이터는 유저 식별 없이도 조회 가능
 */
async function runMetaOnlyTest() {
  const client = new TfdClient({ apiKey: TFD_API_KEY! });

  console.log("\n" + "═".repeat(60));
  console.log(`🎯 TFD API 인증 테스트 (메타데이터 조회)`);
  console.log("═".repeat(60));

  try {
    // 계승자 메타데이터 조회
    console.log("\n📌 [Meta] 계승자 메타데이터 조회 중...");
    const descendants = await client.getMetaDescendant() as unknown[];
    console.log(`✅ 계승자 메타데이터 취득 성공: ${Array.isArray(descendants) ? descendants.length : "?"}개`);

    if (Array.isArray(descendants) && descendants.length > 0) {
      // 처음 3개 미리보기
      descendants.slice(0, 3).forEach((d: any, i: number) => {
        console.log(`  [${i + 1}] ${d.descendant_name || d.name || JSON.stringify(d).slice(0, 60)}`);
      });
      if (descendants.length > 3) {
        console.log(`  ... 외 ${descendants.length - 3}개`);
      }
    }

    console.log("\n" + "═".repeat(60));
    console.log("🎉 TFD API 인증 정상! 유저 테스트는 유저명#태그를 인자로 전달하세요.");
    console.log("═".repeat(60));
  } catch (err: any) {
    if (err.response) {
      console.error("\n❌ 메타데이터 API 호출 실패:");
      console.error("  Status:", err.response.status);
      console.error("  Data:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("\n❌ 네트워크/예외 에러:", err.message);
    }
    process.exit(1);
  }
}
