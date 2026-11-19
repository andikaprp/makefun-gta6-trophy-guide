// Leonida Legend - entry point: load the data, wire the header, route.
// Hash routes: #/ board, #/trophy/<id> detail, #/roadmap, #/method.

import { seedDemoIfAsked, spoilersOn, setSpoilers, exportProgress, importProgress, earnedIds } from './lib/tracker.js';
import { boardView, detailView, roadmapView, methodView, bindBoard, bindToggles } from './lib/views.js';

const viewEl = document.getElementById('view');
const headProgress = document.getElementById('head-progress');
const spoilerToggle = document.getElementById('spoiler-toggle');
const importFile = document.getElementById('import-file');

let data = null;
let keepSearchFocus = false;

async function loadData() {
  const [trophiesRes, roadmapRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
  ]);
  const trophiesDoc = await trophiesRes.json();
  const roadmapDoc = await roadmapRes.json();
  return {
    trophies: Array.isArray(trophiesDoc) ? trophiesDoc : trophiesDoc.trophies,
    roadmap: roadmapDoc,
  };
}

function currentRoute() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'trophy' && parts[1]) return { name: 'detail', id: Number(parts[1]) };
  if (parts[0] === 'roadmap') return { name: 'roadmap' };
  if (parts[0] === 'method') return { name: 'method' };
  return { name: 'board' };
}

function render(focusSearch = false) {
  if (!data) return;
  const route = currentRoute();
  headProgress.textContent = `${earnedIds().length} / ${data.trophies.length}`;
  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('on', a.dataset.nav === route.name || (route.name === 'detail' && a.dataset.nav === 'board'));
  });
  if (route.name === 'detail') {
    viewEl.innerHTML = detailView(data, route.id);
    bindToggles(viewEl, () => render());
  } else if (route.name === 'roadmap') {
    viewEl.innerHTML = roadmapView(data);
  } else if (route.name === 'method') {
    viewEl.innerHTML = methodView(data);
  } else {
    viewEl.innerHTML = boardView(data);
    bindBoard(viewEl, (fromSearch) => render(fromSearch));
    if (focusSearch) {
      const q = viewEl.querySelector('#q');
      if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
    }
  }
  if (!keepSearchFocus) window.scrollTo(0, 0);
  keepSearchFocus = focusSearch;
}

async function main() {
  seedDemoIfAsked();
  spoilerToggle.checked = spoilersOn();
  spoilerToggle.addEventListener('change', () => { setSpoilers(spoilerToggle.checked); render(); });
  document.getElementById('export-btn').addEventListener('click', exportProgress);
  document.getElementById('import-btn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    const file = importFile.files?.[0];
    if (file) importProgress(file, () => { spoilerToggle.checked = spoilersOn(); render(); });
    importFile.value = '';
  });
  window.addEventListener('hashchange', () => render());
  try {
    data = await loadData();
    render();
  } catch (err) {
    viewEl.innerHTML = `<p class="empty">The guide data failed to load (${err.message}). Serve the app over HTTP - see serve.ts - rather than from a file path.</p>`;
  }
}

main();
