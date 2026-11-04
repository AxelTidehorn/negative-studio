/* Actual jpegBytes()/export-worker benchmark. Instrumentation is injected only
   by this tool; the published application and worker protocol stay untouched. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {assets} from '../app-manifest.mjs';
import {ensureBuild} from './build-artifact.mjs';
import {browserHarness} from '../tests/helpers/browser.mjs';

const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const output=option('--output','.cache/jpeg-benchmark.json'),ref=option('--ref',null),raf=option('--raf',null),repeats=Number(option('--repeats','3'));
const width=Number(option('--width','6032')),height=Number(option('--height','4032')),budget=option('--size','original'),geometry=option('--geometry','plain');
const engines=option('--engines','v2,calibrated4').split(','),backends=option('--backends','worker,main').split(',');
const hashPixels=args.includes('--hash-pixels');
if(!Number.isInteger(repeats)||repeats<1||!['plain','presentation'].includes(geometry))throw Error('Invalid benchmark options');
ensureBuild();
function instrumentWorker(hashPixels){
 const p={prepareMs:0,renderMs:0,canvasMs:0,encodingMs:0,transferToWorkerMs:0,messagesSent:0,messagesReceived:0,stripes:0,maxOutputBytes:0};
 const now=()=>performance.timeOrigin+performance.now(),post=self.postMessage.bind(self),digests=[];
 const digest=data=>crypto.subtle.digest('SHA-256',data).then(b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join(''));
 self.postMessage=(m,...rest)=>{p.messagesSent++;m.benchmarkSent=now();if(m.type==='done'){m.benchmark={...p};if(hashPixels){Promise.all(digests).then(hashes=>post({...m,benchmark:{...p,pixelHashes:hashes}},...rest));return;}}return post(m,...rest);};
 self.addEventListener('message',({data:m})=>{p.messagesReceived++;if(m.type==='stripe'){p.stripes++;p.transferToWorkerMs+=now()-m.benchmarkSent;}});
 function timed(object,key,field){const fn=object[key];object[key]=function(...a){const t=performance.now();try{return fn.apply(this,a);}finally{p[field]+=performance.now()-t;}};}
 timed(NSPixelKernel,'prepare','prepareMs');
 const sampler={...NSPresentation};timed(sampler,'rgba','renderMs');self.NSPresentation=sampler;
 timed(OffscreenCanvasRenderingContext2D.prototype,'putImageData','canvasMs');
 if(hashPixels){const put=OffscreenCanvasRenderingContext2D.prototype.putImageData;OffscreenCanvasRenderingContext2D.prototype.putImageData=function(image,...a){digests.push(digest(image.data));return put.call(this,image,...a);};}
 const create=OffscreenCanvasRenderingContext2D.prototype.createImageData;
 OffscreenCanvasRenderingContext2D.prototype.createImageData=function(...a){const t=performance.now(),r=create.apply(this,a);p.canvasMs+=performance.now()-t;p.maxOutputBytes=Math.max(p.maxOutputBytes,r.data.byteLength);return r;};
 const encode=OffscreenCanvas.prototype.convertToBlob;
 OffscreenCanvas.prototype.convertToBlob=async function(...a){const t=performance.now();try{return await encode.apply(this,a);}finally{p.encodingMs+=performance.now()-t;}};
}
const h=await browserHarness();
try{
 const context=await h.browser.newContext({serviceWorkers:'block',locale:'sv-SE'}),page=await context.newPage();page.setDefaultTimeout(180000);
 await page.route('**/*.js',async route=>{
  const name=new URL(route.request().url()).pathname.split('/').at(-1),file=assets[name];
  const overridden=ref&&['render-core.js','presentation-sampler.js','export-plan.js','export-controller.js','export-worker.js'].includes(name);
  if(!overridden&&name!=='export-worker.js')return route.continue();
  let body=overridden?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
  if(name==='export-worker.js'){const end=body.indexOf("'use strict';")+13;body=body.slice(0,end)+'\n('+instrumentWorker.toString()+')('+hashPixels+');\n'+body.slice(end);}
  await route.fulfill({body,contentType:'text/javascript'});
 });
 await page.goto(h.url);
 if(raf){
  await page.locator('#imageFile').setInputFiles(path.resolve(raf));await page.waitForFunction(()=>working&&!rollLoading);
  await page.locator('#engineMode').selectOption('v2');await page.waitForFunction(()=>state.engine==='v2'&&working&&!rollLoading);
 }else{
  await page.evaluate(async({width,height})=>{
   // Full-resolution, varied negative, not a uniform fill or reduced preview.
   const data=new Float32Array(width*height*3),rgb=[.8,.45,.2];
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const n=(y*width+x)*3,d=.1+1.1*x/width+.2*Math.sin(y/91)+.03*((x*13+y*17)%31)/31;for(let c=0;c<3;c++)data[n+c]=rgb[c]*10**(-d*(1+c*.07));}
   const im={width,height,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data};
   await importRawRGB16(im,'benchmark-linear.tif',{camera_model:'Synthetic'});state.engine='v2';state.cropConfirmed=true;cropRegion={x:.03,y:.03,w:.94,h:.94};analyzeLevels();
  },{width,height});
 }
 const source=await page.evaluate(({budget,geometry})=>{
  state={...state,...NSEditing2.neutral,editVersion:2,jpegSize:budget,cropConfirmed:true,cropExport:false,rotation:0};rollShared.profile='generic';rollShared.print='neutral';rollShared.strength=0;rollShared.cropExportToFrame=false;
  if(roll[activeFrame])roll[activeFrame].geometry=NSGeometry.create(0);
  if(geometry==='presentation'){const model=NSGeometry.create(0);model.rotation.fineDegrees=3;if(!roll[activeFrame]){roll=[{file:{name:'benchmark-linear.tif'},settings:{...state},geometry:model}];activeFrame=0;}else roll[activeFrame].geometry=model;}
  globalThis.jpegBenchmarkSource=working;globalThis.jpegBenchmarkData=working.data;globalThis.jpegBenchmarkSourceBytes=working.data.byteLength;const g=exportGeometrySnapshot(working).g;
  return {width:working.width,height:working.height,bytes:working.data.byteLength,encoding:working.encoding,colorSpace:working.colorSpace,presentation:!!g.presentation,target:NSExportPlan.size(g,NSExportPlan.budgets(budget,navigator.deviceMemory)[0]),deviceMemory:navigator.deviceMemory};
 },{budget,geometry});
 await page.evaluate(hashPixels=>{
  const now=()=>performance.timeOrigin+performance.now();globalThis.jpegBenchmark=null;
  const timed=(o,k,field)=>{const fn=o[k];o[k]=function(...a){const p=jpegBenchmark,t=performance.now();try{return fn.apply(this,a);}finally{if(p)p[field]+=performance.now()-t;}};};
  const sampler={...NSPresentation},pack=sampler.pack;
  sampler.pack=function(...a){const p=jpegBenchmark,t=performance.now();if(p)p.yieldMs+=now()-p.needReceived;const out=pack.apply(this,a);if(p){p.packMs+=performance.now()-t;p.maxInputBytes=Math.max(p.maxInputBytes,out.byteLength);}return out;};
  const rgba=sampler.rgba;sampler.rgba=function(...a){if(jpegBenchmark)jpegBenchmark.stripes++;const t=performance.now();try{return rgba.apply(this,a);}finally{if(jpegBenchmark)jpegBenchmark.renderMs+=performance.now()-t;}};
  globalThis.NSPresentation=sampler;timed(NSPixelKernel,'prepare','prepareMs');
  const timeout=setTimeout;globalThis.setTimeout=(callback,ms,...a)=>{if(typeof callback!=='function')return timeout(callback,ms,...a);const p=jpegBenchmark,t=performance.now();return timeout(function(...args){if(p&&p.backend==='main'&&ms===0)p.yieldMs+=performance.now()-t;return callback.apply(this,args);},ms,...a);};
  const config=configuration38,geometry=exportGeometrySnapshot;
  configuration38=(...a)=>{const t=performance.now();try{return config(...a);}finally{if(jpegBenchmark)jpegBenchmark.recipeGeometryMs+=performance.now()-t;}};
  exportGeometrySnapshot=(...a)=>{const t=performance.now();try{return geometry(...a);}finally{if(jpegBenchmark)jpegBenchmark.recipeGeometryMs+=performance.now()-t;}};
  timed(CanvasRenderingContext2D.prototype,'putImageData','canvasMs');
  if(hashPixels){const put=CanvasRenderingContext2D.prototype.putImageData;CanvasRenderingContext2D.prototype.putImageData=function(image,...a){if(jpegBenchmark)jpegBenchmark.pixelHashPromises.push(crypto.subtle.digest('SHA-256',image.data).then(b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('')));return put.call(this,image,...a);};}
  const create=CanvasRenderingContext2D.prototype.createImageData;
  CanvasRenderingContext2D.prototype.createImageData=function(...a){const t=performance.now(),r=create.apply(this,a),p=jpegBenchmark;if(p){p.canvasMs+=performance.now()-t;p.maxOutputBytes=Math.max(p.maxOutputBytes,r.data.byteLength);}return r;};
  const toBlob=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(callback,...a){const p=jpegBenchmark,t=performance.now();return toBlob.call(this,b=>{if(p)p.encodingMs+=performance.now()-t;callback(b);},...a);};
  const NativeWorker=Worker;globalThis.jpegBenchmarkWorker=class extends NativeWorker{
   constructor(...a){super(...a);const p=jpegBenchmark;if(!String(a[0]).includes('export-worker.js'))return;
    this.addEventListener('message',({data:m})=>{if(!p)return;p.messagesReceived++;if(m.benchmarkSent)p.transferToMainMs+=now()-m.benchmarkSent;if(m.type==='need'){p.needReceived=now();if(!p.firstNeedMs)p.firstNeedMs=performance.now()-p.started;}
     if(m.type==='progress')p.stripes++;if(m.type==='done')p.worker=m.benchmark;
    });
   }
   postMessage(m,...a){if(jpegBenchmark){jpegBenchmark.messagesSent++;if(m.data)jpegBenchmark.transferredBytes+=m.data.byteLength;}return super.postMessage({...m,benchmarkSent:now()},...a);}
  };
 },hashPixels);
 const runs=[],profilePath=option('--profile',null),cdp=profilePath?await context.newCDPSession(page):null;if(cdp)await cdp.send('Profiler.enable');
 for(const engine of engines){
  await page.evaluate(engine=>{state.engine=engine;analyzeLevels();if(engine==='v2')FILMLABB_V2.setRendering('photographic',{version:2});},engine);
  for(const backend of backends)for(let rep=0;rep<=repeats;rep++){
   const profile=cdp&&engine===engines[0]&&backend==='main'&&rep===1;if(profile)await cdp.send('Profiler.start');
   const row=await page.evaluate(async({engine,backend,rep})=>{
    globalThis.Worker=backend==='worker'?jpegBenchmarkWorker:undefined;
    const p={engine,backend,rep,recipeGeometryMs:0,prepareMs:0,packMs:0,renderMs:0,canvasMs:0,encodingMs:0,yieldMs:0,transferToMainMs:0,messagesSent:0,messagesReceived:0,stripes:0,transferredBytes:0,maxInputBytes:0,maxOutputBytes:0,pixelHashPromises:[],started:performance.now()};
    globalThis.jpegBenchmark=p;const bytes=await jpegBytes();p.totalMs=performance.now()-p.started;p.jpegBytes=bytes.length;
    if(FILMLABB_EXPORT.snapshot().lastBackend!==backend)throw Error('Requested backend not exercised');
    if(working!==jpegBenchmarkSource||working.data!==jpegBenchmarkData||working.data.byteLength!==jpegBenchmarkSourceBytes)throw Error('Source ownership changed');
    if(p.worker){for(const k of ['prepareMs','renderMs','canvasMs','encodingMs','maxOutputBytes'])p[k]+=p.worker[k];p.transferToWorkerMs=p.worker.transferToWorkerMs;}
    p.otherMs=p.totalMs-p.recipeGeometryMs-p.prepareMs-p.packMs-p.renderMs-p.canvasMs-p.encodingMs-p.yieldMs-p.transferToMainMs-(p.transferToWorkerMs||0);
    const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));p.dimensions=[bitmap.width,bitmap.height];bitmap.close();if(p.dimensions[0]!==jpegExportInfo.width||p.dimensions[1]!==jpegExportInfo.height)throw Error('Incorrect decoded JPEG dimensions');p.pixelHashes=p.worker?.pixelHashes||await Promise.all(p.pixelHashPromises);delete p.pixelHashPromises;globalThis.jpegBenchmark=null;delete p.started;delete p.needReceived;return p;
   },{engine,backend,rep});
   if(profile)fs.writeFileSync(profilePath,JSON.stringify((await cdp.send('Profiler.stop')).profile));
   console.log(JSON.stringify({engine,backend,rep,totalMs:Math.round(row.totalMs),renderMs:Math.round(row.renderMs),packMs:Math.round(row.packMs),yieldMs:Math.round(row.yieldMs)}));if(rep)runs.push(row);
  }
 }
 const summarize=values=>{const a=[...values].sort((a,b)=>a-b);return {median:a[Math.floor(a.length/2)],min:a[0],max:a.at(-1),samples:values};};
 const summary=[];for(const engine of engines)for(const backend of backends){const rows=runs.filter(r=>r.engine===engine&&r.backend===backend),fields=['totalMs','recipeGeometryMs','prepareMs','packMs','renderMs','canvasMs','encodingMs','yieldMs','transferToMainMs','transferToWorkerMs','otherMs'];summary.push({engine,backend,megapixels:source.target.width*source.target.height/1e6,megapixelsPerSecond:(source.target.width*source.target.height/1e6)/(summarize(rows.map(r=>r.totalMs)).median/1000),...Object.fromEntries(fields.map(k=>[k,summarize(rows.map(r=>r[k]||0))])),stripes:rows.map(r=>r.stripes),messagesSent:rows[0].messagesSent,messagesReceived:rows[0].messagesReceived,transferredBytes:rows[0].transferredBytes,memory:{kind:'estimated buffer sizes; excludes native encoder/browser/GC memory',sourceBytes:source.bytes,canvasBytes:source.target.width*source.target.height*4,maxInputBytes:Math.max(...rows.map(r=>r.maxInputBytes)),maxOutputBytes:Math.max(...rows.map(r=>r.maxOutputBytes)),extraFullSourceCopies:0}});}
 const codeHash=createHash('sha256');for(const name of ['render-core.js','presentation-sampler.js','export-plan.js','export-controller.js','export-worker.js'])codeHash.update(name+'\n').update(ref?execFileSync('git',['show',ref+':'+assets[name]]):fs.readFileSync(assets[name]));
 let inputSHA256=null;if(raf){const digest=createHash('sha256');for await(const chunk of fs.createReadStream(raf))digest.update(chunk);inputSHA256=digest.digest('hex');}
 const report={schema:'filmlabb.jpeg-benchmark',version:1,codeRef:ref||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),exportCodeSHA256:codeHash.digest('hex'),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),environment:{node:process.version,browser:await h.browser.version(),os:os.platform()+' '+os.release(),cpu:os.cpus()[0].model,logicalCPUs:os.cpus().length,headless:true,physicalIPadOrEdge:false},input:raf?'private RAF through existing import; path omitted':'procedural Float32 linear Rec.2020 negative',inputSHA256,geometry,jpegQuality:.94,hashPixels,repeats,warmupsPerCombination:1,source,summary,runs};
 fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));console.log('Report:',path.resolve(output));
}finally{await h.close();}
