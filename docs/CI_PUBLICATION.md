# One verified artifact for production Pages

`build.yml` owns verification and publication. It checks out the exact event SHA with full history, installs locked dependencies, runs the selected level, and seals the exact tested `site/` bytes. Deploy downloads that same-run artifact and verifies it; it never installs, renders or rebuilds the application.

## Levels and publication

- PRs and main pushes use **full**. Manual Actions runs offer **fast**, **full** and **extended**. See [TESTING](TESTING.md) for coverage.
- Fast is short Node verification only: no browser preparation, artifact sealing/upload or deployment. A successful fast report is explicitly rejected as publication evidence.
- Full/extended include the build and browser checks. Their complete registration, successful statuses, source/input identity and exact site SHA-256 must match before an artifact is sealed. The previous style-only publication exception is removed.
- PRs and non-main manual runs never deploy. Main publication requires successful full/extended verification, the production repository, a main ref and a push or explicitly selected manual event. Only deploy gets Pages/OIDC permissions.

## Artifact and race guards

`FILMLABB-WASM` contains `site/` plus `.cache/publication/verification.json`, outside the published directory. The record contains test metadata and hashes, not private images. The source commit, version, clean build identity and every site byte must match. Missing/duplicate/failed tests and added/modified post-test files are rejected.

Build concurrency cancels obsolete verification per ref. Deploy uses the serialized `pages` lock with cancellation disabled. After artifact preparation it rechecks current main immediately before publication: obsolete queued runs skip, a missing SHA fails closed. A newer commit arriving after this check can allow an already-running deployment to finish; serialization then lets the newer verified run follow.

Release identity still follows the existing first-parent beta policy. Offline cache/WASM packaging is unchanged. No mutable version counter or latest-artifact lookup is introduced.

## Local verification

```sh
npm run test:full
node tools/verified-artifact.mjs seal full
GITHUB_SHA=$(git rev-parse HEAD) node tools/verified-artifact.mjs verify .
```

Use `test:extended` and `seal extended` for expanded verification. Do **not** rebuild, change source or change HEAD between testing and sealing. `--release` is only valid for a clean main release; development artifacts are intentionally rejected.

`tests/test-infrastructure.mjs` owns build fingerprints, registration integrity, workflow/publication conditions and artifact tamper tests. `release-version`, `stability-build`, browser build identity and offline/service-worker tests retain their separate functional responsibilities.

## Measurements and history

[Test-suite cleanup measurements](TEST_SUITE_CLEANUP.md) distinguish local paired timings, CI job execution, test-step time and runner variance. There is no measured historical fast CI pair. Physical deployment/HTTPS availability is not inferred from test or job duration.

The earlier publication consolidation and its two-pipeline measurements remain in the [immutable PR #99 documentation](https://github.com/AxelTidehorn/negative-studio/blob/f78a0314480072a723f97ce3f1a5aeffae008353/docs/CI_PUBLICATION.md). Historical reproduction tools and reports are read from that checkout, rather than kept as compatibility layers in current CI.
