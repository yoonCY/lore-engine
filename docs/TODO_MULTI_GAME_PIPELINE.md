# 🚀 [TODO] Data Pipeline Multi-Game Architecture Refactoring

## 1. 개요 (Overview)
현재 `src/riot/client.ts`에 집중된 단일 구조를 확장하여, 라이엇(LoL, TFT) 플랫폼 외에도 넥슨(NEXON OpenAPI) 등 다양한 게임 제공자의 데이터를 병렬로 수집/처리할 수 있는 **도메인 주도 설계(DDD) 기반 어댑터 아키텍처**로 개편합니다.

## 2. 목표 구조 (Target Architecture)
```plaintext
packages/data-pipeline/src/
 ┣ core/                            # 코어 엔진 (공통 로직)
 ┃ ┣ interfaces/game-client.interface.ts 
 ┃ ┣ utils/http.client.ts           
 ┃ ┗ utils/rate-limiter.ts          
 ┣ providers/                       # 퍼블리셔(제공자) 그룹
 ┃ ┣ riot/                          # 라이엇 네임스페이스
 ┃ ┃ ┣ lol/                         # 리그오브레전드 도메인
 ┃ ┃ ┃ ┣ match.api.ts               
 ┃ ┃ ┃ ┗ summoner.api.ts            
 ┃ ┃ ┣ tft/                         
 ┃ ┃ ┗ riot-auth.ts                 
 ┃ ┗ nexon/                         # 넥슨 네임스페이스
 ┃   ┣ maplestory/                  # 메이플스토리 도메인
 ┃   ┃ ┣ character.api.ts           
 ┃   ┃ ┗ cube.api.ts                
 ┃   ┗ nexon-auth.ts                
 ┗ worker/                          # 스케줄러 및 잡 러너
   ┣ job-queue.ts
   ┣ lol-worker.ts                  
   ┗ maple-worker.ts                
```

## 3. 진행 단계 (Action Items)

### Phase 1: 기반 인터페이스 설계
- [ ] `src/core/interfaces` 디렉토리 생성 및 `game-client.interface.ts` 정의
- [ ] 공통 HTTP 유틸리티 및 Rate Limiter 모듈화

### Phase 2: 기존 Riot 모듈 리팩토링
- [ ] 기존 `src/riot/client.ts` 코드를 `src/providers/riot/lol/` 하위 모듈로 분리
- [ ] 인증 로직(`X-Riot-Token`)을 `riot-auth.ts`로 분리 및 적용

### Phase 3: Nexon OpenAPI 연동 초기화
- [ ] 넥슨 오픈 API 개발자 센터 가입 및 API Key 발급
- [ ] `.env` 파일에 `NEXON_API_KEY` 추가
- [ ] `src/providers/nexon/maplestory/` 골조 생성 및 연결 테스트

## 4. 참고 사항
- 모든 제공자(Provider)는 동일한 저장 공간(Neo4j DB 등)에 데이터를 쌓을 때 **통일된 엔티티 규격(Node/Edge)**을 만족하도록 설계할 것.
