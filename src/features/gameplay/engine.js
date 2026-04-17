function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPenaltyTimeMs(penalty) {
  return penalty === 'time-loss' ? 8000 : 0;
}

function appendLog(state, type, payload = {}) {
  state.eventLog.push({
    type,
    payload,
    at: state.elapsedMs,
  });
}

function getActiveRealPopup(state) {
  return state.activePopups.find((popup) => popup.truthClass === 'real') ?? null;
}

function getCurrentStep(state) {
  return state.mission.steps[state.stepIndex] ?? null;
}

function getPopupRule(mission, popupId) {
  return mission.popups.find((popup) => popup.id === popupId) ?? null;
}

function shouldSpawnPopup(state, popupRule) {
  if (state.spawnedPopupIds.includes(popupRule.id) || state.resolvedPopupIds.includes(popupRule.id)) {
    return false;
  }

  if (popupRule.trigger === 'time') {
    return state.elapsedMs >= popupRule.atSecond * 1000;
  }

  if (popupRule.trigger === 'step') {
    return state.stepIndex >= popupRule.stepIndex;
  }

  return false;
}

function updateChaos(state) {
  const timeRatio = Math.min(state.elapsedMs / (state.mission.timeLimitSec * 1000), 1);
  const popupPressure = Math.min(state.activePopups.length / 4, 1);
  state.chaosPercent = Math.round(Math.min(1, timeRatio * 0.65 + popupPressure * 0.45) * 100);
}

function finalizeRun(state, didWin, reason) {
  state.status = didWin ? 'won' : 'lost';
  state.failureReason = didWin ? '' : reason;
  state.finishedAt = Date.now();
  state.scoreSummary = computeScoreSummary(state);

  appendLog(state, didWin ? 'mission_cleared' : 'mission_failed', {
    reason,
    score: state.scoreSummary.score,
    grade: state.scoreSummary.grade,
  });

  return state;
}

function applyPenalty(state, penalty, reason) {
  if (penalty === 'strike') {
    state.strikes += 1;
  }

  const lostMs = getPenaltyTimeMs(penalty);
  state.remainingMs = Math.max(0, state.remainingMs - lostMs);
  state.timeLostMs += lostMs;
  state.lastFeedback = reason;

  appendLog(state, 'wrong_action', {
    penalty,
    reason,
    strikes: state.strikes,
  });

  if (state.strikes > state.mission.allowedStrikes || state.remainingMs <= 0) {
    finalizeRun(state, false, state.remainingMs <= 0 ? '시간이 모두 소진되었습니다.' : '스트라이크 한도를 초과했습니다.');
  }

  return state;
}

function resolvePopup(state, popupRule) {
  state.activePopups = state.activePopups.filter((popup) => popup.id !== popupRule.id);
  state.resolvedPopupIds.push(popupRule.id);
  state.lastFeedback = popupRule.truthClass === 'real' ? '진짜 방해 요소를 해결했습니다.' : '가짜 팝업을 정리했습니다.';

  if (popupRule.truthClass === 'real') {
    state.realResolvedCount += 1;
    appendLog(state, 'real_blocker_resolved', { popupId: popupRule.id });
  } else {
    state.fakeDismissedCount += 1;
    appendLog(state, 'fake_popup_dismissed', { popupId: popupRule.id });
  }

  updateChaos(state);
  return state;
}

export function createRunState(mission, now = Date.now()) {
  return {
    runId: createId(mission.id),
    mission: clone(mission),
    startedAt: now,
    lastTickAt: now,
    elapsedMs: 0,
    remainingMs: mission.timeLimitSec * 1000,
    status: 'running',
    stepIndex: 0,
    strikes: 0,
    chaosPercent: 0,
    activePopups: [],
    spawnedPopupIds: [],
    resolvedPopupIds: [],
    completedStepIds: [],
    realResolvedCount: 0,
    fakeDismissedCount: 0,
    wrongActions: 0,
    timeLostMs: 0,
    lastFeedback: '브리핑을 읽고 첫 단계를 시작하세요.',
    failureReason: '',
    eventLog: [],
    scoreSummary: null,
  };
}

export function tickRun(state, now = Date.now()) {
  if (state.status !== 'running') {
    return state;
  }

  const nextState = clone(state);
  const delta = Math.max(0, now - nextState.lastTickAt);
  nextState.lastTickAt = now;
  nextState.elapsedMs += delta;
  nextState.remainingMs = Math.max(0, nextState.remainingMs - delta);

  for (const popupRule of nextState.mission.popups) {
    if (shouldSpawnPopup(nextState, popupRule)) {
      nextState.spawnedPopupIds.push(popupRule.id);
      nextState.activePopups.push(clone(popupRule));
      appendLog(nextState, 'popup_spawned', {
        popupId: popupRule.id,
        truthClass: popupRule.truthClass,
      });
    }
  }

  updateChaos(nextState);

  if (nextState.remainingMs <= 0) {
    finalizeRun(nextState, false, '시간이 모두 소진되었습니다.');
  }

  return nextState;
}

