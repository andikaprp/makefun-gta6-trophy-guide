// Leonida Legend - app entry: data loading, routing, the master-detail
// board, the roadmap and the watch list. Plain ES modules, no build step,
// nothing loaded over the network beyond this folder's own files.
import { loadEarned, saveEarned, exportProgress, importProgress } from './lib/tracker.js';
import {
  parseGuide, statusOf, displayName, displayDesc, gradeChip, metaChips, sourcesLine,
  guideHtml, guidePanel, checklistRow, gradeBars, kindCounts,
} from './lib/views.js';

const state = {
  trophies: [],
  roadmap: null,
  earned: loadEarned(),
  selected: 16,
  shield: true,
  query: '',
  kind: 'all',
  grade: 'all',
  sort: 'roadmap',
  watchOnly: false,
};

const $app = document.getElementById('app');
const $progress = document.getElementById('progressBox');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function boot() {
  const [tRes, rRes] = await Promise.all([fetch('data/trophies.json'), fetch('data/roadmap.json')]);
  state.trophies = (await tRes.json()).trophies;
  state.roadmap = await rRes.json();
  const sel = new URLSearchParams(location.search).get('select');
  if (sel && state.trophies.some((t) => t.id === Number(sel))) state.selected = Number(sel);
  window.addEventListener('hashchange', render);
  $app.addEventListener('click', onClick);
  $app.addEventListener('input', onInput);
  $app.addEventListener('change', onChange);
  render();
}

function byId(id) {
  return state.trophies.find((t) => t.id === id);
}

function progressHtml() {
  const got = state.trophies.filter((t) => state.earned.has(t.id)).length;
  return `<div class="progress-num">${got}<span>/55 earned</span></div>${gradeBars(state.trophies, state.earned)}`;
}

function visibleTrophies() {
  let list = [...state.trophies];
  if (state.watchOnly) list = list.filter((t) => t.missable || statusOf(t) === 'unconfirmed');
  if (state.kind !== 'all') list = list.filter((t) => t.type === state.kind);
  if (state.grade !== 'all') list = list.filter((t) => t.grade === state.grade);
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }
  if (state.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (state.sort === 'grade') {
    const rank = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    list.sort((a, b) => rank[a.grade] - rank[b.grade] || a.id - b.id);
  } else if (state.sort === 'unearned') list.sort((a, b) => Number(state.earned.has(a.id)) - Number(state.earned.has(b.id)) || a.id - b.id);
  else list.sort((a, b) => a.roadmap_step - b.roadmap_step || a.id - b.id);
  return list;
}

function filterBar(watch) {
  const kinds = ['all', ...new Set(state.trophies.map((t) => t.type))];
  const grades = ['all', 'platinum', 'gold', 'silver', 'bronze'];
  return `<div class="filters">
    <input type="search" id="q" placeholder="Search name or description" value="${esc(state.query)}">
    <select id="kindSel">${kinds.map((k) => `<option ${k === state.kind ? 'selected' : ''}>${k}</option>`).join('')}</select>
    <select id="gradeSel">${grades.map((g) => `<option ${g === state.grade ? 'selected' : ''}>${g}</option>`).join('')}</select>
    <select id="sortSel">
      <option value="roadmap" ${state.sort === 'roadmap' ? 'selected' : ''}>roadmap order</option>
      <option value="name" ${state.sort === 'name' ? 'selected' : ''}>name</option>
      <option value="grade" ${state.sort === 'grade' ? 'selected' : ''}>grade</option>
      <option value="unearned" ${state.sort === 'unearned' ? 'selected' : ''}>unearned first</option>
    </select>
    <label class="shield-toggle"><input type="checkbox" id="shieldSel" ${state.shield ? 'checked' : ''}> spoiler shield</label>
    ${watch ? '<span class="watch-flag">watch list: missable + unconfirmed only</span>' : ''}
  </div>`;
}

function boardHtml(watch) {
  const list = visibleTrophies();
  const groups = new Map();
  for (const t of list) {
    if (!groups.has(t.roadmap_step)) groups.set(t.roadmap_step, []);
    groups.get(t.roadmap_step).push(t);
  }
  const groupHtml = [...groups.entries()].map(([step, items]) => {
    const meta = state.roadmap.steps.find((s) => s.step === step);
    return `<section class="step-group"><h3>Step ${step} - ${esc(meta ? meta.title : '')}</h3>
      <ul class="checklist">${items.map((t) => checklistRow(t, state.earned, state.shield, state.selected)).join('')}</ul></section>`;
  }).join('');
  const sel = byId(state.selected) ?? list[0] ?? state.trophies[0];
  return `<div class="board-wrap">
    <div class="board-main">
      <div class="board-stats">${kindCounts(state.trophies)}</div>
      ${filterBar(watch)}
      <div class="groups">${groupHtml || '<p class="empty">No trophies match those filters.</p>'}</div>
    </div>
    <aside class="board-panel">${sel ? guidePanel(sel, state.earned) : ''}</aside>
  </div>`;
}

