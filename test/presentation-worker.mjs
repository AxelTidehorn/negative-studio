import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {harness} from '../tests/check-app-harness.mjs';
const h=harness(),P=h.context.NSPresentation,E=h.context.NSExportPlan,G=h.context.NSGeometry,K=h.context.NSPixelKernel;
h.run(`render=()=>{};scheduleRender=()=>{};state={...defaultState(),cropConfirmed:true};sourceInfo={encoding:'linear'};cropRegion={x:0,y:0,w:1,h:1};working={width:13,height:11,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:13*11*3},(_,i)=>1000+(i*173)%52000)};workingPreview=CE.preview(working);analyzeLevels();`);
const config=JSON.parse(h.run('JSON.stringify(configuration38())'));
async function worker(im,g,target,corrupt=false,legacy={}){
 const messages=[],stripes=[];
 class Canvas{
  constructor(w,h){this.width=w;this.height=h;}
  getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:(out,x,y)=>stripes.push({y,data:out.data})};}
  async convertToBlob(){return new Blob([new Uint8Array([255,216,255,217])],{type:'image/jpeg'});}
 }
 const c={console,Blob,Uint8Array,Uint8ClampedArray,Uint16Array,Float32Array,Float64Array,OffscreenCanvas:Canvas,postMessage:m=>messages.push(m)};c.self=c;
 vm.createContext(c);c.importScripts=(...files)=>{for(const f of files)vm.runInContext(fs.readFileSync(f.replace('./',''),'utf8'),c);};vm.runInContext(fs.readFileSync('export-worker.js','utf8'),c);
 await c.onmessage({data:{type:'start',id:1,source:E.metadata(im),config,region:legacy.region||{x:0,y:0,w:1,h:1},crop:legacy.crop||false,rotation:legacy.rotation||0,target,presentation:g.spec||null}});
 let transferred=0;
 while(true){
  const m=messages.shift();assert.ok(m,'worker stalled');
  if(m.type==='error'){assert.equal(corrupt,true,m.error);assert.match(m.error,/ordning eller storlek/);return;}
  if(m.type==='done')break;
  if(m.type!=='need')continue;
  const packed=P.pack(im,g,target,m.y,m.rows);transferred+=packed.byteLength;
  assert.ok(packed.byteLength<=P.STRIPE_BYTES);
  await c.onmessage({data:{type:'stripe',id:1,y:m.y+(corrupt?1:0),rows:m.rows,data:packed}});
 }
 const actual=new Uint8ClampedArray(target.width*target.height*4);for(const s of stripes)actual.set(s.data,s.y*target.width*4);
 assert.ok(Buffer.from(actual).equals(Buffer.from(P.rgba(im,K.prepare(im,config),g,target,0,target.height))),`worker/main mismatch (${im.encoding}, ${im.scale}, flat=${!!im.flatField}, fine=${g.spec?.model.rotation.fineDegrees??0})`);assert.ok(transferred>0);
}
let cases=0;
for(const Type of [Uint8Array,Uint16Array,Float32Array])for(const flat of [false,true])for(const fine of [0,-15,-2,-.1,.1,2,15]){
 const scale=Type===Uint8Array?255:Type===Uint16Array?65535:1;
 const im={width:83,height:67,channels:4,scale,encoding:cases%2?'srgb':'linear',data:Type.from({length:83*67*4},(_,i)=>scale*((i*37+127)%251)/251)};
 if(flat)im.flatField={size:3,gains:Array.from({length:27},(_,i)=>.65+i/41)};
 const model=G.create((cases%4)*90);model.rotation.fineDegrees=fine;const g=P.plan(im,model,cases%2===0,{x:.1,y:.13,w:.72,h:.73});
 await worker(im,g,{width:Math.max(1,g.width-3),height:Math.max(1,g.height-2)},false,{region:{x:.1,y:.13,w:.72,h:.73},crop:cases%2===0,rotation:(cases%4)*90});cases++;
}
const im=h.run('working'),model=G.create();model.rotation.fineDegrees=2;const g=P.plan(im,model,false,null);await worker(im,g,g,true);
console.log('PASS',cases,'actual JPEG-worker protocol cases match main pre-encode pixels, including flat-field, resized geometry and stripe seams; malformed stripe rejected');
// Application TIFF and active fallback canvases share geometry, color, and 16-bit data.
h.run(`roll=[{file:{name:'synthetic.tif'},settings:{...state},crop:{...cropRegion},selected:true,geometry:NSGeometry.create()}];activeFrame=0;roll[0].geometry.rotation.fineDegrees=2;downloadBlob=b=>globalThis.tiffBlob=b;`);
const before=h.run('JSON.stringify({state,calibration,base,cropRegion,sharedResponse4,analyses:analysisCount38})');
await h.run('exportTiff()');h.set('__bytes',await h.context.tiffBlob.arrayBuffer());
const decoded=await h.run('NSTiff.decode(__bytes)'),snapshot=h.run('exportGeometrySnapshot(working).g'),prepared=K.prepare(im,config);
assert.equal(decoded.width,snapshot.width);assert.equal(decoded.height,snapshot.height);
assert.deepEqual(Array.from(decoded.data),Array.from(P.tiff(im,config,snapshot,0,snapshot.height,prepared)));
assert.equal(h.run('JSON.stringify({state,calibration,base,cropRegion,sharedResponse4,analyses:analysisCount38})'),before);
// Capture each canvas stripe before encoding (harness canvas normally keeps only last).
const create=h.context.document.createElement,captured=[];
h.context.document.createElement=tag=>{const el=create(tag);if(tag==='canvas'){const get=el.getContext.bind(el);el.getContext=()=>{const cx=get();cx.putImageData=(out,x,y)=>captured.push({y,data:out.data});return cx;};}return el;};
const safe=await h.run('makeSafeJpegExportCanvas(12000000,{im:working,g:exportGeometrySnapshot(working).g,pixels:NSPixelKernel.prepare(working,configuration38())})');
const expected=P.rgba(im,prepared,snapshot,snapshot,0,snapshot.height),out=new Uint8ClampedArray(expected.length);for(const s of captured)out.set(s.data,s.y*snapshot.width*4);assert.deepEqual(out,expected);assert.equal(safe.width,snapshot.width);
captured.length=0;h.run('makeExportCanvas()');out.fill(0);for(const s of captured)out.set(s.data,s.y*snapshot.width*4);assert.deepEqual(out,expected);
console.log('PASS application 16-bit TIFF, safe JPEG canvas and synchronous fallback use identical presentation plan; export leaves analysis/calibration/preview state unchanged');

