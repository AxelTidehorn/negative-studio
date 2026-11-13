# UI 2.2

> Historical implementation/measurement record. Reproduction commands referring to removed tools require the [pinned PR #99 checkout](https://github.com/AxelTidehorn/negative-studio/blob/f78a0314480072a723f97ce3f1a5aeffae008353/docs/ui-2.2/README.md). This does not retire the application functionality described here. Current test commands and coverage are in [TESTING](../TESTING.md).

A focused correction on main after #66, retaining the existing card DOM, disclosures, session state, workflow, image sizing and CI/release process.

## Material and density

Classic dark keeps workspace `#211d1b` and opaque matte bodies `#1b1817`. The card tint is now neutral `#373837`, at 76% with 10px blur. A restrained 1px inset light edge and bottom shade make the material perceptible over the uniform background, without background gradients or extra DOM. Open bodies and header/footer retain opacity 1 and no filter/shadow. Other themes/light mode, reduced-transparency fallback and the existing floating image toolbar remain.

Main-card chevrons and native summary markers are removed. Native details/summary, keyboard focus and touch targets remain; titles reclaim the icon column. Header padding 5/8px, content padding 6px, slider margins 4px and subsection gaps 8px. The import label loses its literal plus; the existing SVG icon, primary accent and event bindings remain.

Measured before the engine-selector move, against clean #66, same public demo and dark theme:

| Viewport | Open adjustments before → after | Closed card before → after |
|---|---:|---:|
| 1440×900 | 858.45 → 836.45px | 51.53 → 49.53px |
| 1024×768 touch | 1046.09 → 1024.09px | 51.53 → 49.53px |
| 768×1024 touch | 1046.09 → 1024.09px | 51.53 → 49.53px |
| 390×844 touch | 996.91 → 974.91px | 51.53 → 49.53px |

Slider interaction heights stay 24px desktop / 36px touch, with main header targets ≥44px. The final move of the existing engine selector to Advanced removes further primary-panel content; no image-sizing logic changes.

[Before](before) · [After](after). Screenshots are real browser captures of the public demo and synthetic fields; no private photos or AI mockups. Includes open/closed cards, Creative profiles, tablet landscape/portrait, phone and light/dark. Reproduce with `node tools/capture-ui-21.mjs after docs/ui-2.2` after building.

## Fresh V2 and historical compatibility

`NSProjectSettings.newImageDefaults()` defines a fresh V2/Editing 2 workflow. Import uses it for RAW, immediately selecting the existing locked linear Rec.2020 decoder recipe once. Existing source, calibration, GPU/CPU and export owners then run unchanged. Last-image device preferences never seed a new import's engine or editing values.

The user explicitly chose **Standard with a visible explanation** for JPEG/PNG/WebP and TIFF whose V2 domain is not verified. No color-domain conversion is introduced to make these files eligible. Verify linear Rec.2020 TIFF with the existing source setting before choosing V2. A normal RAW decoder failure retains V2's existing error behavior; it is not silently replaced with camera JPEG.

`imageDefaults()` / `defaultState()` remain #66's historical baseline for partial saved settings. The project reader still merges saved values over this baseline. Explicit engines (including archived Curve/Density/Matrix), saved V2 response/intent versions, Editing 1 and missing-engine historical Standard fallback are retained. New schema tags/migrations are unnecessary. Engine and recipe are saved per frame as before; sliders/reset never change them. New-import V2 intentionally changes a newly imported RAW's default appearance, while reopening its saved older project retains that project's engine.

The single existing selector and method explanation move into the Advanced body, using the existing field/label as the compact “Conversion engine” subsection. Choices read V2/default, Standard/reference and Original/historical reference in the five existing languages. Non-V2 selection is first in the closed Advanced summary; V2 does not occupy summary space.

The isolated A/B lab explicitly requests Standard through the same `importRoll` owner, independent of the new default. Its original Standard RAW recipe and RGB16 pixels remain identical to an explicit Standard import in the main application. Only selection/provenance changed, not reference rendering.

## Verification

- `v2-default.mjs`: fresh factory, source eligibility, explicit reference override, unchanged historical fallback and independent settings.
- `v2-default-browser.mjs`: real LibRaw synthetic DNG → default V2, locked recipe/single decode, actual advanced selector, manual choice/reset/queue/mixed project, old Standard/Original/missing-engine projects, exact historical preview pixels, saved V2 intent, GPU/CPU, JPEG and exact RGB16 TIFF/ICC, nonlinear-source rejection/fallback and native keyboard import.
- Existing UI disclosure/material/summary tests include hover/focus, removed pseudo/native arrows, import label/icon, dark/light and touch. Existing palette/i18n/pixel references remain.
- Existing legacy numeric fixtures explicitly retain their former initial engine/editing version in their VM scaffold. Real browser tests exercise the fresh default. Other workflow tests reveal the moved selector; mixed-project fixtures select Standard explicitly instead of assuming it. No pixel references or tolerances are changed.
- The A/B photographic regression checks actual main Standard TIFF versus the isolated automatic A, byte-for-byte in RGB16. The isolated preview/WASM/export regression remains.

The final screenshots and JSON metrics include the selector move. Desktop's open primary card is 741.67px versus 858.45px on #66; touch tablet 913.31px versus 1046.09px; phone 880.92px versus 996.91px. These totals include the removed engine field/description; the spacing-only 22px reduction above is separate. Header targets remain ≥44px and slider heights 24/36px.

Reproduce: `npm run build`, `node tests/v2-default.mjs`, `node tests/v2-default-browser.mjs`, `npm run test:full`. Full-suite/build results are reported in the PR checks/description. CI/CD, release numbering, shaders, RAW decoder, reconstruction/editing math, histogram calculation, film-base detector and export codecs are unchanged.

Physical iPad Safari and Windows Edge are not available. Chromium touch emulation covers layout and input; the RAW integration uses the repository's synthetic DNG, not a new photographic RAF evaluation.
