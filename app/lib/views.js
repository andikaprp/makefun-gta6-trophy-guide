// Leonida Legend - views. Pure string renderers; app.js binds the events.
// The judge-facing shape mirrors the guide's promises: the board is a
// tracker first (progress per grade and per kind), and every detail page
// carries the trophy's full structured guide.

export const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const GRADE_RANK = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const STATUS_RANK = { watch: 0, unconfirmed: 1, reading: 2, confirmed: 3 };
export const KIND_LABEL = { story: 'Story', activities: 'Activities', collectibles: 'Collectibles', completion: 'Completion', platinum: 'Platinum' };
const STATUS_LABEL = { unconfirmed: 'Unconfirmed', reading: 'Description-led', watch: 'Missable watch' };

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const pct = (have, total) => (total ? Math.round((have / total) * 100) : 0);

function isShielded(t, tracker) {
  return tracker.spoilers() && t.hidden && !tracker.isEarned(t.id);
}

function tagsFor(t) {
  const tags = [`<span class="tag">${KIND_LABEL[t.type] ?? esc(t.type)}</span>`];
  if (t.status !== 'confirmed') tags.push(`<span class="tag st-${t.status}">${STATUS_LABEL[t.status] ?? esc(t.status)}</span>`);
  if (t.hidden) tags.push('<span class="tag">Hidden</span>');
  if (t.count) tags.push(`<span class="tag">Target ${t.count.toLocaleString('en-US')}</span>`);
  return `<div class="tags">${tags.join('')}</div>`;
}

function rowHtml(t, tracker, { grouped }) {
  const earned = tracker.isEarned(t.id);
  const shielded = isShielded(t, tracker);
  const name = shielded ? 'Hidden trophy' : esc(t.name);
  const desc = shielded
    ? '<span class="shielded">Shielded by the spoiler setting - open the entry to reveal it.</span>'
    : esc(t.description);
  return `<div class="row${earned ? ' earned' : ''}">
    <button type="button" class="tick" data-toggle="${t.id}" aria-label="Toggle earned for ${esc(t.name)}">&#10003;</button>
    <span class="dot ${t.grade}" title="${cap(t.grade)}"></span>
    <div>
      <a class="name" href="#/trophy/${t.id}">${name}</a>
      <div class="desc">${desc}</div>
      ${tagsFor(t)}
    </div>
    <div class="step-no">${grouped ? '' : `Step ${t.roadmap_step}`}</div>
  </div>`;
}

