import { missions, getMissionById } from '../data/missions/index.js';
import { track } from '../lib/analytics.js';
import { loadSave, saveRunSummary, markTutorialSeen } from '../lib/storage.js';
import { createRunState, tickRun, attemptStep, resolvePopupAction } from '../features/gameplay/engine.js';

const appRoot = document.querySelector('#app');
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;

const appState = {
  booting: true,
  route: parseRoute(),
  save: loadSave(),
  activeRun: null,
  lastResult: null,
};

let tickerHandle = null;

window.setTimeout(() => {
  appState.booting = false;
  render();
}, 360);

window.addEventListener('hashchange', () => {
  appState.route = parseRoute();
  syncRouteState();
  render();
});

window.addEventListener('resize', render);
window.addEventListener('keydown', handleGlobalKeydown);
appRoot.addEventListener('click', handleClick);
appRoot.addEventListener('submit', handleSubmit);

syncRouteState();
render();

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart] = hash.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'how-to-play') {
    return { page: 'how-to-play' };
  }

  if (segments[0] === 'missions') {
    return { page: 'missions' };
  }

  if (segments[0] === 'run' && segments[1]) {
    return { page: 'run', missionId: segments[1] };
  }

  if (segments[0] === 'result' && segments[1]) {
    return { page: 'result', runId: segments[1] };
  }

  return { page: 'landing' };
}

function syncRouteState() {
  if (appState.route.page === 'run') {
    const mission = getMissionById(appState.route.missionId);
    if (!mission) {
      return;
    }

    if (!appState.activeRun || appState.activeRun.mission.id !== mission.id || appState.activeRun.phase === 'result') {
      appState.activeRun = {
        mission,
        phase: 'briefing',
        state: null,
      };
    }

    return;
  }

  if (appState.route.page === 'result' && appState.activeRun) {
    appState.activeRun.phase = 'result';
  }
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && appState.route.page === 'run' && appState.activeRun?.state?.activePopups.length) {
    const firstDismissible = appState.activeRun.state.activePopups.find((popup) => popup.requiredResponse === 'dismiss');
    if (firstDismissible) {
      onResolvePopup(firstDismissible.id, 'dismiss');
    }
  }
}

function handleClick(event) {
  const target = event.target.closest('[data-action], [data-nav]');
  if (!target) {
    return;
  }

  if (target.dataset.nav) {
    window.location.hash = target.dataset.nav;
    return;
  }

  const action = target.dataset.action;
  if (action === 'start-run') {
    startRun(target.dataset.missionId);
  }

  if (action === 'tutorial-seen') {
    appState.save = markTutorialSeen();
    render();
  }

  if (action === 'step-click') {
    event.preventDefault();
    onAttemptStep({ confirmed: true });
  }

  if (action === 'popup-action') {
    event.preventDefault();
    onResolvePopup(target.dataset.popupId, target.dataset.response);
  }

  if (action === 'retry-run') {
    startRun(target.dataset.missionId);
  }
}

function handleSubmit(event) {
  const form = event.target.closest('[data-step-form]');
  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  const value = formData.get('step-input');
  onAttemptStep({ value, confirmed: true });
}

function startRun(missionId) {
  const mission = getMissionById(missionId);
  if (!mission || !isDesktopReady()) {
    render();
    return;
  }

  const state = createRunState(mission);
  appState.activeRun = {
    mission,
    phase: 'running',
    state,
  };

  track('mission_selected', { missionId });
  track('run_started', { missionId, runId: state.runId });

  if (!appState.save.tutorialSeen) {
    appState.save = markTutorialSeen();
  }

  startTicker();
  render();
}

function startTicker() {
  stopTicker();
  tickerHandle = window.setInterval(() => {
    if (!appState.activeRun?.state) {
      return;
    }

    appState.activeRun.state = tickRun(appState.activeRun.state, Date.now());

    if (appState.activeRun.state.status !== 'running') {
      finalizeCurrentRun();
      return;
    }

    render();
  }, 250);
}

function stopTicker() {
  if (tickerHandle) {
    window.clearInterval(tickerHandle);
    tickerHandle = null;
  }
}

