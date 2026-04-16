import { describe, expect, it } from 'vitest';

import { createResultSummary } from "./resultSummary";

describe('createResultSummary', () => {
	it("returns S-grade clear summary for strong performance", () => {
		const summary = createResultSummary({
			missionId: "office-mail-001",
			outcome: "cleared",
			timeRemainingSec: 40,
			strikesUsed: 0,
			stepsCompleted: 4,
			totalSteps: 4,
			realBlockersResolved: 1,
			requiredBlockersTotal: 1,
			fakePopupsDismissed: 2,
			wrongActions: 0,
		});

		expect(summary.grade).toBe("S");
		expect(summary.totalScore).toBe(890);
		expect(summary.nextActionLabel).toBe("다른 미션 선택");
	});

	it("returns fail summary with failure headline", () => {
		const summary = createResultSummary({
			missionId: "deploy-hotfix-001",
			outcome: "failed",
			timeRemainingSec: -3,
			strikesUsed: 3,
			stepsCompleted: 2,
			totalSteps: 4,
			realBlockersResolved: 0,
			requiredBlockersTotal: 1,
			fakePopupsDismissed: 1,
			wrongActions: 3,
			failureReason: "strikes",
			lastMistake: "가짜 창의 확인 버튼을 눌렀습니다.",
		});

		expect(summary.grade).toBe("Fail");
		expect(summary.totalScore).toBe(0);
		expect(summary.remainingTimeSec).toBe(0);
		expect(summary.headline).toMatch(/스트라이크/);
	});
});
