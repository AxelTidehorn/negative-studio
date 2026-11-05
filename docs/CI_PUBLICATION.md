# One verified artifact for production Pages

`build.yml` now owns verification and production publication; the separate `pages.yml` is removed. The existing `build` job/check name and Pages environment remain. No repository settings, accounts, secrets or release policy changes are needed.

```
checkout event SHA + full history → setup-node/npm cache → npm ci
→ reuse installed Chrome (download only if unavailable)
→ full suite (including its normal build and browser/export/GPU checks)
→ seal tested site + report → upload FILMLABB-WASM
→ [successful main push/manual only] serialized deploy
→ download same-run artifact → verify bytes/commit/release identity
→ package those bytes for Pages → recheck current main → deploy
```

There is no build or npm/browser installation in the deploy job and no standalone build after tests. Full tests deliberately rebuild fixtures to verify cache invalidation/reproducibility; these checks remain. “Build once” means one verification pipeline and no replacement of the tested release artifact, not removal of the build-system tests.

## Guards and identity

- Both checkouts pin `github.sha`; full history in verification preserves the existing first-parent beta ordinal. Detached main builds still resolve the event's main identity through the established build-identity code.
- PR and non-main manual runs have read-only verification. Deployment requires successful `build`, the production repository, a main ref and a push/manual event. Only deploy gets Pages/OIDC permissions.
- The full runner records the finished site's SHA-256, source SHA and version after all tests, and refuses changed build inputs. `verified-artifact.mjs` requires the exact complete full-suite inventory (including GPU, export, compatibility and browser tests), successful statuses, unchanged input hash, clean build info and identical site bytes. The manifest travels alongside site in the artifact, outside the published directory.
- Deploy checks source SHA/version and every site byte, with a strict clean-main release requirement. It downloads from the same workflow run; no “latest artifact” lookup or rebuild can substitute another commit.
- Build concurrency cancels obsolete verification per ref. Deploy has a separate `pages` lock with cancellation disabled, shared with the old workflow during transition. The current-main guard runs **after artifact preparation, immediately before deploy**. An obsolete queued run skips publishing; a missing remote SHA fails closed. A commit arriving after the guard may briefly allow that in-flight deployment to finish, but the lock prevents an old deployment from overwriting a newer one. The new main's verified run follows.
- Manual runs use all the same gates. Re-running a workflow replaces its named artifact (`overwrite: true`); retrying a failed deploy can use the original successful same-run artifact. No mutable version counter is introduced.
- Offline/service-worker versioning is unchanged. Only the verified site is packaged for Pages, including build info, the generated cache worker, RAW/WASM resources and the complete normal precache manifest.

`FILMLABB-WASM` now contains `site/` plus `.cache/publication/verification.json`. The latter contains test metadata and hashes, not private images. To verify a downloaded bundle: `GITHUB_SHA=<exact SHA> node tools/verified-artifact.mjs verify <bundle-root>`; add `--release` for a main release.

## Measured baseline

Actual GitHub Actions timestamps are saved in [ci-publication-before.json](measurements/ci-publication-before.json). Primary comparison is merged UI #65, commit `f35a0df` (Build #211 / Pages #102). The previous commit #64 is also recorded to show runner variance. Queue/provisioning is separate from execution; timestamp resolution is one second.

| Stage | Build #211 | Pages #102 |
|---|---:|---:|
| Queue + provisioning | 4 s | 6 s |
| Checkout | 2 s | 2 s |
| Node setup | 1 s | <1 s |
| npm ci | 1 s | 1 s |
| Chromium preparation | 1 s | 1 s |
| Full suite, including build-system checks/build | 616 s | 595 s |
| Extra standalone build after tests | — | <1 s |
| Artifact upload | 2 s | 3 s |
| Pages deployment action | — | 44 s |
| Job execution | 627 s | 653 s |
| Event → workflow completion | 632 s | 660 s |

The full suite dominates; installs/browser preparation are already fast on hosted runners. Before, the same commit spent **1,211 seconds in two full-suite invocations**. Removing one eliminates duplicate verification work; npm caching and removal of the final rebuild are secondary. The older pair's full tests ranged 337–582 seconds on the same commit, so isolated timing improvements cannot be attributed to code without accounting for runner variance.

The historical Pages run's 660 seconds is event→deployment-workflow completion, **not** a retrospectively measured HTTPS availability time. Build time inside the old full-suite step cannot be separated precisely from its logs; the redundant standalone build is below one-second timestamp resolution in #102 (one second in #101).

After verification-job measurements will be recorded from this PR. Actual production deploy timings, cache-hit effects on a subsequent merge and merge→HTTPS availability require a merge and remain **unverified** in this unmerged PR. The 3–5 minute goal is not established; retaining the complete suite may keep execution above it. No GPU, browser, export or compatibility test is skipped to meet a time target.

## Validation

`tests/publication-artifact.mjs` checks complete-suite omissions/failures, wrong commit, tampered/added files, release identity, PR/manual/stale-main rejection and a valid artifact. `tests/publication-workflow.mjs` checks the single full-suite gate, permissions, checkout identity, artifact ordering and serialized final main guard. Existing release-version assertions retain all history/version tests and use these new pipeline checks instead of requiring the former same-job Pages structure.

Run `npm run test:full`, `npm run build`, `node tools/verified-artifact.mjs seal`, and `GITHUB_SHA=$(git rev-parse HEAD) node tools/verified-artifact.mjs verify .`. Actionlint 1.7.12 validates all repository workflows. A development artifact is intentionally rejected with `--release`.
