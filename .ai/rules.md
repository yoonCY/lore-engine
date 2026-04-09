# 🧠 lore-engine - Agent Rules & Workspace Context

## 프로젝트 개요
- **프로젝트명:** lore-engine
- **목표:** 게임 캐릭터/직업별 아이템, 스킬트리, 사냥터 등을 추천하는 AI 시스템 (포트폴리오)
- **초기 타겟 게임:** League of Legends (Riot API 기반 통계로 정확도 검증)
- **확장 방향:** RPG, 슈팅게임 등 타 장르 데이터 수집

## 환경 규칙

### 드라이브 구성
- **D:/projects/lore-engine** — 메인 개발 디렉토리 (본 프로젝트 루트)
- **K:/archives/lore-engine** — 1GB 이상 모델 파일, 크롤링 덤프 아카이브

### 패키지 매니저
- **pnpm** (workspace 기반 모노레포)
- 절대 npm/yarn 혼용 금지

### 컨테이너 우선 원칙
- 모든 서비스는 Docker Compose 기반으로 실행
- node_modules 및 빌드 결과물은 컨테이너 내부 익명 볼륨 사용 (Windows I/O 회피)
- VS Code Dev Container 활용 권장

## 아키텍처 구성

### 패키지 구조 (Monorepo)
```
packages/
├── mcp-server/      # 범용 MCP 서버 (회사 코드 걷어낸 순수 포트폴리오 버전)
├── data-pipeline/   # Riot API + 커뮤니티 크롤러
├── harness/         # Promptfoo 기반 정확도 평가 파이프라인
└── web-ui/          # 포트폴리오 시연 React UI
```

### 핵심 기술 스택
- **MCP Server:** Node.js (TypeScript), MCP SDK
- **Vector DB:** 로컬 `chromadb` or `qdrant` (Docker)
- **Graph DB:** Neo4j (Docker)
- **Cache:** Redis (Docker)
- **Evaluation:** Promptfoo + Golden Dataset (Riot API 기반 Ground Truth)
- **Scraping:** Playwright (TypeScript)
- **UI:** React + Vite

## 보안 정책
- Riot API Key는 절대 코드에 하드코딩 금지 → `.env` + Docker Secret 사용
- 크롤링 대상 사이트의 robots.txt 준수
- Zero-Trust: 모든 서비스 간 통신은 내부 Docker 네트워크 사용

## Git 규칙
- `main` 브랜치 직접 Push 절대 금지
- 브랜치 네이밍: `feat/<name>`, `fix/<name>`, `chore/<name>`
- Conventional Commits 준수 (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
- PR 필수

## 워크플로우 참조
- `.ai/workflows/` 내 마크다운 워크플로우 참조
- 핸드오프: `.ai/state/sessions/` 내 최신 파일 우선 확인
