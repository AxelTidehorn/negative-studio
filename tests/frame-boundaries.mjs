import assert from 'node:assert/strict';
import '../src/image/image-model.js';import '../src/calibration/color-analysis.js';
import {negativeFrame} from './helpers/negative-frame.mjs';
const results=[];
for(const options of [{},{angle:180},{angle:90,frame:{x:.25,y:.15,w:.5,h:.7}},{frame:{x:.04,y:.08,w:.90,h:.86},separator:1},{frame:{x:.018,y:.018,w:.962,h:.96},holder:0,separator:1},{angle:3},{angle:-4},{light:.12},{separator:0},{frame:{x:.15,y:.05,w:.76,h:.87}}]){
 const f=negativeFrame(options),d=NSColorAnalysis.detect(f.image),r=d.region;

 assert.ok(d.confidence>=.7,JSON.stringify({options,d}));
 for(const x of [r.x,r.x+r.w])for(const y of [r.y,r.y+r.h])assert.ok(f.inside(x*f.image.width,y*f.image.height),JSON.stringify({options,d,x,y}));
 assert.ok(r.w*r.h>f.frame.w*f.frame.h*.70,JSON.stringify({options,d}));results.push({options,confidence:d.confidence,region:r});
}
for(const options of [{weak:true},{missing:['top']},{missing:['left','bottom']},{frame:{x:0,y:0,w:1,h:1},holder:0,separator:0}]){
 const d=NSColorAnalysis.detect(negativeFrame(options).image);assert.ok(d.confidence<.67,JSON.stringify({options,d}));assert.equal(d.analysisSafe,false);
}
console.log('PASS',results.length,'synthetic independent four-side boundaries, thin/asymmetric film, dark separator/holder, uneven light, rotated frames and uncertain cases');

for(const s of ['core','render','fast','platform'])await import('../src/conversion-v2/'+s+'.js');
const f=negativeFrame(),detected=NSColorAnalysis.detect(f.image),region=detected.region;
const changed={...f.image,data:f.image.data.slice()};
for(let y=0;y<changed.height;y++)for(let x=0;x<changed.width;x++)if(!f.inside(x+.5,y+.5))changed.data.set([.85,.23,.11],(y*changed.width+x)*3);
const prepare=(image,area)=>NSV2Platform.prepare(image,{sourceKey:'synthetic-boundary',capture:{session:'test',recipe:{decoder:'synthetic'}},area});
const a=prepare(f.image,{region,status:'confirmed'}),b=prepare(changed,{region,status:'confirmed'});
assert.equal(a.intent.exposure,b.intent.exposure);assert.deepEqual(a.intent.colorCorrection,b.intent.colorCorrection);assert.equal(a.intent.analysis.maskId,b.intent.analysis.maskId);
const bad=prepare(f.image,{region:{x:.10,y:.03,w:.79,h:.88},status:'confirmed'});
assert.ok(Math.abs(bad.intent.exposure-a.intent.exposure)>.1);
const uncertain=prepare(f.image,{region,status:'estimated',method:'application-frame',confidence:.6});
assert.equal(uncertain.intent.colorCorrection.kind,'identity');assert.equal(uncertain.intent.analysis.exposure.fallback,'ANALYSIS_AREA_UNCONFIRMED');
console.log('PASS same motif/changed exterior: identical V2 balance, exposure, mask; wrong top strip changes EV by',bad.intent.exposure-a.intent.exposure,'; uncertain geometry abstains without a speculative inner crop');

// Exercise the actual application manual-change and lock owners as well.
const {harness}=await import('./helpers/app-harness.mjs');const h=harness();h.context.crypto=globalThis.crypto;h.set('fixture',f.image);
h.run(`render=()=>{};scheduleRender=()=>{};working=fixture;workingPreview=NSV2Platform.preview(working);sourceInfo={encoding:'linear',colorSpace:'rec2020',label:'synthetic'};src=new ImageData(workingPreview.width,workingPreview.height);previewSrc=src;state={...defaultState(),engine:'v2',noBase:true,cropConfirmed:true};cropRegion={x:.1,y:.03,w:.79,h:.88};roll=[{file:{name:'fixture.dng'},settings:{...state},crop:{...cropRegion}}];activeFrame=0;analyzeLevels();`);
const before=h.run('state.v2Recipe.intent.id'),count=h.run('v2AnalysisCount');h.set('correctFrame',region);h.run('cropRegion=correctFrame;cropChanged();');
assert.notEqual(h.run('state.v2Recipe.intent.id'),before);assert.ok(h.run('v2AnalysisCount')>count);assert.equal(h.run('state.cropMethod'),'manual');
const saved=h.run('JSON.stringify(cropRegion)');h.run("state.cropLocked=true;$('cropAuto').onclick();");assert.equal(h.run('JSON.stringify(cropRegion)'),saved);
console.log('PASS actual manual frame change reanalyzes V2; locked frame is not overwritten');

// Uncertain geometry must not silently choose a film-base sample outside it.
h.run(`state.cropConfirmed=false;state.cropConfidence=.6;state.noBase=false;state.auto=true;delete state.filmBaseVersion;v2AutomaticCache=null;v2LastSource=null;globalThis.baseCalls=0;CE.findBase=()=>{baseCalls++;return {measured:[.82,.30,.11],kind:'auto-region'};};preparePlatformV2();`);
assert.equal(h.run('baseCalls'),0);assert.equal(h.run('state.v2Recipe.base.origin'),'prior');
h.run('state.cropConfirmed=true;preparePlatformV2();');assert.equal(h.run('baseCalls'),1);assert.equal(h.run('state.v2Recipe.base.origin'),'measured');assert.equal(h.run('state.v2Recipe.base.source'),'automatic-platform');
console.log('PASS uncertain area cannot auto-select film base; confirmed geometry still enables the existing automatic base path');
