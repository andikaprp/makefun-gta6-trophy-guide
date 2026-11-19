# makefun-gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/andikaprp/makefun-gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/andikaprp/makefun-gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Legend - an offline trophy guide and tracker for Grand Theft Auto VI on PlayStation 5. All 55 trophies with their official names, descriptions and grades, verified on launch day against two independent platform pipelines (PSN data via Exophase; Xbox catalog data via XCT.live and TrueAchievements). Every trophy carries a cited guide with method steps, requirements and an effort estimate; the five hidden trophies whose unlock methods were still unconfirmed at launch are labelled honestly, with the reading marked as inference, the safe habit that covers the plausible trigger, and the signal that will confirm them. A seven-step roadmap with dependencies and a point-of-no-return check, a missable watch on the one trophy under investigation, saved progress with per-grade counts, kind and grade filters, search, a spoiler shield for hidden trophies, and export/import - all in a static app with no build step and no network.

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

To hand it in the way the scorer does: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` - main.ts validates the trophy data (the verified 55, the official grade and hidden splits, a roadmap placing every trophy exactly once) before copying `app/` and `screenshots/` to the output and writing `dossier.json`.

---

An entry for the gta6-trophy-guide-01 bounty on [make.fun](https://make.fun/), the entry platform.
