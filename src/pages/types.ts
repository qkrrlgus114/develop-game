export type MissionDifficulty = 'easy' | 'normal' | 'hard';

export type MissionCardModel = {
  id: string;
  title: string;
  brief: string;
  difficulty: MissionDifficulty;
  timeLimitSec: number;
  estimatedPlayMinutes: number;
  recommended?: boolean;
};

export type StepStatus = 'done' | 'current' | 'locked';

export type RunChecklistItem = {
  id: string;
  label: string;
  status: StepStatus;
};

export type PopupTone = 'real' | 'fake';

export type PopupCardModel = {
  id: string;
  title: string;
  body: string;
  tone: PopupTone;
  actionLabel: string;
  secondaryLabel?: string;
};

export type ResultSummary = {
  title: string;
  cleared: boolean;
  grade: 'S' | 'A' | 'B' | 'Fail';
  timeLeftSec: number;
  mistakes: number;
  resolvedBlockers: number;
  lastFailureReason?: string;
};
