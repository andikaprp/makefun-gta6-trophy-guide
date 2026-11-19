// Leonida Legend - gta6-trophy-guide-01 entry (Node 22, standard library only).
//
// The guide is this directory's app/ folder: plain static files, offline, no
// build step. This program is the gatekeeper and the courier. Before handing
// anything in it validates the data end to end - the trophy list against the
// verified split, every trophy's structured guide against its status, and the
// roadmap placing every trophy exactly once - and refuses malformed data with
// the defect named (exit 2). Then it copies app/ and screenshots/ to the
// output directory and writes dossier.json with the vendored make.fun library
// (vendor/makefun-frontend.ts, byte-identical to the kit's copy - the scorer
// requires dossier.json to be exactly what its own copy writes).
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts`.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function refuse(defect) {
  console.error(`main.ts: refusing to hand in - ${defect}`);
  process.exit(2);
}

// ---------- validate the trophy data ----------
const trophiesPath = join(here, 'app', 'data', 'trophies.json');
const roadmapPath = join(here, 'app', 'data', 'roadmap.json');
let trophiesDoc, roadmapDoc;
try {
  trophiesDoc = JSON.parse(readFileSync(trophiesPath, 'utf8'));
  roadmapDoc = JSON.parse(readFileSync(roadmapPath, 'utf8'));
} catch (err) {
  refuse(`data files unreadable: ${err.message}`);
}

const trophies = trophiesDoc.trophies;
if (!Array.isArray(trophies)) refuse('trophies.json has no trophies array');
if (trophies.length !== 55) refuse(`trophies.json holds ${trophies.length} trophies, the official list has 55`);

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const STATUSES = ['confirmed', 'unconfirmed', 'reading', 'watch'];
const blank = (v) => typeof v !== 'string' || v.trim() === '';
const ids = new Set();
const split = {};
let hiddenCount = 0;

for (const t of trophies) {
  const who = t && typeof t.name === 'string' ? t.name : '(unnamed trophy)';
  if (!t || typeof t !== 'object') refuse('a trophy entry is not an object');
  if (blank(t.id)) refuse(`${who}: id missing`);
  if (ids.has(t.id)) refuse(`${who}: duplicate id ${t.id}`);
  ids.add(t.id);
  if (blank(t.name)) refuse('a trophy has no name');
  if (blank(t.description)) refuse(`${who}: description missing`);
  if (!GRADES.includes(t.grade)) refuse(`${who}: grade "${t.grade}" is not a trophy grade`);
  split[t.grade] = (split[t.grade] ?? 0) + 1;
  if (blank(t.type)) refuse(`${who}: kind (type) missing`);
  if (typeof t.hidden !== 'boolean') refuse(`${who}: hidden flag missing`);
  if (t.hidden) hiddenCount += 1;
  if (typeof t.missable !== 'boolean') refuse(`${who}: missable flag missing`);
  if (!Number.isInteger(t.roadmap_step) || t.roadmap_step < 1 || t.roadmap_step > 7) refuse(`${who}: roadmap_step is not 1-7`);
  if (blank(t.guide)) refuse(`${who}: guide missing`);
  if (!Array.isArray(t.sources) || t.sources.length === 0 || t.sources.some(blank)) refuse(`${who}: sources missing`);
  if (!STATUSES.includes(t.status)) refuse(`${who}: status "${t.status}" is not a known status`);
  if (!Array.isArray(t.steps) || t.steps.some((s) => typeof s !== 'string')) refuse(`${who}: steps is not a string array`);
  if (blank(t.requirements)) refuse(`${who}: requirements missing`);
  if (blank(t.effort)) refuse(`${who}: effort missing`);
  if (t.status === 'confirmed' && t.steps.length < 2) refuse(`${who}: confirmed but carries fewer than 2 method steps`);
  if ((t.status === 'unconfirmed' || t.status === 'reading') && (blank(t.reading) || blank(t.safe_habit) || blank(t.confirmation))) {
    refuse(`${who}: ${t.status} but missing its reading / safe habit / confirmation treatment`);
  }
  if (t.status === 'watch' && (t.steps.length < 2 || blank(t.reading) || blank(t.safe_habit) || blank(t.confirmation))) {
    refuse(`${who}: the missable watch needs both method steps and the three-part treatment`);
  }
}
const expectedSplit = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
for (const g of GRADES) {
  if (split[g] !== expectedSplit[g]) refuse(`grade split is ${JSON.stringify(split)}, the official split is ${JSON.stringify(expectedSplit)}`);
}
if (hiddenCount !== 28) refuse(`${hiddenCount} hidden trophies, the official list has 28`);

// ---------- validate the roadmap ----------
const steps = roadmapDoc.steps;
if (!Array.isArray(steps) || steps.length !== 7) refuse('roadmap.json does not hold exactly 7 steps');
const placed = new Map();
steps.forEach((s, i) => {
  if (s.step !== i + 1) refuse(`roadmap step at position ${i} is numbered ${s.step}`);
  if (blank(s.title) || blank(s.summary) || blank(s.effort)) refuse(`roadmap step ${s.step}: title, summary or effort missing`);
  if (!Array.isArray(s.depends_on) || s.depends_on.some((d) => !Number.isInteger(d) || d < 1 || d >= s.step)) {
    refuse(`roadmap step ${s.step}: depends_on must list earlier steps only`);
  }
  if (!Array.isArray(s.trophy_ids) || s.trophy_ids.length === 0) refuse(`roadmap step ${s.step}: no trophies placed`);
  for (const id of s.trophy_ids) {
    if (!ids.has(id)) refuse(`roadmap step ${s.step}: unknown trophy id ${id}`);
    if (placed.has(id)) refuse(`roadmap step ${s.step}: trophy ${id} is placed twice`);
    placed.set(id, s.step);
  }
});
if (placed.size !== trophies.length) refuse(`roadmap places ${placed.size} of ${trophies.length} trophies`);
for (const t of trophies) {
  if (placed.get(t.id) !== t.roadmap_step) refuse(`${t.name}: roadmap_step ${t.roadmap_step} disagrees with the roadmap (step ${placed.get(t.id)})`);
}

// ---------- hand in ----------
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
console.log(`main.ts: validated 55 trophies and a 7-step roadmap; handed in to ${out}`);
