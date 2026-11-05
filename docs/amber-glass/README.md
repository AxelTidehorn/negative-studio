# Amber Glass

Pure visual experiment based on merged UI 2.2 (#67). The existing cards, DOM, padding, native disclosures, V2 default, advanced engine selector, import icon, workflow and release system are retained.

Material variables live in the existing dark-Classic block of `ui-refinement.css`:

| Token | Value / purpose |
|---|---|
| `--ui-workspace-material` | The supplied four asymmetric radial fields and 135° dark base gradient, unchanged |
| `--ui-card-glass` | Supplied 125° gradient: `#A96B4D70`, `#A8704C47`, `#5D342B78` |
| `--ui-card-edge` | `#F0B4814A`; slightly quieter than the suggested `65` alpha |
| `--ui-glass-edge` | 22% warm-white 1px inset top reflection |
| `--ui-card-shadow` | 0 2px 5px, 13% black; no glow |
| `--ui-card` | Opaque `#171210` content |
| `--ui-card-header` | Solid readable fallback; also keeps the existing floating toolbar warm |

The existing header material rule consumes these tokens; closed cards are entirely header surface. Open bodies keep opacity 1, no gradient/blur/shadow. Existing 10px blur and 6px outer corners remain. Unsupported blur and reduced transparency retain solid readable header fallbacks. No animation, image asset, canvas, extra DOM or JavaScript rendering is introduced.

The background belongs to the **whole workspace**, not a new sidebar layer. The editor background becomes transparent only in dark Classic. Its own scroll moves cards over the stationary workspace fields; mobile retains native page scrolling. Existing photograph and queue surfaces stay opaque so the ambient light does not tint photograph pixels. The visible curves therefore vary with viewport proportions and with how much workspace the opaque photo covers. This is the main contextual difference from an unmasked design sketch.

Other theme identities and Classic light retain their previous materials. Header/footer remain opaque and flat. Padding, target sizes, panel width, card order and photo geometry are unchanged; before/after metric JSON files are included.

## Visual evidence

[Before](before) · [After](after): actual application screenshots at the same viewport, state and public `demo-negative.png`, including all cards closed, Image adjustments, Creative profiles, desktop, tablet landscape/portrait, phone and light mode. Uniform synthetic fields test toolbar readability. No private photographs or AI mockups are used.

Reproduce after building: `node tools/capture-ui-21.mjs after docs/amber-glass`. The capture helper now records the same full state set for both phases.

## Verification

`amber-glass-browser.mjs` checks scope across all twelve theme/mode combinations, organic gradient count, glass headers, opaque matte body/photo, stationary background under editor scroll, unchanged state/source/analysis/pixel samples/GPU source uploads, no extra canvas, and reduced-transparency fallback. Existing disclosure, keyboard/touch, live summary, project/export, contrast and localization tests remain.

Run `npm run test:full` and `npm run build`; final results are recorded in the PR checks/description. Browser verification uses Chromium and touch emulation with SwiftShader. Physical iPad Safari and Windows Edge are not available. Backend code, shader/math, source import, export, project formats, CI/CD and version policy are unchanged.
