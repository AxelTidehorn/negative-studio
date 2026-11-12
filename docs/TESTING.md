# Current verification

Use Node 22 (CI), `npm ci`, then `npm run test:full`. The runner tests tracked Node groups, the build and tracked Chromium browser groups, then seals the exact built bytes. PR CI never deploys; only separately merged main is eligible for the existing publication workflow. Never rebuild or modify source/HEAD during a full run.

`npm run test:fast` is a focused architecture/numeric check; `test:integration` adds frame/import/UI interaction. `npm test -- --group color` and other groups run directly. `FILMLABB_CHROMIUM_BIN` selects an installed browser. WebKit-specific frame/touch tests additionally accept `FILMLABB_TEST_WEBKIT=1` with an installed Playwright WebKit runtime. Automated Linux WebKit is not physical iPad Safari.

The consolidation oracle covers 2,241 exact Float64 color/Uint16 export cases from immutable main `42a9d33dd91a3c93cf736e693a86390bef80c61b` across all current profiles, strengths, engines and direct/rotated geometry. Node 24 hash evidence is checked in. Execution derives the same reference from that frozen checkout under the current JS runtime, then compares candidate and baseline bit for bit; Node 22/24 transcendental functions may differ in their final Float64 bit. This does not use candidate conversion code for expected values or relax tolerances. The full runner prepares/caches the frozen reference once, with no npm install in its temporary checkout. Fresh-analysis comparisons independently check current analysis against the frozen main configurations. Do not recapture the expected pixels merely to make a refactor pass. Tests for removed engines, old project migration and standalone lab UI have been retired; current equivalents protect the surviving product.

Performance evidence must name baseline/candidate, runtime/device, image dimensions, iterations and spread, and distinguish bounded data/Node kernels from actual full RAW/browser imports. Run before/after workloads sequentially on idle test machinery. `tools/benchmark-consolidation.mjs CHECKOUT OUTPUT` measures active-engine analysis and direct/fine-rotation pixel production without codecs; `tools/check-frame-review-real.mjs` uses external originals. See [the report](consolidation/README.md).

## Documentation in review

A PR changing user behavior, defaults, architecture or features updates relevant documentation in the same PR. Review records which pages were updated or why none applies. Trivial internal changes need no unrelated documentation edit. README must describe the actual defaults, including V2 for compatible new RAW.
