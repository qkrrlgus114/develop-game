import { getMissionDefinition } from "../../data/missions";
import type { MissionRunStats, ResultSummary } from "./types";

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function resolveGrade(
	totalScore: number,
	outcome: MissionRunStats["outcome"],
): ResultSummary["grade"] {
	if (outcome === "failed") {
		return "Fail";
	}

	if (totalScore >= 875) {
		return "S";
	}

	if (totalScore >= 700) {
		return "A";
	}

	return "B";
}

export function createResultSummary(stats: MissionRunStats): ResultSummary {
	const mission = getMissionDefinition(stats.missionId);

	if (!mission) {
		throw new Error(`Unknown mission id: ${stats.missionId}`);
	}

	const completionRatio =
		stats.totalSteps === 0
			? 0
			: clamp(stats.stepsCompleted / stats.totalSteps, 0, 1);
	const resolvedAllBlockers =
		stats.realBlockersResolved >= stats.requiredBlockersTotal;
	const baseScore = mission.scoreWeights.baseScore;
	const timeBonus =
		Math.max(0, stats.timeRemainingSec) *
		mission.scoreWeights.timeBonusPerSecond;
	const accuracyBonus =
		stats.wrongActions === 0 ? mission.scoreWeights.accuracyBonus : 0;
	const blockerBonus = resolvedAllBlockers
		? mission.scoreWeights.blockerBonus
		: 0;
	const strikePenalty = stats.strikesUsed * mission.scoreWeights.strikePenalty;
	const totalScore =
		stats.outcome === "cleared"
			? Math.max(
					0,
					Math.round(
						baseScore +
							timeBonus +
							accuracyBonus +
							blockerBonus -
							strikePenalty,
					),
				)
			: 0;
	const grade = resolveGrade(totalScore, stats.outcome);

	const headline =
		stats.outcome === "cleared"
			? resolvedAllBlockers
				? "진짜 문제만 골라내며 미션을 끝냈습니다."
				: "미션은 끝났지만 실제 차단기 대응이 아슬아슬했습니다."
			: stats.failureReason === "timeout"
				? "시간이 먼저 바닥나 미션이 중단됐습니다."
				: stats.failureReason === "strikes"
					? "오판이 누적되어 스트라이크 한도를 넘겼습니다."
					: "실제 차단기를 놓쳐 미션이 실패했습니다.";

	return {
		missionId: mission.id,
		missionTitle: mission.title,
		outcome: stats.outcome,
		grade,
		totalScore,
		remainingTimeSec: Math.max(0, stats.timeRemainingSec),
		mistakes: stats.wrongActions,
		realBlockersResolved: stats.realBlockersResolved,
		completionRatio,
		headline,
		nextActionLabel:
			stats.outcome === "cleared" ? "다른 미션 선택" : "같은 미션 다시 하기",
		failureReason: stats.failureReason,
		lastMistake: stats.lastMistake,
	};
}
