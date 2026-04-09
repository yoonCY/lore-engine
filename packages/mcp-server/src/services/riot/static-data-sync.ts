import { Database } from "../../config/database.js";

/**
 * Data Dragon (Static Data) Sync Service
 * 
 * Riot의 Data Dragon 리소스를 활용하여 챔피언, 아이템, 룬 등의
 * 기본 메타데이터를 다운로드하고, Neo4j 및 Qdrant 데이터 관리를 책임집니다.
 */

export class StaticDataSyncService {
  private readonly baseUrl = 'https://ddragon.leagueoflegends.com/cdn';
  private currentVersion: string = "";

  /**
   * Data Dragon의 최신 패치 버전을 가져옵니다.
   */
  public async getLatestVersion(): Promise<string> {
    try {
      const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      const versions: string[] = await response.json();
      this.currentVersion = versions[0];
      console.log(`[StaticDataSync] Latest Data Dragon Version: ${this.currentVersion}`);
      return this.currentVersion;
    } catch (error) {
      console.error("[StaticDataSync] Failed to fetch latest version", error);
      throw error;
    }
  }

  /**
   * 챔피언 데이터(JSON)를 가져옵니다.
   */
  public async fetchChampionsData() {
    if (!this.currentVersion) await this.getLatestVersion();
    
    try {
      const response = await fetch(`${this.baseUrl}/${this.currentVersion}/data/ko_KR/champion.json`);
      const data = await response.json();
      return data.data; // Record<ChampionName, ChampionData>
    } catch (error) {
      console.error("[StaticDataSync] Failed to fetch champions data", error);
      throw error;
    }
  }

  /**
   * 아이템 데이터(JSON)를 가져옵니다.
   */
  public async fetchItemsData() {
    if (!this.currentVersion) await this.getLatestVersion();

    try {
      const response = await fetch(`${this.baseUrl}/${this.currentVersion}/data/ko_KR/item.json`);
      const data = await response.json();
      return data.data; // Record<ItemId, ItemData>
    } catch (error) {
      console.error("[StaticDataSync] Failed to fetch items data", error);
      throw error;
    }
  }

  /**
   * Neo4j 그래프 초기화 (Baseline Data 로드)
   * 수집한 JSON을 바탕으로 (:Champion), (:Item) 노드를 갱신합니다.
   */
  public async syncToDatabase() {
    console.log("[StaticDataSync] Database Sync Started...");
    
    const champions = await this.fetchChampionsData();
    const items = await this.fetchItemsData();

    const champCount = Object.keys(champions).length;
    const itemCount = Object.keys(items).length;
    console.log(`[StaticDataSync] Fetched ${champCount} champions and ${itemCount} items.`);

    const driver = await Database.getDriver();
    const session = driver.session();

    try {
      // 1. Champion Node Merge
      for (const [key, details] of Object.entries<any>(champions)) {
        await session.run(`
          MERGE (c:Champion { id: $id })
          SET c.name = $name,
              c.title = $title,
              c.version = $version,
              c.tags = $tags,
              c.updatedAt = datetime()
        `, {
          id: details.key, // numeric id as string
          name: details.name, // 한국어 이름 (예: 가렌)
          title: details.title, // 칭호
          version: this.currentVersion,
          tags: details.tags
        });
      }
      console.log(`[StaticDataSync] Merged ${champCount} Champion nodes.`);

      // 2. Item Node Merge
      let count = 0;
      for (const [id, details] of Object.entries<any>(items)) {
        // 소모품 등 일부 제외 가능하지만 우선 전부 넣습니다.
        await session.run(`
          MERGE (i:Item { id: $id })
          SET i.name = $name,
              i.plaintext = $plaintext,
              i.gold = $gold,
              i.depth = $depth,
              i.tags = $tags,
              i.version = $version,
              i.updatedAt = datetime()
        `, {
          id: id,
          name: details.name,
          plaintext: details.plaintext || "",
          gold: details.gold ? details.gold.total : 0,
          depth: details.depth || 1,
          tags: details.tags || [],
          version: this.currentVersion
        });
        count++;
      }
      console.log(`[StaticDataSync] Merged ${count} Item nodes.`);

    } catch (error) {
      console.error("[StaticDataSync] Error syncing to Neo4j", error);
    } finally {
      await session.close();
    }

    // 3. Qdrant 임베딩 저장 로직
    // TODO: 벡터화 (예: Ollama embedding model) 이후 Qdrant 포인트 적재 구현 예정

    console.log("[StaticDataSync] Database Sync Complete!");
  }
}

