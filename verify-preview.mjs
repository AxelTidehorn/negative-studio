import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const suite=JSON.parse(fs.readFileSync(new URL('./slider-regression-suite.json',import.meta.url),'utf8'));
if(suite.format!=='filmlabb-test-suite-v1')throw Error('Unknown test suite version');
for(const [name,data] of Object.entries(suite.files)){
 if(!name.startsWith('tests/')||name.includes('..')||name.includes('\\'))throw Error('Invalid bundled test path');
 fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,Buffer.from(data,'base64'));
}
const allTests=['check-app-integration.mjs','check-project39.mjs','check-project4.mjs','check-profiles-next.mjs','check-manual-frame.mjs','check-i18n-static.mjs','check-raw-fixture.mjs','check-export-plan.mjs','check-raw-support.mjs','check-next.mjs','check-smoke.mjs','check-color-engine.mjs','check-beta38.mjs','check-beta39.mjs','check-beta4.mjs','check-reference38.mjs','check-export-snapshot38.mjs','check-comparison.mjs','check-source-analysis.mjs','check-compatibility-next.mjs','check-source-border.mjs','check-preview-performance.mjs','check-tiff-codec.mjs','check-export-tiff-perf.mjs'];
const selected=process.argv.includes('--browser')?['check-workflow-browser.mjs','check-next-browser.mjs','check-gpu-browser.mjs','check-mobile-order.mjs']:process.argv.includes('--workflow')?['check-workflow-browser.mjs']:process.argv.includes('--next')?['check-next-browser.mjs']:process.argv.includes('--tiff')?['check-tiff-codec.mjs','check-export-tiff-perf.mjs']:process.argv.includes('--gpu')?['check-gpu-browser.mjs']:allTests;
let failures=0;
const files=selected.map(file=>'tests/'+file);
if(process.argv.includes('--browser'))files.push('test/stability-browser.mjs','test/beta6-browser.mjs','test/beta6-complete-browser.mjs','test/quality-workflow-browser.mjs','test/standard-engine-browser.mjs');
if(selected===allTests)files.push('test/beta6-geometry.mjs','test/beta6-project.mjs','test/presentation-sampling.mjs','test/presentation-worker.mjs','test/preview-geometry.mjs','test/color-boundary-investigation.mjs','test/standard-engine-experiment.mjs','test/stability-export.mjs','test/stability-cache.mjs','test/downscale-investigation.mjs');
for(const file of files){
 console.log('RUN TEST '+file);const result=spawnSync(process.execPath,[file],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0){console.error('TEST FAILURE',file,result.status,result.signal);failures++;}
}
console.log(`${files.length-failures}/${files.length} test groups passed`);
if(failures)process.exitCode=1;
