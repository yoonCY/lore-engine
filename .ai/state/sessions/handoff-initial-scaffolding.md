# 📄 작업 인수인계서 (Handover Report)

## 1. 작업 개요 (Overview)
- **작업명/목표:** `lore-engine` 포트폴리오 프로젝트 초기 세팅 완료 (Monorepo 뼈대 + MCP 서버 스캐폴딩)
- **수행 기간:** 2026-04-09 21:35 ~ 21:42 (KST)

## 2. 완료된 작업 (Completed Tasks)

- **[완료] 프로젝트 디렉토리 생성** `D:/projects/lore-engine/`
  - pnpm Monorepo 구성 (`pnpm-workspace.yaml`)
  - 4개 패키지 구조: `mcp-server`, `data-pipeline`, `harness`, `web-ui`
- **[완료] `.ai/rules.md` 생성** — 워크스페이스 컨텍스트 명문화 (드라이브 정책, 보안, Git 규칙)
- **[완료] `.ai/workflows/dev-deploy.md`** — 개발/배포/평가 워크플로우 문서화
- **[완료] `.gitattributes`** — LF 라인엔딩 강제 (Windows CRLF 이슈 해결)
- **[완료] `.env.example`** — Riot API Key, Neo4j, Redis, Ollama, Gemini 환경변수 템플릿
- **[완료] `docker/compose.dev.yml`** — Neo4j, Redis, Qdrant, Ollama, MCP Server 전체 인프라
- **[완료] `packages/mcp-server` 핵심 소스 스캐폴딩**
  - `src/index.ts` — 3개 MCP Tool 등록 (`recommend_champion`, `get_item_build`, `get_meta_stats`)
  - `src/config/server.ts` — 타입 안전 환경변수 로더
  - `src/tools/champion-recommend.ts` — 챔피언 추천 Tool (플레이스홀더)
  - `src/tools/item-build.ts` — 아이템 빌드 추천 Tool (플레이스홀더)
  - `src/tools/meta-stats.ts` — 메타 통계 조회 Tool (플레이스홀더)
- **[완료] `packages/data-pipeline/src/riot/client.ts`** — Riot API 클라이언트 (Rate Limit 처리 포함)
- **[완료] `packages/harness/promptfooconfig.yaml`** — Promptfoo 설정 + LoL 기반 Golden Dataset (3개 케이스)
- **[완료] `packages/harness/src/mcp-provider.ts`** — Promptfoo ↔ MCP 서버 Stdio 연결 Provider
- **[완료] Git 초기화 + GitHub Push** — `feat/initial-scaffolding` 브랜치로 Push 완료

## 3. 미완료 및 다음 진행 작업 (Pending & Next Steps)

### v0.2 작업 (Riot API 실제 연동)
- [ ] **GitHub PR 생성 및 main merge**: `feat/initial-scaffolding` → `main` PR 필요
- [ ] **Riot API Key 발급**: https://developer.riotgames.com → `.env` 파일에 추가
- [ ] **`data-pipeline` Riot API 실제 연동**: `champion.json` 데이터 드래곤 파싱 + 챔피언 통계 수집
- [ ] **Neo4j 스키마 정의**: 챔피언-아이템-스킬 관계 그래프 노드/엣지 설계
- [ ] **MCP Tool 실제 구현**: 플레이스홀더를 Riot API + Neo4j 데이터로 대체
- [ ] **pnpm install 실행**: Dev Container 또는 Docker 내부에서 의존성 설치
- [ ] **Harness 첫 실행 검증**: `pnpm eval` → Gemini로 채점

### v0.3 이후 (커뮤니티 크롤러)
- [ ] `packages/data-pipeline/src/scrapers/` — 인벤, OP.GG Playwright 크롤러
- [ ] RAG 지식베이스 보강 (비정형 데이터 임베딩)
- [ ] `packages/web-ui` React 포트폴리오 UI 구현

## 4. 이슈 및 주의사항 (Issues & Notes)

- **Ollama 볼륨 경로**: `docker/compose.dev.yml`에서 `K:/archives/lore-engine/ollama-models` 바인드 마운트 → K: 드라이브(NAS) 미연결 시 Ollama 컨테이너 기동 실패. `.env`에서 `OLLAMA_MODEL_PATH` 변경 필요
- **GPU 설정**: `ollama` 서비스에 `nvidia` GPU 설정이 있음. GPU 없는 환경에선 `deploy.resources` 블록 주석 처리 필요
- **pnpm install 미실행**: Windows 호스트 직접 설치 지양 정책에 따라 Dev Container 또는 Docker 컨테이너 내부에서 실행 필요
- **`harness` MCP Tool 이름**: `mcp-provider.ts`에서 호출하는 Tool 이름 `recommend_champion`이 `mcp-server`의 등록명과 반드시 일치해야 함

## 5. 산출물 및 참고 자료 (Deliverables & References)

- **프로젝트 루트**: `D:/projects/lore-engine/`
- **GitHub 브랜치**: `feat/initial-scaffolding` (PR 생성 필요)
- **컨텍스트 규칙**: `D:/projects/lore-engine/.ai/rules.md`
- **워크플로우**: `D:/projects/lore-engine/.ai/workflows/dev-deploy.md`
- **Docker 환경**: `D:/projects/lore-engine/docker/compose.dev.yml`
- **참고 핸드오프 (Harness 설계)**: `D:/projects/ai-mcp-server/.ai/state/sessions/handoff-v22-promptfoo-eval.md`
