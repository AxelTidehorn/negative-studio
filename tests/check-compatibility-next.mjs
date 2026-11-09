/* Old creative projects intentionally stop at the new outer format gate. */
import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness();h.run("roll=[{file:{name:'a.tif'},settings:defaultState(),selected:true}];activeFrame=0;");const before=h.run('JSON.stringify({roll,state,rollShared})');
for(const format of ['negative-studio-roll-v08','negative-studio-roll-beta3','negative-studio-roll-beta6','negative-studio-roll-v2','negative-studio-roll-edit2-vibrance1']){await h.elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify({format,frames:[],profile:'gold',print:'soft'})}]}});assert.equal(h.run('JSON.stringify({roll,state,rollShared})'),before);assert.match(h.elements.get('status').textContent,/FILMLABB 3/);}
console.log('PASS retired creative project formats reject before state/queue mutation');
