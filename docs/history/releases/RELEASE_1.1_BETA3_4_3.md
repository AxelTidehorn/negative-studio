# FILMLABB 1.1 Beta 3.4.3

- JPEG export and batch JPEG use shared JPEG encoding path and a capped 12 MP encode surface.
- JPEG now reports encoding failures instead of silently doing nothing.
- CI `npm test` executes a vetted regression gate; older/obsolete tests retained in `npm run test:legacy` and are **not all green**.
- Existing TIFF import formats unchanged; other TIFFs may still not import.
- `npm test` passed locally. Full `npm run build` could not be run in this environment because the `libraw-wasm` install was unavailable here; GitHub CI must install dependencies.
