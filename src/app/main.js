import { missions, getMissionById } from '../data/missions/index.js';
import { track } from '../lib/analytics.js';
import { loadSave, saveRunSummary, markTutorialSeen } from '../lib/storage.js';
import { createRunState, tickRun, attemptStep, resolvePopupAction } from '../features/gameplay/engine.js';
import {
  captureActiveStepInput,
  createStepInputState,
  getStepInputKey,
  isStepInputElement,
  readStepInputDraft,
  resetStepInputState,
  restoreActiveStepInput,
  updateStepInputDraft,
} from './stepInputState.js';

const appRoot = document.querySelector('#app');
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;
const TICK_INTERVAL_MS = 1000;
const TASKBAR_HEIGHT = 46;
const MIN_VISIBLE_TITLEBAR_WIDTH = 160;
const MIN_VISIBLE_TITLEBAR_HEIGHT = 36;

const DESKTOP_ICONS = [
  { id: 'desktop-computer', kind: 'app', code: 'PC', label: 'My Computer', doubleNav: '#/' },
  { id: 'desktop-network', kind: 'network', code: 'NET', label: 'Network', doubleNav: '#/how-to-play' },
  { id: 'desktop-games', kind: 'folder', code: 'GMS', label: 'Games', doubleNav: '#/missions' },
  { id: 'desktop-bin', kind: 'trash', code: 'BIN', label: 'Recycle Bin', doubleNav: '#/' },
];

const START_MENU_ITEMS = [
  { label: 'Programs', kind: 'folder', code: 'PRG', nav: '#/missions' },
  { label: 'Documents', kind: 'doc', code: 'TXT', nav: '#/how-to-play' },
  { label: 'Find', kind: 'network', code: 'FND', nav: '#/missions' },
  { label: 'Help', kind: 'doc', code: 'HLP', nav: '#/how-to-play' },
  { label: 'Run...', kind: 'app', code: 'RUN', nav: '#/missions' },
  { separator: true },
  { label: 'Shut Down...', kind: 'trash', code: 'OFF', nav: '#/' },
];

const WINDOW_DEFAULTS = {
  'boot-window': { x: 420, y: 154, z: 20 },
  'landing-welcome': { x: 156, y: 82, z: 12 },
  'landing-preview': { x: 736, y: 130, z: 11 },
  'games-folder': { x: 272, y: 86, z: 14 },
  'popup-hell-launcher': { x: 348, y: 76, z: 16 },
  'briefing-window': { x: 320, y: 68, z: 16 },
  'run-hud': { x: 52, y: 68, z: 15 },
  'run-workspace': { x: 400, y: 68, z: 16 },
  'result-window': { x: 352, y: 86, z: 16 },
  'error-window': { x: 340, y: 120, z: 18 },
};

const appState = {
  booting: true,
  route: parseRoute(),
  save: loadSave(),
  activeRun: null,
  lastResult: null,
  startMenuOpen: false,
  selectedMissionId: missions[0]?.id ?? null,
  officeMailUi: createOfficeMailUiState(),
  stepInput: createStepInputState(),
  windowState: {
    nextZ: 30,
    positions: {},
    openWindows: [],
  },
};

let tickerHandle = null;
let activeDrag = null;

window.setTimeout(() => {
  appState.booting = false;
  syncRouteState();
  render();
}, 360);

window.addEventListener('hashchange', handleHashChange);
window.addEventListener('resize', handleResize);
window.addEventListener('keydown', handleGlobalKeydown);
document.addEventListener('mousemove', handlePointerMove);
document.addEventListener('mouseup', handlePointerUp);
appRoot.addEventListener('click', handleClick);
appRoot.addEventListener('dblclick', handleDoubleClick);
appRoot.addEventListener('input', handleInput);
appRoot.addEventListener('submit', handleSubmit);

syncRouteState();
render();

function createOfficeMailUiState() {
  return {
    noteContent: '',
    saveDialogOpen: false,
    selectedFolder: '문서/긴급제출',
    fileName: '',
    savedFileName: '',
    savedFolder: '',
    mailComposerOpen: false,
    subject: '',
    selectedAttachment: '',
    attachmentPickerOpen: false,
    selectedAttachmentFolder: '문서/긴급제출_백업',
    ccAddress: '',
    statusMessage: '',
  };
}

function resetOfficeMailUi() {
  appState.officeMailUi = createOfficeMailUiState();
}

function parseRoute() {
  const rawHash = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryString = ''] = rawHash.split('?');
  const params = new URLSearchParams(queryString);
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const segments = path.split('/').filter(Boolean);

  if (segments[0] === 'how-to-play') {
    return { page: 'how-to-play', missionId: params.get('mission') || null };
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
  if (appState.route.page === 'landing') {
    ensureWindowOpen('landing-welcome');
    ensureWindowOpen('landing-preview');
  }

  if (appState.route.page === 'missions') {
    ensureWindowOpen('games-folder');
    bringWindowToFront('games-folder');
  }

  if (appState.route.page === 'how-to-play' && appState.route.missionId) {
    appState.selectedMissionId = appState.route.missionId;
    ensureWindowOpen('games-folder');
    ensureWindowOpen('popup-hell-launcher');
    ensureWindowState('games-folder', WINDOW_DEFAULTS['games-folder']);
    bringWindowToFront('popup-hell-launcher');
  }

  if (appState.route.page === 'run') {
    const mission = getMissionById(appState.route.missionId);
    if (!mission) {
      return;
    }

    appState.selectedMissionId = mission.id;

    if (!appState.activeRun || appState.activeRun.mission.id !== mission.id || appState.activeRun.phase === 'result') {
      appState.activeRun = {
        mission,
        phase: 'briefing',
        state: null,
      };
    }

    if (appState.activeRun.phase === 'briefing') {
      ensureWindowOpen('briefing-window');
      closeWindow('run-hud');
      closeWindow('run-workspace');
    } else {
      ensureWindowOpen('run-hud');
      ensureWindowOpen('run-workspace');
      closeWindow('briefing-window');
    }

    bringWindowToFront(appState.activeRun.phase === 'briefing' ? 'briefing-window' : 'run-workspace');

    return;
  }

  if (appState.route.page === 'result' && appState.activeRun) {
    appState.activeRun.phase = 'result';
    ensureWindowOpen('result-window');
    closeWindow('briefing-window');
    closeWindow('run-hud');
    closeWindow('run-workspace');
    bringWindowToFront('result-window');
  }

  if (appState.route.page !== 'run') {
    resetStepInputState(appState.stepInput);
  }

  if (appState.route.page !== 'run' && appState.route.page !== 'how-to-play') {
    resetOfficeMailUi();
  }
}

function navigate(nextHash) {
  const normalized = nextHash.startsWith('#') ? nextHash : `#${nextHash}`;
  appState.startMenuOpen = false;

  if (window.location.hash === normalized) {
    appState.route = parseRoute();
    syncRouteState();
    render();
    return;
  }

  window.location.hash = normalized;
}

function handleHashChange() {
  appState.startMenuOpen = false;
  appState.route = parseRoute();
  syncRouteState();
  render();
}

function handleResize() {
  render();
}

function handleGlobalKeydown(event) {
  const interactive = document.activeElement?.closest?.('[data-double-nav]');
  if (event.key === 'Enter' && interactive?.dataset?.doubleNav) {
    event.preventDefault();
    if (interactive.dataset.missionId) {
      appState.selectedMissionId = interactive.dataset.missionId;
    }
    navigate(interactive.dataset.doubleNav);
    return;
  }

  if (event.key === 'Escape' && appState.startMenuOpen) {
    appState.startMenuOpen = false;
    render();
    return;
  }

  if (event.key === 'Escape' && appState.route.page === 'run' && appState.activeRun?.state?.activePopups.length) {
    const firstDismissible = appState.activeRun.state.activePopups.find((popup) => popup.requiredResponse === 'dismiss');
    if (firstDismissible) {
      onResolvePopup(firstDismissible.id, 'dismiss');
    }
  }
}

