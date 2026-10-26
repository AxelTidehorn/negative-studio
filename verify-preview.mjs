import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const allTests=['check-app-integration.mjs','check-project39.mjs','check-project4.mjs','check-profiles-next.mjs','check-manual-frame.mjs','check-i18n-static.mjs','check-raw-fixture.mjs','check-export-plan.mjs','check-raw-support.mjs','check-next.mjs','check-smoke.mjs','check-color-engine.mjs','check-beta38.mjs','check-beta39.mjs','check-beta4.mjs','check-reference38.mjs','check-export-snapshot38.mjs','check-comparison.mjs','check-source-analysis.mjs','check-compatibility-next.mjs','check-source-border.mjs','check-preview-performance.mjs','check-tiff-codec.mjs','check-export-tiff-perf.mjs'];
const selected=process.argv.includes('--browser')?['check-workflow-browser.mjs','check-next-browser.mjs','check-gpu-browser.mjs','check-mobile-order.mjs']:process.argv.includes('--workflow')?['check-workflow-browser.mjs']:process.argv.includes('--next')?['check-next-browser.mjs']:process.argv.includes('--tiff')?['check-tiff-codec.mjs','check-export-tiff-perf.mjs']:process.argv.includes('--gpu')?['check-gpu-browser.mjs']:allTests;
let failures=0;
const files=selected.map(file=>'tests/'+file);
if(process.argv.includes('--browser'))files.push('tests/stability-browser.mjs','tests/beta6-browser.mjs','tests/beta6-complete-browser.mjs','tests/quality-workflow-browser.mjs','tests/standard-engine-browser.mjs','tests/color-ab-browser.mjs');
if(selected===allTests)files.push('tests/beta6-geometry.mjs','tests/beta6-project.mjs','tests/presentation-sampling.mjs','tests/presentation-worker.mjs','tests/preview-geometry.mjs','tests/color-boundary-investigation.mjs','tests/standard-engine-experiment.mjs','tests/color-ab.mjs','tests/stability-export.mjs','tests/stability-cache.mjs','tests/downscale-investigation.mjs');
for(const file of files){
 console.log('RUN TEST '+file);const result=spawnSync(process.execPath,[file],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0){console.error('TEST FAILURE',file,result.status,result.signal);failures++;}
}
console.log(`${files.length-failures}/${files.length} test groups passed`);
if(failures)process.exitCode=1;
