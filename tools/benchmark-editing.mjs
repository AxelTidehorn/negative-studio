/* Same driver for frozen main and candidate. No timing pass/fail thresholds. */
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {browserHarness} from '../tests/helpers/browser.mjs';
const [root='.',output='/tmp/editing-benchmark.json',repeats='7']=process.argv.slice(2);process.chdir(path.resolve(root));
const {browser,url,close}=await browserHarness();
try{
 const page=await browser.newPage({serviceWorkers:'block'});page.setDefaultTimeout(120000);await page.goto(url);await page.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu');
 const result=await page.evaluate(async n=>{
  const summarize=a=>{const v=[...a].sort((a,b)=>a-b);return {median:v[Math.floor(v.length/2)],min:v[0],max:v.at(-1),samples:a};},summary=[],images=[];
  const scenarios=[{name:'original-neutral',editVersion:1,values:{}},{name:'original-adjusted',editVersion:1,values:{exposure:.7,contrast:1.2,gamma:1.1,shadows:30,highlights:30,saturation:1.4}}];
  if(globalThis.NSEditing2)scenarios.push({name:'editing2-neutral',editVersion:2,values:{}},{name:'editing2-adjusted',editVersion:2,values:scenarios[1].values});
  const source=working.data,sourceBytes=source.byteLength,original={...state},originalDownload=downloadBlob,analysis=JSON.stringify({calibration,base,cropRegion,analyses:analysisCount38});downloadBlob=()=>{};
  try{for(const scenario of scenarios){
   state={...original,editVersion:scenario.editVersion,...scenario.values,cropConfirmed:true};const c=configuration38(),cpu=[],gpu=[],jpeg=[],tiff=[],g=NSGpuPreview.create(document.createElement('canvas'));
   for(let i=0;i<n+1;i++){
    let t=performance.now();NSPixelKernel.render(workingPreview,c,'positive',480);if(i)cpu.push(performance.now()-t);
    t=performance.now();g.draw(workingPreview,c,'positive',700,sourceVersion38);g.context.finish();if(i)gpu.push(performance.now()-t);
   }
   const uploads=g.metrics.uploads;g.destroy();
   for(let i=0;i<n+1;i++){
    let t=performance.now();await exportTiff();if(i)tiff.push(performance.now()-t);
    t=performance.now();await jpegBytes();if(i)jpeg.push(performance.now()-t);
   }
   const image=NSPixelKernel.render(workingPreview,c,'positive',480),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').putImageData(new ImageData(image.data,image.width,image.height),0,0);images.push({name:scenario.name,png:canvas.toDataURL()});canvas.width=canvas.height=0;
   summary.push({name:scenario.name,cpu480Ms:summarize(cpu),gpu700FinishMs:summarize(gpu),jpegWorkerMs:summarize(jpeg),tiffMs:summarize(tiff),gpuUploads:uploads});
  }}finally{state=original;downloadBlob=originalDownload;}
  return {summary,images,sourceUnchanged:working.data===source&&source.byteLength===sourceBytes,analysisUnchanged:analysis===JSON.stringify({calibration,base,cropRegion,analyses:analysisCount38}),export:FILMLABB_EXPORT.snapshot()};
 },Number(repeats));
 const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),sampleCount:Number(repeats),assetCache:fs.readFileSync('site/cache-worker.js','utf8').match(/const CACHE='([^']+)'/)[1],fixture:'demo-negative.png 900×600, headless Chromium, SwiftShader; warm samples, native encoding/startup included',...result};delete report.images;
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 const html='<!doctype html><meta charset="utf-8"><title>FILMLABB synthetic editing comparison</title><style>body{font:16px system-ui;background:#222;color:#eee;max-width:1100px;margin:auto;padding:24px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}img{width:100%}</style><h1>Synthetic editing comparison</h1><p>Generated from the repository demo negative with frozen calibration. This is a renderer/regression comparison, not validation of photographic quality. Identical slider values have different strengths.</p><div class="grid">'+result.images.map(x=>'<figure><figcaption>'+x.name+'</figcaption><img src="'+x.png+'"></figure>').join('')+'</div>';
 fs.writeFileSync(output.replace(/\.json$/,'.html'),html);console.log(JSON.stringify(report,null,2));
}finally{await close();}
