# 🔄 Deploy & Dev Workflow

## 로컬 개발 환경 실행

### 1. 사전 준비
```bash
# .env 파일 생성 (최초 1회)
cp .env.example .env
# 각 항목 값 채워넣기
```

### 2. Docker 인프라 실행
```bash
pnpm dev
# 또는
docker compose -f docker/compose.dev.yml up -d
```

### 3. 개발 서버 확인
| 서비스 | URL |
|--------|-----|
| Neo4j Browser | http://localhost:7474 |
| ChromaDB | http://localhost:8000 |
| Redis | localhost:6379 |
| Ollama | http://localhost:11434 |
| Web UI | http://localhost:5173 |

---

## 정확도 평가 (Harness)

```bash
# Promptfoo 평가 실행
pnpm eval

# 결과 확인 (브라우저)
npx promptfoo view
```

---

## Git 워크플로우

```bash
# 1. 기능 브랜치 생성
git checkout -b feat/riot-api-integration

# 2. 작업 후 커밋 (Conventional Commits)
git commit -m "feat: add Riot API champion stats fetcher"

# 3. Push
git push origin feat/riot-api-integration

# 4. GitHub에서 PR 생성 → 리뷰 → main merge
```

---

## 데이터 파이프라인 실행

```bash
# Riot API 데이터 수집
pnpm --filter data-pipeline run fetch:riot

# 커뮤니티 크롤러 실행
pnpm --filter data-pipeline run crawl:inven

# Neo4j 임포트
pnpm --filter data-pipeline run import:neo4j
```
