import {readSource} from './helpers/source.mjs';
import assert from 'node:assert/strict';import factory from '../node_modules/libraw-wasm/dist/libraw.js';
const m=await factory({wasmBinary:readSource(new URL('../node_modules/libraw-wasm/dist/libraw.wasm',import.meta.url))}),r=new m.LibRaw();try{r.open(new Uint8Array(readSource(new URL('./fixtures/synthetic-negative.dng',import.meta.url))),{outputBps:16,outputColor:1,useCameraWb:true,noAutoBright:true,gamm:[1,1,0,0,0,0],bright:1});const im=r.imageData();assert.equal(im.bits,16);assert.equal(im.colors,3);assert.ok(im.width>0&&im.height>0);assert.ok(im.data instanceof Uint16Array);console.log(`PASS DNG fixture: actual LibRaw/WASM decode ${im.width}×${im.height}, 16-bit RGB`);}finally{r.delete();}

// Verify the setting itself, not merely output bit depth.
const fixture=new Uint8Array(readSource(new URL('./fixtures/synthetic-negative.dng',import.meta.url)));
const values=[];for(const bright of [1,.5]){const decoder=new m.LibRaw();try{decoder.open(fixture,{outputBps:16,outputColor:0,useCameraWb:true,noAutoBright:true,gamm:[1,1,0,0,0,0],bright});values.push(Uint16Array.from(decoder.imageData().data));}finally{decoder.delete();}}
assert.equal(values[0][0],3000,'decoded linear sensor value must match known DNG sample');
for(let i=0;i<values[0].length;i+=31)assert.ok(Math.abs(values[1][i]*2-values[0][i])<=2,'RAW brightness must be linear');
console.log('PASS RAW gamma setting takes effect: known sample and half-exposure linearity');

await import('../src/import/raw-input.js');
const outputs=[];for(const mode of ['reference','protected']){const decoder=new m.LibRaw();try{decoder.open(fixture,NSRawInput.options(mode));outputs.push(Uint16Array.from(NSRawInput.convert(decoder.imageData(),mode).data));}finally{decoder.delete();}}
let delta=[];for(let i=0;i<outputs[0].length;i+=17)if(outputs[0][i]>500&&outputs[0][i]<50000)delta.push(Math.abs(outputs[0][i]-outputs[1][i]*2));
delta.sort((a,b)=>a-b);assert.ok(delta[Math.floor(delta.length*.95)]<20,'Rec2020-to-sRGB must reproduce unclipped synthetic RAW within matrix/rounding precision');
console.log('PASS protected RAW actually decodes through Rec2020 and matches unclipped sRGB, p95 difference',delta[Math.floor(delta.length*.95)]);
