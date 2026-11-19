// Progress tracker: earned state in localStorage, demo seeding, export/import.
const KEY = 'leonida-legend-progress-v1';

// The honest demo sample used for screenshots: 14 of 55 earned - the story
// through Chapter 3, a strand finished, a few activities. No unconfirmed
// trophy is in the earned set, and neither is the missable watch.
export const DEMO_EARNED = [1, 2, 7, 3, 8, 9, 4, 15, 16, 19, 20, 24, 32, 35];

export function isDemo() {
  return new URLSearchParams(location.search).has('demo');
}

export function loadEarned() {
  if (isDemo()) return new Set(DEMO_EARNED);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* storage unavailable - run session-only */ }
  return new Set();
}

export function saveEarned(earned) {
  if (isDemo()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...earned]));
  } catch { /* session-only */ }
}

export function exportProgress(earned) {
  return JSON.stringify({ app: 'leonida-legend', earned: [...earned].sort((a, b) => a - b) });
}

export function importProgress(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data.earned;
  if (!Array.isArray(list)) throw new Error('no earned list in that file');
  return new Set(list.filter((n) => Number.isInteger(n)));
}
