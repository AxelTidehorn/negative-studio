import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
function setup(){const h=harness({editingVersion:1});h.run(`render=()=>{};scheduleRender=()=>{};
 working={width:48,height:32,channels:3,data:Uint16Array.from({length:48*32*3},(_,i)=>4000+(i*73)%42000),scale:65535,encoding:'linear'};workingPreview=CE.preview(working);sourceInfo={encoding:'linear',label:'fixture'};src=new ImageData(48,32);previewSrc=src;state={...defaultState(),cropConfirmed:true};cropRegion={x:.1,y:.125,w:.8,h:.75};analyzeLevels();
 roll=Array.from({length:4},(_,i)=>({file:{name:i+'.tif'},settings:{...state,rotation:i*90,cropExport:i%2===0,rawMode4:'wide'},crop:{...cropRegion},selected:true,sourceMetadata:{camera:'original-'+i}}));activeFrame=0;state={...roll[0].settings};
 chooseFrame=async i=>{activeFrame=i;state={...roll[i].settings};cropRegion={...roll[i].crop};};downloadBlob=b=>globalThis.savedProject=b;`);return h;}
const json=(h,e)=>JSON.parse(h.run('JSON.stringify('+e+')'));
async function save(h){h.elements.get('saveSettings').onclick();return JSON.parse(await h.context.savedProject.text());}
async function load(h,d){await h.elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify(d)}],value:'p'}});}
const h=setup(),initial=await save(h);assert.equal(initial.format,'filmlabb-roll-3');assert.equal(initial.roll.cropExportToFrame,false);assert.equal(initial.geometryVersion,1);
const before=json(h,'({state,calibration,cropRegion,sharedResponse4,sourceInfo,settings:roll.map(f=>f.settings)})'),pixels=h.run('Array.from(NSPixelKernel.exportRows(working,configuration38(),CE.exportGeometry(working,cropRegion,true,0),0,24))');
h.run('globalThis.originalAnalysis=analyzeLevels;analyzeLevels=()=>{throw Error("composition invoked analysis");};render=()=>{throw Error("composition invoked render");};setCompositionCrop(0,{cx:-.1,cy:.05,w:.6,h:.4});');
assert.deepEqual(json(h,'({state,calibration,cropRegion,sharedResponse4,sourceInfo,settings:roll.map(f=>f.settings)})'),before);
assert.deepEqual(h.run('Array.from(NSPixelKernel.exportRows(working,configuration38(),CE.exportGeometry(working,cropRegion,true,0),0,24))'),pixels);
h.run('analyzeLevels=originalAnalysis;render=()=>{};');const composed=await save(h);composed.frames[0].geometry.rotation.fineDegrees=12.5;await load(h,composed);const restored=await save(h);
assert.deepEqual(restored.frames.map(f=>f.settings),composed.frames.map(f=>f.settings));assert.deepEqual(restored.frames.map(f=>f.sourceMetadata),composed.frames.map(f=>f.sourceMetadata));assert.deepEqual(restored.frames[0].geometry,composed.frames[0].geometry);assert.equal(h.run('state.rotation'),0);
console.log('PASS composition/fine metadata independent of all color/analysis/source settings, persistent R/L coordinates and unchanged legacy quarter-turn control');
for(const format of ['negative-studio-roll-v08','negative-studio-roll-beta3']){
 const old=structuredClone(initial);old.format=format;const snapshot=JSON.stringify(json(h,'({roll,state,rollShared})'));await load(h,old);assert.equal(JSON.stringify(json(h,'({roll,state,rollShared})')),snapshot);assert.match(h.elements.get('status').textContent,/FILMLABB 3/);
}
const frozen=setup();await save(frozen);const desired=json(frozen,'roll.map(f=>f.geometry)');frozen.run('analyzeLevels=()=>{throw Error("queue crop invoked analysis")};setQueueCropExportToFrame(true);setQueueCropExportToFrame(false);');assert.deepEqual(json(frozen,'roll.map(f=>f.geometry)'),desired);
const partial=setup();await save(partial);partial.run('setCompositionCrop(1,{cx:-.2,cy:.1,w:.4,h:.3});roll[1].geometry.rotation.fineDegrees=4;');
const untouched=json(partial,'roll[1].geometry'),one=structuredClone(initial);one.frames=one.frames.slice(0,1);
await load(partial,one);assert.deepEqual(json(partial,'roll[1].geometry'),untouched);assert.equal(partial.run('rollShared.cropExportToFrame'),false);
partial.run('state.rotation=90;state.exposure=1;saveCurrentFrame();setCompositionCrop(0,{cx:-.1,cy:.1,w:.5,h:.3});roll[0].geometry.rotation.fineDegrees=7;');
const resetGeometry=json(partial,'({g:roll[0].geometry,crop:cropRegion,shared:rollShared.cropExportToFrame})');partial.elements.get('reset').onclick();assert.equal(partial.run('state.rotation'),90);assert.equal(partial.run('state.exposure'),0);assert.deepEqual(json(partial,'({g:roll[0].geometry,crop:cropRegion,shared:rollShared.cropExportToFrame})'),resetGeometry);
console.log('PASS partial import preserves unmatched desired composition/fine angle, and color reset preserves both frames and all rotation');
// Existing control edits remain possible during export, but cannot alter its snapshot.
const job=setup();await save(job);job.run('downloadBlob=b=>globalThis.jobBlob=b;');await job.run('exportTiff()');const expectedBytes=await job.context.jobBlob.arrayBuffer();
const pending=job.run('exportTiff()');job.elements.get('cropExport').onchange({target:{checked:false}});assert.equal(job.run('state.cropExport'),false);await pending;
assert.deepEqual(new Uint8Array(await job.context.jobBlob.arrayBuffer()),new Uint8Array(expectedBytes));
console.log('PASS late legacy-control edits are retained while in-flight TIFF geometry stays frozen');
const a=setup(),valid=await save(a);a.run("$('exportName').value='original';");const snapshot=()=>json(a,'({state,roll,rollShared,activeFrame,cropRegion,calibration,sharedResponse4,name:$("exportName").value})'),original=snapshot();
for(const mutate of [
 p=>p.frames[1].crop={x:0,y:0,w:0,h:1},p=>p.frames[1].geometry.version=9,p=>p.geometryVersion=9,p=>p.frames[1].geometry.rotation.fineDegrees=Infinity,p=>p.frames[1].geometry.rotation.fineDegrees=46,p=>p.frames[1].geometry.rotation.quarterTurns=1.5,p=>p.frames[1].geometry.compositionCrop={cx:0,cy:0,w:0,h:1},p=>p.frames[1].geometry.sourceSize={width:1e9,height:1e9},p=>p.frames[1].settings.rotation=90.5,p=>p.roll.cropExportToFrame='yes',p=>{p.frames[1].filename='unmatched.tif';p.frames[1].geometry.compositionCrop={};},p=>{p.frames[1].filename=p.frames[0].filename;},p=>{delete p.roll;p.cropExportToFrame=false;}
]){const bad=structuredClone(valid);bad.look={id:'film.kodak-gold-200',strength:.7};bad.exportNaming={prefix:'must-not-apply',digits:'3'};bad.frames[0].settings.exposure=2;mutate(bad);await load(a,bad);assert.deepEqual(snapshot(),original);assert.match(a.elements.get('status').textContent,/Projektimport:.*geometri/);}
a.run('roll[1].file.name=roll[0].file.name;');const dup=snapshot();await load(a,valid);assert.deepEqual(snapshot(),dup);assert.match(a.elements.get('status').textContent,/tvetydigt filnamn/);
console.log('PASS atomic malformed/draft/oversized/conflicting geometry and ambiguous filename rejection before any app preferences change');
