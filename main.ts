// Leonida Legend - entrypoint for the gta6-trophy-guide-01 entry.
//
// What this program does, in order:
//   1. Reads app/data/trophies.json and app/data/roadmap.json and validates
//      them hard (shape, the official 55, grade split, hidden count, every
//      guide present and cited, the roadmap placing every trophy once).
//      Any defect is named on stderr and the program exits 2 without
//      handing anything in.
//   2. Copies app/ and screenshots/ into the output directory
//      (MAKEFUN_OUTPUT_DIR, standing in for /output outside the grader).
//   3. Writes dossier.json into the output directory with buildDossier
//      from the kit's vendor library, under this competition's caps, and
//      refuses if the dossier would pass the 1.5 MiB competition limit.
//
// The program is deterministic: same repository in, same bytes out.

import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const GRADES = ['platinum', 'gold', 'silver', 'bronze'];
const KINDS = ['story', 'activities', 'collectibles', 'completion', 'platinum'];
const EXPECTED_SPLIT = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const EXPECTED_COUNT = 55;
const EXPECTED_HIDDEN = 28;
const DOSSIER_LIMIT = 1572864; // 1.5 MiB, the competition's dossier cap

function fail(defect) {
  console.error(`main.ts: refusing to hand in: ${defect}`);
  process.exit(2);
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function validateTrophies(data) {
  if (typeof data !== 'object' || data === null || !Array.isArray(data.trophies)) {
    fail('trophies.json is not an object with a trophies array');
  }
  const trophies = data.trophies;
  if (trophies.length !== EXPECTED_COUNT) {
    fail(`trophies.json holds ${trophies.length} trophies, not ${EXPECTED_COUNT}`);
  }
  const ids = new Set();
  const split = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  let hidden = 0;
  for (const t of trophies) {
    if (typeof t !== 'object' || t === null) fail('a trophy entry is not an object');
    if (isBlank(t.id)) fail('a trophy has no id');
    if (ids.has(t.id)) fail(`duplicate trophy id ${t.id}`);
    ids.add(t.id);
    if (isBlank(t.name)) fail(`trophy ${t.id} has no name`);
    if (isBlank(t.description)) fail(`trophy ${t.id} has no description`);
    if (isBlank(t.guide)) fail(`trophy ${t.id} has no guide`);
    if (!GRADES.includes(t.grade)) fail(`trophy ${t.id} has grade ${t.grade}`);
    split[t.grade] += 1;
    if (!KINDS.includes(t.type)) fail(`trophy ${t.id} has type ${t.type}`);
    if (typeof t.hidden !== 'boolean') fail(`trophy ${t.id} hidden is not a boolean`);
    if (t.hidden) hidden += 1;
    if (typeof t.missable !== 'boolean') fail(`trophy ${t.id} missable is not a boolean`);
    if (!Array.isArray(t.sources) || t.sources.length === 0 || t.sources.some(isBlank)) {
      fail(`trophy ${t.id} does not name its sources`);
    }
    if (!t.guide.includes('Sources:')) fail(`trophy ${t.id} guide cites no source`);
    if (!Array.isArray(t.steps)) fail(`trophy ${t.id} steps is not an array`);
    if (t.status === 'unconfirmed' && t.steps.length !== 0) {
      fail(`trophy ${t.id} is unconfirmed but carries steps - unconfirmed trophies state no method`);
    }
    if (t.status !== 'unconfirmed' && t.steps.length === 0) {
      fail(`trophy ${t.id} has status ${t.status} but no steps`);
    }
    if (isBlank(t.requirements)) fail(`trophy ${t.id} has no requirements`);
    if (isBlank(t.effort)) fail(`trophy ${t.id} has no effort estimate`);
    if (isBlank(t.status)) fail(`trophy ${t.id} has no status`);
    if (!Number.isInteger(t.roadmap_step) || t.roadmap_step < 1 || t.roadmap_step > 8) {
      fail(`trophy ${t.id} has roadmap_step ${t.roadmap_step}`);
    }
  }
  for (const g of GRADES) {
    if (split[g] !== EXPECTED_SPLIT[g]) {
      fail(`grade split is wrong: ${g} is ${split[g]}, not ${EXPECTED_SPLIT[g]}`);
    }
  }
  if (hidden !== EXPECTED_HIDDEN) {
    fail(`hidden count is ${hidden}, not ${EXPECTED_HIDDEN}`);
  }
  return trophies;
}

function validateRoadmap(data, trophies) {
  if (typeof data !== 'object' || data === null || !Array.isArray(data.steps)) {
    fail('roadmap.json is not an object with a steps array');
  }
  const steps = data.steps;
  if (steps.length !== 8) fail(`roadmap.json holds ${steps.length} steps, not 8`);
  const byId = new Map(trophies.map((t) => [t.id, t]));
  const placed = new Set();
  let ponrCount = 0;
  steps.forEach((s, i) => {
    if (s.step !== i + 1) fail(`roadmap step at position ${i} is numbered ${s.step}`);
    if (isBlank(s.title) || isBlank(s.summary) || isBlank(s.effort)) {
      fail(`roadmap step ${s.step} is missing title, summary or effort`);
    }
    if (!Array.isArray(s.depends_on)) fail(`roadmap step ${s.step} depends_on is not an array`);
    for (const dep of s.depends_on) {
      if (!Number.isInteger(dep) || dep < 1 || dep >= s.step) {
        fail(`roadmap step ${s.step} depends on ${dep}, which is not an earlier step`);
      }
    }
    if (s.point_of_no_return) {
      ponrCount += 1;
      if (s.step !== 1) fail(`roadmap step ${s.step} is flagged point of no return; only step 1 may be`);
      if (isBlank(s.point_of_no_return_note)) fail('roadmap step 1 has no point-of-no-return note');
    }
    if (!Array.isArray(s.trophies) || s.trophies.length === 0) {
      fail(`roadmap step ${s.step} places no trophies`);
    }
    for (const id of s.trophies) {
      if (!byId.has(id)) fail(`roadmap step ${s.step} places unknown trophy ${id}`);
      if (placed.has(id)) fail(`trophy ${id} is placed twice on the roadmap`);
      placed.add(id);
      if (byId.get(id).roadmap_step !== s.step) {
        fail(`trophy ${id} says roadmap_step ${byId.get(id).roadmap_step} but sits in step ${s.step}`);
      }
    }
  });
  if (ponrCount !== 1) fail(`roadmap has ${ponrCount} point-of-no-return flags, not 1`);
  if (placed.size !== EXPECTED_COUNT) {
    fail(`roadmap places ${placed.size} trophies, not ${EXPECTED_COUNT}`);
  }
}

function main() {
  const botDir = process.env.MAKEFUN_BOT_DIR || dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR;
  if (!outDir) fail('MAKEFUN_OUTPUT_DIR is not set');
  const trophiesData = JSON.parse(readFileSync(join(botDir, 'app', 'data', 'trophies.json'), 'utf8'));
  const roadmapData = JSON.parse(readFileSync(join(botDir, 'app', 'data', 'roadmap.json'), 'utf8'));
  const trophies = validateTrophies(trophiesData);
  validateRoadmap(roadmapData, trophies);
  for (const part of ['app', 'screenshots']) {
    if (!existsSync(join(botDir, part))) fail(`${part}/ is missing from the repository`);
    cpSync(join(botDir, part), join(outDir, part), { recursive: true });
  }
  const dossier = buildDossier(botDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  if (dossier.length > DOSSIER_LIMIT) {
    fail(`dossier.json would be ${dossier.length} bytes, over the ${DOSSIER_LIMIT} cap`);
  }
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`main.ts: validated 55 trophies and an 8-step roadmap; dossier.json ${dossier.length} bytes`);
}

main();
