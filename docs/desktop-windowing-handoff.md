# Desktop Windowing Handoff

이 문서는 `desktop-windowing-20260417b` 작업을 통합할 때 확인해야 할 **현재 런타임 기준선**, **코드 품질 메모**, **회귀 검증 체크리스트**를 정리한 핸드오프 노트입니다.

## 1. 현재 기준선(이 브랜치 기준)

### 실제로 배포/실행되는 런타임
- 진입점: `index.html`
- 앱 런타임: `src/app/main.js`
- 주요 스타일: `src/styles/app.css`
- 게임 데이터/엔진:
  - `src/data/missions/index.js`
  - `src/features/gameplay/engine.js`
  - `src/lib/storage.js`
  - `src/lib/analytics.js`

### 함께 존재하지만 현재 번들에 연결되지 않은 초안
아래 TypeScript/React 파일들은 저장소에 존재하지만, 현재 `index.html`에서 로드되지 않습니다.
- `src/main.tsx`
- `src/app/App.tsx`
- `src/pages/**`
- `src/components/ui/**`
- `src/styles/global.css`, `src/styles/tokens.css`

즉, 데스크톱 셸 리워크를 통합할 때는 **실제 활성 런타임을 어디로 둘지** 먼저 확정해야 합니다.
- 기존 JS 런타임을 확장할지
- TS/React 셸로 엔트리포인트를 전환할지

## 2. 코드 리뷰 메모

### A. 현재 런타임의 결합 지점
`src/app/main.js`가 다음 책임을 한 파일에서 모두 담당합니다.
- 해시 라우팅
- 페이지 렌더링 템플릿
- 이벤트 위임(`data-nav`, `data-action`)
- 런 상태 전이
- 팝업 액션 연결
- 브리핑/결과 화면 진입

따라서 Windows 95 스타일 셸을 올릴 때는 아래 계약을 깨지 않는 것이 중요합니다.
- 미션 진입/재시작 해시 흐름(`#/missions`, `#/run/:id`, `#/result/:id`)
- 단계 입력 상태 복원(`src/app/stepInputState.js`)
- `attemptStep` / `resolvePopupAction` / `tickRun` 기반 게임 진행
- 결과 저장(`src/lib/storage.js`)

### B. 현재 검증이 의존하는 UI 계약
Playwright 스펙은 현재 활성 JS 런타임의 접근 가능한 텍스트/버튼 이름에 맞춰 작성되어 있습니다.
특히 아래 흐름은 회귀 방지 포인트입니다.
- 랜딩 → 미션 선택 진입
- 브리핑 열기 → 미션 시작
- 오피스 미션 전체 클리어
- 핫픽스 미션에서 진짜 방해 요소 우선 처리
- 제목 입력 포커스 유지
- 1440×900 기준 가로 오버플로 없음

데스크톱 셸 리워크 중 라벨을 바꾸더라도, 아래 중 하나는 반드시 유지해야 합니다.
1. 기존 접근 가능한 이름 유지
2. 같은 변경에서 E2E 스펙도 함께 갱신

### C. 현재 스크립트 범위 한계
- `npm run lint`는 커스텀 스크립트(`scripts/lint.mjs`)로 **활성 JS 런타임 중심 파일만** 검사합니다.
- `npm run typecheck`는 `node --check` 기반으로 **문법 수준 검사만** 수행합니다.
- 반면 실제 사용자 플로우 회귀는 `npm run test:e2e`가 가장 강하게 보장합니다.

따라서 Windows 95 셸 통합 후에는 **E2E 회귀를 필수 게이트로 취급**하는 편이 안전합니다.

### D. 이번 리워크에서 특히 보기 쉬운 리스크
- 단일 `src/styles/app.css`에 레이아웃/컴포넌트/팝업 스타일이 섞여 있어 페이지별 CSS 분리 시 회귀가 생기기 쉽습니다.
- 드래그 가능한 창을 도입하면 버튼 클릭/입력 포커스가 깨질 수 있습니다.
- 더블클릭 기반 실행기를 도입하면 단일 클릭 선택 상태와 충돌할 수 있습니다.
- 데스크톱/태스크바/시작 메뉴를 추가하면 1280×720에서 텍스트 오버플로가 다시 생길 수 있습니다.

## 3. 통합 승인 체크리스트

아래 항목을 모두 만족하면 `desktop-windowing` 통합 후보로 볼 수 있습니다.

### UX / 기능
- [ ] Windows 95 스타일 데스크톱 셸이 랜딩/미션/플레이/결과 흐름을 감싼다.
- [ ] 태스크바와 시작 메뉴가 존재하고 기본 탐색 수단으로 동작한다.
- [ ] `Games` 폴더와 `Popup Hell` 실행기가 더블클릭으로 열린다.
- [ ] 창 드래그가 가능하지만 버튼/입력/팝업 상호작용을 깨지 않는다.
- [ ] 기존 게임플레이 및 결과 저장 흐름이 유지된다.
- [ ] 1440×900뿐 아니라 1280×720에서도 주요 텍스트가 넘치지 않는다.

### 코드 구조
- [ ] 활성 런타임 엔트리포인트가 문서화되어 있다.
- [ ] 페이지별 CSS 파일 책임이 명확하다.
- [ ] 미사용 초안(React/TS 셸)과 실제 런타임 경계가 정리되어 있다.
- [ ] 미션 엔진(`src/features/gameplay/engine.js`)과 UI 셸 책임이 분리되어 있다.

### 회귀 검증
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run test:e2e`
- [ ] `npm run build`

## 4. 권장 검증 순서

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run test:e2e`
5. `npm run build`

이 순서를 권장하는 이유:
- 빠른 정적 실패를 먼저 잡고
- 엔진 회귀를 다음에 확인한 뒤
- UI/레이아웃 회귀를 Playwright로 검증하고
- 마지막에 빌드 결과를 확인하기 위함입니다.

## 5. 이번 워커 레인에서 확인한 기준선

2026-04-17 기준 이 워커 브랜치에서는 아래 검증이 통과했습니다.
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run build`

즉, 현재 활성 JS 런타임은 **기존 회귀 테스트 기준선이 안정적인 상태**이며, Windows 95 데스크톱 셸 작업은 이 기준선을 깨지 않는 방향으로 통합하는 것이 좋습니다.
