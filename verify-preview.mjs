import {spawnSync} from 'node:child_process';
import {nodeSuites,selectors} from './tests/suites.mjs';
const selector=Object.keys(selectors).find(name=>process.argv.includes('--'+name));
const groupIndex=process.argv.indexOf('--group'),group=groupIndex>=0?process.argv[groupIndex+1]:null;
if(groupIndex>=0&&!nodeSuites[group])throw Error('Unknown test group: '+group);
const files=(selector?selectors[selector]:group?nodeSuites[group]:Object.values(nodeSuites).flat()).map(file=>'tests/'+file);
if(new Set(files).size!==files.length)throw Error('Duplicate test entry');
let failures=0;
for(const file of files){
 console.log('RUN TEST '+file);const result=spawnSync(process.execPath,[file],{stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0){console.error('TEST FAILURE',file,result.status,result.signal);failures++;}
}
console.log(`${files.length-failures}/${files.length} test groups passed`);
if(failures)process.exitCode=1;
