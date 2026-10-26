/* Real WebGL and workers in the signal interval the experiment changes. */
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const root=path.resolve('site'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png'};
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,p=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({serviceWorkers:'block',locale:'sv-SE'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu');
 await page.locator('#advancedSettings').evaluate(el=>el.open=true);await page.locator('details.sidebar-details').filter({has:page.locator('#colorMode4')}).evaluate(el=>el.open=true);
 const unchanged=await page.evaluate(()=>JSON.stringify({calibration,stateResponse:state.response4,cropRegion,geometry:roll[activeFrame].geometry,analyses:analysisCount38}));
 for(const variant of ['original','robust','legacy','robust']){await page.locator('#colorMode4').selectOption(variant);assert.equal(await page.evaluate(()=>state.colorMode4),variant);assert.equal(await page.evaluate(()=>JSON.stringify({calibration,stateResponse:state.response4,cropRegion,geometry:roll[activeFrame].geometry,analyses:analysisCount38})),unchanged);}
 await page.locator('#engineMode').selectOption('log39');assert.equal(await page.locator('#colorMode4').isDisabled(),true);await page.locator('#engineMode').selectOption('calibrated4');assert.equal(await page.locator('#colorMode4').isDisabled(),false);
 const saved=await page.evaluate(async()=>{let blob;const save=downloadBlob;try{downloadBlob=b=>blob=b;$('saveSettings').onclick();return JSON.parse(await blob.text());}finally{downloadBlob=save;}});assert.equal(saved.frames[0].settings.colorMode4,'robust');
 await page.locator('#colorMode4').selectOption('original');await page.locator('#settingsFile').setInputFiles({name:'color-ab.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await page.waitForFunction(()=>!rollLoading&&state.colorMode4==='robust');assert.equal(await page.locator('#colorMode4').inputValue(),'robust');
 const old=structuredClone(saved);delete old.frames[0].settings.colorMode4;await page.locator('#settingsFile').setInputFiles({name:'older.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});await page.waitForFunction(()=>!rollLoading&&state.colorMode4==='legacy');assert.equal(await page.locator('#colorMode4').inputValue(),'legacy');
 await page.locator('#colorMode4').selectOption('robust');
 const tiff=await page.evaluate(async()=>{let blob;const save=downloadBlob;try{downloadBlob=b=>blob=b;const c=configuration38(),g=exportGeometrySnapshot(working).g;await exportTiff();const actual=await NSTiff.decode(await blob.arrayBuffer()),expected=NSPresentation.tiff(working,c,g,0,g.height,NSPixelKernel.prepare(working,c));return {variant:c.opts.colorMode4,same:actual.data.every((v,i)=>v===expected[i]),width:actual.width,height:actual.height};}finally{downloadBlob=save;}});assert.equal(tiff.variant,'robust');assert.equal(tiff.same,true);
 const locked=await page.evaluate(async()=>{const pending=jpegBytes(),disabled=$('colorMode4').disabled;$('colorMode4').value='original';$('colorMode4').dispatchEvent(new Event('change'));const frozen=state.colorMode4==='robust';await pending;return {disabled,frozen,restored:!$('colorMode4').disabled};});assert.deepEqual(locked,{disabled:true,frozen:true,restored:true});
 console.log('PASS real A/B control, no reanalysis or geometry changes, explicit project round-trip and missing-option compatibility');
 const report=await page.evaluate(async()=>{
  const before=JSON.stringify({state,calibration,cropRegion,sharedResponse4,analysisCount38}),canvas=document.createElement('canvas'),gpu=NSGpuPreview.create(canvas),base=structuredClone(configuration38()),cases=[];
  Object.assign(base.cal.beta4,{lo:.08,span:1.1,base:[.7,.4,.2],light:[.8,1.2,1.1],response:{offset:[.1,-.2,.15],span:[2.5,3.2,4.8]}});
  const width=73,height=19,data=new Float32Array(width*height*3),levels=[0,1e-12,1/65535,4/65535,8/65535,16/65535,32/65535,64/65535,65/65535,.002,.01,.1,1];
  for(let n=0;n<width*height;n++)for(let k=0;k<3;k++)data[n*3+k]=n%2?levels[(n*(k+1)+k*3)%levels.length]:levels[n%levels.length];
  const im={width,height,channels:3,scale:1,encoding:'linear',data};let worst=0;
  for(const colorMode4 of ['legacy','original','robust'])for(const space of ['srgb','rec2020'])for(const id of ['generic','gold','bw'])for(const toneMode4 of ['smooth','reference','experimental'])for(const edit of [false,true]){
   const c={...base,workingSpace:space,opts:{...base.opts,colorMode4,toneMode4,...(edit?{exposure:.7,gamma:.8,contrast:1.2,saturation:1.3,temperature:20,tint:-8,shadows:24,highlights:-31}:{})},profile:NSCreativeProfiles.resolve(filmProfiles,id,2),neutralProfile:id==='generic',strength:.7};
   gpu.draw(im,c,'positive',width,1);const actual=gpu.read(),kernel=NSPixelKernel.compile(c);let max=0;
   for(let n=0;n<width*height;n++){const q=kernel.pixel(Array.from(data.slice(n*3,n*3+3)));for(let k=0;k<3;k++)max=Math.max(max,Math.abs(actual.data[n*4+k]-Math.round(q[k]*255)));}
   worst=Math.max(worst,max);cases.push({colorMode4,space,id,toneMode4,edit,max});
  }
  // Real CPU preview worker, not a duplicated sampling implementation.
  const worker=new Worker('./preview-worker.js'),c={...base,opts:{...base.opts,colorMode4:'robust'},neutralProfile:true,neutralPrint:true,strength:0};
  const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('preview worker timeout')),10000);worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};worker.onmessage=e=>{clearTimeout(timer);resolve(e.data);};worker.postMessage({type:'source',image:im});worker.postMessage({id:1,config:c,mode:'positive',limit:width});}).finally(()=>worker.terminate());
  if(result.error)throw Error(result.error);const expected=NSPixelKernel.render(im,c,'positive',width);const workerExact=result.data.every((v,i)=>v===expected.data[i]);
  // Actual JPEG main-thread fallback and worker
  // before lossy encoding. Keep real canvas encoding, capture putImageData stripes.
  const create=document.createElement.bind(document),stripes=[];document.createElement=function(tag,...args){const el=create(tag,...args);if(tag==='canvas'){const get=el.getContext.bind(el);el.getContext=function(...a){const ctx=get(...a);if(ctx&&a[0]==='2d'){const put=ctx.putImageData.bind(ctx);ctx.putImageData=(out,x,y)=>{stripes.push({y,data:Array.from(out.data)});return put(out,x,y);};}return ctx;};}return el;};
  const snapshot={im,g:NSPresentation.plan(im,NSGeometry.create(),false,null),config:c,pixels:NSPixelKernel.prepare(im,c)},expectedBytes=NSPresentation.rgba(im,snapshot.pixels,snapshot.g,snapshot.g,0,height);
  let fallbackExact=false,jpegValid=false;
  try{const out=await makeSafeJpegExportCanvas(12000000,snapshot);const actual=new Uint8Array(width*height*4);for(const s of stripes)actual.set(s.data,s.y*width*4);fallbackExact=actual.every((v,i)=>v===expectedBytes[i]);const blob=await new Promise(r=>out.canvas.toBlob(r,'image/jpeg',.95));jpegValid=blob?.size>0;}finally{document.createElement=create;}
  // Exercise OffscreenCanvas JPEG worker with the same frozen config and geometry.
  const jw=new Worker('./export-worker.js');let jpegWorkerValid=false;
  try{jpegWorkerValid=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('JPEG worker timeout')),10000);jw.onerror=e=>{clearTimeout(timer);reject(Error(e.message));};jw.onmessage=({data:m})=>{if(m.type==='error'){clearTimeout(timer);reject(Error(m.error));}else if(m.type==='need'){const packed=NSPresentation.pack(im,snapshot.g,snapshot.g,m.y,m.rows);jw.postMessage({type:'stripe',id:9,y:m.y,rows:m.rows,data:packed},[packed.buffer]);}else if(m.type==='done'){clearTimeout(timer);resolve(m.blob?.size>0);}};jw.postMessage({type:'start',id:9,source:NSExportPlan.metadata(im),config:c,region:null,crop:false,rotation:0,target:{width,height},presentation:snapshot.g.spec||null});});}finally{jw.terminate();}
  const uploads=gpu.metrics.uploads;for(let i=0;i<8;i++)gpu.draw(im,{...c,opts:{...c.opts,exposure:i/10}},'positive',width,1);const reused=gpu.metrics.uploads===uploads;gpu.destroy();
  return {worst,failures:cases.filter(v=>v.max>2),cases:cases.length,workerExact,fallbackExact,jpegValid,jpegWorkerValid,reused,unchanged:before===JSON.stringify({state,calibration,cropRegion,sharedResponse4,analysisCount38})};
 });
 console.log('Low-signal GPU/worker/export report',JSON.stringify(report));assert.ok(report.worst<=2,JSON.stringify(report.failures));assert.equal(report.cases,108);for(const key of ['workerExact','fallbackExact','jpegValid','jpegWorkerValid','reused','unchanged'])assert.equal(report[key],true,key);assert.deepEqual(errors,[]);
 console.log('PASS low-signal shader parity, actual CPU/JPEG workers and fallback encoding, source texture reuse and unchanged analysis');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