function handleClick(event) {
  let shouldRender = false;
  if (
    appState.startMenuOpen &&
    !event.target.closest('.start-menu') &&
    !event.target.closest('[data-action="toggle-start-menu"]')
  ) {
    appState.startMenuOpen = false;
    shouldRender = true;
  }

  const target = event.target.closest('[data-action], [data-nav]');
  if (!target) {
    if (shouldRender) {
      render();
    }
    return;
  }

  if (target.dataset.nav) {
    if (target.dataset.missionId) {
      appState.selectedMissionId = target.dataset.missionId;
    }
    navigate(target.dataset.nav);
    return;
  }

  const action = target.dataset.action;
  if (action === 'toggle-start-menu') {
    appState.startMenuOpen = !appState.startMenuOpen;
    render();
    return;
  }

  if (action === 'close-window' && target.dataset.windowIdTarget) {
    closeWindow(target.dataset.windowIdTarget);
    render();
    return;
  }

  if (action === 'minimize-window' && target.dataset.windowIdTarget) {
    const windowState = ensureWindowState(target.dataset.windowIdTarget, WINDOW_DEFAULTS[target.dataset.windowIdTarget]);
    windowState.minimized = true;
    render();
    return;
  }

  if (action === 'toggle-maximize-window' && target.dataset.windowIdTarget) {
    const windowId = target.dataset.windowIdTarget;
    const windowState = ensureWindowState(windowId, WINDOW_DEFAULTS[windowId]);

    if (windowState.maximized) {
      windowState.maximized = false;
      windowState.x = windowState.restoreX ?? WINDOW_DEFAULTS[windowId]?.x ?? 120;
      windowState.y = windowState.restoreY ?? WINDOW_DEFAULTS[windowId]?.y ?? 72;
    } else {
      windowState.restoreX = windowState.x;
      windowState.restoreY = windowState.y;
      windowState.maximized = true;
      windowState.minimized = false;
      bringWindowToFront(windowId);
    }

    render();
    return;
  }

  if (action === 'focus-window' && target.dataset.taskWindowId) {
    const windowId = target.dataset.taskWindowId;
    const windowState = ensureWindowState(windowId, WINDOW_DEFAULTS[windowId]);
    const activeWindowId = getActiveWindowId()?.id ?? '';

    if (windowState.minimized) {
      windowState.minimized = false;
      bringWindowToFront(windowId);
    } else if (activeWindowId === windowId) {
      windowState.minimized = true;
    } else {
      bringWindowToFront(windowId);
    }

    render();
    return;
  }

  if (action === 'select-mission' && target.dataset.missionId) {
    appState.selectedMissionId = target.dataset.missionId;
    render();
    return;
  }

  if (action === 'select-launcher-mission' && target.dataset.missionId) {
    appState.selectedMissionId = target.dataset.missionId;
    render();
    return;
  }

  if (action === 'open-save-dialog') {
    appState.officeMailUi.saveDialogOpen = true;
    render();
    return;
  }

  if (action === 'select-save-folder' && target.dataset.folderName) {
    appState.officeMailUi.selectedFolder = target.dataset.folderName;
    render();
    return;
  }

  if (action === 'select-attachment-folder' && target.dataset.folderName) {
    appState.officeMailUi.selectedAttachmentFolder = target.dataset.folderName;
    appState.officeMailUi.selectedAttachment = '';
    render();
    return;
  }

  if (action === 'save-note-as') {
    const scenario = getOfficeMailScenario();
    if (!scenario) {
      return;
    }

    const noteContent = appState.officeMailUi.noteContent.trim();
    if (noteContent.length < 12) {
      appState.officeMailUi.statusMessage = '메모장에 이력서 내용을 조금 더 작성해야 합니다.';
      render();
      return;
    }

    if (!officeMailNoteHasRequiredKeywords(noteContent)) {
      appState.officeMailUi.statusMessage = `메모에는 ${scenario.noteRequiredKeywords.join(', ')} 키워드가 모두 들어가야 합니다.`;
      onAttemptStep({ confirmed: true, valid: false });
      return;
    }

    if (appState.officeMailUi.selectedFolder !== scenario.requiredFolder) {
      appState.officeMailUi.statusMessage = `${scenario.requiredFolder} 폴더에 저장해야 합니다.`;
      onAttemptStep({ confirmed: true, valid: false });
      return;
    }

    if (appState.officeMailUi.fileName.trim() !== scenario.requiredFileName) {
      appState.officeMailUi.statusMessage = `파일명은 ${scenario.requiredFileName} 이어야 합니다.`;
      onAttemptStep({ confirmed: true, valid: false });
      return;
    }

    appState.officeMailUi.savedFileName = scenario.requiredFileName;
    appState.officeMailUi.savedFolder = scenario.requiredFolder;
    appState.officeMailUi.saveDialogOpen = false;
    appState.officeMailUi.statusMessage = `${scenario.requiredFolder} 폴더에 ${scenario.requiredFileName} 저장 완료`;
    onAttemptStep({ confirmed: true });
    return;
  }

  if (action === 'open-mail-compose') {
    appState.officeMailUi.mailComposerOpen = true;
    render();
    return;
  }

  if (action === 'open-attachment-picker') {
    appState.officeMailUi.attachmentPickerOpen = true;
    render();
    return;
  }

  if (action === 'select-attachment-file' && target.dataset.fileName) {
    appState.officeMailUi.selectedAttachment = target.dataset.fileName;
    render();
    return;
  }

  if (action === 'confirm-attachment') {
    const scenario = getOfficeMailScenario();
    if (!scenario) {
      return;
    }

    if (currentStepId() !== 'attach-resume') {
      appState.officeMailUi.attachmentPickerOpen = false;
      appState.officeMailUi.statusMessage = `${appState.officeMailUi.selectedAttachment || '선택된 파일 없음'} 후보를 미리 확인했습니다.`;
      render();
      return;
    }

    if (!isOfficeMailAttachmentValid()) {
      appState.officeMailUi.statusMessage = `동명이인 파일 또는 잘못된 폴더를 선택했습니다. ${scenario.requiredFolder}의 ${scenario.requiredFileName} 파일만 첨부할 수 있습니다.`;
      onAttemptStep({ confirmed: true, valid: false });
      return;
    }

    appState.officeMailUi.attachmentPickerOpen = false;
    appState.officeMailUi.statusMessage = `${scenario.requiredFileName} 첨부 완료`;
    onAttemptStep({ confirmed: true });
    return;
  }

  if (action === 'launcher-play' && target.dataset.missionId) {
    startRun(target.dataset.missionId);
    navigate(`#/run/${target.dataset.missionId}`);
    return;
  }

  if (action === 'start-run') {
    startRun(target.dataset.missionId);
    return;
  }

  if (action === 'tutorial-seen') {
    appState.save = markTutorialSeen();
    render();
    return;
  }

  if (action === 'step-click') {
    event.preventDefault();
    if (currentStepId() === 'send-mail') {
      const sendReady = isOfficeMailSubjectValid() && isOfficeMailAttachmentValid() && isOfficeMailCcValid();
      if (!sendReady) {
        appState.officeMailUi.statusMessage = '제목, 정확한 첨부 파일, CC 주소를 모두 확인한 뒤 발송해야 합니다.';
      }
      onAttemptStep({ confirmed: true, valid: sendReady });
      return;
    }

    onAttemptStep({ confirmed: true });
    return;
  }

  if (action === 'popup-action') {
    event.preventDefault();
    onResolvePopup(target.dataset.popupId, target.dataset.response);
    return;
  }

  if (action === 'retry-run') {
    startRun(target.dataset.missionId);
    navigate(`#/run/${target.dataset.missionId}`);
    return;
  }

  if (shouldRender) {
    render();
  }
}

function handleDoubleClick(event) {
  const target = event.target.closest('[data-double-nav]');
  if (!target?.dataset.doubleNav) {
    return;
  }

  if (target.dataset.missionId) {
    appState.selectedMissionId = target.dataset.missionId;
  }

  navigate(target.dataset.doubleNav);
}

