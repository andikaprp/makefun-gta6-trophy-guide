// Leonida Legend - view renderers. Each function returns an HTML string;
// app.js mounts it and wires the events. Earned state comes from Tracker.

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const GRADE_ORDER = ['platinum', 'gold', 'silver', 'bronze'];
const KIND_LABEL = {
  story: 'Story',
  activities: 'Activities',
  collectibles: 'Collectibles',
  completion: 'Completion',
  platinum: 'Platinum',
};

function pill(text, cls) {
  return `<span class="pill ${cls || ''}">${esc(text)}</span>`;
}

function statusPills(t) {
  let out = '';
  if (t.missable) out += pill('Missable watch', 'watch');
  if (t.status === 'unconfirmed') out += pill('Method unconfirmed', 'unconfirmed');
  if (t.status === 'description-led') out += pill('Description-led', 'unconfirmed');
  if (t.hidden) out += pill('Hidden', 'hidden-flag');
  return out;
}

function gradeBarHTML(trophies) {
  const rows = GRADE_ORDER.map((grade) => {
    const all = trophies.filter((t) => t.grade === grade);
    const got = all.filter((t) => Tracker.isEarned(t.id)).length;
    const pct = all.length ? Math.round((got / all.length) * 100) : 0;
    return `<div class="grade-row"><span>${esc(grade)}</span>` +
      `<span class="bar"><span style="width:${pct}%"></span></span>` +
      `<span>${got}/${all.length}</span></div>`;
  }).join('');
  return `<div class="panel"><h3>Progress by grade</h3>${rows}</div>`;
}

function kindCountsHTML(trophies) {
  const kinds = Object.keys(KIND_LABEL);
  const chips = kinds.map((kind) => {
    const all = trophies.filter((t) => t.type === kind);
    const got = all.filter((t) => Tracker.isEarned(t.id)).length;
    return `<span class="kind-count">${KIND_LABEL[kind]}: ${got}/${all.length}</span>`;
  }).join('');
  return `<div class="panel"><h3>Progress by kind</h3><div class="kind-counts">${chips}</div>` +
    `<p style="margin:10px 0 0;font-size:14px;color:var(--ink-soft)">Kinds are this guide's own grouping - the official list has no online trophies.</p></div>`;
}

function watchPanelHTML(trophies) {
  const watch = trophies.filter((t) => t.missable);
  const unconfirmed = trophies.filter((t) => t.status === 'unconfirmed');
  const descLed = trophies.filter((t) => t.status === 'description-led');
  const link = (t) => `<a href="#/trophy/${esc(t.id)}">${esc(t.name)}</a>`;
  return `<div class="panel"><h3>The watch list</h3>` +
    `<p style="margin:0 0 6px;font-size:15px">Missable watch: ${watch.map(link).join(', ') || 'none'} (${watch.length})</p>` +
    `<p style="margin:0 0 6px;font-size:15px">Method unconfirmed: ${unconfirmed.length} - ${unconfirmed.map(link).join(', ')}</p>` +
    `<p style="margin:0;font-size:15px">Description-led: ${descLed.length} - ${descLed.map(link).join(', ')}</p></div>`;
}

function cardHTML(t, shield) {
  const earned = Tracker.isEarned(t.id);
  const shielded = shield && t.hidden && !earned;
  const name = shielded ? 'Hidden trophy' : t.name;
  const desc = shielded
    ? 'Shielded by the spoiler setting until earned. Open the guide to reveal it, or turn the shield off in the header.'
    : t.description;
  return `<article class="card grade-${t.grade}${earned ? ' earned' : ''}">` +
    `<div class="card-top">` +
    `<input type="checkbox" class="card-check" data-toggle="${esc(t.id)}" ${earned ? 'checked' : ''} aria-label="Mark ${esc(t.name)} as earned">` +
    `<div>` +
    `<h3 class="card-name"><a href="#/trophy/${esc(t.id)}">${esc(name)}</a></h3>` +
    `<p class="card-desc">${esc(desc)}</p>` +
    `<div class="card-meta">${pill(t.grade, 'grade-' + t.grade)}${pill(KIND_LABEL[t.type])}${statusPills(t)}` +
    `<a class="card-guide-link" href="#/trophy/${esc(t.id)}">Guide &rarr;</a></div>` +
    `</div></div></article>`;
}

