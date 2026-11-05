# UI 2.2

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
