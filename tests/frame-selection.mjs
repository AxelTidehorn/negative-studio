import assert from 'node:assert/strict';import fs from 'node:fs';import zlib from 'node:zlib';
import '../src/image/image-model.js';import '../src/calibration/frame-detector.js';import '../src/calibration/frame-selection.js';
import {harness} from './helpers/app-harness.mjs';
const S=NSFrameSelection,D=NSFrameDetector,full={x:0,y:0,w:1,h:1},im={width:480,height:321};
for(const [w,h]of [[.5,.5],[.85,.13],[.1,.86],[.72,.43]]){
 const region={x:.04,y:.04,w,h},quad=S.rectangle(region),d={version:1,coordinateSpace:'normalized-source',quad,analysisQuad:D.inset(quad,.5,im.width,im.height),analysisSafe:false,confidence:.55,region:full,proposal:region};
 const pending=S.detected(d,im);assert.equal(S.valid(pending),true);assert.equal(pending.status,'pending');assert.deepEqual(pending.quad,quad);assert.equal(S.area({frameSelection:pending,cropConfidence:.99,cropConfirmed:true},region,im).status,'unconfirmed');
 assert.deepEqual(S.restore({frameSelection:pending,cropMethod:'auto',frameDetection:d},region,im),pending);assert.deepEqual(S.restore({cropConfirmed:false,cropMethod:'auto',frameDetection:d},full,im).quad,quad);
 const accepted=S.detected({...d,analysisSafe:true},im);assert.equal(accepted.status,'automatic');assert.equal(S.area({frameSelection:accepted},region,im).polygon.length,4);
 const legacy=S.restore({cropConfirmed:true,cropMethod:'manual',cropLocked:true},region,im);assert.equal(legacy.status,'confirmed');assert.deepEqual(legacy.quad,quad);
}
const no=S.detected({version:1,coordinateSpace:'normalized-source',quad:null,analysisQuad:null,analysisSafe:false,confidence:0},im);assert.equal(no.origin,'full');assert.equal(no.status,'pending');assert.deepEqual(D.bounds(no.quad),full);
for(const change of [s=>s.status='unknown',s=>s.quad[0].x=-1,s=>s.analysisQuad[0].x=-1,s=>s.sourceDimensions.width=0,s=>s.quad.reverse()]){const s=structuredClone(no);change(s);assert.equal(S.valid(s),false);}
const h=harness({initialEngine:'v2'});h.context.crypto=globalThis.crypto;
const meta=JSON.parse(fs.readFileSync('tests/fixtures/frame-real/dsf8983.json')),b=zlib.gunzipSync(fs.readFileSync('tests/fixtures/frame-real/dsf8983.f32.gz')),data=new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));h.set('fixture',{...meta,data});
h.run(`render=()=>{};scheduleRender=()=>{};working=fixture;workingPreview=fixture;sourceInfo={encoding:'linear',colorSpace:'rec2020',label:'bounded source'};src=new ImageData(working.width,working.height);previewSrc=src;state={...defaultState(),engine:'v2'};const d=CE.detectFrame(working);state.frameDetection=d;state.cropMethod='auto';state.cropConfidence=d.confidence;applyFrameSelection(NSFrameSelection.detected(d,working));roll=[{file:{name:'_DSF8983.dng'},settings:{...state},crop:{...cropRegion}}];activeFrame=0;preparePlatformV2();`);
assert.equal(h.run('state.cropConfidence'),.55);assert.equal(h.run('v2Area().status'),'unconfirmed');assert.equal(h.run('state.v2Recipe.base.origin'),'prior');assert.equal(h.run('state.v2Recipe.intent.analysis.exposure.fallback'),'ANALYSIS_AREA_UNCONFIRMED');
h.run(`globalThis.baseCalls=0;const find=CE.findBase;CE.findBase=(...args)=>{baseCalls++;return find(...args);};confirmFrameSelection();`);assert.equal(h.run('v2Area().status'),'confirmed');const first=h.run('state.v2Recipe.intent.id'),calls=h.run('baseCalls');assert.ok(calls>0);
// Same bounding rectangle, changed polygon: invalidate automatic base AND scene
// analysis. Then pending changes must drop that automatic measurement entirely.
h.run(`const s=state.frameSelection,q=s.quad.map(p=>({...p}));q[0].x+=.01;applyFrameSelection(NSFrameSelection.create(q,{status:'confirmed'}));preparePlatformV2();`);assert.notEqual(h.run('state.v2Recipe.intent.id'),first);assert.ok(h.run('baseCalls')>calls);
h.run(`cropChanged('manual',{keepQuad:true});`);assert.equal(h.run('v2Area().status'),'unconfirmed');assert.equal(h.run('state.v2Recipe.base.origin'),'prior');assert.equal(h.run('state.v2Recipe.intent.analysis.exposure.fallback'),'ANALYSIS_AREA_UNCONFIRMED');assert.equal(h.run('roll[0].settings.frameSelection.status'),'pending');
h.run('confirmFrameSelection();');assert.equal(h.run('roll[0].settings.frameSelection.status'),'confirmed');assert.equal(h.run('v2Area().polygon.length'),4);
console.log('PASS format-independent selection, three states, legacy confirmed/locked and uncertain-project migration, validation, real 8983 proposal, V2 abstention/confirmation, automatic-base invalidation and queue metadata');
