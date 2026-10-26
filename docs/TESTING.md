# Testing FILMLABB

Use Node 22 (CI), `npm ci` and a Chromium installation (`npx playwright install
chromium`, or `FILMLABB_CHROMIUM_BIN=/path/to/chromium`). Build and serve `site/`,
not the source root. Node 24.19 was used for the recorded local measurements.

## Development levels

| Command | Purpose |
| --- | --- |
| `npm run test:fast` | Small numeric/reference/UI-contract tests, no build/browser. Run after local changes. |
| `npm run test:integration` | New-engine application, calibration/projects, all-engine export and CPU/GPU browser integration, verified production build. Run at a coherent integration boundary. |
| `npm run test:full` | All registered Node groups, clean-build/cache test, all browser suites. Run before delivery and in CI. |
| `npm run test:benchmark` | Explicit timing driver only; not implicitly included in the other levels. |

Fast and Integration accept `-- --engine curve3` (also `density3`, `matrix3`,
`log39`, `calibrated4`). Tiny shared numerical invariants still cover all models;
the browser flow focuses on the requested engine. For a particular module:

```sh
node tests/conversion3-numeric.mjs
node tests/conversion3-neutral.mjs
npm test -- --group color
npm test -- --group projects
```

Existing `npm test`/legacy selectors, TIFF, workflow, GPU and browser commands remain.
`npm test` is the historical sequential Node entry point; use Full for the optimized
complete run. `npm run test:browser` uses the shared browser runner. Existing
performance *assertions* remain ordinary regression tests; explicit multi-sample
timing/benchmark programs are not automatically run by any regression level.

## Build and process reuse

`tools/build-artifact.mjs` hashes source **contents and paths**, manifest/build
inputs, decoder distribution and optional legal assets. It also verifies the
entire built output. Unchanged inputs/output reuse the built app; missing,
modified or same-size/same-timestamp source changes invalidate the stamp. A build
whose inputs change while running is rejected. `npm run build` always forces a
production build. Stamps/logs live in ignored `.cache/`, never in source control.

Full runs independent Node files in a bounded two-process pool. Each file retains
its own process/VM fixtures. The shared app harness uses host built-in math/JSON
primitives; frozen calibration/pixel references check the same results. No
assertion/reference image was removed to improve timing.

Browser suites share one Chromium process and one ordinary static server, with
separate test connections/pages/contexts and sequential suites. Fault-injection
and service-worker tests retain their special isolated servers. Existing standalone
test files still launch and close their own resources. The common runner owns
process/server cleanup. Full includes the deliberate clean-build/cache test; its
multiple builds verify invalidation and are not redundant integration rebuilds.

The GitHub build workflow calls Full once and uploads that verified `site/`.
The GitHub Pages workflow remains compatible with the same build command.

## Reports and timing

Each run writes `.cache/test-{fast,integration,full,browser}.json`, with per-file
elapsed time/status and a log per child file. Failure in Node stops before the
browser phase; inspect the targeted log and fix it before repeating Full.

The frozen baseline is main `5580f93`: 40 Node and 13 browser groups all passed.
The old sequential commands took **271.00s Node + 267.11s browser**, plus .09s
build, on this managed Linux host. Its slowest files were presentation sampling
76.76s, manual-frame analysis67.48s, UI/UX47.45s and workflow41.00s. Process startup,
repeated browser launch and serial CPU work added overhead. Final current timings
and individual files are linked from the Conversion 3.0 report. These are elapsed
runs, not statistical device benchmarks; load and software GPU scheduling vary.

No test was deleted for speed. Final Full adds six Node groups and one browser
suite. The new integration fixture is a small synthetic image with the same
worker/export/model paths; existing large regressions keep their original sizes.
The under10s Fast/under60s Integration goals are development targets, not hard CI
performance assertions.

## Explicit measurements and contacts

Run the **same current driver** against already installed frozen/candidate
checkouts, sequentially without concurrent test jobs:

```sh
node tools/benchmark-conversion3.mjs /path/to/frozen /tmp/baseline.json 7
node tools/benchmark-conversion3.mjs /path/to/candidate /tmp/candidate.json 7
npm run conversion:references -- /path/to/negative.tif /tmp/comparison.html 900
```

The benchmark records all warm samples, median/min/max, preparation/calibration,
CPU preview, synchronized GPU draws where supported, JPEG/TIFF, source/stripe
sizes and optional JS heap. First draw includes upload; warm GPU samples reuse it.
JS heap excludes native canvas, WASM and GPU allocations, so it is not peak app
memory. Chromium/SwiftShader is not an iPad GPU. Synthetic images cannot establish
photographic superiority; real-negative and physical-device review remains needed.

See [Conversion Engine 3.0](CONVERSION_3_EXPERIMENT.md),
[Editing 2.0](EDITING2.md) and [maintenance](MAINTENANCE.md) for scope and limitations.
