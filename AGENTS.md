# AGENTS.md — FILMLABB

Practical notes for anyone (human or AI) changing this repository. Read the code before trusting any doc: many files under `docs/` are archival reports of past commits. The current sources of truth are `README.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md` and the code itself.

## What this is

A static, offline-capable browser app that converts photographed film negatives locally. No backend, no bundler, no framework. Runtime dependency: `libraw-wasm` (RAW decode in a worker; `vendor/libraw` is a fallback copy). Dev dependency: Playwright.

## Architecture in one screen

- **Classic scripts, shared globals.** `index.html` loads ~70 plain `<script>` files in a fixed order. Each module is an IIFE that publishes a `globalThis.NS*` object (`NSEditing2`, `NSProfiles`, `NSV2Render`, `NSGeometry`, …). Top-level `let` bindings in `src/app/bootstrap.js` (`state`, `src`, `hires`, `render`, …) are shared session state used by later scripts.
- **`app-manifest.mjs` owns load order and public filenames.** Adding, renaming or moving a script means updating `assets`, `scripts` and the matching `<script>` tag in `index.html` (the build and `tests/architecture.mjs` fail if they differ). Workers (`preview-worker`, `export-worker`, `sw`) list their dependencies via `importScripts`.
- **Build:** `npm run build` → `tools/build-artifact.mjs` → `build-root.mjs` copies sources to `site/`, stamps `build-info`, and fingerprints the offline cache. Always serve `site/`, never the repo root.

Image pipeline (one active image, up to five in the queue):

1. **Import** `src/import/` — RAW via LibRaw worker (protected sRGB or linear Rec.2020 recipe), TIFF codec with ICC/encoding handling, browser images. Job ownership/cancellation lives in `source-controller.js` + `import-lifecycle.js`. The RAF embedded-JPEG preview is display-only and must never feed analysis or export.
2. **Frame + film base** `src/calibration/` — `frame-detector.js` proposes a quad; `settings.frame` is the single authoritative frame state (pending/automatic/confirmed, locked). Pending proposals must not authorize V2 scene analysis. Film-base references are separate from subject pixels.
3. **Conversion — exactly two engines** selected in `src/app/settings.js` / `engine-controller.js`:
   - **V2/D** (`'v2'`, default for compatible RAW): `src/conversion-v2/` — density reconstruction, base normalization, scene exposure/balance, approved "D" tone model. `fast.js` is the compiled per-pixel kernel, `gpu.js` its GLSL twin.
   - **Standard** (`'calibrated4'`): log-transmission calibration in `src/calibration/color-*.js` + `src/color/render-core.js`.
