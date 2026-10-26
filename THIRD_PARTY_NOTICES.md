# Third-party licenses and distribution review

This document is a **provisional inventory**, not an assertion that the precompiled WASM decoder has completed a component-level distribution audit. The project itself is AGPL-3.0-only; third-party rights are not relicensed.

| Component | Role | Currently established license | Verification status |
| --- | --- | --- | --- |
| libraw-wasm 1.6.0 | Runtime JS wrapper and decoder packaging | npm lockfile reports ISC | Wrapper declaration checked; packaged binary composition **not audited** |
| LibRaw | RAW decoding within WASM build | LGPL-2.1 **or** CDDL-1.0 (upstream alternative licenses) | Need version/source provenance, license election and obligations for actual bundled build |
| Little CMS | ICC/color handling reportedly used by decoder | MIT (upstream) | Need to confirm bundled version, exact code and include notices |
| Playwright / playwright-core 1.64.1 | Development / testing only | Apache-2.0 | Declared in npm lockfile; browsers downloaded for testing have separate notices |

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

This list records confirmed upstream declarations and open questions; it does not replace the individual notices required for the exact bundled artifacts.