function finalizeCurrentRun() {
  stopTicker();
  const runState = appState.activeRun?.state;
  if (!runState || !runState.scoreSummary) {
    return;
  }

  appState.save = saveRunSummary(runState.scoreSummary);
  appState.lastResult = runState.scoreSummary;
  track(runState.status === 'won' ? 'mission_cleared' : 'mission_failed', {
    missionId: runState.mission.id,
    runId: runState.runId,
    grade: runState.scoreSummary.grade,
  });
  window.location.hash = `#/result/${runState.runId}`;
}

function onAttemptStep(submission) {
  if (!appState.activeRun?.state) {
    return;
  }

  appState.activeRun.state = attemptStep(appState.activeRun.state, submission);

  if (appState.activeRun.state.status !== 'running') {
    finalizeCurrentRun();
    return;
  }

  render();
}

function onResolvePopup(popupId, action) {
  if (!appState.activeRun?.state) {
    return;
  }

  appState.activeRun.state = resolvePopupAction(appState.activeRun.state, popupId, action);

  if (appState.activeRun.state.status !== 'running') {
    finalizeCurrentRun();
    return;
  }

  render();
}

function isDesktopReady() {
  return window.innerWidth >= MIN_WIDTH && window.innerHeight >= MIN_HEIGHT;
}

function getResultSummary(runId) {
  if (appState.lastResult?.runId === runId) {
    return appState.lastResult;
  }

  return appState.save.recentRuns.find((entry) => entry.runId === runId) ?? null;
}

function render() {
  const viewportNotice = !isDesktopReady()
    ? `
      <aside class="resolution-warning" role="status" aria-live="polite">
        <strong>PC 전용 화면</strong>
        <span>${MIN_WIDTH}×${MIN_HEIGHT} 이상 해상도에서 플레이하세요.</span>
      </aside>
    `
    : '';

  const content = appState.booting
    ? renderBoot()
    : appState.route.page === 'landing'
      ? renderLanding()
      : appState.route.page === 'how-to-play'
        ? renderHowToPlay()
        : appState.route.page === 'missions'
          ? renderMissions()
          : appState.route.page === 'run'
            ? renderRun()
            : renderResult();

  appRoot.innerHTML = `
    <div class="shell grain">
      <header class="topbar window-frame">
        <div>
          <p class="eyebrow">VINTAGE 업무 생존 훈련</p>
          <h1>Error Popup Hell</h1>
        </div>
        <nav class="topnav" aria-label="주요 탐색">
          <button type="button" class="retro-button" data-nav="#/">홈</button>
          <button type="button" class="retro-button" data-nav="#/how-to-play">플레이 방법</button>
          <button type="button" class="retro-button accent" data-nav="#/missions">미션 선택</button>
        </nav>
      </header>
      ${viewportNotice}
      <main>${content}</main>
      <footer class="footer">
        <span>정적 웹 앱 MVP · 로컬 최고 기록 저장</span>
        <span>Esc 키로 닫기 가능한 가짜 팝업을 빠르게 치울 수 있습니다.</span>
      </footer>
    </div>
  `;
}

function renderBoot() {
  return `
    <section class="boot-screen window-frame center-panel" aria-live="polite">
      <p class="eyebrow">SYSTEM BOOT</p>
      <h2>CRT 워밍업 중...</h2>
      <p>업무 혼란 시뮬레이터를 준비하고 있습니다.</p>
    </section>
  `;
}

