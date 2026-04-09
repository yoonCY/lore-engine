/**
 * lore-engine MCP Server Entry Point
 *
 * AI-powered multi-game meta recommendation server using Model Context Protocol.
 * 지원 게임: League of Legends, MapleStory, FC Online, The First Descendant
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ── Riot (League of Legends) ────────────────────────────────────
import { getChampionRecommendation } from "./tools/champion-recommend.js";
import { getItemBuild } from "./tools/item-build.js";
import { getMetaStats } from "./tools/meta-stats.js";

// ── Nexon ───────────────────────────────────────────────────────
import { mapleLookupCharacter, mapleGetEquipment } from "./tools/maplestory-tools.js";
import { fcLookupUser, fcGetMatches, fcGetMatchDetail } from "./tools/fconline-tools.js";
import { tfdLookupUser, tfdGetDescendant, tfdGetWeapon } from "./tools/tfd-tools.js";

import { ServerConfig } from "./config/server.js";

const server = new McpServer({
  name: "lore-engine",
  version: "0.2.0",
});

// ═══════════════════════════════════════════════════════════════
//  Riot — League of Legends Tools
// ═══════════════════════════════════════════════════════════════

// ─── Tool: 챔피언 추천 ─────────────────────────────────────────
server.tool(
  "recommend_champion",
  "현재 팀 구성과 포지션을 기반으로 챔피언을 추천합니다.",
  {
    position: z.enum(["top", "jungle", "mid", "bot", "support"]).describe("담당 포지션"),
    allies: z.array(z.string()).max(4).describe("아군 챔피언 목록 (최대 4개)"),
    enemies: z.array(z.string()).max(5).describe("적군 챔피언 목록 (최대 5개)"),
    rankTier: z.enum(["iron", "bronze", "silver", "gold", "platinum", "emerald", "diamond", "master", "grandmaster", "challenger"])
      .optional()
      .describe("현재 랭크 티어 (선택 사항, 메타 필터링에 사용)"),
  },
  async ({ position, allies, enemies, rankTier }) => {
    const result = await getChampionRecommendation({ position, allies, enemies, rankTier });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ─── Tool: 아이템 빌드 추천 ────────────────────────────────────
server.tool(
  "get_item_build",
  "챔피언과 상황에 맞는 최적의 아이템 빌드를 추천합니다.",
  {
    champion: z.string().describe("챔피언 이름 (영문 또는 한글)"),
    position: z.enum(["top", "jungle", "mid", "bot", "support"]).describe("포지션"),
    enemies: z.array(z.string()).optional().describe("적군 챔피언 목록 (대항 빌드 계산용)"),
    gamePhase: z.enum(["early", "mid", "late"]).optional().describe("게임 단계"),
  },
  async ({ champion, position, enemies, gamePhase }) => {
    const result = await getItemBuild({ champion, position, enemies, gamePhase });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ─── Tool: 메타 통계 조회 ──────────────────────────────────────
server.tool(
  "get_meta_stats",
  "특정 챔피언의 현재 패치 메타 통계를 조회합니다. (승률, 픽률, 밴률)",
  {
    champion: z.string().describe("챔피언 이름"),
    position: z.enum(["top", "jungle", "mid", "bot", "support"]).optional().describe("포지션 필터"),
    patch: z.string().optional().describe("패치 버전 (예: '14.8'). 생략 시 최신 패치"),
  },
  async ({ champion, position, patch }) => {
    const result = await getMetaStats({ champion, position, patch });
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ═══════════════════════════════════════════════════════════════
//  Nexon — MapleStory Tools
// ═══════════════════════════════════════════════════════════════

// ─── Tool: 메이플스토리 캐릭터 조회 ────────────────────────────
server.tool(
  "maple_lookup_character",
  "메이플스토리 캐릭터 닉네임으로 기본 정보(레벨, 직업, 월드, 길드 등)를 조회합니다.",
  {
    characterName: z.string().describe("메이플스토리 캐릭터 닉네임"),
  },
  async ({ characterName }) => {
    try {
      const result = await mapleLookupCharacter({ characterName });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `❌ 캐릭터 조회 실패: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: 메이플스토리 장비 조회 ──────────────────────────────
server.tool(
  "maple_get_equipment",
  "메이플스토리 캐릭터의 장착 장비 정보를 상세 조회합니다.",
  {
    characterName: z.string().describe("메이플스토리 캐릭터 닉네임"),
    date: z.string().optional().describe("조회 기준일 (YYYY-MM-DD, KST). 미입력 시 최신 데이터"),
  },
  async ({ characterName, date }) => {
    try {
      const result = await mapleGetEquipment({ characterName, date });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `❌ 장비 조회 실패: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  Nexon — FC Online Tools
// ═══════════════════════════════════════════════════════════════

// ─── Tool: FC Online 유저 조회 ─────────────────────────────────
server.tool(
  "fconline_lookup_user",
  "FC 온라인 닉네임으로 유저를 조회하고 고유 식별자(OUID)를 반환합니다.",
  {
    nickname: z.string().describe("FC 온라인 닉네임"),
  },
  async ({ nickname }) => {
    try {
      const result = await fcLookupUser({ nickname });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `❌ 유저 조회 실패: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: FC Online 매치 기록 ─────────────────────────────────
server.tool(
  "fconline_get_matches",
  "FC 온라인 유저의 매치 기록 목록을 조회합니다.",
  {
    nickname: z.string().describe("FC 온라인 닉네임"),
    matchtype: z.number().optional().describe("매치 종류 ID (기본 50 = 공식경기)"),
    limit: z.number().min(1).max(100).optional().describe("조회 개수 (기본 10, 최대 100)"),
  },
  async ({ nickname, matchtype, limit }) => {
    try {
      const result = await fcGetMatches({ nickname, matchtype, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `❌ 매치 기록 조회 실패: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: FC Online 매치 상세 ─────────────────────────────────
server.tool(
  "fconline_get_match_detail",
  "FC 온라인 특정 매치의 상세 정보를 조회합니다.",
  {
    matchId: z.string().describe("매치 ID"),
  },
  async ({ matchId }) => {
    try {
      const result = await fcGetMatchDetail({ matchId });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `❌ 매치 상세 조회 실패: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ═══════════════════════════════════════════════════════════════
//  Nexon — The First Descendant (TFD) Tools
// ═══════════════════════════════════════════════════════════════

// ─── Tool: TFD 유저 조회 ───────────────────────────────────────
server.tool(
  "tfd_lookup_user",
  "퍼스트 디센던트 유저를 조회합니다. 유저명은 '닉네임#태그' 형식입니다.",
  {
    userName: z.string().describe("유저명 (닉네임#태그 형식, 예: 'Player#1234')"),
  },
  async ({ userName }) => {
    try {
      const result = await tfdLookupUser({ userName });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `❌ TFD 유저 조회 실패: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: TFD 계승자 조회 ─────────────────────────────────────
server.tool(
  "tfd_get_descendant",
  "퍼스트 디센던트 유저가 현재 장착 중인 계승자(Descendant) 정보를 조회합니다.",
  {
    userName: z.string().describe("유저명 (닉네임#태그 형식)"),
  },
  async ({ userName }) => {
    try {
      const result = await tfdGetDescendant({ userName });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `❌ TFD 계승자 조회 실패: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ─── Tool: TFD 무기 조회 ───────────────────────────────────────
server.tool(
  "tfd_get_weapon",
  "퍼스트 디센던트 유저가 현재 장착 중인 무기 정보를 조회합니다.",
  {
    userName: z.string().describe("유저명 (닉네임#태그 형식)"),
  },
  async ({ userName }) => {
    try {
      const result = await tfdGetWeapon({ userName });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `❌ TFD 무기 조회 실패: ${msg}` }],
        isError: true,
      };
    }
  }
);

// ─── 서버 시작 ─────────────────────────────────────────────────
async function main(): Promise<void> {
  const config = ServerConfig.fromEnv();
  console.error(`[lore-engine] MCP Server v0.2.0 starting...`);
  console.error(`[lore-engine] Neo4j: ${config.neo4jUri}`);
  console.error(`[lore-engine] Ollama: ${config.ollamaBaseUrl}`);
  console.error(`[lore-engine] Games: LoL, MapleStory, FC Online, TFD`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[lore-engine] MCP Server ready. (11 tools registered)");
}

main().catch((error) => {
  console.error("[lore-engine] Fatal error:", error);
  process.exit(1);
});