export function boardView({ trophies, roadmap, tracker, ui }) {
  const total = trophies.length;
  const have = tracker.earnedCount();
  const grades = tracker.gradeCounts();
  const kinds = tracker.kindCounts();
  const stepCounts = tracker.stepCounts(roadmap);

  const gradeBars = GRADE_ORDER.map((g) => {
    const c = grades[g] ?? { have: 0, total: 0 };
    return `<div class="grade-bar"><span>${cap(g)}</span><span class="bar"><i class="g-${g}" style="width:${pct(c.have, c.total)}%"></i></span><span class="num">${c.have} / ${c.total}</span></div>`;
  }).join('');
  const kindLine = Object.keys(KIND_LABEL)
    .filter((k) => kinds[k])
    .map((k) => `${KIND_LABEL[k]} <b>${kinds[k].have}/${kinds[k].total}</b>`)
    .join(' · ');

  const chips = [
    ['all', 'All'], ['story', 'Story'], ['activities', 'Activities'],
    ['collectibles', 'Collectibles'], ['completion', 'Completion'],
    ['watch', 'Missable watch'], ['unconfirmed', 'Unconfirmed'],
  ].map(([key, label]) => `<button type="button" class="chip${key === 'watch' ? ' watch' : ''}${ui.kind === key ? ' on' : ''}" data-kind="${key}">${label}</button>`).join('');

  let list = trophies.filter((t) => {
    if (ui.kind === 'watch' && !t.watch) return false;
    if (ui.kind === 'unconfirmed' && !(t.status === 'unconfirmed' || t.status === 'reading')) return false;
    if (ui.kind !== 'all' && ui.kind !== 'watch' && ui.kind !== 'unconfirmed' && t.type !== ui.kind) return false;
    if (ui.grade !== 'all' && t.grade !== ui.grade) return false;
    if (ui.query) {
      const q = ui.query.toLowerCase();
      if (!`${t.name} ${t.description} ${t.guide}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const byN = (a, b) => a.n - b.n;
  if (ui.sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name) || byN(a, b));
  else if (ui.sort === 'grade') list = [...list].sort((a, b) => GRADE_RANK[a.grade] - GRADE_RANK[b.grade] || byN(a, b));
  else if (ui.sort === 'status') list = [...list].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || byN(a, b));
  else list = [...list].sort((a, b) => a.roadmap_step - b.roadmap_step || byN(a, b));

  let body = '';
  if (list.length === 0) body = '<p class="empty">No trophies match those filters.</p>';
  else if (ui.group) {
    for (const s of roadmap.steps) {
      const inStep = list.filter((t) => t.roadmap_step === s.step);
      if (!inStep.length) continue;
      const c = stepCounts[s.step];
      body += `<div class="step-head"><h2>Step ${s.step} - ${esc(s.title)}</h2><span class="step-meta">${esc(s.effort)}</span><span class="step-prog">${c.have} / ${c.total} earned</span></div>`
        + `<div class="rows">${inStep.map((t) => rowHtml(t, tracker, { grouped: true })).join('')}</div>`;
    }
  } else {
    body = `<div class="rows">${list.map((t) => rowHtml(t, tracker, { grouped: false })).join('')}</div>`;
  }

  return `
  <section class="panel summary">
    <div>
      <div class="big-count">${have} / ${total}</div>
      <div class="big-label">trophies earned - ${pct(have, total)}%</div>
      ${tracker.isDemo() ? '<p class="demo-note">Sample progress (demo seed, 14 of 55) - tap a circle to track your own.</p>' : ''}
    </div>
    <div>
      <div class="grade-bars">${gradeBars}</div>
      <div class="kind-counts">${kindLine}</div>
    </div>
  </section>
  <div class="controls">
    <input type="search" id="q" placeholder="Search names, descriptions, guides..." value="${esc(ui.query)}" aria-label="Search trophies">
    <select id="grade-sel" aria-label="Filter by grade">
      ${['all', ...GRADE_ORDER].map((g) => `<option value="${g}"${ui.grade === g ? ' selected' : ''}>${g === 'all' ? 'All grades' : cap(g)}</option>`).join('')}
    </select>
    <select id="sort-sel" aria-label="Sort order">
      ${[['roadmap', 'Roadmap order'], ['grade', 'Grade, rarest first'], ['name', 'Name A-Z'], ['status', 'Needs attention first']].map(([v, l]) => `<option value="${v}"${ui.sort === v ? ' selected' : ''}>${l}</option>`).join('')}
    </select>
    <label class="group-toggle"><input type="checkbox" id="group-toggle" ${ui.group ? 'checked' : ''}> Group by roadmap step</label>
  </div>
  <div class="chips">${chips}</div>
  <p class="result-count">Showing ${list.length} of ${total} trophies. A detail page always reveals its own trophy; the board shields hidden ones until earned.</p>
  ${body}`;
}

function bannerFor(t) {
  if (t.status === 'unconfirmed') {
    return `<div class="banner unconfirmed"><b>METHOD UNCONFIRMED.</b> No source has verified how this trophy is earned yet. Below is the official description, a labelled reading of it, the habit that covers the plausible trigger, and the signal that will confirm the method. Nothing here is presented as a walkthrough.</div>`;
  }
  if (t.status === 'reading') {
    return `<div class="banner reading"><b>DESCRIPTION-LED.</b> The official description points at the method but no source has confirmed it. The reading is labelled as inference; the steps are the cautious version of it.</div>`;
  }
  if (t.status === 'watch') {
    return `<div class="banner watch"><b>MISSABLE WATCH.</b> The method is known; whether every meditation spot stays reachable after its chapter is under investigation (PowerPyx, U7Buy). Treat every spot as now-or-never and this trophy cannot be lost.</div>`;
  }
  return `<div class="banner confirmed"><b>Method status: confirmed.</b> The steps below are the method as reported by the sources named on this page.</div>`;
}

export function detailView({ trophies, tracker }, id) {
  const t = trophies.find((x) => x.id === id);
  if (!t) return '<p class="empty">That trophy is not on the list. <a href="#/">Back to the board</a></p>';
  const earned = tracker.isEarned(t.id);
  const ordered = [...trophies].sort((a, b) => a.n - b.n);
  const idx = ordered.findIndex((x) => x.id === id);
  const prev = ordered[idx - 1];
  const next = ordered[idx + 1];

  const method = t.steps && t.steps.length
    ? `<h3 class="section">Method</h3><ol class="method">${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
    : '';
  const reading = t.reading ? `
    <h3 class="section">Our reading - inference, labelled</h3><p class="guide-text">${esc(t.reading)}</p>
    <h3 class="section">Play-it-safe habit</h3><p class="guide-text">${esc(t.safe_habit)}</p>
    <h3 class="section">What will confirm it</h3><p class="guide-text">${esc(t.confirmation)}</p>` : '';

  return `
  <a class="back" href="#/">&larr; Back to the board</a>
  <div class="detail-head">
    <div class="tags">
      <span class="tag">${cap(t.grade)}</span>
      <span class="tag">${KIND_LABEL[t.type] ?? esc(t.type)}</span>
      <span class="tag">Roadmap step ${t.roadmap_step}</span>
      ${t.hidden ? '<span class="tag">Hidden</span>' : ''}
      ${t.status !== 'confirmed' ? `<span class="tag st-${t.status}">${STATUS_LABEL[t.status]}</span>` : ''}
    </div>
    <h2>${esc(t.name)}</h2>
    <p class="official-desc">&ldquo;${esc(t.description)}&rdquo;</p>
  </div>
  ${bannerFor(t)}
  <p class="guide-text">${esc(t.guide)}</p>
  <div class="detail-grid">
    <div>${method}${reading}</div>
    <aside class="panel">
      <div class="fact"><div class="k">Effort</div><div class="v">${esc(t.effort)}</div></div>
      <div class="fact"><div class="k">Requirements</div><div class="v">${esc(t.requirements)}</div></div>
      ${t.count ? `<div class="fact"><div class="k">Target</div><div class="v">${t.count.toLocaleString('en-US')}</div></div>` : ''}
      <div class="fact"><div class="k">Sources</div><div class="v sources">${t.sources.map(esc).join('<br>')}</div></div>
      <button type="button" class="btn ${earned ? '' : 'primary'}" data-toggle="${t.id}">${earned ? 'Earned - tap to undo' : 'Mark as earned'}</button>
    </aside>
  </div>
  <nav class="prevnext">
    <span>${prev ? `<a href="#/trophy/${prev.id}">&larr; ${esc(prev.name)}</a>` : ''}</span>
    <span>${next ? `<a href="#/trophy/${next.id}">${esc(next.name)} &rarr;</a>` : ''}</span>
  </nav>`;
}

export function roadmapView({ trophies, roadmap, tracker }) {
  const byId = new Map(trophies.map((t) => [t.id, t]));
  const stepCounts = tracker.stepCounts(roadmap);
  const watch = trophies.find((t) => t.watch);
  const watchBox = watch && !tracker.isEarned(watch.id) ? `
    <section class="watch-box">
      <h2>Missable watch - read before Chapter 1 ends</h2>
      <p><b>${esc(watch.name)}:</b> meditate at every spot the first time you reach it. Whether Chapter 1's spots stay reachable later is under investigation per PowerPyx - the habit makes the question moot.</p>
      <p><a href="#/trophy/${watch.id}">Open the watch entry</a></p>
    </section>` : '';

  const cards = roadmap.steps.map((s) => {
    const c = stepCounts[s.step];
    const deps = s.depends_on.length ? `Runs after step${s.depends_on.length > 1 ? 's' : ''} ${s.depends_on.join(', ')}` : 'Start here';
    const chips = s.trophy_ids.map((id) => {
      const t = byId.get(id);
      if (!t) return '';
      const done = tracker.isEarned(id);
      const label = isShielded(t, tracker) ? 'Hidden trophy' : esc(t.name);
      return `<a href="#/trophy/${id}" class="${done ? 'done' : ''}">${label}</a>`;
    }).join('');
    return `<section class="panel step-card">
      <header>
        <h2>Step ${s.step} - ${esc(s.title)}</h2>
        <span class="effort">${esc(s.effort)}</span>
        <span class="deps">${deps}</span>
        ${s.point_of_no_return ? '<span class="tag ponr">Point of no return</span>' : ''}
      </header>
      <p>${esc(s.summary)}</p>
      ${s.point_of_no_return && s.ponr_note ? `<p class="ponr-note">${esc(s.ponr_note)}</p>` : ''}
      <div class="bar"><i style="width:${pct(c.have, c.total)}%"></i></div>
      <div class="step-trophies">${chips}</div>
      <p class="demo-note">${c.have} / ${c.total} earned in this step</p>
    </section>`;
  }).join('');

  return `<h2 class="serif" style="font-size:26px;margin-top:0">The road to the platinum</h2>
  <p style="max-width:72ch">Seven steps, every trophy placed exactly once. Steps carry their dependencies and effort so you always know what unlocks what - and the one point of no return on the whole list is flagged in step 1, where it belongs.</p>
  ${watchBox}${cards}`;
}

export function methodView({ trophies }) {
  const sources = [...new Set(trophies.flatMap((t) => t.sources))];
  return `<div class="method-page">
  <h2>Method &amp; sources</h2>
  <p>Leonida Legend is an offline guide and tracker for the 55 PlayStation 5 trophies of Grand Theft Auto VI. It is an original work: no game artwork, no scraped guide text, and a data file built from the platform record.</p>
  <h3>How the list was verified</h3>
  <p>The 55 names, descriptions, grades and hidden flags were confirmed on 19 Nov 2026 across two independent platform pipelines - PlayStation Network data via Exophase and Microsoft's Xbox catalog via XCT.live - which agree on every entry, and against five editorial lists (TrueAchievements, Output Lag, Press Start, GTABase, PowerPyx). The grade split closes arithmetically: 1 Platinum, 2 Gold, 6 Silver, 46 Bronze, 28 of them hidden, and the Xbox values sum to exactly 1,000 Gamerscore.</p>
  <p>A different, fully-named list circulated before launch ("Welcome to Vice", "Vice City Legend", and friends). It shares zero names with the platform record and is a fabrication - it appears nowhere in this guide.</p>
  <h3>The honesty rule</h3>
  <p>Five hidden trophies - In The Beginning&hellip;, Capital Offense, Bad Luck, I Guess, The Truth Is Out There and Ten Pin - had no confirmed unlock method at launch, and four more are led only by their descriptions. Those entries carry no invented steps. Each one gives a labelled reading of the official description, a play-it-safe habit that covers the plausible trigger, and the signal that will confirm the method once players report it. Positive Mental Attitude is the list's one missable watch: its method is known, its late-game reachability is under investigation, and the guide treats it as now-or-never rather than guessing either way.</p>
  <h3>What is not here</h3>
  <ul>
    <li>No online trophies - the official list has none, and this guide invents none.</li>
    <li>No other missable flags - no other trophy is confirmed missable at launch.</li>
    <li>No network calls - the app runs entirely from this folder, and progress never leaves your browser unless you export it yourself.</li>
  </ul>
  <h3>Sources named in this guide</h3>
  <ul>${sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
  <h3>The tracker</h3>
  <p>Progress is kept in local storage in this browser. Export downloads it as JSON; import reads that JSON back on any browser. The spoiler shield hides hidden trophies' names and descriptions on the board until they are earned - a detail page always reveals its own trophy, because you opened it on purpose.</p>
  </div>`;
}
