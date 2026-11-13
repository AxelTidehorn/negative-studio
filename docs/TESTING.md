# Verification

Use Node 22 (CI) or Node 24, `npm ci`, and an installed Chromium/Chrome. No historical checkout or numeric-reference generation is required.

| Command | Purpose | Coverage |
| --- | --- | --- |
| `npm test` / `npm run test:fast` | Short feedback during ordinary edits | Boot graph/defaults, control bindings, translations, D tone, 166 exact numeric/export cases, import recovery and verification-infrastructure negative tests |
| `npm run test:full` | Required PR/main regression | All current-product Node tests, build, browser integration, precision, geometry, profiles, import/export, queue/project, desktop/tablet/phone interaction |
| `npm run test:extended` | Larger engine/render/import/export or performance changes | Full plus the expanded GPU recipes, original viewport/motion matrix, broader aspect/angle grid, full profile/strength/encoder Cartesian product and a 6 MP source/loupe workload |

There are three levels, defined once in `tests/suites.mjs`. A specific test can also be run with `node tests/NAME.mjs`; use `FILMLABB_TEST_LEVEL=extended` for its expanded cases. There are no integration/style/browser selector aliases or second test runner. Full includes 59 Node groups, one build group and 31 browser groups; extended adds one browser performance group and expands matrices inside the same tests. Group counts are not a quality target.

PRs and main pushes run full. Actions → **Build FILMLABB** → **Run workflow** offers fast/full/extended. Fast never seals, uploads or deploys an app. Full/extended bind complete successful registry membership to the exact site bytes and commit. The deploy job only consumes those verified bytes; it does not install, render or rebuild. PR runs never deploy. The former CSS-only publication shortcut is removed: CSS PRs now receive full coverage too. This intentionally trades their shorter old path for simpler, uniform publication rules.

The runner records per-test timing/failure logs under `.cache/`, shares one browser process and static server, and limits Node parallelism to two. It preserves separate contexts to avoid cross-test state leaks. Browser tests with intentional service-worker/fault servers keep their own servers. Do not change source or HEAD during a complete run. Test screenshots go under `.cache/` unless an explicit artifact output is supplied; normal tests do not overwrite documentation images.

## Critical coverage owners

| Area | Main checks |
| --- | --- |
| V2/D and Standard mathematics | `conversion-v2-*`, `standard-calibration`, `v2-approved-d`, `numeric-regression`, `analysis-consolidation` |
| Profiles / Editing 2.0 / CPU-GPU | `profile-system`, `editing-engine`, `editing-vibrance`, matching browser checks, `v2-gpu`, `standard-engine`, `check-gpu` |
| RAW / TIFF / source lifetime | Actual LibRaw DNG decode, `raw-chain-quality`, `check-raw-support`, `tiff-unit-float`, `check-tiff-codec`, `source-lifecycle`, `import-recovery`, import/source browser checks |
| Frame / film base | `frame-detection`, `frame-selection`, `frame-analysis-polygon`, `check-manual-frame`, film-base checks and frame-review/corner browser checks |
| Geometry / all encoders | `geometry`, `preview-geometry`, independent `presentation-sampling`, cache/worker tests, frozen JPEG/PNG/TIFF values and export/geometry browser checks |
| Projects / queue / resource release | `cleanup-project`, source/import/maintenance checks and project/export browser round trips |
| Desktop / tablet / phone | Frame review, range interaction, UI motion, Amber appearance and UI stability, including mobile order and reachable controls |
| Build / publication | `test-infrastructure`, `release-version`, `stability-build`, `build-version-browser`, offline-cache tests |

A Node coordinate unit test and a real-browser hit-target test are deliberately separate levels of protection. Same applies to pure profile math and actual encoder/worker/export integration. In the coordinate-only drag matrix, analysis is counted rather than repeatedly executed; frame-detection and real-source frame-review separately exercise actual V2 reanalysis and consent gates.

Full checks every active profile at 0/35/70/100% in exact CPU references and floating GPU readbacks. Every profile exports through all four encoders at 100%; Gold additionally exercises all strengths and forced CPU fallback. Extended restores every profile/strength/encoder/fallback combination. Full V2 GPU coverage includes current D and custom calibration; extended retains the other versioned recipe combinations. No numeric/color/export tolerance is enlarged.

## Frozen numeric data

`tests/fixtures/numeric/node22.json` and `node24.json` hold reviewed configs and 2,241 exact hashes, preserving the values validated against current main in PR #99. Provenance points to the immutable original capture. These are input/output fixtures, not reports generated during tests. Full executes all cases plus 27 fresh analyses / 1,053 exact samples. Fast selects two representative engine configurations (166 cases) while retaining all profile/strength/edit combinations within them.

Node 22 and 24 differ in some transcendental functions' final Float64 bit, so each has a fixed reference. Other major runtimes fail explicitly instead of generating new expectations or relaxing tolerances. CI's exact-hash target is Linux x64; a new runtime/platform needs independent review. TIFF expected samples are gzip-compressed losslessly; the decompressed bytes match the previous reference exactly. The independent fixture generators remain manual developer tools and are never part of ordinary testing.

Expected values must never be automatically recaptured to make a change pass. Intentional image changes require a reviewed explanation, independent evidence and explicit fixture updates. Pure color/tone scalar references and Work-profile oracles remain separate from candidate production code.

## Measurements and historical evidence

`npm run test:benchmark` measures source analysis and direct/fine-rotation pixel production separately from codec/browser/full RAW time. Current detector, full import, JPEG and RGB16 export browser measurement drivers remain under `tools/`. Run before/after serially on the same host, report dimensions/settings/repeats/spread, and keep raw outputs outside git as artifacts. No timing promise for large originals may be inferred from small synthetic probes.

[PR #99's summary](consolidation/README.md) links to its immutable raw evidence; normal development no longer carries the large reports or automatic historical comparison chain. [Test cleanup report](TEST_SUITE_CLEANUP.md) records deletions, coverage decisions and comparable measurements. Historical reproduction tools are available from the pinned commit, not compatibility layers in current tests.

## Browsers and devices

`FILMLABB_CHROMIUM_BIN` selects a Chromium-family executable. The frame-review, range-touch and import-proof tests additionally accept `FILMLABB_TEST_WEBKIT=1` with an installed Playwright WebKit runtime. Automated Linux WebKit is not physical iPad Safari; Linux Edge is not Windows Edge. Physical-device claims require actual runs.

## Documentation in review

A PR changing user behavior, defaults, architecture or features updates relevant documentation in the same PR. Review records which pages changed or why none applies. Trivial internal edits need no unrelated documentation change. README must describe actual defaults, including V2 for compatible new RAW.
