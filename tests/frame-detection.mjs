/* Geometric evidence, uncertain/missing boundaries and real V2 area integration. */
import assert from 'node:assert/strict';import fs from 'node:fs';import zlib from 'node:zlib';
import '../src/image/image-model.js';import '../src/calibration/frame-detector.js';import '../src/calibration/frame-selection.js';import '../src/calibration/color-analysis.js';
import {negativeFrame} from './helpers/negative-frame.mjs';import {metrics,inside} from './helpers/frame-metrics.mjs';
{
const results=[];
for(const options of [{},{angle:180},{angle:90,frame:{x:.25,y:.15,w:.5,h:.7}},{frame:{x:.04,y:.08,w:.90,h:.86},separator:1},{frame:{x:.018,y:.018,w:.962,h:.96},holder:0,separator:1},{angle:3},{angle:-4},{light:.12},{separator:0},{frame:{x:.15,y:.05,w:.76,h:.87}}]){
 const f=negativeFrame(options),d=NSFrameDetector.detect(f.image),r=d.region;

 assert.ok(d.confidence>=.7,JSON.stringify({options,d}));
 for(const p of d.analysisQuad)assert.ok(f.inside(p.x*f.image.width,p.y*f.image.height),JSON.stringify({options,d,p}));
 assert.ok(r.w*r.h>f.frame.w*f.frame.h*.70,JSON.stringify({options,d}));results.push({options,confidence:d.confidence,region:r});
}
for(const options of [{weak:true},{missing:['top']},{missing:['left','bottom']},{frame:{x:0,y:0,w:1,h:1},holder:0,separator:0}]){
 const d=NSFrameDetector.detect(negativeFrame(options).image);assert.ok(d.confidence<.67,JSON.stringify({options,d}));assert.equal(d.analysisSafe,false);assert.deepEqual(d.region,{x:0,y:0,w:1,h:1});
}
console.log('PASS',results.length,'synthetic independent four-side boundaries, thin/asymmetric film, dark separator/holder, uneven light, rotated frames and uncertain cases');

for(const s of ['core','render','fast','platform'])await import('../src/conversion-v2/'+s+'.js');
const f=negativeFrame(),detected=NSFrameDetector.detect(f.image),region=detected.region;
const changed={...f.image,data:f.image.data.slice()};
for(let y=0;y<changed.height;y++)for(let x=0;x<changed.width;x++)if(!f.inside(x+.5,y+.5))changed.data.set([.85,.23,.11],(y*changed.width+x)*3);
const prepare=(image,area)=>NSV2Platform.prepare(image,{sourceKey:'synthetic-boundary',capture:{session:'test',recipe:{decoder:'synthetic'}},area});
const a=prepare(f.image,{region,status:NSFrameSelection.status.confirmed}),b=prepare(changed,{region,status:NSFrameSelection.status.confirmed});
assert.equal(a.intent.exposure,b.intent.exposure);assert.deepEqual(a.intent.colorCorrection,b.intent.colorCorrection);assert.equal(a.intent.analysis.maskId,b.intent.analysis.maskId);
const bad=prepare(f.image,{region:{x:.10,y:.03,w:.79,h:.88},status:NSFrameSelection.status.confirmed});
assert.ok(Math.abs(bad.intent.exposure-a.intent.exposure)>.1);
const uncertain=prepare(f.image,{region,status:'estimated',method:'application-frame',confidence:.6});
assert.equal(uncertain.intent.colorCorrection.kind,'identity');assert.equal(uncertain.intent.analysis.exposure.fallback,'ANALYSIS_AREA_UNCONFIRMED');
console.log('PASS same motif/changed exterior: identical V2 balance, exposure, mask; wrong top strip changes EV by',bad.intent.exposure-a.intent.exposure,'; uncertain geometry abstains without a speculative inner crop');

// Exercise the actual application manual-change and lock owners as well.
const {harness}=await import('./helpers/app-harness.mjs');const h=harness();h.context.crypto=globalThis.crypto;h.set('fixture',f.image);
h.run(`render=()=>{};scheduleRender=()=>{};working=fixture;workingPreview=NSV2Platform.preview(working);sourceInfo={encoding:'linear',colorSpace:'rec2020',label:'synthetic'};src=new ImageData(workingPreview.width,workingPreview.height);state={...defaultState(),engine:'v2',noBase:true,frame:NSFrameSelection.rectangular(typeof testRegion==='undefined'?{x:0,y:0,w:1,h:1}:testRegion,{status:NSFrameSelection.status.confirmed})};applyFrameSelection(NSFrameSelection.rectangular({x:.1,y:.03,w:.79,h:.88},{status:NSFrameSelection.status.confirmed}));roll=[{file:{name:'fixture.dng'},settings:{...state}}];activeFrame=0;analyzeLevels();`);
const before=h.run('state.v2Recipe.intent.id'),count=h.run('v2AnalysisCount');h.set('correctFrame',region);h.run('applyFrameSelection(NSFrameSelection.rectangular(correctFrame,{status:NSFrameSelection.status.confirmed}));cropChanged();');
assert.notEqual(h.run('state.v2Recipe.intent.id'),before);assert.ok(h.run('v2AnalysisCount')>count);assert.equal(h.run('state.frame.origin'),'manual');
const saved=h.run('JSON.stringify(frameRegion())');h.run("state.frame.locked=true;$('cropAuto').onclick();");assert.equal(h.run('JSON.stringify(frameRegion())'),saved);
console.log('PASS actual manual frame change reanalyzes V2; locked frame is not overwritten');

// Uncertain geometry must not silently choose a film-base sample outside it.
h.run(`state.frame={...state.frame,status:NSFrameSelection.status.pending};state.noBase=false;state.auto=true;delete state.filmBaseVersion;v2AutomaticCache=null;v2LastSource=null;globalThis.baseCalls=0;CE.findBase=()=>{baseCalls++;return {measured:[.82,.30,.11],kind:'auto-region'};};preparePlatformV2();`);
assert.equal(h.run('baseCalls'),0);assert.equal(h.run('state.v2Recipe.base.origin'),'prior');
h.run('confirmFrameSelection();');assert.ok(h.run('baseCalls')>0);assert.equal(h.run('state.v2Recipe.base.origin'),'measured');assert.equal(h.run('state.v2Recipe.base.source'),'automatic-platform');
console.log('PASS uncertain area cannot auto-select film base; confirmed geometry still enables the existing automatic base path');
}
{
let count=0;
const extended=process.env.FILMLABB_TEST_LEVEL==='extended';
for(const ratio of (extended?[.12,.4,1,1.5,4,8]:[.12,1,8]))for(const angle of (extended?[0,4,17]:[0,17])){
 const width=480,height=360;let fw=ratio>width/height?width*.78:height*.78*ratio,fh=fw/ratio;const a=angle*Math.PI/180,s=Math.min(1,width*.88/(fw*Math.cos(a)+fh*Math.sin(a)),height*.88/(fw*Math.sin(a)+fh*Math.cos(a)));fw*=s;fh*=s;
 const frame={x:(width-fw)/2/width,y:(height-fh)/2/height,w:fw/width,h:fh/height},f=negativeFrame({width,height,frame,angle}),d=NSFrameDetector.detect(f.image);
 assert.equal(d.analysisSafe,true,JSON.stringify({ratio,angle,d}));let retained=0,truth=0,leak=0;
 for(let y=0;y<height;y+=2)for(let x=0;x<width;x+=2){const p={x:(x+.5)/width,y:(y+.5)/height},v=f.inside(x+.5,y+.5);truth+=v;retained+=v&&NSFrameDetector.contains(d.quad,p.x,p.y);leak+=!v&&NSFrameDetector.contains(d.analysisQuad,p.x,p.y);}
 assert.ok(retained/truth>.975,JSON.stringify({ratio,angle,retained,truth,d}));assert.equal(leak,0,JSON.stringify({ratio,angle,d}));count++;
}
for(const newBase of [[.8,.8,.8],[.2,.6,.4]]){const f=negativeFrame({angle:7,light:.10});for(let i=0;i<f.image.data.length;i++)f.image.data[i]=f.image.data[i]/f.base[i%3]*newBase[i%3];assert.equal(NSFrameDetector.detect(f.image).analysisSafe,true);count++;}
const perspective=[{x:.15,y:.18},{x:.81,y:.13},{x:.84,y:.84},{x:.13,y:.82}],pd=new Float32Array(480*360*3),base=[.72,.38,.18];for(let y=0;y<360;y++)for(let x=0;x<480;x++){const subject=inside(perspective,{x:(x+.5)/480,y:(y+.5)/360});for(let c=0;c<3;c++)pd[(y*480+x)*3+c]=base[c]*(subject?10**(-(.25+1.2*(.5+.5*Math.sin(x*.075+y*.047+c*.1)))):1);}
const pdet=NSFrameDetector.detect({width:480,height:360,data:pd,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'}),pm=metrics(pdet.quad,pdet.analysisQuad,perspective,480,360);assert.equal(pdet.analysisSafe,true,JSON.stringify(pdet));assert.ok(pm.retainedMotifFraction>.975,JSON.stringify(pm));assert.ok(pm.includedBorderFraction<.002,JSON.stringify(pm));count++;
for(const split of [false,true]){const data=new Float32Array(480*360*3);for(let y=0;y<360;y++)for(let x=0;x<480;x++)data.set(split&&x>240?[.1,.1,.1]:[.5,.5,.5],(y*480+x)*3);const d=NSFrameDetector.detect({width:480,height:360,data,channels:3,scale:1,encoding:'linear'});assert.equal(d.analysisSafe,false);assert.equal(d.reason,'no-boundary-evidence');}
const left=negativeFrame({holder:0,frame:{x:.08,y:.17,w:.32,h:.66}}),right=negativeFrame({holder:0,frame:{x:.60,y:.17,w:.32,h:.66}});for(let i=0;i<left.image.data.length;i++)left.image.data[i]=Math.min(left.image.data[i],right.image.data[i]);const competing=NSFrameDetector.detect(left.image);assert.equal(competing.analysisSafe,false);assert.equal(competing.reason,'competing-regions');
const record=JSON.parse(fs.readFileSync(new URL('./fixtures/frame-real/dsf9235.json',import.meta.url))),b=zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/frame-real/dsf9235.f32.gz',import.meta.url))),im={...record,data:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))},d=NSFrameDetector.detect(im),m=metrics(d.quad,d.analysisQuad,record.referenceQuad,im.width,im.height);
assert.equal(d.analysisSafe,true,JSON.stringify(d));assert.ok(m.retainedMotifFraction>.97,JSON.stringify(m));assert.ok(m.includedBorderFraction<.01,JSON.stringify(m));assert.ok(m.maxBoundaryDeviationPixels<5,JSON.stringify(m));
assert.equal(NSFrameDetector.validRecord(d),true);assert.equal(NSFrameDetector.matches(d,d.region,im),true);assert.equal(NSFrameDetector.matches(d,{x:0,y:0,w:1,h:1},im),false);assert.equal(NSFrameDetector.validRecord({...d,quad:d.quad.map((p,i)=>i? p:{x:NaN,y:p.y})}),false);
console.log('PASS',count,'independently varied format/rotation/non-orange cases, no frame/single edge abstention; actual RAF-derived fixture',JSON.stringify({...m}));
}
