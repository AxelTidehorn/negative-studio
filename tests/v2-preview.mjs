import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
import {ensureBuild} from '../tools/build-artifact.mjs';
import {preparePreview} from '../tools/prepare-v2-preview.mjs';
import {launchBrowser} from './helpers/browser-runtime.mjs';
ensureBuild();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'filmlabb-preview-')),preview=path.join(dir,'preview'),production=path.resolve('site');
fs.cpSync(production,preview,{recursive:true});
const before=fs.readFileSync(path.join(production,'cache-worker.js'),'utf8'),commit=JSON.parse(fs.readFileSync(path.join(production,'build-info.json'),'utf8')).sourceCommit,metadata=preparePreview(preview,commit);
assert.equal(metadata.sourceCommit,commit);assert.equal(metadata.offlineCache,false);
assert.equal(fs.readFileSync(path.join(production,'cache-worker.js'),'utf8'),before,'production worker must stay byte-identical');
for(const file of ['v2.html','v2-reference.html','v2-reference-isolation.js','v2-reference-bridge.js','v2-reference-client.js','v2-core.js','v2-lab.js','raw-decoder.js','libraw/dist/index.js','libraw/dist/worker.js','libraw/dist/libraw.wasm'])assert.deepEqual(fs.readFileSync(path.join(preview,file)),fs.readFileSync(path.join(production,file)),'preserve resource '+file);
assert.throws(()=>preparePreview(preview,'invalid'));
assert.throws(()=>preparePreview(preview,'f'.repeat(40)),/revision differs/);
const workflow=fs.readFileSync('.github/workflows/v2-preview.yml','utf8');
assert.match(workflow,/if: github.repository == 'AxelTidehorn\/negative-studio-v2-preview'/);
assert.match(workflow,/ref: feat\/filmlabb-v2-prototype/);assert.ok(!workflow.includes('secrets.'));
const missing=[],errors=[],mime={'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm','.json':'application/json','.png':'image/png','.css':'text/css'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),prefix=u.pathname.startsWith('/negative-studio-v2-preview/')?'/negative-studio-v2-preview/':'/negative-studio/',root=prefix.includes('v2-preview')?preview:production;
 const relative=u.pathname.slice(prefix.length)||'index.html',file=path.resolve(root,relative);
 if(!u.pathname.startsWith(prefix)||!file.startsWith(root+path.sep)){res.writeHead(404);res.end();return;}
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{missing.push(u.pathname);res.writeHead(404);res.end();}
});
let browser;
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 browser=await launchBrowser({headless:true,args:['--no-sandbox']});const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/negative-studio/');await page.evaluate(async()=>{const registration=await navigator.serviceWorker.ready;if(registration.active.state!=='activated')await new Promise(resolve=>registration.active.addEventListener('statechange',()=>{if(registration.active.state==='activated')resolve();}));await caches.open('filmlabb-production-sentinel');});
 const originalRegistrations=await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).map(r=>r.scope));
 await page.goto(origin+'/negative-studio-v2-preview/index.html');await page.waitForLoadState('networkidle');
 assert.deepEqual(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).map(r=>r.scope)),originalRegistrations);
 assert.ok(await page.evaluate(async()=>(await caches.keys()).includes('filmlabb-production-sentinel')));
 await page.goto(origin+'/negative-studio-v2-preview/v2.html');await page.waitForFunction(()=>globalThis.NSV2Lab);
 await page.locator('#file').setInputFiles('tests/fixtures/synthetic-negative.dng');await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Källa laddad'));
 await page.waitForFunction(()=>NSV2Lab.getSnapshot().reference?.kind==='fresh-automatic-application');
 await page.locator('summary').filter({hasText:'Ingen användbar filmkant?'}).evaluate(e=>e.parentElement.open=true);await page.locator('#prior').click();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('A/B klart'));
 assert.equal(await page.evaluate(()=>NSV2Lab.getSnapshot().source.colorSpace),'rec2020');
 assert.equal(await page.locator('#comparison').inputValue(),'photo');
 const pending=page.waitForEvent('download');await page.locator('#tiff').click();assert.equal((await pending).suggestedFilename(),'filmlabb-v2.tif');
 assert.ok(await page.evaluate(async()=>(await caches.keys()).includes('filmlabb-production-sentinel')));
 assert.deepEqual(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).map(r=>r.scope)),originalRegistrations);
 assert.deepEqual(missing,[]);assert.deepEqual(errors,[]);
 console.log('PASS isolated preview path: scripts, real RAW/WASM worker, v2 TIFF export; production SW/cache and build unchanged');
}finally{if(browser)await browser.close();if(server.listening)await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
