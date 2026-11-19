// Leonida Legend - progress tracker.
// Earned state lives in localStorage on this device only. Nothing is sent
// anywhere. Export downloads a small JSON file; import reads one back.
//
// Demo mode: opening the app with ?demo=1 and no saved progress seeds an
// honest sample (14 of 55 earned, all plausible early-game trophies) so
// screenshots and first visits show the tracker mid-journey. The sample
// is labelled as a sample wherever it matters.

const Tracker = (() => {
  const KEY = 'leonida-legend.progress.v1';

  const DEMO_EARNED = [
    'paradise-lost',
    'one-last-thing',
    'trust',
    'just-like-paradise',
    'ts-ass-drug-money',
    'master-of-none',
    'stick-fiddler',
    'baited-my-tackle',
    'the-shootist',
    'whip-it-good',
    'gunslinger',
    'catch-me-if-you-can',
    'vice-city-baby',
    'family-matters',
  ];

  let earned = new Set();
  let isDemo = false;

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ earned: [...earned], demo: isDemo }));
    } catch (e) {
      /* storage unavailable (private mode, file://) - progress just won't persist */
    }
  }

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      raw = null;
    }
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.earned)) {
          earned = new Set(parsed.earned.filter((x) => typeof x === 'string'));
          isDemo = parsed.demo === true;
          return;
        }
      } catch (e) {
        /* a corrupt save falls through to a fresh start */
      }
    }
    if (new URLSearchParams(location.search).has('demo')) {
      earned = new Set(DEMO_EARNED);
      isDemo = true;
      save();
    }
  }

  load();

  return {
    get isDemo() {
      return isDemo;
    },
    isEarned(id) {
      return earned.has(id);
    },
    toggle(id) {
      if (earned.has(id)) earned.delete(id);
      else earned.add(id);
      save();
      return earned.has(id);
    },
    setEarned(id, value) {
      if (value) earned.add(id);
      else earned.delete(id);
      save();
    },
    count() {
      return earned.size;
    },
    ids() {
      return [...earned];
    },
    exportJson() {
      return JSON.stringify(
        { app: 'leonida-legend', version: 1, earned: [...earned].sort() },
        null,
        2,
      );
    },
    importJson(text) {
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(list)) throw new Error('no earned list in that file');
      earned = new Set(list.filter((x) => typeof x === 'string'));
      isDemo = false;
      save();
      return earned.size;
    },
  };
})();