function detailHtml(t) {
  const done = state.earned.has(t.id);
  return `<div class="detail-wrap">
    <a class="back" href="#/">&larr; back to the board</a>
    <div class="detail-card">
      <h2>${esc(t.name)}</h2>
      <p class="desc big">${esc(t.description)}</p>
      <div class="chips">${metaChips(t)}</div>
      ${sourcesLine(t)}
      ${t.missable_note ? `<p class="watch-note">${esc(t.missable_note)}</p>` : ''}
      <div class="guide-body detail-guide">${guideHtml(t)}</div>
      <button class="earn-btn" data-toggle="${t.id}">${done ? 'Earned - tap to undo' : 'Mark as earned'}</button>
    </div>
  </div>`;
}

function roadmapHtml() {
  const steps = state.roadmap.steps.map((s) => {
    const items = s.trophy_ids.map((id) => byId(id)).filter(Boolean);
    const got = items.filter((t) => state.earned.has(t.id)).length;
    return `<section class="rm-step ${s.point_of_no_return ? 'rm-ponr' : ''}">
      <div class="rm-head"><h3>Step ${s.step} - ${esc(s.title)}</h3><span class="rm-count">${got}/${items.length}</span></div>
      <p class="rm-meta">Depends on: ${s.depends_on.length ? s.depends_on.map((d) => `step ${d}`).join(', ') : 'nothing - start here'} · Effort: ${esc(s.effort)}</p>
      ${s.point_of_no_return ? `<p class="ponr">${esc(s.ponr_note ?? '')}</p>` : ''}
      <p>${esc(s.summary)}</p>
      <div class="rm-chips">${items.map((t) => `<a class="rm-chip ${state.earned.has(t.id) ? 'done' : ''}" href="#/trophy/${t.id}">${esc(displayName(t, state.earned, state.shield))}</a>`).join(' ')}</div>
    </section>`;
  }).join('');
  return `<div class="roadmap-wrap"><h2>${esc(state.roadmap.title)}</h2>
    <p class="credits">${esc(state.roadmap.credits)}</p>${steps}</div>`;
}

function render() {
  $progress.innerHTML = progressHtml();
  const hash = location.hash || '#/';
  const trophyMatch = hash.match(/^#\/trophy\/(\d+)$/);
  document.querySelectorAll('.mainnav a').forEach((a) => a.classList.remove('active'));
  if (trophyMatch && byId(Number(trophyMatch[1]))) {
    $app.innerHTML = detailHtml(byId(Number(trophyMatch[1])));
  } else if (hash === '#/roadmap') {
    document.querySelector('[data-nav="roadmap"]')?.classList.add('active');
    $app.innerHTML = roadmapHtml();
  } else if (hash === '#/watch') {
    document.querySelector('[data-nav="watch"]')?.classList.add('active');
    state.watchOnly = true;
    $app.innerHTML = boardHtml(true);
  } else {
    document.querySelector('[data-nav="board"]')?.classList.add('active');
    state.watchOnly = false;
    $app.innerHTML = boardHtml(false);
  }
}

function toggleEarned(id) {
  if (state.earned.has(id)) state.earned.delete(id);
  else state.earned.add(id);
  saveEarned(state.earned);
  render();
}

function onClick(ev) {
  const toggle = ev.target.closest('[data-toggle]');
  if (toggle) {
    ev.stopPropagation();
    toggleEarned(Number(toggle.dataset.toggle));
    return;
  }
  const row = ev.target.closest('[data-select]');
  if (row) {
    state.selected = Number(row.dataset.select);
    render();
  }
}

function onInput(ev) {
  if (ev.target.id === 'q') {
    state.query = ev.target.value;
    const pos = ev.target.selectionStart;
    render();
    const q = document.getElementById('q');
    if (q) { q.focus(); q.setSelectionRange(pos, pos); }
  }
}

function onChange(ev) {
  if (ev.target.id === 'kindSel') state.kind = ev.target.value;
  else if (ev.target.id === 'gradeSel') state.grade = ev.target.value;
  else if (ev.target.id === 'sortSel') state.sort = ev.target.value;
  else if (ev.target.id === 'shieldSel') { state.shield = ev.target.checked; }
  else return;
  render();
}

export function downloadProgress() {
  const blob = new Blob([exportProgress(state.earned)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'leonida-legend-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export { importProgress };
boot();
