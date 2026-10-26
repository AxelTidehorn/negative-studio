# Third-party licenses and distribution review

This document is a **provisional inventory**, not an assertion that the precompiled WASM decoder has completed a component-level distribution audit. The project itself is AGPL-3.0-only; third-party rights are not relicensed.

| Component | Role | Currently established license | Verification status |
| --- | --- | --- | --- |
| libraw-wasm 1.6.0 | Runtime JS wrapper and decoder packaging | npm lockfile reports ISC | Wrapper declaration checked; packaged binary composition **not audited** |
| LibRaw | RAW decoding within WASM build | LGPL-2.1 **or** CDDL-1.0 (upstream alternative licenses) | Need version/source provenance, license election and obligations for actual bundled build |
| Little CMS | ICC/color handling reportedly used by decoder | MIT (upstream) | Need to confirm bundled version, exact code and include notices |
| Playwright / playwright-core 1.64.1 | Development / testing only | Apache-2.0 | Declared in npm lockfile; browsers downloaded for testing have separate notices |

## Verified upstream build provenance

The upstream [libraw-wasm v1.6.0 source](https://github.com/ybouane/LibRaw-Wasm/tree/v1.6.0) declares ISC in its package metadata and includes `compileLibraw.sh` and `build.js`. Its build script:

- clones **LibRaw tag 0.22.1** and **Little CMS tag lcms2.19.1**;
- statically builds `libraw.a` and `liblcms2.a` with Emscripten;
- invokes Emscripten with `USE_LIBJPEG=1`, `USE_LIBPNG=1`, `USE_ZLIB=1`, threads and SIMD;
- links these with `libraw_wrapper.cpp` to produce the JavaScript/WASM runtime bundle.

FILMLABB's `package-lock.json` pins npm `libraw-wasm@1.6.0` with an integrity hash, and `build-root.mjs` **copies every file** under `node_modules/libraw-wasm/dist` into `site/libraw/dist` by default, or uses `vendor/libraw/dist` if npm output is unavailable. This means WASM and its loader are conveyed to web users, not only executed server-side.

The build provenance **does not establish** that the checked-in `vendor/libraw/dist` bytes and npm tarball bytes are identical, nor does it prove the exact Emscripten-port versions actually built into the distributed binary. Binary checksums, build artifact inventories, source corresponding to the deployed bits and component-level compliance still need verification.

**Chosen policy for LibRaw:** Review the **LGPL-2.1 option** for this distribution first, rather than relying on the CDDL alternative. The actual linking/combined-work consequences must still be resolved, including a practical way to modify/rebuild/relink the statically linked WASM library. Upstream provides full build scripts, but the presence of scripts alone does not establish compliance.

The upstream LibRaw 0.22.1 COPYRIGHT also identifies third-party code including dcraw-derived source, DCB/FBDD (3-clause BSD-like), X3F (BSD-style) and Adobe DNG SDK components (MIT). Determine which objects are actually linked and preserve their required notices. Emscripten's libjpeg, libpng and zlib ports have their own license texts and provenance requirements.

## Compliance tasks for the vendored WASM distribution

1. Locate **every** included copy of the WASM binary and its JavaScript loader in both npm and checked-in/vendor distribution paths; calculate hashes and confirm which files GitHub Pages publishes.
2. Identify the precise **libraw-wasm** package origin and source/build instructions. Capture the authoritative ISC license text and copyright notice for the runtime wrapper.
3. Establish LibRaw version and any patches, choose the actual applicable upstream license for its compiled code, and check the obligations of that election (including source availability and, for LGPL where applicable, user modification/relinking mechanics).
4. Produce a complete inventory of other statically linked or embedded parts: Little CMS, decoding codecs, demosaicing implementations, C/C++ runtime code and any transitive dependencies. Verify their actual licenses from their bundled sources, not from package metadata alone.
5. Preserve required upstream copyright notices and distribute the relevant full license texts; record exact corresponding sources and build/reproduction instructions as applicable.
6. Review whether the combined WASM work and its distribution satisfy **all** licenses and the AGPL terms. If uncertainty remains, seek qualified licensing advice before making broad distribution-compliance claims.
7. Ensure the served website exposes the FILMLABB AGPL source link/notice prominently, and that any required third-party notices/source information accompanies the shipped artifacts.

## Sources

- [FILMLABB project LICENSE](LICENSE)
- [GNU AGPLv3 official text](https://www.gnu.org/licenses/agpl-3.0.html)
- [LibRaw license explanation](https://www.libraw.org/about)
- [LibRaw LGPL text](https://github.com/LibRaw/LibRaw/blob/master/LICENSE.LGPL)
- [LibRaw CDDL text](https://github.com/LibRaw/LibRaw/blob/master/LICENSE.CDDL)
- [Little CMS licensing](https://www.littlecms.com/color-engine/)
- [Playwright LICENSE](https://github.com/microsoft/playwright/blob/main/LICENSE)

The deployed application now includes a visible project source/AGPL link and copies LICENSE and this provisional notice inventory into its build and offline cache. This list records confirmed upstream declarations and open questions; it does not replace the individual notices required for the exact bundled artifacts.