function trophyMatches(t, ui) {
  if (ui.kind !== 'all' && t.type !== ui.kind) return false;
  if (ui.grade !== 'all' && t.grade !== ui.grade) return false;
  if (ui.watchOnly && !t.missable) return false;
  if (ui.unconfirmedOnly && t.status !== 'unconfirmed' && t.status !== 'description-led') return false;
  if (ui.q) {
    const hay = `${t.name} ${t.description} ${t.guide}`.toLowerCase();
    if (!hay.includes(ui.q.toLowerCase())) return false;
  }
  return true;
}

function sortTrophies(list, sort) {
  const out = [...list];
  if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'grade') {
    out.sort((a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade) || a.name.localeCompare(b.name));
  }
  if (sort === 'unearned') {
    out.sort((a, b) => Number(Tracker.isEarned(a.id)) - Number(Tracker.isEarned(b.id)));
  }
  return out;
}

function boardHTML(data, ui) {
  const trophies = data.trophies;
  const summary = `<div class="summary">${gradeBarHTML(trophies)}${kindCountsHTML(trophies)}${watchPanelHTML(trophies)}</div>`;
  const pma = trophies.find((t) => t.missable);
  const strip = pma && !Tracker.isEarned(pma.id)
    ? `<div class="watch-strip"><strong>Missable watch:</strong> <a href="#/trophy/${esc(pma.id)}">${esc(pma.name)}</a> - meditate at every spot the first time you reach it. It is the only point of no return on the <a href="#/roadmap">roadmap</a> (step 1).</div>`
    : '';
  const kindChips = ['all', ...Object.keys(KIND_LABEL)].map((kind) =>
    `<button type="button" class="chip${ui.kind === kind ? ' on' : ''}" data-kind="${kind}">${kind === 'all' ? 'All kinds' : KIND_LABEL[kind]}</button>`).join('');
  const gradeOptions = ['all', ...GRADE_ORDER].map((g) =>
    `<option value="${g}"${ui.grade === g ? ' selected' : ''}>${g === 'all' ? 'All grades' : g}</option>`).join('');
  const sortOptions = [
    ['roadmap', 'Roadmap order'],
    ['grade', 'Grade'],
    ['name', 'Name'],
    ['unearned', 'Unearned first'],
  ].map(([v, label]) => `<option value="${v}"${ui.sort === v ? ' selected' : ''}>${label}</option>`).join('');
  const controls = `<div class="controls">` +
    `<input type="search" id="ctl-q" placeholder="Search names, descriptions, guides" value="${esc(ui.q)}" size="30">` +
    `<span class="chip-row">${kindChips}</span>` +
    `<label>Grade <select id="ctl-grade">${gradeOptions}</select></label>` +
    `<label>Sort <select id="ctl-sort">${sortOptions}</select></label>` +
    `<label><input type="checkbox" id="ctl-group" ${ui.group ? 'checked' : ''}> Group by roadmap step</label>` +
    `<label><input type="checkbox" id="ctl-watch" ${ui.watchOnly ? 'checked' : ''}> Missable watch only</label>` +
    `<label><input type="checkbox" id="ctl-unconf" ${ui.unconfirmedOnly ? 'checked' : ''}> Unconfirmed only</label>` +
    `</div>`;
  const visible = sortTrophies(trophies.filter((t) => trophyMatches(t, ui)), ui.sort);
  let body = '';
  if (visible.length === 0) {
    body = '<p>No trophies match those filters.</p>';
  } else if (ui.group && ui.sort === 'roadmap') {
    body = data.roadmap.steps.map((step) => {
      const inStep = visible.filter((t) => t.roadmap_step === step.step);
      if (!inStep.length) return '';
      const got = inStep.filter((t) => Tracker.isEarned(t.id)).length;
      return `<div class="step-head"><h2>Step ${step.step} &middot; ${esc(step.title)}</h2>` +
        `<span class="step-meta">${esc(step.effort)} &middot; ${got}/${inStep.length} earned</span></div>` +
        `<div class="cards">${inStep.map((t) => cardHTML(t, ui.shield)).join('')}</div>`;
    }).join('');
  } else {
    body = `<div class="cards">${visible.map((t) => cardHTML(t, ui.shield)).join('')}</div>`;
  }
  const count = `<p style="color:var(--ink-soft)">${visible.length} of ${trophies.length} trophies shown${Tracker.isDemo ? ' &middot; demo sample progress (14 of 55 seeded)' : ''}</p>`;
  return summary + strip + controls + count + body;
}

