# Maintenance, performance and validation

Baseline: `main` **e0a7052** (merged architecture PR #24), frozen in a separate
checkout before application changes. No new dependencies, processing stages,
color formulas, sample positions or quantization rules are introduced.

## Reproduced problems and changes

| Finding on frozen main | Targeted change and regression evidence |
| --- | --- |
| A second `importRoll` can replace queue/settings while the first file is still decoding. | Reject replacement while decoding/exporting. The test pauses the real decode boundary and attempts a second import. |
| An old thumbnail loop can resume against a replacement queue, refresh its UI and process its remaining files redundantly. | Capture the imported queue identity; stop before/after each thumbnail await if it changes. No decoded-image queue cache is added. |
| TIFF reference decoding snapshots global source metadata before an await; on completion it can restore the previous image's metadata over the active image. | Decode first, then perform the temporary metadata substitution synchronously. Browser test deliberately changes metadata while the decoder is paused. Existing source/mode guards still reject stale references. |
| Browser-image onload processing errors resolve rather than reject; the temporary canvas is not explicitly released. | Propagate the original error and release the temporary canvas/object URL in `finally`. Regression injects a finishImport failure. |
| An identical completed CPU preview is recalculated; only active/pending requests were deduplicated. | Repaint the existing last result for the same source/version, mode, limit and serialized color configuration. This also preserves geometry/context-restoration repainting. Changed settings/source/mode invalidate reuse. No second image cache is added. |
| GPU renderer retains its previous preview source and full source texture after a failed switch; CPU also retains its completed result. Presentation can retain a split-negative cache/texture while the next image loads. | Release source/result references and shrink the GPU source texture at reset; clear presentation caches at selection. Keep the compiled GPU program. CDP GC + WeakRef proves the old source becomes collectible after an injected import failure; subsequent rendering/upload reuse still works. |
| Presentation uniform locations are queried on every draw. Failed program initialization also leaves allocated shaders/program/texture undeleted. | Cache locations for the existing program and clean up on initialization error. Real WebGL tests count lookups/deletions. Shader text remains unchanged. |
| Both active JPEG paths allocate a fresh RGBA ImageData for every stripe. | Reuse one regular stripe and, if needed, one shorter final stripe per attempt. Worker protocol tests snapshot writes and verify exact pixels across 54 color/geometry/input cases. Native fallback tests compare every pre-encode pixel and count allocations. Cancellation/failure still releases the attempt/worker. |

GPU preview now shares the same configuration snapshot between eligibility and
draw within one call instead of building it three times. Asynchronous callbacks
still obtain fresh configuration. CPU-only calls retain the original short circuit.
This is a reduction in parameter preparation, not a new global configuration cache.

## Measurement method

`tools/benchmark-maintenance.mjs CHECKOUT OUTPUT_JSON 7` runs the same browser
driver against each checkout's built `site/`, sequentially. Both use the same
installed Chromium, fixture, host and software WebGL backend; this is not an iPad
or physical GPU benchmark. Seven samples are retained with median/min/max, not
just a best case. The CPU/export probes exclude their first warm-up. Native
encoder/JIT/worker-startup and host scheduling introduce variation.

The repeated-CPU probe issues six identical completed requests; it measures a
cache opportunity, **not six distinct slider edits**. The presentation probe runs
100 small draws with a final `gl.finish()`. JPEG forces the actual main-thread
fallback and counts native ImageData allocations. Import/switch measurements
include browser automation and wait for current-source presentation availability.
RAW timings use the small synthetic DNG and actual LibRaw worker, not a camera-sized
RAF. Separate actual worker slider bursts record first feedback and idle detail.
A 25-switch session records CDP heap/backing storage after explicit GC; native
canvas, encoder and GPU allocations are outside that metric.

## Recorded results

Chromium **154.0.8037.57**, Linux, ANGLE/SwiftShader software Vulkan. Baseline
`e0a7052`; performance candidate `d984473` (later changes add import-drag guarding,
CPU-result release on selection and tests/docs). Values are milliseconds:
**median [minimum–maximum]**, seven samples per checkout.

| Probe | Frozen main | Candidate | Interpretation |
| --- | ---: | ---: | --- |
| Six identical completed CPU requests | 521.6 [484.9–650.2] | 192.0 [132.7–455.9] | Actual color renders fall from 6 to 1; existing pixels still repaint. About 63% lower median for this repeated-request scenario. |
| 100 small presentation draws | 1.7 [1.2–5.3] | 1.5 [0.4–13.1] | No reliable elapsed-time gain at this scale. Native uniform lookups fall from 1,100 each sample to 11 on the first sample and 0 thereafter. |
| JPEG main-thread fallback | 211.8 [208.5–435.8] | 247.3 [227.4–1265.0] | No speed gain demonstrated. ImageData allocations fall from 20 to 2 per export; pre-encode pixels are exact. |
| TIFF | 110.3 [104.5–132.5] | 183.9 [119.0–286.6] | Writer/sampling unchanged. This noisy run is slower; no TIFF acceleration is claimed. |
| PNG import → current preview | 1310.5 [729.3–2110.6] | 1102.2 [646.4–1863.4] | Overlapping variation; no general import speed claim. |
| Selected image switch → preview | 2462.0 [2170.6–3376.8] | 2676.0 [2131.0–3384.3] | Overlapping variation; no switch speed claim. |
| Synthetic DNG decode/dispose | 255.8 [187.5–521.1] | 176.3 [164.3–325.9] | Decoder unchanged; startup/host variation, not evidence of faster real RAW. |
| CPU slider burst → first feedback | 47.5 [41.7–226.7] | 59.8 [44.9–139.3] | Existing interactive queue remains responsive; no measured speed gain established. |
| Last slider input → idle detail | 985.2 [931.3–1030.9] | 1146.8 [937.5–2152.8] | Includes unchanged 650 ms idle timer plus worker/render/delivery time. Slower sample set; device tuning remains open. |

The benefits established independently of elapsed-time noise are fewer color
calculations for identical completed requests, fewer native parameter lookups,
and fewer export allocations. The GPU configuration-count regression observes
one fresh configuration per direct draw versus three on frozen main. These are
small bounded changes; the data do **not** demonstrate an overall faster editor
or faster exports. In particular, the slower TIFF/JPEG/slider measurements must
not be hidden or described as improvements. More repeated, controlled physical
device measurements are needed to assess those latency differences.

After 25 successful image switches, CDP used JS heap grows by 106,284 bytes on
baseline and 106,256 bytes on candidate; backing storage grows by 4 bytes in both
(about 12.68 MB retained). This sample does not establish a normal-session memory
reduction or prove absence of every leak. Separate forced-failure GC tests show
that previous GPU sources and CPU results become collectible; on frozen main they
remain reachable. GPU texture/presentation cleanup is verified by lifecycle/API
checks, not a measured native GPU-memory peak. JPEG's allocation count measures
churn, not total encoder or ZIP memory.

Raw samples: [baseline](measurements/maintenance-baseline.json) and
[candidate](measurements/maintenance-candidate.json).

## Investigated and deliberately unchanged

- **650 ms CPU detail delay:** interactive work already starts after 16 ms and
  explicit change/release requests detail immediately. GPU uses its existing
  frame scheduling and 180 ms idle delay. The worker cancels old detail when a
  new gesture begins. Desktop/software measurements cannot establish a better
  touch-pause threshold for iPad; no arbitrary replacement/adaptive system is added.
- **Worker source transfers:** an immutable source copy is sent once per worker
  source version, never with each slider job. Terminating expensive stale work
  can require another copy into its replacement worker; transferring ownership
  of the original would break source/export ownership. No protocol rewrite.
- **RAW and queue:** active-file-only decode, bounded RAF header/JPEG slice reads,
  decoder disposal and the five-image limit remain. No full decoded cache for
  inactive files is introduced. Real camera-sized decode/peak memory needs files
  and devices unavailable to this run.
- **Color tables/parameters:** existing technical lookup reuse remains. No changes
  to color kernels, calibration, profiles, flat-field coordinates, CPU/GPU shader
  formulas or historical pixel fixtures.
- **GPU:** source identity/version caching already avoids texture uploads for
  slider edits; no added readback, processing pass or full-size buffer.
- **Export:** TIFF stripes already preserve progress/cancel opportunities and
  exact 16-bit pixels. TIFF parts and final ZIP/JPEG storage remain necessary
  with the current browser download/encoder APIs. Output stripes, input stripe
  transport, retry budgets, native encoding and batch policy are unchanged.
- **Projects and presentation:** no project schema/default migrations, crop,
  interpolation, downscale filtering or original-detail sampling changes.
- **Service worker/build:** existing content hash, complete precache, coherent
  upgrade policy and GitHub Pages entry points are retained.

## Documentation and remaining limits

README is now an English user/developer introduction with current Beta 6 status,
actual features/formats and camera-evidence limits, workflow, local/build commands,
architecture links, image-quality limits, tests, contribution guidance, realistic
roadmap and license status. There is no declared FILMLABB reuse license. npm
metadata declares libraw-wasm ISC and Playwright Apache-2.0; upstream LibRaw and
Little CMS have separate licenses. A complete audit of the existing vendored
WASM's compiled components/notices is still needed before claiming distribution
compliance. No project license was invented.

Physical iPad Safari, Windows/Edge, full-size real RAW memory and the reported
RAF color artifacts remain unverified. Timing noise and software WebGL prevent
claims about physical GPU speed or universal import/export acceleration.

## Final verification

- Frozen baseline: **37/37 Node groups** (Node 24.19.0) and **10/10 browser
  groups** (Chromium 154.0.8037.57), plus dependency installation/build.
- Candidate: **38/38 Node groups** in Node 22.23.3 and **11/11 browser groups**
  in Chromium 154.0.8037.57; production build and build/cache tests pass.
- [GitHub CI](https://github.com/AxelTidehorn/negative-studio/actions/runs/40345369318)
  independently passes clean checkout/npm ci, all 38 Node groups, build/cache
  tests, all 11 browser groups (Chrome 155.0.8059.39) and artifact upload.
- Running the added browser checks against frozen main reproduces eight failures:
  metadata restoration, GPU/CPU retention, redundant configuration/color work,
  per-stripe allocations, failed GPU initialization cleanup and uniform lookups.
  The restored GPU source-upload cache already passes there and stays unchanged.
- Existing exact historical color/legacy-project, RAW/TIFF, calibration, geometry,
  CPU/GPU/detail, export/cancel/fallback/batch and service-worker checks pass.
  The 192 frozen color-configuration comparisons and 54 worker-protocol pixel
  cases retain their previous expected values. No fixture expectations changed.
- `src/color/`, `src/image/`, `src/calibration/`, RAW conversion, geometry math
  and presentation sampling are unchanged from the frozen baseline. Both GPU
  shader texts compare byte-for-byte equal. All README relative links resolve;
  the Pages URL is confirmed through the repository's Pages configuration.

The maintenance branch changes no workflows, dependencies or public asset names.
CI supplies clean-checkout verification; the hosted main deployment is not
published or merged by this PR.
