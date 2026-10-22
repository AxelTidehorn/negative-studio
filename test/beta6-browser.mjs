import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const root=path.resolve('site'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname,p=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({serviceWorkers:'block'}),errors=[];page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 const buffer=fs.readFileSync('demo-negative.png');await page.locator('#imageFile').setInputFiles([{name:'a.png',mimeType:'image/png',buffer},{name:'b.png',mimeType:'image/png',buffer}]);
 await page.waitForFunction(()=>roll.length===2&&working&&!rollLoading);
 const result=await page.evaluate(async()=>{
  state.cropConfirmed=true;cropRegion={x:.1,y:.125,w:.8,h:.75};state.response4=null;analyzeLevels();saveCurrentFrame();
  let downloaded;downloadBlob=(blob,name)=>downloaded={blob,name};
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).join(',');
  const tiff=async()=>{await exportTiff();return hash(await downloaded.blob.arrayBuffer());};
  const cases=[];
  for(const crop of [false,true])for(const q of [0,90,180,270]){
   state.cropExport=crop;state.rotation=q;saveCurrentFrame();
   roll[0].geometry=NSGeometry.create(q);
   const original=await tiff(),analysis=FILMLABB_PERFORMANCE.snapshot().analyses,settings=JSON.stringify(state),frame=JSON.stringify(cropRegion);
   setCompositionCrop(0,{cx:-.1,cy:.05,w:.6,h:.5});roll[0].geometry.rotation.fineDegrees=17.25;
   const composed=await tiff();
   cases.push({q,crop,identical:original===composed,noAnalysis:analysis===FILMLABB_PERFORMANCE.snapshot().analyses,noSettings:settings===JSON.stringify(state)&&frame===JSON.stringify(cropRegion)});
  }
  const a=await jpegBytes();setCompositionCrop(0,null);roll[0].geometry.rotation.fineDegrees=-14.5;const b=await jpegBytes();
  $('saveSettings').onclick();const project=JSON.parse(await downloaded.blob.text());
  return {cases,jpegIdentical:await hash(a)===await hash(b),project};
 });
 assert.ok(result.cases.every(c=>c.identical&&c.noAnalysis&&c.noSettings),JSON.stringify(result.cases));assert.equal(result.jpegIdentical,true);
 assert.equal(result.project.geometryVersion,1);assert.equal(result.project.frames[0].geometry.rotation.fineDegrees,-14.5);
 console.log('PASS browser: eight native TIFF exports preserve exact bytes for full/cropped 0/90/180/270°, no extra analysis; JPEG ignores dormant fine/composition geometry');
 await page.locator('#settingsFile').setInputFiles({name:'beta6.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(result.project))});
 await page.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('matchades'));
 assert.equal(await page.evaluate(()=>roll[0].geometry.rotation.fineDegrees),-14.5);
 const snapshot=()=>page.evaluate(()=>JSON.stringify({state,roll:roll.map(f=>({settings:f.settings,crop:f.crop,geometry:f.geometry})),rollShared,cropRegion,name:$('exportName').value,activeFrame}));
 const before=await snapshot(),bad=structuredClone(result.project);bad.exportNaming.prefix='must-not-apply';bad.profile='gold';bad.frames[0].settings.exposure=2;bad.frames[1].geometry.compositionCrop={cx:Infinity,cy:0,w:2,h:1};
 await page.locator('#settingsFile').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
 await page.waitForFunction(()=>$('status').textContent.startsWith('Projektimport:'));
 assert.equal(await snapshot(),before);
 const old=structuredClone(result.project);old.format='negative-studio-roll-v08';delete old.geometryVersion;delete old.roll;old.frames.forEach(f=>delete f.geometry);
 await page.locator('#settingsFile').setInputFiles({name:'mixed-old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await page.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('beskärningar'));
 const frozen=await page.evaluate(async()=>{
  let blob;downloadBlob=b=>blob=b;const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).join(',');
  await exportTiff();const tiff=await hash(await blob.arrayBuffer()),jpeg=await hash(await jpegBytes()),desired=JSON.stringify(roll[0].geometry.compositionCrop);
  cropRegion={x:.2,y:.2,w:.5,h:.5};saveCurrentFrame();await exportTiff();
  return {tiff:tiff===await hash(await blob.arrayBuffer()),jpeg:jpeg===await hash(await jpegBytes()),desired:desired===JSON.stringify(roll[0].geometry.compositionCrop),shared:rollShared.cropExportToFrame};
 });
 assert.deepEqual(frozen,{tiff:true,jpeg:true,desired:true,shared:false});assert.deepEqual(errors,[]);
 console.log('PASS browser: mixed legacy migration uses frozen exact TIFF/JPEG ROI after technical frame metadata changes');
 console.log('PASS browser: Beta 6 project import retains dormant rotation; invalid later-frame geometry leaves queue, analysis, settings and export naming unchanged');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
