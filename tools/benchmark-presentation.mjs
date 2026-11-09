/* Reproducible Node microbenchmark, not a browser/26-MP time prediction. */
import os from 'node:os';import fs from 'node:fs';import vm from 'node:vm';import {performance} from 'node:perf_hooks';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {harness} from '../tests/helpers/app-harness.mjs';
const width=Number(process.argv[2]||640),height=Number(process.argv[3]||480),repeats=Number(process.argv[4]||3),h=harness();
h.run(`render=()=>{};scheduleRender=()=>{};working={width:40,height:30,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:3600},(_,i)=>3000+(i*173)%55000)};workingPreview=CE.preview(working);sourceInfo={encoding:'linear',label:'synthetic benchmark'};state={...defaultState(),engine:'log39',cropConfirmed:true};cropRegion={x:0,y:0,w:1,h:1};analyzeLevels();rollShared.look={id:'film.kodak-gold-200',strength:1};`);
const current=h.context.NSPresentation;vm.runInContext(fs.readFileSync('tests/fixtures/presentation-sampler-before-optimization.js','utf8'),h.context);const before=h.context.NSPresentation;h.context.NSPresentation=current;
const K=h.context.NSPixelKernel,G=h.context.NSGeometry,config=h.run('configuration38()'),im={width,height,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:width*height*3},(_,i)=>3000+(i*173)%55000)},frame={x:.025,y:.035,w:.94,h:.92};
const report={kind:'Node microbenchmark, synthetic linear RGB; exact full Gold P/operator; no native file/encoder',node:process.version,platform:[os.platform(),os.release(),os.arch()].join(' '),cpu:os.cpus()[0].model,inputSHA256:createHash('sha256').update(Buffer.from(im.data.buffer)).digest('hex'),configSHA256:createHash('sha256').update(JSON.stringify(config)).digest('hex'),baselineSamplerSHA256:createHash('sha256').update(fs.readFileSync('tests/fixtures/presentation-sampler-before-optimization.js')).digest('hex'),samplerSHA256:createHash('sha256').update(fs.readFileSync('src/export/presentation-sampler.js')).digest('hex'),width,height,repeats,cacheBytes:current.CACHE_BYTES??0,cases:[]};
for(const [name,quarter,fine,crop,composition] of [['direct',0,0,false,false],['quarter-crop',1,0,true,false],['fine',0,2.3,false,false],['fine-composition-quarter',1,-3.4,true,true]]){
 const model=G.create(quarter*90);model.rotation.fineDegrees=fine;if(composition)model.compositionCrop={cx:.02,cy:-.03,w:.65,h:.48};const g=current.plan(im,model,crop,frame),rows=[];let expected;
 for(const [label,P] of [['before',before],['after',current]]){
  const times=[];let digest,stats;
  for(let run=0;run<repeats;run++){
   const prepared=K.prepare(im,config),sha=createHash('sha256'),began=performance.now();
   for(let y=0;y<g.height;y+=16){const out=P.tiff(im,config,g,y,Math.min(16,g.height-y),prepared);sha.update(Buffer.from(out.buffer,out.byteOffset,out.byteLength));}
   times.push(performance.now()-began);digest=sha.digest('hex');stats=P.cacheStats?.(prepared);P.release?.(prepared);
   if(expected)assert.equal(digest,expected);else expected=digest;
  }
  const sorted=[...times].sort((a,b)=>a-b);rows.push({label,ms:times,min:sorted[0],median:sorted[Math.floor(sorted.length/2)],max:sorted.at(-1),sha256:digest,cache:stats});
 }
 report.cases.push({name,output:[g.width,g.height],results:rows,speedup:rows[0].median/rows[1].median});
}
console.log(JSON.stringify(report,null,2));
