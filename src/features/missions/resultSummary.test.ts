import assert from "node:assert/strict";
import test from "node:test";

import { createResultSummary } from "./resultSummary";

test("createResultSummary returns S-grade clear summary for strong performance", () => {
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

	assert.equal(summary.grade, "S");
	assert.equal(summary.totalScore, 890);
	assert.equal(summary.nextActionLabel, "다른 미션 선택");
});

test("createResultSummary returns fail summary with failure headline", () => {
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

	assert.equal(summary.grade, "Fail");
	assert.equal(summary.totalScore, 0);
	assert.equal(summary.remainingTimeSec, 0);
	assert.match(summary.headline, /스트라이크/);
});
