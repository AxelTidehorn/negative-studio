import assert from 'node:assert/strict';
import {harness} from '../tests/check-app-harness.mjs';
function setup(){
 const h=harness();h.run(`render=()=>{};scheduleRender=()=>{};
 working={width:48,height:32,channels:3,data:Uint16Array.from({length:48*32*3},(_,i)=>4000+(i*73)%42000),scale:65535,encoding:'linear'};
 workingPreview=CE.preview(working);sourceInfo={encoding:'linear',label:'fixture'};src=new ImageData(48,32);previewSrc=src;
 state={...defaultState(),cropConfirmed:true};cropRegion={x:.1,y:.125,w:.8,h:.75};analyzeLevels();
 roll=Array.from({length:4},(_,i)=>({file:{name:i+'.tif'},settings:{...state,rotation:i*90,cropExport:i%2===0,rawMode4:'wide'},crop:{...cropRegion},selected:true,sourceMetadata:{camera:'original-'+i}}));
 activeFrame=0;state={...roll[0].settings};
 chooseFrame=async i=>{activeFrame=i;state={...roll[i].settings};cropRegion={...roll[i].crop};};
 downloadBlob=b=>globalThis.savedProject=b;`);return h;
}
const json=(h,expr)=>JSON.parse(h.run('JSON.stringify('+expr+')'));
async function save(h){h.elements.get('saveSettings').onclick();return JSON.parse(await h.context.savedProject.text());}
async function load(h,data){await h.elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify(data)}],value:'project'}});}
const h=setup(),initial=await save(h);
assert.equal(initial.format,'negative-studio-roll-beta6');assert.equal(initial.geometryVersion,1);assert.equal(initial.cropExportToFrame,false);
// Model-only changes must never touch source analysis, color settings or existing output.
const untouched=json(h,'({state,calibration,cropRegion,sharedResponse4,sourceInfo,settings:roll.map(f=>f.settings)})');
const before=h.run('Array.from(NSPixelKernel.exportRows(working,configuration38(),CE.exportGeometry(working,cropRegion,state.cropExport,state.rotation),0,24))');
h.run("globalThis.analysisBefore=analyzeLevels;analyzeLevels=()=>{throw Error('composition invoked analysis');};render=()=>{throw Error('composition invoked rendering');};setCompositionCrop(0,{x:.2,y:.1,w:.5,h:.7});setCompositionCrop(1,{x:0,y:0,w:1,h:1});");
assert.deepEqual(json(h,'({state,calibration,cropRegion,sharedResponse4,sourceInfo,settings:roll.map(f=>f.settings)})'),untouched);
assert.deepEqual(h.run('Array.from(NSPixelKernel.exportRows(working,configuration38(),CE.exportGeometry(working,cropRegion,state.cropExport,state.rotation),0,24))'),before);
h.run('analyzeLevels=analysisBefore;render=()=>{};');
assert.equal(h.run('roll[2].geometry'),undefined,'composition must not initialize another frame');
const composed=await save(h);assert.deepEqual(composed.frames[0].geometry.compositionCrop,{x:.2,y:.1,w:.5,h:.7});
composed.frames[0].geometry.rotation.fineDegrees=12.5;await load(h,composed);const restored=await save(h);
assert.deepEqual(restored.frames[0].geometry,composed.frames[0].geometry);assert.equal(h.run('state.rotation'),0,'fine angle cannot leak into production rotation');
assert.deepEqual(h.run('Array.from(NSPixelKernel.exportRows(working,configuration38(),CE.exportGeometry(working,cropRegion,state.cropExport,state.rotation),0,24))'),before);
assert.deepEqual(restored.frames.map(f=>f.settings),composed.frames.map(f=>f.settings));
assert.deepEqual(restored.frames.map(f=>f.sourceMetadata),composed.frames.map(f=>f.sourceMetadata));
assert.deepEqual(restored.frames.map(f=>f.crop),composed.frames.map(f=>f.crop));
console.log('PASS independent composition, no analysis/render/color mutation, identical current export pixels, dormant fine angle and full metadata round trip');
// Every supported legacy format preserves mixed per-frame exports without homogenizing.
for(const format of ['negative-studio-roll-v08','negative-studio-roll-beta3']){
 const legacy=structuredClone(initial);legacy.format=format;delete legacy.geometryVersion;delete legacy.cropExportToFrame;
 for(const f of legacy.frames)delete f.geometry;
 await load(h,legacy);assert.equal(h.run('rollShared.cropExportToFrame'),true,'first legacy frame defines default for new images');
 const migrated=await save(h);
 assert.deepEqual(migrated.frames.map(f=>f.settings),legacy.frames.map(f=>f.settings));
 assert.deepEqual(migrated.frames.map(f=>f.geometry.cropExportToFrameOverride),[null,false,null,false]);
 for(let i=0;i<4;i++){
  const old=legacy.frames[i],now=migrated.frames[i];h.context.oldFrame=old;h.context.newFrame=now;
  assert.deepEqual(json(h,'(()=>{const a=CE.exportGeometry(working,oldFrame.crop,oldFrame.settings.cropExport,oldFrame.settings.rotation),b=CE.exportGeometry(working,newFrame.crop,newFrame.settings.cropExport,newFrame.settings.rotation);return [a.width,a.height,...Array.from({length:a.width*a.height},(_,i)=>a.at(i%a.width,Math.floor(i/a.width)))];})()'),json(h,'(()=>{const b=CE.exportGeometry(working,newFrame.crop,newFrame.settings.cropExport,newFrame.settings.rotation);return [b.width,b.height,...Array.from({length:b.width*b.height},(_,i)=>b.at(i%b.width,Math.floor(i/b.width)))];})()'));
  assert.equal(now.geometry.rotation.quarterTurns,i);assert.equal(now.geometry.rotation.fineDegrees,0);
 }
 await load(h,migrated);assert.deepEqual((await save(h)).frames,migrated.frames);
}
console.log('PASS legacy v08/beta3 mixed crop flags, all quarter turns, exact export source coordinates and repeated migration');
// A partial project changes the queue default without changing unmatched exports.
const partial=structuredClone(initial);partial.format='negative-studio-roll-v08';delete partial.geometryVersion;delete partial.cropExportToFrame;partial.frames=partial.frames.slice(0,1);delete partial.frames[0].geometry;
await load(h,partial);assert.equal(h.run('rollShared.cropExportToFrame'),true);
assert.deepEqual(json(h,'roll.map(f=>NSGeometry.effectiveCrop(f.geometry,rollShared.cropExportToFrame))'),[true,false,true,false]);
console.log('PASS partial imports keep unmatched frame exports coherent with the new queue default');
// Preserve the old filename matcher (first queued match) and never share models.
const duplicates=setup();duplicates.run('roll[0].file.name="same.tif";roll[1].file.name="same.tif";roll[1].geometry=NSGeometry.create(90);roll[1].geometry.rotation.fineDegrees=-3;');
const duplicateProject=await save(duplicates);duplicateProject.frames=duplicateProject.frames.slice(0,1);duplicateProject.frames[0].geometry.rotation.fineDegrees=9;
await load(duplicates,duplicateProject);assert.equal(duplicates.run('roll[0].geometry.rotation.fineDegrees'),9);assert.equal(duplicates.run('roll[1].geometry.rotation.fineDegrees'),-3);assert.equal(duplicates.run('roll[1].settings.rotation'),90);assert.equal(duplicates.run('roll[0].geometry===roll[1].geometry'),false);
console.log('PASS duplicate filenames retain existing first-match behavior and independent per-image models');
// Explicit queue-wide edits clear migration overrides, but never individual geometry.
h.run('roll[0].geometry.rotation.fineDegrees=7;setCompositionCrop(0,{x:.1,y:.2,w:.7,h:.6});');
const own=json(h,'roll.map(f=>({crop:f.crop,rotation:f.geometry.rotation,composition:f.geometry.compositionCrop}))');
h.run('analyzeLevels=()=>{throw Error("queue crop invoked analysis");};setQueueCropExportToFrame(false);');
assert.deepEqual(json(h,'roll.map(f=>({crop:f.crop,rotation:f.geometry.rotation,composition:f.geometry.compositionCrop}))'),own);
assert.ok(h.run('roll.every(f=>f.settings.cropExport===false&&f.geometry.cropExportToFrameOverride===null)'));
assert.equal(h.run('state.cropExport'),false);
h.run('setQueueCropExportToFrame(true);analyzeLevels=analysisBefore;');
h.elements.get('cropExport').onchange({target:{checked:false}});assert.equal(h.run('rollShared.cropExportToFrame'),true);assert.equal(h.run('roll[0].geometry.cropExportToFrameOverride'),false);assert.equal(h.run('roll[1].settings.cropExport'),true);
h.elements.get('cropExport').onchange({target:{checked:true}});assert.equal(h.run('roll[0].geometry.cropExportToFrameOverride'),null);
// Actual import handler, decoder/navigation substituted: newly imported images inherit the shared value.
h.run("chooseFrame=async i=>{activeFrame=i;state={...roll[i].settings};};makeThumb=async()=>null;");
await h.run("importRoll([{name:'new.tif'},{name:'new2.png'}])");
assert.equal(h.run('roll.length'),2);assert.ok(h.run('roll.every(f=>f.settings.cropExport===true&&f.geometry.version===1&&f.geometry.cropExportToFrameOverride===null)'));
console.log('PASS queue inheritance, explicit shared crop changes clear only overrides and preserve individual crop/composition/rotation');
// Invalid geometry must fail before changing any app/DOM preference or queued image.
const a=setup(),valid=await save(a);
a.run("$('exportName').value='original';$('exportDigits').value='2';");
const snapshot=()=>json(a,'({state,roll,rollShared,activeFrame,cropRegion,calibration,sharedResponse4,exportName:$("exportName").value,exportDigits:$("exportDigits").value})');
const original=snapshot();
const mutations=[
 p=>p.frames[1].crop={x:0,y:0,w:0,h:1},
 p=>p.frames[1].crop={x:-.1,y:0,w:.5,h:1},
 p=>p.frames[1].geometry.version=9,
 p=>p.geometryVersion=9,
 p=>p.frames[1].geometry.rotation.fineDegrees=Infinity,
 p=>p.frames[1].geometry.rotation.fineDegrees=46,
 p=>p.frames[1].geometry.rotation.quarterTurns=1.5,
 p=>p.frames[1].geometry.compositionCrop={x:0,y:0,w:2,h:1},
 p=>p.frames[1].settings.rotation=90.5,
 p=>p.frames[1].geometry.rotation.quarterTurns=2,
 p=>p.cropExportToFrame='yes',
 p=>{p.frames[1].filename='unmatched.tif';p.frames[1].geometry.compositionCrop={};},
];
for(const mutate of mutations){const bad=structuredClone(valid);bad.profile='gold';bad.exportNaming={prefix:'must-not-apply',digits:'3'};bad.frames[0].settings.exposure=2;mutate(bad);await load(a,bad);assert.deepEqual(snapshot(),original);assert.match(a.elements.get('status').textContent,/Projektimport:.*geometri/);}
for(const format of ['negative-studio-roll-v08','negative-studio-roll-beta3']){
 const bad=structuredClone(valid);bad.format=format;delete bad.geometryVersion;delete bad.cropExportToFrame;bad.frames[1].settings.rotation=1;await load(a,bad);assert.deepEqual(snapshot(),original);
}
console.log('PASS atomic rejection of malformed/unsupported/conflicting geometry, including later and unmatched frames in new and old projects');
