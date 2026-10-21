/* Recreate the versioned test tree during CI so browser uploads need root files only. */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const suite=JSON.parse(fs.readFileSync(new URL('./test-suite.json',import.meta.url),'utf8'));
if(suite.format!=='filmlabb-test-suite-v1')throw Error('Unknown test suite version');
for(const [name,data] of Object.entries(suite.files)){
 if(!name.startsWith('tests/')||name.includes('..')||name.includes('\\'))throw Error('Invalid bundled test path');
 fs.mkdirSync(path.dirname(name),{recursive:true});fs.writeFileSync(name,Buffer.from(data,'base64'));
}
for(const file of ['smoke.mjs','color-engine.mjs','app-integration.mjs','beta38.mjs','beta39.mjs','beta4.mjs','project4.mjs','project39.mjs','reference38.mjs','export-snapshot38.mjs','raw-fixture.mjs','raw-support.mjs','comparison.mjs']){
 const result=spawnSync(process.execPath,['tests/'+file],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status||1);
}
