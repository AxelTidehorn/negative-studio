# Editing 2.0 — algorithms and compatibility

Baseline: main `2e82ad6`, including architecture #24 and maintenance #25.
The supplied **FILMLABB_Redigeringsmotor_2_0_Forstudie.md** (26 October 2026)
was available in the earlier attachments, not in the repository. It was read as
design guidance. Its code inventory predates the later color experiments and
refactoring; this implementation follows the current manifest/call chain.

## Current integration

Conversion Engine 3.0 makes Editing 2.0 the default for **new images and projects**.
The ordinary A/B editing selector is hidden; its internal compatibility binding
and the original editing operator remain. Existing images/projects keep their
saved version. Missing versions in older project/session data mean Original (1),
not the new default. Resetting an old image does not upgrade its editing version.

All five conversion choices (Original, Standard, Curve, Density and Matrix) work
with Editing 2.0. Conversion selection, RAW import, film frame, calibration,
creative profile and presentation remain independent. Editing never calls analysis.
**Equal values do not mean equal visual strength between editing versions.** In
2.0 positive Shadows lifts and positive Highlights compresses; Original keeps its
earlier directions. Roll copying keeps the existing adjustment-value semantics.

The algorithms below are unchanged from the initial A/B implementation. This
integration does not establish photographic superiority. Evaluate real negatives,
skin, sky, saturated objects and 100%/200% detail on physical iPad/Edge devices.
See [Conversion Engine 3.0](CONVERSION_3_EXPERIMENT.md) for activation, new project
tags and the controlled conversion experiments.

## Adapter and independent versions

`settings.editVersion` selects **1** or **2** independently of `settings.engine`,
`colorMode4`, `toneMode4`, RAW mode and calibration versions. Missing values use
Original, never the latest engine. Unknown render values conservatively use
Original; importing an explicit unsupported project version rejects the entire
project before mutation.

For version 2, `NSPixelKernel.compile` delegates the existing conversion to an
unchanged original kernel with neutral creative controls (exposure 0, contrast/
gamma/saturation 1, temperature/tint/zones 0, black .015 and white .99). Conversion,
source correction, technical ranges, current color experiments, existing shoulder,
profile version/strength and print rendering remain frozen. A small operator then
edits that positive result in **linear-display sRGB, D65**, before geometry and
output quantization. It is not scene-linear radiance or an inverse film-response
model. No RAW/source metadata is consulted by the new operator.

This is the study's permitted compatibility adapter, rather than relocating all
legacy profile code. Its neutral controls return the original encoded positive
**without a decode/encode round trip**, preserving exact CPU/16-bit output. It
cannot recover detail clipped or compressed in import, conversion or the existing
profile/print. Future changes to that boundary need another editing version.
There is no source-dependent blue/violet suppression, denoising or artifact mask.

Original kernel bodies and calibration mathematics are unchanged. Necessary
integration only adds the version adapter and disables separable *complete* RGB
lookups for the new coupled operator. Existing technical source-channel tables
are still reused. Comparison and older conversion modes also work with 2.0 on CPU;
the GPU backend supports Standard and the three new conversion engines; Original
retains its existing CPU fallback.

## One compiled tone curve

`src/editing/editing-engine.js` owns parameter compilation, CPU operator and a
small GLSL definition. Algorithm for editing version 2:

1. Decode the frozen positive to linear sRGB. Relative warm/cool/tint gains retain
   the existing exponential axes, normalized by `dot([.2126,.7152,.0722], gains)`.
   This preserves a neutral reference's Y before tone, not every colored pixel's Y.
   Black-and-white profiles ignore color balance/saturation, as Original does.
2. Compile all tone controls to one bounded scalar curve. Knots are fixed at
   **0, .01, .04, .1, .18, .35, .6, .85, 1**. Creative black/white shifts are relative
   to the neutral .015/.99 baseline, using their sRGB-decoded offsets. Explicit
   black/white changes can intentionally flatten/clamp the end range.
3. Anchor exposure uses `g=2^EV` and `g*y/(1+max(0,g-1)*y)`: multiplicative gain
   with integrated white headroom for positive EV; negative EV remains linear.
   This SDR adapter does not claim physical scene exposure. Gamma shapes the
   anchors with a positive power. Contrast uses log-odds slope about fixed .18.
