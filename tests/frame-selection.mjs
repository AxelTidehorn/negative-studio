import assert from 'node:assert/strict';import fs from 'node:fs';import zlib from 'node:zlib';
import '../src/image/image-model.js';import '../src/calibration/frame-detector.js';import '../src/calibration/frame-selection.js';
import {harness} from './helpers/app-harness.mjs';import {negativeFrame} from './helpers/negative-frame.mjs';
for(const f of ['core','render','fast','platform'])await import('../src/conversion-v2/'+f+'.js');
const S=NSFrameSelection,D=NSFrameDetector,full={x:0,y:0,w:1,h:1},im={width:480,height:321};
for(const [w,h]of [[.5,.5],[.85,.13],[.1,.86],[.72,.43]]){
 const region={x:.04,y:.04,w,h},quad=S.rectangle(region),d={version:1,coordinateSpace:'normalized-source',quad,analysisQuad:D.inset(quad,.5,im.width,im.height),analysisSafe:false,confidence:.55,region:full,proposal:region};
 const pending=S.detected(d,im);assert.ok(S.valid(pending));assert.equal(pending.status,'pending');assert.deepEqual(S.region(pending),region);assert.equal(S.area(pending).status,'unconfirmed');
 const accepted=S.detected({...d,analysisSafe:true},im);assert.equal(accepted.status,'automatic');assert.equal(S.area(accepted).polygon.length,4);
 const manual=S.create(quad,{status:NSFrameSelection.status.confirmed,locked:true});assert.ok(S.valid(manual));assert.equal(S.area(manual).status,'confirmed');assert.equal(S.area(manual).polygon,undefined);
}
const no=S.detected({version:1,coordinateSpace:'normalized-source',quad:null,analysisQuad:null,analysisSafe:false,confidence:0},im);assert.equal(no.origin,'full');assert.equal(no.status,'pending');assert.deepEqual(S.region(no),full);
for(const change of [s=>s.status='unknown',s=>s.quad[0].x=-1,s=>s.analysisQuad[0].x=-1,s=>s.sourceDimensions.width=0,s=>s.quad.reverse()]){const s=structuredClone(no);change(s);assert.equal(S.valid(s),false);}
const rectangleRegion={x:.2525,y:.2,w:.5,h:.6};assert.deepEqual(S.area(S.rectangular(rectangleRegion,{status:NSFrameSelection.status.confirmed})),{region:rectangleRegion,status:NSFrameSelection.status.confirmed});
const h=harness({initialEngine:'v2'});h.context.crypto=globalThis.crypto;
const meta=JSON.parse(fs.readFileSync('tests/fixtures/frame-real/dsf8983.json')),b=zlib.gunzipSync(fs.readFileSync('tests/fixtures/frame-real/dsf8983.f32.gz')),data=new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));h.set('fixture',{...meta,data});
h.run(`render=()=>{};scheduleRender=()=>{};working=fixture;workingPreview=fixture;sourceInfo={encoding:'linear',colorSpace:'rec2020',label:'bounded source'};src=new ImageData(working.width,working.height);state={...defaultState(),engine:'v2'};const d=CE.detectFrame(working);applyFrameSelection(NSFrameSelection.detected(d,working));roll=[{file:{name:'_DSF8983.dng'},settings:{...state},geometry:NSGeometry.create()}];activeFrame=0;preparePlatformV2();`);
assert.equal(h.run('state.frame.detection.confidence'),.55);assert.equal(h.run('v2Area().status'),'unconfirmed');assert.equal(h.run('state.v2Recipe.base.origin'),'prior');assert.equal(h.run('state.v2Recipe.intent.analysis.exposure.fallback'),'ANALYSIS_AREA_UNCONFIRMED');
h.run(`globalThis.baseCalls=0;const find=CE.findBase;CE.findBase=(...args)=>{baseCalls++;return find(...args);};confirmFrameSelection();`);assert.equal(h.run('v2Area().status'),'confirmed');const first=h.run('state.v2Recipe.intent.id'),calls=h.run('baseCalls');assert.ok(calls>0);
// Same bounding rectangle, changed polygon: invalidate automatic base AND scene
// analysis. Then pending changes must drop that automatic measurement entirely.
h.run(`const s=state.frame,q=s.quad.map(p=>({...p}));q[0].x+=.01;applyFrameSelection(NSFrameSelection.create(q,{status:NSFrameSelection.status.confirmed}));preparePlatformV2();`);assert.notEqual(h.run('state.v2Recipe.intent.id'),first);assert.ok(h.run('baseCalls')>calls);
h.run(`cropChanged('manual',{keepQuad:true});`);assert.equal(h.run('v2Area().status'),'unconfirmed');assert.equal(h.run('state.v2Recipe.base.origin'),'prior');assert.equal(h.run('state.v2Recipe.intent.analysis.exposure.fallback'),'ANALYSIS_AREA_UNCONFIRMED');assert.equal(h.run('roll[0].settings.frame.status'),'pending');
h.run('confirmFrameSelection();');assert.equal(h.run('roll[0].settings.frame.status'),'confirmed');assert.equal(h.run('v2Area().polygon.length'),4);
console.log('PASS format-independent selection, three states, confirmed/locked current records, validation, real 8983 proposal, V2 abstention/confirmation, automatic-base invalidation and queue metadata');
