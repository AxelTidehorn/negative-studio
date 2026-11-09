import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';import {decodePng} from './helpers/png.mjs';import '../src/import/tiff-codec.js';
ensureBuild();const h=await browserHarness();
try{
 const p=await h.browser.newPage({locale:'sv-SE',serviceWorkers:'block'});await p.goto(h.url);
 await p.locator('#imageFile').setInputFiles({name:'fixture.dng',mimeType:'application/octet-stream',buffer:fs.readFileSync('tests/fixtures/synthetic-negative.dng')});await p.waitForFunction(()=>working&&!rollLoading);
 await p.evaluate(()=>{
  const width=4096,height=48,data=Float32Array.from({length:width*height*3},(_,i)=>.03+.3*((i*31)%251)/251);working={width,height,data,channels:3,bits:16,scale:1,encoding:'linear',colorSpace:'rec2020'};workingPreview=NSV2Platform.preview(working,320);sourceInfo={encoding:'linear',label:'synthetic wide-row regression',domain:'synthetic'};state={...defaultState(),engine:'v2',noBase:true,cropMethod:'manual',cropConfirmed:true};cropRegion={x:0,y:0,w:1,h:1};rollShared.look={id:'film.kodak-gold-200',strength:1};globalThis.originalWorkingData=data;analyzeLevels();globalThis.currentPresentation=NSPresentation;
 });
 await p.addScriptTag({content:fs.readFileSync('tests/fixtures/presentation-sampler-before-optimization.js','utf8')});await p.evaluate(()=>{globalThis.beforePresentation=NSPresentation;NSPresentation=currentPresentation;});
 let exports=0;
 for(const [q,fine,crop]of [[0,0,false],[1,0,true],[0,2.3,false],[1,-3.4,true]]){
  const expected=await p.evaluate(async({q,fine,crop})=>{
   state.rotation=q*90;state.cropExport=crop;rollShared.cropExportToFrame=crop;roll[0].geometry=NSGeometry.create(q*90);roll[0].geometry.rotation.fineDegrees=fine;if(crop)roll[0].geometry.compositionCrop={cx:0,cy:0,w:.63,h:.48};const c=configuration38(),g=exportGeometrySnapshot(working).g,out=beforePresentation.tiff(working,c,g,0,g.height,NSPixelKernel.prepare(working,c));return {width:g.width,height:g.height,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',out.buffer))).map(v=>v.toString(16).padStart(2,'0')).join('')};
  },{q,fine,crop});
  for(const format of ['tiff','png16']){
   const result=await p.evaluate(async({format,forceTimer})=>{const oldPostTask=globalThis.scheduler?.postTask,oldWorker=globalThis.Worker;if(forceTimer){globalThis.Worker=undefined;if(globalThis.scheduler)scheduler.postTask=undefined;}let blob,ticks=0;const original=downloadBlob;downloadBlob=b=>blob=b;const pulse=setInterval(()=>ticks++,5);try{$('exportFormat').value=format;await $('export').onclick();if(!blob)throw Error($('status').textContent);return{bytes:Array.from(new Uint8Array(await blob.arrayBuffer())),ticks,metrics:FILMLABB_RGB16.snapshot(),sourceIntact:working.data===originalWorkingData};}finally{downloadBlob=original;clearInterval(pulse);if(forceTimer){globalThis.Worker=oldWorker;if(globalThis.scheduler)scheduler.postTask=oldPostTask;}} },{format,forceTimer:crop&&fine!==0&&format==='png16'});
   assert.ok(result.ticks>0);assert.ok(result.sourceIntact);assert.ok(result.metrics.backend==='worker'?result.metrics.worker.renderMs>=0:result.metrics.chunks>1);assert.ok((result.metrics.cache?.bytes||0)<=4194304);
   const bytes=Buffer.from(result.bytes),im=format==='tiff'?NSTiff.decodeSync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)):decodePng(bytes);assert.equal(im.bits,16);assert.deepEqual([im.width,im.height],[expected.width,expected.height]);assert.equal(createHash('sha256').update(Buffer.from(im.data.buffer,im.data.byteOffset,im.data.byteLength)).digest('hex'),expected.hash);exports++;
  }
 }
 for(const format of ['tiff','png16']){
  const result=await p.evaluate(async format=>{state.rotation=0;state.cropExport=false;rollShared.cropExportToFrame=false;roll[0].geometry=NSGeometry.create();let downloads=0;const original=downloadBlob;downloadBlob=()=>downloads++;const pulse=setInterval(()=>{if(Number($('exportProgress').value)>0)$('cancelExport').click();},1);try{$('exportFormat').value=format;await $('export').onclick();return{downloads,busy:exportBusy,active:FILMLABB_EXPORT.snapshot().active,metrics:FILMLABB_RGB16.snapshot(),sourceIntact:working.data===originalWorkingData};}finally{clearInterval(pulse);downloadBlob=original;}},format);
  assert.equal(result.downloads,0);assert.equal(result.busy,false);assert.equal(result.active,false);assert.ok(result.metrics.cancelled);assert.ok(result.sourceIntact);
 }
 console.log('PASS',exports,'actual wide-row RGB16 TIFF/PNG exports match frozen pre-optimization pixels, live heartbeat, all geometry paths and mid-computation cancellation without download/state/source damage');
}finally{await h.close();}
