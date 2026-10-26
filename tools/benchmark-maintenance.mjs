/* Same driver for frozen main and candidate builds. Timings are observations,
   never pass/fail thresholds. Run sequentially on an otherwise idle host. */
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {browserHarness} from '../tests/helpers/browser.mjs';
const [root='.',output='/tmp/filmlabb-maintenance-benchmark.json',count='7']=process.argv.slice(2);
process.chdir(path.resolve(root));
const {browser,url,close}=await browserHarness(),samples=Number(count);
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),samples,fixture:'demo-negative.png (900×600) and synthetic-negative.dng; headless Chromium, software WebGL',results:{}};
function summarize(values){const a=[...values].sort((a,b)=>a-b);return {median:a[Math.floor(a.length/2)],min:a[0],max:a.at(-1),samples:values};}
try{
 const page=await browser.newPage({serviceWorkers:'block',locale:'sv-SE'});page.setDefaultTimeout(120000);await page.goto(url);
 await page.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GEOMETRY.snapshot().draws>0);
 report.gpu=await page.evaluate(()=>{const gl=$('gpuPreview').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
 // Count actual color renders, not presentation redraws; disable workers/GPU
 // for this isolated CPU-cache probe without changing the color implementation.
 report.results.cpuRepeated=await page.evaluate(async n=>{
  $('previewBackend').value='cpu';$('previewBackend').onchange();stopPreviewWork();workerDisabled38=true;
  const original=NSPixelKernel.render;let calls=0;NSPixelKernel.render=(...a)=>{calls++;return original(...a);};const elapsed=[],counts=[];
  try{for(let j=0;j<n+1;j++){state.exposure=j/100;const before=calls,t=performance.now();for(let i=0;i<6;i++)render(1400);if(j){elapsed.push(performance.now()-t);counts.push(calls-before);}await new Promise(r=>setTimeout(r,20));}}finally{NSPixelKernel.render=original;}
  return {elapsed,counts};
 },samples);
 // Small presentation draw loop: count native location lookups and finish GPU
 // work before timing ends. No CPU/GPU color calculations are changed.
 report.results.presentation=await page.evaluate(n=>{
  const c=document.createElement('canvas'),gpu=NSPreviewPresentation.create(c),gl=c.getContext('webgl2'),source=document.createElement('canvas');source.width=96;source.height=64;gpu.upload(source);
  const p=NSGeometry.compositionTransform(96,64,NSGeometry.create()),bounds=NSGeometry.pixelBounds(96,64,null);p.sourceWidth=96;p.sourceHeight=64;
  const original=gl.getUniformLocation.bind(gl);let calls=0;gl.getUniformLocation=(...a)=>{calls++;return original(...a);};const elapsed=[],counts=[];
  for(let j=0;j<n;j++){const before=calls,t=performance.now();for(let i=0;i<100;i++)gpu.draw(p,96,64,bounds);gl.finish();elapsed.push(performance.now()-t);counts.push(calls-before);}gpu.destroy();return {elapsed,counts};
 },samples);
 // Real JPEG main-thread fallback and TIFF. Canvas allocation counts are
 // deterministic; native encoder elapsed times are deliberately not assertions.
 report.results.exports=await page.evaluate(async n=>{
  const originalWorker=globalThis.Worker,originalCreate=CanvasRenderingContext2D.prototype.createImageData,originalDownload=downloadBlob;
  const jpeg=[],tiff=[],allocations=[];let created=0;globalThis.Worker=undefined;downloadBlob=()=>{};
  CanvasRenderingContext2D.prototype.createImageData=function(...a){created++;return originalCreate.apply(this,a);};
  try{state.cropConfirmed=true;for(let j=0;j<n+1;j++){let t=performance.now();const before=created;await jpegBytes();if(j){jpeg.push(performance.now()-t);allocations.push(created-before);}t=performance.now();await exportTiff();if(j)tiff.push(performance.now()-t);}}
  finally{globalThis.Worker=originalWorker;CanvasRenderingContext2D.prototype.createImageData=originalCreate;downloadBlob=originalDownload;}
  return {jpeg,tiff,allocations};
 },samples);
 await page.evaluate(()=>{workerDisabled38=false;$('previewBackend').value='auto';$('previewBackend').onchange();});
 const buffer=fs.readFileSync('demo-negative.png'),imports=[],switches=[],raw=[];
 for(let j=0;j<samples;j++){
  let t=performance.now();await page.locator('#imageFile').setInputFiles([{name:'a.png',mimeType:'image/png',buffer},{name:'b.png',mimeType:'image/png',buffer}]);await page.waitForFunction(()=>working&&!rollLoading&&activeFrame===0&&FILMLABB_GEOMETRY.snapshot().sourceVersion===sourceVersion38);imports.push(performance.now()-t);
  t=performance.now();await page.evaluate(()=>chooseFrame(1));await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GEOMETRY.snapshot().sourceVersion===sourceVersion38);switches.push(performance.now()-t);
 }
 // Decoder only, with disposal, through the actual LibRaw worker. Tiny DNG
 // validates the path; it does not predict camera-sized RAW memory or latency.
 const fixture=Array.from(fs.readFileSync('tests/fixtures/synthetic-negative.dng'));
 for(let j=0;j<samples;j++)raw.push(await page.evaluate(async bytes=>{const file=new File([new Uint8Array(bytes)],'synthetic.dng'),t=performance.now();await NSRawDecoder.decode(file,'protected');return performance.now()-t;},fixture));
 const cpu=await browser.newPage({serviceWorkers:'block',locale:'sv-SE'});cpu.setDefaultTimeout(120000);
 await cpu.addInitScript(()=>localStorage.setItem('filmlabb-preview-backend','cpu'));await cpu.goto(url);
 await cpu.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await cpu.waitForFunction(()=>lastPreview38&&!workerBusy38&&!queued38);
 const feedback=[],detail=[];
 for(let j=0;j<samples;j++){
  await cpu.evaluate(async j=>{
   globalThis.burst={start:performance.now(),last:0,shown:[]};const show=showPreview38;
   showPreview38=function(r){burst.shown.push({at:performance.now(),width:r.width});return show(r);};
   for(let i=0;i<8;i++){state.exposure=(j*8+i+1)/100;burst.last=performance.now();scheduleRender();await new Promise(r=>setTimeout(r,16));}
   globalThis.restoreShow=()=>{showPreview38=show;};
  },j);
  await cpu.waitForFunction(()=>!workerBusy38&&!queued38&&!dragTimer38&&!previewTick38&&lastPreview38.width>240);
  const timing=await cpu.evaluate(()=>{restoreShow();return {first:burst.shown[0].at-burst.start,detail:burst.shown.at(-1).at-burst.last};});feedback.push(timing.first);detail.push(timing.detail);
 }
 report.results.cpuSliderFirstFeedbackMs=summarize(feedback);report.results.cpuSliderIdleDetailMs=summarize(detail);await cpu.close();
 const cdp=await page.context().newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');
 const heapBefore=await cdp.send('Runtime.getHeapUsage');
 for(let j=0;j<25;j++)await page.evaluate(async i=>{await chooseFrame(i%2);state.exposure=i/100;render();},j);
 await page.waitForTimeout(500);await cdp.send('HeapProfiler.collectGarbage');
 report.results.sessionHeap={switches:25,before:heapBefore,after:await cdp.send('Runtime.getHeapUsage'),note:'CDP JS/backing storage after GC; excludes native canvas/encoder/GPU memory and is not an iPad peak-memory measurement'};await cdp.detach();
 report.results.importToPreviewMs=summarize(imports);report.results.switchToPreviewMs=summarize(switches);report.results.syntheticRawDecodeMs=summarize(raw);
 for(const key of ['cpuRepeated','presentation']){const r=report.results[key];r.elapsedMs=summarize(r.elapsed);delete r.elapsed;}
 const e=report.results.exports;e.jpegMs=summarize(e.jpeg);e.tiffMs=summarize(e.tiff);delete e.jpeg;delete e.tiff;
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await close();}
