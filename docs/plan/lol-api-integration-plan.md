# League of Legends API Integration Plan

## 1. 개요 (Overview)
Riot Games 공식 API를 통해 League of Legends (LOL) 데이터를 수집하고, 이를 기반으로 추천 시스템용 데이터 파이프라인(Neo4j, Qdrant)을 구축하는 시스템 아키텍처 및 구현 계획문서입니다. 현재 `feat/lol-api-integration` 브랜치에서 진행됩니다.

## 2. API 인증 및 보안 (Authentication)
*   **Riot Developer Portal**: `https://developer.riotgames.com/` 접속 후 API Key 발급 (개인용 Development Key)
*   **비밀키 관리**: 발급받은 API 키는 루트 디렉토리의 `.env` 파일에만 보관(`RIOT_API_KEY`)하며, `git`에 커밋되지 않도록 `.gitignore` 유지.
*   **Rate Limit**: Development Key 기준 **20 requests every 1 seconds / 100 requests every 2 minutes** 를 준수하도록 백오프(Backoff) 및 큐 시스템 고려.

## 3. 핵심 수집 지점 설계 (Data Ingestion)
1.  **Data Dragon (Static Data)**
    *   **목적:** 챔피언 기본 스탯, 아이템 효과, 룬(특성) 등 기준 데이터(Baseline Data) 수집.
    *   **호출 제한:** 없음 (정적 JSON 파일 제공).
    *   **동작:** 패치 버전 변경 시 또는 1회성 스크립트로 동작하여 Neo4j에 엔티티 노드 및 Qdrant에 임베딩을 초기 생성.
2.  **Riot Developer API (Dynamic Data)**
    *   **`league-v4`**: 챌린저/그랜드마스터 등 특정 상위 랭크의 소환사 ID 스크래핑.
    *   **`match-v5`**: 위 소환사 ID를 바탕으로 최근 플레이한 매치(Match) ID 목록 및 매치 세부 타임라인 정보 파싱.
    *   **목적:** 매치 데이터에서 실제 메타 픽, 승률(WinRate), 아이템 트리(Item Path), 챔피언 간 시너지/카운터 관계를 동적으로 계산.

## 4. 데이터베이스 매핑 (Data Mapping)
*   **Neo4j (Graph DB)**
    *   `(:Champion)-[:BUILDS {win_rate, pick_rate}]->(:Item)`
    *   `(:Champion)-[:SYNERGY {win_rate}]->(:Champion)`
    *   `(:Champion)-[:COUNTERS {win_rate}]->(:Champion)`
*   **Qdrant (Vector DB)**
    *   챔피언의 특성 스킬 텍스트 정보 및 아이템 패시브 설명 기반 임베딩을 저장. "후반에 좋은 광역 CC기 탱커" 등의 자연어 쿼리 응답용 RAG 기반 제공.

## 5. 단계별 실행 계획 (Milestones)
*   **Phase 1**: `packages/mcp-server/src/services/riot/` 경로에 Rate Limit이 적용된 Riot HTTP Client 및 의존성(`axios` / `pnpm install`) 설정.
*   **Phase 2**: Static Data Sync 파이프라인 구현 및 로컬 Neo4j/Qdrant 컨테이너 초기화 스크립트 작성.
*   **Phase 3**: 매치 데이터 수집 및 승률 계산을 위한 기초 통계 파이프라인 스크립트 작성 및 100회 단위의 제한적 데이터 덤프 테스트.
*   **Phase 4**: 기존 `champion-recommend.ts`, `item-build.ts` 툴(Tool) 함수에서 Neo4j Cipher 쿼리로 연결하여 실제 데이터 기반 추천 응답 기능(RAG) 구현.

## 6. 개발 환경 제약사항 (Environment Notes)
*   프로젝트 정책에 따라 Windows 호스트에는 직접 `node`를 설치하지 않고 Docker(`/app/node_modules`)를 활용.
*   의존성 설치 시 도커 기반 워크플로우를 `.ai/workflows/pnpm-install.md` 등의 규칙 문서로 작성하여 통합 관리.
