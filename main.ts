// Leonida Legend - gta6-trophy-guide-01 entry (Node 22, standard library only).
//
// The guide is this directory's app/ folder: plain static files a browser
// opens at app/index.html, fully offline. This program validates the data
// before handing anything in - the verified 55 with the full schema, the
// official grade and hidden splits, and a roadmap that places every trophy
// exactly once - then copies app/ and screenshots/ to the output and writes
// dossier.json with the vendored make.fun library, byte for byte what the
// scorer's own copy writes. Malformed data is refused with the defect
// named, exit 2, before anything is copied.
//
// Run it:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve it locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function refuse(defect) {
  console.error(`Leonida Legend: refusing to hand in - ${defect}`);
  process.exit(2);
}

// ---------- validate the trophy data ----------

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const STATUSES = ['confirmed', 'description-led', 'unconfirmed'];
const EXPECTED_SPLIT = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const EXPECTED_HIDDEN = 28;

let doc;
try {
  doc = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
} catch (err) {
  refuse(`app/data/trophies.json is unreadable: ${err.message}`);
}
const items = Array.isArray(doc) ? doc : doc.trophies;
if (!Array.isArray(items)) refuse('trophies.json has no trophies array');
if (items.length !== 55) refuse(`expected the official 55 trophies, found ${items.length}`);

const seenIds = new Set();
const split = {};
let hiddenCount = 0;
for (const t of items) {
  const label = t && typeof t.name === 'string' ? t.name : `id ${t?.id ?? '?'}`;
  if (!Number.isInteger(t.id) || seenIds.has(t.id)) refuse(`trophy ${label}: id missing or duplicated`);
  seenIds.add(t.id);
  if (typeof t.name !== 'string' || !t.name.trim()) refuse(`trophy id ${t.id}: name is blank`);
  if (typeof t.description !== 'string' || !t.description.trim()) refuse(`${label}: description is blank`);
  if (!GRADES.includes(t.grade)) refuse(`${label}: grade "${t.grade}" is not a trophy grade`);
  split[t.grade] = (split[t.grade] ?? 0) + 1;
  if (typeof t.hidden !== 'boolean') refuse(`${label}: hidden flag is not a boolean`);
  if (t.hidden) hiddenCount += 1;
  if (typeof t.type !== 'string' || !t.type.trim()) refuse(`${label}: kind is blank`);
  if (typeof t.missable !== 'boolean') refuse(`${label}: missable flag is not a boolean`);
  if (!STATUSES.includes(t.status)) refuse(`${label}: status "${t.status}" is not a known status`);
  if (typeof t.guide !== 'string' || !t.guide.trim()) refuse(`${label}: guide is blank`);
  if (!Array.isArray(t.method) || t.method.length === 0 || t.method.some((s) => typeof s !== 'string' || !s.trim())) {
    refuse(`${label}: method must be a non-empty list of steps`);
  }
  if (typeof t.requirements !== 'string' || !t.requirements.trim()) refuse(`${label}: requirements are blank`);
  if (typeof t.effort !== 'string' || !t.effort.trim()) refuse(`${label}: effort label is blank`);
  if (!Number.isInteger(t.roadmap_step) || t.roadmap_step < 1 || t.roadmap_step > 7) refuse(`${label}: roadmap_step must be 1-7`);
  if (!Array.isArray(t.sources) || t.sources.length === 0) refuse(`${label}: sources are missing`);
  if (t.status !== 'confirmed' && !(t.reading && t.safe_play && t.confirmation)) {
    refuse(`${label}: a ${t.status} trophy must carry reading, safe_play and confirmation notes`);
  }
}
for (const g of GRADES) {
  if (split[g] !== EXPECTED_SPLIT[g]) refuse(`grade split is ${JSON.stringify(split)}, expected ${JSON.stringify(EXPECTED_SPLIT)}`);
}
if (hiddenCount !== EXPECTED_HIDDEN) refuse(`${hiddenCount} hidden trophies, expected ${EXPECTED_HIDDEN}`);

// ---------- validate the roadmap ----------

let roadmap;
try {
  roadmap = JSON.parse(readFileSync(join(here, 'app', 'data', 'roadmap.json'), 'utf8'));
} catch (err) {
  refuse(`app/data/roadmap.json is unreadable: ${err.message}`);
}
const steps = roadmap.steps;
if (!Array.isArray(steps) || steps.length !== 7) refuse('roadmap must have exactly 7 steps');
const placement = new Map();
steps.forEach((s, i) => {
  if (s.step !== i + 1) refuse(`roadmap step out of order at position ${i + 1}`);
  if (!Array.isArray(s.trophy_ids) || s.trophy_ids.length === 0) refuse(`roadmap step ${s.step} places no trophies`);
  for (const id of s.trophy_ids) {
    if (placement.has(id)) refuse(`trophy id ${id} is placed on the roadmap twice`);
    placement.set(id, s.step);
  }
});
for (const t of items) {
  if (!placement.has(t.id)) refuse(`${t.name}: not placed on the roadmap`);
  if (placement.get(t.id) !== t.roadmap_step) refuse(`${t.name}: roadmap_step disagrees with the roadmap`);
}

// ---------- hand in ----------

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
console.log(`Leonida Legend: handed in ${items.length} trophies, roadmap of ${steps.length} steps, dossier written to ${out}`);
