// Leonida Legend - hand-in program for gta6-trophy-guide-01.
//
// Node 22, standard library only, run directly: `node main.ts`.
// The guide itself is the static app/ folder beside this file. This
// program first PROVES the data is sound, then hands the entry in:
// it copies app/ and screenshots/ into the output directory and
// writes dossier.json with the vendored make.fun library, byte for
// byte as the scorer's own copy writes it. The vendored file is not
// ours to edit.
//
// Validation contract: any defect in the trophy data or the roadmap
// stops the hand-in with exit code 2 and a message naming the defect,
// because a scarce submission must never be spent on a broken list.
// Two runs over the same inputs produce byte-identical output.
//
// Local use: MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const VALID_GRADES = new Set(['platinum', 'gold', 'silver', 'bronze']);

function fail(defect: string): never {
  console.error(`Leonida Legend hand-in refused: ${defect}`);
  process.exit(2);
}

function readJson(rel: string): unknown {
  const path = join(here, rel);
  if (!existsSync(path)) fail(`missing file ${rel}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    fail(`${rel} is not valid JSON (${(err as Error).message})`);
  }
}

// ---- validate the trophy list ----
const trophyDoc = readJson('app/data/trophies.json') as { trophies?: unknown };
if (!trophyDoc || typeof trophyDoc !== 'object' || !Array.isArray(trophyDoc.trophies)) {
  fail('app/data/trophies.json has no trophies array');
}
const trophies = trophyDoc.trophies as Array<Record<string, unknown>>;
if (trophies.length === 0) fail('the trophies array is empty');

const seenIds = new Set<unknown>();
let missableCount = 0;
for (const trophy of trophies) {
  const label = `trophy id ${String(trophy?.id)}`;
  if (!trophy || typeof trophy !== 'object') fail('a trophy entry is not an object');
  if (!Number.isInteger(trophy.id) || (trophy.id as number) < 1) {
    fail(`${label} is not a positive integer id`);
  }
  if (seenIds.has(trophy.id)) fail(`duplicate ${label}`);
  seenIds.add(trophy.id);
  if (typeof trophy.name !== 'string' || trophy.name.trim() === '') {
    fail(`${label} has a blank name`);
  }
  if (typeof trophy.description !== 'string' || trophy.description.trim() === '') {
    fail(`${label} (${String(trophy.name)}) has a blank description`);
  }
  if (typeof trophy.guide !== 'string' || trophy.guide.trim() === '') {
    fail(`${label} (${String(trophy.name)}) has a blank guide`);
  }
  if (typeof trophy.grade !== 'string' || !VALID_GRADES.has(trophy.grade)) {
    fail(`${label} (${String(trophy.name)}) has an invalid grade: ${String(trophy.grade)}`);
  }
  if (typeof trophy.hidden !== 'boolean' || typeof trophy.missable !== 'boolean') {
    fail(`${label} (${String(trophy.name)}) needs boolean hidden and missable flags`);
  }
  if (!Number.isInteger(trophy.roadmap_step)) {
    fail(`${label} (${String(trophy.name)}) has no integer roadmap_step`);
  }
  if (!Array.isArray(trophy.sources) || trophy.sources.length === 0) {
    fail(`${label} (${String(trophy.name)}) lists no sources`);
  }
  for (const source of trophy.sources as Array<Record<string, unknown>>) {
    if (!source || typeof source.name !== 'string' || source.name.trim() === '') {
      fail(`${label} (${String(trophy.name)}) has a source with a blank name`);
    }
  }
  if (trophy.missable === true) missableCount += 1;
}
if (missableCount > 1) {
  fail(`expected at most one missable trophy, found ${missableCount}`);
}

// ---- validate the roadmap against the list ----
const roadmapDoc = readJson('app/data/roadmap.json') as { steps?: unknown };
if (!roadmapDoc || typeof roadmapDoc !== 'object' || !Array.isArray(roadmapDoc.steps)) {
  fail('app/data/roadmap.json has no steps array');
}
const placed = new Map<unknown, number>();
for (const step of roadmapDoc.steps as Array<Record<string, unknown>>) {
  if (!Array.isArray(step?.trophy_ns)) {
    fail(`roadmap step ${String(step?.step)} has no trophy_ns array`);
  }
  for (const id of step.trophy_ns as unknown[]) {
    if (!seenIds.has(id)) {
      fail(`roadmap step ${String(step.step)} names unknown trophy id ${String(id)}`);
    }
    if (placed.has(id)) {
      fail(`trophy id ${String(id)} is placed twice (steps ${placed.get(id)} and ${String(step.step)})`);
    }
    placed.set(id, Number(step.step));
  }
}
for (const id of seenIds) {
  if (!placed.has(id)) fail(`trophy id ${String(id)} is missing from the roadmap`);
}
// Cross-check: each trophy's own roadmap_step field must agree with
// the step that actually places it, so the board grouping (which
// reads roadmap_step) can never drift from the roadmap view.
for (const trophy of trophies) {
  if (placed.get(trophy.id) !== trophy.roadmap_step) {
    fail(
      `trophy id ${String(trophy.id)} (${String(trophy.name)}) declares roadmap_step ` +
      `${String(trophy.roadmap_step)} but the roadmap places it in step ${String(placed.get(trophy.id))}`,
    );
  }
}

// ---- hand in ----
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps, exactly as the kit starter passes them:
// text_max_bytes shapes the dossier bytes; the rest refuse anything
// the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(`Leonida Legend handed in: ${trophies.length} trophies validated, output at ${out}`);
