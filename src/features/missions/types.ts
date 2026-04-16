export type MissionDifficulty = "easy" | "normal" | "hard";
export type MissionStepAction = "click" | "drag-drop" | "input" | "confirm";
export type FailPenalty = "none" | "time-loss" | "strike";
export type PopupTruthClass = "real" | "fake";
export type PopupSeverity = "low" | "medium" | "high";
export type PopupTrigger = "time" | "step" | "random" | "mistake";
export type PopupResponse = "dismiss" | "fix" | "ignore" | "confirm";
export type PopupTimeoutBehavior =
	| "none"
	| "block-step"
	| "time-loss"
	| "auto-fail";
export type RunOutcome = "cleared" | "failed";
export type FailureReason =
	| "timeout"
	| "strikes"
	| "required-blocker"
	| "manual-exit";

export interface MissionStep {
	id: string;
	label: string;
	actionType: MissionStepAction;
	targetId: string;
	successCondition: string;
	failPenalty: FailPenalty;
	helperText?: string;
}

export interface PopupRule {
	id: string;
	truthClass: PopupTruthClass;
	title: string;
	body: string;
	severity: PopupSeverity;
	trigger: PopupTrigger;
	requiredResponse: PopupResponse;
	timeoutBehavior: PopupTimeoutBehavior;
	wrongActionPenalty: FailPenalty;
	triggerAtSec?: number;
	triggerStepId?: string;
	weight?: number;
	timePenaltySec?: number;
	strikePenalty?: number;
	hint?: string;
}

export interface RequiredBlocker {
	id: string;
	popupRuleId: string;
	description: string;
	mustResolveByStepId?: string;
}

export interface ChaosProfile {
	baseIntervalMs: number;
	minimumIntervalMs: number;
	escalationPerThirtySec: number;
	maxConcurrentPopups: number;
}

export interface ScoreWeights {
	baseScore: number;
	timeBonusPerSecond: number;
	accuracyBonus: number;
	strikePenalty: number;
	blockerBonus: number;
}

export interface MissionDefinition {
	id: string;
	order: number;
	title: string;
	brief: string;
	difficulty: MissionDifficulty;
	timeLimitSec: number;
	allowedStrikes: number;
	estimatedPlayMinutes: number;
	recommended: boolean;
	landingHook: string;
	winCondition: string;
	failureConditionSummary: string;
	steps: MissionStep[];
	requiredBlockers: RequiredBlocker[];
	fakePopupPool: PopupRule[];
	chaosProfile: ChaosProfile;
	scoreWeights: ScoreWeights;
	tutorialHints: string[];
}

export interface TutorialExample {
	title: string;
	description: string;
	correctResponse: string;
}

export interface TutorialSection {
	id: string;
	title: string;
	body: string;
	bullets: string[];
	examples?: TutorialExample[];
}

export interface MissionCardViewModel {
	id: string;
	title: string;
	brief: string;
	difficulty: MissionDifficulty;
	timeLimitSec: number;
	estimatedPlayMinutes: number;
	recommended: boolean;
}

export interface MissionRunStats {
	missionId: string;
	outcome: RunOutcome;
	timeRemainingSec: number;
	strikesUsed: number;
	stepsCompleted: number;
	totalSteps: number;
	realBlockersResolved: number;
	requiredBlockersTotal: number;
	fakePopupsDismissed: number;
	wrongActions: number;
	failureReason?: FailureReason;
	lastMistake?: string;
}

export interface ResultSummary {
	missionId: string;
	missionTitle: string;
	outcome: RunOutcome;
	grade: "S" | "A" | "B" | "Fail";
	totalScore: number;
	remainingTimeSec: number;
	mistakes: number;
	realBlockersResolved: number;
	completionRatio: number;
	headline: string;
	nextActionLabel: string;
	failureReason?: FailureReason;
	lastMistake?: string;
}
