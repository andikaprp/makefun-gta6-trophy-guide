// Leonida Legend - the four views: board, trophy detail, roadmap, method.
// Everything renders from the two data files; the tracker module owns the
// earned state, so every view agrees on progress.

import { isEarned, toggleEarned, earnedIds, spoilersOn } from './tracker.js';

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const KIND_LABEL = { story: 'Story', activities: 'Activities', collectibles: 'Collectibles', completion: 'Completion', platinum: 'Platinum' };
const STATUS_LABEL = { confirmed: 'Confirmed method', 'description-led': 'Description-led', unconfirmed: 'Method unconfirmed' };

export function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function masked(trophy) {
  return spoilersOn() && trophy.hidden && !isEarned(trophy.id);
}

export function displayName(trophy) {
  return masked(trophy) ? 'Hidden trophy' : trophy.name;
}

function badges(trophy) {
  const out = [];
  if (trophy.missable) out.push('<span class="badge watch">Missable watch</span>');
  if (trophy.status === 'unconfirmed') out.push('<span class="badge unconf">Unconfirmed</span>');
  else if (trophy.status === 'description-led') out.push('<span class="badge led">Description-led</span>');
  if (trophy.hidden) out.push('<span class="badge hidden-b">Hidden</span>');
  return out.join(' ');
}

function gradeBar(label, got, total) {
  const pct = total ? Math.round((got / total) * 100) : 0;
  return `<div class="gbar"><span class="gbar-label">${label}</span>` +
    `<span class="gbar-track"><span class="gbar-fill g-${label}" style="width:${pct}%"></span></span>` +
    `<span class="gbar-num">${got} / ${total}</span></div>`;
}

// ---------------- board ----------------

const boardState = { kind: 'all', grade: 'all', query: '', sort: 'roadmap' };

