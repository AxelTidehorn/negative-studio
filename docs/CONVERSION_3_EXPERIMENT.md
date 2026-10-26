# Conversion Engine 3.0 experiments

This update adds three independently selectable conversion hypotheses to the two
existing references. It starts from main `5580f93` (UI/UX #28), after Editing 2.0
#27, maintenance #25 and refactoring #24. The separate licensing PR #26 is not
part of this work. Conversion 3.0 is an experiment generation, not a claim of a
new stable FILMLABB release or photographic superiority.

## Five choices

| UI name | Identifier / algorithm version | Technical principle |
| --- | --- | --- |
| Original | `log39`, existing version 39 | Unchanged comparison calibration and bounded channel-density conversion. |
| Standard | `calibrated4`, existing response versions | Unchanged calibrated conversion and existing color/tone experiments. |
| Curve | `curve3` / 1 | Comparison-density references followed by bounded monotone channel responses. |
| Density | `density3` / 1 | Signed, unbounded normalized density followed by shared tone/chroma presentation. |
| Matrix | `matrix3` / 1 | Bounded comparison positive followed by a conservative regularized chroma transform. |

The selector is directly accessible with the image adjustments. New images retain
Standard as their conversion default; no experimental winner is selected.
Switching preserves source, film frame, edits, creative profile and presentation
geometry. Standard-only response/experiment controls are hidden for other engines.
Automatic analysis is sufficient; measured base/light/neutral references remain
optional. There are no new technical control panels.

Editing 2.0 is now the default for **new** images. Its formulas are unchanged.
Saved editing versions remain individual and independent of conversion. The old
editing implementation and its internal binding remain for restored projects;
the ordinary A/B editing selector is hidden. Missing versions in older projects
and saved sessions mean editing version 1, including after resetting their edits.

## Actual pipeline and ownership

Decoded source RGB → shared/Original technical analysis → engine-specific
conversion → existing positive/profile/print adapter → selected editing version
→ presentation sampling → output quantization.

`src/color/conversion3.js` owns analysis-independent math, model validation,
compiled operators and corresponding GLSL. `src/calibration/conversion3-controller.js`
prepares/caches the model after the existing analysis passes. Configuration and
technical source-channel tables feed the existing CPU kernel, workers, detail
view and export; the GPU uses the same coefficients in its existing color pass.
No new full-size intermediate, source copy or GPU pass is introduced.

New models reuse Original's per-channel density offsets/spans, not Standard's
response parameters. A model cache key includes source revision, analysis frame,
reference calibration, base/light, base-removal flag, analysis domain and working
space. Ordinary edits and presentation changes do not analyze the negative.
Switching engines can rerun existing technical analysis; the small new model is
reused when its key is unchanged. No inactive full-size image cache is added.

### Common density coordinate

For automatic conversion, `u[k] = (-log10(max(1/65535, source[k])) - lo[k]) / span[k]`.
The shared comparison references absorb constant base/light offsets, matching
Original's automatic normalization. Unlike Original's final technical clamp, the
new technical lookup retains signed values and values above one. With automatic
levels disabled, density is computed after the existing measured base/light
correction. Source-coordinate flat-field correction remains upstream and unchanged.

Standard and the new engines honor source-domain analysis when the saved setting
requests it. Original retains its existing preview-domain analysis behavior.
The contact-sheet metadata records these actual domains; they are not silently
forced to a different calibration algorithm.

### Curve: bounded PCHIP prior

Each independently normalized channel uses a C1, shape-preserving cubic Hermite
curve. Coefficients are prepared once; per-pixel evaluation is interval selection
and a cubic polynomial. Automatic knots are:

- input: `[-.25, 0, .18, .5, .82, 1, 1.5, 2]`;
- output prior: `[0, .01, .18, .5, .77, .9, .98, 1]`.

The prior keeps the .5 anchor and rolls off instead of clipping at density 1.
Confidence blends its anchors toward Original's clamped identity using measured
span, clipping/dark fractions and sample count. Weak data or fewer than 32
reference samples use exact clamped identity. Supported curves are monotone,
C1 and derivative-bounded to 1.7. An explicit internal identity probe reproduces
Original's technical positive exactly.

Automatic channels share this cautious shape while retaining individual technical
references. This is **not** a uniquely estimated film characteristic curve.
There is no new manual spline editor. Available image statistics cannot identify
three independent physical response curves; inventing them would add unsupported
color changes. The nonzero prior is a documented hypothesis to evaluate on film.

### Density: signed density and common presentation

Let `Y = dot(weights, u)`. A common monotone function is:

- below 0: `.01 * exp(98 * Y)`;
- from 0 to .8: `.01 + .98 * Y`;
- above .8: `1 - .206 * exp(-(.98/.206) * (Y-.8))`.

Value and first derivative agree at the joins. The .5 pivot is unchanged; tails
approach black/white without an early channel clamp. Chroma `u-Y` is scaled by the
smaller of the local tone derivative and available RGB-cube headroom, then added
to the mapped Y. This avoids division by near-zero luminance, preserves the
neutral axis and bounds chroma amplification. sRGB/Rec.2020 use their respective
luminance weights before the existing display-space conversion.

This is a global density-coordinate presentation, not Standard's calibrated
channel response/shoulder and not a spatial artifact mask. The small black floor
and shared chroma compression can reduce deep-black/color separation. Retained
out-of-range coordinates are not proof of recoverable scene detail.

### Matrix: a bounded statistical prior, not spectral identification

Usable samples exclude floor/clipped source channels. Up to 12,000 samples form
`[R-G, B-G]` in normalized density. The covariance estimate winsorizes these
statistics at the 5th/95th percentiles and adds a ridge of half its trace. Eigen
whitening gains are limited to [.96, 1.04]. No measured scene mean is forced gray.
The reconstructed RGB matrix preserves the neutral axis and weighted luminance;
its deviation from identity has Frobenius norm at most .075. Thus its spectral
noise gain is bounded by 1.075 and its condition by 1.1622 before output mapping.
These are bounds on the matrix operator, not on source-to-output noise: the
upstream logarithm can still amplify small low-transmission source variations.

Fewer than 128 usable samples, negligible signal or isotropic covariance use
identity, with that limitation shown in the status. Mixed synthetic scenes give
a reproducible nonidentity transform. Scene color dominance still influences the
prior: an arbitrary photograph does not identify film-dye overlap or a unique
camera correction. A small transform is a controlled experiment, not a recovered
physical model. Matrix starts from Original's bounded positive, so it retains
Original's early range limitation. A radial gamut projection preserves luminance
when the transformed color reaches an RGB boundary.

## CPU, GPU and all output paths

All five use the shared CPU kernel. The new three also have WebGL 2 implementations
checked against CPU. Original keeps its pre-existing CPU fallback; supported
Standard GPU configurations remain unchanged. GPU precision/context-loss fallback
is retained. New engine/model changes invalidate the small validation probe,
including in original detail; ordinary edits still reuse the source texture.

The same compiled configuration reaches CPU-preview worker, 100%/200% original
detail, TIFF 16-bit, native JPEG worker, main-thread JPEG reserve and legacy export
entry points. Coupled Density/Matrix and Editing 2.0 bypass separable complete RGB
lookups, while exact source-channel technical tables are reused. Presentation
still interpolates **processed** neighbors in linear display light. Geometry,
quantization, file formats, stripes/byte budgets, batches, ZIP, progress,
cancellation and the five-image queue are unchanged.

New engines also support the existing experimental Rec.2020 RAW working space.
**Original's existing restriction against that import mode is preserved.** Use
default/protected sRGB import to compare all five on the same decoded source.
The denial now restores the actual selected engine rather than falsely displaying
Standard. No RAW decoder/import formulas were changed.

The positive adapter retains existing technical black/white, profile and print
limits before Editing 2.0. It is SDR display-positive processing, not HDR scene
reconstruction. New density tails cannot restore information already clipped by
capture, import, the adapter or a profile. No new denoising, generic highlight
desaturation or blue/violet suppression is included.

## Projects and compatibility

New identifiers have `settings.conversionVersion: 1`, independent of
`settings.editVersion`, creative profile versions and geometry version 1.
Projects containing any new engine use `negative-studio-roll-conversion3` with
`conversionSchemaVersion: 1`. Older builds reject this unknown file tag instead
of silently rendering an unsupported engine. All engine/version checks happen
before project mutation, alongside existing geometry/editing validation.

Original/Standard-only projects retain their existing geometry/Edit2 tags.
Earlier supported migrations, RAW choices, calibration, color experiments,
profiles, geometry and mixed editing versions remain. Missing editing version
means 1; no old project is automatically upgraded. Derived new-engine models are
rebuilt from source and technical references, not serialized as image buffers.

A genuine integration bug was reproduced in the neutral pipette: Original with
Editing 2.0 used an encoded positive as linear when deriving creative balance.
The integration now decodes that positive, as required by Editing 2.0. Original
editing version 1 and technical calibration remain unchanged. This fixes a
new balance action; it does not rewrite saved settings or either legacy engine.

## Verification and photographic evaluation

- Independent frozen `5580f93` kernel: 144 combinations of Original/Standard,
  existing experiments, profiles, editing versions and adjustments; exact pixels.
- Numeric tests: independent Hermite evaluation, derivatives/C1, density tails,
  neutral axis, signed range, matrix conditioning/noise bounds, safe fallbacks,
  synthetic scene extremes and invalid/nonfinite models.
- Real app integration: cached analysis, settings retention, old/mixed/versioned
  projects and atomic rejection, source tables, flat field and exact TIFF values.
- Chromium: 72 new-engine GPU/CPU combinations (within one display level), actual
  CPU workers, GPU context restoration, detail 100/200%, native JPEG worker/reserve
  equality, TIFF16/free/quarter geometry, batch/ZIP, cancellation and project restore.
- The complete existing suites retain their image reference values. Legacy fixtures
  explicitly request editing version 1; UI assertions now expect five choices.

`tests/conversion3-artifacts.mjs` perturbs fixed synthetic sources by ±1/65535,
including cyan, low transmission, neutral and extreme cases. Its
[report](measurements/conversion3-artifacts.json) measures local luminance/chroma
sensitivity relative to each engine's clean output. This distinguishes known small
channel perturbations from intended tone steps. It neither diagnoses the original
RAF photographs nor proves that a lower synthetic response looks better.

In this fixed diagnostic, Standard's dense-low-transmission chroma-noise RMS is
.003217 in linear-display units, while Original is zero because it is already
clipped white. That zero is not evidence of recovered information. At a single
source-channel floor, Density still has chroma RMS .004495 and maximum channel
error .014788: preserving signed density does **not** eliminate extreme-signal
sensitivity. Matrix uses its identity fallback on this neutral calibration;
separate mixed-scene tests verify a nontrivial bounded transform. These results
support keeping all methods experimental and do not establish the cause of the
reported blue/violet dots in unavailable RAF originals.

Generate a self-contained, labeled five-way contact sheet:

```sh
npm run conversion:references -- /path/to/negative.tif /tmp/comparison.html 900
# Omit arguments for the synthetic demo; serve site/ through the tool, not file://.
```

The same source, frozen frame, generic profile, neutral print and Editing 2.0 are
used for each engine. The two rows are neutral and a fixed edited example (EV+.5,
contrast1.15, shadows/highlights+25, saturation1.1). Technical calibration decisions
and versions are included in the artifact. Compare real negatives with neutral
and matched-brightness edits, inspect source detail, skin/sky/strongly colored
scenes and both tails. Synthetic contacts establish reproducibility, not quality.

The final regression passed **61/61 groups** (46 Node, clean-build/cache, 14 browser)
in 554.57s. Fast passed 5/5 in 2.27s; Integration passed 5/5 in 27.23s. The complete old
suite took 538.20s on frozen main: no total Full speedup is claimed. See
[test measurements and bottlenecks](TESTING.md#recorded-final-run).
Physical iPad Safari, Windows/Edge and representative real-negative review remain
required; SwiftShader numbers cannot establish device responsiveness or preferred
photographic rendering. All five engines remain available for that evaluation.

## Recorded performance

Seven warm samples per path, Linux headless Chromium 154.0.8037.57/SwiftShader,
Node 24.19, 900×600 demo, same source/frame and Editing 2.0 on both checkouts.
Numbers below are **median [min–max] milliseconds**. CPU preview renders to a
480-pixel maximum side; GPU draws use 700. Exports retain the application’s existing geometry/crop defaults. JPEG includes native worker encoding.

| Engine | Edits | CPU preview | GPU draw + finish | JPEG | TIFF16 |
| --- | --- | ---: | ---: | ---: | ---: |
| Original | Neutral | 28.7 [18.8–62.5] | CPU fallback | 397.0 [369.1–519.8] | 200.0 [155.1–297.0] |
| Original | Fixed edited | 218.3 [142.5–278.8] | CPU fallback | 538.3 [484.4–602.8] | 327.3 [253.0–459.3] |
| Standard | Neutral | 69.1 [67.7–85.1] | 0.5 [0.4–1.2] | 218.2 [208.9–280.3] | 109.6 [95.9–156.4] |
| Standard | Fixed edited | 146.9 [107.8–444.0] | 0.4 [0.2–1.9] | 368.7 [339.8–452.9] | 221.7 [174.7–284.2] |
| Curve | Neutral | 145.0 [122.7–180.4] | 0.6 [0.3–1.4] | 466.6 [377.7–569.0] | 274.4 [213.7–315.9] |
| Curve | Fixed edited | 246.7 [195.5–291.5] | 0.5 [0.3–1.0] | 606.8 [480.3–746.1] | 469.7 [344.0–490.4] |
| Density | Neutral | 226.2 [185.4–306.5] | 0.6 [0.2–2.0] | 541.4 [388.9–734.5] | 329.2 [289.9–626.9] |
| Density | Fixed edited | 338.0 [214.8–494.7] | 0.7 [0.5–1.7] | 826.3 [652.4–1243.6] | 662.4 [377.7–1799.3] |
| Matrix | Neutral | 315.9 [231.3–387.5] | 0.8 [0.3–1.5] | 648.4 [614.2–704.8] | 501.9 [415.1–645.4] |
| Matrix | Fixed edited | 383.6 [292.0–6740.5] | 0.6 [0.4–1.6] | 727.8 [640.4–9093.1] | 716.8 [508.6–2030.6] |

Frozen main reference with the same Editing 2.0 settings:

| Engine | Edits | CPU preview | GPU draw + finish | JPEG | TIFF16 |
| --- | --- | ---: | ---: | ---: | ---: |
| Original | Neutral | 42.1 [21.2–83.9] | CPU fallback | 449.4 [308.3–524.2] | 284.3 [238.5–364.5] |
| Original | Fixed edited | 206.6 [155.4–245.3] | CPU fallback | 531.0 [428.9–561.5] | 344.1 [278.3–478.6] |
| Standard | Neutral | 96.5 [63.4–217.1] | 0.4 [0.3–2.9] | 301.3 [211.4–1029.1] | 150.6 [82.4–251.7] |
| Standard | Fixed edited | 154.7 [123.6–245.9] | 0.5 [0.2–1.7] | 434.3 [392.7–511.3] | 302.0 [202.7–550.2] |

Preparation versus pixel work:

| Engine | First analysis, once | Repeated analysis (cached new model) | Compile neutral / edited | Prepare uint16 tables neutral / edited |
| --- | ---: | ---: | ---: | ---: |
| Original | 113.7 | 98.9 [68.8–105.4] | 0.1 / 0.1 | 10.8 / 10.4 |
| Standard | 181.4 | 121.1 [81.1–137.7] | 0.1 / 0.1 | 12.2 / 14.2 |
| Curve | 90.2 | 50.1 [48.0–85.2] | 0.2 / 0.3 | 9.2 / 10.7 |
| Density | 103.3 | 65.7 [54.8–73.0] | 0.2 / 0.2 | 10.2 / 9.9 |
| Matrix | 58.9 | 53.8 [42.0–60.0] | 0.2 / 0.3 | 10.1 / 10.7 |

Raw data: [frozen main](measurements/conversion3-benchmark-baseline.json),
[candidate](measurements/conversion3-benchmark-candidate.json). Candidate production
input fingerprint: `81928f8a810f476bb6ca5ee5127bf03e1efac845e78d9ec22d89f64953cb6b5c`. The recorded candidate
commit is `8634001`; subsequent changes are documentation and
measurement artifacts. The baseline dirty flag comes only from the new driver's
untracked build-cache directory, not modified baseline source.

The new conversions cost more CPU/export time than Standard in this run, especially
Matrix and adjusted Density. They preserve different technical responses; no
quality-for-speed approximation was introduced. The old engine bodies are unchanged
and their benchmark ranges overlap in many paths; lower candidate medians do not
establish an engine speedup. A 6.74s Matrix CPU sample and 9.09s JPEG sample show
large host/scheduling tails; all samples remain in the report rather than being
discarded. Repeated analysis still includes the pre-existing shared passes; normal
slider changes perform no analysis, as asserted separately.

GPU constructor observations were 9.9–34.0ms. First new-engine draws, including
source upload/software shader specialization, took 715–2851ms; warm draws reused
one source upload per renderer across all samples. Standard first draws were
84–268ms (baseline 56–114ms). These are single cold observations, not median first-
preview latency. The substantial software-GPU first-use cost needs physical-device
validation; sub-millisecond warm submissions cannot predict iPad/Edge performance.

The benchmark source uses 2,160,000 bytes and preview 6,480,000 bytes (the existing linear RGB float preview of the same
900×600 demo); the existing export reports a largest stripe of 81,600 bytes in
all engine cases. Observed JS heaps span approximately 37–60MB in this run, but
GC timing, final output and native encoder/GPU/WASM memory make those point samples
unsuitable as peak-memory or leak estimates. No new production full-size buffer
is introduced; the benchmark's extra uint16 source is only a preparation probe.

[Generated five-engine synthetic contact sheet](measurements/conversion3-benchmark-candidate.html)
contains actual neutral/edited CPU renders and calibration metadata. Download the
self-contained HTML for viewing. It is not evidence of photographic superiority.

A second [mixed-color synthetic contact](measurements/conversion3-mixed-reference.html)
was generated through the standalone reference command, using the procedural
`negative({width:192,height:128})` fixture from
`tests/helpers/conversion3-fixtures.mjs`, sRGB-encoded to PNG for actual browser
import. It exercises the nontrivial Matrix prior on a colored field rather than
only the demo's neutral ramps. Its 8-bit source is not a banding or photographic
quality reference.
