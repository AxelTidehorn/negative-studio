import assert from 'node:assert/strict';
import {harness} from './helpers/app-harness.mjs';

const h=harness();h.context.crypto=crypto;
h.run(`
 render=()=>{};scheduleRender=()=>{};
 working={width:240,height:192,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(240*192*3)};
 for(let y=0;y<192;y++)for(let x=0;x<240;x++){
  const edge=x<30||x>=210||y<24||y>=168,t=edge?1:.1+.55*(x+y)/432;
  for(let c=0;c<3;c++)working.data[(y*240+x)*3+c]=[.8,.5,.25][c]*t;
 }
 workingPreview=working;src=new ImageData(240,192);previewSrc=src;
 sourceInfo={encoding:'linear',colorSpace:'rec2020',domain:'verified-linear-rec2020-tiff'};
 state={...defaultState(),engine:'v2',conversionVersion:2,editVersion:2,cropConfirmed:true,captureSession2:'test-session'};
 cropRegion={x:.14,y:.14,w:.72,h:.72};
 roll=[{file:{name:'a.tif',size:276480,lastModified:1},settings:{...state},geometry:NSGeometry.create(),crop:{...cropRegion}}];activeFrame=0;
 analyzeLevels();
`);
const json=js=>JSON.parse(h.run('JSON.stringify('+js+')'));
const snapshot=()=>json('({recipe:state.v2Recipe,count:v2AnalysisCount})');
const initial=snapshot();
assert.equal(initial.recipe.base.acceptance,'automatic-platform');
assert.deepEqual(initial.recipe.base.rgb,[Math.fround(.8),.5,.25]);
await h.run('detectBase2()');
assert.equal(h.run('proposal2.measurement.status'),'safe');
assert.equal(h.run('accepted2()'),null);
assert.equal(h.run('CE.findBase(working,cropRegion)'),null);
assert.equal(h.run('state.v2Recipe.base.origin'),'prior','activating Filmbas 2 must discard the unapproved cached automatic base');
assert.deepEqual(json('state.v2Recipe.base.rgb'),[1,1,1]);
assert.deepEqual(json('state.v2Recipe.calibration'),initial.recipe.calibration);
const missing=snapshot();
for(let i=0;i<5;i++)h.run('configuration38();analyzeLevels();');
assert.deepEqual(snapshot(),missing,'identical configuration/analysis requests keep the frozen V2 recipe and analysis count');

h.run("$('base2Preview').onclick()");
assert.equal(h.run('state.v2Recipe.base.status'),'proposal-preview');
assert.equal(h.run('accepted2()'),null);
h.run("$('base2Preview').onclick()");
assert.equal(h.run('state.v2Recipe.base.origin'),'prior');
h.run("$('base2Preview').onclick()");
await h.run('detectBase2()');
assert.equal(h.run('state.v2Recipe.base.origin'),'prior','a new search must also cancel the active proposal in the V2 recipe');
h.run('acceptBase2()');
assert.equal(h.run('!!accepted2()'),true);
assert.equal(h.run('state.v2Recipe.base.acceptance'),'user-approved');
assert.equal(h.run('state.v2Recipe.base.method'),'auto-region');
assert.deepEqual(json('state.v2Recipe.base.rgb'),initial.recipe.base.rgb);
const accepted=snapshot();
assert.deepEqual(accepted.recipe.calibration,initial.recipe.calibration);
for(let i=0;i<5;i++)h.run('configuration38();analyzeLevels();');
assert.deepEqual(snapshot(),accepted);
await h.run('detectBase2()');
assert.deepEqual(snapshot(),accepted,'searching without an active preview does not invalidate an unchanged approved recipe');

h.run(`accepted2().baseLocked=false;setProposal2(FM2.measure(working,{x:.35,y:.3,w:.1,h:.1}));acceptBase2();`);
assert.notDeepEqual(json('state.v2Recipe.base.rgb'),accepted.recipe.base.rgb);
assert.notEqual(h.run('state.v2Recipe.intent.id'),accepted.recipe.intent.id);
assert.deepEqual(json('state.v2Recipe.calibration'),accepted.recipe.calibration);
h.run("$('base2Undo').onclick()");
assert.deepEqual(json('state.v2Recipe.base.rgb'),accepted.recipe.base.rgb);
assert.equal(h.run('state.v2Recipe.intent.exposure'),accepted.recipe.intent.exposure);
assert.deepEqual(json('state.v2Recipe.calibration'),accepted.recipe.calibration);

// A render/export snapshot must remain immutable through later base changes.
h.run('globalThis.frozenConfig=configuration38();globalThis.frozenPixel=NSPixelKernel.compile(frozenConfig).pixel([.2,.1,.05]);');
const frozen=json('frozenConfig'),stable=snapshot();
h.run(`state.exposure=.75;state.rotation=90;configuration38({...state});state.engine='calibrated4';analyzeLevels();state.engine='v2';analyzeLevels();`);
assert.deepEqual(snapshot(),stable,'editing, rotation and a same-domain engine round trip do not reanalyze V2');
assert.deepEqual(json('frozenConfig'),frozen);
assert.deepEqual(json('NSPixelKernel.compile(frozenConfig).pixel([.2,.1,.05])'),json('frozenPixel'));

// Incompatible capture must pause a reference, never substitute it across domains.
h.run("state.captureSession2='another-session';analyzeLevels();");
assert.equal(h.run('accepted2()'),null);
assert.equal(h.run('state.v2Recipe.base.origin'),'prior');
h.run("state.captureSession2='test-session';analyzeLevels();");
assert.deepEqual(json('state.v2Recipe.base.rgb'),accepted.recipe.base.rgb);
const restored=snapshot();
h.run('state.noBase=true;analyzeLevels();');
assert.equal(h.run('state.v2Recipe.base.origin'),'prior');
h.run('state.noBase=false;analyzeLevels();');
assert.deepEqual(json('state.v2Recipe.base.rgb'),restored.recipe.base.rgb);

// Cold start with Filmbas 2 has the same explicit fallback as activation on a
// warm source. No detector is called behind the proposal/acceptance owner.
h.run('state.acceptedCalibration2=null;v2LastSource=null;v2AutomaticCache=null;analyzeLevels();');
assert.deepEqual(json('state.v2Recipe.base.rgb'),[1,1,1]);
assert.equal(h.run('state.v2Recipe.base.status'),'uncalibrated');
console.log('PASS V2 warm/cold Filmbas 2, automatic proposal/accept, preview/cancel, manual change/undo, source compatibility, no-base, immutable snapshots and stable identical analysis/engine/editing requests');
