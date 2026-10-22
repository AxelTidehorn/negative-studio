# Stability baseline

Inspected main 3d123d874a3e6dcfe4f7b5ed09c257996059a893 against
FILMLABB_1.1_Beta5_Export_Fix11_GitHub_root.zip (SHA256
731e054a8092c831e911ed17910eb2d314c6d55b74053478c9728cd070829921).
All 66 common files are byte-identical. All 140 ZIP tests/fixtures are already
embedded identically in slider-regression-suite.json and restored by the runners.
No separate test/fixture restoration is needed. Restore tools/pack-tests.mjs only:
it regenerates that bundle and checks TIFF fixture completeness. Historical logs,
old hash invariants and profile-review tools are not required by current runners.

## Before application changes (Node 24.19.0)

- npm ci --cache /tmp/filmlabb-npm-cache: PASS. Default home cache is unwritable
  in this environment; the lockfile and dependency did not need changes.
- npm test: PASS, all 17 default groups including TIFF and export performance.
- npm run build: PASS, but retains stale output.
- npm run test:legacy: FAIL at check-app-integration:49, true !== false.
- Individually: check-project39 FAIL (missing sourceCalibrationVersion);
  check-project4 FAIL (invalid response retained); check-profiles-next FAIL
  (old project stays profile version 2); check-manual-frame FAIL (slider reset
  changes manual crop mode to auto); check-i18n-static FAIL (expects i18n.js
  in the delegating sw.js). check-raw-fixture PASS (actual WASM/DNG decode).

The crop export-blocking assertion predates Fix 11 and is obsolete. The service
worker assertion predates delegation to cache-worker.js and is obsolete. The
project and manual-crop failures require application fixes, not relaxed tests.

## Inventory and build policy

Keep root beta2.js, beta3.js, beta38.js, color-engine.js, pixel-kernel.js,
render-worker.js, workspace.js and old test/ sources for now. They are legacy
artifacts, not current entry-point modules; removing them is outside this repair.
The old test/ tree is not the active bundled tests/ tree.

Stop tracking generated site/ assets and move the unchanged site/libraw/dist to vendor/libraw/dist as the existing
fallback for builds without installed dependencies. Build a clean site/ to prevent
old scripts from surviving a deploy. No original images or project files removed.

## Optional validation

Browser tests require Playwright and a browser; real-camera tools require external
RAW inputs and explicit output paths. These must be reported separately from the
self-contained suite, never silently treated as passing. No camera corpus or
historical logs are copied from the ZIP. Browser timing is not device validation
for iPad Safari or Edge.

An additional untouched-main browser run reproduces check-workflow-browser:20:
confirmation is inside the existing collapsible film-frame section. The updated
expectation opens that section and checks reachability; no UI change is needed.

The remaining ZIP tools were assessed individually: check-engine.mjs only imports
verify-unchanged.mjs, which requires the historical processing-invariants.json.
That hash list already disagrees with unchanged Fix 11 modules such as
raw-input.js, file-formats.js and render-core.js. Restoring it as a current gate
would give misleading failures. make-profile-chart.mjs and review-profiles.mjs
are profile-development tools; no profile or color-math work is in scope here.
