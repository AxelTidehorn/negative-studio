/* Directly tracked tests, grouped by responsibility. Optional real-photo checks
   remain explicit check-real-*/
export const nodeSuites={
 application:['source-lifecycle.mjs','analysis-consolidation.mjs','rgb-histogram.mjs','ui-controls.mjs','architecture.mjs'],
 projects:['v2-default.mjs','cleanup-project.mjs'],
 color:['profile-system.mjs','conversion-v2-photographic-color.mjs','conversion-v2-photographic-tone.mjs','conversion-v2-render3.mjs','conversion-v2-balance.mjs','conversion-v2-tone.mjs','conversion-v2-reconstruction.mjs','v2-approved-d.mjs','v2-gpu-cache.mjs','editing-vibrance.mjs','v2-presentation.mjs','v2-response-versioning.mjs','v2-platform-numeric.mjs','release-version.mjs','conversion-v2-fast.mjs','editing-engine.mjs','standard-calibration.mjs','export-snapshot.mjs','numeric-regression.mjs'],
 calibration:['frame-selection.mjs','frame-detection.mjs','frame-analysis-polygon.mjs','image-diagnostics.mjs','film-base2.mjs','film-base2-detection.mjs','film-base2-roll.mjs','check-manual-frame.mjs'],
 import:['tiff-unit-float.mjs','import-recovery.mjs','raw-chain-quality.mjs','raf-preview-io.mjs','check-raw-fixture.mjs','check-raw-support.mjs','flat-field.mjs'],
 geometry:['geometry.mjs','preview-geometry.mjs'],
 export:['presentation-cache.mjs','png-export.mjs','jpeg-export-pixels.mjs','tiff-header.mjs','check-export-plan.mjs','check-tiff-codec.mjs','check-export-tiff-perf.mjs','presentation-sampling.mjs','presentation-worker.mjs','stability-export.mjs'],
 performance:['preview-area.mjs','check-preview-performance.mjs'],
 platform:['v2-platform-state.mjs','test-infrastructure.mjs','ui-i18n.mjs','stability-cache.mjs']
};
export const browserTests=['frame-review-browser.mjs','range-touch-browser.mjs','frame-corners-browser.mjs','import-proof-layout-browser.mjs','export-responsive-browser.mjs','import-latency-browser.mjs','profile-system-browser.mjs','settings-export-browser.mjs','ui-motion-d2-browser.mjs','ui-motion-browser.mjs','amber-glass-browser.mjs','v2-default-browser.mjs','v2-gpu-browser.mjs','vibrance-browser.mjs','rgb-editor-browser.mjs','v2-platform-base-browser.mjs','cleanup-source-browser.mjs','cleanup-ui-browser.mjs','v2-platform-browser.mjs','v2-platform-source-browser.mjs','build-version-browser.mjs','film-base2-browser.mjs','ui-stability-browser.mjs','check-gpu-browser.mjs','stability-browser.mjs','geometry-browser.mjs','geometry-complete-browser.mjs','quality-workflow-browser.mjs','standard-engine-browser.mjs','maintenance-browser.mjs','editing-browser.mjs'];

// Three execution levels, one registration owner. Extended includes full.
export const levels={
 fast:{node:['architecture.mjs','ui-controls.mjs','ui-i18n.mjs','v2-approved-d.mjs','numeric-regression.mjs','import-recovery.mjs','test-infrastructure.mjs'],browser:[]},
 full:{node:Object.values(nodeSuites).flat(),browser:browserTests},
 extended:{node:Object.values(nodeSuites).flat(),browser:[...browserTests,'film-base2-performance-browser.mjs']}
};

// External originals / measurement tools; deliberately manual, not silent omissions.
export const manualTests=['check-real-arw.mjs','check-decode-benchmark.mjs','check-raf-dng-pair.mjs'];
