import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness(),bytes=new Uint8Array(2*1024*1024),offset=1024*1024,jpeg=new Uint8Array([255,216,1,2,3,4,255,217]);
bytes.set(new TextEncoder().encode('FUJIFILMCCD-RAW'));const view=new DataView(bytes.buffer);view.setUint32(84,offset,false);view.setUint32(88,jpeg.length,false);bytes.set(jpeg,offset);
function tracked(input){const blob=new Blob([input]);let read=0,whole=0;return {file:{size:blob.size,arrayBuffer(){whole++;throw Error('Full RAF read forbidden');},slice(a,b,type){const part=blob.slice(a,b,type),buffer=part.arrayBuffer.bind(part);part.arrayBuffer=()=>{read+=part.size;return buffer();};return part;}},counts:()=>({read,whole})};}
const t=tracked(bytes);h.context.rafFile=t.file;const bounded=await h.run('readRafJpeg(rafFile)');assert.deepEqual(t.counts(),{read:104,whole:0});assert.equal(bounded.type,'image/jpeg');assert.deepEqual(new Uint8Array(await bounded.arrayBuffer()),jpeg);
h.context.rafBytes=bytes.buffer;const old=h.run('extractRafJpeg(rafBytes)');assert.deepEqual(new Uint8Array(await old.arrayBuffer()),jpeg);
// Reuse the exact old range/signature rejection policy; malformed sources never
// fall back to a full-file read merely because the bounded check failed.
for(const mutate of [b=>b.fill(0,0,16),b=>new DataView(b.buffer).setUint32(84,99,false),b=>new DataView(b.buffer).setUint32(88,40000001,false),b=>new DataView(b.buffer).setUint32(84,b.length-2,false),b=>b[offset]=0,b=>b[offset+jpeg.length-1]=0]){
 const invalid=bytes.slice();mutate(invalid);const f=tracked(invalid);h.context.rafFile=f.file;h.context.rafBytes=invalid.buffer;
 let expected;try{h.run('extractRafJpeg(rafBytes)');}catch(e){expected=e.message;}assert.ok(expected);await assert.rejects(h.run('readRafJpeg(rafFile)'),e=>e.message===expected);assert.equal(f.counts().whole,0);
}
h.context.rafFile={arrayBuffer:async()=>bytes.buffer};assert.deepEqual(new Uint8Array(await (await h.run('readRafJpeg(rafFile)')).arrayBuffer()),jpeg);
console.log('PASS bounded RAF preview reads 104 validation bytes, returns identical JPEG, preserves malformed-source rejection and buffer-only adapters');