function handlePointerMove(event) {
  if (!activeDrag) {
    return;
  }

  const dragState = ensureWindowState(activeDrag.windowId, WINDOW_DEFAULTS[activeDrag.windowId]);
  if (dragState.maximized) {
    return;
  }

  const windowStack = appRoot.querySelector('.window-stack');
  const desktopCanvas = appRoot.querySelector('.desktop-canvas');
  const desktopRect = windowStack?.getBoundingClientRect() ?? desktopCanvas?.getBoundingClientRect() ?? {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight - TASKBAR_HEIGHT,
  };

  const nextX = event.clientX - desktopRect.left - activeDrag.offsetX;
  const nextY = event.clientY - desktopRect.top - activeDrag.offsetY;
  const maxX = Math.max(12, window.innerWidth - desktopRect.left - MIN_VISIBLE_TITLEBAR_WIDTH);
  const maxY = Math.max(12, window.innerHeight - TASKBAR_HEIGHT - desktopRect.top - MIN_VISIBLE_TITLEBAR_HEIGHT);
  const position = dragState;
  position.x = clamp(nextX, 12, maxX);
  position.y = clamp(nextY, 12, maxY);

  const frame = appRoot.querySelector(`[data-window-id="${activeDrag.windowId}"]`);
  if (frame) {
    frame.style.left = `${position.x}px`;
    frame.style.top = `${position.y}px`;
  }
}

function handlePointerUp() {
  activeDrag = null;
}

function handleSubmit(event) {
  const officeSubjectForm = event.target.closest('[data-office-subject-form]');
  if (officeSubjectForm) {
    event.preventDefault();
    if (!isOfficeMailSubjectValid()) {
      appState.officeMailUi.statusMessage = '제목은 고정 가이드를 그대로 따라 입력해야 합니다.';
      render();
      return;
    }

    if (currentStepId() !== 'compose-mail-subject') {
      appState.officeMailUi.statusMessage = '제목 초안을 미리 작성해 두었습니다.';
      render();
      return;
    }
    onAttemptStep({ value: appState.officeMailUi.subject, confirmed: true });
    return;
  }

  const officeCcForm = event.target.closest('[data-office-cc-form]');
  if (officeCcForm) {
    event.preventDefault();
    if (!isOfficeMailCcValid()) {
      appState.officeMailUi.statusMessage = 'CC는 ops@retro.company 주소로 정확히 입력해야 합니다.';
      render();
      return;
    }

    if (currentStepId() !== 'cc-ops') {
      appState.officeMailUi.statusMessage = '참조 주소를 미리 입력해 두었습니다.';
      render();
      return;
    }
    onAttemptStep({ value: appState.officeMailUi.ccAddress, confirmed: true });
    return;
  }

  const form = event.target.closest('[data-step-form]');
  if (!form) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(form);
  const value = formData.get('step-input');
  onAttemptStep({ value, confirmed: true });
}

function handleInput(event) {
  if (event.target.dataset.officeField === 'note-content') {
    appState.officeMailUi.noteContent = event.target.value;
    return;
  }

  if (event.target.dataset.officeField === 'save-file-name') {
    appState.officeMailUi.fileName = event.target.value;
    return;
  }

  if (event.target.dataset.officeField === 'mail-subject') {
    appState.officeMailUi.subject = event.target.value;
    return;
  }

  if (event.target.dataset.officeField === 'cc-address') {
    appState.officeMailUi.ccAddress = event.target.value;
    return;
  }

  if (!isStepInputElement(event.target)) {
    return;
  }

  const key = event.target.dataset.stepKey || null;
  updateStepInputDraft(appState.stepInput, key, event.target.value);
}

function startRun(missionId) {
  const mission = getMissionById(missionId);
  if (!mission) {
    render();
    return;
  }

  const state = createRunState(mission);
  appState.activeRun = {
    mission,
    phase: 'running',
    state,
  };
  appState.selectedMissionId = mission.id;
  resetOfficeMailUi();
  ensureWindowOpen('games-folder');
  ensureWindowOpen('popup-hell-launcher');
  ensureWindowOpen('run-hud');
  ensureWindowOpen('run-workspace');
  ensureWindowState('games-folder', WINDOW_DEFAULTS['games-folder']).minimized = true;
  ensureWindowState('popup-hell-launcher', WINDOW_DEFAULTS['popup-hell-launcher']).minimized = true;
  closeWindow('briefing-window');
  resetStepInputState(appState.stepInput);

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
  }, TICK_INTERVAL_MS);
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

  resetStepInputState(appState.stepInput);
  appState.save = saveRunSummary(runState.scoreSummary);
  appState.lastResult = runState.scoreSummary;
  track(runState.status === 'won' ? 'mission_cleared' : 'mission_failed', {
    missionId: runState.mission.id,
    runId: runState.runId,
    grade: runState.scoreSummary.grade,
  });
  navigate(`#/result/${runState.runId}`);
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

function ensureWindowState(windowId, defaults = {}) {
  if (!appState.windowState.positions[windowId]) {
    const z = defaults.z ?? appState.windowState.nextZ + 1;
    appState.windowState.positions[windowId] = {
      x: defaults.x ?? 160,
      y: defaults.y ?? 80,
      z,
      minimized: false,
      maximized: false,
      restoreX: null,
      restoreY: null,
    };
    appState.windowState.nextZ = Math.max(appState.windowState.nextZ, z);
  }

  return appState.windowState.positions[windowId];
}

function ensureWindowOpen(windowId) {
  if (!appState.windowState.openWindows.includes(windowId)) {
    appState.windowState.openWindows.push(windowId);
  }
  ensureWindowState(windowId, WINDOW_DEFAULTS[windowId]);
}

function closeWindow(windowId) {
  appState.windowState.openWindows = appState.windowState.openWindows.filter((entry) => entry !== windowId);
}

function bringWindowToFront(windowId) {
  if (!windowId) {
    return;
  }

  const current = ensureWindowState(windowId, WINDOW_DEFAULTS[windowId]);
  current.minimized = false;
  appState.windowState.nextZ += 1;
  current.z = appState.windowState.nextZ;
}

function getWindowStyle(windowId, defaults, extraStyle = '') {
  const position = ensureWindowState(windowId, defaults);
  const visibilityStyle = position.minimized ? 'display:none;' : '';
  const geometryStyle = position.maximized
    ? 'left:0; top:0; width:calc(100vw - 208px); height:calc(100vh - 134px); max-width:none; max-height:none;'
    : `left:${position.x}px; top:${position.y}px;`;
  const sizeStyle = position.maximized ? '' : extraStyle;
  return `${geometryStyle} z-index:${position.z}; ${visibilityStyle} ${sizeStyle}`;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isDesktopReady() {
  return window.innerWidth >= MIN_WIDTH && window.innerHeight >= MIN_HEIGHT;
}

function getSelectedMission() {
  return getMissionById(appState.selectedMissionId) ?? missions[0] ?? null;
}

function currentStepId() {
  return appState.activeRun?.state?.mission?.steps?.[appState.activeRun.state.stepIndex]?.id ?? null;
}

function getOfficeMailScenario() {
  return getSelectedMission()?.officeMailScenario ?? null;
}

function getOfficeAttachmentChoices() {
  const scenario = getOfficeMailScenario();
  if (!scenario) {
    return [];
  }

  return scenario.attachmentFolderFiles?.[appState.officeMailUi.selectedAttachmentFolder] ?? [];
}

function officeMailNoteHasRequiredKeywords(noteContent) {
  const scenario = getOfficeMailScenario();
  if (!scenario) {
    return true;
  }

  return scenario.noteRequiredKeywords.every((keyword) => noteContent.includes(keyword));
}

function isOfficeMailSubjectValid() {
  const scenario = getOfficeMailScenario();
  return Boolean(scenario) && appState.officeMailUi.subject.trim() === scenario.requiredSubject;
}

function isOfficeMailAttachmentValid() {
  const scenario = getOfficeMailScenario();
  return Boolean(scenario)
    && appState.officeMailUi.selectedAttachmentFolder === scenario.requiredFolder
    && appState.officeMailUi.selectedAttachment === scenario.requiredFileName;
}

function isOfficeMailCcValid() {
  const scenario = getOfficeMailScenario();
  return Boolean(scenario) && appState.officeMailUi.ccAddress.trim() === scenario.requiredCc;
}

function getResultSummary(runId) {
  if (appState.lastResult?.runId === runId) {
    return appState.lastResult;
  }

  return appState.save.recentRuns.find((entry) => entry.runId === runId) ?? null;
}

function getTaskbarWindows() {
  const byId = {
    'boot-window': { id: 'boot-window', label: 'Boot', kind: 'app', code: 'SYS' },
    'landing-welcome': { id: 'landing-welcome', label: 'Welcome', kind: 'app', code: 'SYS' },
    'landing-preview': { id: 'landing-preview', label: 'Mission Stack', kind: 'doc', code: 'TXT' },
    'games-folder': { id: 'games-folder', label: 'Games', kind: 'folder', code: 'DIR' },
    'popup-hell-launcher': { id: 'popup-hell-launcher', label: 'Popup Hell.exe', kind: 'app', code: 'EXE' },
    'briefing-window': { id: 'briefing-window', label: 'Mission Brief', kind: 'doc', code: 'BRF' },
    'run-hud': { id: 'run-hud', label: 'Mission HUD', kind: 'app', code: 'HUD' },
    'run-workspace': {
      id: 'run-workspace',
      label: appState.activeRun?.mission?.title ?? 'Mission Workspace',
      kind: 'app',
      code: 'RUN',
    },
    'result-window': { id: 'result-window', label: 'After Action Report', kind: 'doc', code: 'RPT' },
    'error-window': { id: 'error-window', label: 'System Notice', kind: 'doc', code: 'ERR' },
  };

  const openIds = appState.booting ? ['boot-window'] : appState.windowState.openWindows;
  return openIds.map((id) => byId[id]).filter(Boolean);
}

function getActiveWindowId() {
  return getTaskbarWindows()
    .map((item) => ({ id: item.id, state: ensureWindowState(item.id, WINDOW_DEFAULTS[item.id]) }))
    .filter((item) => !item.state.minimized)
    .map((item) => ({ id: item.id, z: item.state.z }))
    .sort((left, right) => right.z - left.z)[0] ?? null;
}

function formatClock() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
}

