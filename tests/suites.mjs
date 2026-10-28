/* Directly tracked tests, grouped by responsibility. Optional real-photo checks
   remain explicit check-real-*/
export const nodeSuites={
 application:['ui-controls.mjs','conversion3-neutral.mjs','conversion3-integration.mjs','check-app-integration.mjs','check-smoke.mjs','architecture.mjs','maintenance-lifecycle.mjs'],
 projects:['check-project39.mjs','check-project4.mjs','beta6-project.mjs'],
 color:['conversion-v2-balance.mjs','conversion-v2-tone.mjs','conversion-v2.mjs','conversion-v2-analysis.mjs','conversion-v2-fast.mjs','conversion3-artifacts.mjs','conversion3-numeric.mjs','conversion3-reference.mjs','editing-engine.mjs','check-profiles-next.mjs','check-color-engine.mjs','check-beta38.mjs','check-beta39.mjs','check-beta4.mjs','check-reference38.mjs','check-export-snapshot38.mjs','check-comparison.mjs','check-compatibility-next.mjs','color-boundary-investigation.mjs','standard-engine-experiment.mjs','color-ab.mjs'],
 calibration:['image-quality-experiments.mjs','image-diagnostics.mjs','film-base2.mjs','film-base2-detection.mjs','film-base2-roll.mjs','check-manual-frame.mjs','check-source-analysis.mjs','check-source-border.mjs'],
 import:['raw-chain-quality.mjs','raf-preview-io.mjs','check-raw-fixture.mjs','check-raw-support.mjs','check-next.mjs'],
 geometry:['beta6-geometry.mjs','preview-geometry.mjs'],
 export:['check-export-plan.mjs','check-tiff-codec.mjs','check-export-tiff-perf.mjs','presentation-sampling.mjs','presentation-worker.mjs','stability-export.mjs','downscale-investigation.mjs'],
 performance:['preview-area.mjs','check-preview-performance.mjs'],
 platform:['test-infrastructure.mjs','ui-i18n.mjs','check-i18n-static.mjs','stability-cache.mjs']
};
export const browserTests=['build-version-browser.mjs','conversion-v2-balance-browser.mjs','conversion-v2-tone-browser.mjs','conversion-v2-diagnostics-browser.mjs','conversion-v2-photographic-browser.mjs','conversion-v2-worker-browser.mjs','v2-preview.mjs','conversion-v2-browser.mjs','image-quality-browser.mjs','ui3-browser.mjs','ui3-viewport-browser.mjs','film-base2-browser.mjs','film-base2-performance-browser.mjs','ui-202-browser.mjs','ui-stability-browser.mjs','conversion3-browser.mjs','ui-ux-browser.mjs','check-workflow-browser.mjs','check-next-browser.mjs','check-gpu-browser.mjs','check-mobile-order.mjs','stability-browser.mjs','beta6-browser.mjs','beta6-complete-browser.mjs','quality-workflow-browser.mjs','standard-engine-browser.mjs','color-ab-browser.mjs','maintenance-browser.mjs','editing-browser.mjs'];
export const selectors={
 browser:browserTests,workflow:['check-workflow-browser.mjs'],next:['check-next-browser.mjs'],
 tiff:['check-tiff-codec.mjs','check-export-tiff-perf.mjs'],gpu:['check-gpu-browser.mjs']
};
