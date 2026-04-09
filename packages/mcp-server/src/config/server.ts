/**
 * Server Configuration
 * 환경 변수 기반 설정값을 타입 안전하게 로드합니다.
 */

export interface IServerConfig {
  neo4jUri: string;
  neo4jUsername: string;
  neo4jPassword: string;
  redisUrl: string;
  vectorDbUrl: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  riotApiKey: string;
  riotRegion: string;
  nodeEnv: string;
}

export class ServerConfig implements IServerConfig {
  readonly neo4jUri: string;
  readonly neo4jUsername: string;
  readonly neo4jPassword: string;
  readonly redisUrl: string;
  readonly vectorDbUrl: string;
  readonly ollamaBaseUrl: string;
  readonly ollamaModel: string;
  readonly riotApiKey: string;
  readonly riotRegion: string;
  readonly nodeEnv: string;

  private constructor(env: NodeJS.ProcessEnv) {
    this.neo4jUri = this.require(env, "NEO4J_URI");
    this.neo4jUsername = this.require(env, "NEO4J_USERNAME");
    this.neo4jPassword = this.require(env, "NEO4J_PASSWORD");
    this.redisUrl = this.require(env, "REDIS_URL");
    this.vectorDbUrl = env["VECTOR_DB_URL"] ?? "http://localhost:6333";
    this.ollamaBaseUrl = env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
    this.ollamaModel = env["OLLAMA_MODEL"] ?? "qwen2.5-coder:7b";
    this.riotApiKey = this.require(env, "RIOT_API_KEY");
    this.riotRegion = env["RIOT_REGION"] ?? "kr";
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
