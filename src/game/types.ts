export type PopupKind = 'real' | 'fake';
export type PopupAction = 'resolve' | 'dismiss';

export type TaskStep = {
  id: string;
  type: 'task';
  label: string;
  helper: string;
};

export type PopupStep = {
  id: string;
  type: 'popup';
  kind: PopupKind;
  title: string;
  body: string;
  correctAction: PopupAction;
  penaltySeconds: number;
  penaltyStrikes: number;
  successLabel: string;
  failureLabel: string;
};

export type MissionStep = TaskStep | PopupStep;

export type MissionDefinition = {
  id: string;
  title: string;
  briefing: string;
  difficulty: '쉬움' | '보통';
  timeLimitSeconds: number;
  estimatedMinutes: string;
  recommended: boolean;
  steps: MissionStep[];
};

export type CompletedTask = {
  id: string;
  label: string;
};

export type RunResult = {
  runId: string;
  missionId: string;
  missionTitle: string;
  success: boolean;
  reason: string;
  remainingSeconds: number;
  strikes: number;
  handledRealPopups: number;
  grade: 'A' | 'B' | 'C' | 'FAIL';
  mistakes: string[];
};

export type RunState = {
  runId: string;
  mission: MissionDefinition;
  currentIndex: number;
  completedTasks: CompletedTask[];
  timeRemaining: number;
  strikes: number;
  chaos: number;
  handledRealPopups: number;
  mistakes: string[];
  lastFeedback: string;
  status: 'running' | 'success' | 'failure';
  failureReason: string | null;
  result: RunResult | null;
};
