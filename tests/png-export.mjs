import assert from 'node:assert/strict';import vm from 'node:vm';import {readSource} from './helpers/source.mjs';import {decodePng} from './helpers/png.mjs';
for(const compressed of [false,true])for(const bits of [8,16]){
 const c={Uint8Array,Uint32Array,DataView,Blob,CompressionStream:compressed?CompressionStream:undefined};vm.createContext(c);vm.runInContext(readSource('png-encoder.js'),c);
 const width=173,height=83,Type=bits===16?Uint16Array:Uint8Array,source=Type.from({length:width*height*3},(_,i)=>bits===16?(16000+(i*7)%27000):(i*13)%256),encoder=c.NSPng.create(width,height,bits);
 for(let y=0;y<height;y+=7){const rows=Math.min(7,height-y);await encoder.write(source.subarray(y*width*3,(y+rows)*width*3),rows);}
 const blob=await encoder.finish(),decoded=decodePng(await blob.arrayBuffer());assert.equal(blob.type,'image/png');assert.equal(decoded.width,width);assert.equal(decoded.height,height);assert.equal(decoded.bits,bits);assert.ok(decoded.srgb);assert.deepEqual(decoded.data,source);
 if(bits===16)assert.ok(decoded.data.some(v=>v%257!==0),'real low channel bits must survive');
 const tagged=c.NSPng.withSrgb(new Uint8Array(await blob.arrayBuffer()));assert.deepEqual(Buffer.from(tagged),Buffer.from(await blob.arrayBuffer()),'do not duplicate an existing profile');
 const incomplete=c.NSPng.create(2,2);await incomplete.write(new Uint16Array(6),1);await assert.rejects(incomplete.finish(),/Ofullständig/);await incomplete.abort();await assert.rejects(incomplete.write(new Uint16Array(6),1),/PNG-rader/);
 const corrupt=Buffer.from(await blob.arrayBuffer());corrupt[48]^=1;assert.throws(()=>decodePng(corrupt));
}
console.log('PASS real RGB8/RGB16 PNG, native and stored-deflate fallback, multiple stripes/blocks, byte-exact channels, low bits, sRGB, CRC and incomplete/aborted streams');
