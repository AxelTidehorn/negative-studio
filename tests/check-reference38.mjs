import {readSource} from './helpers/source.mjs';
/* Fixtures generated from the unmodified 3.7 source, not the new implementation. */
import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness();h.run('scheduleRender=()=>{};render=()=>{};');let worst=0;
for(const {encoding,profile,p,expected} of JSON.parse(readSource('tests/fixtures/reference37.json','utf8'))){h.set('sourceInfo',{encoding,label:'test'});h.set('globalThis.p',p);h.run(`state={...defaultState(),engine:'reference',exposure:.2,gamma:.95,temperature:12,tint:-7,saturation:1.2,shadows:20,highlights:-17};base=[210,130,65];legacyLevels={lo:[.02,.04,.03],hi:[.8,.75,.65]};levels=legacyLevels;rollShared.profile='${profile}';rollShared.print='soft';rollShared.strength=.7;`);const actual=h.run('technicalPositive(p,state)');worst=Math.max(worst,...actual.map((v,c)=>Math.abs(v-expected[c])));}
assert.ok(worst<1e-12,`3.7 reference changed by ${worst}`);console.log('PASS unchanged 3.7 reference: 30 fixture cases, max error',worst);
