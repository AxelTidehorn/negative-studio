# Amber Glass 3.0

The application has two device-local appearances: **Amber Dark** (default) and
**Amber Light**. The existing day/night button and native light-mode select share
one controller. There is no palette identity selector or alternative palette API.

## Materials

`src/ui/ui-refinement.css` owns the semantic colors. Dark retains its established
organic background and Amber/Smoke materials. Light uses ivory, sand and muted
amber; its SVG differs **only in fill/gradient colors**, with identical paths,
transforms, opacity, blur, aspect ratio and workspace background mapping.

Queue and outer image housing use the same `--ui-smoke-workspace`, edge and shadow
roles. The photographic aperture remains opaque, neutral gray in both modes.
Open card bodies and control fields stay solid. Material-specific header text
roles provide contrast over the composite glass/SVG background, rather than
assuming the opaque panel color. The browser test measures those actual pixels. The histogram's data surface is
kept dark so its RGB/luminance colors remain readable, including forced colors.
Dense Smoke Overlay remains distinct from the translucent workspace material.

Reduced transparency replaces both workspace glass surfaces and toolbar/header
materials with mode-specific solid fills. Forced colors uses system surfaces and
focus colors, and removes the decorative backdrop. Motion tokens, panel/card
animation code, geometry, color processing and export are unchanged.

## Preferences and compatibility

`filmlabb-appearance-v2` now stores only `{ "mode": "dark" | "light" }`.
Records containing an old `theme` identity, corrupt/invalid values and the obsolete
single-key preference default to Dark. No project/image data is read or migrated.
`FILMLABB_APPEARANCE.get()` returns `{mode}`; `set(mode)` validates the two modes.

Olive, Burgundy, Industrial, Paper and Aubergine palettes, selector options,
listeners and unused theme-name translations are removed. Creative print style
`classic` is unrelated and remains unchanged.

## Verification

Run the existing material/UX/UI regressions and `npm run test:full`. Tests cover
both modes, contrast, preference persistence/fallback, source/render/histogram
invariance, reduced transparency, forced colors, five languages and native input.
Before/after screenshots use the same portrait, UI state, viewport and scroll
origin. A menu overlay intentionally changes when its palette field is removed;
photograph pixel comparisons use unobscured areas instead.

Desktop 1440×900 and touch-emulated 1024×768/768×1024 are visually checked in
Chromium. Physical iPad Safari/Windows Edge still require human review before merge.
