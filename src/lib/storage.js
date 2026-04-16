const STORAGE_KEY = 'error-popup-hell:save-v1';

function createDefaultSave() {
  return {
    tutorialSeen: false,
    bestRuns: {},
    recentRuns: [],
  };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultSave();
    }

    const parsed = JSON.parse(raw);
    return {
      tutorialSeen: Boolean(parsed.tutorialSeen),
      bestRuns: parsed.bestRuns && typeof parsed.bestRuns === 'object' ? parsed.bestRuns : {},
      recentRuns: Array.isArray(parsed.recentRuns) ? parsed.recentRuns : [],
    };
  } catch {
    return createDefaultSave();
  }
}

export function saveRunSummary(summary) {
  const save = loadSave();
  const currentBest = save.bestRuns[summary.missionId];

  if (!currentBest || summary.score > currentBest.score) {
    save.bestRuns[summary.missionId] = summary;
  }

  save.recentRuns = [summary, ...save.recentRuns].slice(0, 8);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));

  return save;
}

export function markTutorialSeen() {
  const save = loadSave();
  save.tutorialSeen = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  return save;
}
