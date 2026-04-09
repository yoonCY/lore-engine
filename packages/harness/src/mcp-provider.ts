/**
 * MCP Provider for Promptfoo
 *
 * Promptfoo 평가 시스템과 lore-engine MCP 서버를 연결합니다.
 * IDE와 동일하게 Stdio 통신을 사용하여 MCP 서버를 직접 호출합니다.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";
import path from "path";

// Promptfoo ApiProvider 인터페이스
interface ProviderOptions {
  config?: Record<string, unknown>;
}

interface CallApiResponse {
  output: string;
  error?: string;
  tokenUsage?: { total: number };
}

// MCP 서버 바이너리 경로 (harness 기준 상대 경로)
const MCP_SERVER_PATH = path.resolve(
  import.meta.dirname,
  "../../mcp-server/src/index.ts"
);

export default class McpProvider {
  id(): string {
    return "lore-engine-mcp";
  }

  async callApi(
    prompt: string,
    _options?: ProviderOptions
  ): Promise<CallApiResponse> {
    let client: Client | null = null;

    try {
      // Promptfoo가 전달한 prompt를 JSON으로 파싱 (vars 기반)
      const vars = JSON.parse(prompt) as {
        position: string;
        allies: string[];
        enemies: string[];
        rankTier?: string;
      };

      // MCP 서버 프로세스 기동 (tsx로 TypeScript 직접 실행)
      const transport = new StdioClientTransport({
        command: "npx",
        args: ["tsx", MCP_SERVER_PATH],
        env: {
          ...process.env,
          NODE_ENV: "test",
        },
      });

      client = new Client({ name: "lore-harness", version: "0.1.0" }, {});
      await client.connect(transport);

      // MCP Tool 호출
      const result = await client.callTool({
        name: "recommend_champion",
        arguments: vars,
      });

      const textContent = result.content.find((c) => c.type === "text");
      const output = textContent ? (textContent as { type: "text"; text: string }).text : JSON.stringify(result.content);

      return { output };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { output: "", error: `MCP Provider Error: ${message}` };
    } finally {
      if (client) {
        await client.close().catch(() => void 0);
      }
    }
  }
}
