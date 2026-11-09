/* Node normalization microbenchmark, not end-to-end TIFF import timing. */
import os from 'node:os';import {performance} from 'node:perf_hooks';import assert from 'node:assert/strict';import '../src/image/image-model.js';
const samples=Number(process.argv[2]||18000000),repeats=Number(process.argv[3]||3),input=Uint16Array.from({length:samples},(_,i)=>i%65536),rows=[];
for(const [name,convert]of [['before',a=>Float32Array.from(a,v=>v/65535)],['after',NSColorEngine.unitFloat32]]){const ms=[];let output;for(let i=0;i<repeats;i++){const start=performance.now();output=convert(input);ms.push(performance.now()-start);}for(let i=0;i<samples;i++)assert.equal(output[i],Math.fround(input[i]/65535));rows.push({name,ms});}
console.log(JSON.stringify({kind:'Node U16 normalization only',node:process.version,cpu:os.cpus()[0].model,samples,equivalentRGBPixels:samples/3,repeats,inputBytes:input.byteLength,outputBytes:samples*4,rows},null,2));
