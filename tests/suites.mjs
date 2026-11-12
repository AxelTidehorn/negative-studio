/* Directly tracked tests, grouped by responsibility. Optional real-photo checks
   remain explicit check-real-*/
export const nodeSuites={
 application:['analysis-consolidation.mjs','rgb-histogram.mjs','ui-controls.mjs','check-smoke.mjs','architecture.mjs','maintenance-lifecycle.mjs'],
 projects:['v2-default.mjs','cleanup-project.mjs'],
 color:['profile-system.mjs','conversion-v2-photographic-color.mjs','conversion-v2-photographic-tone.mjs','conversion-v2-render3.mjs','conversion-v2-balance.mjs','conversion-v2-tone.mjs','conversion-v2-reconstruction.mjs','v2-presentation-review.mjs','v2-scene-tone-review.mjs','v2-approved-d.mjs','v2-gpu-cache.mjs','editing-vibrance.mjs','v2-presentation.mjs','v2-response-versioning.mjs','v2-platform-numeric.mjs','release-version.mjs','conversion-v2-fast.mjs','editing-engine.mjs','standard-calibration.mjs','export-snapshot.mjs'],
 calibration:['frame-selection.mjs','frame-contours.mjs','frame-analysis-polygon.mjs','frame-boundaries.mjs','image-diagnostics.mjs','film-base2.mjs','film-base2-detection.mjs','film-base2-roll.mjs','check-manual-frame.mjs'],
 import:['tiff-unit-float.mjs','import-recovery.mjs','raw-chain-quality.mjs','raf-preview-io.mjs','check-raw-fixture.mjs','check-raw-support.mjs','check-next.mjs'],
 geometry:['geometry.mjs','preview-geometry.mjs'],
 export:['presentation-cache.mjs','png-export.mjs','jpeg-export-pixels.mjs','tiff-header.mjs','check-export-plan.mjs','check-tiff-codec.mjs','check-export-tiff-perf.mjs','presentation-sampling.mjs','presentation-worker.mjs','stability-export.mjs','downscale-investigation.mjs'],
 performance:['preview-area.mjs','check-preview-performance.mjs'],
 platform:['publication-artifact.mjs','publication-workflow.mjs','v2-platform-state.mjs','test-infrastructure.mjs','ui-i18n.mjs','check-i18n-static.mjs','stability-cache.mjs']
};
export const browserTests=['frame-review-browser.mjs','range-touch-browser.mjs','frame-corners-browser.mjs','import-proof-layout-browser.mjs','export-responsive-browser.mjs','import-latency-browser.mjs','profile-system-browser.mjs','settings-export-browser.mjs','ui-motion-d2-browser.mjs','ui-motion-browser.mjs','amber-glass-browser.mjs','v2-default-browser.mjs','v2-gpu-browser.mjs','vibrance-browser.mjs','rgb-editor-browser.mjs','v2-platform-base-browser.mjs','cleanup-source-browser.mjs','cleanup-ui-browser.mjs','v2-platform-browser.mjs','v2-platform-source-browser.mjs','build-version-browser.mjs','film-base2-browser.mjs','film-base2-performance-browser.mjs','ui-stability-browser.mjs','check-gpu-browser.mjs','check-mobile-order.mjs','stability-browser.mjs','geometry-browser.mjs','geometry-complete-browser.mjs','quality-workflow-browser.mjs','standard-engine-browser.mjs','maintenance-browser.mjs','editing-browser.mjs'];
export const styleNodeTests=['ui-controls.mjs','test-infrastructure.mjs','ui-i18n.mjs'];
export const styleBrowserTests=['amber-glass-browser.mjs','ui-stability-browser.mjs'];
export const selectors={
 browser:browserTests,workflow:['frame-review-browser.mjs'],next:['profile-system-browser.mjs'],
 tiff:['check-tiff-codec.mjs','check-export-tiff-perf.mjs'],gpu:['check-gpu-browser.mjs','v2-gpu-browser.mjs']
};
