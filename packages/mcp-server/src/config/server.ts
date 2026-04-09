/**
 * Server Configuration
 * 환경 변수 기반 설정값을 타입 안전하게 로드합니다.
 *
 * 지원 퍼블리셔: Riot Games, Nexon (MapleStory, FC Online, TFD)
 */

export interface IServerConfig {
  // ── Infrastructure ────────────────────────────────────────────
  neo4jUri: string;
  neo4jUsername: string;
  neo4jPassword: string;
  redisUrl: string;
  vectorDbUrl: string;
  ollamaBaseUrl: string;
  ollamaModel: string;

  // ── Riot Games ────────────────────────────────────────────────
  riotApiKey: string;
  riotRegion: string;

  // ── Nexon OpenAPI ─────────────────────────────────────────────
  nexonMaplestoryApiKey: string;
  nexonFcOnlineApiKey: string;
  nexonTfdApiKey: string;

  nodeEnv: string;
}

export class ServerConfig implements IServerConfig {
  // Infrastructure
  readonly neo4jUri: string;
  readonly neo4jUsername: string;
  readonly neo4jPassword: string;
  readonly redisUrl: string;
  readonly vectorDbUrl: string;
  readonly ollamaBaseUrl: string;
  readonly ollamaModel: string;

  // Riot Games
  readonly riotApiKey: string;
  readonly riotRegion: string;

  // Nexon OpenAPI
  readonly nexonMaplestoryApiKey: string;
  readonly nexonFcOnlineApiKey: string;
  readonly nexonTfdApiKey: string;

  readonly nodeEnv: string;

  private constructor(env: NodeJS.ProcessEnv) {
    // Infrastructure
    this.neo4jUri = this.require(env, "NEO4J_URI");
    this.neo4jUsername = this.require(env, "NEO4J_USERNAME");
    this.neo4jPassword = this.require(env, "NEO4J_PASSWORD");
    this.redisUrl = this.require(env, "REDIS_URL");
    this.vectorDbUrl = env["VECTOR_DB_URL"] ?? "http://localhost:6333";
    this.ollamaBaseUrl = env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
    this.ollamaModel = env["OLLAMA_MODEL"] ?? "qwen2.5-coder:7b";

    // Riot Games
    this.riotApiKey = this.require(env, "RIOT_API_KEY");
    this.riotRegion = env["RIOT_REGION"] ?? "kr";

    // Nexon OpenAPI
    this.nexonMaplestoryApiKey = this.require(env, "NEXON_MAPLESTORY_API_KEY");
    this.nexonFcOnlineApiKey = this.require(env, "NEXON_FCONLINE_API_KEY");
    this.nexonTfdApiKey = this.require(env, "NEXON_TFD_API_KEY");

    this.nodeEnv = env["NODE_ENV"] ?? "development";
  }

  static fromEnv(): ServerConfig {
    return new ServerConfig(process.env);
  }

  private require(env: NodeJS.ProcessEnv, key: string): string {
    const value = env[key];
    if (!value) {
      throw new Error(`[ServerConfig] Missing required environment variable: ${key}`);
    }
    return value;
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === "development";
  }
}
