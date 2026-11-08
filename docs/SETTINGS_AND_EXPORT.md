# Settings and export controls

The header contains the logo and existing support action. Appearance and language
use their original controllers/keys inside the native Settings disclosure. The
settings groups are Appearance, Workspace, Performance and diagnostics, and Other.
The GPU/CPU preference, RAW reload, image information, queue clearing and help are
retained. Batch JPEG ZIP, selected TIFF exports and project controls stay in the
Export and project card.

## Disclosure

`workflow-ui.js` owns the Settings animation and focus lifecycle. Native details
stays open while the content exits; its controls become inert immediately. The
existing absolute panel/material remains unchanged. A 200 ms entry / 150 ms exit
animates opacity and a 5 px translation from the button edge. Reversals start at
the painted state. Escape, outside pointer, keyboard focus departure and external
native details changes are handled. Reduced motion finishes immediately. Other
card/sidebar animations and image rendering are unchanged.

## Export ownership and precision

The toolbar has one native format selector and one Export action. JPEG 8-bit is
the default. `filmlabb-export-format-v1` is a device-local preference, separate
from image recipes and projects. Invalid preferences fall back to JPEG. Existing
prefix/numbering is reused, with the actual selected filename extension.

- JPEG retains its existing worker, bounded stripe transport, fallback, quality
  `.94` and size budgets. The JPEG size control applies only to JPEG.
- PNG 8-bit uses that same canvas worker/fallback and `NSPresentation.rgba`
  sampling, at original output resolution. An sRGB declaration is retained or
  inserted without modifying compressed pixels. If the browser cannot encode the
  full canvas, export reports an error; PNG is never silently reduced.
- TIFF 16-bit retains the existing sRGB ICC header, original output dimensions,
  quantization and byte order.
- PNG 16-bit uses the **same** prepared pixel kernel, geometry and Uint16 stripe
  samples as TIFF, through `exportRgb16`. It never passes through canvas or RGB8.
  `png-encoder.js` writes RGB color type 2 / bit depth 16, big-endian channels,
  filter-zero rows, CRC-checked chunks, sRGB and gAMA metadata. Native
  `CompressionStream('deflate')` is drained concurrently. Without it, bounded
  stored-deflate blocks with Adler-32 provide a valid, larger PNG. Output parts
  grow with the encoded file; no full-size RGB/RGBA intermediate is allocated.

Both 16-bit formats share cancellation/progress/locking and frozen source,
recipe and geometry. PNG8 shares JPEG's owner. Existing batch formats explicitly
remain JPEG/TIFF regardless of the toolbar preference. Film-base proposal preview
is ended before export, consistently across the four formats.

## Verification

`tests/png-export.mjs` independently inflates/reads native and stored-deflate
RGB8/RGB16 PNG streams, checking chunks, CRC, channels, low bits and aborted or
incomplete writers. `tests/settings-export-browser.mjs` downloads all four real
formats through the ordinary UI, verifies bit depths/dimensions/profiles, matches
PNG8 to pre-encode RGB8 and PNG16 byte-for-value to TIFF16, including Editing 2.0,
rotation/composition and fallback. It also checks original-resolution exports
from a real imported source wider than its preview and cancellation without a
file download. The PNG reader is test-only and uses Node zlib, not production
encoder code or canvas's 8-bit decode.

Existing JPEG/TIFF numeric references, batch/project suites, UI/motion tests and
the full suite remain enabled. Browser regressions reach the moved language
control through the real Settings UI. Native theme/language/format persistence,
focus/inert state, touch and reduced motion are covered. App version generation,
project schemas, color math, RAW decoding, GPU code, CI and deployment rules are
unchanged.

Visual review uses Chromium desktop and touch-emulated iPad with public NASA
imagery. Physical iPad Safari and Windows Edge still need device review. PNG16's
stored-deflate fallback is verified, but its files can be considerably larger
than compressed PNGs. PNG8 canvas limits remain browser-dependent; PNG16/TIFF
avoid canvas limits but encoded output still needs memory proportional to file
size.