// A later internal geometry edit must not change an in-flight TIFF snapshot.
await h.run('exportTiff()');const frozenBytes=new Uint8Array(await h.context.tiffBlob.arrayBuffer());
const pending=h.run('exportTiff()');h.run('roll[0].geometry.rotation.fineDegrees=-15;roll[0].geometry.compositionCrop={cx:.1,cy:0,w:.4,h:.3};');await pending;
assert.deepEqual(new Uint8Array(await h.context.tiffBlob.arrayBuffer()),frozenBytes);
console.log('PASS later internal geometry edits cannot alter an in-flight free-rotation TIFF snapshot');
// Direct JPEG RGBA stays on the old nearest permutation, even when resized.
for(const q of [0,90,180,270])for(const crop of [false,true]){
 const frame={x:.13,y:.11,w:.72,h:.73},g=P.plan(im,G.create(q),crop,frame),old=h.context.NSColorEngine.exportGeometry(im,frame,crop,q),target={width:Math.max(1,g.width-2),height:Math.max(1,g.height-1)};
 const expected=new Uint8ClampedArray(target.width*target.height*4);
 for(let y=0;y<target.height;y++)for(let x=0;x<target.width;x++){
  const [sx,sy]=old.at(Math.floor((x+.5)*old.width/target.width),Math.floor((y+.5)*old.height/target.height)),p=prepared.pixel((sy*im.width+sx)*im.channels),i=(y*target.width+x)*4;
  for(let k=0;k<3;k++)expected[i+k]=Math.round(p[k]*255);expected[i+3]=255;
 }
 assert.deepEqual(P.rgba(im,prepared,g,target,0,target.height),expected);
}
console.log('PASS legacy JPEG pixels preserve the old full/cropped quarter-turn permutation and nearest resize');
// Exercise the existing batch/error owner with real presentation TIFF sampling.
vm.runInContext(fs.readFileSync('export-controller.js','utf8'),h.context);
h.context.DOMException=DOMException;
h.run(`roll.push({file:{name:'failed.tif'},settings:{...state},crop:{...cropRegion},geometry:NSGeometry.create(),selected:true});roll[1].geometry.rotation.fineDegrees=2;
 chooseFrame=async i=>{activeFrame=i;state={...roll[i].settings};cropRegion={...roll[i].crop};};
 globalThis.batchDownloads=[];downloadBlob=(blob,name)=>batchDownloads.push(name);
 globalThis.savedPrepare=NSPixelKernel.prepare;NSPixelKernel.prepare=(im,c)=>{if(activeFrame===1)return {pixel(){throw Error('synthetic neighbor failure');}};return savedPrepare(im,c);};`);
await h.elements.get('batchTiff').onclick();
assert.equal(h.context.batchDownloads.length,1);assert.match(h.elements.get('status').textContent,/1 av 2 exporterade, 1 misslyckade.*synthetic neighbor failure/);assert.equal(h.run('activeFrame'),0);assert.equal(h.run('exportBusy||rollingExport'),false);assert.equal(h.context.FILMLABB_EXPORT.snapshot().batch,false);
console.log('PASS real presentation TIFF batch reports a per-neighbor color failure, counts successes and restores selection/locks');
