# Architecture consolidation

Baseline for numerical/performance comparison: main `42a9d33` after PR #97. The branch also includes main `21a5bb3` (#98, documentation only), preserving its backlog updates. No automatic merge or deployment is part of this work.

## Removed

- Original/log39, Curve, Density, Matrix, beta2/beta3/density38/reference conversion branches, model builders, comparison analysis and Conversion3 CPU/GPU code.
- Standalone V2 lab, isolated reference page/bridge/client, its independent RAW worker/base search/output chain and preview deployment workflow. Main-app V2 core/render/fast/GPU/diagnostics remain.
- Hidden Editing 1 selector, retired sliders without effect in either active engine, unused `makeExportCanvas`, full-color table/cache variants and obsolete project/localStorage recipe restoration.
- Earlier project schemas/migration, per-image `legacyCrop` export plans and queue copies of crop/base/levels. Current projects use `filmlabb-roll-4`, geometry 2 and Editing 2.0.
- Tests and tools exclusively for retired engines/lab/migrations. Useful scalar numerical oracles are test-only fixtures, outside the application build.

## Simplified

Only V2/D and Standard (`calibrated4`) can be selected or loaded. Fresh compatible RAW still defaults to V2. One engine controller owns selection/decoder changes. The selected engine alone performs analysis; V2 no longer also runs shared historical, Original and Standard/Conversion3 analysis.

`settings.frame` owns normalized-source quad/analysis quad, detector evidence, origin, acceptance and lock. Bounding region and V2 analysis descriptor are derived. An exact rectangle descriptor can preserve scalar extents at ceil/floor boundaries; it is created/validated atomically, not synchronized by controllers. Composition remains separate, and the queue owns crop-to-frame export preference. Pending candidates still open directly for correction and never silently authorize V2 analysis.

Import metadata/TIFF preparation belong to the source owner. Source/calibration lifecycle resets replace several generations of choose/finish wrappers. RAW/TIFF retain the original high-precision source and bounded Float32 preview, without two extra RGBA thumbnails. Browser-decoded 8-bit sources retain their needed source data. Device-level appearance/language/backend preferences remain separate from per-image metadata.

## Preserved and checked so far

- 2,241 frozen Float64 rendering / Uint16 export cases from main: exact hashes, including all active profiles at 0/35/70/100%, edits and direct/90°/fine-rotation exports.
- 27 newly computed Standard/V2 analyses, 1,053 exact output samples and repeated V2 recipe reuse against pre-consolidation configurations.
- 32 pre-encoder RGB8 / TIFF16 historical pixel hashes for retained Standard/V2 modes, plus cache/sampler/worker protocol oracles.
- Current profile catalog definitions and independent Work P numeric tests. No photographic parameters were changed.
- Chromium frame workflow at five viewports, touch range regression, preliminary preview, encoder/cancellation and profile export tests.

The final complete-suite, browser and measurement records will be recorded below after the frozen run. Interim exploratory runs are not release evidence.

## Measurements

Before/after results must be run serially with identical input/settings and report spread. Node bounded-source analysis/detector/pixel timings are separate from browser/codec/full-RAW timings. No megapixel time projection or total browser-memory claim is made from buffer counts.

Drivers: `tools/benchmark-consolidation.mjs`, `tools/benchmark-frame-detector.mjs`, `tools/benchmark-export-browser.mjs`, and `tools/check-frame-review-real.mjs`. Original RAW files stay outside git. Frozen source checksums identify the actual bounded inputs.

## Deliberately retained complexity and limits

- Standard's channel log statistics and current color/shoulder variants are required numerical dependencies, despite historical names. V2's versioned frozen calibration/rendering contracts remain inside the same V2 engine.
- The bounded Float64 export tile cache, worker/stripe/yield/cancellation paths and GPU technical-positive cache remain. No full-resolution intermediate image is introduced.
- Classic shared session bindings and some UI/preview lifecycle wrappers remain where they coordinate actual resource ownership. Existing source/view and composition geometry paths are retained to avoid changing sampling or interaction behavior.
- Film-base automatic estimation versus explicit proposal/approval policy remains meaningful; removing that distinction would change conversion behavior.
- Physical iPad Safari and Windows Edge require actual-device verification. Linux WebKit/Edge results, if run, will be labelled accordingly. PR #97's touch protections have not been weakened.

Current README, architecture, testing, settings/export and backlog documentation describe the new model. Older design/protocol reports are explicitly archival. PR review now records documentation status for behavior/default/architecture/feature changes.
