import neo4j, { Driver } from "neo4j-driver";
import { ServerConfig } from "./server.js";

/**
 * Neo4j Graph DB 연결 싱글톤 관리 객체
 */
export class Database {
  private static driverInstance: Driver | null = null;

  public static async getDriver(): Promise<Driver> {
    if (this.driverInstance) return this.driverInstance;

    const config = ServerConfig.fromEnv();
    
    // 환경변수에 명시적으로 NEO4J 아이디/비밀번호가 들어있다고 가정 (fallback 포함)
    const user = process.env.NEO4J_USERNAME || "neo4j";
    const password = process.env.NEO4J_PASSWORD || "loreengine";

    console.log(`[Database] Connecting to Neo4j at ${config.neo4jUri}...`);

    this.driverInstance = neo4j.driver(
      config.neo4jUri,
      neo4j.auth.basic(user, password),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 20000,
      }
    );

    try {
      await this.driverInstance.verifyConnectivity();
      console.log("[Database] Neo4j connectivity verified.");
    } catch (error) {
      console.error("[Database] Failed to connect to Neo4j:", error);
      throw error;
    }

    return this.driverInstance;
  }

  public static async close(): Promise<void> {
    if (this.driverInstance) {
      await this.driverInstance.close();
      this.driverInstance = null;
      console.log("[Database] Neo4j connection closed.");
    }
  }
}
