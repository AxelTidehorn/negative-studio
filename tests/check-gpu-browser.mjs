import {readSource,sourcePath} from './helpers/source.mjs';
/* Optional browser integration. Install Playwright separately, then:
   FILMLABB_CHROMIUM_BIN=/path/to/chromium npm run test:gpu
   Override FILMLABB_PLAYWRIGHT_MODULE / FILMLABB_CHROMIUM_ARGS if needed. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.FILMLABB_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('site');const mime={'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,p=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(readSource(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||undefined,args:process.env.FILMLABB_CHROMIUM_ARGS?JSON.parse(process.env.FILMLABB_CHROMIUM_ARGS):['--no-sandbox','--enable-unsafe-swiftshader']});
const report={environment:'Chromium WebGL 2; renderer recorded below; synthetic image fixtures',checks:[]};
function check(message){report.checks.push(message);console.log('PASS',message);}
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},locale:'sv-SE'}),errors=[];page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));
 await page.waitForFunction(()=>globalThis.FILMLABB_GPU?.snapshot().backend==='gpu');
 assert.deepEqual(errors,[]);check('Actual app PNG import uses GPU with no page errors');
 const parity=await page.evaluate(()=>{
  const canvas=document.createElement('canvas'),gpu=NSGpuPreview.create(canvas),gl=gpu.context,ext=gl.getExtension('WEBGL_debug_renderer_info'),renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  const width=67,height=45,data=new Float32Array(width*height*3);
  for(let n=0;n<width*height;n++)for(let k=0;k<3;k++)data[n*3+k]=n<10?[0,1/65535,.0001,.001,.01,.1,.4,.8,.99,1][n]:((n*(177+k*263)+k*337)%65536)/65535;
  const im={width,height,data,channels:3,scale:1,encoding:'linear'},cases=[];let worst=0;
  const base=configuration38();
  for(const id of ['generic','ultramax','gold','portra','portra160','portra800','ektar','proimage','fuji400','fuji400h','bw','hp5','trix','fp4','delta100'])
  for(const toneMode4 of ['smooth','reference'])for(const adjustment of [0,1]){
   const profile=NSCreativeProfiles.resolve(filmProfiles,id,2),opts={...base.opts,toneMode4,...(adjustment?{exposure:.7,gamma:.8,contrast:1.2,saturation:1.3,temperature:20,tint:-8,shadows:24,highlights:-31}:{} )};
   const c={...base,opts,profile,neutralProfile:id==='generic',print:adjustment?printStyles.soft:printStyles.neutral,neutralPrint:!adjustment,strength:adjustment?.7:1};
   const kernel=NSPixelKernel.compile(c);gpu.draw(im,c,'positive',67,42);const pixels=gpu.read().data;let max=0,count=0;
   for(let n=0;n<width*height;n++){const expected=kernel.pixel([data[n*3],data[n*3+1],data[n*3+2]]);for(let k=0;k<3;k++){const d=Math.abs(pixels[n*4+k]-Math.round(expected[k]*255));max=Math.max(max,d);if(d>1)count++;}}
   worst=Math.max(worst,max);cases.push({profile:id,toneMode4,adjustment,maxError:max,overOne:count});
  }
  // Negative/split, odd dimensions, and downsample geometry all match CPU sampling.
  for(const mode of ['negative','split'])for(const limit of [67,31]){
   gpu.draw(im,base,mode,limit,42);const r=gpu.read(),kernel=NSPixelKernel.compile(base);let max=0;
   for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
    const sx=Math.min(width-1,Math.floor((x+.5)*width/r.width)),sy=Math.min(height-1,Math.floor((y+.5)*height/r.height)),n=(sy*width+sx)*3,p=[data[n],data[n+1],data[n+2]],q=mode==='negative'||x<r.width/2?p.map(NSColorEngine.encode):kernel.pixel(p);
    for(let k=0;k<3;k++)max=Math.max(max,Math.abs(r.data[(y*r.width+x)*4+k]-Math.round(q[k]*255)));
   }worst=Math.max(worst,max);cases.push({mode,limit,maxError:max});
  }
  const uploads=gpu.metrics.uploads;for(let n=0;n<10;n++)gpu.draw(im,{...base,opts:{...base.opts,exposure:n/10}},'positive',67,42);
  const cached=gpu.metrics.uploads===uploads;gpu.destroy();return {renderer,worst,cases,sourceUploadCached:cached};
 });
 console.log('Shader parity max error',parity.worst,'renderer',parity.renderer);
 report.parity=parity;assert.ok(parity.worst<=2,JSON.stringify(parity.cases.filter(c=>c.maxError>2)));assert.ok(parity.sourceUploadCached);check('64 shader cases match direct CPU within two display levels; slider edits reuse source texture');
 // Real controls preserve source calibration and exports across backend changes.
 const before=await page.evaluate(()=>({analyses:analysisCount38,source:sourceVersion38,response:JSON.stringify(state.response4),uploads:FILMLABB_GPU.snapshot().sourceUploads}));
 await page.locator('#exposure').evaluate(el=>{for(let i=0;i<30;i++){el.value=String(i/30);el.dispatchEvent(new Event('input',{bubbles:true}));}el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.waitForTimeout(350);
 const after=await page.evaluate(()=>({analyses:analysisCount38,source:sourceVersion38,response:JSON.stringify(state.response4),uploads:FILMLABB_GPU.snapshot().sourceUploads,gpu:FILMLABB_GPU.snapshot()}));
 assert.equal(before.analyses,after.analyses);assert.equal(before.source,after.source);assert.equal(before.response,after.response);assert.equal(before.uploads,after.uploads);assert.equal(after.gpu.backend,'gpu');await page.screenshot({path:path.resolve('../gpu-preview-qa.png')});check('Actual slider burst uses GPU without recalibration or source reupload');
 // Click geometry, rotation, crop overlay and manual sample still use source coordinates.
 await page.locator('#rotateRight').click();await page.locator('#zoomIn').click();
 const geometry=await page.evaluate(()=>{drawCrop();const a=$('preview').getBoundingClientRect(),b=$('gpuPreview').getBoundingClientRect();return {delta:Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.width-b.width),Math.abs(a.height-b.height)),pointer:getComputedStyle($('gpuPreview')).pointerEvents};});
 assert.ok(geometry.delta<.01);assert.equal(geometry.pointer,'none');check('GPU follows rotation/zoom/crop geometry; original canvas remains pointer target');
 await page.evaluate(()=>{state.cropConfirmed=true;});
 const exports=await page.evaluate(async()=>{
  const captured=[];const save=downloadBlob;downloadBlob=async(blob,name)=>captured.push({name,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))});
  try{await exportTiff();await new Promise(r=>setTimeout(r,0));$('previewBackend').value='cpu';$('previewBackend').dispatchEvent(new Event('change'));await exportTiff();await new Promise(r=>setTimeout(r,0));const jpeg=await jpegBytes();return {same:captured.length===2&&JSON.stringify(captured[0].bytes)===JSON.stringify(captured[1].bytes),jpeg:[jpeg[0],jpeg[1],jpeg[jpeg.length-2],jpeg[jpeg.length-1]]};}finally{downloadBlob=save;}
 });
 assert.equal(exports.same,true);assert.deepEqual(exports.jpeg,[255,216,255,217]);check('CPU/GPU selection leaves TIFF bytes identical; actual browser JPEG encoding succeeds');
 await page.locator('#flInfoMenu > summary').click();
 await page.locator('#previewBackend').selectOption('auto');await page.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu');
 // Context loss must show CPU automatically and be recoverable.
 await page.evaluate(()=>{globalThis.gpuLossTest=$('gpuPreview').getContext('webgl2').getExtension('WEBGL_lose_context');gpuLossTest.loseContext();});
 await page.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='cpu'&&FILMLABB_GPU.snapshot().contextLosses===1);
 await page.evaluate(()=>{gpuLossTest.restoreContext();});
 await page.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu');check('Real WebGL context loss falls back to CPU and restoration recovers GPU');
 // Unsupported engine uses CPU and returns to GPU when Standard is selected.
 await page.locator('#advancedSettings').evaluate(el=>{el.open=true;});await page.locator('#engineMode').selectOption('log39');await page.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='cpu');
 await page.locator('#engineMode').selectOption('calibrated4');await page.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu');
 check('Comparison engine automatically uses CPU and Standard returns to GPU');
 await page.locator('#clearQueue').click();assert.equal(await page.locator('#gpuPreview').isVisible(),false);assert.equal(await page.locator('#empty').isVisible(),true);check('Clear queue removes GPU preview and releases resources');
 assert.deepEqual(errors,[]);
 // Independent mobile viewport, no-WebGL and failed color-check paths.
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'sv-SE'});
 await mobile.goto(page.url(),{waitUntil:'domcontentloaded',timeout:90000});await mobile.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await mobile.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu');
 await mobile.locator('#exposure').evaluate(el=>{el.value='.4';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});await mobile.waitForTimeout(250);
 assert.equal(await mobile.locator('#gpuPreview').isVisible(),true);check('390px touch viewport imports and adjusts in GPU mode');await mobile.screenshot({path:path.resolve('../gpu-mobile-qa.png')});await mobile.close();
 const fallback=await browser.newPage({locale:'sv-SE'});await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});
 await fallback.goto(page.url(),{waitUntil:'domcontentloaded',timeout:90000});await fallback.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await fallback.waitForFunction(()=>globalThis.FILMLABB_GPU?.snapshot().reason?.includes('WebGL'));
 assert.equal(await fallback.locator('#preview').isVisible(),true);await fallback.waitForFunction(()=>lastPreview38?.data?.length>0);check('Unavailable WebGL keeps a usable CPU preview');await fallback.close();
 const validation=await browser.newPage({locale:'sv-SE'});await validation.goto(page.url(),{waitUntil:'domcontentloaded',timeout:90000});await validation.evaluate(()=>{const create=NSGpuPreview.create;NSGpuPreview.create=canvas=>{const gpu=create(canvas);gpu.validate=()=>{throw Error('simulerat färgfel');};return gpu;};});
 await validation.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await validation.waitForFunction(()=>FILMLABB_GPU.snapshot().reason?.includes('simulerat färgfel'));await validation.waitForFunction(()=>lastPreview38?.data?.length>0);check('Failed startup color check automatically shows CPU');await validation.close();
 console.log(JSON.stringify(report,null,2));fs.writeFileSync('docs/gpu-browser-results.json',JSON.stringify(report,null,2));
}finally{await browser.close();server.closeAllConnections();server.close();}
