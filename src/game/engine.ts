import { missions } from './missions';
import type { MissionDefinition, MissionStep, PopupAction, PopupStep, RunResult, RunState, TaskStep } from './types';

const STRIKE_LIMIT = 3;

const uid = () => `run-${Math.random().toString(36).slice(2, 10)}`;

const calculateChaos = (state: Pick<RunState, 'mission' | 'currentIndex' | 'strikes' | 'timeRemaining'>) => {
  const progressRatio = state.currentIndex / state.mission.steps.length;
  const pressureRatio = 1 - state.timeRemaining / state.mission.timeLimitSeconds;
  return Math.min(100, Math.round(progressRatio * 45 + pressureRatio * 35 + state.strikes * 20));
};

const buildResult = (state: RunState, success: boolean, reason: string): RunResult => {
  const remainingRatio = state.timeRemaining / state.mission.timeLimitSeconds;
  const grade = success
    ? state.strikes === 0 && remainingRatio > 0.45
      ? 'A'
      : state.strikes <= 1 && remainingRatio > 0.2
        ? 'B'
        : 'C'
    : 'FAIL';

  return {
    runId: state.runId,
    missionId: state.mission.id,
    missionTitle: state.mission.title,
    success,
    reason,
    remainingSeconds: Math.max(0, state.timeRemaining),
    strikes: state.strikes,
    handledRealPopups: state.handledRealPopups,
    grade,
    mistakes: state.mistakes
  };
};

export const getMissionById = (missionId: string) => missions.find((mission) => mission.id === missionId);

export const createRunState = (mission: MissionDefinition): RunState => ({
  runId: uid(),
  mission,
  currentIndex: 0,
  completedTasks: [],
  timeRemaining: mission.timeLimitSeconds,
  strikes: 0,
  chaos: 0,
  handledRealPopups: 0,
  mistakes: [],
  lastFeedback: '브리핑을 확인하고 첫 단계를 시작하세요.',
  status: 'running',
  failureReason: null,
  result: null
});

export const getCurrentStep = (state: RunState): MissionStep | null => state.mission.steps[state.currentIndex] ?? null;

const finalize = (state: RunState, success: boolean, reason: string): RunState => {
  const result = buildResult(state, success, reason);
  return {
    ...state,
    status: success ? 'success' : 'failure',
    failureReason: success ? null : reason,
    result,
    lastFeedback: reason
  };
};

const withProgressCheck = (state: RunState): RunState => {
  if (state.status !== 'running') {
    return state;
  }

  if (state.timeRemaining <= 0) {
    return finalize({ ...state, timeRemaining: 0 }, false, '시간 초과로 미션에 실패했습니다.');
  }

  if (state.strikes >= STRIKE_LIMIT) {
    return finalize(state, false, '스트라이크 3회를 넘겨 미션이 중단되었습니다.');
  }

  if (state.currentIndex >= state.mission.steps.length) {
    return finalize(state, true, '핵심 업무를 끝내고 팝업 지옥에서 탈출했습니다!');
  }

  return state;
};

export const tickRun = (state: RunState): RunState => {
  if (state.status !== 'running') {
    return state;
  }

  const nextState = {
    ...state,
    timeRemaining: state.timeRemaining - 1
  };

  return withProgressCheck({
    ...nextState,
    chaos: calculateChaos(nextState)
  });
};

export const completeTask = (state: RunState): RunState => {
  if (state.status !== 'running') {
    return state;
  }

  const step = getCurrentStep(state);

  if (!step || step.type !== 'task') {
    return state;
  }

  const nextState: RunState = {
    ...state,
    currentIndex: state.currentIndex + 1,
    completedTasks: [...state.completedTasks, { id: step.id, label: step.label }],
    lastFeedback: `${step.label} 완료`,
    chaos: calculateChaos({
      mission: state.mission,
      currentIndex: state.currentIndex + 1,
      strikes: state.strikes,
      timeRemaining: state.timeRemaining
    })
  };

  return withProgressCheck(nextState);
};

export const resolvePopupAction = (state: RunState, action: PopupAction): RunState => {
  if (state.status !== 'running') {
    return state;
  }

  const step = getCurrentStep(state);

  if (!step || step.type !== 'popup') {
    return state;
  }

  const popup = step as PopupStep;
  const isCorrect = popup.correctAction === action;
  const sharedUpdate = {
    ...state,
    timeRemaining: state.timeRemaining - (isCorrect ? 0 : popup.penaltySeconds),
    strikes: state.strikes + (isCorrect ? 0 : popup.penaltyStrikes),
    mistakes: isCorrect ? state.mistakes : [...state.mistakes, popup.failureLabel]
  };

  const shouldAdvance = isCorrect || popup.kind === 'fake';
  const nextIndex = shouldAdvance ? state.currentIndex + 1 : state.currentIndex;
  const handledRealPopups = popup.kind === 'real' && isCorrect ? state.handledRealPopups + 1 : state.handledRealPopups;
  const nextState: RunState = {
    ...sharedUpdate,
    currentIndex: nextIndex,
    handledRealPopups,
    lastFeedback: isCorrect ? popup.successLabel : popup.failureLabel,
    chaos: calculateChaos({
      mission: state.mission,
      currentIndex: nextIndex,
      strikes: sharedUpdate.strikes,
      timeRemaining: sharedUpdate.timeRemaining
    })
  };

  return withProgressCheck(nextState);
};

export const getTaskChecklist = (mission: MissionDefinition, completedTasks: RunState['completedTasks']) => {
  const completedIds = new Set(completedTasks.map((task) => task.id));
  return mission.steps
    .filter((step): step is TaskStep => step.type === 'task')
    .map((step) => ({
      ...step,
      completed: completedIds.has(step.id)
    }));
};

export const getPopupSummary = (mission: MissionDefinition) =>
  mission.steps.filter((step): step is PopupStep => step.type === 'popup');