4. Tone zones move anchors by
   `sigmoid(logit(y)+1.2*(shadows*(1-y)^2-highlights*y^2))`, with zones normalized
   to [-1,1]. Endpoints are handled explicitly. This mapping is monotone over the
   supported range; no histogram or image-dependent pivot moves while dragging.
5. Weighted harmonic PCHIP tangents and bounded endpoint tangents yield a
   shape-preserving, C1 cubic Hermite curve. Eight sets of four polynomial
   coefficients are prepared once, in Number precision, and shared with GPU.
   Runtime evaluation is one interval lookup and Horner polynomial, not a stack
   of independent pixel-level gamma/contrast/zones. Input Y is bounded SDR [0,1];
   endpoint evaluation is explicit. No HDR LUT-tail extrapolation is implied.
6. Apply the target Y with a common RGB ratio. Subtract the lifted black floor
   before ratio scaling and add it back equally; at Y≈0 use the endpoint slope.
   This avoids an epsilon division that turns a lifted black floor into enormous
   chroma gain. Global curves can still amplify noise or reduce local contrast;
   no spatial filtering restores lost texture.

Current slider limits remain: EV [-2,2], contrast [.5,1.7], gamma [.65,1.6],
shadows/highlights [-100,100], black [0,.12], white [.85,1], balance [-35,35] and
saturation [0,1.8]. New operator parameters are finite/bounded with neutral fallback
for malformed inputs. Monotonicity does not prevent intentional endpoint clipping
or output quantization plateaus; it prevents tone reversals.

## Saturation and output gamut

Saturation scales OKLab `(a,b)` together at fixed L, using the published D65
linear-sRGB matrices. This retains OKLab hue/lightness before output mapping and
gives a clear numerical goal for moderate skin-like colors. There is no skin-hue
mask or vibrance heuristic. Grays bypass matrix round-trip noise. At unit saturation
this conversion is bypassed entirely.

The final mapper projects along linear RGB chroma about Y to the sRGB cube. A
C1 exponential knee affects only the outer portion of the available chroma range,
rather than clipping channels independently. Its width is at most 10% and fades
to zero continuously as controls approach neutral; this prevents a sudden color
jump when leaving the exact-neutral bypass. It preserves Y during gamut reduction,
not exact OKLab L/hue at extreme gamut boundaries. This is a deliberate inexpensive
compromise. Iterative OKLCH boundary searches/full gamut tables were not added to
the per-pixel export loop. Numerical invariants do not prove preferred skin tones
on photographs, especially near clipping.

The implementation was written from mathematical definitions; no darktable,
RawTherapee, ART or external reference implementation was copied. Matrix constants
follow Ottosson's [OKLab definition](https://bottosson.github.io/posts/oklab/).
No new dependency or project license is introduced.

## CPU/GPU/export/resources

The DOM-free module is loaded by the manifest, CPU preview worker and JPEG worker.
GPU uses the same compiled tone coefficients, gain, saturation, knee and generated
matrix constants in the **existing color pass**. No new full-size intermediate,
texture, image cache, readback loop or GPU pass is introduced. A/B version changes
rerun the existing small GPU precision validation once (and reload the source
texture after that probe); ordinary adjustments still reuse source uploads.
Existing context-loss/precision failure CPU fallback remains active.

Original detail, TIFF, JPEG worker/main fallback/synchronous compatibility paths,
free-rotation sampling, batch/ZIP and cancellation use the same versioned kernel.
Each export freezes its configuration; the retained version binding is locked
during export. Existing stripes, byte budgets, retry rules and five-image queue remain.
Negative display is unchanged. Geometry still interpolates processed neighbor
colors in linear display light, then quantizes according to format.

## Project compatibility

New image settings now default to `editVersion: 2`; imported older settings without
a version still explicitly receive `editVersion: 1`. JSON stores the version per image.
Mixed queues retain both versions. Original-only projects keep the existing
`negative-studio-roll-beta6` tag. Projects containing version 2 with only earlier conversion engines use
`negative-studio-roll-beta6-edit2`; earlier Beta 6 builds reject that tag instead of silently
rendering new settings with Original. Projects containing Curve, Density or Matrix use the separate Conversion 3.0 tag.
The current project controller adapts these
file tags to the same validated geometry schema (geometry version 1).

All previously supported project formats, RAW settings, color experiments,
calibration/profiles and geometry migrations remain. No automatic conversion or
upgrading of old edits occurs. Do not expect an earlier app to render a new editing
project. Keep original files and the matching application version for reproducibility.

