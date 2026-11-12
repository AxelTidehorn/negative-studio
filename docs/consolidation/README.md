# Architecture consolidation — historical PR #99 record

This report describes PR #99, not the current test runner. Current verification is documented in [TESTING.md](../TESTING.md). The summary below remains in git; large raw records and historical drivers are preserved in the immutable [PR #99 main snapshot](https://github.com/AxelTidehorn/negative-studio/tree/f78a031/docs/consolidation/measurements), not rerun by normal CI. Git history retains every original record.


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

Import metadata/TIFF preparation belong to the source owner. Source/calibration lifecycle resets replace several generations of choose/finish wrappers. Outgoing base previews are restored without painting/uploading the old source; workers and completed results are explicitly released. Base-reference controls refresh through the same UI owner as calibration status. RAW/TIFF retain the original high-precision source and bounded Float32 preview, without two extra RGBA thumbnails. Browser-decoded 8-bit sources retain their needed source data. Device-level appearance/language/backend preferences remain separate from per-image metadata.

## Numerical verification

- 2,241 Float64 rendering / Uint16 export cases against immutable main in the same JS runtime: exact hashes, including all active profiles at 0/35/70/100%, edits and direct/90°/fine-rotation exports.
- 27 newly computed Standard/V2 analyses, 1,053 exact output samples and repeated V2 recipe reuse against pre-consolidation configurations.
- 32 pre-encoder RGB8 / TIFF16 historical pixel hashes for retained Standard/V2 modes, plus cache/sampler/worker protocol oracles.
- Current profile catalog definitions and independent Work P numeric tests. No photographic parameters were changed.
- Chromium frame workflow at five viewports, touch range regression, preliminary preview, encoder/cancellation and profile export tests.