function matchesFilters(t) {
  if (boardState.kind === 'watch' && !t.missable) return false;
  if (boardState.kind === 'unconfirmed' && t.status === 'confirmed') return false;
  if (boardState.kind !== 'all' && boardState.kind !== 'watch' && boardState.kind !== 'unconfirmed' && t.type !== boardState.kind) return false;
  if (boardState.grade !== 'all' && t.grade !== boardState.grade) return false;
  if (boardState.query) {
    const q = boardState.query.toLowerCase();
    const hay = `${t.name} ${t.description} ${t.type} ${t.effort}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function cardHtml(t) {
  const earned = isEarned(t.id);
  const name = displayName(t);
  const desc = masked(t) ? 'Earn it to reveal what it asks - spoiler shield is on.' : t.description;
  return `<article class="card ${earned ? 'is-earned' : ''}" data-id="${t.id}">
    <label class="tick" title="Mark earned"><input type="checkbox" data-toggle="${t.id}" ${earned ? 'checked' : ''}><span></span></label>
    <div class="card-main">
      <div class="card-top">
        <span class="dot g-${t.grade}" title="${t.grade}"></span>
        <a class="card-name" href="#/trophy/${t.id}">${esc(name)}</a>
        ${badges(t)}
      </div>
      <p class="card-desc">${esc(desc)}</p>
      <div class="card-meta">
        <span>${KIND_LABEL[t.type] ?? t.type}</span>
        ${t.count ? `<span class="chip">${esc(t.count)}</span>` : ''}
        <span class="chip effort">${esc(t.effort)}</span>
        <span class="chip step">Step ${t.roadmap_step}</span>
      </div>
    </div>
  </article>`;
}

export function boardView(data) {
  const all = data.trophies;
  const earned = earnedIds().length;
  const pct = Math.round((earned / all.length) * 100);
  const gradeBars = GRADE_ORDER.map((g) => {
    const total = all.filter((t) => t.grade === g).length;
    const got = all.filter((t) => t.grade === g && isEarned(t.id)).length;
    return gradeBar(g, got, total);
  }).join('');
  const kindCounts = Object.keys(KIND_LABEL).map((k) => {
    const total = all.filter((t) => t.type === k).length;
    const got = all.filter((t) => t.type === k && isEarned(t.id)).length;
    return `<span class="kcount"><strong>${got}/${total}</strong> ${KIND_LABEL[k]}</span>`;
  }).join('');
  const remaining = all.length - earned;

  const chips = [
    ['all', 'All 55'], ['story', 'Story'], ['activities', 'Activities'],
    ['collectibles', 'Collectibles'], ['completion', 'Completion'],
    ['watch', 'Missable watch'], ['unconfirmed', 'Unconfirmed'],
  ].map(([key, label]) => `<button type="button" class="fchip ${boardState.kind === key ? 'on' : ''}" data-kind="${key}">${label}</button>`).join('');

  let list = all.filter(matchesFilters);
  if (boardState.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  else if (boardState.sort === 'remaining') list = [...list].sort((a, b) => Number(isEarned(a.id)) - Number(isEarned(b.id)) || a.roadmap_step - b.roadmap_step || a.id - b.id);
  else list = [...list].sort((a, b) => a.roadmap_step - b.roadmap_step || a.id - b.id);

  let sections = '';
  if (boardState.sort === 'roadmap' && boardState.kind !== 'watch' && boardState.kind !== 'unconfirmed') {
    for (const step of data.roadmap.steps) {
      const inStep = list.filter((t) => t.roadmap_step === step.step);
      if (!inStep.length) continue;
      const got = inStep.filter((t) => isEarned(t.id)).length;
      sections += `<section class="step-group"><h2>Step ${step.step} - ${esc(step.title)} <span class="step-count">${got} / ${inStep.length} earned</span></h2>` +
        inStep.map(cardHtml).join('') + '</section>';
    }
  } else {
    sections = `<section class="step-group">${list.map(cardHtml).join('') || '<p class="empty">No trophies match those filters.</p>'}</section>`;
  }

  return `<section class="summary">
      <div class="sum-main">
        <div class="sum-pct">${pct}<span>%</span></div>
        <div>
          <p class="sum-line"><strong>${earned} of ${all.length}</strong> trophies earned - ${remaining} to go</p>
          <div class="progress"><span style="width:${pct}%"></span></div>
          <p class="sum-kinds">${kindCounts}</p>
        </div>
      </div>
      <div class="sum-grades">${gradeBars}</div>
    </section>
    <section class="filters" aria-label="Filters">
      <div class="chip-row">${chips}</div>
      <div class="filter-tools">
        <input type="search" id="q" placeholder="Search name, description, effort..." value="${esc(boardState.query)}" aria-label="Search trophies">
        <select id="grade-sel" aria-label="Grade filter">
          <option value="all">All grades</option>
          ${GRADE_ORDER.map((g) => `<option value="${g}" ${boardState.grade === g ? 'selected' : ''}>${g}</option>`).join('')}
        </select>
        <select id="sort-sel" aria-label="Sort">
          <option value="roadmap" ${boardState.sort === 'roadmap' ? 'selected' : ''}>Roadmap order</option>
          <option value="remaining" ${boardState.sort === 'remaining' ? 'selected' : ''}>Remaining first</option>
          <option value="name" ${boardState.sort === 'name' ? 'selected' : ''}>Name A-Z</option>
        </select>
      </div>
    </section>
    ${sections}`;
}

export function bindBoard(root, rerender) {
  root.querySelectorAll('[data-kind]').forEach((b) => b.addEventListener('click', () => { boardState.kind = b.dataset.kind; rerender(); }));
  const q = root.querySelector('#q');
  if (q) q.addEventListener('input', () => { boardState.query = q.value; rerender(true); });
  const gs = root.querySelector('#grade-sel');
  if (gs) gs.addEventListener('change', () => { boardState.grade = gs.value; rerender(); });
  const ss = root.querySelector('#sort-sel');
  if (ss) ss.addEventListener('change', () => { boardState.sort = ss.value; rerender(); });
  bindToggles(root, rerender);
}

export function bindToggles(root, rerender) {
  root.querySelectorAll('[data-toggle]').forEach((box) => box.addEventListener('change', () => { toggleEarned(Number(box.dataset.toggle)); rerender(); }));
}

// ---------------- detail ----------------

function factBox(t) {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const rows = [
    ['Grade', cap(t.grade)], ['Kind', KIND_LABEL[t.type] ?? t.type],
    ['Status', STATUS_LABEL[t.status] ?? t.status], ['Roadmap', `Step ${t.roadmap_step}`],
    ['Needs', t.requirements], ['Effort', t.effort],
  ];
  if (t.count) rows.push(['Target', t.count]);
  return `<dl class="facts">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function statusBanner(t) {
  if (t.missable) return `<div class="banner watch-b"><strong>Missable watch - status unconfirmed.</strong> ${esc(t.missable_note ?? '')}</div>`;
  if (t.status === 'unconfirmed') return `<div class="banner unconf-b"><strong>Method unconfirmed.</strong> No source had a tested method at launch. What follows separates the sourced facts from our labelled reading - nothing here invents steps.</div>`;
  if (t.status === 'description-led') return `<div class="banner led-b"><strong>Description-led.</strong> The official description is the only method in print; the reading below follows its words and is labelled as inference.</div>`;
  return '';
}

function readingSections(t) {
  let out = '';
  if (t.reading) out += `<h3>What the words suggest <span class="infer">inference, not a sourced method</span></h3><p>${esc(t.reading)}</p>`;
  if (t.safe_play) out += `<h3>Play it safe meanwhile</h3><p>${esc(t.safe_play)}</p>`;
  if (t.confirmation) out += `<h3>How this page will know</h3><p>${esc(t.confirmation)}</p>`;
  return out;
}

export function detailView(data, id) {
  const t = data.trophies.find((x) => x.id === id);
  if (!t) return '<p class="empty">That trophy is not on the list.</p>';
  const earned = isEarned(t.id);
  const prev = data.trophies.find((x) => x.id === id - 1);
  const next = data.trophies.find((x) => x.id === id + 1);
  const steps = (t.method ?? []).map((s) => `<li>${esc(s)}</li>`).join('');
  const sources = (t.sources ?? []).map((s) => `<li>${esc(s.name ?? s)}</li>`).join('');
  return `<article class="detail">
    <p class="crumbs"><a href="#/">&larr; Trophy board</a> <span>Step ${t.roadmap_step} of the roadmap</span></p>
    <div class="detail-head">
      <span class="dot big g-${t.grade}" title="${t.grade}"></span>
      <div>
        <h2>${esc(t.name)}</h2>
        <p class="official">&ldquo;${esc(t.description)}&rdquo; - the official description${t.hidden ? ' (a hidden trophy; opening its page is the reveal, the board still shields it)' : ''}</p>
      </div>
      <label class="earn-btn"><input type="checkbox" data-toggle="${t.id}" ${earned ? 'checked' : ''}> <span>${earned ? 'Earned' : 'Mark earned'}</span></label>
    </div>
    <div class="badges-row">${badges(t)}</div>
    ${statusBanner(t)}
    ${factBox(t)}
    <h3>Method</h3>
    <ol class="method">${steps}</ol>
    <h3>The guide</h3>
    <p class="guide-text">${esc(t.guide)}</p>
    ${readingSections(t)}
    <h3>Sources for this trophy</h3>
    <ul class="sources">${sources}</ul>
    <nav class="prev-next">
      ${prev ? `<a href="#/trophy/${prev.id}">&larr; ${esc(displayName(prev))}</a>` : '<span></span>'}
      ${next ? `<a href="#/trophy/${next.id}">${esc(displayName(next))} &rarr;</a>` : '<span></span>'}
    </nav>
  </article>`;
}

// ---------------- roadmap ----------------

export function roadmapView(data) {
  const steps = data.roadmap.steps.map((s) => {
    const ts = data.trophies.filter((t) => t.roadmap_step === s.step);
    const got = ts.filter((t) => isEarned(t.id)).length;
    const pct = ts.length ? Math.round((got / ts.length) * 100) : 0;
    const deps = s.depends_on?.length ? `Follows step ${s.depends_on.join(', ')}` : 'Start any time';
    const chips = ts.map((t) => `<a class="tchip ${isEarned(t.id) ? 'done' : ''}" href="#/trophy/${t.id}"><span class="dot g-${t.grade}"></span>${esc(displayName(t))}${t.missable ? ' <span class="badge watch">Watch</span>' : ''}${t.status === 'unconfirmed' ? ' <span class="badge unconf">?</span>' : ''}</a>`).join('');
    return `<section class="rstep">
      <div class="rstep-num">${s.step}</div>
      <div class="rstep-body">
        <h2>${esc(s.title)} <span class="step-count">${got} / ${ts.length} earned</span></h2>
        <p>${esc(s.summary)}</p>
        <div class="progress slim"><span style="width:${pct}%"></span></div>
        <p class="rstep-meta"><span>${esc(deps)}</span><span>Effort: ${esc(s.effort)}</span></p>
        ${s.ponr ? `<div class="banner watch-b"><strong>Point-of-no-return check:</strong> ${esc(s.ponr)}</div>` : ''}
        <div class="tchips">${chips}</div>
      </div>
    </section>`;
  }).join('');
  return `<section class="roadmap">
    <h2 class="view-title">Roadmap to the platinum</h2>
    <p class="lede">Seven steps, in the order that wastes the least travel. Dependencies are honest: a step lists what genuinely unlocks it, and the only point-of-no-return flag in the game is the unconfirmed one in step 1.</p>
    ${steps}
  </section>`;
}

// ---------------- method ----------------

export function methodView(data) {
  const sourceNames = new Set();
  for (const t of data.trophies) for (const s of t.sources ?? []) sourceNames.add(s.name ?? s);
  const extra = ['PowerPyx', 'U7Buy'];
  for (const e of extra) sourceNames.add(e);
  return `<section class="method-page">
    <h2 class="view-title">Method &amp; sources</h2>
    <h3>How the list was verified</h3>
    <p>The 55 names, descriptions, grades and hidden flags in this app come from platform data, checked on launch day, 19 November 2026, along two independent pipelines that agree on every entry: PSN data via Exophase, and Xbox catalog data via XCT.live and TrueAchievements. The arithmetic closes too: 1 platinum, 2 gold, 6 silver, 46 bronze; 28 hidden; the Xbox Gamerscore sums to exactly 1,000. A full named list that circulated before launch shares zero names with this one and is not used anywhere here.</p>
    <h3>What the status labels mean</h3>
    <ul class="legend">
      <li><strong>Confirmed method</strong> - the method follows the official description and sourced reporting; the guide cites its basis in its own text.</li>
      <li><strong>Description-led</strong> - the official description is the only method in print. The guide follows its words and labels anything beyond them as inference.</li>
      <li><strong>Method unconfirmed</strong> - five hidden trophies had no confirmed unlock method at launch (per Output Lag). Their pages give the sourced facts, a clearly-labelled reading, the safe habit that covers the plausible trigger, and how the tracker will confirm them - never invented steps.</li>
      <li><strong>Missable watch</strong> - one trophy (Positive Mental Attitude) has its missable status under investigation (per PowerPyx and U7Buy). It is flagged everywhere it appears, with the habit that makes the question moot.</li>
    </ul>
    <h3>How confirmation lands after launch</h3>
    <p>Each unconfirmed page names its own confirmation signal: a tested method printed by a named source, or live earn-rate movement on Exophase showing a repeatable trigger. When a signal lands, that trophy's page flips from unconfirmed to confirmed and its guide is rewritten from the source - the status you see is the status as of the build date, never silently upgraded.</p>
    <h3>Sources</h3>
    <ul class="sources">${[...sourceNames].sort().map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <h3>About this app</h3>
    <p>Leonida Legend is an original, unofficial fan guide. It stores progress only in this browser, works fully offline, and uses no Rockstar artwork or logos. Effort labels are the guide's own estimates, marked as such on every page.</p>
  </section>`;
}
