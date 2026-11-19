# makefun-gta6-trophy-guide
[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/andikaprp/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/andikaprp/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

**Leonida Legend** is an original, offline trophy guide and tracker for Grand Theft Auto VI on PlayStation 5. It is a plain static web app - no build step, no accounts, no network calls - that keeps your progress in your own browser and works anywhere the files can be opened.

## What is inside

- **The verified 55-trophy list.** Every official trophy, cross-checked on 2026-11-19 against two independent platform pipelines - PSN data via Exophase and Xbox catalog data via XCT.live and TrueAchievements - agreeing on every name: 1 platinum, 2 gold, 6 silver, 46 bronze, 28 of them hidden.
- **A tracker board.** All 55 trophies as checklist cards grouped by roadmap step, with an overall percentage, per-grade tallies, kind and grade filters, text search, and progress saved in localStorage. Export and import buttons on every view move your progress between browsers as a small JSON file.
- **A spoiler shield.** Hidden story trophies keep their names and descriptions covered until you earn them, so a first playthrough stays unspoiled. The shield can be switched off on the board.
- **Cited guidance for every trophy.** Each detail page carries the official name and description, the grade, the flags, and a guide written for this entry whose text names its basis - roadmap order per PowerPyx, hidden-trophy readings per Output Lag, and the platform lists behind the data.
- **A 7-step roadmap.** From the prologue to 100% and the platinum, with every trophy placed exactly once and per-step earned counts.
- **A missable watch.** Exactly one trophy is flagged: Positive Mental Attitude. Its missable status is still under investigation at launch, so the guide puts the warning where it matters - meditate at each spot the first time you reach it, starting in Chapter 1.
- **An honesty note.** Five cryptic hidden trophies had no confirmed unlock method in print at launch. Their guides begin METHOD UNCONFIRMED and say what is actually known instead of inventing a method. The Method view explains the whole verification.

The look is a sunset ledger: warm paper, ink rules, hand-tallied counts, system fonts only. No Rockstar artwork or logos are used; this is an unofficial fan guide, not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.

## Run it

Preview the guide locally:

```
node serve.ts
```

then open http://localhost:8080 in a browser. Add `?demo=1` to the address to see the board with an honest 10-of-55 demo sample filled in.

Hand the entry in (validates the trophy data first and refuses, naming the defect, if anything is malformed):

```
MAKEFUN_OUTPUT_DIR=out node main.ts
```

That copies `app/` and `screenshots/` into the output directory and writes `dossier.json` with the vendored make.fun library. Two runs produce byte-identical output.

## Layout

- `app/` - the guide itself: `index.html`, `style.css`, `app.js`, `lib/tracker.js` (localStorage progress, export/import, demo seeding), `lib/views.js` (board, detail, roadmap and method renderers), `data/trophies.json` (the verified 55), `data/roadmap.json` (the 7 steps).
- `main.ts` - validation plus hand-in. `serve.ts` - the local preview server.
- `screenshots/` - four captures of the running app with the demo sample; `shots.json` says what each one shows.
- `vendor/makefun-frontend.ts` - the make.fun dossier library, vendored unchanged.

---

An entry for the gta6-trophy-guide-01 bounty on [make.fun](https://make.fun/), the entry platform.
