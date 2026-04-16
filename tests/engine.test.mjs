import test from 'node:test';
import assert from 'node:assert/strict';

import { getMissionById } from '../src/data/missions/index.js';
import { createRunState, tickRun, attemptStep, resolvePopupAction } from '../src/features/gameplay/engine.js';

test('real blocker must be resolved before blocked step can succeed', () => {
  const mission = getMissionById('office-mail-001');
  let run = createRunState(mission, 0);

  run = attemptStep(run, { value: 'q3-final-pitch', confirmed: true });
  run = tickRun(run, 12_500);
  assert.equal(run.activePopups.some((popup) => popup.id === 'storage-quota'), true);

  const blockedAttempt = attemptStep(run, { confirmed: true });
  assert.equal(blockedAttempt.stepIndex, 1);
  assert.equal(blockedAttempt.strikes, 1);

  const recovered = resolvePopupAction(blockedAttempt, 'storage-quota', 'fix');
  const advanced = attemptStep(recovered, { confirmed: true });
  assert.equal(advanced.stepIndex, 2);
});

test('wrong fake popup interaction costs time', () => {
  const mission = getMissionById('office-mail-001');
  let run = createRunState(mission, 0);

  run = tickRun(run, 18_500);
  assert.equal(run.activePopups.some((popup) => popup.id === 'newsletter-bomb'), true);

  const mistaken = resolvePopupAction(run, 'newsletter-bomb', 'fix');
  assert.equal(mistaken.timeLostMs, 8000);
  assert.equal(mistaken.wrongActions, 1);
  assert.equal(mistaken.activePopups.some((popup) => popup.id === 'newsletter-bomb'), false);
});

test('successful run computes passing score and grade', () => {
  const mission = getMissionById('dev-hotfix-001');
  let run = createRunState(mission, 0);

  run = attemptStep(run, { confirmed: true });
  run = tickRun(run, 10_500);
  run = resolvePopupAction(run, 'ssh-token', 'fix');
  run = attemptStep(run, { confirmed: true });
  run = attemptStep(run, { value: '#release-bridge', confirmed: true });
  run = tickRun(run, 25_000);
  run = resolvePopupAction(run, 'deploy-freeze', 'confirm');
  run = attemptStep(run, { confirmed: true });

  assert.equal(run.status, 'won');
  assert.equal(run.scoreSummary.didWin, true);
  assert.ok(['S', 'A', 'B'].includes(run.scoreSummary.grade));
  assert.ok(run.scoreSummary.score > 0);
});
