# FILMLABB 1.1 stability update

## Baseline and test sources

See STABILITY_BASELINE.md for the unmodified Fix 11 results and ZIP comparison.
The ZIP's 140 tests/fixtures already exist in slider-regression-suite.json. Only
its missing tools/pack-tests.mjs was restored. No historical logs, unused tools,
or camera corpora were copied. Tests unpack into ignored tests/; edit there and
run `node tools/pack-tests.mjs` to persist bundle changes. New targeted regressions
live in readable test/stability-*.mjs. Existing legacy root files and old test/
files remain. Generated site/ is rebuilt cleanly; its unchanged LibRaw fallback
was moved to vendor/libraw/dist so building cannot overwrite tracked vendor files.

## Confirmed defects and changes

- #2: the TIFF encoder swallowed errors; batch export overwrote failures with
  success or rejected without a handled message. TIFF now propagates failure,
  batches continue per frame and report counts plus filenames/errors, and restore
  the original selection. TIFF uses the existing progress panel/lock/cancel UI;
  cancellation checks run between stripes and before download. Five-image cap
  remains. The 16-row encoder and original pixel path are retained.
- #3: calibration-state.js replaced the filename-aware TIFF writer with a fixed
  filename. The active writer now uses exportName, including batch numbering.
  Blank-prefix default filename is preserved. ZIP headers now mark their existing
  UTF-8 names correctly, reproduced with Sommarö (also issue #10).
- #5: genuine project-loader defects included rejecting the old beta3 project
  format, losing profile/sampling semantics, missing exported calibration version,
  retaining invalid persisted responses and assigning new RAW defaults to old
  projects. Persist version metadata; retain explicit engine, RAW import, sampling,
  profile and crop state; accept old projects and discard invalid responses.
  Existing Fix 11 v08 files retain their default profile version 2 and source
  sampling. Per-frame version 39 is recognized when the top-level marker is
  absent, preserving Fix 11 RAW calibration. Older unversioned linear manual
  calibration is retired with a status message, as in the existing startup policy.
  Slider reset now retains crop mode/lock/export/visibility while preserving its
  previous color-control reset behavior.
- #5 outdated tests: uncertain crops no longer block export by design (Fix 11);
  sw.js delegates to cache-worker.js; crop confirmation lives in a collapsible
  section. Correct those expectations rather than reverting the application.
  Export fault-injection browser tests block service workers so the installed
  cache cannot hide their deliberately corrupted/delayed worker responses; real
  service-worker lifecycle has its own browser regression. Mobile check writes
  its own report instead of requiring a previous test's report.
- #6: reproduced swallowed precache failures, default HTTP-cache reads and deletion
  of unrelated caches. Installation now uses reload requests and fails atomically
  with respect to activation. Build hashes all deployed files and generates the
  precache list. HTML and modules use the same installed cache. No skipWaiting or
  clients.claim: a new worker waits for existing clients rather than mixing app
  versions. Registration uses updateViaCache:none. Only FILMLABB caches are pruned.
- #8: confirmed, deliberately not changed. An 8x8 image of alternating 0/1 columns
  reduces to 1 instead of the area average 0.5 in both export and preview. The
  repeatable investigation is test/downscale-investigation.mjs, explicitly marked
  as a known limitation, not a quality acceptance test. Adding a preview filter
  would also change calibration sampling; raw-domain averaging before the nonlinear
  kernel would differ from averaging rendered pixels, and spatial flat-field
  correction needs consistent coordinates. Separate image-quality and performance
  validation is required before selecting a filter. Original-size pixels, crop
  geometry and the GPU preview path remain unchanged.

## Running validation

Use Node 22+:

```
npm ci
npm test
npm run test:legacy
npm run build
npm run test:build
npx playwright install --with-deps chromium
npm run test:browser
```

`npm test` now includes all self-contained compatibility tests and TIFF/cache
regressions, reports all failed groups rather than stopping at the first one.
`test:legacy` is an alias to the same complete suite. Browser tests are explicit
because browser binaries/system dependencies must be installed. Set
FILMLABB_CHROMIUM_BIN to an installed Chromium path if using a system browser.
The PR CI runs the complete suite, build checks and all browser groups.

Real-camera tools (check-real-files, check-real38, check-real-arw,
check-raf-dng-pair, check-full-raf-export, check-decode-benchmark) require external
camera files/explicit paths and are not part of self-contained acceptance. The
included synthetic DNG is decoded by actual LibRaw/WASM during npm test.

## Remaining risks and intentionally unchanged behavior

TIFF still buffers the full file in memory and encodes on the main thread with
yields. Cancellation cannot retract files already downloaded; a cancelled batch
reports how many completed. Browser download permissions can prevent a requested
save: counts describe successful download dispatch, not verified filesystem writes.
No new TIFF worker implementation or color mathematics is introduced.

Downscaled export/preview aliasing remains (#8). Unknown deviceMemory still uses
the existing budget (#11, outside this repair). Actual Safari/iPad memory limits,
Edge-specific download prompts and external camera corpora require device/manual
validation. Chromium/SwiftShader parity checks validate rendering correctness and
texture reuse, not physical-device speed. Offline updates become available after
old clients close; users must close all tabs/installed-app windows for activation.

## Final validation results

Clean worktree /tmp/filmlabb-clean, Node 24.19.0, application commit 6b362b4:

| Check | Result |
| --- | --- |
| npm ci --cache /tmp/filmlabb-npm-cache | PASS; 3 locked packages installed |
| npm test | PASS; 27/27 groups, including the explicitly known #8 reproduction |
| npm run test:legacy | PASS; 27/27 groups through the compatibility entry point |
| npm run build | PASS; complete generated site and content-derived cache ID |
| npm run test:build | PASS; stale output removed, manifest completeness, stable rebuild, CSS change invalidates cache, HTML parity |
| npm run test:browser (system Chromium) | PASS; 5/5 groups: workflow, next/full-resolution, GPU, mobile, service-worker lifecycle |
| git status --porcelain after tests/build | Empty; no tracked changes |
| Color/GPU/RAW core diff against main | No changes to image-model.js, render-core.js, color-analysis.js, color-calibration.js, color-management.js, raw-input.js, raw-decoder.js, gpu-preview.js, gpu-renderer.js, export-plan.js or export-worker.js |

GPU browser validation exercised 64 shader cases, observed a maximum error of one
display level, and verified source texture reuse, context loss/recovery, crop and
rotation, identical TIFF bytes with CPU/GPU selection, and mobile GPU operation.
New TIFF regressions verify exact 16-bit payloads through four crop/rotation cases,
prefix/default/batch names, propagated encoder errors, partial results, cancellation,
restoration-error accounting, queue cap and both ZIP UTF-8 headers.

No final self-contained or browser test failures remain. External camera tools and
physical Safari/iPad/Edge validation were not run. The #8 reproduction passes by
asserting the known current limitation; it does not claim aliasing has been fixed.
