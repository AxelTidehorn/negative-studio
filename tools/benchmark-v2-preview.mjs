/* Real application preview owner + geometry presentation; synthetic linear
   TIFF-domain source uses the existing import owner. No benchmark render path. */
import fs from 'node:fs';import os from 'node:os';
import {ensureBuild} from './build-artifact.mjs';import {browserHarness} from '../tests/helpers/browser.mjs';
const args=process.argv.slice(2),option=(k,d)=>{const i=args.indexOf(k);return i<0?d:args[i+1];},width=Number(option('--width','1400')),height=Number(option('--height','1000')),repeats=Number(option('--repeats','3')),edits=Number(option('--edits','12')),raf=option('--raf',null),output=option('--output','.cache/v2-preview-benchmark.json');
const detail=args.includes('--detail');
ensureBuild();const h=await browserHarness(),runs=[];
try{
 for(const backend of ['cpu','auto'])for(let repeat=0;repeat<repeats;repeat++){
  const p=await h.browser.newPage({viewport:{width:1024,height:768},hasTouch:true,locale:'sv-SE',serviceWorkers:'block'});p.setDefaultTimeout(180000);await p.addInitScript(backend=>localStorage.setItem('filmlabb-preview-backend',backend),backend);await p.goto(h.url);
  if(raf){await p.locator('#imageFile').setInputFiles(raf);await p.waitForFunction(()=>working&&!rollLoading);}
  else await p.evaluate(async({width,height})=>{
   const data=new Float32Array(width*height*3),rgb=[.8,.45,.2];for(let y=0;y<height;y++)for(let x=0;x<width;x++){const n=(y*width+x)*3,d=.1+1.1*x/width+.2*Math.sin(y/91)+.03*((x*13+y*17)%31)/31;for(let c=0;c<3;c++)data[n+c]=rgb[c]*10**(-d*(1+c*.07));}
   await importRawRGB16({width,height,data,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'},'benchmark-linear.tif',{camera_model:'Synthetic'});
  },{width,height});
  // Retain ordinary source/calibration ownership; measure the first V2 switch.
  await p.evaluate(()=>{globalThis.benchmarkStarted=performance.now();});await p.locator('#engineMode').selectOption('v2');
  await p.waitForFunction(()=>state.engine==='v2'&&!rollLoading&&FILMLABB_GEOMETRY.snapshot().sourceVersion===sourceVersion38&&FILMLABB_GEOMETRY.snapshot().configKey===previewConfigKey38(configuration38()));
  const first=await p.evaluate(async()=>{await new Promise(requestAnimationFrame);const g=FILMLABB_GPU.snapshot(),m=FILMLABB_GEOMETRY.snapshot();const r=state.v2Recipe,t=r.intent;return {recipe:{base:r.base.rgb,calibrationId:r.calibration.id,exposure:t.exposure,tone:t.tone,photographic:t.photographic,output:t.output,color:t.colorCorrection?{version:t.colorCorrection.version,gains:t.colorCorrection.gains,knots:t.colorCorrection.knots}:null},switchToPresentedMs:performance.now()-benchmarkStarted,presentationSubmitAt:m.presentedAt,source:{width:working.width,height:working.height,previewWidth:workingPreview.width,previewHeight:workingPreview.height,previewBytes:workingPreview.data.byteLength},gpu:g,cpu:FILMLABB_PERFORMANCE.snapshot()};});
  if(backend==='auto'&&first.gpu.backend!=='gpu')throw Error('GPU path not exercised: '+first.gpu.reason);
  // Let first idle histogram and detail settle; it is not part of manual latency.
  await p.waitForTimeout(900);
  const before=await p.evaluate(()=>({...FILMLABB_GPU.snapshot(),cpuCache:FILMLABB_PERFORMANCE.snapshot().v2Cache})),latencies=[];
  for(let n=0;n<edits;n++){
   const row=await p.evaluate(async({n,detail})=>{
    const start=performance.now(),prior=FILMLABB_GEOMETRY.snapshot().renderId,el=$('exposure');el.value=String(350+(n*37)%300);el.dispatchEvent(new Event('input',{bubbles:true}));if(detail)el.dispatchEvent(new Event('change',{bubbles:true}));const key=previewConfigKey38(configuration38());
    await new Promise((resolve,reject)=>{const check=()=>{const r=FILMLABB_GEOMETRY.snapshot();const full=!detail||Math.max(r.colorSize?.width||0,r.colorSize?.height||0)===Math.min(1400,Math.max(workingPreview.width,workingPreview.height));const submitted=FILMLABB_GPU.snapshot().backend==='gpu'||r.renderId===lastPreview38?.id;if(r.configKey===key&&r.renderId!==prior&&full&&submitted){requestAnimationFrame(()=>resolve());return;}if(performance.now()-start>30000){reject(Error('Presentation timeout'));return;}requestAnimationFrame(check);};check();});
    return {ms:performance.now()-start,submissionMs:FILMLABB_GEOMETRY.snapshot().presentedAt-start,backend:FILMLABB_GPU.snapshot().backend,gpuMs:FILMLABB_GPU.snapshot().lastGpuMs};
   },{n,detail});latencies.push(row);
  }
  await p.evaluate(()=>{$('exposure').dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(900);
  const after=await p.evaluate(()=>({...FILMLABB_GPU.snapshot(),cpuCache:FILMLABB_PERFORMANCE.snapshot().v2Cache})),sorted=latencies.map(r=>r.ms).sort((a,b)=>a-b),count=first.source.previewWidth*first.source.previewHeight;
  const row={backend:backend==='auto'?'gpu':'cpu',repeat,first,latencies,medianMs:sorted[Math.floor(sorted.length/2)],minMs:sorted[0],maxMs:sorted.at(-1),p90Ms:sorted[Math.floor(sorted.length*.9)],cache:{reconstructions:backend==='auto'?after.positiveReconstructions-before.positiveReconstructions:(after.cpuCache?.conversions||0)-(before.cpuCache?.conversions||0),positiveUploads:after.positiveUploads-before.positiveUploads,validationUploads:after.validationUploads-before.validationUploads},estimatedBytes:{positiveCpuMainAndWorker:backend==='auto'?24*count:12*count,positiveGpuLogical:backend==='auto'?12*count:0,positiveGpuPossibleRGBAStorage:backend==='auto'?16*count:0},after};
  runs.push(row);console.log(JSON.stringify({backend:row.backend,repeat,firstMs:Math.round(first.switchToPresentedMs),medianMs:row.medianMs,minMs:row.minMs,maxMs:row.maxMs,cache:row.cache}));await p.close();
 }
 if(runs.some(r=>JSON.stringify(r.first.recipe)!==JSON.stringify(runs[0].first.recipe)))throw Error('Benchmark recipes differ');
 const report={schema:'filmlabb.v2-preview-benchmark-1',date:new Date().toISOString(),environment:{node:process.version,platform:process.platform,cpus:os.availableParallelism(),cpu:os.cpus()[0].model,browser:await h.browser.version(),renderer:'See V2 parity report; launch uses --enable-unsafe-swiftshader',viewport:[1024,768],source:raf?'private RAW; path excluded':'synthetic linear Rec.2020 through importRawRGB16'},quality:detail?'detail 1400px both backends':'ordinary interactive policy: CPU 240px / GPU adaptive initially 700px',method:'First switch includes source preparation and browser UI dispatch. Edit input→geometry submission→next requestAnimationFrame is a paint-opportunity proxy, not physical display latency. CPU interactive 240px/GPU initially 700px; final 1400px. gpuMs is asynchronous timer-query time, nullable; submission times are CPU wall time. Memory is logical estimate, not measured heap/driver allocation. No interactive readPixels or gl.finish.',runs};fs.mkdirSync(output.includes('/')?output.slice(0,output.lastIndexOf('/')):'.',{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
}finally{await h.close();}
