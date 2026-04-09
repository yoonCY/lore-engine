# Session Context: Nexon MCP Tools 구현 완료 — v0.2.0
**Date**: 2026-04-10
**Goal**: MCP 서버에 넥슨 3개 게임(MapleStory, FC Online, TFD) Tool 추가 완료.

## 1. 달성한 작업 (Completed)
- ✅ **ServerConfig 확장**: `nexonMaplestoryApiKey`, `nexonFcOnlineApiKey`, `nexonTfdApiKey` 3종 추가
- ✅ **NexonClients 싱글톤**: `services/nexon/nexon-client.ts` — data-pipeline 클라이언트를 래핑
- ✅ **MCP Tool 8개 등록** (총 11개 = LoL 3 + Nexon 8):
  - `maple_lookup_character`: 메이플 캐릭터 기본 정보 (닉네임 → OCID → 기본정보 2-step chain)
  - `maple_get_equipment`: 메이플 캐릭터 장착 장비 상세
  - `fconline_lookup_user`: FC Online 유저 조회 (OUID)
  - `fconline_get_matches`: FC Online 매치 기록 목록
  - `fconline_get_match_detail`: FC Online 매치 상세
  - `tfd_lookup_user`: TFD 유저 기본 정보 (graceful fallback 포함)
  - `tfd_get_descendant`: TFD 장착 계승자 조회
  - `tfd_get_weapon`: TFD 장착 무기 조회
- ✅ **nexon-worker.ts**: BullMQ 기반 넥슨 데이터 수집 Worker (3개 Job Type)
- ✅ **tsconfig.json 수정**: rootDir 제거로 cross-package import 허용
- ✅ **package.json 업데이트**: v0.2.0, 워커 스크립트 분리 (worker:riot, worker:nexon)
- ✅ **tsx import 검증 통과**: 모든 import 경로 정상 resolve 확인

## 2. 아키텍처 현황
```
MCP Server (v0.2.0) — 11 Tools
├── tools/champion-recommend.ts  (LoL)
├── tools/item-build.ts          (LoL)
├── tools/meta-stats.ts          (LoL)
├── tools/maplestory-tools.ts    (Nexon)  ← NEW
├── tools/fconline-tools.ts      (Nexon)  ← NEW
├── tools/tfd-tools.ts           (Nexon)  ← NEW
├── services/nexon/nexon-client.ts        ← NEW (싱글톤)
├── services/riot/riot-client.ts
├── workers/riot-worker.ts
└── workers/nexon-worker.ts               ← NEW
```

## 3. 블로커 및 주의사항 (Issues & Notes)
- TFD `test_` prefix API 키는 메타데이터 엔드포인트에 접근 불가 (403)
  - `tfd_lookup_user` Tool에 graceful fallback 구현 완료
- mcp-server → data-pipeline 크로스 패키지 import는 tsx 기반 런타임용 상대 경로 사용
  - tsc 빌드 시에는 workspace 의존성 또는 project references 설정 필요

## 4. 다음 세션(Next Session) 진행 목표
- [ ] Neo4j 임포터(Importer) 구현: 넥슨 게임 데이터를 그래프 DB에 적재
- [ ] MCP Inspector로 전체 11개 Tool 동작 테스트
- [ ] TFD 운영 키 전환 후 풀 커넥션 테스트
- [ ] Harness (Promptfoo) 평가 시나리오에 넥슨 Tool 추가
- [ ] providers/riot/lol 클라이언트 보강 (기존 riot-auth.ts 활용)