4. **Profile ("look")** `src/editing/profile-engine.js` + generated `profile-catalog.js` — one OKLab/OKLCH display-referred operator applied to the engine's sRGB output.
5. **Editing 2.0** `src/editing/editing-engine.js` — user exposure/contrast/WB/saturation/vibrance, applied after the profile.
6. **Preview** `src/render/` — WebGL2 path (`gpu-renderer.js`, shaders built from each module's `glsl` string) with CPU/worker fallback (`preview-worker.js`, `preview-scheduler.js`).
7. **Geometry + export** `src/geometry/`, `src/export/` — composition crop/rotation on the queue entry (`frame.geometry`), frozen export config, bounded Float64 tile sampling, JPEG/PNG8/PNG16/TIFF16 encoders, batch ZIP.
8. **Projects** `src/app/project-controller.js` — `filmlabb-roll-4` only; stores settings, never image bytes. Old schemas are intentionally rejected.

`src/color/render-core.js` (`NSPixelKernel`) is the shared CPU pixel path for preview fallback and export.

## Constraints that matter

- **Exact numeric output is a contract.** Frozen hashes in `tests/fixtures/numeric/node22.json` / `node24.json`, TIFF/JPEG/PNG fixtures and Work-profile oracles pin the pixels. Never regenerate expected values to make a test pass. An intentional image change needs an explanation, evidence (before/after on real negatives), and an explicit fixture update in the same PR.
- **CPU and GPU must agree.** Every color stage exists twice: JavaScript (Float64 reference) and GLSL (`glsl` strings in the same module). Change both together; the GPU browser tests compare readbacks against the CPU reference.
- **Profiles are data.** Edit `docs/profile-system/film-profile-designs.json` / `creative-profile-designs.json`, then run `node tools/generate-profile-catalog.mjs` (`--check` verifies). Do not hand-edit `src/editing/profile-catalog.js`.
- **UI strings are translated by Swedish source text.** `src/ui/i18n-messages.js` holds rows `[sv, en, fr, es, de]`; `i18n.js` swaps DOM text by matching the Swedish string. Changing or adding Swedish copy requires updating/adding its row. `tests/ui-i18n.mjs` checks that rows are complete, not that every UI string has one, so a missed row silently stays Swedish.
- **Memory is the real limit.** Only the active image is fully decoded; buffers (`working`, `workingPreview`, GPU textures) are released on source change. Don't add full-resolution intermediate copies. Respect the existing cancellation/sequence guards when adding async work.
- **No new dependencies or build tooling** without a clear, discussed reason.

## Code style

- Match the surrounding dense style: `'use strict'` IIFEs, short names, compact one-line functions, comments only for the *why*. No TypeScript, no modules in browser code (Node tools/tests are ESM `.mjs`).
- Validate at trust boundaries (project files, imported metadata, settings) and throw short `UPPER_SNAKE` error codes, as existing code does.
- Hot pixel loops: scalar math, no per-pixel array/closure allocation (see `editing-engine.js` `compile().pixel` for the pattern).
- Keep the two-engine model. Don't add engines, compatibility migrations or "legacy" variants back.

## Testing and verification

```sh
npm ci
npm test                 # = test:fast, ~1 s: boot graph, controls, i18n, D tone, numeric hashes, import recovery
npm run test:full        # what CI runs on every PR: all Node tests + build + ~31 browser tests
npm run test:extended    # full + larger matrices; for engine/render/export/perf changes
node tests/<name>.mjs    # a single test (FILMLABB_TEST_LEVEL=extended for expanded cases)
```

- Browser tests need Chromium: set `FILMLABB_CHROMIUM_BIN` (in Claude Code cloud sessions: `/opt/pw-browsers/chromium`). Don't run `playwright install` there.
- Tests are registered in one place: `tests/suites.mjs`. A new test file that is not listed there does not run.
- Exact hashes are defined for Node 22 and 24 on Linux x64; other runtimes fail on purpose.
- Logs and per-test output go to `.cache/`. Don't edit sources or switch branches during a full run (the runner checks build inputs did not change).
- Performance claims need measurement: `npm run test:benchmark` and the `tools/benchmark-*.mjs` drivers; run before/after serially on the same machine. Small synthetic probes don't predict large-RAW behaviour.
- Physical iPad Safari / Windows Edge are not covered by CI; don't claim device fixes are verified without a real run.

## Working on this repo (AI-assisted or not)

- Start from the code: grep for the `NS*` owner of a behaviour before changing it, and check `tests/suites.mjs` for its tests.
- Keep PRs focused: one behaviour or one cleanup. Run `npm test` while iterating and `npm run test:full` before asking for review.
- Separate refactors from image changes. A refactor must keep all frozen hashes identical.
- When you change user-visible behaviour, defaults, architecture or features, update `README.md` / `docs/ARCHITECTURE.md` (or the relevant current doc) in the same PR. Don't add new report-style docs for routine work.
- Distinguish verified facts from assumptions in PR descriptions (what was measured, on which input, which browser).
- CI (`.github/workflows/build.yml`) runs full on PRs and main; only main deploys to GitHub Pages, from the sealed tested artifact.