function render() {
  captureActiveStepInput(appRoot, appState.stepInput);

  const viewportNotice = !isDesktopReady()
    ? `
      <aside class="resolution-warning" role="status" aria-live="polite">
        <strong>PC 전용 화면</strong>
        <span>${MIN_WIDTH}×${MIN_HEIGHT} 이상에서 플레이하세요.</span>
      </aside>
    `
    : '';

  const windows = renderOpenWindows();

  appRoot.innerHTML = `
    <div class="os-shell">
      <div class="desktop-shell">
        ${renderDesktopIcons()}
        <main class="desktop-canvas">
          ${viewportNotice}
          ${renderDesktopHelp()}
          <div class="window-stack">
            ${windows}
          </div>
        </main>
        ${appState.startMenuOpen ? renderStartMenu() : ''}
      </div>
      ${renderTaskbar()}
    </div>
  `;

  restoreActiveStepInput(appRoot, appState.stepInput);
  bindWindowChrome();
}

function bindWindowChrome() {
  const frames = appRoot.querySelectorAll('[data-window-id]');
  for (const frame of frames) {
    if (!(frame instanceof HTMLElement) || !frame.classList.contains('desktop-window')) {
      continue;
    }

    const windowId = frame.dataset.windowId;
    if (!windowId) {
      continue;
    }

    frame.addEventListener('mousedown', () => {
      bringWindowToFront(windowId);
      frame.style.zIndex = String(ensureWindowState(windowId, WINDOW_DEFAULTS[windowId]).z);
      frame.style.display = '';
    });

    const handle = frame.querySelector('[data-window-drag-handle]');
    if (!(handle instanceof HTMLElement)) {
      continue;
    }

    handle.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || event.target.closest('.window-control')) {
        return;
      }

      const rect = frame.getBoundingClientRect();
      activeDrag = {
        windowId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        width: rect.width,
        height: rect.height,
      };
      event.preventDefault();
    });
  }
}

function renderOpenWindows() {
  const openIds = appState.booting ? ['boot-window'] : appState.windowState.openWindows;
  return openIds.map((windowId) => renderWindowById(windowId)).filter(Boolean).join('');
}

function renderWindowById(windowId) {
  if (windowId === 'boot-window') return renderBoot();
  if (windowId === 'landing-welcome') return renderLandingWelcomeWindow();
  if (windowId === 'landing-preview') return renderLandingPreviewWindow();
  if (windowId === 'games-folder') return renderMissionsWindow();
  if (windowId === 'popup-hell-launcher') return renderLauncherWindow();
  if (windowId === 'briefing-window' || windowId === 'run-hud' || windowId === 'run-workspace') return renderRunWindow(windowId);
  if (windowId === 'result-window') return renderResultWindow();
  if (windowId === 'error-window') return renderErrorState('SYSTEM NOTICE', '오류 상태가 감지되었습니다.');
  return '';
}

function renderDesktopIcons() {
  return `
    <section class="desktop-icons" aria-label="바탕화면 아이콘">
      ${DESKTOP_ICONS.map((icon) => `
        <button
          type="button"
          class="desktop-icon"
          data-desktop-icon="${icon.kind === 'folder' ? 'games-folder' : icon.id}"
          data-double-nav="${icon.doubleNav}"
          aria-label="${icon.label}"
        >
          ${renderSystemIcon(icon.kind, icon.code)}
          <span class="desktop-icon__label">${icon.label}</span>
        </button>
      `).join('')}
    </section>
  `;
}

function renderDesktopHelp() {
  const helpText = appState.route.page === 'landing'
    ? 'Games 폴더를 더블클릭하거나 Start 메뉴의 Programs로 들어갈 수 있습니다.'
    : '창 제목 표시줄을 드래그해서 원하는 위치로 옮길 수 있습니다.';

  return `
    <aside class="desktop-help desktop-note" aria-live="polite">
      <p>${helpText}</p>
    </aside>
  `;
}

