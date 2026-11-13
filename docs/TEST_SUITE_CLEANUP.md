# Test suite consolidation

Baseline: main `f78a031` (merged PR #99). Production sources, app manifest, build implementation, decoder settings, profiles and image algorithms are unchanged. This work changes tests, fixtures, execution/publication verification and documentation.

## Inventory and decisions

The slow path was broader than the selected workload: even fast generated a reference from an old Git worktree, then ran the full architecture/color/export oracle. Two animation suites repeated the five-viewport × two-motion matrix, with localized captions repeated across contexts. An independent geometry oracle also recompiled the same color kernel for every sampled pixel. Many old review scripts referred to removed engines, standalone output modules or completed photographic experiments.

Removed:

- Automatic historical reference worktree/cache and capture driver. Expected production values are now read-only Node 22/24 fixtures; all 2,241 exact full cases remain. Fast uses 166 representative cases covering both engines and every profile/strength/edit combination.
- Tests for the isolated C/D presentation and scene-distribution experiments, their shader-install hooks and packaging/probe scripts. The scalar D factor/exposure reference needed by production tests moved to `tests/helpers/v2-tone-reference.mjs`.
- The test-only lab box-integration implementation and tests comparing its `rows`, `fastRows` and `area` variants. These algorithms no longer render application exports. Direct V2 scalar/fast checks remain; current geometry, processing order, packing, RGB16 and actual encoders are protected by the production sampler tests, frozen hashes and browser exports.
- The uncalled lab-only `compileLegacy` fast-preset comparison; current Standard is protected by its calibration/scalar-stage, frozen output, prepared export and GPU tests. Its unused production implementation is outside this test-only change.
- Real-file checks invoking `CE.analyze`, `legacy`, `reference`, `log39` or beta2; the dead standalone V2 benchmark/preview workflow checker; old capture/review/package utilities. Current external-source import/export/detector benchmarks remain manual.
- The duplicate `verify-preview.mjs` runner, old selector aliases and path-specific style publication scheme. There are three manually runnable levels and one registration/execution owner.
- The test that asserted a known aliasing limitation as expected behavior; area-filter correctness and independent export-sampling tests remain.
- Large PR #99 JSON reports from the current tree. [The summary](consolidation/README.md) links to the immutable original raw records and historical drivers at main `f78a031`; git history preserves them. No new cleanup JSON reports are committed.

Merged:

| Previous checks | Current owner and retained purpose |
| --- | --- |
| Smoke syntax/startup + architecture | `architecture`: actual manifest/boot graph, engine/default/worker dependencies, theme startup and feedback link |
| Static locale + locale behavior | `ui-i18n`: catalogue/templates and actual language/footer/cache scaffolding; retired engine-label assertions removed |
| Source lifecycle + maintenance lifecycle | `source-lifecycle`: worker/result disposal, no repaint of outgoing source, cancellation/replacement, positive thumbnail ownership and failed browser decode cleanup |
| Boundary cases + contour cases | `frame-detection`: separator/holder/light/missing boundaries, no ratio assumptions, rotated/perspective geometry, real RAF-derived annotation metrics and actual V2 analysis/consent integration |
| Build fingerprint + publication artifact + workflow | `test-infrastructure`: stale inputs, partial/failed/duplicate reports, registry membership, missing GPU/export checks, tampered bytes/commit, PR/stale-main/fast publication rejection |
| Separate mobile-order server/browser check | Existing `ui-stability` mobile contexts: histogram/control/calibration order, closed advanced settings and hidden engine control, plus existing hit-target/focus/scroll assertions |

`check-next` is now `flat-field`: duplicated RAW routing/normalization is owned by the dedicated import tests; spatial correction, source-detail and export checks remain. Coordinate-only frame drags count requested analyses instead of executing expensive source analysis at every step; actual reanalysis/invalidations are independently covered by frame-detection and real-source frame-review.

## Full versus extended

Full keeps the current product's numerical, precision, source-lifetime, actual encoder/worker and device interaction contracts. Expanded Cartesian products use the same test files under extended, not a second suite. Full has three representative motion layouts (wide desktop, tablet reduced motion, phone) and the all-language narrow-caption check. Extended retains all five layouts in both motion modes. Full checks extreme narrow/square/panorama rotated frames plus the distinct boundary/lighting/perspective cases; extended restores the complete aspect/angle grid.

All profile strengths remain in CPU and floating GPU checks. Full tests every profile through JPEG8, PNG8, PNG16 and TIFF16 at 100%, plus Gold at every strength and CPU fallback. Extended restores every profile/strength/encoder/fallback combination. Current D and custom-calibration GPU cases run in full; the broader versioned-recipe GPU matrix runs in extended. The 6 MP preview and source-loupe measurement is explicit extended work. Timing observations are not a shared-host loupe-speed assertion; bounded operation counts and exact final samples remain gates.

Node-side mathematical references and actual browser/worker/encoder checks are intentionally not merged into one level. They detect different failures. The still-active scalar Standard stage used recursively by Editing 2.0 remains explicitly tested; its internal `editVersion:1` selector is not a resurrected user mode. No numerical tolerance was widened and no expected image value was recalculated from candidate code. TIFF reference storage is lossless gzip: its decompressed SHA-256 remains `480c5cc78f48580bccda3d8853fd46f4cbcd69c1eb05d51aee65f18d0d5a9d67`.

## Before/after

| Metric | Before | After |
| --- | ---: | ---: |
| Executable test files (`tests/*.mjs`, excluding registry) | 107 | 95 |
| Full groups (Node + build + browser) | 101 (67 + 1 + 33) | 91 (59 + 1 + 31) |
| Fast / extended groups | 5 / no level | 7 / 92 |
| Handwritten test/tool lines | 5,621 | 4,575 |
| Fixtures + PR #99 evidence bytes | 7,917,229 | 4,517,810 |
| Helper/tool scripts | 61 | 35 |
| CI fast | No comparable separate job | Manual level added; not remotely timed |
| CI full build job / test step | 557 s / 536 s (run 43279927099) | 476 s / 462 s (run 43339488771) |

File/line accounting includes executable tests, `tests/helpers`, `tools/*.mjs/*.py` and the old runner; it excludes generated fixtures/reports and dependencies. Fixture/evidence accounting is `tests/fixtures` plus `docs/consolidation/measurements`; gzip bytes describe git storage, not runtime RAM. Counts are maintenance/size indicators, not correctness scores.

Comparable local timing uses Node 22.23.5, Linux x64, AMD EPYC 9V74, Chromium 156.0.8078.79/SwiftShader and the same locked dependencies. Runs are sequential in separate clean worktrees; no other test suite ran concurrently. The host is shared, and the OS file cache was not reset. "Cold" below means an empty application/test reference cache, not a rebooted machine. All wall time includes preflight work; the old runner's own timer omitted historical-reference preparation.

| Local wall time | Before | After |
| --- | ---: | ---: |
| Fast, no historical reference cache | 51.514 s (one run) | 0.902–1.161 s (three runs; reference cache removed) |
| Fast, warm historical reference cache | 24.748–24.944 s (two runs) | Same three new runs above; no reference-cache dependency |
| Full (one paired run per revision) | 638.733 s | 459.046 s |

The old full baseline passed 101/101; current full passed 91/91 locally and in CI. The paired local full observation is approximately 28% shorter; it is not an estimate of its distribution. Before is `f78a031`, measured after is `20fa93b`, with identical production code. CI timestamps come from the Actions jobs API: whole build-job execution and the npm test step are listed separately. Queue time is excluded. GitHub-hosted runner hardware is not guaranteed identical, so the 557→476 s CI pair is an observation, not a portable speed guarantee. The old runner's printed 511.57 s excluded preflight; it is not substituted for the actual 536 s test step. There was no comparable historical CI fast job, and no CI fast speedup is invented.

On `20fa93b`, fast passed 7/7 (three runs), full passed 91/91 in 459.046 s wall time, and extended passed 92/92 in 624.447 s wall time. The interrupted overnight extended run and exploratory failed runs are not counted. Final full/extended execution and final-head CI are linked in [PR #100](https://github.com/AxelTidehorn/negative-studio/pull/100). Documentation-only commits following the measured revision do not change the test or application implementation.

## Verification and limits

Run `npm run test:fast`, `npm run test:full` and `npm run test:extended`; the exact tests are enumerated in `tests/suites.mjs`. Unknown levels/selectors fail. Registry checks reject missing files, duplicates and unregistered ordinary tests; external-original checks are explicitly listed as manual. Publication rejects fast/partial/failed reports and any post-test artifact mutation. There is one build owner and one shared browser/server for ordinary browser suites; fault/server-lifecycle tests retain their isolated servers.

Final execution results are linked from [PR #100](https://github.com/AxelTidehorn/negative-studio/pull/100). Node 24 also passed all 2,241 numeric cases and 27 fresh analyses / 1,053 exact samples. One-off output fault probes using the existing numeric test rejected both a changed float sample and a one-bit RGB16 error; they introduce no additional committed framework or reports. Node 22 and Node 24 frozen numeric values are separate because their transcendental functions can differ in the final Float64 bit. Other Node majors need review instead of auto-capture. Physical iPad Safari/Windows Edge are not implied by automated Linux browser tests. Existing iPad touch protections and production behavior are untouched.

The former CSS-only short publication path is deliberately removed; CSS-only PRs now run full rather than the old five-group style check. This is a known CI tradeoff for one uniform full/extended artifact contract. Fast remains suitable for short local feedback and explicit manual CI, but cannot publish an application.
