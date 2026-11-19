// Leonida Legend - entry program (Node 22, standard library only).
// Validates the trophy data hard before handing anything in: the full
// schema per trophy, the guide-citation rule, the unconfirmed-trophies-
// carry-no-steps rule, and the roadmap placing every trophy exactly once.
// Malformed data is refused with the defect named, exit 2. Then app/ and
// screenshots/ are copied to the output and dossier.json is written with
// the vendored make.fun library, byte for byte as the scorer's copy does.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function refuse(defect: string): never {
  console.error(`leonida-legend: refusing malformed data - ${defect}`);
  process.exit(2);
}

const trophiesDoc = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
const roadmapDoc = JSON.parse(readFileSync(join(here, 'app', 'data', 'roadmap.json'), 'utf8'));
const trophies = trophiesDoc.trophies;
if (!Array.isArray(trophies) || trophies.length !== 55) refuse('trophies.json must carry exactly 55 trophies');

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const ids = new Set<number>();
const split: Record<string, number> = {};
let hiddenCount = 0;
for (const t of trophies) {
  if (!Number.isInteger(t.id) || ids.has(t.id)) refuse(`trophy id ${t.id} is not a unique integer`);
  ids.add(t.id);
  if (typeof t.name !== 'string' || t.name.trim() === '') refuse(`trophy ${t.id} has no name`);
  if (typeof t.description !== 'string' || t.description.trim() === '') refuse(`${t.name} has no description`);
  if (!GRADES.includes(t.grade)) refuse(`${t.name} has an unknown grade ${t.grade}`);
  split[t.grade] = (split[t.grade] ?? 0) + 1;
  if (typeof t.type !== 'string' || t.type.trim() === '') refuse(`${t.name} has no type`);
  if (typeof t.hidden !== 'boolean') refuse(`${t.name} has no hidden flag`);
  if (t.hidden) hiddenCount++;
  if (typeof t.missable !== 'boolean') refuse(`${t.name} has no missable flag`);
  if (!Number.isInteger(t.roadmap_step)) refuse(`${t.name} has no roadmap step`);
  if (typeof t.guide !== 'string' || t.guide.trim() === '') refuse(`${t.name} has no guide`);
  if (!/basis:|per PowerPyx|per Output Lag|Exophase/i.test(t.guide)) refuse(`${t.name} guide cites no source`);
  if (!Array.isArray(t.sources) || t.sources.length === 0) refuse(`${t.name} has no sources`);
  // The honesty rule, enforced in code: an unconfirmed trophy may carry a
  // reading and a play-it-safe habit, never numbered method steps.
  if (t.guide.includes('METHOD UNCONFIRMED') && /Method:\s*\d+\)/.test(t.guide)) {
    refuse(`${t.name} is unconfirmed but its guide carries numbered steps`);
  }
}
if (split.platinum !== 1 || split.gold !== 2 || split.silver !== 6 || split.bronze !== 46) {
  refuse(`grade split is ${JSON.stringify(split)}, not 1 platinum / 2 gold / 6 silver / 46 bronze`);
}
if (hiddenCount !== 28) refuse(`${hiddenCount} hidden trophies, not 28`);
const missables = trophies.filter((t: { missable: boolean }) => t.missable);
if (missables.length !== 1 || missables[0].name !== 'Positive Mental Attitude') {
  refuse('the missable watch must be exactly Positive Mental Attitude');
}

const steps = roadmapDoc.steps;
if (!Array.isArray(steps) || steps.length !== 8) refuse('roadmap.json must carry exactly 8 steps');
const placed = new Map<number, number>();
for (const s of steps) {
  if (!Number.isInteger(s.step) || typeof s.title !== 'string' || !Array.isArray(s.trophy_ids)) {
    refuse('a roadmap step is malformed');
  }
  for (const id of s.trophy_ids) {
    if (placed.has(id)) refuse(`trophy ${id} is placed on the roadmap twice`);
    placed.set(id, s.step);
  }
}
for (const t of trophies) {
  if (placed.get(t.id) !== t.roadmap_step) refuse(`${t.name} roadmap_step disagrees with roadmap.json`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
