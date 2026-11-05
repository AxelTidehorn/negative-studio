# V2 GPU preview, stage 1

Based on `eb2e685` (main, merged #62 including Vibrance). This changes preview
ownership, not V2 reconstruction, photographic rendering, Editing 2.0 math,
project schemas or JPEG/TIFF processing. Original stays CPU; Standard retains its
existing GPU implementation. No new user setting or engine.

## Actual image chain

1. The existing V2 source/calibration owner prepares the locked linear Rec.2020
   preview and frozen recipe. RAW decoding and analysis remain unchanged.
2. The existing preview worker runs the existing `NSV2Fast` reconstruction and
   automatic V2 rendering once, at bounded preview resolution.
3. The **existing positive cache is Float32, transfer-encoded sRGB**, after V2's
   automatic tone/color/output mapping, before creative profiles/print/Editing 2.
   This representation is preserved; it is not converted to RGB8 or decoded a
   second time. Source negatives and this positive have distinct domains.
4. The existing WebGL2 renderer uploads that positive as `RGB32F`, nearest sampled.
   Its shared creative-profile/print functions and **`NSEditing2.glsl`** then apply
   manual edits, including Vibrance. Monochrome uses the same profile/order as CPU.
5. The existing 8-bit preview framebuffer and geometry presenter handle display,
   rotation, composition, zoom, pan and comparison. No extra editing pass.

A slider event schedules the existing adaptive interactive draw and later a
1400px detail draw. It changes uniforms, not the positive texture. Histogram
updates remain bounded, delayed CPU work in the same worker, using its retained
positive; there is no per-edit GPU readback. JPEG/TIFF still use the existing
full-source CPU export path and frozen recipe, not this preview texture.

## Cache contract and lifetime

`NSPixelKernel.v2PreviewKey()` includes source descriptor/decoder revision,
image revision/dimensions/domain/normalization/flat-field, measured base RGB and
domain, the complete calibration, and all applied automatic intent parameters
(algorithm, output mapping, photographic recipe, tone, exposure, color correction).
The cache also requires identical source-object ownership. Source controllers
stamp `previewRevision` from the existing `sourceVersion38` counter.

Manual edits, creative profiles, print styles and geometry are excluded. Metadata
only base/intent IDs do not change pixels. Analysis-area changes still use the
existing V2 analysis invalidation; a different resulting applied recipe rebuilds
the positive. If all applied values remain identical, its pixels can be reused.

The complete serialized key decides validity, not the short diagnostic hash.
At most one reconstruction runs at once; rapid technical changes coalesce into
the latest recipe after discarding the active outdated result. Pending worker
results must match request ID, full key, image object, source
version and currently selected V2 recipe. Image import/navigation terminates the
old worker and releases old textures. Rapid edits use the latest manual settings
when preparation completes. Positive and negative textures remain distinct.

The worker transfers one copy of its bounded Float32 cache and keeps the original
for the CPU histogram. The main cache shares the transferred buffer with the GPU
upload owner. No source/positive copies occur per slider event. CPU fallback can
seed its existing worker from that cache; context restoration can reuse it.
WebGL2 availability, highp precision, shader errors, upload failure, validation
failure and context loss preserve the existing CPU fallback. Unsupported historical
profile/edit combinations also stay on CPU.

## Precision and image verification

[Full synthetic measurements](v2-gpu-preview/parity.json) cover 150 combinations:
V2 algorithms 1/2/3, Neutral/Photographic 1/2, color/monochrome profiles, print,
strong tone/color edits and positive/negative Vibrance. Against the direct CPU
kernel (including reconstruction), maximum RGB8 difference is **1/255**, P99 is
zero, mean absolute difference is 0.0000329 display levels. Signed channel means
are each below 0.000014 levels. Existing tolerance is 2/255.

A dark/almost-neutral positive ramp measures 0 display-level maximum error with
Float32 input; deliberately quantizing that input to RGB8 first increases it to
2 levels under strong editing. RGB8 is only a QA control, never a cache format.
Negative preview matches CPU exactly in the tested full/downsampled cases,
including flat-field. Split view uses the ordinary two-source geometry presenter.

[Existing RAF overview measurements](v2-gpu-preview/raf-parity.json) reuse frozen
linear Rec.2020 point samples for 04 (portrait, 900×890), 09 (snow, 900×852), and
10 (outdoor couple, 900×896). Frozen base, calibration, automatic exposure and color correction are retained;
current Photographic 2 and photographic-finish-1 are applied identically on CPU
and GPU. Three manual settings per image: neutral, contrast/color/
Vibrance, and temperature/tint/shadow/highlight. All maximum differences are 1
level; none exceeds 1; maximum mean absolute difference is 0.0000798 levels.
These are pixel-equivalence checks, not a new photographic evaluation or a fresh
RAW decode. No private photographs, source pixels or paths are included here.

## Performance and memory

Reproduce using the ordinary importer, preview scheduler, real worker and
geometry presentation (no alternative benchmark renderer):

```sh
npm run build
node tools/benchmark-v2-preview.mjs --repeats 3 --edits 12 --output .cache/interactive.json
node tools/benchmark-v2-preview.mjs --detail --repeats 3 --edits 12 --output .cache/detail.json
# Optional private RAF through ordinary import; do not commit it:
node tools/benchmark-v2-preview.mjs --raf /local/reference.RAF --repeats 3
```

The default input is a varied 1400×1000 linear Rec.2020 negative. Each fresh
context switches to V2, then performs 12 actual exposure input events. The tool
checks identical applied recipes across backends/repetitions. Detail mode forces
1400px on both backends; ordinary interactive mode retains CPU 240px versus GPU
adaptive (initially 700px). Compare these separately.

Input-to-geometry-submission plus the next animation frame measures a browser
paint-opportunity proxy, **not physical scanout**. GPU timer-query results are
separate and may be unavailable; upload timing is CPU API submission time, not a
synchronous measurement of GPU completion. Cold switch includes UI dispatch and
source/recipe preparation; worker CPU reconstruction and bounded-copy times are
recorded separately. Preparation residual includes startup/queue/transfer.

Isolated Linux measurements: Chromium 155, SwiftShader software Vulkan,
2 available CPUs (AMD EPYC 9V45), Node 24.22.1, 1024×768 touch viewport.
Three fresh contexts per backend/quality, 12 edits each (36 timings per row).
Pooled medians and P90; range is minimum–maximum, milliseconds:

| Quality / backend | Median | P90 | Range | Per-run medians |
| --- | ---: | ---: | --- | --- |
| Interactive CPU (240px) | 81.6 | 82.0 | 76.1–98.4 | 81.7 / 81.6 / 81.7 |
| Interactive GPU (initially 700px) | 335.9 | 357.7 | 249.3–1270.6 | 334.2 / 339.8 / 338.8 |
| Detail CPU (1400px) | 893.3 | 913.8 | 677.7–934.6 | 901.0 / 891.7 / 898.5 |
| Detail GPU (1400px) | 1007.3 | 1062.5 | 939.5–1087.9 | 1012.6 / 1047.8 / 993.4 |

[Timing samples and component measurements](v2-gpu-preview/measurements.json)
include all 144 edit latency/submission samples, the applied recipes, cold-stage
measurements, cache counts and memory estimates. The tool also emits the full
diagnostic snapshots locally.
Detail waits for the submitted full-resolution result, including CPU's earlier
intermediate preview; it does not mistake that intermediate for the final image.
The interactive GPU outlier occurs with the ordinary idle/detail scheduling still
enabled; results include its cost rather than measuring only isolated shader calls.

Cold-switch median (interactive protocol): CPU **1396.5 ms** (1365.4–1407.3),
GPU **1803.9 ms** (1744.2–1807.1). CPU worker reconstruction: 419.4–423.8 ms;
GPU-path worker reconstruction: 419.1–436.7 ms. GPU preparation including startup/
queue/transfer: 441.6–485.5 ms, its bounded Float32 copy: 3.3–5.8 ms,
GPU upload API submission: 5.8–6.0 ms. Asynchronous GPU timer queries are unavailable
in these runs (`null`), so there is **no measured hardware GPU execution time**.

Every edit series reports **0 new reconstructions, 0 positive texture uploads,
0 validation uploads**. The retained positive texture is 16.8 MB logical; the
previous Standard negative texture is released when the bounded source changes.

**No speedup is demonstrated on this software renderer**: GPU is ~4.1× slower
under the different existing interactive resolutions and 12.8% slower at matched
detail. The implementation verifies GPU execution, reuse and pixel equivalence;
faster controls on a compatible physical GPU remain a hardware validation task.
It would be incorrect to extrapolate these numbers to iPad/Edge.

For N preview pixels, positive CPU caches cost 24N bytes (worker + main) and the
GPU positive texture logically 12N bytes, potentially 16N in driver storage.
At 1.4MP: **33.6 MB CPU + 16.8–22.4 MB GPU**. The existing raw preview main/worker
copies and geometry/framebuffers are additional. Negative/split adds a lazily
allocated raw texture (another 12–16N). No new full-resolution RAW copy. The cache
cap is 2MP; normal previews have longest edge <=1400. Reconstruction/replacement
can transiently retain old/new buffers and driver storage; these estimates are
not measured browser heap or peak device memory. Physical iPad memory pressure
remains to be checked.

Diagnostics: `FILMLABB_GPU.snapshot()` exposes backend/reason, positive requests,
actual worker reconstruction count, positive uploads, validation-only uploads,
preparation/reconstruction/copy/upload-submit times and logical cache/texture
bytes. `FILMLABB_GEOMETRY.snapshot()` exposes submitted source version, render ID,
config fingerprint and presentation timestamp. `FILMLABB_PERFORMANCE.snapshot()`
retains CPU render time and reports the worker's V2 cache counters/timing.
Runtime color QA uses temporary small textures once per V2 source/context;
sliders and profiles do not repeat it or read back pixels.

## Regression and release

- `npm run test:full`: **115/115 groups pass** (including existing CPU-specific
  oracles explicitly selecting CPU, plus the new GPU/cache coverage).
- Additional final V2 tests: actual FilmBas 2 accept/undo each rebuild once,
  negative/split/positive transitions, shader/precision/no-WebGL fallback.
- Existing 120 historical JPEG RGB8/TIFF RGB16 pixel references pass unchanged;
  actual decoded JPEG dimensions/signature and backend-independent identical TIFF
  bytes pass. Old/current projects, mixed queues, crop/rotation and cancellation
  remain covered by the existing main-platform browser suite.
- `npm run build` uses the existing first-parent beta version, dev commit SHA,
  manifest and content-hash offline cache. This PR adds no second version source.
  A merge receives the next unique beta automatically; an unmerged dev build is
  identified by its own SHA. Project and V2 algorithm versions are unchanged.

Manual check on compatible hardware: open ordinary FILMLABB, import RAW, select
V2 and inspect `FILMLABB_GPU.snapshot().backend === 'gpu'`. Drag exposure/color/
Vibrance and check that `positiveReconstructions` and `positiveUploads` stay fixed.
Change base, then undo: each applied recipe should rebuild. Check split/negative,
geometry, queue navigation, projects, and CPU/GPU diagnostic switching.

Physical iPad Safari and Windows Edge are **not tested** here. Linux Chromium
uses software SwiftShader; it verifies WebGL execution/parity/fallback but cannot
establish faster controls on a hardware GPU. Unsupported WebGL precision/texture
allocation takes the CPU path. Shader/backend and bounded-cache memory remain
hardware validation risks for stage 2; full negative reconstruction on GPU is
outside this stage.
