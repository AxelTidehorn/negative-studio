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

Performance and test-run measurements are recorded below after final validation.
Physical iPad Safari, Windows/Edge and representative real-negative review remain
required; SwiftShader numbers cannot establish device responsiveness or preferred
photographic rendering. All five engines remain available for that evaluation.
