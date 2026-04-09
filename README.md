# 🧠 lore-engine

> **AI-powered game meta recommendation engine** — 게임 캐릭터/직업/챔피언에 맞는 아이템, 스킬트리, 사냥터를 데이터 기반으로 추천하는 AI 시스템

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/Protocol-MCP-purple)](https://modelcontextprotocol.io/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange)](https://pnpm.io/)

---

## ✨ 프로젝트 개요

`lore-engine`은 **Model Context Protocol(MCP)** 기반의 게임 메타 추천 AI입니다.

- **1단계:** League of Legends Riot API의 정형 통계 데이터로 정확도 기준선 확보
- **2단계:** 커뮤니티(인벤, OP.GG 등) 비정형 데이터 크롤링으로 RAG 지식베이스 보강
- **3단계:** Promptfoo 기반 Evaluation Harness로 정확도를 정량적으로 측정 & 개선 반복
- **4단계:** RPG, 슈팅게임 등 타 장르로 확장

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    lore-engine (Monorepo)                │
│                                                         │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────┐  │
│  │  mcp-server │  │  data-pipeline   │  │ harness  │  │
│  │  (MCP Tool) │  │ (Riot API/Crawl) │  │(Promptfoo│  │
│  └──────┬──────┘  └────────┬─────────┘  └──────────┘  │
│         │                  │                            │
│  ┌──────▼──────────────────▼───────────────────────┐   │
│  │              Docker Services                     │   │
│  │  Neo4j | ChromaDB | Redis | Ollama              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              web-ui (React + Vite)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 📦 패키지 구성

| 패키지 | 설명 |
|--------|------|
| `packages/mcp-server` | 게임 메타 질의응답 MCP 서버 (RAG 기반) |
| `packages/data-pipeline` | Riot API + 커뮤니티 크롤러 (Playwright) |
| `packages/harness` | Promptfoo 기반 정확도 평가 파이프라인 |
| `packages/web-ui` | 포트폴리오 시연 React UI |

## 🚀 빠른 시작

```bash
# 의존성 설치 (Dev Container 내부에서)
pnpm install

# 개발 환경 실행
pnpm dev

# 정확도 평가 실행
pnpm eval
```

## 📋 기술 스택

- **Runtime:** Node.js 20 + TypeScript 5
- **Protocol:** Model Context Protocol (MCP)
- **Vector DB:** Qdrant / ChromaDB
- **Graph DB:** Neo4j
- **Cache:** Redis
- **Scraping:** Playwright
- **Evaluation:** Promptfoo + Golden Dataset
- **Infra:** Docker Compose
- **Package Manager:** pnpm (workspace)

## 🗺️ 로드맵

- [ ] v0.1 — MCP 서버 기반 뼈대 + Riot API 연동
- [ ] v0.2 — Evaluation Harness 구축 (LoL 챔피언 기준)
- [ ] v0.3 — 커뮤니티 크롤러 + RAG 보강
- [ ] v0.4 — 정확도 70%+ 달성 후 타 장르 확장

---

> 문의: GitHub Issues 또는 PR 환영
