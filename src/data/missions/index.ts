import type {
	MissionCardViewModel,
	MissionDefinition,
} from "../../features/missions/types";
import { missionDefinitions } from "./definitions";

export const missions = [...missionDefinitions].sort((left, right) => {
	if (left.recommended !== right.recommended) {
		return left.recommended ? -1 : 1;
	}

	const difficultyOrder = { easy: 0, normal: 1, hard: 2 } as const;
	const difficultyDiff =
		difficultyOrder[left.difficulty] - difficultyOrder[right.difficulty];

	if (difficultyDiff !== 0) {
		return difficultyDiff;
	}

	return left.title.localeCompare(right.title, "ko-KR");
});

export const missionCards: MissionCardViewModel[] = missions.map((mission) => ({
	id: mission.id,
	title: mission.title,
	brief: mission.brief,
	difficulty: mission.difficulty,
	timeLimitSec: mission.timeLimitSec,
	estimatedPlayMinutes: mission.estimatedPlayMinutes,
	recommended: mission.recommended,
}));

export function getMissionDefinition(
	missionId: string,
): MissionDefinition | undefined {
	return missions.find((mission) => mission.id === missionId);
}
