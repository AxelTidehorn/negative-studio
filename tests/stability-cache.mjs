import {readSource,sourcePath} from './helpers/source.mjs';
import {assets} from '../app-manifest.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function setup(fail=false){
 const listeners={},entries=new Map(),deleted=[],requests=[];
 const cache={async add(r){requests.push(r);if(fail)throw Error('fixture offline');entries.set(typeof r==='string'?r:r.url,new Response('asset'));},async put(r,v){entries.set(typeof r==='string'?r:r.url,v);},async match(r){return entries.get(typeof r==='string'?r:r.url);}};
 const context={console:{warn(){}},Request,Response,URL,location:{origin:'https://fixture.test'},fetch:async()=>{throw Error('offline');},caches:{open:async()=>cache,keys:async()=>['unrelated-cache','filmlabb-previous'],delete:async k=>deleted.push(k),match:async()=>undefined},self:{registration:{scope:'https://fixture.test/app/'},addEventListener:(k,fn)=>listeners[k]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}}};
 vm.runInNewContext(readSource('cache-worker.js','utf8').replace('const ASSETS=[];', 'const ASSETS='+JSON.stringify(['./','./index.html',...Object.keys(assets).map(f=>'./'+f)])+';'),context);return {listeners,requests,deleted,entries};
}
let failures=0;
for(const [name,fn] of [
 ['failed precache rejects installation',async()=>{const h=setup(true);let p;h.listeners.install({waitUntil:x=>p=x});await assert.rejects(p,/fixture offline/);}],
 ['precache bypasses HTTP cache',async()=>{const h=setup();let p;h.listeners.install({waitUntil:x=>p=x});await p;assert.ok(h.requests.length>20);assert.ok(h.requests.every(r=>r.cache==='reload'));}],
 ['activation preserves unrelated origin caches',async()=>{const h=setup();let p;h.listeners.activate({waitUntil:x=>p=x});await p;assert.ok(!h.deleted.includes('unrelated-cache'));}],
 ['navigation uses the installed shell offline',async()=>{const h=setup();let p;h.listeners.install({waitUntil:x=>p=x});await p;let response;h.listeners.fetch({request:{method:'GET',url:'https://fixture.test/app/',mode:'navigate'},respondWith:x=>response=x});assert.ok(await response);}],
]){try{await fn();console.log('PASS',name);}catch(e){failures++;console.error('FAIL',name,e.message);}}
if(failures)process.exitCode=1;
