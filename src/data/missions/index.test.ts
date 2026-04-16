import { describe, expect, it } from 'vitest';

import { getMissionDefinition, missionCards, missions } from "./index";

describe('mission definitions', () => {
	it("missions expose at least two playable definitions", () => {
		expect(missions.length).toBeGreaterThanOrEqual(2);
		expect(missionCards).toHaveLength(missions.length);
	});

	it("recommended mission is listed first and lookups succeed", () => {
		expect(missions[0]?.id).toBe("office-mail-001");
		expect(
			getMissionDefinition("deploy-hotfix-001")?.title,
		).toBe("핫픽스 배포 전 마지막 구조 신호 잡기");
	});
});
