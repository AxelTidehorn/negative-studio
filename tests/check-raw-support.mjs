import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness();
for(const ext of ['RAF','dng','ARW','NEF','cr2','CR3','rw2'])assert.ok(h.run(`NSFileFormats.isRaw('frame.${ext}')`));
for(const ext of ['exe'])assert.equal(h.run(`NSFileFormats.supported('frame.${ext}')`),false);
assert.equal(h.elements.get('imageFile').accept,h.elements.get('referenceFile').accept);assert.match(h.elements.get('imageFile').accept,/\.arw/);
console.log('PASS central routing and both file pickers: RAF/DNG/ARW plus experimental NEF/CR2/CR3/RW2');
let disposed=0,opts;const pixels=Uint16Array.from({length:60*40*3},(_,i)=>10000+(i*31)%40000);
const createDecoder=()=>({open:async(b,o)=>{opts=o;},metadata:async()=>({camera_model:'ILME-FX30',color_data:{cam_mul:[2,1,1.5,0]},gps_data:{private:true}}),imageData:async()=>({width:60,height:40,bits:16,colors:3,data:pixels.slice()}),dispose(){disposed++;}});
h.context.factory=createDecoder;h.context.testFile={name:'frame.ARW',arrayBuffer:async()=>new ArrayBuffer(20)};
const result=await h.run("NSRawDecoder.decode(testFile,'protected',{createDecoder:factory})");assert.equal(disposed,1);assert.equal(opts.outputColor,8);assert.equal(result.im.bits,16);assert.equal(result.provenance.metadata.camera_model,'ILME-FX30');assert.ok(result.meta.color_data.cam_mul);assert.equal(result.meta.gps_data,undefined);
console.log('PASS adapter retains camera calibration and unchanged decode options; disposes worker');
for(const failure of ['open','metadata','imageData','shape']){
 h.context.factory=()=>({open:async()=>{if(failure==='open')throw Error('open failed');},metadata:async()=>{if(failure==='metadata')throw Error('metadata failed');return {};},imageData:async()=>{if(failure==='imageData')throw Error('image failed');return {width:2,height:2,bits:8,colors:3,data:pixels};},dispose(){disposed++;}});
 const n=disposed;await assert.rejects(h.run("NSRawDecoder.decode(testFile,'protected',{createDecoder:factory})"),/ARW-avkodning/);assert.equal(disposed,n+1);
}
console.log('PASS decode errors and invalid RGB16 reject with format context; decoder always disposed');
