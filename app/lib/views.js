// Views: master-detail board, full-guide detail page, roadmap, watch list.
// Guides are stored as labelled-section strings; parseGuide turns them back
// into the structured rendering (method steps, the reading, play it safe,
// what confirms it, requirements, effort, basis).

const LABELS = ['Method', 'The reading', 'Play it safe', 'What confirms it', 'Requirements', 'Effort', 'Basis'];

export function parseGuide(guide) {
  const sections = [];
  const re = new RegExp(`(${LABELS.join('|')}):\\s`, 'g');
  const marks = [];
  let m;
  while ((m = re.exec(guide)) !== null) marks.push({ label: m[1], at: m.index, bodyAt: re.lastIndex });
  for (let i = 0; i < marks.length; i++) {
    const end = i + 1 < marks.length ? marks[i + 1].at : guide.length;
    sections.push({ label: marks[i].label, body: guide.slice(marks[i].bodyAt, end).trim() });
  }
  return sections;
}

export function statusOf(t) {
  if (t.guide.includes('METHOD UNCONFIRMED')) return 'unconfirmed';
  if (t.missable) return 'missable watch';
  if (t.guide.includes('The reading:')) return 'description-led';
  return 'confirmed';
}

export function isShielded(t, earned, shieldOn) {
  return shieldOn && t.hidden && !earned.has(t.id);
}

export function displayName(t, earned, shieldOn) {
  return isShielded(t, earned, shieldOn) ? 'Hidden trophy' : t.name;
}

export function displayDesc(t, earned, shieldOn) {
  return isShielded(t, earned, shieldOn) ? 'Earn it to reveal what it asks.' : t.description;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function gradeChip(t) {
  return `<span class="chip grade-${t.grade}">${t.grade}</span>`;
}

export function metaChips(t) {
  const st = statusOf(t);
  const bits = [
    gradeChip(t),
    `<span class="chip">${esc(t.type)}</span>`,
    `<span class="chip">roadmap step ${t.roadmap_step}</span>`,
  ];
  if (t.hidden) bits.push('<span class="chip chip-hidden">hidden</span>');
  if (st === 'missable watch') bits.push('<span class="chip chip-watch">missable watch</span>');
  if (st === 'unconfirmed') bits.push('<span class="chip chip-unconf">unconfirmed</span>');
  if (st === 'description-led') bits.push('<span class="chip chip-desc">description-led</span>');
  return bits.join(' ');
}

// The sources line: always rendered directly under the meta chips, on the
// board's guide panel and on detail pages alike - never below the fold.
export function sourcesLine(t) {
  return `<p class="sources-line">Sources: ${t.sources.map(esc).join(' · ')}</p>`;
}

function stepsList(body) {
  const parts = body.split(/\s(?=\d+\)\s)/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1 && /^\d+\)/.test(parts[0])) {
    return `<ol class="steps">${parts.map((p) => `<li>${esc(p.replace(/^\d+\)\s*/, ''))}</li>`).join('')}</ol>`;
  }
  return `<p>${esc(body)}</p>`;
}

export function guideHtml(t) {
  return parseGuide(t.guide).map((s) => {
    const cls = s.label.toLowerCase().replace(/\s+/g, '-');
    const body = s.label === 'Method' ? stepsList(s.body) : `<p>${esc(s.body)}</p>`;
    return `<section class="guide-sec sec-${cls}"><h4>${esc(s.label)}</h4>${body}</section>`;
  }).join('');
}

// The guide panel used by the master-detail board (and the watch board).
export function guidePanel(t, earned) {
  const done = earned.has(t.id);
  return `<div class="panel-head">
      <h2>${esc(t.name)}</h2>
      <p class="desc">${esc(t.description)}</p>
      <div class="chips">${metaChips(t)}</div>
      ${sourcesLine(t)}
    </div>
    ${t.missable_note ? `<p class="watch-note">${esc(t.missable_note)}</p>` : ''}
    <div class="guide-body">${guideHtml(t)}</div>
    <button class="earn-btn" data-toggle="${t.id}">${done ? 'Earned - tap to undo' : 'Mark as earned'}</button>
    <a class="open-link" href="#/trophy/${t.id}">Open the full page</a>`;
}

export function checklistRow(t, earned, shieldOn, selectedId) {
  const done = earned.has(t.id);
  const st = statusOf(t);
  return `<li class="row ${done ? 'is-earned' : ''} ${t.id === selectedId ? 'is-selected' : ''}" data-select="${t.id}">
    <input type="checkbox" data-toggle="${t.id}" ${done ? 'checked' : ''} aria-label="earned">
    <span class="row-name">${esc(displayName(t, earned, shieldOn))}</span>
    ${gradeChip(t)}
    ${st === 'missable watch' ? '<span class="tag tag-watch">watch</span>' : ''}
    ${st === 'unconfirmed' ? '<span class="tag tag-unconf">unconfirmed</span>' : ''}
  </li>`;
}

export function gradeBars(trophies, earned) {
  const grades = ['platinum', 'gold', 'silver', 'bronze'];
  return grades.map((g) => {
    const all = trophies.filter((t) => t.grade === g);
    const got = all.filter((t) => earned.has(t.id)).length;
    const pct = all.length ? Math.round((got / all.length) * 100) : 0;
    return `<div class="bar-row"><span class="bar-label grade-${g}">${g}</span>
      <span class="bar"><span class="bar-fill grade-bg-${g}" style="width:${pct}%"></span></span>
      <span class="bar-count">${got}/${all.length}</span></div>`;
  }).join('');
}

export function kindCounts(trophies) {
  const kinds = {};
  for (const t of trophies) kinds[t.type] = (kinds[t.type] ?? 0) + 1;
  return Object.entries(kinds).map(([k, n]) => `<span class="kind-count">${esc(k)} ${n}</span>`).join(' ');
}