function readingBlocksHTML(t) {
  if (!t.reading && !t.habit && !t.signal) return '';
  let out = '';
  if (t.reading) out += `<div class="reading-block"><h4>Our reading - inference, not a method</h4><p>${esc(t.reading)}</p></div>`;
  if (t.habit) out += `<div class="reading-block"><h4>Play it safe</h4><p>${esc(t.habit)}</p></div>`;
  if (t.signal) out += `<div class="reading-block"><h4>What will confirm it</h4><p>${esc(t.signal)}</p></div>`;
  return `<h3 class="serif">Where the method is not confirmed</h3>${out}`;
}

function detailHTML(t, data) {
  const earned = Tracker.isEarned(t.id);
  const step = data.roadmap.steps.find((s) => s.step === t.roadmap_step);
  const steps = t.steps.length
    ? `<h3 class="serif">Method</h3><ol class="steps-list">${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
    : '';
  const missable = t.missable_note
    ? `<div class="ponr"><strong>Missable watch.</strong> ${esc(t.missable_note)}</div>`
    : '';
  return `<p><a href="#/">&larr; Back to the board</a></p>` +
    `<div class="detail-head"><div class="card-meta">${pill(t.grade, 'grade-' + t.grade)}${pill(KIND_LABEL[t.type])}${statusPills(t)}</div>` +
    `<h2 class="serif">${esc(t.name)}</h2>` +
    `<p class="detail-desc">${esc(t.description)}</p></div>` +
    missable +
    `<div class="earned-toggle"><button type="button" data-toggle="${esc(t.id)}" class="${earned ? 'earned' : ''}">${earned ? 'Earned - tap to undo' : 'Mark as earned'}</button></div>` +
    `<h3 class="serif">Guide</h3><p class="guide-prose">${esc(t.guide)}</p>` +
    steps +
    readingBlocksHTML(t) +
    `<div class="detail-grid"><div class="panel"><h3>The facts</h3><table class="fact-table">` +
    `<tr><th>Requirement</th><td>${esc(t.requirements)}</td></tr>` +
    `<tr><th>Effort</th><td>${esc(t.effort)}</td></tr>` +
    `<tr><th>Status</th><td>${esc(t.status)}</td></tr>` +
    `<tr><th>Roadmap</th><td>Step ${t.roadmap_step} &middot; <a href="#/roadmap">${esc(step ? step.title : '')}</a></td></tr>` +
    `<tr><th>Hidden</th><td>${t.hidden ? 'Yes - a hidden trophy on the platform list' : 'No'}</td></tr>` +
    `</table></div>` +
    `<div class="panel"><h3>Sources</h3><ul style="margin:6px 0;padding-left:20px">${t.sources.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` +
    `<p style="font-size:14px;color:var(--ink-soft)">The name, description, grade and hidden flag above are the official list as these sources serve it; the guide is this guide's own words.</p></div></div>`;
}

function roadmapHTML(data) {
  const intro = `<div class="prose"><h2 class="serif" style="margin-top:0">Roadmap to the platinum</h2>` +
    `<p>${esc(data.roadmap.note)}</p></div>`;
  const steps = data.roadmap.steps.map((step) => {
    const list = step.trophies.map((id) => data.byId.get(id)).filter(Boolean);
    const got = list.filter((t) => Tracker.isEarned(t.id)).length;
    const deps = step.depends_on.length
      ? `<span class="pill">after step ${step.depends_on.join(', ')}</span>`
      : `<span class="pill">start here</span>`;
    const ponr = step.point_of_no_return
      ? `<div class="ponr"><strong>Point of no return.</strong> ${esc(step.point_of_no_return_note || '')}</div>`
      : '';
    const rows = list.map((t) => {
      const earned = Tracker.isEarned(t.id);
      return `<li><span class="tick">${earned ? '&#10003;' : ''}</span>` +
        `<a href="#/trophy/${esc(t.id)}">${esc(t.name)}</a> ${pill(t.grade, 'grade-' + t.grade)}${t.missable ? ' ' + pill('Missable watch', 'watch') : ''}${t.status === 'unconfirmed' ? ' ' + pill('Unconfirmed', 'unconfirmed') : ''}</li>`;
    }).join('');
    return `<section class="road-step"><div class="road-step-head"><h2>Step ${step.step} &middot; ${esc(step.title)}</h2>${deps}` +
      `<span class="step-meta" style="color:var(--ink-soft)">${esc(step.effort)} &middot; ${got}/${list.length} earned</span></div>` +
      `<p style="max-width:72ch">${esc(step.summary)}</p>${ponr}<ul class="road-list">${rows}</ul></section>`;
  }).join('');
  return intro + steps;
}

function methodHTML() {
  return `<div class="prose">
<h2 class="serif" style="margin-top:0">How this guide works</h2>
<h2 class="serif">The data</h2>
<p>The 55 names, descriptions, grades and hidden flags in this guide are the official PlayStation 5 trophy list for Grand Theft Auto VI, frozen on launch day, 19 November 2026. Two independent platform pipelines serve the identical list: Exophase mirrors PlayStation Network data and XCT.live reads the Xbox catalog, and TrueAchievements, Output Lag and Press Start agree with both. A different, fully invented list circulated before launch and shares no names with this one; it is not used anywhere here.</p>
<h2 class="serif">Cited guidance</h2>
<p>Every trophy page ends its guide with its sources, and each trophy's own source list sits beside the guide. A guide that names no source for a claim is a guide guessing; this one would rather say less and cite it.</p>
<h2 class="serif">Unconfirmed means unconfirmed</h2>
<p>Six trophies have no confirmed unlock method at launch - the five cryptic hidden ones and Challenging Tank - and three more are led by their descriptions alone. Those pages carry no invented steps. Instead they give a labelled reading of the official description, a play-it-safe habit that covers the plausible trigger at no cost, and the signal that will confirm the method once players report verified unlocks. When a method is confirmed, the reading is replaced by steps.</p>
<h2 class="serif">The missable watch</h2>
<p>Exactly one trophy is flagged as a possible missable: Positive Mental Attitude, the meditation trophy. PowerPyx and U7Buy both mark its status as under investigation, because a meditation spot reached in Chapter 1 may not be reachable later. This guide treats it as missable until that is settled: the roadmap flags step 1 as the list's only point of no return, and the advice everywhere is the same - meditate on arrival. No other trophy is reported missable by any source, and none is flagged as one here.</p>
<h2 class="serif">Your progress</h2>
<p>The tracker stores earned trophies in this browser's local storage and nowhere else. Export downloads the list as a small JSON file; import reads one back, so progress survives a change of device or browser. Opening the app with a demo link seeds a clearly labelled sample - 14 of 55, all early-game trophies - which importing real progress replaces.</p>
<h2 class="serif">The spoiler shield</h2>
<p>Twenty-eight of the 55 trophies are hidden on the platform list. With the shield on (the default), the board masks a hidden trophy's name and description until you earn it; its guide page always reveals its own trophy, because you only land there by choosing to. Turn the shield off in the header to see everything at once.</p>
</div>`;
}
