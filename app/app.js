// Leonida Legend - app shell: loads the data, routes on the hash,
// renders the views and wires every control. Plain files, no network
// beyond this app's own directory, no cookies, no service worker.

const App = (() => {
  const state = {
    data: null,
    ui: {
      q: '',
      kind: 'all',
      grade: 'all',
      sort: 'roadmap',
      group: true,
      watchOnly: false,
      unconfirmedOnly: false,
      shield: !new URLSearchParams(location.search).has('demo'),
    },
  };

  const view = document.getElementById('view');
  const shieldToggle = document.getElementById('toggle-shield');
  shieldToggle.checked = state.ui.shield;

  function updateMasthead() {
    const total = state.data ? state.data.trophies.length : 55;
    const got = Tracker.count();
    document.getElementById('mast-earned').textContent = String(got);
    document.getElementById('mast-bar').style.width = `${Math.round((got / total) * 100)}%`;
    document.getElementById('mast-note').textContent = Tracker.isDemo
      ? 'Showing the demo sample progress (14 of 55 seeded). Import real progress to replace it.'
      : 'Progress is stored only in this browser.';
  }

  function setNav(route) {
    document.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('active', a.dataset.nav === route);
    });
  }

  function render() {
    if (!state.data) return;
    const hash = location.hash || '#/';
    const trophyMatch = hash.match(/^#\/trophy\/(.+)$/);
    updateMasthead();
    if (trophyMatch) {
      const t = state.data.byId.get(decodeURIComponent(trophyMatch[1]));
      if (!t) {
        view.innerHTML = '<p>That trophy is not on the list. <a href="#/">Back to the board</a></p>';
        setNav('board');
        return;
      }
      view.innerHTML = detailHTML(t, state.data);
      setNav('board');
    } else if (hash === '#/roadmap') {
      view.innerHTML = roadmapHTML(state.data);
      setNav('roadmap');
    } else if (hash === '#/method') {
      view.innerHTML = methodHTML();
      setNav('method');
    } else {
      view.innerHTML = boardHTML(state.data, state.ui);
      setNav('board');
    }
    window.scrollTo(0, 0);
  }

  function rerenderBoard() {
    const hash = location.hash || '#/';
    if (hash === '#/' || hash === '#') render();
    else location.hash = '#/';
  }

  view.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-kind]');
    if (chip) {
      state.ui.kind = chip.dataset.kind;
      render();
      return;
    }
    const toggleBtn = event.target.closest('button[data-toggle]');
    if (toggleBtn) {
      Tracker.toggle(toggleBtn.dataset.toggle);
      render();
    }
  });

  view.addEventListener('change', (event) => {
    const el = event.target;
    if (el.matches('[data-toggle]') && el.type === 'checkbox') {
      Tracker.setEarned(el.dataset.toggle, el.checked);
      render();
      return;
    }
    if (el.id === 'ctl-grade') state.ui.grade = el.value;
    else if (el.id === 'ctl-sort') state.ui.sort = el.value;
    else if (el.id === 'ctl-group') state.ui.group = el.checked;
    else if (el.id === 'ctl-watch') state.ui.watchOnly = el.checked;
    else if (el.id === 'ctl-unconf') state.ui.unconfirmedOnly = el.checked;
    else return;
    render();
  });

  view.addEventListener('input', (event) => {
    if (event.target.id !== 'ctl-q') return;
    state.ui.q = event.target.value;
    const cards = view.querySelectorAll('.cards, .step-head');
    render();
    const q = document.getElementById('ctl-q');
    if (q) {
      q.focus();
      q.setSelectionRange(q.value.length, q.value.length);
    }
    void cards;
  });

  shieldToggle.addEventListener('change', () => {
    state.ui.shield = shieldToggle.checked;
    render();
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([Tracker.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leonida-legend-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  const fileInput = document.getElementById('file-import');
  document.getElementById('btn-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      Tracker.importJson(await file.text());
      rerenderBoard();
      if ((location.hash || '#/') !== '#/') render();
    } catch (e) {
      alert(`That file could not be imported: ${e.message}`);
    }
    fileInput.value = '';
  });

  window.addEventListener('hashchange', render);

  async function boot() {
    try {
      const [trophiesRes, roadmapRes] = await Promise.all([
        fetch('data/trophies.json'),
        fetch('data/roadmap.json'),
      ]);
      if (!trophiesRes.ok || !roadmapRes.ok) throw new Error('data files did not load');
      const trophiesData = await trophiesRes.json();
      const roadmapData = await roadmapRes.json();
      const trophies = trophiesData.trophies;
      state.data = {
        trophies,
        roadmap: roadmapData,
        byId: new Map(trophies.map((t) => [t.id, t])),
      };
      render();
    } catch (e) {
      view.innerHTML = `<p>The trophy list could not be loaded (${esc(e.message)}). The guide is plain files - serve the app/ directory over HTTP and reload.</p>`;
    }
  }

  boot();
  return state;
})();
