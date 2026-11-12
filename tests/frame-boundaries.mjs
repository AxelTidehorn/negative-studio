import assert from 'node:assert/strict';
import '../src/image/image-model.js';import '../src/calibration/frame-detector.js';import '../src/calibration/frame-selection.js';import '../src/calibration/color-analysis.js';
import {negativeFrame} from './helpers/negative-frame.mjs';
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
