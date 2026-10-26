import {readSource,sourcePath} from './helpers/source.mjs';
/* Run explicitly with matching camera RAF and developed DNG. No originals are bundled. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import factory from '../node_modules/libraw-wasm/dist/libraw.js';
const [raf,dng]=process.argv.slice(2);
if(!raf||!dng)throw Error('Usage: node tests/raf-dng-pair.mjs image.RAF image.dng');
const mod=await factory({wasmBinary:readSource(new URL('../node_modules/libraw-wasm/dist/libraw.wasm',import.meta.url))});
const options={outputBps:16,outputColor:1,useCameraWb:true,noAutoBright:true,gamm:[1,1,0,0,0,0],bright:1};
function stats(file){const decoder=new mod.LibRaw();try{
 decoder.open(new Uint8Array(readSource(file)),options);
 const image=decoder.imageData();assert.equal(image.bits,16);assert.equal(image.colors,3);
 const values=[[],[],[]],stride=Math.max(1,Math.floor(image.width*image.height/20000));
 for(let i=0;i<image.width*image.height;i+=stride)for(let c=0;c<3;c++)values[c].push(image.data[i*3+c]/65535);
 for(const channel of values)channel.sort((a,b)=>a-b);
 const quantiles=[.02,.25,.5,.75,.98].map(q=>values.map(a=>a[Math.floor(q*(a.length-1))]));
 return {dimensions:[image.width,image.height],mean:values.map(a=>a.reduce((s,v)=>s+v,0)/a.length),quantiles};
}finally{decoder.delete();}}
const a=stats(raf),b=stats(dng);
const differences=a.mean.map((v,c)=>Math.abs(v-b.mean[c]));
const quantileDifferences=a.quantiles.flatMap((row,i)=>row.map((v,c)=>Math.abs(v-b.quantiles[i][c])));
console.log(JSON.stringify({raf:a,dng:b,meanDifferences:differences,maxQuantileDifference:Math.max(...quantileDifferences)},null,2));
assert.ok(Math.max(...differences)<.02,'RAF/DNG decoded channel means disagree');
assert.ok(Math.max(...quantileDifferences)<.04,'RAF/DNG decoded tonal statistics disagree');
console.log('RAF/DNG paired decoding agrees. Orientation and crop are evaluated separately.');
