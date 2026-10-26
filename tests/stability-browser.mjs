import {readSource,sourcePath} from './helpers/source.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import http from 'node:http';import {chromium} from 'playwright';
let version=1,broken=false;
const worker=()=>readSource('cache-worker.js','utf8').replace(/const CACHE='[^']+';/,`const CACHE='filmlabb-browser-${version}';`).replace(/const ASSETS=\[[^;]+;/,"const ASSETS=['./','./index.html','./module.js'];");
const server=http.createServer((req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const name=new URL(req.url,'http://localhost').pathname;
 if(name==='/cache-worker.js'){res.setHeader('Content-Type','text/javascript');res.end(worker());}
 else if(name==='/module.js'){res.setHeader('Content-Type','text/javascript');res.statusCode=broken?503:200;res.end(`globalThis.moduleVersion=${version};`);}
 else{res.setHeader('Content-Type','text/html');res.end(`<body data-version="${version}"><script src="./module.js"></script><script>navigator.serviceWorker.register('./cache-worker.js',{updateViaCache:'none'});</script></body>`);}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||undefined,args:['--no-sandbox']});
try{
 const context=await browser.newContext(),url='http://127.0.0.1:'+server.address().port+'/';
 let page=await context.newPage();page.setDefaultTimeout(20000);await page.goto(url);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
 assert.deepEqual(await page.evaluate(()=>[document.body.dataset.version,moduleVersion]),['1',1]);
 await page.evaluate(()=>caches.open('unrelated-test-cache'));
 version=2;broken=true;
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await new Promise(async(resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('update timeout')),15000);r.addEventListener('updatefound',()=>{const w=r.installing;w.addEventListener('statechange',()=>{if(w.state==='redundant'){clearTimeout(timeout);resolve();}});},{once:true});await r.update();});});
 await page.reload();assert.deepEqual(await page.evaluate(()=>[document.body.dataset.version,moduleVersion]),['1',1]);
 await context.setOffline(true);await page.reload();assert.deepEqual(await page.evaluate(()=>[document.body.dataset.version,moduleVersion]),['1',1]);await context.setOffline(false);
 console.log('PASS real browser: failed update retains complete version 1 online and offline');
 version=3;broken=false;
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
 await page.reload();assert.deepEqual(await page.evaluate(()=>[document.body.dataset.version,moduleVersion]),['1',1]);
 await page.close();
 page=await context.newPage();await page.goto(url);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 // Navigation may race activation; the next navigation must use the complete new version.
 await page.reload();assert.deepEqual(await page.evaluate(()=>[document.body.dataset.version,moduleVersion]),['3',3]);
 assert.ok(await page.evaluate(()=>caches.has('unrelated-test-cache')));
 console.log('PASS real browser: update waits for open client; new client gets coherent version 3; unrelated cache preserved');
 await context.close();
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
