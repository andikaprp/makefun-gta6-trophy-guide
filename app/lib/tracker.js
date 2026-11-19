// Leonida Legend - progress tracker.
// State lives in localStorage only; nothing is sent anywhere. The module
// owns the earned set, the spoiler shield and export/import, and knows how
// to seed an honest demo state for screenshots (?demo=1).

const STORAGE_KEY = 'leonida-legend-v2';

// A plausible mid-run save for the demo screenshots: the prologue and
// Chapter 1 done, a few campaign missions, and the cheap free-roam
// trophies a player picks up on the way. 14 of 55.
const DEMO_EARNED = [1, 2, 3, 7, 8, 15, 19, 20, 24, 30, 34, 41, 47, 54];

function blankState() {
  return { v: 2, earned: {}, spoilers: true };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.earned !== 'object') return blankState();
    return { v: 2, earned: parsed.earned ?? {}, spoilers: parsed.spoilers !== false };
  } catch {
    return blankState();
  }
}

let state = loadState();

export function seedDemoIfAsked() {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1' && Object.keys(state.earned).length === 0) {
    for (const id of DEMO_EARNED) state.earned[id] = true;
    saveState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the app still works for this session.
  }
}

export function isEarned(id) {
  return state.earned[id] === true;
}

export function toggleEarned(id) {
  if (state.earned[id]) delete state.earned[id];
  else state.earned[id] = true;
  saveState();
  return state.earned[id] === true;
}

export function earnedIds() {
  return Object.keys(state.earned).filter((k) => state.earned[k]).map(Number);
}

export function spoilersOn() {
  return state.spoilers;
}

export function setSpoilers(on) {
  state.spoilers = on === true;
  saveState();
}

export function exportProgress() {
  const payload = JSON.stringify({ app: 'leonida-legend', v: 2, earned: earnedIds(), spoilers: state.spoilers }, null, 1);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leonida-legend-progress.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importProgress(file, done) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const list = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(list)) throw new Error('no earned list');
      state.earned = {};
      for (const id of list) if (Number.isInteger(id)) state.earned[id] = true;
      if (typeof parsed.spoilers === 'boolean') state.spoilers = parsed.spoilers;
      saveState();
      done(true);
    } catch {
      done(false);
    }
  };
  reader.onerror = () => done(false);
  reader.readAsText(file);
}
