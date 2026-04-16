import assert from "node:assert/strict";
import test from "node:test";

import { getMissionDefinition, missionCards, missions } from "./index";

test("missions expose at least two playable definitions", () => {
	assert.ok(missions.length >= 2);
	assert.equal(missionCards.length, missions.length);
});

test("recommended mission is listed first and lookups succeed", () => {
	assert.equal(missions[0]?.id, "office-mail-001");
	assert.equal(
		getMissionDefinition("deploy-hotfix-001")?.title,
		"핫픽스 배포 전 마지막 구조 신호 잡기",
	);
});
