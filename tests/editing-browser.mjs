import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {browserHarness} from './helpers/browser.mjs';
const {browser,url,close}=await browserHarness();
try{
 const page=await browser.newPage({serviceWorkers:'block',locale:'en-US'}),errors=[];page.setDefaultTimeout(120000);page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 const buffer=fs.readFileSync('demo-negative.png');await page.locator('#imageFile').setInputFiles([{name:'edit-a.png',mimeType:'image/png',buffer},{name:'edit-b.png',mimeType:'image/png',buffer}]);await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu');
 const frozen=await page.evaluate(()=>({cal:JSON.stringify({calibration,base,cropRegion,response:state.response4,geometry:roll[0].geometry,engine:state.engine}),analyses:analysisCount38,uploads:FILMLABB_GPU.snapshot().sourceUploads}));
 await page.locator('#editVersion').selectOption('2');await page.waitForFunction(()=>state.editVersion===2&&FILMLABB_GPU.snapshot().backend==='gpu');
 const after=await page.evaluate(()=>({cal:JSON.stringify({calibration,base,cropRegion,response:state.response4,geometry:roll[0].geometry,engine:state.engine}),analyses:analysisCount38,uploads:FILMLABB_GPU.snapshot().sourceUploads}));assert.equal(after.cal,frozen.cal);assert.equal(after.analyses,frozen.analyses);assert.ok(after.uploads<=frozen.uploads+2);
 console.log('PASS real editing A/B selector changes no conversion, calibration, geometry, analysis; only bounded precision validation uploads');
 const parity=await page.evaluate(()=>{
  const canvas=document.createElement('canvas'),gpu=NSGpuPreview.create(canvas),width=53,height=37,data=new Float32Array(width*height*3);
  for(let i=0;i<data.length;i++)data[i]=i<72?[0,1/65535,.0001,.001,.01,.18,.5,1][i%8]:((i*673+71)%65536)/65535;
  const im={width,height,data,channels:3,encoding:'linear',scale:1},base=configuration38(),failures=[],differences=[];let worst=0,cases=0;
  const adjustments=[{}, {exposure:2},{exposure:-2},{contrast:1.7},{gamma:1.6,shadows:100,highlights:100},{shadow:0,highlight:1},{shadow:.12,highlight:.85,gamma:.65},{saturation:1.8},{saturation:0},{temperature:35,tint:-35,exposure:.7,contrast:1.4,shadows:40,highlights:30,saturation:1.4}];
  for(const workingSpace of ['srgb','rec2020'])for(const colorMode4 of ['legacy','original','robust'])for(const id of ['generic','gold','hp5'])for(const adjustment of adjustments){
   const c={...base,workingSpace,profile:NSCreativeProfiles.resolve(filmProfiles,id,2),neutralProfile:id==='generic',opts:{...base.opts,editVersion:2,colorMode4,...adjustment}};
   gpu.draw(im,c,'positive',width,1);const actual=gpu.read().data,k=NSPixelKernel.compile(c);let max=0;
   for(let n=0;n<width*height;n++){const expected=k.pixel(Array.from(data.subarray(n*3,n*3+3)));for(let ch=0;ch<3;ch++){const d=Math.abs(actual[n*4+ch]-Math.round(expected[ch]*255));max=Math.max(max,d);differences.push(d);}}
   if(max>2)failures.push({workingSpace,colorMode4,id,adjustment,max});worst=Math.max(worst,max);cases++;
  }
  gpu.destroy();differences.sort((a,b)=>a-b);return {cases,worst,p99:differences[Math.floor(differences.length*.99)],failures};
 });console.log('MEASURE Editing 2 GPU parity',JSON.stringify(parity));assert.ok(parity.worst<=2,JSON.stringify(parity.failures));
 // Real CPU worker output before presentation: compare exact color path, then
 // leave the conversion/analysis frozen during a burst and detail view changes.
 await page.evaluate(()=>{state.exposure=.4;state.contrast=1.2;state.shadows=30;state.highlights=25;state.saturation=1.2;$('previewBackend').value='cpu';$('previewBackend').onchange();});await page.waitForFunction(()=>lastPreview38&&!workerBusy38&&!queued38);
 assert.equal(await page.evaluate(()=>{const r=NSPixelKernel.render(workingPreview,configuration38(),display,1400);return r.data.every((v,i)=>v===lastPreview38.data[i]);}),true);
 await page.locator('#originalDetail').click();await page.waitForFunction(()=>!$('originalDetailPanel').hidden);await page.locator('#detailScale').click();assert.ok((await page.locator('#detailTitle').textContent()).includes('200'));const detailError=await page.evaluate(()=>{drawDetailNext();const actual=detailGPU.read().data,expected=NSPixelKernel.render(detailROI,configuration38(),display,320).data;let worst=0;for(let i=0;i<actual.length;i++)worst=Math.max(worst,Math.abs(actual[i]-expected[i]));return worst;});assert.ok(detailError<=2,String(detailError));await page.locator('#detailClose').click();
 assert.equal(await page.evaluate(()=>analysisCount38),frozen.analyses);
 console.log('PASS real CPU worker, original detail 100/200% and adjusted editing preserve analysis');
 const result=await page.evaluate(async()=>{
  const download=downloadBlob;let blob;downloadBlob=b=>blob=b;
  try{
   roll[0].geometry.rotation.fineDegrees=2;state.cropConfirmed=true;const snapshot=exportGeometrySnapshot(working),c=configuration38();await exportTiff();const decoded=await NSTiff.decode(await blob.arrayBuffer()),expected=NSPresentation.tiff(working,c,snapshot.g,0,snapshot.g.height,NSPixelKernel.prepare(working,c));
   const tiffExact=decoded.data.every((v,i)=>v===expected[i]),dimensions=[decoded.width,decoded.height];
   const worker=await jpegBytes(),WorkerBefore=globalThis.Worker;let fallback;
   try{globalThis.Worker=undefined;fallback=await jpegBytes();}finally{globalThis.Worker=WorkerBefore;}
   return {tiffExact,dimensions,jpegExact:worker.length===fallback.length&&worker.every((v,i)=>v===fallback[i]),valid:worker[0]===255&&worker[1]===216};
  }finally{downloadBlob=download;}
 });assert.equal(result.tiffExact,true);assert.equal(result.jpegExact,true);assert.equal(result.valid,true);
 console.log('PASS Editing 2 16-bit TIFF equals scalar prepared pixels; rotated JPEG worker/main native encoding identical',JSON.stringify(result.dimensions));
 const project=await page.evaluate(async()=>{let b;const old=downloadBlob;downloadBlob=x=>b=x;try{saveCurrentFrame();$('saveSettings').onclick();return JSON.parse(await b.text());}finally{downloadBlob=old;}});assert.equal(project.frames[0].settings.editVersion,2);assert.equal(project.frames[1].settings.editVersion,1);
 await page.evaluate(()=>chooseFrame(1));assert.equal(await page.locator('#editVersion').inputValue(),'1');await page.locator('#settingsFile').setInputFiles({name:'edits.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.waitForFunction(()=>!rollLoading&&activeFrame===0&&state.editVersion===2);assert.equal(await page.locator('#editVersion').inputValue(),'2');
 // Existing batch and cancellation owners, with mixed per-image versions.
 const batch=await page.evaluate(async()=>{const old=downloadBlob,files=[];downloadBlob=(b,n)=>files.push(n);try{await $('batchTiff').onclick();const tiff=files.length;files.length=0;await $('batchJpeg').onclick();return {tiff,zip:files.length,locked:exportBusy||rollingExport||FILMLABB_EXPORT.snapshot().active,versions:roll.map(f=>f.settings.editVersion)};}finally{downloadBlob=old;}});
 assert.equal(batch.tiff,2);assert.equal(batch.zip,1);assert.equal(batch.locked,false);assert.deepEqual(batch.versions,[2,1]);
 const cancelled=await page.evaluate(async()=>{let saved=0;const old=downloadBlob;downloadBlob=()=>saved++;try{const pending=jpegBytes();FILMLABB_EXPORT.cancel();try{await pending;return false;}catch(e){return e.name==='AbortError'&&saved===0&&!exportBusy&&!FILMLABB_EXPORT.snapshot().active;}}finally{downloadBlob=old;}});assert.equal(cancelled,true);
 console.log('PASS mixed editing versions round-trip, restore selector, TIFF/JPEG ZIP batches and immediate export cancellation');
 await page.evaluate(()=>{$('previewBackend').value='auto';$('previewBackend').onchange();});await page.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu');
 const analyses=await page.evaluate(()=>analysisCount38);
 await page.evaluate(()=>{globalThis.editingContextLoss=$('gpuPreview').getContext('webgl2').getExtension('WEBGL_lose_context');editingContextLoss.loseContext();});await page.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='cpu');
 await page.evaluate(()=>editingContextLoss.restoreContext());await page.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu');assert.equal(await page.evaluate(()=>state.editVersion),2);assert.equal(await page.evaluate(()=>analysisCount38),analyses);
 console.log('PASS Editing 2.0 context loss uses CPU and restoration recreates the versioned GPU pass without reanalysis');
 assert.deepEqual(errors,[]);
}finally{await close();}
