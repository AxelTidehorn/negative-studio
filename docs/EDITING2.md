# Editing 2.0 — experimental A/B implementation

Baseline: main `2e82ad6`, including architecture #24 and maintenance #25.
The supplied **FILMLABB_Redigeringsmotor_2_0_Forstudie.md** (26 October 2026)
was available in the earlier attachments, not in the repository. It was read as
design guidance. Its code inventory predates the later color experiments and
refactoring; this implementation follows the current manifest/call chain.

## Using the experiment

Above the existing adjustment sliders, choose **Original editing** or
**Editing 2.0 (experimental)**. Conversion engine (Standard/Comparison), RAW import,
film frame, film-base/neutral calibration, saved response and creative profile
stay the same. Version changes and ordinary editing never call analysis.

The version is individual to each image and defaults to Original. Switching
preserves the slider values, so it is easy to return to the original rendering.
**Equal values do not mean equal visual strength.** In 2.0, positive Shadows lifts
shadows and positive Highlights compresses highlights. Original keeps its earlier
behavior, including its different shadow direction. Double-click/tap still resets
the existing slider. Roll copying copies the existing adjustment values, not the
per-image editing version. No new advanced panels or spatial controls are added.

Compare both versions with the same frozen image/analysis, first neutral and then
one slider at a time. For photographic judgment, also compare matched midtone
brightness/contrast: equal numbers alone are not a fair quality comparison. Check
skin, skies, saturated objects, deep shadows and 100%/200% detail, with neutral and
creative profiles. Real negatives, several observers and physical iPad/Edge tests
are required before calling this a photographic improvement or changing defaults.

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
the existing GPU backend remains limited to its supported Standard configurations.

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
Each export freezes its configuration; the version selector is locked during
export. Existing stripes, byte budgets, retry rules and five-image queue remain.
Negative display is unchanged. Geometry still interpolates processed neighbor
colors in linear display light, then quantizes according to format.

## Project compatibility

New image settings default to `editVersion: 1`. JSON stores the version per image.
Mixed queues retain both versions. Original-only projects keep the existing
`negative-studio-roll-beta6` tag. Projects containing version 2 use
`negative-studio-roll-beta6-edit2`; earlier Beta 6 builds reject that tag instead of silently
rendering new settings with Original. The current project controller adapts this
file tag to the same validated geometry schema (geometry version 1).

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

`tests/editing-browser.mjs` checks real A/B controls, no analysis/source mutation,
180 direct GPU/CPU combinations, actual CPU worker, 100%/200% source detail,
16-bit TIFF reference, free-rotation native JPEG worker/fallback equality, mixed
project restore, TIFF/JPEG ZIP batches and cancellation. Broader existing suites
remain unchanged in purpose and retain their expected pixel values.

Run `tools/benchmark-editing.mjs CHECKOUT OUTPUT.json 7` against built frozen main
and candidate sequentially. It records CPU preview, synchronized software GPU,
TIFF and worker JPEG times with warm-up and all samples, checks analysis stability,
and generates an HTML comparison from the actual synthetic demo renders. This
is not a benchmark on a physical GPU/iPad, and synthetic demo images are not a
photographic quality assessment. Detailed results are recorded with final checks.
