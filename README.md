# FILMLABB

**A browser-based negative converter for analog photography.** FILMLABB turns camera captures and scans of film negatives into editable positive images, with film-frame detection, film-base calibration and JPEG or 16-bit TIFF export.

Processing runs locally in your browser. Original images are not uploaded to a processing service or modified. The workflow is built around photographing and converting negatives: technical film analysis comes first, followed by photographic adjustments and composition. FILMLABB is not a general-purpose RAW editor.

[Open the web app](https://axeltidehorn.github.io/negative-studio/) · [Report a problem](https://github.com/AxelTidehorn/negative-studio/issues) · [Architecture](docs/ARCHITECTURE.md)

## Status

The current development line is **FILMLABB 1.1 Beta 6**, including the subsequent color-engine experiments, architecture refactoring and maintenance changes. This is beta software; camera compatibility and image quality still need wider validation with real negatives and physical devices.

The version is identified by the [Beta 6 integration documentation](docs/BETA6_COMPLETE.md) and the active project format, `negative-studio-roll-beta6` (geometry version 1). There is no separate stable release number in `package.json`. Older names in public script URLs and saved settings are retained for compatibility and do not identify the current application version. A hosted deployment may lag `main`; the source commit identifies the code used in a local build.

Free rotation and composition are integrated into preview and export. The optional **robust density** color mode, wide-gamut RAW import and flat-field correction remain experiments. Editing 2.0 is now an opt-in experiment with a shared monotone tone curve, OKLab saturation and soft gamut limiting. It is not the default and needs photographic/device evaluation.

## Features

| Area | Available behavior |
| --- | --- |
| Import | Local RAW, RGB/grayscale TIFF, JPEG, PNG and WebP; LibRaw/WASM decodes RAW in a worker. |
| Technical analysis | Automatic film-frame detection, manual edge correction and locking, film-base sampling, automatic calibration, optional two-neutral-patch and shared roll calibration. |
| Color conversion | Standard calibrated engine and Comparison engine; older algorithms remain available when loading compatible projects. Standard has explicit original/current/experimental A/B choices. |
| Editing | Original editing or opt-in Editing 2.0; exposure, contrast, gamma, black/white points, shadows/highlights, temperature, tint, saturation, creative color/monochrome profiles and print styles. |
| Preview | WebGL 2 acceleration for supported configurations; worker-based CPU rendering and a bounded main-thread fallback. Interactive feedback and final detail are rendered separately. |
| Original detail | A separate 100%/200% view samples a small region of the working original, before presentation rotation. It does not change calibration. |
| Composition | Quarter turns plus fine rotation, straighten by drawing a line, optional composition crop and thirds grid. Rotation limits output to a valid area without empty corners. |
| Queue | Up to **five images**; only the active image is decoded. Per-image edits and geometry coexist with roll-wide profile, print and frame-crop settings. |
| Export | JPEG with worker/main-thread fallback and size limits; RGB 16-bit TIFF with embedded sRGB profile; JPEG ZIP and selected-image TIFF batch export, progress, cancellation and error reporting. |
| Projects | JSON settings/metadata save and restore, including supported older project formats. Original image files are not embedded. |
| Preferences | Theme, preview backend, grid and interface language: Swedish, English, French, Spanish and German. |
| Offline | A service worker caches the built app and decoder assets on HTTPS/localhost. After a complete online installation, the cached version can reopen offline. Browser storage eviction can remove it. |

### File and camera compatibility

An accepted extension is a routing decision, **not a camera compatibility guarantee**. Actual RAW support depends on the camera, compression, bundled LibRaw build and available browser memory.

| Input | Current status and evidence |
| --- | --- |
| DNG | Active RAW route. Automated tests decode the included synthetic DNG with actual LibRaw/WASM and check known linear samples. This does not validate every DNG variant. |
| Fujifilm RAF, Sony ARW | Active RAW routes. RAF embedded-JPEG thumbnail/fallback handling is tested separately. The fixture set is not a validated list of Fujifilm or Sony camera models. |
| Nikon NEF, Canon CR2/CR3, Panasonic RW2 | Accepted through LibRaw but marked experimental by the file policy; camera-specific validation remains necessary. |
| TIFF | Tests cover 8-/16-bit RGB and grayscale, strip/tile and planar layouts, supported orientation, uncompressed/LZW/PackBits/Deflate paths, and ICC handling. Unsupported layouts or profiles can still fail. |
| JPEG, PNG, WebP | Browser decoding and color management; rendered 8-bit sources rather than RAW sensor data. |

No comprehensive camera-model certification is maintained. The reported blue/violet artifacts in two original RAF files have **not** been verified as fixed: those originals were unavailable for the recorded investigation. See [the evidence and limitations](docs/BETA6_QUALITY_WORKFLOW.md) and [the Standard-engine A/B experiment](docs/STANDARD_COLOR_AB.md).

RAF embedded JPEG is used for thumbnails or as an explicit fallback after RAW decoding fails; it is not presented as a full-quality RAW decode. TIFF without ICC needs a correct sRGB/linear input assumption. RAW import has separate compatibility, protected sRGB and experimental Rec.2020 modes; changing it reloads the image and resets its source calibration.

## How it works

**Import → Film frame detection → Negative conversion → Editing → Composition → Export**

1. Import up to five files. Only the selected image is decoded; inactive entries retain their files, settings and small thumbnails.
2. Check the detected film frame. Correct its edges if needed and confirm an uncertain detection. This rectangle defines the technical analysis region.
3. Use Standard conversion, or compare the earlier automatic engine. Automatic film-base/color estimates can be refined with measured film-base or neutral references. Roll calibration assumes consistent film and capture conditions.
4. Adjust the positive and optionally apply a creative profile. Creative edits do not feed back into technical film-base analysis.
5. Rotate, straighten or choose a composition. These operations do not recalibrate color. The queue-wide frame-crop choice determines whether the technical frame also limits export; each image keeps its own rotation and composition.
6. Export JPEG/TIFF or a batch. Save a project to resume the edits. To restore it later, first import the same original files, then load the JSON. Projects containing Editing 2.0 use a new file tag that older app builds reject safely.

## Getting started

### Hosted application

Open [FILMLABB on GitHub Pages](https://axeltidehorn.github.io/negative-studio/) in a current browser with WebAssembly support. iPad Safari and Windows/Edge are target environments. Chromium automation is part of development; it does not replace physical-device testing. CPU fallback remains available without usable WebGL 2. Large images can exceed browser memory or canvas limits even on a supported device.

Keep originals and downloaded projects separately. A cached offline app or local preferences are not an image/project backup.

### Run locally

Use Node.js **22** (the CI version), npm and a static HTTP server:

```sh
git clone https://github.com/AxelTidehorn/negative-studio.git
cd negative-studio
npm ci
npm run build
python3 -m http.server 8000 --directory site
```

Open `http://localhost:8000`. **`site/` is the built web application. Do not serve the source root directly:** public script/worker filenames are assembled from `src/` by the build. The build recreates `site/`, copies decoder assets and generates a content-versioned offline cache. No application server or bundler is required. Publish the complete `site/` directory over HTTPS; the existing GitHub Actions workflows build the same output for GitHub Pages.

## Architecture overview

`app-manifest.mjs` defines the source-to-public-asset mapping and actual startup order. The app uses classic browser scripts and existing shared session bindings; the source directories group responsibilities without introducing a framework.

| Source area | Responsibility |
| --- | --- |
| `src/import/`, `src/image/` | File routing, RAW/TIFF decoding, source pixels and flat-field data. |
| `src/calibration/`, `src/color/` | Film-frame analysis, versioned conversion engines, color configuration and shared CPU/GPU parameters. |
| `src/editing/` | Creative profiles and print settings. |
| `src/render/`, `src/geometry/` | Preview scheduling/backends, coordinate transforms, composition and display presentation. |
| `src/export/` | Frozen geometry/color, bounded sampling stripes, encoding, filenames, batches and cancellation. |
| `src/app/`, `src/ui/`, `src/platform/` | Queue/projects, controls/layout/languages and offline lifecycle. |
| `tests/`, `tools/` | Regression fixtures, automated tests and explicit diagnostic/benchmark tools. |

Technical conversion and creative editing are distinct responsibilities within the existing pixel pipeline. Editing 2.0 runs after a frozen original positive through a compatibility adapter; its version is independent of negative conversion. Preview/export share color configuration and CPU definitions; the GPU shader implements corresponding formulas and is checked against CPU output. Geometry has its own shared coordinate model.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the call chain, state scope, resources and project compatibility, and [REFACTORING.md](docs/REFACTORING.md) for the cleanup inventory and deliberately retained legacy behavior.

### Comparing Editing 2.0

Choose **Original editing** or **Editing 2.0 (experimental)** above the existing sliders. The choice is per image and does not change calibration or the conversion engine. Neutral 2.0 controls preserve the original neutral output exactly; the same non-neutral numbers can have different visual strength. In 2.0, positive Shadows lifts and positive Highlights compresses. Original keeps its earlier behavior. See [algorithm, project and evaluation details](docs/EDITING2.md).

## Image quality and limitations

Film-base removal and channel calibration estimate a useful positive. They cannot exactly reconstruct the original scene: film response, development, exposure and the capture system all affect the result. Automatic calibration without measured neutral references is an estimate. Creative profiles are rendering choices, not certified reproductions of named film stocks.

Capture quality matters: use even, stable illumination, avoid clipped source channels, keep the film flat and in focus, and use consistent camera settings. Very low transmission, noise and clipped channels can produce unstable color. Robust density has synthetic regression coverage, but its benefit on the reported RAF photographs remains unverified.

Preview is bounded and can temporarily use lower resolution while adjusting controls. Use the original-detail panel to inspect source detail. CPU/GPU implementations are tested within documented display precision; an 8-bit preview and native JPEG encoding are not a 16-bit TIFF reference. Free rotation interpolates processed colors in linear display light; unchanged quarter turns preserve exact direct export. Existing preview/downscale aliasing and real-photo validation remain areas for investigation.

JPEG may reduce dimensions to fit browser/device limits or after encoder failure. TIFF uses working-source resolution and 16-bit output; it cannot recover precision lost in an 8-bit input. Large browser-decoded images may also be limited at import. Striped export bounds intermediate buffers, but final TIFF/ZIP data and the native JPEG canvas/encoder still require memory.

## Development and testing

```sh
npm test                         # all Node groups
npm test -- --group color        # focused tests
npm test -- --group projects
npm run build
npm run test:build               # clean output, asset/cache consistency
npx playwright install chromium
npm run test:browser             # builds, then browser integration tests
```

Set `FILMLABB_CHROMIUM_BIN=/path/to/chromium` to reuse an installed browser. Node fixtures cover historical color output, project migrations, calibration, RAW/TIFF import, geometry and export sampling. Browser suites exercise the actual UI, CPU/GPU, detail view, workers, export errors/cancellation, batch/ZIP and service-worker updates. Expected pixels are not changed to accommodate accidental regressions. Real-camera diagnostics require external files and are separate from the self-contained suite.

For comparable maintenance measurements, build frozen and candidate checkouts and run the same driver sequentially:

```sh
FILMLABB_CHROMIUM_BIN=/path/to/chromium \
  node tools/benchmark-maintenance.mjs /path/to/checkout /tmp/results.json 7
```

[Maintenance measurements and findings](docs/MAINTENANCE.md) distinguish elapsed times, deterministic work/allocation counts and device-validation limits.

Bug reports should include the commit/deployment, browser/OS/device, format and camera/compression if relevant, import mode, engine/A-B choice, reproduction steps and expected/actual behavior. A reproducible fixture and project JSON help; share photographs only with permission. Use existing module owners and the manifest for changes, add a targeted regression and run relevant tests/build. Preserve older project results and keep intentional algorithm changes separate from maintenance.

## Roadmap

- **Current work:** maintain existing engines, improve stability/resource use, and validate color/RAW behavior with reproducible images and devices.
- **Planned development area:** photographic evaluation and refinement of experimental Editing 2.0 while keeping creative editing separate from conversion. No default-version change is promised.
- **Ideas requiring investigation:** broader camera/device reference coverage and improved downscale filtering. These are not promised release features.

No version or delivery date is committed here for future editing features.

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
