import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {harness} from '../tests/check-app-harness.mjs';
let failed=0;
async function test(name,fn){try{await fn();console.log('PASS',name);}catch(e){failed++;console.error('FAIL',name,e.message);}}
function setup(){
 const h=harness();h.context.DOMException=DOMException;
 h.run(`render=()=>{};scheduleRender=()=>{};
 working={width:4,height:3,channels:3,data:new Uint16Array(36).fill(20000),scale:65535,encoding:'linear'};
 workingPreview=CE.preview(working);sourceInfo={encoding:'linear',label:'fixture'};src=new ImageData(4,3);previewSrc=src;
 state={...defaultState(),cropConfirmed:true};cropRegion={x:0,y:0,w:1,h:1};
 roll=[{file:{name:'one.tif'},settings:{...state},selected:true},{file:{name:'two.tif'},settings:{...state},selected:true}];activeFrame=0;analyzeLevels();
 globalThis.downloads=[];downloadBlob=(blob,name)=>downloads.push({blob,name});
 $('exportName').value='Sommarö';$('exportDigits').value='2';`);
 return h;
}
await test('TIFF uses sanitized prefix and keeps exact 16-bit samples',async()=>{
 const h=setup();await h.run('exportTiff()');assert.equal(h.context.downloads[0].name,'Sommarö.tif');
 const bytes=await h.context.downloads[0].blob.arrayBuffer();h.set('__bytes',bytes);
 assert.ok(h.run('parseTiff16(__bytes).icc.length>0'));
 assert.deepEqual(Array.from(h.run('parseTiff16(__bytes).data')),Array.from(h.run('NSPixelKernel.exportRows(working,configuration38(),CE.exportGeometry(working,cropRegion,false,0),0,working.height)')));
 for(const rotation of [0,90,180,270]){
  h.run(`state.cropExport=true;state.rotation=${rotation};cropRegion={x:.25,y:0,w:.5,h:1};`);
  await h.run('exportTiff()');h.set('__bytes',await h.context.downloads.at(-1).blob.arrayBuffer());
  assert.deepEqual(Array.from(h.run('parseTiff16(__bytes).data')),Array.from(h.run('(()=>{const g=CE.exportGeometry(working,cropRegion,true,state.rotation);return NSPixelKernel.exportRows(working,configuration38(),g,0,g.height);})()')));
 }
 h.context.downloads.length=1;
 h.run("$('exportName').value='bad/name. ';rollingExport=true;activeFrame=1;");await h.run('exportTiff()');assert.equal(h.context.downloads[1].name,'bad_name_02.tif');
 h.run("$('exportName').value='';rollingExport=false;");await h.run('exportTiff()');assert.equal(h.context.downloads[2].name,'filmlabb-positive-16bit.tif');
});
await test('TIFF rejects encoder failure and unlocks export',async()=>{
 const h=setup();h.run("NSPixelKernel.exportRows=()=>{throw Error('fixture encoder failure');};");
 await assert.rejects(h.run('exportTiff()'),/fixture encoder failure/);assert.equal(h.run('exportBusy'),false);assert.equal(h.elements.get('exportTiff').disabled,false);
});
await test('batch TIFF reports partial failure and restores selection',async()=>{
 const h=setup();vm.runInContext(fs.readFileSync('export-controller.js','utf8'),h.context);
 h.run("chooseFrame=async i=>{activeFrame=i;};exportFrameTiff=async i=>{if(i===0)throw Error('fixture unreadable');downloads.push({name:exportName(i,'tif','legacy.tif')});};");
 await h.elements.get('batchTiff').onclick();assert.equal(h.context.downloads.length,1);assert.match(h.elements.get('status').textContent,/1.*2.*1.*misslyck/);assert.equal(h.run('activeFrame'),0);assert.equal(h.run('rollingExport'),false);assert.equal(h.context.FILMLABB_EXPORT.snapshot().batch,false);
});
await test('batch TIFF cancel stops before next frame',async()=>{
 const h=setup();vm.runInContext(fs.readFileSync('export-controller.js','utf8'),h.context);
 h.run('chooseFrame=async i=>{activeFrame=i;};exportFrameTiff=async i=>{downloads.push(i);FILMLABB_EXPORT.cancel();};');
 await h.elements.get('batchTiff').onclick();assert.equal(h.context.downloads.length,1);assert.match(h.elements.get('status').textContent,/avbruten/i);assert.equal(h.run('rollingExport'),false);
});
await test('TIFF cancellation between stripes releases busy state without download',async()=>{
 const h=setup();vm.runInContext(fs.readFileSync('export-controller.js','utf8'),h.context);
 h.run('working={...working,height:40,data:new Uint16Array(4*40*3).fill(20000)};');
 const p=h.run('exportTiff()');assert.equal(h.context.FILMLABB_EXPORT.snapshot().sourceIntact,true);h.context.FILMLABB_EXPORT.cancel();await assert.rejects(p,{name:'AbortError'});assert.equal(h.context.downloads.length,0);assert.equal(h.run('exportBusy'),false);
});
await test('TIFF batch retains the five-image limit',async()=>{
 const h=setup();vm.runInContext(fs.readFileSync('export-controller.js','utf8'),h.context);
 h.run('roll=Array.from({length:6},(_,i)=>({file:{name:i+".tif"},selected:true}));exportFrameTiff=()=>{throw Error("must not start");};');
 await h.elements.get('batchTiff').onclick();assert.equal(h.run('rollingExport'),false);assert.equal(h.context.downloads.length,0);assert.match(h.elements.get('status').textContent,/fem/);
});
await test('ZIP names declare UTF-8 in both headers',async()=>{
 const h=setup();const buf=await h.run("makeZip([['Sommarö_01.jpg',new Uint8Array([1,2,3])]])").arrayBuffer(),v=new DataView(buf);
 assert.equal(v.getUint16(6,true)&0x800,0x800);const offset=30+new TextEncoder().encode('Sommarö_01.jpg').length+3;assert.equal(v.getUint16(offset+8,true)&0x800,0x800);
});
if(failed)process.exitCode=1;
