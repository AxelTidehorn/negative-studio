# UI correction after #65

The existing five cards, native disclosures, session state, summaries, controls and tools are reused. Only CSS changes the application; no DOM, state, image-processing or geometry logic changes.

- Classic dark: shared workspace `#211d1b`, opaque card bodies `#1b1817`, chrome `#191615`, frosted headers `#403630` at 91% / 9px. Other themes/light mode remain available.
- The image panel uses the same flat background as the editor; its transparent border retains the existing dimensions. The editor has no outer border.
- Body padding 10→8px, title padding 8/12→6/10px, control spacing 6→5px, subsection spacing 12→10px.
- The existing chevron now occupies the title row, rather than spanning both title and status. Gap 8px. A resized editor ≥440px can show status beside its title; normal tablet widths wrap it below.
- Toolbar order and targets remain: Import primary, JPEG/TIFF secondary, mode buttons with quieter selected surfaces, Settings with one monochrome gear.
- Existing 91%/9px card frost, 83%/10px picture toolbar, opaque bodies/chrome and reduced-transparency fallbacks are retained.

Actual Chromium measurements from the same public demo, dark theme, neutral settings:

| Viewport | Open adjustments before → after | Slider row pitch before → after | Slider touch/interaction height |
|---|---:|---:|---:|
| Desktop 1440×900 | 873.45 → 858.45 px | 48.19 → 47.19 px | 24 → 24 px |
| Tablet landscape 1024×768 | 1061.09 → 1046.09 px | 61.59 → 60.59 px | 36 → 36 px |
| Tablet portrait 768×1024 | 1061.09 → 1046.09 px | 61.59 → 60.59 px | 36 → 36 px |
| Phone 390×844 | 1011.91 → 996.91 px | 61.59 → 60.59 px | 36 → 36 px |

Closed ordinary cards are 4px shorter (55.53→51.53px); header targets remain ≥44px. Panel and photograph widths are unchanged. This is a measured modest reduction, bounded by preserving touch targets.

[Before screenshots/measurements](before) · [After screenshots/measurements](after). These are real application captures using public `demo-negative.png` and uniform test fields, not private photos. Visually reviewed desktop, tablet landscape/portrait, phone, light/dark, open/closed material contrast, toolbar over light/dark fields and document footer.

Reproduce after `npm run build`: `node tools/capture-ui-21.mjs after docs/ui-refinement-ci`. `tests/ui-21-browser.mjs` additionally checks shared backgrounds, 8px padding, title-row chevron, gear and wide-panel summary placement; its existing disclosure, live summary, project, GPU/CPU, material and touch assertions remain. Existing twelve-palette contrast/i18n/unchanged-pixel tests pass. Physical iPad Safari and Windows Edge are not available here.
