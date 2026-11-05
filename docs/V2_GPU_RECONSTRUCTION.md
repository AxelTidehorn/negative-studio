# V2 GPU reconstruction, stage 2

Based on main `2367a55` (merged #63), including #61 cleanup and #62 Vibrance.
[Stage 1](V2_GPU_PREVIEW.md) is the historical CPU-reconstruction/GPU-editing
reference. This change executes V2's existing reconstruction on GPU. No new
converter, photographic preset, project schema or export implementation.

## Execution and precision

The ordinary importer/decoder and CPU analysis still produce the same locked
linear Rec.2020 source, base, calibration and frozen rendering intent. The normal
preview uses the existing bounded, point-sampled negative (longest edge <=1400).
It does **not upload the complete full-resolution RAW** for display.

The existing WebGL2 renderer owns two programs and a single cached positive:

1. A lazily compiled reconstruction shader reads `RGB32F` negative data and writes
   an `RGBA32F` framebuffer. It ports `NSConversionV2` / `NSV2Fast` / `NSV2Render`:
   base normalization, log density/floor, density matrix and response, positive
   matrix/offset, frozen color balance, exposure/photographic tone and output map.
2. The existing color shader reads that texture and applies the same creative
   profile, print and **shared `NSEditing2.glsl`**, including Vibrance. Geometry,
   crop, rotation, zoom/pan, comparison and final RGB8 presentation stay unchanged.

The cached positive is **transfer-encoded sRGB in Float32**, exactly the domain
of the CPU positive cache, before creative profiles and Editing 2. No RGB8
intermediate precedes editing. Typed float uploads use no browser color-space
conversion; the final drawing buffer remains sRGB. Texture row zero has the same
logical source-row meaning as CPU uploads.

Calibration versions 2/3 and rendering algorithms 1/2/3 are supported, including
Neutral, Photographic 1/2, legacy output mapping, luminance-gamut-2 and
photographic-finish-1. CPU recipe constants generate the GLSL constants/uniforms;
no photographic parameters were retuned. `src/conversion-v2/gpu.js` only packs
uniforms and defines math for this renderer; it owns no images or project state.

CPU math remains Float64. GPU math/targets are Float32. Base hi/lo components and
a stable log1p series near T=1 preserve thin-negative differences that ordinary
`log(J)-log(B)` can lose in float. A small-argument expm1 polynomial replaces
cancellation-prone `exp(x)-1`; its truncation error is below Float32 precision
in the selected interval. These are numerical implementations of the same model.
Transmission >1, signed/nonfinite source handling, density floors and the existing
log-positive bounds follow CPU behavior.

## Cache, histogram and fallback

Raw upload validity includes source object, source/preview revision, dimensions,
domain/normalization/flat-field and the source descriptor/decoder recipe. The
positive additionally uses the complete existing `v2PreviewKey`: base RGB/domain,
calibration and all applied automatic rendering parameters. Exact serialized
values decide reuse; a short hash is only a diagnostic label.

Manual tone/color edits, Vibrance, profiles, print and creative geometry reuse the
positive texture. Base/calibration/source/automatic-recipe changes rebuild it.
Existing animation-frame scheduling coalesces pending edits. Source switching
cancels scheduled jobs, stops the old histogram worker and releases old textures.
GPU commands are ordered in one context; CPU preview workers are stopped/gated
when GPU takes ownership. No asynchronous reconstruction worker can paint a late
image over the current GPU result.

The histogram keeps its existing CPU kernel, but receives **at most a 160px point
negative**, not the full preview. It caches its small positive across manual edits.
Those point coordinates and Float32 values reproduce the existing CPU histogram.
There is no full-size CPU positive/cache transfer in the normal GPU path and no
per-edit readback. Idle fallback without a histogram worker retains a 100px source.

GPU requires highp >=23 bits and `EXT_color_buffer_float` with a complete RGBA32F
framebuffer. Allocation, shader, context, validation and source-domain errors use
the authoritative CPU renderer. Recipes needing unsupported float ranges also
stay CPU: epsilon below 1e-30, slope below 1e-12, base-zero reference density below
1e-12, or nonfinite Float32 uniforms. Saved recipes themselves are unchanged.
This conservative envelope avoids shader subnormal/underflow assumptions.

Small startup/recipe validation checks both final RGB8 (unchanged tolerance
**2/255**) and encoded-positive float error <=1e-4. A QA-only scratch framebuffer
also checks **linear Rec.2020 positive before balance/tone/gamut**, with relative
error <=1e-3. This prevents tone compression or RGB8 quantization from hiding a
reconstruction error. Scratch targets preserve the real cache. No validation
readback repeats for a pure manual edit. These sample guards are not a proof for
all future calibrations/drivers; physical-device verification remains necessary.

Context/backend changes rebuild the GPU cache. CPU fallback computes its own
positive without downloading GPU pixels. JPEG/TIFF keep the existing full-source
CPU path, precision and ICC handling. Project and conversion algorithm versions
are unchanged; backend selection is not saved as a different photographic recipe.

## Image and regression results

[Numeric measurements](v2-gpu-reconstruction/parity.json) cover 175 combinations:
old/current algorithms and output recipes, a nonidentity calibration with distinct
channel responses and another base, neutral/strong edits, positive/negative
Vibrance, color/monochrome profiles and print. Inputs include zero, negative,
NaN/Infinity, low transmission, headroom and near-base values.

- Final RGB8: maximum **1 level**, median/P99 **0**; no pixels above 1 or 2 levels.
- Encoded Float32 positive before editing: max **4.016e-6**, P99 **5.960e-7**.
- Linear HDR positive before balance/tone/gamut: max relative **8.345e-6**
  (0.000835%), median **1.883e-7**, P99 **9.187e-7**.
- Seven technical recipes cause seven reconstructions, **one raw upload**, and
  zero CPU-positive uploads across all profile/edit combinations. Positive/negative
  downsampling and explicit pixel-revision invalidation pass.
- [Existing RAF point overviews](v2-gpu-reconstruction/raf-parity.json), 04 portrait,
  09 snow and 10 outdoor couple, also max **1 RGB8 level**. Largest float difference
  is 1.118e-6. Frozen base/calibration/exposure/color are retained; current Photo 2
  and photographic-finish-1 apply identically to CPU and GPU. No new full photographic RAF series
  or subjective photographic-quality claim (one full RAF was used for timing). No private photos/pixels are committed.

Actual GPU preview is compared to decoded RGB16 TIFF at native size with identical
recipe/geometric settings (**0 display levels** in the native DNG fixture), plus backend-independent identical
TIFF bytes and decodable JPEG. Existing 120 frozen RGB8/RGB16 export cases remain
authoritative. Functional tests cover rapid edits, base accept/undo, source/motor/
queue changes, profiles, geometry, projects, context recovery and CPU fallback for
missing WebGL/float target, allocation/shader/precision errors and failed parity.

## Measurements and limitations

The extended existing `tools/benchmark-v2-preview.mjs` uses real import, analysis,
worker/GPU preview and geometry owners. First-image records distinguish import,
CPU analysis/source sampling, upload API submission, GPU reconstruction submission
and presentation. Owner/analysis timings are nested: **do not sum overlapping
columns**. Synthetic import includes source generation/delivery, not RAF decoding
(`decodeMs=0`); an optional `--raf` records actual decoder time.

GPU API submission is **not measured GPU execution time**. Separate asynchronous
timer queries are used where supported; SwiftShader returns `null` here.
Input→geometry submission→next animation frame is a paint-opportunity proxy,
not physical display latency. Detail waits for the actual full-size result,
not an earlier CPU interactive frame. Existing interactive CPU/GPU resolutions
differ and are reported separately.

Measured on Linux Chromium 155 / SwiftShader (two available EPYC CPUs),
1024×768 viewport. Three fresh runs/backend and twelve edits/run: 36 timings per
row. Detail uses the same native-or-1400px output on both backends; interactive
retains CPU 240px and GPU initially 700px.

| Input → preview | Quality | Backend | Edit median / P90 (ms) | Edit range (ms) | Cold V2 switch median (ms) |
| --- | --- | --- | ---: | --- | ---: |
| 700×500 → 700×500 | detail | CPU | 264.2 / 282.3 | 196.7–299.4 | 515.2 |
| 700×500 → 700×500 | detail | GPU | 262.1 / 287.9 | 220.4–341.6 | 559.0 |
| 1400×1000 → 1400×1000 | detail | CPU | 888.8 / 922.3 | 680.3–974.6 | 1538.8 |
| 1400×1000 → 1400×1000 | detail | GPU | 960.7 / 997.1 | 904.6–1009.9 | 1514.1 |
| 1400×1000 → 1400×1000 | interactive | CPU | 81.7 / 91.8 | 81.2–98.0 | 1507.2 |
| 1400×1000 → 1400×1000 | interactive | GPU | 342.8 / 365.7 | 236.0–1268.3 | 1580.3 |
| 6032×4032 → 1400×936 | detail | CPU | 830.7 / 865.5 | 651.1–870.6 | 1325.6 |
| 6032×4032 → 1400×936 | detail | GPU | 915.7 / 997.9 | 871.7–1026.6 | 1501.7 |
| RAF 6032×4032 → 1400×936 | detail | CPU | 788.2 / 806.7 | 573.8–821.9 | 17949.1 |
| RAF 6032×4032 → 1400×936 | detail | GPU | 907.4 / 953.3 | 861.9–973.8 | 17987.5 |

[All timing samples, components and memory estimates](v2-gpu-reconstruction/measurements.json).
Every manual series has **0 primary reconstructions, 0 raw/positive uploads,
0 validation uploads and 0 histogram reconstructions**. GPU timer queries are
unavailable (`null`) in this environment. No hardware-GPU execution-time claim.

The unified-program candidate measured 1139.8 ms warm / 2904.1 ms cold;
separate programs measured 960.7 / 1514.1 ms.
That is an observed software-renderer improvement, not evidence of iPad speed.
CPU remains faster for the measured larger steady-state previews. No overall
hardware speedup is claimed.

Six warmed queue switches/backend (two 64×48 DNG fixtures): CPU 182.3 ms (179.8–198.9), GPU 115.9 ms (106.6–128.7).
Each GPU switch uploads/reconstructs once; a single-image GPU cache is retained,
not a full-roll decoded-image cache. This does not measure large-RAF switching.

At 1400×1000, retained GPU textures are **39.2 MB logical** (up to 44.8 MB if
source RGB is padded to RGBA), plus ~0.44 MB histogram source/positive. Measured
unique main source/display ArrayBuffers total **44.8 MB**. At 6032×4032 the existing
full source dominates: **319.66 MB** main ArrayBuffers, plus 36.69 MB logical GPU
textures for the 1400×936 preview. A tracked-component replacement
budget allows current-source RGBA padding plus one old GPU allocation (up to 41.93 MB) and ~15.72 MB presentation
RGBA buffers, giving roughly **419.7 MB for that subset**, before browser/decoder/
driver heaps. This is not a measured physical peak or an iPad memory guarantee.


For 1400×1000 detail, separately recorded component medians (ms):

| Component | CPU path | GPU path |
| --- | ---: | ---: |
| Known-domain generation/import into initial Standard view | 342.3 | 1703.6 |
| CPU V2 luminance/color analysis | 60.1 | 49.6 |
| CPU bounded source sampling | 95.1 | 100.3 |
| CPU negative reconstruction (worker) | 440.7 | — |
| GPU source upload **API submission** | — | 0.9 |
| GPU reconstruction setup/**API submission** (includes upload) | — | 14.0 |
| GPU reconstruction execution timer | — | unavailable |

CPU reconstruction and GPU submission are different quantities and **not a
compute-speed ratio**. Full cold-switch times above include shader validation,
scheduling, actual rendering waits and presentation. Synthetic import measures
neither disk RAF throughput nor LibRaw decoding.


A full **private portrait RAF, 6032×4032**, was also run through ordinary import
and V2 selection, three times/backend with twelve edits each. The same file,
automatic base/analysis and applied recipe were used on both paths; the tool
asserts recipe equality. No original/EXIF/private filename is included.

| RAF component median | CPU path | GPU path |
| --- | ---: | ---: |
| Initial Standard import, including its decode (s) | 14.31 | 15.56 |
| Locked V2 RAW re-decode (s) | 16.53 | 16.41 |
| V2 selection → presentation opportunity (s) | 17.95 | 17.99 |

The existing decoder dominates the first switch (~16.4–16.5 s); GPU reconstruction
does not remove that required domain re-decode. Initial import precedes that
switch, so opening the file and then selecting V2 costs both stages. Warm CPU
edits measure 788.2 ms versus GPU 907.4 ms here. This is another **software-GPU
result**, not an iPad speed claim. Every manual cache delta is zero on this RAF too.

Memory reports measure unique main-thread source ArrayBuffer byte lengths and
estimate worker/texture costs. For N preview pixels the new GPU caches use raw
12N bytes (possibly 16N driver storage) plus positive 16N bytes and about 0.44 MB
for the bounded histogram source/positive. No full-size CPU positive is retained.
Old GPU storage can temporarily overlap replacement. Presentation, browser/decoder
heaps, driver overhead and physical peak memory are not directly measured; the
report labels estimates rather than presenting them as process RAM/VRAM readings.

The initial candidate used one combined fragment program for both passes. The
selected implementation keeps reconstruction and the existing color shader in
separate programs in the same renderer/context. This preserves Standard's color
shader and avoids carrying reconstruction code in every editing draw, with no
additional pass or changed math. Both candidates pass the same pixel thresholds.
The measured candidate comparison is included in the results.

Reproduce (three fresh runs/backend, twelve edits each):

```sh
npm run build
node tools/benchmark-v2-preview.mjs --detail --width 700 --height 500 --repeats 3
node tools/benchmark-v2-preview.mjs --detail --width 1400 --height 1000 --repeats 3
node tools/benchmark-v2-preview.mjs --width 1400 --height 1000 --repeats 3
node tools/benchmark-v2-preview.mjs --detail --width 6032 --height 4032 --repeats 3 --switches 3
node tools/benchmark-v2-preview.mjs --raf /local/portrait.RAF --detail --repeats 3
FILMLABB_V2_GPU_REFERENCES=/local/existing-overviews node tests/v2-gpu-browser.mjs
npm run test:full
npm run build
```

The optional overview directory uses the existing `04/09/10_source.json` and
`*_overview.f32` files. It is not a new decoder or evaluation package. Large-input
benchmarks still process the bounded preview, **not 24MP GPU export**. The queue
fixture is explicitly identified as 64×48 synthetic DNG, not large-RAF performance.

Manual check: import a RAF in ordinary FILMLABB, select V2 and inspect
`FILMLABB_GPU.snapshot().reconstructionBackend === 'gpu'`. Drag exposure/color/
Vibrance: `positiveReconstructions`, `sourceUploads`, `positiveUploads` and
`validationUploads` should stay fixed. Base acceptance/undo should rebuild the
positive without a raw upload. Check geometry, queue/project restore and export.
`positiveUploads` is zero normally; `histogramReconstructions` is a separate small
CPU cache counter. `gpuReconstructionSubmitMs` is CPU submission, while nullable
`gpuReconstructionMs` is the asynchronous GPU timer result.

Existing central first-parent beta/version/SHA footer, build manifest and offline
cache include the new shader helper. No manual app or project version bump.
Physical iPad Safari, Windows Edge and hardware-GPU speed/memory are **not tested**.
No new photographic color/tonal claims follow from backend equivalence.
