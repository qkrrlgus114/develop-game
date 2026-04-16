import { completeTask, createRunState, getCurrentStep, resolvePopupAction, tickRun } from './engine';
import { missions } from './missions';

describe('game engine', () => {
  it('advances on completed tasks and successful real popup resolution', () => {
    let state = createRunState(missions[0]);

    state = completeTask(state);
    expect(state.completedTasks).toHaveLength(1);
    expect(getCurrentStep(state)?.type).toBe('popup');

    state = resolvePopupAction(state, 'dismiss');
    expect(state.strikes).toBe(0);
    expect(getCurrentStep(state)?.type).toBe('task');

    state = completeTask(state);
    state = resolvePopupAction(state, 'resolve');

    expect(state.handledRealPopups).toBe(1);
    expect(getCurrentStep(state)?.type).toBe('task');
  });

  it('keeps real popups active after a wrong action and applies penalties', () => {
    let state = createRunState(missions[1]);
    state = completeTask(state);

    state = resolvePopupAction(state, 'dismiss');

    expect(state.strikes).toBe(1);
    expect(state.timeRemaining).toBe(missions[1].timeLimitSeconds - 15);
    expect(getCurrentStep(state)?.id).toBe('disk-alert');
  });

  it('fails when the timer reaches zero', () => {
    let state = createRunState(missions[0]);

    for (let index = 0; index < missions[0].timeLimitSeconds; index += 1) {
      state = tickRun(state);
    }

    expect(state.status).toBe('failure');
    expect(state.result?.reason).toContain('시간 초과');
  });
});