function renderLanding() {
  const highlightedMissions = missions.slice(0, 2)
    .map(
      (mission) => `
        <article class="mission-preview panel-card">
          <p class="difficulty-chip ${mission.difficulty}">${difficultyLabel(mission.difficulty)}</p>
          <h3>${mission.title}</h3>
          <p>${mission.brief}</p>
          <dl>
            <div><dt>제한 시간</dt><dd>${mission.timeLimitSec}초</dd></div>
            <div><dt>예상 플레이</dt><dd>${mission.estimatedMinutes}분</dd></div>
          </dl>
        </article>
      `,
    )
    .join('');

  return `
    <section class="landing-grid">
      <section class="hero-panel window-frame">
        <p class="eyebrow">PC ONLY · 2~3분 세션</p>
        <h2>모든 팝업을 치우지 마세요.<br />진짜 문제만 해결하세요.</h2>
        <p class="hero-copy">
          Error Popup Hell은 가짜 알림과 진짜 방해 요소를 구분하면서 제한 시간 안에 업무형 미션을 끝내는
          레트로 웹 게임입니다.
        </p>
        <div class="cta-row">
          <button type="button" class="retro-button primary" data-nav="#/missions">게임 시작</button>
          <button type="button" class="retro-button" data-nav="#/how-to-play">플레이 방법 보기</button>
        </div>
        <ul class="rule-list">
          <li>진짜 방해 요소를 먼저 해결하지 않으면 핵심 단계가 막힙니다.</li>
          <li>가짜 팝업에 휘둘리면 시간 손실 또는 스트라이크가 쌓입니다.</li>
          <li>결과 화면에서 같은 미션 재도전과 다른 미션 선택이 가능합니다.</li>
        </ul>
      </section>
      <section class="sidebar-stack">
        <article class="window-frame hud-preview">
          <h3>실패 조건</h3>
          <ul>
            <li>제한 시간 종료</li>
            <li>스트라이크 초과</li>
            <li>필수 진짜 방해 요소 미해결 상태로 마지막 단계 시도</li>
          </ul>
        </article>
        <article class="window-frame mission-preview-list">
          <div class="section-heading">
            <h3>대표 미션</h3>
            <button type="button" class="text-link" data-nav="#/missions">전체 보기</button>
          </div>
          ${highlightedMissions}
        </article>
      </section>
    </section>
  `;
}

function renderHowToPlay() {
  return `
    <section class="window-frame page-panel howto-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">HOW TO PLAY</p>
          <h2>실제 방해 요소와 가짜 팝업 구분법</h2>
        </div>
        <button type="button" class="retro-button accent" data-nav="#/missions">미션 선택</button>
      </div>
      <div class="howto-grid">
        <article class="panel-card">
          <h3>1. HUD를 먼저 보세요</h3>
          <p>타이머, 스트라이크, 카오스 게이지와 체크리스트가 항상 현재 우선순위를 알려줍니다.</p>
        </article>
        <article class="panel-card">
          <h3>2. 진짜 방해 요소는 다음 단계를 막습니다</h3>
          <p>첨부 저장소 용량 초과, 토큰 만료처럼 실제 진행을 막는 팝업은 반드시 해결해야 합니다.</p>
        </article>
        <article class="panel-card">
          <h3>3. 가짜 팝업은 집중력을 흔듭니다</h3>
          <p>광고, 뉴스레터, 테마 변경 제안 같은 팝업은 닫고 원래 미션으로 돌아오면 됩니다.</p>
        </article>
      </div>
      <div class="tips-window">
        <h3>튜토리얼 힌트</h3>
        <ul>
          <li>버튼 문구를 읽고, 지금 해결해야 하는지 판단하세요.</li>
          <li>가짜 팝업을 잘못 누르면 시간이 줄거나 스트라이크가 쌓입니다.</li>
          <li>키보드 포커스를 따라가며 단계와 팝업을 모두 처리할 수 있습니다.</li>
        </ul>
        <button type="button" class="retro-button" data-action="tutorial-seen">튜토리얼 확인 완료</button>
      </div>
    </section>
  `;
}

