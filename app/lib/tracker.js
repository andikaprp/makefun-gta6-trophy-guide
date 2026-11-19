// Leonida Legend - progress tracker.
// Progress lives in this browser's localStorage and nowhere else.
// Export/import moves it between browsers as a small JSON document.

const STORAGE_KEY = 'leonida-legend.progress.v2';

// The honest sample used for ?demo=1 - a plausible early playthrough:
// chapters 1-4 and Gone Fishing done, three named missions, the activity
// sampler, and a handful of world trophies. 14 of 55, seeded by the
// trophies' list numbers so it cannot drift from the data.
export const DEMO_NS = [1, 2, 3, 4, 5, 7, 9, 10, 15, 19, 20, 35, 43, 45];

function blankState() {
  return { earned: {}, spoilers: true, demo: false };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.earned !== 'object') return null;
    return { ...blankState(), ...parsed };
  } catch {
    return null;
  }
}

export function createTracker(trophies, { demo = false } = {}) {
  let state = load();
  if (!state) {
    state = blankState();
    if (demo) {
      state.demo = true;
      const wanted = new Set(DEMO_NS);
      for (const t of trophies) if (wanted.has(t.n)) state.earned[t.id] = true;
    }
    persist();
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* private mode: run in memory */ }
  }

  return {
    isDemo: () => state.demo === true,
    spoilers: () => state.spoilers !== false,
    setSpoilers(value) { state.spoilers = !!value; persist(); },
    isEarned: (id) => state.earned[id] === true,
    toggle(id) {
      if (state.earned[id]) delete state.earned[id];
      else state.earned[id] = true;
      persist();
      return state.earned[id] === true;
    },
    earnedCount: () => trophies.filter((t) => state.earned[t.id]).length,
    gradeCounts() {
      const out = {};
      for (const t of trophies) {
        out[t.grade] ??= { have: 0, total: 0 };
        out[t.grade].total += 1;
        if (state.earned[t.id]) out[t.grade].have += 1;
      }
      return out;
    },
    kindCounts() {
      const out = {};
      for (const t of trophies) {
        out[t.type] ??= { have: 0, total: 0 };
        out[t.type].total += 1;
        if (state.earned[t.id]) out[t.type].have += 1;
      }
      return out;
    },
    stepCounts(roadmap) {
      const out = {};
      for (const s of roadmap.steps) {
        const ids = s.trophy_ids;
        out[s.step] = { have: ids.filter((id) => state.earned[id]).length, total: ids.length };
      }
      return out;
    },
    exportText() {
      return JSON.stringify({ app: 'leonida-legend', version: 2, earned: Object.keys(state.earned).filter((id) => state.earned[id]) }, null, 1);
    },
    importText(text) {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(list)) throw new Error('no earned list in that file');
      const known = new Set(trophies.map((t) => t.id));
      const next = {};
      for (const id of list) if (known.has(id)) next[id] = true;
      state.earned = next;
      state.demo = false;
      persist();
      return Object.keys(next).length;
    },
  };
}