## Verification and measurements

`tests/editing-engine.mjs` checks dense monotonicity and C1 knots, an independent
Hermite-basis evaluation, directions/pivot/endpoints, near-neutral continuity,
finite/bounded colors, grays, skin-like patches, primaries/secondaries, gradients,
OKLab invariants and malformed editing parameters. A frozen main kernel fixture
checks original/neutral identity and unchanged technical samples across conversion,
profile and existing color variants. Projects test mixed/missing/unsupported versions.

`tests/editing-browser.mjs` checks the retained internal version binding, no analysis/source mutation,
180 direct GPU/CPU combinations, actual CPU worker, 100%/200% source detail,
16-bit TIFF reference, free-rotation native JPEG worker/fallback equality, mixed
project restore, TIFF/JPEG ZIP batches and cancellation. Broader existing suites
remain unchanged in purpose and retain their expected pixel values.

Run `tools/benchmark-editing.mjs CHECKOUT OUTPUT.json 7` against built frozen main
and candidate sequentially. It records CPU preview, synchronized software GPU,
TIFF and worker JPEG times with warm-up and all samples, checks analysis stability,
and generates an HTML comparison from the actual synthetic demo renders. This
is not a benchmark on a physical GPU/iPad, and synthetic demo images are not a
photographic quality assessment. The recorded results follow below.

### Recorded performance

Seven warm samples, Chromium **154.0.8037.57**, Linux/SwiftShader, 900×600 synthetic
demo, same compiled source/calibration. Timings are **median [min–max] ms**.
The frozen main run is `2e82ad6`; final scalar candidate is `eda17dd` (later detail
precision revalidation only affects an open detail panel, not these probes).

| Path | Original neutral | 2.0 neutral | Original adjusted | 2.0 adjusted |
| --- | ---: | ---: | ---: | ---: |
| CPU preview, max side 480 | 88.9 [65.9–96.6] | 89.3 [79.7–160.6] | 121.2 [109.6–142.5] | 144.9 [132.9–148.0] |
| GPU draw + finish, max side 700 | .5 [.3–1.3] | .4 [.2–1.5] | .2 [.1–.9] | .3 [.2–2.1] |
| JPEG worker export | 319.7 [263.9–1353.1] | 409.3 [286.2–1073.8] | 380.8 [345.6–1489.8] | 539.0 [440.8–1303.3] |
| TIFF export | 180.4 [125.2–900.6] | 134.8 [119.0–946.9] | 266.9 [203.2–626.0] | 306.2 [287.3–1321.2] |

Adjusted values are EV .7, contrast 1.2, gamma 1.1, shadows/highlights +30 and
saturation 1.4. These intentionally have different visual strength between versions.
In this run 2.0 adjusted costs about **20% CPU preview, 42% JPEG and 15% TIFF**
relative to Original adjusted. This is a cost report, not a speedup claim. Native
encoder/worker startup and host scheduling have large tails. Sub-millisecond
software GPU observations do not establish physical GPU speed or iPad latency.

Frozen main Original adjusted measured 123.8 [107.2–133.6] ms CPU and 253.6
[220.8–796.7] ms TIFF, consistent with the candidate Original path within observed
variation. It does not prove every device is regression-free. Neutral CPU follows
the original path; the independent image/kernel tests, not timing, prove identity.
Each benchmark renderer uploads the source once across all samples; analysis and
the source buffer remain unchanged. No total/native peak-memory figure is claimed.

An initial vector-heavy prototype measured 783.0 [400.5–2027.8] ms for adjusted
2.0 CPU preview. The scalar hot path removes its per-pixel matrix/vector temporaries
and matches an independent matrix reference within 1e-12. Final 144.9 ms shows why
this simplification was retained; the final run is still more expensive than Original.
The prototype report records the then-current HEAD (`2e82ad6`) plus uncommitted
implementation, not a separate released engine.

Raw data: [frozen main](measurements/editing2-baseline.json),
[initial vector prototype](measurements/editing2-vector-prototype.json),
[final scalar candidate](measurements/editing2-candidate.json).
[Generated synthetic A/B renders](measurements/editing2-synthetic.html) use actual
CPU/demo output. Original-neutral and 2.0-neutral PNGs are identical. Inspection
shows the different tone strengths; it is not a photographic preference ranking.
The demo source is 8-bit, so source quantization is visible and is not evidence
of newly introduced 16-bit curve banding.
