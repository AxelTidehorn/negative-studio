/* Recreate the versioned test tree during CI so browser uploads need root files only. */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const suite=JSON.parse(fs.readFileSync(new URL('./frame-regression-suite.json',import.meta.url),'utf8'));
if(suite.format!=='filmlabb-test-suite-v1')throw Error('Unknown test suite version');
for(const [name,data] of Object.entries(suite.files)){
 if(!name.startsWith('tests/')||name.includes('..')||name.includes('\\'))throw Error('Invalid bundled test path');
 fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,Buffer.from(data,'base64'));
}
for(const file of ['check-smoke.mjs','check-color-engine.mjs','check-app-integration.mjs','check-beta38.mjs','check-beta39.mjs','check-beta4.mjs','check-project4.mjs','check-project39.mjs','check-reference38.mjs','check-export-snapshot38.mjs','check-raw-fixture.mjs','check-raw-support.mjs','check-comparison.mjs','check-profiles-next.mjs','check-source-analysis.mjs','check-compatibility-next.mjs','check-source-border.mjs','check-manual-frame.mjs']){
 console.log('RUN TEST '+file);const result=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0){console.error('TEST FAILURE',file,result.status,result.signal,result.error);process.exit(result.status||1);}
}
