import {sourcePath} from '../tests/helpers/source.mjs';
// Reproducible bounded CPU sampling benchmark, not a timing assertion in CI.
// Default: samples <=~0.3 MP across each 24/40 MP source; --full processes all rows.
import {performance} from 'node:perf_hooks';
import {harness} from '../tests/helpers/app-harness.mjs';
for(const file of ['creative-profiles.js','raw-input.js','flat-field.js','image-model.js','geometry.js','color-parameters.js','render-core.js','export-plan.js','presentation-sampler.js'])await import('../'+sourcePath(file));
const h=harness();h.run(`render=()=>{};scheduleRender=()=>{};state={...defaultState(),cropConfirmed:true};sourceInfo={encoding:'linear'};cropRegion={x:0,y:0,w:1,h:1};working={width:31,height:23,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:31*23*3},(_,i)=>2000+(i*137)%50000)};workingPreview=CE.preview(working);analyzeLevels();`);
const config=JSON.parse(h.run('JSON.stringify(configuration38())')),full=process.argv.includes('--full'),results=[];
for(const [width,height] of [[6000,4000],[8000,5000]]){
 const im={width,height,channels:3,scale:65535,encoding:'linear',data:new Uint16Array(width*height*3)};
 for(let i=0;i<im.data.length;i++)im.data[i]=2000+(i*137)%50000;
 const start=performance.now(),prepared=NSPixelKernel.prepare(im,config),prepareMs=performance.now()-start;
 for(const fine of [0,2,15]){
  const model=NSGeometry.create();model.rotation.fineDegrees=fine;const g=NSPresentation.plan(im,model,false,null);
  const times=[];let pixels=0,maxStripeBytes=0,checksum=0;
  for(let repeat=0;repeat<3;repeat++){
   pixels=0;const t=performance.now(),step=full?0:Math.max(1,Math.floor(g.height/8));
   for(let y=0;y<g.height;){
    const rows=full?NSPresentation.rows(im,g,g,g.height-y):Math.min(4,g.height-y);
    const out=NSPresentation.tiff(im,config,g,y,rows,prepared);checksum+=out[0];pixels+=g.width*rows;maxStripeBytes=Math.max(maxStripeBytes,out.byteLength);
    y+=full?rows:step;
   }
   times.push(performance.now()-t);
  }
  const medianMs=times.sort((a,b)=>a-b)[1];
  results.push({sourceMP:width*height/1e6,fine,output:[g.width,g.height],sampledPixels:pixels,medianMs:+medianMs.toFixed(2),msPerMP:+(medianMs/pixels*1e6).toFixed(2),prepareMs:+prepareMs.toFixed(2),maxOutputStripeBytes:maxStripeBytes,sourceBytes:im.data.byteLength,checksum});
 }
}
console.log(JSON.stringify({mode:full?'full rows, three repetitions':'bounded rows distributed across source, three repetitions; excludes encoding/download',node:process.version,stripeBudget:NSPresentation.STRIPE_BYTES,results},null,2));