function renderStartMenu() {
  return `
    <section class="start-menu" aria-label="시작 메뉴">
      <div class="start-menu__banner" aria-hidden="true">
        <span>SYSTEM_X86</span>
      </div>
      <div class="start-menu__list">
        ${START_MENU_ITEMS.map((item) => {
          if (item.separator) {
            return '<div class="start-menu__separator" aria-hidden="true"></div>';
          }

          return `
            <button type="button" class="start-menu__item" data-nav="${item.nav}">
              ${renderSystemIcon(item.kind, item.code, true)}
              <span>${item.label}</span>
            </button>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function renderTaskbar() {
  const taskbarWindows = getTaskbarWindows();
  const activeId = getActiveWindowId()?.id ?? '';

  return `
    <footer class="taskbar" data-taskbar aria-label="작업 표시줄">
      <button type="button" class="taskbar-button start-button ${appState.startMenuOpen ? 'is-active' : ''}" data-action="toggle-start-menu">
        ${renderSystemIcon('app', 'SYS', true)}
        <span>Start</span>
      </button>
      <div class="taskbar-divider" aria-hidden="true"></div>
      <div class="taskbar__items">
        ${taskbarWindows.map((item) => `
            <button
              type="button"
              class="taskbar-button ${item.id === activeId ? 'is-active' : ''}"
              data-action="focus-window"
              data-task-window-id="${item.id}"
            >
            ${renderSystemIcon(item.kind, item.code, true)}
            <span>${item.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="tray">
        ${renderSystemIcon('app', 'CLK', true)}
        <span>${formatClock()}</span>
      </div>
    </footer>
  `;
}

function renderWindow({
  windowId,
  title,
  kind,
  code,
  width,
  className = '',
  bodyClass = '',
  menuItems = [],
  statusLeft = '',
  statusRight = '',
  closeNav = '#/',
  body,
}) {
  const state = ensureWindowState(windowId, WINDOW_DEFAULTS[windowId]);

  return `
    <section
      class="desktop-window ${className} ${state.maximized ? 'is-maximized' : ''}"
      data-window-id="${windowId}"
      style="${getWindowStyle(windowId, WINDOW_DEFAULTS[windowId], `width:${width};`)}"
    >
      <header class="window-titlebar" data-window-drag-handle>
        <div class="window-titlebar__label">
          ${renderSystemIcon(kind, code, true)}
          <strong>${title}</strong>
        </div>
        <div class="window-controls">
          <button type="button" class="window-control" data-action="minimize-window" data-window-id-target="${windowId}" aria-label="창 최소화">_</button>
          <button type="button" class="window-control" data-action="toggle-maximize-window" data-window-id-target="${windowId}" aria-label="창 최대화">${state.maximized ? '❐' : '□'}</button>
          <button type="button" class="window-control" data-action="close-window" data-window-id-target="${windowId}" aria-label="창 닫기">×</button>
        </div>
      </header>
      ${menuItems.length > 0 ? `<div class="window-menubar">${menuItems.map((item) => `<span>${item}</span>`).join('')}</div>` : ''}
      <div class="window-body ${bodyClass}">
        ${body}
      </div>
      ${statusLeft || statusRight ? `<footer class="window-statusbar"><span>${statusLeft}</span><span>${statusRight}</span></footer>` : ''}
    </section>
  `;
}

function renderSystemIcon(kind, code, small = false) {
  const className = small ? 'system-icon--small' : 'system-icon';
  return `<span class="${className} ${kind}" aria-hidden="true"><span>${code}</span></span>`;
}

function renderBoot() {
  return renderWindow({
    windowId: 'boot-window',
    title: 'BOOT SEQUENCE',
    kind: 'app',
    code: 'SYS',
    width: 'min(420px, calc(100vw - 64px))',
    closeNav: '#/',
    body: `
      <div class="desktop-note">
        <p class="eyebrow">SYSTEM BOOT</p>
        <h2>CRT 워밍업 중...</h2>
        <p>업무 혼란 시뮬레이터를 준비하고 있습니다.</p>
      </div>
    `,
  });
}

function renderLandingWelcomeWindow() {
  return renderWindow({
    windowId: 'landing-welcome',
    title: 'SYSTEM_X86 Desktop',
    kind: 'app',
    code: 'SYS',
    width: 'min(740px, calc(100vw - 320px))',
    closeNav: '#/',
    className: 'landing-window',
    body: `
      <section class="landing-panel">
        <p class="eyebrow">PC ONLY · 2~3분 세션</p>
        <h1>모든 팝업을 치우지 마세요.<br />진짜 문제만 해결하세요.</h1>
        <p class="landing-panel__copy">
          Error Popup Hell은 가짜 알림과 진짜 방해 요소를 구분하면서 제한 시간 안에 업무형 미션을 끝내는
          레트로 웹 게임입니다.
        </p>
        <div class="landing-actions">
          <button type="button" class="retro-button primary" data-nav="#/missions">게임 시작</button>
          <button type="button" class="retro-button secondary" data-nav="#/how-to-play">플레이 방법 보기</button>
        </div>
        <ul class="landing-rule-list">
          <li>진짜 방해 요소를 먼저 해결하지 않으면 핵심 단계가 막힙니다.</li>
          <li>가짜 팝업에 휘둘리면 시간 손실 또는 스트라이크가 쌓입니다.</li>
          <li>Games 폴더를 더블클릭하면 실제 윈도우처럼 화면을 열 수 있습니다.</li>
        </ul>
      </section>
    `,
  });
}

function renderLandingPreviewWindow() {
  const highlightedMissions = missions.slice(0, 2)
    .map((mission) => `
      <article class="panel-card mission-preview">
        <p class="difficulty-chip ${mission.difficulty}">${difficultyLabel(mission.difficulty)}</p>
        <h3>${mission.title}</h3>
        <p>${mission.brief}</p>
        <dl class="mission-preview__stats">
          <div><dt>제한 시간</dt><dd>${mission.timeLimitSec}초</dd></div>
          <div><dt>예상 플레이</dt><dd>${mission.estimatedMinutes}분</dd></div>
        </dl>
      </article>
    `)
    .join('');

  return renderWindow({
    windowId: 'landing-preview',
    title: 'MISSION STACK',
    kind: 'doc',
    code: 'TXT',
    width: 'min(320px, calc(100vw - 88px))',
    closeNav: '#/',
    className: 'landing-sidebar-window',
    body: `
      <section class="preview-stack">
        <article class="info-card">
          <p class="eyebrow">FAIL STATES</p>
          <h2>실패 조건</h2>
          <ul>
            <li>제한 시간 종료</li>
            <li>스트라이크 초과</li>
            <li>필수 진짜 방해 요소 미해결 상태로 마지막 단계 시도</li>
          </ul>
        </article>
        <article class="mission-preview-list">
          <p class="eyebrow">MISSION STACK</p>
          <h2>대표 미션</h2>
          ${highlightedMissions}
        </article>
      </section>
    `,
  });
}

function renderLauncherWindow() {
  const mission = getMissionById(appState.route.missionId) ?? getSelectedMission();
  if (!mission) {
    return renderErrorState('실행할 미션을 찾을 수 없습니다.', 'Games 폴더에서 다시 선택해 주세요.');
  }

  const filledSegments = Math.min(15, 9 + mission.requiredBlockers.length * 2 + (appState.save.tutorialSeen ? 2 : 0));

  return renderWindow({
    windowId: 'popup-hell-launcher',
    title: 'Popup Hell - v1.0',
    kind: 'app',
    code: 'EXE',
    width: 'min(760px, calc(100vw - 160px))',
    className: 'launcher-window',
    closeNav: '#/missions',
    bodyClass: 'launcher-body',
    body: `
      <div class="launcher-headline">
        <h1>Popup Hell</h1>
        <p>Version 1.0.4.2 [RELEASE]</p>
      </div>
      <div>
        <p class="eyebrow">MISSION SELECT</p>
        <h2>오늘 처리할 업무를 고르세요</h2>
      </div>
      <div class="launcher-readme">
        <p class="eyebrow">README.TXT</p>
        <div class="launcher-readme__body">
          <p>
            Welcome to Popup Hell v1.0.<br /><br />
            ${mission.title} 미션을 실행합니다. ${mission.brief}<br /><br />
            WARNING: Prolonged exposure may result in unexpected systemic behavior, localized temporal distortion,
            and a sudden urge to defragment your hard drive.<br /><br />
            Hint 01: ${mission.tutorialHints[0]}<br /><br />
            Hint 02: ${mission.tutorialHints[1]}
          </p>
        </div>
      </div>
      <div class="launcher-mission-picker" aria-label="실행 대상 미션">
        ${missions.map((entry) => `
          <button
            type="button"
            class="retro-button ${entry.id === mission.id ? 'primary' : 'secondary'}"
            data-action="select-launcher-mission"
            data-mission-id="${entry.id}"
          >
            ${entry.title}
          </button>
        `).join('')}
      </div>
      <div class="launcher-progress">
        <div class="launcher-progress__meta">
          <span>Loading Assets...</span>
          <span>${Math.round((filledSegments / 15) * 100)}%</span>
        </div>
        <div class="launcher-progress__bar" aria-hidden="true">
          ${Array.from({ length: 15 }, (_, index) => `
            <span class="launcher-progress__segment ${index < filledSegments ? 'is-filled' : ''}"></span>
          `).join('')}
        </div>
      </div>
      <div class="launcher-footer">
        <div class="launcher-toggle">
          <span class="launcher-toggle__box" aria-hidden="true"></span>
          <span>Run in windowed mode</span>
        </div>
        <div class="launcher-actions">
          <button type="button" class="retro-button secondary" data-nav="#/run/${mission.id}">브리핑 보기</button>
          <button type="button" class="retro-button primary" data-action="launcher-play" data-mission-id="${mission.id}">PLAY</button>
        </div>
      </div>
    `,
  });
}

function renderMissionsWindow(options = {}) {
  const selectedMission = getSelectedMission();
  const closeNav = options.closeNav ?? '#/';
  const showOpenLauncherButton = options.showOpenLauncherButton ?? true;

  if (!selectedMission) {
    return '';
  }

  return renderWindow({
    windowId: 'games-folder',
    title: 'Games',
    kind: 'folder',
    code: 'DIR',
    width: 'min(980px, calc(100vw - 210px))',
    className: 'missions-window',
    menuItems: ['File', 'Edit', 'View', 'Help'],
    statusLeft: `${missions.length + 1} object(s)`,
    statusRight: `${selectedMission.estimatedMinutes} min mission`,
    closeNav,
    body: `
      <div class="folder-layout">
        <section class="folder-grid" aria-label="Games 폴더 내용">
          <button
            type="button"
            class="folder-icon"
            data-double-nav="#/how-to-play?mission=${selectedMission.id}"
            data-launcher="popup-hell"
            aria-label="Popup Hell"
          >
            ${renderSystemIcon('app', 'EXE')}
            <span class="folder-icon__label">Popup Hell.exe</span>
          </button>
          ${missions.map((mission) => `
            <button
              type="button"
              class="folder-icon ${mission.id === selectedMission.id ? 'is-selected' : ''}"
              data-action="select-mission"
              data-mission-id="${mission.id}"
              data-double-nav="#/how-to-play?mission=${mission.id}"
              aria-label="${mission.title}"
            >
              ${renderSystemIcon('app', 'EXE')}
              <span class="folder-icon__label">${mission.title}</span>
            </button>
          `).join('')}
          <button
            type="button"
            class="folder-icon"
            data-double-nav="#/how-to-play?mission=${selectedMission.id}"
            aria-label="README.TXT"
          >
            ${renderSystemIcon('doc', 'TXT')}
            <span class="folder-icon__label">README.TXT</span>
          </button>
        </section>
        <aside class="folder-sidebar">
          <div class="folder-sidebar__meta">
            <p class="eyebrow">Selected Mission</p>
            <h2>오늘 처리할 업무를 고르세요</h2>
            <p class="difficulty-chip ${selectedMission.difficulty}">${difficultyLabel(selectedMission.difficulty)}</p>
            <h3>${selectedMission.title}</h3>
            <p>${selectedMission.brief}</p>
            <dl class="hud-stats">
              <div><dt>제한 시간</dt><dd>${selectedMission.timeLimitSec}초</dd></div>
              <div><dt>허용 스트라이크</dt><dd>${selectedMission.allowedStrikes}</dd></div>
              <div><dt>예상 플레이</dt><dd>${selectedMission.estimatedMinutes}분</dd></div>
              <div><dt>실제 방해</dt><dd>${selectedMission.requiredBlockers.length}건</dd></div>
            </dl>
          </div>
          <div class="folder-sidebar__actions">
            <button type="button" class="retro-button secondary" data-nav="#/run/${selectedMission.id}" data-mission-id="${selectedMission.id}">브리핑 보기</button>
            ${showOpenLauncherButton
              ? `<button type="button" class="retro-button primary" data-nav="#/how-to-play?mission=${selectedMission.id}" data-mission-id="${selectedMission.id}">런처 열기</button>`
              : ''
            }
          </div>
          <div class="folder-hints panel-card">
            <p class="eyebrow">Mission Hint</p>
            <p>${selectedMission.tutorialHints[0]}</p>
            <p>${selectedMission.tutorialHints[1]}</p>
          </div>
        </aside>
      </div>
    `,
  });
}

function renderRunWindow(targetWindowId) {
  const mission = getMissionById(appState.route.missionId);
  if (!mission) {
    return renderErrorState('존재하지 않는 미션입니다.', 'Games 폴더로 돌아가세요.');
  }

  if (targetWindowId === 'briefing-window' || !appState.activeRun || appState.activeRun.phase === 'briefing') {
    return renderWindow({
      windowId: 'briefing-window',
      title: `${mission.title} - Mission Brief`,
      kind: 'doc',
      code: 'BRF',
      width: 'min(840px, calc(100vw - 180px))',
      className: 'briefing-window',
      closeNav: '#/missions',
      body: `
        <p class="eyebrow">MISSION BRIEF</p>
        <h1>${mission.title}</h1>
        <p>${mission.brief}</p>
        <div class="briefing-grid">
          <article class="panel-card">
            <p class="eyebrow">CHECKLIST</p>
            <h2>핵심 단계</h2>
            <ol>
              ${mission.steps.map((step) => `<li>${step.label}</li>`).join('')}
            </ol>
          </article>
          <article class="panel-card">
            <p class="eyebrow">WIN CONDITIONS</p>
            <h2>성공 / 실패 조건</h2>
            <ul>
              <li>제한 시간: ${mission.timeLimitSec}초</li>
              <li>허용 스트라이크: ${mission.allowedStrikes}</li>
              <li>필수 진짜 방해 요소: ${mission.requiredBlockers.length}개</li>
            </ul>
          </article>
        </div>
        <div class="briefing-actions">
          <button type="button" class="retro-button primary" data-action="start-run" data-mission-id="${mission.id}">미션 시작</button>
          <button type="button" class="retro-button secondary" data-nav="#/missions">다른 미션 보기</button>
        </div>
      `,
    });
  }

  const runState = appState.activeRun.state;
  const currentStep = runState.mission.steps[runState.stepIndex] ?? null;
  const displayPopups = getDisplayPopups(runState.activePopups);

  if (targetWindowId === 'run-hud') {
    return renderWindow({
      windowId: 'run-hud',
      title: 'Mission HUD',
      kind: 'app',
      code: 'HUD',
      width: 'min(320px, calc(100vw - 40px))',
      className: 'run-hud-window',
      closeNav: '#/missions',
      body: `
        <section class="hud-panel">
          <div>
            <p class="eyebrow">LIVE HUD</p>
            <h2>${runState.mission.title}</h2>
            <p class="run-meta">${difficultyLabel(runState.mission.difficulty)} · 예상 ${runState.mission.estimatedMinutes}분 · ${Math.min(runState.stepIndex + 1, runState.mission.steps.length)} / ${runState.mission.steps.length} 단계</p>
          </div>
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
            <p class="eyebrow">상황 보고</p>
            <p>${runState.lastFeedback}</p>
          </section>
        </section>
      `,
    });
  }

  if (mission.id === 'office-mail-001') {
    return renderWindow({
      windowId: 'run-workspace',
      title: currentStep ? currentStep.label : 'WORK DESK',
      kind: 'app',
      code: 'RUN',
      width: 'min(980px, calc(100vw - 370px))',
      className: 'run-workspace-window office-mail-window',
      closeNav: '#/missions',
      body: renderOfficeMailWorkspace(runState, currentStep),
    });
  }

  return renderWindow({
      windowId: 'run-workspace',
      title: currentStep ? currentStep.label : 'WORK DESK',
      kind: 'app',
      code: 'RUN',
      width: 'min(860px, calc(100vw - 370px))',
      className: 'run-workspace-window',
      closeNav: '#/missions',
      body: `
        <div class="workspace-top">
          <div>
            <p class="eyebrow">CURRENT TASK</p>
            <h2>${currentStep ? currentStep.label : '미션 판정 중'}</h2>
          </div>
          <p class="progress-pill">${Math.min(runState.stepIndex + 1, runState.mission.steps.length)} / ${runState.mission.steps.length} STEP</p>
        </div>
        <div class="desk-panel">
          <article class="current-step panel-card">
            <p class="eyebrow">ACTIVE STEP</p>
            <h3>다음 행동</h3>
            <p>${currentStep ? currentStep.instruction : '모든 단계를 완료했습니다.'}</p>
            ${currentStep ? renderStepAction(runState, currentStep) : ''}
          </article>
          <article class="mission-notes panel-card">
            <p class="eyebrow">FIELD NOTES</p>
            <h3>미션 힌트</h3>
            <ul>
              ${runState.mission.tutorialHints.map((hint) => `<li>${hint}</li>`).join('')}
            </ul>
          </article>
        </div>
        <section class="popup-layer" aria-label="현재 팝업">
          ${renderWorkspaceBackdrop(runState, currentStep)}
          ${displayPopups.map((popup, index) => renderPopup(popup, index, displayPopups.length)).join('')}
          ${displayPopups.length === 0 ? '<p class="quiet-note">현재 열린 팝업이 없습니다. 체크리스트를 진행하세요.</p>' : ''}
        </section>
      `,
    });
}

function renderOfficeMailWorkspace(runState, currentStep) {
  const scenario = getOfficeMailScenario();
  const ui = appState.officeMailUi;

  if (!scenario) {
    return '';
  }

  const saveGuide = `${scenario.requiredFolder} 폴더에 ${scenario.requiredFileName} 로 저장해야 합니다.`;
  const subjectGuide = `제목은 정확히 ${scenario.requiredSubject}`;
  const ccGuide = `참조(CC)는 ${scenario.requiredCc}`;
  const attachGuide = `${scenario.requiredFileName} 파일을 선택해야 합니다.`;
  const keywordGuide = `메모에는 ${scenario.noteRequiredKeywords.join(', ')} 키워드가 모두 들어가야 합니다.`;
  const savedLabel = ui.savedFileName ? `${ui.savedFolder}/${ui.savedFileName}` : '아직 저장된 파일이 없습니다.';
  const attachedLabel = ui.selectedAttachment || '아직 첨부된 파일이 없습니다.';
  const composerReady = ui.mailComposerOpen || runState.completedStepIds.includes('compose-mail-subject');

  return `
    <div class="workspace-top">
      <div>
        <p class="eyebrow">CURRENT TASK</p>
        <h2>${currentStep ? currentStep.label : '메일 발송 준비'}</h2>
      </div>
      <p class="progress-pill">${Math.min(runState.stepIndex + 1, runState.mission.steps.length)} / ${runState.mission.steps.length} STEP</p>
    </div>
    <div class="office-layout">
      <section class="office-stack">
        <article class="office-window panel-card office-notepad">
          <div class="office-window__titlebar">
            <span>NOTEPAD</span>
            <span>TXT</span>
          </div>
          <div class="office-window__body">
            <p class="eyebrow">이력서 메모</p>
            <textarea
              data-office-field="note-content"
              placeholder="${escapeHtmlAttribute(scenario.notePlaceholder)}"
            >${escapeHtmlAttribute(ui.noteContent)}</textarea>
            <p class="office-inline-guide">${keywordGuide}</p>
            <div class="workspace-actions">
              <button type="button" class="retro-button secondary" data-action="open-save-dialog">다른 이름으로 저장</button>
            </div>
          </div>
        </article>

        <article class="office-window panel-card office-mail-composer ${composerReady ? '' : 'is-muted'}">
          <div class="office-window__titlebar">
            <span>MAIL COMPOSER</span>
            <span>MSG</span>
          </div>
          <div class="office-window__body">
            <div class="office-mail__meta">
              <div><dt>받는 사람</dt><dd>ceo@retro.company</dd></div>
              <div><dt>참조</dt><dd>${ui.ccAddress || scenario.requiredCc}</dd></div>
              <div><dt>첨부</dt><dd>${ui.savedFileName ? attachedLabel : '저장된 파일 필요'}</dd></div>
            </div>
            ${!composerReady
              ? `<div class="workspace-actions"><button type="button" class="retro-button primary" data-action="open-mail-compose">메일 작성하기</button></div>`
              : `
                <form class="office-form" data-office-subject-form>
                  <label>
                    <span>메일 제목</span>
                    <input
                      data-office-field="mail-subject"
                      type="text"
                      placeholder="${escapeHtmlAttribute(scenario.requiredSubject)}"
                      value="${escapeHtmlAttribute(ui.subject)}"
                      autocomplete="off"
                    />
                  </label>
                  <label>
                    <span>메일 내용</span>
                    <textarea readonly>${escapeHtmlAttribute(scenario.emailBody)}</textarea>
                  </label>
                  <div class="workspace-actions">
                    <button type="submit" class="retro-button primary">제목 입력 완료</button>
                  </div>
                </form>
                <div class="workspace-actions office-secondary-actions">
                  <button type="button" class="retro-button secondary" data-action="open-attachment-picker">파일 업로드</button>
                </div>
              `}
          </div>
        </article>

        ${composerReady ? `
          <article class="office-window panel-card office-cc-panel">
            <div class="office-window__titlebar">
              <span>CC ENTRY</span>
              <span>ADDR</span>
            </div>
            <div class="office-window__body">
              <form class="office-form" data-office-cc-form>
                <label>
                  <span>CC 주소</span>
                  <input
                    data-office-field="cc-address"
                    type="text"
                    placeholder="${escapeHtmlAttribute(scenario.requiredCc)}"
                    value="${escapeHtmlAttribute(ui.ccAddress)}"
                    autocomplete="off"
                  />
                </label>
                <div class="workspace-actions">
                  <button type="submit" class="retro-button primary">참조 추가 완료</button>
                </div>
              </form>
            </div>
          </article>
        ` : ''}
      </section>

      <aside class="office-sidebar">
        <article class="panel-card office-guide">
          <p class="eyebrow">필수 가이드</p>
          <ul>
            <li>${saveGuide}</li>
            <li>${subjectGuide}</li>
            <li>${attachGuide}</li>
            <li>${ccGuide}</li>
            <li>${keywordGuide}</li>
          </ul>
          <p class="office-guide__status">${ui.statusMessage || runState.lastFeedback}</p>
        </article>
        <article class="panel-card office-status">
          <p class="eyebrow">현재 상태</p>
          <dl class="ambient-stats">
            <div><dt>저장 파일</dt><dd>${savedLabel}</dd></div>
            <div><dt>선택 첨부</dt><dd>${attachedLabel}</dd></div>
            <div><dt>메일 제목</dt><dd>${ui.subject || '입력 대기'}</dd></div>
            <div><dt>참조 주소</dt><dd>${ui.ccAddress || '입력 대기'}</dd></div>
          </dl>
        </article>
      </aside>
    </div>

    ${ui.saveDialogOpen ? `
      <section class="floating-dialog office-save-dialog">
        <div class="office-window__titlebar">
          <span>SAVE AS</span>
          <span>TXT</span>
        </div>
        <div class="office-window__body">
          <p class="eyebrow">저장 위치 선택</p>
          <div class="folder-choice-list">
            ${scenario.saveFolders.map((folder) => `
              <button
                type="button"
                class="retro-button ${ui.selectedFolder === folder ? 'primary' : 'secondary'}"
                data-action="select-save-folder"
                data-folder-name="${folder}"
              >
                ${folder}
              </button>
            `).join('')}
          </div>
          <label>
            <span>파일 이름</span>
            <input
              data-office-field="save-file-name"
              type="text"
              placeholder="${escapeHtmlAttribute(scenario.requiredFileName)}"
              value="${escapeHtmlAttribute(ui.fileName)}"
              autocomplete="off"
            />
          </label>
          <div class="workspace-actions">
            <button type="button" class="retro-button primary" data-action="save-note-as">저장 완료</button>
          </div>
        </div>
      </section>
    ` : ''}

    ${currentStep?.id === 'attach-resume' || ui.attachmentPickerOpen ? `
      <section class="floating-dialog office-upload-dialog">
        <div class="office-window__titlebar">
          <span>FILE UPLOAD</span>
          <span>DIR</span>
        </div>
        <div class="office-window__body">
          <p class="eyebrow">첨부 파일 선택</p>
          <div class="folder-choice-list">
            ${scenario.attachmentFolders.map((folder) => `
              <button
                type="button"
                class="retro-button ${ui.selectedAttachmentFolder === folder ? 'primary' : 'secondary'}"
                data-action="select-attachment-folder"
                data-folder-name="${folder}"
              >
                ${folder}
              </button>
            `).join('')}
          </div>
          <div class="file-choice-list">
            ${getOfficeAttachmentChoices().map((fileName) => `
              <button
                type="button"
                class="retro-button ${ui.selectedAttachment === fileName ? 'primary' : 'secondary'}"
                data-action="select-attachment-file"
                data-file-name="${fileName}"
              >
                ${fileName}
              </button>
            `).join('')}
          </div>
          <div class="workspace-actions">
            <button type="button" class="retro-button primary" data-action="confirm-attachment">첨부 완료</button>
          </div>
        </div>
      </section>
    ` : ''}

    ${currentStep?.id === 'send-mail' ? `
      <div class="workspace-actions office-send-action">
        <button type="button" class="retro-button primary" data-action="step-click">발송하기</button>
      </div>
    ` : ''}

    <section class="popup-layer" aria-label="현재 팝업">
      ${renderWorkspaceBackdrop(runState, currentStep)}
      ${getDisplayPopups(runState.activePopups).map((popup, index, items) => renderPopup(popup, index, items.length)).join('')}
      ${runState.activePopups.length === 0 ? '<p class="quiet-note">현재 열린 팝업이 없습니다. 체크리스트를 진행하세요.</p>' : ''}
    </section>
  `;
}

function renderResultWindow() {
  const result = getResultSummary(appState.route.runId);
  if (!result) {
    return renderErrorState('결과 기록을 찾을 수 없습니다.', '새 미션을 선택해 다시 플레이하세요.');
  }

  const mission = getMissionById(result.missionId);
  const bestRun = appState.save.bestRuns[result.missionId];

  return renderWindow({
    windowId: 'result-window',
    title: 'After Action Report',
    kind: 'doc',
    code: 'RPT',
    width: 'min(760px, calc(100vw - 180px))',
    className: 'result-window',
    closeNav: '#/missions',
    body: `
      <p class="eyebrow">RESULT</p>
      <h1>${result.didWin ? '업무 완료!' : '업무 실패!'}</h1>
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
        <p class="eyebrow">DEBRIEF</p>
        <h2>회고 메모</h2>
        <ul>
          <li>최고 기록: ${bestRun ? `${bestRun.grade} · ${bestRun.score.toLocaleString()}점` : '이번 런이 첫 기록입니다.'}</li>
          <li>최근 실패 원인: ${result.failureReason || '없음'}</li>
          <li>핵심 팁: 진짜 방해 요소가 뜨면 체크리스트보다 먼저 처리하세요.</li>
        </ul>
      </section>
      <div class="result-actions">
        <button type="button" class="retro-button primary" data-action="retry-run" data-mission-id="${mission?.id}">같은 미션 다시 하기</button>
        <button type="button" class="retro-button secondary" data-nav="#/missions">다른 미션 선택</button>
      </div>
    `,
  });
}

function renderErrorState(title, body) {
  return renderWindow({
    windowId: 'error-window',
    title: 'SYSTEM NOTICE',
    kind: 'doc',
    code: 'ERR',
    width: 'min(520px, calc(100vw - 48px))',
    closeNav: '#/missions',
    body: `
      <div class="desktop-note">
        <h2>${title}</h2>
        <p>${body}</p>
        <div class="briefing-actions">
          <button type="button" class="retro-button primary" data-nav="#/missions">Games 폴더 열기</button>
        </div>
      </div>
    `,
  });
}

function renderStepAction(runState, step) {
  if (step.actionType === 'input') {
    const stepKey = getStepInputKey(runState, step);
    const draftValue = escapeHtmlAttribute(readStepInputDraft(appState.stepInput, stepKey));

    return `
      <form class="step-form" data-step-form>
        <label>
          <span>${step.inputLabel}</span>
          <input
            data-step-input
            data-step-key="${stepKey}"
            name="step-input"
            type="text"
            placeholder="${escapeHtmlAttribute(step.placeholder)}"
            value="${draftValue}"
            autocomplete="off"
            required
          />
        </label>
        <button type="submit" class="retro-button primary">단계 완료</button>
      </form>
    `;
  }

  return `
    <div class="workspace-actions">
      <button type="button" class="retro-button primary" data-action="step-click">${step.actionLabel}</button>
    </div>
  `;
}

function renderPopup(popup, index, total) {
  const isPriorityPopup = index === total - 1;
  const offsetX = popup.truthClass === 'real'
    ? 28 + index * 8
    : 74 + index * 24;
  const offsetY = popup.truthClass === 'real'
    ? 22 + index * 10
    : 40 + index * 18;
  const stackDepth = index + 2;
  const severityLabel = popup.severity === 'high' ? '긴급' : popup.severity === 'medium' ? '주의' : '참고';
  const badgeLabel = popup.severity === 'high' ? '긴급 확인' : popup.severity === 'medium' ? '주의 확인' : '참고 창';

  return `
    <article
      class="popup-card ${popup.severity} ${popup.truthClass === 'real' ? 'is-blocker' : 'is-noise'} ${isPriorityPopup ? 'is-priority' : ''}"
      style="--offset-x:${offsetX}px; --offset-y:${offsetY}px; --popup-z:${stackDepth};"
    >
      <div class="popup-card__titlebar">
        <div>
          <p class="eyebrow">${severityLabel}</p>
          <h3>${popup.title}</h3>
        </div>
        <span class="desktop-chip">${badgeLabel}</span>
      </div>
      <div class="popup-card__body">
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
            class="retro-button secondary"
            data-action="popup-action"
            data-popup-id="${popup.id}"
            data-response="dismiss"
          >
            ${popup.wrongLabel}
          </button>
        </div>
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

function getDisplayPopups(popups) {
  return [...popups]
    .map((popup, index) => ({ ...popup, _displayPriority: getPopupDisplayPriority(popup, index) }))
    .sort((left, right) => left._displayPriority - right._displayPriority);
}

function getPopupDisplayPriority(popup, index) {
  const truthPriority = popup.truthClass === 'real' ? 100 : 0;
  const severityPriority = popup.severity === 'high' ? 30 : popup.severity === 'medium' ? 20 : 10;
  return truthPriority + severityPriority + index;
}

function renderWorkspaceBackdrop(runState, currentStep) {
  const completedSteps = new Set(runState.completedStepIds);
  const resolvedPopups = new Set(runState.resolvedPopupIds);
  const openAlertCount = runState.activePopups.length;
  const resolvedAlertCount = runState.resolvedPopupIds.length;

  if (runState.mission.id === 'office-mail-001') {
    const attachmentStatus = completedSteps.has('attach-deck')
      ? 'Q3_Final_Pitch_v7 첨부됨'
      : resolvedPopups.has('storage-quota')
        ? '첨부 가능 상태'
        : '첨부 전 저장소 점검 필요';
    const ccStatus = completedSteps.has('cc-ops') ? 'ops@retro.company 입력됨' : '운영팀 참조 대기';
    const footerStatus = resolvedPopups.has('legal-footer') ? '법무 문구 적용됨' : '발송 전 법무 문구 확인 필요';

    return `
      <div class="workspace-backdrop">
        <article class="ambient-card">
          <p class="eyebrow">MAIL DRAFT</p>
          <h3>메일 초안</h3>
          <dl class="ambient-stats">
            <div><dt>받는 사람</dt><dd>ceo@retro.company</dd></div>
            <div><dt>참조</dt><dd>${ccStatus}</dd></div>
            <div><dt>첨부</dt><dd>${attachmentStatus}</dd></div>
            <div><dt>발송 게이트</dt><dd>${footerStatus}</dd></div>
          </dl>
        </article>
        <article class="ambient-card">
          <p class="eyebrow">OFFICE TRAFFIC</p>
          <h3>업무 소음 채널</h3>
          <dl class="ambient-stats">
            <div><dt>현재 단계</dt><dd>${currentStep?.label ?? '대기 중'}</dd></div>
            <div><dt>열린 알림</dt><dd>${openAlertCount}건</dd></div>
            <div><dt>처리한 경고</dt><dd>${resolvedAlertCount}건</dd></div>
            <div><dt>집중 상태</dt><dd>${runState.chaosPercent < 35 ? '안정적' : runState.chaosPercent < 65 ? '흔들림' : '혼잡'}</dd></div>
          </dl>
        </article>
      </div>
    `;
  }

  const stagingStatus = completedSteps.has('stage-files') ? '핫픽스 스테이징 완료' : '핫픽스 파일 대기';
  const releaseStatus = completedSteps.has('request-release') ? '#release-bridge 승인 요청 완료' : '승인 채널 입력 전';
  const ciGateStatus = resolvedPopups.has('deploy-freeze') ? '동결 해제 승인 확보' : '배포 차단기 대기';
  const sshStatus = resolvedPopups.has('ssh-token') ? 'SSH 토큰 갱신됨' : '원격 접근 토큰 점검 필요';

  return `
    <div class="workspace-backdrop">
      <article class="ambient-card">
        <p class="eyebrow">RELEASE BOARD</p>
        <h3>배포 상황판</h3>
        <dl class="ambient-stats">
          <div><dt>브랜치</dt><dd>hotfix/payment-race</dd></div>
          <div><dt>스테이징</dt><dd>${stagingStatus}</dd></div>
          <div><dt>승인 채널</dt><dd>${releaseStatus}</dd></div>
          <div><dt>CI 게이트</dt><dd>${ciGateStatus}</dd></div>
        </dl>
      </article>
      <article class="ambient-card">
        <p class="eyebrow">TERMINAL FEED</p>
        <h3>터미널 피드</h3>
        <dl class="ambient-stats">
          <div><dt>SSH</dt><dd>${sshStatus}</dd></div>
          <div><dt>현재 단계</dt><dd>${currentStep?.label ?? '대기 중'}</dd></div>
          <div><dt>열린 알림</dt><dd>${openAlertCount}건</dd></div>
          <div><dt>처리한 경고</dt><dd>${resolvedAlertCount}건</dd></div>
        </dl>
      </article>
    </div>
  `;
}

function escapeHtmlAttribute(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
