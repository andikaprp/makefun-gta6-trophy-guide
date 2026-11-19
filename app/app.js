// Leonida Legend - entry point. Hash routing over three views plus trophy
// detail pages; all state changes re-render the current view.

import { createTracker } from './lib/tracker.js';
import { boardView, detailView, roadmapView, methodView } from './lib/views.js';

const viewEl = document.getElementById('view');
const ui = { query: '', kind: 'all', grade: 'all', sort: 'roadmap', group: true };

let data = null;
let tracker = null;

async function loadData() {
  const [trophiesDoc, roadmapDoc] = await Promise.all([
    fetch('data/trophies.json').then((r) => r.json()),
    fetch('data/roadmap.json').then((r) => r.json()),
  ]);
  return { trophies: trophiesDoc.trophies, roadmap: roadmapDoc };
}

function route() {
  const hash = location.hash || '#/';
  const trophyMatch = hash.match(/^#\/trophy\/(.+)$/);
  let nav = 'board';
  if (trophyMatch) {
    viewEl.innerHTML = detailView({ ...data, tracker }, decodeURIComponent(trophyMatch[1]));
  } else if (hash.startsWith('#/roadmap')) {
    nav = 'roadmap';
    viewEl.innerHTML = roadmapView({ ...data, tracker });
  } else if (hash.startsWith('#/method')) {
    nav = 'method';
    viewEl.innerHTML = methodView(data);
  } else {
    viewEl.innerHTML = boardView({ ...data, tracker, ui });
    const q = document.getElementById('q');
    if (q && ui.query) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === nav);
  });
  window.scrollTo(0, 0);
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function bindChrome() {
  const spoiler = document.getElementById('spoiler-toggle');
  spoiler.checked = tracker.spoilers();
  spoiler.addEventListener('change', () => { tracker.setSpoilers(spoiler.checked); route(); });

  document.getElementById('export-btn').addEventListener('click', () => {
    download('leonida-legend-progress.json', tracker.exportText());
  });
  const file = document.getElementById('import-file');
  document.getElementById('import-btn').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    if (!file.files.length) return;
    try {
      const count = tracker.importText(await file.files[0].text());
      alert(`Imported progress: ${count} trophies earned.`);
    } catch {
      alert('That file is not a Leonida Legend progress export.');
    }
    file.value = '';
    route();
  });
}

viewEl.addEventListener('click', (ev) => {
  const toggle = ev.target.closest('[data-toggle]');
  if (toggle) { tracker.toggle(toggle.dataset.toggle); route(); return; }
  const chip = ev.target.closest('[data-kind]');
  if (chip) { ui.kind = chip.dataset.kind; route(); }
});
viewEl.addEventListener('input', (ev) => {
  if (ev.target.id === 'q') { ui.query = ev.target.value; route(); }
});
viewEl.addEventListener('change', (ev) => {
  if (ev.target.id === 'grade-sel') { ui.grade = ev.target.value; route(); }
  if (ev.target.id === 'sort-sel') { ui.sort = ev.target.value; route(); }
  if (ev.target.id === 'group-toggle') { ui.group = ev.target.checked; route(); }
});

window.addEventListener('hashchange', route);

loadData()
  .then((loaded) => {
    data = loaded;
    const demo = new URLSearchParams(location.search).has('demo');
    tracker = createTracker(data.trophies, { demo });
    bindChrome();
    route();
  })
  .catch((err) => {
    viewEl.innerHTML = `<p class="empty">The guide data could not be loaded (${err.message}). Serve the folder with <b>node serve.ts</b> and open it over the local address it prints.</p>`;
  });
