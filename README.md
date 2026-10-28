# FILMLABB

**A browser-based negative converter for analog photography.** FILMLABB turns camera captures and scans of film negatives into editable positive images, with film-frame detection, film-base calibration and JPEG or 16-bit TIFF export.

Processing runs locally in your browser. Original images are not uploaded to a processing service or modified. The workflow is built around photographing and converting negatives: technical film analysis comes first, followed by photographic adjustments and composition. FILMLABB is not a general-purpose RAW editor.

[Open the web app](https://axeltidehorn.github.io/negative-studio/) · [Report a problem](https://github.com/AxelTidehorn/negative-studio/issues) · [Architecture](docs/ARCHITECTURE.md)

## Status

The current development line is **FILMLABB 2.0 beta**, with V2 available as an experimental conversion engine in the main application. Standard remains the default. This is beta software; camera compatibility and image quality still need wider validation with real negatives and physical devices.

The existing footer shows the application version, branch and short commit SHA. The central beta policy in `package.json` generates a unique `2.0.0-beta.N` for each new main commit; rerunning the same commit keeps its version. Development builds include their commit and local-change status. See [versioning and active-code identification](docs/VERSIONS.md). App versions are separate from project and algorithm versions. Existing project formats remain supported; V2 projects use `negative-studio-roll-v2` (geometry version 1). Older script/settings names remain for compatibility. A hosted deployment may lag `main`; PR changes become public only after merge and successful deployment.

Free rotation and composition are integrated into preview and export. The optional **robust density** color mode, wide-gamut RAW import and flat-field correction remain experiments. Conversion Engine 3.0 adds **Curve, Density and Matrix** alongside unchanged **Original** and **Standard** references. These are bounded experiments requiring photographic evaluation, not proven improvements. **Editing 2.0 is the default for new images**, with a shared monotone tone curve, OKLab saturation and soft gamut limiting. Older projects retain their saved editing version; missing versions keep original editing.

## Features

| Area | Available behavior |
| --- | --- |
| Import | Local RAW, RGB/grayscale TIFF, JPEG, PNG and WebP; LibRaw/WASM decodes RAW in a worker. |
| Technical analysis | Automatic film-frame detection, manual edge correction and locking, film-base sampling, automatic calibration, optional two-neutral-patch and shared roll calibration. |
| Color conversion | Six choices: Original (`log39`), Standard (`calibrated4`), Curve, Density, Matrix and experimental V2. Standard remains the default; older algorithms remain for compatible projects. |
| Editing | Editing 2.0 for new images, original editing retained for older projects; exposure, contrast, gamma, black/white points, shadows/highlights, temperature, tint, saturation, creative color/monochrome profiles and print styles. |
| Preview | WebGL 2 acceleration for supported configurations; worker-based CPU rendering and a bounded main-thread fallback. V2 currently uses CPU with a bounded point-sampled preview; full-resolution export uses the original source. |
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

RAF embedded JPEG is used for thumbnails or as an explicit fallback after legacy RAW decoding fails; it is not presented as a full-quality RAW decode. V2 rejects that fallback as a technical negative source. TIFF without ICC needs a correct input declaration; V2 requires explicitly verified linear Rec.2020. RAW import has separate compatibility, protected sRGB and experimental Rec.2020 modes. Selecting V2 decodes the same original with its locked Rec.2020 recipe when necessary; incompatible source-domain calibration is not silently reused.

## How it works

**Import → Film frame detection → Negative conversion → Editing → Composition → Export**

1. Import up to five files. Only the selected image is decoded; inactive entries retain their files, settings and small thumbnails.
2. Check the detected film frame. Correct its edges if needed and confirm an uncertain detection. This rectangle defines the technical analysis region.
3. Use Standard conversion, or compare Original, Curve, Density, Matrix and experimental V2. Refine film-base measurements with the ordinary film-base tools. V2 requires its locked linear Rec.2020 source and a compatible base; its frozen technical response is separate from positive tone/color analysis. Roll calibration assumes consistent film and capture conditions.
4. Adjust the positive and optionally apply a creative profile. Creative edits do not feed back into technical film-base analysis.
5. Rotate, straighten or choose a composition. These operations do not recalibrate color. The queue-wide frame-crop choice determines whether the technical frame also limits export; each image keeps its own rotation and composition.
6. Export JPEG/TIFF or a batch. Save a project to resume the edits. To restore it later, first import the same original files, then load the JSON. Projects containing Editing 2.0 or the new conversion engines use versioned file tags that earlier builds reject safely.

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
| `src/conversion-v2/` | Existing density-based V2 core and main-platform binding, source/base/response/intent contracts, diagnostics and retained reference lab. |
| `src/editing/` | Versioned editing operators, creative profiles and print settings. |
| `src/render/`, `src/geometry/` | Preview scheduling/backends, coordinate transforms, composition and display presentation. |
| `src/export/` | Frozen geometry/color, bounded sampling stripes, encoding, filenames, batches and cancellation. |
| `src/app/`, `src/ui/`, `src/platform/` | Queue/projects, controls/layout/languages and offline lifecycle. |
| `tests/`, `tools/` | Regression fixtures, automated tests and explicit diagnostic/benchmark tools. |

Technical conversion and creative editing are distinct responsibilities within the existing pixel pipeline. Editing 2.0 runs after a frozen positive; its version is independent of negative conversion. Preview/export share color configuration and CPU definitions. Supported legacy GPU formulas are checked against CPU output; V2 currently uses the CPU/worker fallback. Geometry has its own shared coordinate model.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the call chain, state scope, resources and project compatibility, and [REFACTORING.md](docs/REFACTORING.md) for the cleanup inventory and deliberately retained legacy behavior.

### Comparing conversion engines

Choose **Original, Standard, Curve, Density, Matrix or V2 · experimental** with the image adjustments. Switching retains film frame and composition. Curve, Density and Matrix test bounded nonlinear channel curves, shared density presentation and a restrained color-channel transform. None is selected as a photographic winner. Use protected sRGB import for the existing five-way comparison.

V2 uses the existing density core, robust P60/P99 placement and bounded positive color balance. Its first selection may explicitly decode the same RAW again into linear Rec.2020; a base measured in protected sRGB must then be measured again. Standard/Curve/Density/Matrix can reuse that wide source, while Original requires sRGB re-decoding. V2 uses the ordinary base, editing, geometry, queue/project and export controls. See the [integration protocol and CPU-preview limitations](docs/V2_PLATFORM_INTEGRATION.md). The separate `v2.html` remains a reference and diagnostic tool.

Editing 2.0 runs after conversion for new images. The former editing selector is hidden; existing projects retain their own version and exact settings. Neutral 2.0 controls preserve the neutral adapter output; positive Shadows lifts and positive Highlights compresses. See [conversion algorithms, limitations and reference generation](docs/CONVERSION_3_EXPERIMENT.md) and [Editing 2.0](docs/EDITING2.md).

## Image quality and limitations

Film-base removal and channel calibration estimate a useful positive. They cannot exactly reconstruct the original scene: film response, development, exposure and the capture system all affect the result. Automatic calibration without measured neutral references is an estimate. Creative profiles are rendering choices, not certified reproductions of named film stocks.

Capture quality matters: use even, stable illumination, avoid clipped source channels, keep the film flat and in focus, and use consistent camera settings. Very low transmission, noise and clipped channels can produce unstable color. Robust density has synthetic regression coverage, but its benefit on the reported RAF photographs remains unverified.

Preview is bounded and can temporarily use lower resolution while adjusting controls. Use the original-detail panel to inspect source detail. Supported CPU/GPU implementations are tested within documented display precision; V2 has no GPU port yet. Its point-sampled preview can alias, while export processes the original with the existing geometric filter. An 8-bit preview and native JPEG encoding are not a 16-bit TIFF reference. Free rotation interpolates processed colors in linear display light; unchanged quarter turns preserve exact direct export. Existing preview/downscale aliasing and real-photo validation remain areas for investigation.

JPEG may reduce dimensions to fit browser/device limits or after encoder failure. TIFF uses working-source resolution and 16-bit output; it cannot recover precision lost in an 8-bit input. Large browser-decoded images may also be limited at import. Striped export bounds intermediate buffers, but final TIFF/ZIP data and the native JPEG canvas/encoder still require memory.

## Development and testing

```sh
npm run test:fast                # small numerical/reference checks
npm run test:integration         # engines, projects, CPU/GPU and exports
npm run test:full                # complete regression + build + browsers
npm test                         # historical sequential Node command
npm test -- --group color        # focused tests
npm test -- --group projects
npm run build
npm run test:build               # clean output, asset/cache consistency
npx playwright install chromium
npm run test:browser             # verified build, shared Chromium process
npm run test:benchmark           # explicit measurements, separate from tests
```

Set `FILMLABB_CHROMIUM_BIN=/path/to/chromium` to reuse an installed browser. Node fixtures cover historical color output, project migrations, calibration, RAW/TIFF import, geometry and export sampling. Browser suites exercise the actual UI, CPU/GPU, detail view, workers, export errors/cancellation, batch/ZIP and service-worker updates. Expected pixels are not changed to accommodate accidental regressions. Real-camera diagnostics require external files and are separate from the self-contained suite.

See [test levels and process/build reuse](docs/TESTING.md). For comparable conversion measurements, run the same driver against frozen and candidate checkouts sequentially:

```sh
FILMLABB_CHROMIUM_BIN=/path/to/chromium \
  node tools/benchmark-conversion3.mjs /path/to/checkout /tmp/results.json 7
```

[Maintenance measurements and findings](docs/MAINTENANCE.md) distinguish elapsed times, deterministic work/allocation counts and device-validation limits.

Bug reports should include the commit/deployment, browser/OS/device, format and camera/compression if relevant, import mode, engine/A-B choice, reproduction steps and expected/actual behavior. A reproducible fixture and project JSON help; share photographs only with permission. Use existing module owners and the manifest for changes, add a targeted regression and run relevant tests/build. Preserve older project results and keep intentional algorithm changes separate from maintenance.

## Roadmap

- **Current work:** evaluate V2 alongside the five retained engines in the main application using real negatives and physical devices, while preserving legacy results. Known V2 blue/cyan color and highlight limitations remain; integration is not a new photographic-quality validation.
- **Further development:** use photographic evaluation to decide which conversion and editing refinements are justified. No experimental conversion winner or next release is promised.
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

### V2 reference lab

After build, `v2.html` retains the isolated A/B lab, technical/fixed views,
step diagnostics and JPEG/RGB16-TIFF references. Normal V2 conversion, editing,
projects and export use the main app; opening the lab is optional. See the
[lab protocol](docs/CONVERSION_V2.md), [main-platform integration](docs/V2_PLATFORM_INTEGRATION.md)
and [recorded image-quality evidence](docs/V2_STAGE1_IMAGE_QUALITY.md).
