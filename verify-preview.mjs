import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const suite=JSON.parse(fs.readFileSync(new URL('./slider-regression-suite.json',import.meta.url),'utf8'));
if(suite.format!=='filmlabb-test-suite-v1')throw Error('Unknown test suite version');
for(const [name,data] of Object.entries(suite.files)){
 if(!name.startsWith('tests/')||name.includes('..')||name.includes('\\'))throw Error('Invalid bundled test path');
 fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,Buffer.from(data,'base64'));
}
const allTests=['check-raw-support.mjs','check-next.mjs','check-smoke.mjs','check-color-engine.mjs','check-beta38.mjs','check-beta39.mjs','check-beta4.mjs','check-reference38.mjs','check-export-snapshot38.mjs','check-comparison.mjs','check-source-analysis.mjs','check-compatibility-next.mjs','check-source-border.mjs','check-preview-performance.mjs','check-tiff-codec.mjs','check-export-tiff-perf.mjs'];
const selected=process.argv.includes('--next')?['check-next-browser.mjs']:process.argv.includes('--tiff')?['check-tiff-codec.mjs','check-export-tiff-perf.mjs']:process.argv.includes('--gpu')?['check-gpu-browser.mjs']:allTests;
for(const file of selected){
 console.log('RUN TEST '+file);const result=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});
 if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);
}
