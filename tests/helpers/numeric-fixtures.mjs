/* Reviewed production values, independent of the candidate implementation. */
import fs from 'node:fs';import zlib from 'node:zlib';
export function numericReference(){
 const major=process.versions.node.split('.')[0];
 if(!['22','24'].includes(major))throw Error('Exact numeric fixtures support Node 22 and 24; use a reviewed runtime, never recapture to pass.');
 return JSON.parse(fs.readFileSync(new URL('../fixtures/numeric/node'+major+'.json',import.meta.url)));
}
export function numericImages(){
 const images={};for(const space of ['srgb','rec2020'])images[space]={width:67,height:45,data:Float32Array.from({length:67*45*3},(_,i)=>i<36?[0,1/65535,.0001,.001,.01,.18,.5,1,.9999,1e-8,.7,.07][i%12]:.005+((i*673+71)%65536)/65535*.89),channels:3,encoding:'linear',scale:1,colorSpace:space};
 for(const id of ['8983','9235']){const meta=JSON.parse(fs.readFileSync(new URL('../fixtures/frame-real/dsf'+id+'.json',import.meta.url))),b=zlib.gunzipSync(fs.readFileSync(new URL('../fixtures/frame-real/dsf'+id+'.f32.gz',import.meta.url)));images[id]={...meta,data:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};}
 return images;
}