The additional [same-browser GPU comparison](https://github.com/AxelTidehorn/negative-studio/blob/f78a031/docs/consolidation/measurements/gpu-before-after.json) covers **2,160 exact final RGBA8 readbacks** and **240 exact V2 Float32 positive readbacks**, before/after on Chromium/ANGLE SwiftShader. It supplies identical frozen-main configurations to both applications, covering every active presentation, strengths 0/35/70/100%, edits, Standard variants/tones and V2. Final readbacks are 67×45; real inputs are bounded technical previews, not original-resolution RAW exports. No mismatch was found. Historical reproduction uses the driver from the pinned PR #99 checkout: `node tools/check-consolidation-gpu.mjs BEFORE AFTER OUTPUT`.

[Local complete verification](https://github.com/AxelTidehorn/negative-studio/blob/f78a031/docs/consolidation/measurements/verification-local-full.json): **101/101 groups** on production commit `c8ac8be`, Node 22.23.5, comprising 67 Node groups, one build group and 33 Chromium groups. The exact tested artifact identity is recorded. Later verification-only changes make the base-drag fixture confirm its frame, isolate animation from its CPU measurement and use the actual native captured pointer ID. The final PR CI runs the complete suite again.

[Targeted browser verification](https://github.com/AxelTidehorn/negative-studio/blob/f78a031/docs/consolidation/measurements/verification-targeted.json): frame review, range interaction and preliminary import layout all pass in **Linux WPE WebKit 27.2** and **Linux Microsoft Edge 157.0.4341.42**. Frame review covers five responsive layouts, pending/automatic/manual/locked states, queue/project round trips and rotation/zoom/pan. Range tests cover native taps/double taps, keyboard/focus and cancellation; trusted horizontal drags/vertical scrolls are Chromium/Edge-specific, while WebKit cancellation is synthetic. Import-proof tests cover five sizes/orientations, inversion, cancel and replacement. These tests use controlled decoders, not complete RAW decoding on those browsers. No physical iPad or Windows Edge claim is made.

Verification also exposed two test assumptions: synchronous pause/play manipulation could freeze a native grid transition at time zero, and the base-drag test assumed mouse pointer ID 1 without establishing a captured drag. Tests now await animation readiness and assert/carry the actual drag ownership. All pixel, coordinate, coalescing and timing-budget assertions remain in place.

At PR #99, reference generation executed main `42a9d33dd91a3c93cf736e693a86390bef80c61b` in a temporary checkout under the same Node runtime as the candidate, without npm installation. Checked-in Node 24 hashes remain reviewable evidence. This avoids treating Node 22/24 transcendental last-bit differences as refactor changes; no numeric tolerance is introduced. Expected conversion values come from frozen main, never candidate color code.

The complete suite and final CI are recorded in PR #99. Exploratory runs are not release evidence. That historical comparison used matching Node 22/24 runtimes. Current CI instead reads frozen runtime-specific values directly; it creates no historical worktree.

## Before/after measurements

Raw records and computed medians/ranges are in [measurements/summary.json](measurements/summary.json). Baseline is `42a9d33`; measured candidate is `f7a6a3d`. Main `21a5bb3` only adds documentation. Later changes remove duplicate guards and repair the animation test's pause/play synchronization; they do not change the measured analysis, detector, import, encoder or sampling paths.

Runs were serial, with no concurrent local tests: Linux 6.18.57 x64, AMD EPYC 9V74, Node 22.23.5, Chromium 156.0.8078.79 with software GPU. This is a shared host. Ranges below are observed min–max, not confidence intervals. Node microbenchmarks and actual application/browser exports are kept separate. No 26/40 MP projection is made.

### Detector and analysis (Node)

The detector received eleven real RAW-derived Float32 previews, each 480×321. Each file had one warmup and five measured runs. Every complete detector result is identical, including quad, analysis quad, confidence, candidates and rejection reasons. Per-file median reductions are 8–28%; this preserves existing detection behavior rather than proving new photographic accuracy.

| Input | Before median [range], ms | After median [range], ms |
| --- | ---: | ---: |
| _DSF8434 | 1522 [1418–1687] | 1220 [1012–1437] |
| _DSF8948 | 1337 [1277–1424] | 1188 [1095–1195] |
| _DSF8951 | 1369 [1341–1455] | 1254 [1150–1305] |
| _DSF8983 | 1356 [1268–1452] | 1038 [1024–1225] |
| _DSF9229 | 864 [840–908] | 736 [677–744] |
| _DSF9231 | 1545 [1501–1565] | 1259 [1215–1342] |
| _DSF9235 | 1466 [1442–1519] | 1315 [1219–1367] |
| _DSF9237 | 1514 [1404–1848] | 1315 [1230–1442] |
| _DSF9238 | 1347 [1275–1474] | 1181 [1132–1228] |
| _DSF9239 | 841 [813–925] | 670 [660–693] |
| _DSF9243 | 1428 [1323–1497] | 1022 [976–1077] |

Changes reuse the same sorted luminances, hoist constant color matrices, avoid temporary connected-component neighbor arrays and produce hypothesis masks lazily. Thresholds, scoring, sampling, geometric algorithm and format independence are unchanged.

Repeated source analysis used the real 480×321 _DSF9235 preview, fixed settings/calibration and seven repeated calls after one cold call:

| Analysis | Before median [range], ms | After median [range], ms | Cold call before → after, ms |
| --- | ---: | ---: | ---: |
| V2 | 96.40 [94.46–107.84] | 0.31 [0.19–0.55] | 524.69 → 481.34 |
| Standard | 148.75 [141.80–157.36] | 68.05 [62.02–82.39] | 212.83 → 142.70 |

V2's existing recipe reuse can now skip historical engine analyses entirely. This is repeated analysis, not complete rendering/import time. Standard computes only its required channel statistics and model.

### Full RAF imports (Chromium)

Original 6032×4032 _DSF8983.RAF and _DSF9235.RAF were actually decoded. Each file used a new browser context and one cold-context import, followed by three forced active-file reloads using the decoder cache. Browser process and OS file cache were not globally reset. "Usable" is the full technical RAW view ready for work, before optional frame confirmation.

| Input | Cold usable before → after, ms (one observation) | Cached usable before median [range], ms | Cached usable after median [range], ms |
| --- | ---: | ---: | ---: |
| _DSF8983 | 26187 → 23686 | 3447 [3394–3505] | 1356 [1270–1398] |
| _DSF9235 | 24695 → 23995 | 3293 [2949–3518] | 1315 [1201–1373] |

First visible preliminary JPEG was **163.5 → 216.6 ms** and **186.7 → 283.3 ms** respectively. These single observations are slower; this work does not demonstrate an improvement in first paint. The approximate-positive JPEG path is unchanged. LibRaw image-data decoding remains the dominant cold-import cost (about 20 seconds here); demosaicing is unchanged.

All cached reloads reuse the same decoded source array. Bounded source-overview hashes and 31 confirmed Float64 RGB samples agree exactly before/after for both originals. This is sampled conversion verification, not a claim of full-resolution export comparison for these originals. _DSF8983 still requests confirmation for `scale-disagreement`; _DSF9235 remains automatically accepted.

Per active RAW, source Float32 storage remains **291,852,288 bytes** and bounded preview storage **15,724,800 bytes**. Removing two obsolete RGBA buffers saves **12,083,200 owned bytes (11.52 MiB)**. This is a measured array-size reduction, not a total browser/process memory claim. Export RSS records sum process RSS and can double-count shared pages; no total-memory improvement is inferred from them.

### Export preservation

Node pixel-production tests used the same _DSF9235 bounded source: direct output 384×255, fine rotation output 365×242, five measured runs after warmup. Every Uint16 output hash is identical.

| Node pixel workload | Before median [range], ms | After median [range], ms |
| --- | ---: | ---: |
| V2 direct TIFF16 | 721 [718–749] | 734 [705–769] |
| V2 fine TIFF16 | 894 [870–940] | 918 [891–944] |
| Standard direct TIFF16 | 393 [383–434] | 375 [367–451] |
| Standard fine TIFF16 | 649 [618–761] | 643 [626–657] |

Actual Chromium worker exports used synthetic linear Rec.2020 **640×480**, identical V2 settings, three runs per case. Output sizes/metadata and decoded RGB16 hashes agree exactly across all repeats.

| Browser export | Before median [range], ms | After median [range], ms |
| --- | ---: | ---: |
| TIFF16 direct | 1097 [1015–1179] | 1095 [919–1136] |
| TIFF16 fine rotation | 1167 [1005–1209] | 1073 [964–1117] |
| TIFF16 composition + rotation | 658 [638–692] | 652 [575–722] |
| PNG16 fine rotation, initial trial | 1274 [1125–1338] | 1352 [1280–1380] |
| PNG16 fine rotation, separate seven-run trial | 1303 [1076–1489] | 1293 [1149–1342] |

The additional PNG trial investigated the initial +6% median; both trials are retained. Export timings overlap and do not support a reliable speedup or a persistent regression. V2 Node pixel medians are 2–3% slower in this run with overlapping ranges. **No export speed improvement is claimed.** Existing Float64 tile cache, processing order, workers, progress, precision and cancellation remain.

Cancellation used a **3000×2000** source, two runs each: before **51.6–53.2 ms**, after **51.8–59.0 ms** from request to completion. No cancelled export downloaded a file or retained active/busy state. The 10 ms UI heartbeat's largest gap across completed exports was 38.3 ms before and 40.2 ms after. This is synthetic software-GPU browser evidence, not physical iPad verification.

### Reproduce

Run each baseline/candidate pair sequentially in the same runtime on an otherwise idle machine. `BEFORE` is a detached checkout of the full baseline SHA; `AFTER` is the candidate checkout. Both need the locked dependencies. Detector/import originals are external private fixtures; their filenames and SHA-256s are recorded in the JSON, and they are not redistributed in git. Two bounded real previews used by the regression oracles are committed under `tests/fixtures/frame-real`.

```sh
node tools/benchmark-frame-detector.mjs BEFORE INPUT_F32_DIRECTORY detector-before.json
node tools/benchmark-frame-detector.mjs AFTER INPUT_F32_DIRECTORY detector-after.json
node tools/benchmark-consolidation.mjs BEFORE analysis-export-before.json
node tools/benchmark-consolidation.mjs AFTER analysis-export-after.json
node tools/benchmark-export-browser.mjs BEFORE browser-export-before.json 640 480 3 --cases=tiff-direct,tiff-fine,tiff-composed,png16-fine,cancel-fine
node tools/benchmark-export-browser.mjs AFTER browser-export-after.json 640 480 3 --cases=tiff-direct,tiff-fine,tiff-composed,png16-fine,cancel-fine
node tools/benchmark-import-consolidation.mjs BEFORE ORIGINAL_RAF_DIRECTORY raw-import-before.json
node tools/benchmark-import-consolidation.mjs AFTER ORIGINAL_RAF_DIRECTORY raw-import-after.json
```

Use `--cases=png16-fine` and repeat count `7` for the additional PNG trial. Browser drivers build the selected checkout and run its actual application. All timings, stage breakdowns, checksums, settings/geometry and buffer/RSS observations remain in the paired raw JSON files at the pinned PR #99 snapshot. Run these historical commands from that checkout; the current tree retains only useful current-product benchmark drivers.

### Size and complexity

Tracked `src/` production files: **93 → 78**. Production lines: **8,858 → 7,838** (newline count). Production bytes: **816,714 → 669,394**, after the final redundant-guard deletion. Built HTML/CSS/JS (excluding service worker): **1,005,402 → 834,122 bytes**; separately gzip-compressed files: **357,192 → 298,360 bytes**. Build identity strings make final byte counts vary slightly by commit. Unchanged WASM/assets are excluded from this text-size comparison. These are size reductions, separate from the timed results above.

## Deliberately retained complexity and limits

- Standard's channel log statistics and current color/shoulder variants are required numerical dependencies, despite historical names. V2's versioned frozen calibration/rendering contracts remain inside the same V2 engine.
- The bounded Float64 export tile cache, worker/stripe/yield/cancellation paths and GPU technical-positive cache remain. No full-resolution intermediate image is introduced.
- Classic shared session bindings and some UI/preview lifecycle wrappers remain where they coordinate actual resource ownership. Existing source/view and composition geometry paths are retained to avoid changing sampling or interaction behavior.
- Film-base automatic estimation versus explicit proposal/approval policy remains meaningful; removing that distinction would change conversion behavior.
- Physical iPad Safari and Windows Edge require actual-device verification. Linux WebKit/Edge results are labelled separately in PR #99. PR #97's touch protections have not been weakened.

Current README, architecture, testing, settings/export and backlog documentation describe the new model. Older design/protocol reports are explicitly archival. PR review now records documentation status for behavior/default/architecture/feature changes.
