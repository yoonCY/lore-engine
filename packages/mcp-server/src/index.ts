/**
 * lore-engine MCP Server Entry Point
 *
 * AI-powered game meta recommendation server using Model Context Protocol.
 * 현재 지원 게임: League of Legends
 * 확장 예정: RPG, 슈팅게임
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getChampionRecommendation } from "./tools/champion-recommend.js";
import { getItemBuild } from "./tools/item-build.js";
import { getMetaStats } from "./tools/meta-stats.js";
import { ServerConfig } from "./config/server.js";

const server = new McpServer({
  name: "lore-engine",
  version: "0.1.0",
});

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

// ─── 서버 시작 ─────────────────────────────────────────────────
async function main(): Promise<void> {
  const config = ServerConfig.fromEnv();
  console.error(`[lore-engine] MCP Server v0.1.0 starting...`);
  console.error(`[lore-engine] Neo4j: ${config.neo4jUri}`);
  console.error(`[lore-engine] Ollama: ${config.ollamaBaseUrl}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[lore-engine] MCP Server ready.");
}

main().catch((error) => {
  console.error("[lore-engine] Fatal error:", error);
  process.exit(1);
});