function renderMissions() {
  if (missions.length === 0) {
    return `
      <section class="window-frame page-panel empty-state">
        <h2>준비 중인 미션</h2>
        <p>미션 데이터가 아직 로드되지 않았습니다. 잠시 후 다시 확인하세요.</p>
      </section>
    `;
  }

  const missionCards = missions
    .map((mission) => {
      const bestRun = appState.save.bestRuns[mission.id];
      return `
        <article class="window-frame mission-card">
          <div class="mission-card-head">
            <div>
              <p class="difficulty-chip ${mission.difficulty}">${difficultyLabel(mission.difficulty)}</p>
              <h2>${mission.title}</h2>
            </div>
            <div class="stats-inline">
              <span>${mission.timeLimitSec}초</span>
              <span>${mission.allowedStrikes} 스트라이크</span>
            </div>
          </div>
          <p>${mission.brief}</p>
          <ul class="hint-list">
            ${mission.tutorialHints.map((hint) => `<li>${hint}</li>`).join('')}
          </ul>
          <div class="mission-card-footer">
            <div>
              <strong>최고 기록</strong>
              <p>${bestRun ? `${bestRun.grade} · ${bestRun.score.toLocaleString()}점` : '아직 없음'}</p>
            </div>
            <button type="button" class="retro-button primary" data-nav="#/run/${mission.id}">브리핑 보기</button>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <section class="page-panel mission-page">
      <div class="section-heading window-frame">
        <div>
          <p class="eyebrow">MISSION SELECT</p>
          <h2>오늘 처리할 업무를 고르세요</h2>
        </div>
        <p class="mission-meta">추천 → 난이도 → 제목 순으로 정렬되어 있습니다.</p>
      </div>
      <div class="mission-grid">${missionCards}</div>
    </section>
  `;
}

function renderRun() {
  const mission = getMissionById(appState.route.missionId);
  if (!mission) {
    return renderErrorState('존재하지 않는 미션입니다.', '미션 선택으로 돌아가세요.');
  }

  if (!appState.activeRun || appState.activeRun.phase === 'briefing') {
    return `
      <section class="window-frame page-panel briefing-panel">
        <p class="eyebrow">MISSION BRIEF</p>
        <h2>${mission.title}</h2>
        <p>${mission.brief}</p>
        <div class="briefing-grid">
          <article class="panel-card">
            <h3>체크리스트</h3>
            <ol>
              ${mission.steps.map((step) => `<li>${step.label}</li>`).join('')}
            </ol>
          </article>
          <article class="panel-card">
            <h3>성공 / 실패 조건</h3>
            <ul>
              <li>제한 시간: ${mission.timeLimitSec}초</li>
              <li>허용 스트라이크: ${mission.allowedStrikes}</li>
              <li>필수 진짜 방해 요소: ${mission.requiredBlockers.length}개</li>
            </ul>
          </article>
        </div>
        <div class="cta-row">
          <button
            type="button"
            class="retro-button primary"
            data-action="start-run"
            data-mission-id="${mission.id}"
            ${!isDesktopReady() ? 'disabled' : ''}
          >
            미션 시작
          </button>
          <button type="button" class="retro-button" data-nav="#/missions">다른 미션 보기</button>
        </div>
      </section>
    `;
  }

  const runState = appState.activeRun.state;
  const currentStep = runState.mission.steps[runState.stepIndex] ?? null;

  return `
    <section class="run-layout">
      <aside class="window-frame hud-panel">
        <p class="eyebrow">LIVE HUD</p>
        <h2>${runState.mission.title}</h2>
        <dl class="hud-stats">
          <div><dt>남은 시간</dt><dd>${formatTime(runState.remainingMs)}</dd></div>
          <div><dt>스트라이크</dt><dd>${runState.strikes} / ${runState.mission.allowedStrikes}</dd></div>
          <div><dt>카오스</dt><dd>${runState.chaosPercent}%</dd></div>
          <div><dt>진짜 해결</dt><dd>${runState.realResolvedCount}</dd></div>
        </dl>
        <section>
          <h3>체크리스트</h3>
          <ol class="checklist">
            ${runState.mission.steps
              .map((step, index) => {
                const statusClass = index < runState.stepIndex ? 'done' : index === runState.stepIndex ? 'active' : '';
                return `<li class="${statusClass}"><span>${step.label}</span></li>`;
              })
              .join('')}
          </ol>
        </section>
        <section class="feedback-box" aria-live="polite">
          <h3>상황 보고</h3>
          <p>${runState.lastFeedback}</p>
        </section>
      </aside>
      <section class="workspace window-frame">
        <div class="workspace-top">
          <div>
            <p class="eyebrow">CURRENT TASK</p>
            <h2>${currentStep ? currentStep.label : '미션 판정 중'}</h2>
          </div>
          <button type="button" class="retro-button" data-nav="#/missions">미션 중단</button>
        </div>
        <div class="desk-panel">
          <article class="panel-card current-step">
            <h3>다음 행동</h3>
            <p>${currentStep ? currentStep.instruction : '모든 단계를 완료했습니다.'}</p>
            ${currentStep ? renderStepAction(currentStep) : ''}
          </article>
          <article class="panel-card mission-notes">
            <h3>미션 힌트</h3>
            <ul>
              ${runState.mission.tutorialHints.map((hint) => `<li>${hint}</li>`).join('')}
            </ul>
          </article>
        </div>
        <section class="popup-layer" aria-label="현재 팝업">
          ${runState.activePopups.map((popup, index) => renderPopup(popup, index)).join('')}
          ${runState.activePopups.length === 0 ? '<p class="quiet-note">현재 열린 팝업이 없습니다. 체크리스트를 진행하세요.</p>' : ''}
        </section>
      </section>
    </section>
  `;
}

function renderResult() {
  const result = getResultSummary(appState.route.runId);
  if (!result) {
    return renderErrorState('결과 기록을 찾을 수 없습니다.', '새 미션을 선택해 다시 플레이하세요.');
  }

  const mission = getMissionById(result.missionId);
  const bestRun = appState.save.bestRuns[result.missionId];

  return `
    <section class="window-frame page-panel result-panel">
      <p class="eyebrow">RESULT</p>
      <h2>${result.didWin ? '업무 완료!' : '업무 실패!'}</h2>
      <div class="result-hero">
        <div class="grade-badge ${result.didWin ? 'success' : 'fail'}">${result.grade}</div>
        <div>
          <p class="score-line">${result.score.toLocaleString()}점</p>
          <p>${result.didWin ? '진짜 방해 요소를 처리하고 미션을 끝냈습니다.' : result.failureReason}</p>
        </div>
      </div>
      <dl class="result-stats">
        <div><dt>남은 시간</dt><dd>${result.remainingSeconds}초</dd></div>
        <div><dt>실수 횟수</dt><dd>${result.wrongActions}</dd></div>
        <div><dt>진짜 해결</dt><dd>${result.resolvedRealPopups}</dd></div>
        <div><dt>가짜 정리</dt><dd>${result.fakeDismissed}</dd></div>
      </dl>
      <section class="panel-card">
        <h3>회고 메모</h3>
        <ul>
          <li>최고 기록: ${bestRun ? `${bestRun.grade} · ${bestRun.score.toLocaleString()}점` : '이번 런이 첫 기록입니다.'}</li>
          <li>최근 실패 원인: ${result.failureReason || '없음'}</li>
          <li>핵심 팁: 진짜 방해 요소가 뜨면 체크리스트보다 먼저 처리하세요.</li>
        </ul>
      </section>
      <div class="cta-row">
        <button type="button" class="retro-button primary" data-action="retry-run" data-mission-id="${mission?.id}">같은 미션 다시 하기</button>
        <button type="button" class="retro-button" data-nav="#/missions">다른 미션 선택</button>
      </div>
    </section>
  `;
}

function renderErrorState(title, body) {
  return `
    <section class="window-frame page-panel empty-state">
      <h2>${title}</h2>
      <p>${body}</p>
      <button type="button" class="retro-button accent" data-nav="#/missions">미션 선택</button>
    </section>
  `;
}

function renderStepAction(step) {
  if (step.actionType === 'input') {
    return `
      <form class="step-form" data-step-form>
        <label>
          <span>${step.inputLabel}</span>
          <input name="step-input" type="text" placeholder="${step.placeholder}" autocomplete="off" required />
        </label>
        <button type="submit" class="retro-button primary">단계 완료</button>
      </form>
    `;
  }

  return `
    <button type="button" class="retro-button primary" data-action="step-click">${step.actionLabel}</button>
  `;
}

function renderPopup(popup, index) {
  const offsetX = 24 + (index % 3) * 42;
  const offsetY = 18 + index * 26;
  const severityLabel = popup.severity === 'high' ? '긴급' : popup.severity === 'medium' ? '주의' : '참고';

  return `
    <article class="popup-card ${popup.severity}" style="--offset-x:${offsetX}px; --offset-y:${offsetY}px;">
      <header>
        <div>
          <p class="eyebrow">${severityLabel}</p>
          <h3>${popup.title}</h3>
        </div>
        <span class="popup-kind">${popup.truthClass === 'real' ? '진짜 의심' : '잡음'}</span>
      </header>
      <p>${popup.body}</p>
      <div class="popup-actions">
        <button
          type="button"
          class="retro-button primary"
          data-action="popup-action"
          data-popup-id="${popup.id}"
          data-response="${popup.requiredResponse}"
        >
          ${popup.resolveLabel}
        </button>
        <button
          type="button"
          class="retro-button"
          data-action="popup-action"
          data-popup-id="${popup.id}"
          data-response="dismiss"
        >
          ${popup.wrongLabel}
        </button>
      </div>
    </article>
  `;
}

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function difficultyLabel(level) {
  if (level === 'easy') return '쉬움';
  if (level === 'normal') return '보통';
  return '어려움';
}
