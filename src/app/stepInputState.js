const STEP_INPUT_SELECTOR = '[data-step-input]';

export function createStepInputState() {
  return {
    drafts: {},
    active: null,
  };
}

export function resetStepInputState(state) {
  state.drafts = {};
  state.active = null;
}

export function getStepInputKey(runState, step) {
  if (!runState || !step || step.actionType !== 'input') {
    return null;
  }

  return `${runState.runId}:${step.id}`;
}

export function readStepInputDraft(state, key) {
  if (!key) {
    return '';
  }

  return state.drafts[key] ?? '';
}

export function updateStepInputDraft(state, key, value) {
  if (!key) {
    return;
  }

  state.drafts[key] = value;
}

export function captureActiveStepInput(root, state) {
  if (!root) {
    return;
  }

  const input = root.querySelector(STEP_INPUT_SELECTOR);
  if (!input || document.activeElement !== input) {
    state.active = null;
    return;
  }

  const key = input.dataset.stepKey || null;
  if (!key) {
    state.active = null;
    return;
  }

  updateStepInputDraft(state, key, input.value);
  state.active = {
    key,
    start: input.selectionStart ?? input.value.length,
    end: input.selectionEnd ?? input.value.length,
  };
}

export function restoreActiveStepInput(root, state) {
  if (!root || !state.active) {
    return;
  }

  const input = root.querySelector(STEP_INPUT_SELECTOR);
  if (!input) {
    state.active = null;
    return;
  }

  const key = input.dataset.stepKey || null;
  if (!key || key !== state.active.key) {
    return;
  }

  input.focus({ preventScroll: true });

  const valueLength = input.value.length;
  const start = Math.min(state.active.start ?? valueLength, valueLength);
  const end = Math.min(state.active.end ?? start, valueLength);

  input.setSelectionRange(start, end);
}

export function isStepInputElement(target) {
  return Boolean(target?.matches?.(STEP_INPUT_SELECTOR));
}