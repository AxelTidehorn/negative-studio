# UI/UX 2.0

This document records the original UI/UX update. See [targeted UI stabilization](UI_STABILITY.md)
for the current footer placement, mobile scrolling, control binding and revised
dark palettes. Conversion 3.0 also moved the engine selector beside the image
adjustments and made Editing 2.0 the new-image default.

This update changes presentation and device preferences. Conversion, editing,
calibration, import, geometry calculations, pixel sampling and project schemas are
unchanged. It starts from main `d43ea0b` (including Editing 2.0, PR #27). The
separate licensing work in PR #26 is not included; existing notices are retained.

## Workspace

The editor now follows this order:

1. **Film frame**: the technical analysis area, confirmation and common export
   frame limit. This stays directly accessible above image adjustments.
2. **Image adjustments**: histogram, editing version, exposure, contrast,
   highlights, shadows, temperature, tint and saturation. Midtones and endpoints
   are in a compact subsection.
3. **Creative profiles**: profile, strength and positive print style. Ineffective
   strength controls are hidden without discarding their value.
4. **Rotation and composition**: quarter turns join fine rotation, straightening,
   crop and grid. Their calculations and defaults are unchanged.
5. **Negative conversion**: conversion engine, experiments, calibration,
   illumination references, RAW input and film-base controls.
6. **Export and projects**: size, filenames, batch and project save/load. The
   primary JPEG/TIFF buttons remain in the workspace toolbar.

Removed from the workspace: the introductory tutorial, the “About profile”
section with long per-profile descriptions, repeated conversion explanations,
batch memory commentary and the permanent Editing 2.0 explanation. General help
links to the README. Detection uncertainty, RAW reset warnings, calibration
status, spatial-reference instructions and the project/original-file distinction
remain. Status messages are visible below the photograph rather than inside the
information popup. Interface preferences and backend diagnostics share the
existing Settings popup.

Desktop has one vertical editor scroller; queue scrolling is independent. The
old wheel handler which redirected scrolling over the image was removed. Phones
use page scrolling, a sticky viewer and a horizontal queue. Coarse pointers use
native scrollbars and larger controls. Keyboard users can activate file labels
and queued images; focus and selection have borders/weight as well as color.

## Appearance

`src/ui/appearance.js` owns device-only preferences:

- `filmlabb-appearance-v2`: `{theme, mode}`.
- Six identities: `classic`, `olive`, `burgundy`, `industrial`, `paper`,
  `aubergine`; modes `dark` and `light`.
- An existing `negative-studio-theme-v092` preference migrates to Classic in its
  saved mode. Missing/invalid preferences fall back safely; storage failures do
  not prevent startup.
- Selects update the root `data-theme` / `data-mode` immediately. The header
  light/dark shortcut remains. No image settings or project fields are written.
- `filmlabb:appearance` repaints the small histogram with the current UI color;
  it does not rerender the image, upload a source texture or analyse the film.

| Identity | Direction | Dark accent | Light accent |
| --- | --- | --- | --- |
| Classic | Existing warm graphite, ivory and terracotta reference | `#c78154` | `#a45b34` |
| Olive | Forest/olive instruments, sage and ivory | `#b3bd91` | `#4e613b` |
| Burgundy | Wine/plum, stone and restrained rose | `#cc939b` | `#8e3e50` |
| Industrial | Neutral graphite, precise borders and pale yellow | `#d4ce94` | `#64602c` |
| Paper | Warm paper/brass; deep warm neutrals in dark mode | `#c6af76` | `#736234` |
| Aubergine | Smoky violet-gray and muted lavender | `#b7a2bd` | `#785885` |

All twelve variants remain available. [Comparable screenshots](ui-ux-themes/README.md)
use the same bundled synthetic negative, viewport and image settings; they are
not photographic quality evidence.

## CSS ownership

- `application.css`: shared tokens for dimensions, desktop layout and components.
- `ui-refinement.css`: semantic palette values and existing `--ns-*` aliases.
- `mobile-layout.css`: responsive layout and coarse-pointer rules.
- `beta6-geometry.css`: overlays and geometry hit targets.

The old inline head styling, overlapping palette/component overrides and injected
original-detail dialog stylesheet were consolidated. Components use `--ui-*`
roles for surfaces, text, borders, accent, active/focus/disabled states,
errors/warnings, sliders and scrollbars. Fine pointers have one scrollbar style;
touch keeps native behavior. There is no new CSS dependency. The only necessary
`!important` is the shared hidden-state rule.

## Dynamic localization

`i18n-messages.js` is the five-language catalogue and pure formatter.
`i18n.js` initializes it before controllers and provides:

```js
FILMLABB_I18N.message(element, 'frame.loading', {name: file.name});
FILMLABB_I18N.source(element, 'Laddar ' + file.name + '…');
FILMLABB_I18N.t('export.error', {error: 'Ingen bild avkodades.'});
FILMLABB_I18N.confirmSource(sourceMessage);
```

Use `message` for new dynamic producers. Parameters representing filenames remain
opaque; known nested error/status/profile text is translated. `source` supports
existing canonical Swedish producers with typed templates. Bindings retain their
canonical message and are refreshed on language change. Removed or externally
rewritten nodes are pruned so old bindings cannot overwrite newer controller
messages. Text is inserted through `textContent`, never as translated HTML.

A coalesced MutationObserver remains as a compatibility bridge for older
controllers, including newly created dialogs, text nodes, select options and
`title`, `placeholder`, `aria-label`, `aria-description`, `alt` and optgroup
`label`. Source/last-rendered pairs allow repeated language switching. It watches
the whole body, including portaled dialogs, and disconnects during its own
writes. It does not observe styles/classes, walk image buffers or translate
project/source metadata. `data-i18n-ignore` protects filename labels.

The original exact-string observer missed interpolated messages, several
attributes and body-level dialogs. Translation is now explicit for status,
export progress, loading and queue producers; the bridge covers legacy sinks.
Browser/LibRaw/OS error details without a known application message remain
verbatim for diagnosis. New application strings require all five catalogue
entries and a regression case; do not rely on guessing an arbitrary translation.

## Verification

Commands are the existing `npm test`, `npm run build`, `npm run test:build` and
`FILMLABB_CHROMIUM_BIN=/path/to/chromium npm run test:browser`. The UI additions
are `tests/ui-i18n.mjs` and `tests/ui-ux-browser.mjs`.

The new tests cover five catalogues and parameter contracts, twelve palettes,
text contrast of at least 4.5:1 on the three main surfaces, accent text, focus,
persistence/migration, unchanged image pixels/settings/analysis/source uploads,
profile-strength retention, live dynamic text/attributes, image/engine changes,
completed export translation, malformed TIFF and unsupported-file imports, native
RAW fallback prompts, loading labels and desktop/tablet/phone overflow/touch targets.
Existing pixel/project/RAW/TIFF/GPU/export/offline tests retain their expected
values. Only UI ownership selectors and an implicit Swedish-locale assumption
were adjusted where the intentional UI changes required them.

Automated rendering uses Chromium/SwiftShader. Physical iPad Safari, Windows
Edge, native select popups, OS overlay scrollbars, long-session touch behavior
and real-negative visual evaluation still need manual checks. A viewport/touch
emulation is not a claim of testing those physical devices.