export function attemptStep(state, submission = {}) {
  if (state.status !== 'running') {
    return state;
  }

  const nextState = clone(state);
  const currentStep = getCurrentStep(nextState);

  if (!currentStep) {
    return finalizeRun(nextState, true, '');
  }

  const blockingPopup = getActiveRealPopup(nextState);
  if (blockingPopup && blockingPopup.blocksSteps?.includes(currentStep.id)) {
    nextState.wrongActions += 1;
    return applyPenalty(nextState, currentStep.failPenalty, '먼저 진짜 방해 요소를 해결해야 합니다.');
  }

  const normalizedValue = String(submission.value ?? '').trim().toLowerCase();
  const expectedValue = String(currentStep.expectedValue ?? '').trim().toLowerCase();
  const didSucceed =
    currentStep.actionType === 'input'
      ? normalizedValue === expectedValue
      : submission.valid === false
        ? false
        : Boolean(submission.confirmed);

  if (!didSucceed) {
    nextState.wrongActions += 1;
    return applyPenalty(nextState, currentStep.failPenalty, '단계 입력이 올바르지 않습니다.');
  }

  nextState.completedStepIds.push(currentStep.id);
  nextState.stepIndex += 1;
  nextState.lastFeedback = `단계 완료: ${currentStep.label}`;

  appendLog(nextState, 'step_completed', {
    stepId: currentStep.id,
    stepIndex: nextState.stepIndex,
  });

  const unresolvedBlockers = nextState.mission.requiredBlockers.filter(
    (popupId) => !nextState.resolvedPopupIds.includes(popupId),
  );

  if (nextState.stepIndex >= nextState.mission.steps.length) {
    if (unresolvedBlockers.length > 0) {
      return finalizeRun(nextState, false, '핵심 방해 요소를 해결하지 않고 마지막 단계를 시도했습니다.');
    }

    return finalizeRun(nextState, true, '');
  }

  return nextState;
}

export function resolvePopupAction(state, popupId, action) {
  if (state.status !== 'running') {
    return state;
  }

  const nextState = clone(state);
  const popupRule = getPopupRule(nextState.mission, popupId);

  if (!popupRule) {
    return nextState;
  }

  const isCorrect = popupRule.requiredResponse === action;

  if (isCorrect) {
    return resolvePopup(nextState, popupRule);
  }

  nextState.wrongActions += 1;

  if (popupRule.truthClass === 'fake') {
    nextState.activePopups = nextState.activePopups.filter((popup) => popup.id !== popupRule.id);
  }

  return applyPenalty(nextState, popupRule.wrongActionPenalty, `${popupRule.title} 대응을 잘못 선택했습니다.`);
}

export function computeScoreSummary(state) {
  const remainingSeconds = Math.max(0, Math.floor(state.remainingMs / 1000));
  const accuracyDenominator = state.completedStepIds.length + state.wrongActions || 1;
  const accuracyRatio = Math.max(0, Math.min(1, state.completedStepIds.length / accuracyDenominator));
  const baseScore = state.status === 'won' ? 1000 : 300;
  const timeScore = remainingSeconds * state.mission.scoreWeights.time;
  const accuracyScore = Math.round(accuracyRatio * 100) * state.mission.scoreWeights.accuracy;
  const blockerScore = state.realResolvedCount * state.mission.scoreWeights.blocker;
  const penaltyScore = state.strikes * 90 + Math.round(state.timeLostMs / 1000) * 6;
  const score = Math.max(0, baseScore + timeScore + accuracyScore + blockerScore - penaltyScore);

  let grade = 'Fail';
  if (state.status === 'won' && score >= 2400) {
    grade = 'S';
  } else if (state.status === 'won' && score >= 1900) {
    grade = 'A';
  } else if (state.status === 'won') {
    grade = 'B';
  }

  return {
    runId: state.runId,
    missionId: state.mission.id,
    missionTitle: state.mission.title,
    didWin: state.status === 'won',
    grade,
    score,
    remainingSeconds,
    strikes: state.strikes,
    resolvedRealPopups: state.realResolvedCount,
    fakeDismissed: state.fakeDismissedCount,
    wrongActions: state.wrongActions,
    failureReason: state.failureReason,
    finishedAt: state.finishedAt ?? Date.now(),
    eventLog: clone(state.eventLog),
  };
}
