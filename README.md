# FILMLABB

FILMLABB converts photographed negatives locally in the browser. Source images are not uploaded to a processing service or modified. The current development line is FILMLABB 3.0 beta.

## Current workflow

1. Import up to five RAW, browser-readable images or TIFF files. **V2/D is the default for new compatible RAW images**, through `NSProjectSettings.newImageDefaults()`. Browser images and ordinary TIFF use **Standard** (`calibrated4`). V2 also accepts explicitly verified linear Rec.2020 TIFF without ICC.
2. A confident photographic-frame detection is used automatically. An uncertain but credible quadrilateral opens directly for correction; no candidate starts with the whole image. Drag corners or edges, then confirm. Pending proposals do not authorize V2's automatic scene analysis. Manual confirmations and locks survive queue/project changes.
3. Measure and approve a separate film-base reference when available. A frame boundary, subject-analysis region, base reference and composition crop have different responsibilities.
4. Apply Editing 2.0 and a presentation profile. The active color profiles are Gold 200, Ektar 100, Pro 400H, Portra 400, Backstreet, Afterglow, Pale Static and Redline, alongside Neutral and Neutral black-and-white. Profile parameters are unchanged by the architecture consolidation.
5. Adjust composition/rotation and export JPEG8, PNG8, PNG16 or TIFF16. Batch JPEG ZIP and selected TIFF export retain progress and cancellation.

**V2/D and Standard are the only conversion engines.** Standard remains a manually selectable fallback/comparison. Switching between engines reuses a compatible decoded source; entering V2 from a different RAW recipe requires its locked linear Rec.2020 decode. Neither profile changes nor image adjustments decode RAW again.

The Amber Glass two-column interface includes the queue, histogram, original-detail view, image adjustments and direct frame tools. GPU preview uses WebGL2 where supported, with CPU/worker fallback. V2's approved D tonal model and Standard's conversion formulas are retained. Standard's color-response variants are settings within that engine, not separate engines.

## Import, precision and projects

RAW uses LibRaw/WASM in a worker with the existing demosaicing settings and one active-image decoded cache. RAF may show a clearly labelled approximate positive made from its embedded JPEG while RAW decodes. That disposable preview is never a source for technical analysis or export. Cancellation, replacement and failure guards prevent late jobs from owning a newer image.

TIFF supports the existing codec/ICC paths. Undeclared TIFF requires an explicit encoding assumption. Protected sRGB and linear Rec.2020 are the two RAW import modes. Native browser image decoding and JPEG encoding have device size/memory limits; JPEG may reduce size after encoder failure. PNG/TIFF preserve original working-source output dimensions. A 16-bit file cannot restore precision absent from an 8-bit source.

Projects now use **`filmlabb-roll-4`** with geometry version 2 and Editing 2.0. They store settings, references and geometry, not original image bytes. Re-import matching originals to reopen a project. Older project schemas, retired engine IDs and device-local image recipes are deliberately unsupported; import originals and create a new project. Appearance, language and preview-backend preferences remain device-local.

## Run locally

Use Node.js 22 (CI), npm and a static server:

```sh
npm ci
npm run build
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000`. Serve **`site/`**, not the source root: `app-manifest.mjs` maps source files to public scripts/workers and defines startup order. The build recreates the complete app and its versioned offline cache. The visible beta/development version follows [the existing release policy](docs/VERSIONS.md).

## Development and verification

```sh
npm run test:fast
npm run test:integration
npm run test:full
npm test -- --group color
npm run test:browser
npm run test:build
npm run test:benchmark
```

Set `FILMLABB_CHROMIUM_BIN` to an installed Chromium-family executable. The complete suite covers V2/D, Standard, current projects/queue, calibration, frame interaction, profiles, Editing 2.0, GPU/CPU, RAW/TIFF import and all export formats. Numeric oracles retain pre-consolidation Float64 output and 16-bit export hashes; expected pixels must not be regenerated to hide a cleanup regression.

[Architecture](docs/ARCHITECTURE.md), [testing](docs/TESTING.md), [settings/export](docs/SETTINGS_AND_EXPORT.md), [backlog](docs/FEATURE_BACKLOG.md) and [consolidation evidence](docs/consolidation/README.md) describe the active implementation. Earlier reports explicitly marked archival describe their own historical commits.

**Documentation rule:** a PR changing user behavior, defaults, architecture or features updates relevant documentation in the same PR. Review records documentation status. Trivial internal edits do not require unrelated documentation changes.

## Limitations

Automatic base/color estimates are not a spectral reconstruction of a film stock. Capture quality, clipping, low transmission and lighting remain important. Profiles are photographic prototypes, not certified emulsion matches. Preview is bounded; inspect original detail and final exports when judging precision. Fine rotation interpolates processed colors in linear display light; direct quarter turns retain exact source sampling.

Large images can exceed browser memory/canvas limits. The bounded Float64 export tile cache is retained; final blobs/ZIPs and native encoders still consume memory. The documented tests distinguish bounded RAW-derived previews from full-resolution RAW runs, Node timings from browser timings, and Linux WebKit/Edge from physical iPad Safari/Windows. Physical iPad verification of the range-interaction protections remains required.

Open [FILMLABB](https://axeltidehorn.github.io/negative-studio/) in a current WebAssembly-capable browser. Keep originals/projects separately; offline caching is not a backup. Report reproducible issues with commit, browser/device, input format, engine, settings and steps at [GitHub Issues](https://github.com/AxelTidehorn/negative-studio/issues).

## Licensing

**FILMLABB currently has no declared project license.** There is no root license file or license field granting general reuse rights. Public source availability does not by itself make the application freely reusable under an open-source license. Contact the owner about permission; this README does not choose a license for the project or its images/assets.

Dependency licenses are separate:

| Component | Declared/upstream license |
| --- | --- |
| [`libraw-wasm` 1.6.0](https://www.npmjs.com/package/libraw-wasm/v/1.6.0), runtime binding | Package metadata declares ISC; native library licenses apply separately. |
| [LibRaw](https://github.com/LibRaw/LibRaw) | Upstream offers [LGPL 2.1](https://github.com/LibRaw/LibRaw/blob/master/LICENSE.LGPL) or [CDDL 1.0](https://github.com/LibRaw/LibRaw/blob/master/LICENSE.CDDL). |
| [Little CMS](https://github.com/mm2/Little-CMS/blob/master/LICENSE), used by the RAW build | MIT. |
| [Playwright](https://github.com/microsoft/playwright/blob/main/LICENSE), development only | Apache 2.0; the installed browser has its own terms/notices. |

The repository includes a vendored decoder fallback as well as the npm dependency. Its existing binary distribution does not contain a complete third-party license inventory. Package metadata alone is not a redistribution audit of the WASM binary and its compiled components; consult applicable upstream source, notices and obligations before redistribution.
