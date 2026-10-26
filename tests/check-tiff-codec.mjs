import {readSource,sourcePath} from './helpers/source.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';import '../src/import/tiff-codec.js';
for(const f of JSON.parse(readSource('tests/fixtures/tiff/expected.json'))){
 const b=readSource('tests/fixtures/tiff/'+f.name),ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),im=await NSTiff.decode(ab);
 assert.equal(im.width,f.width,f.name+' width');assert.equal(im.height,f.height,f.name+' height');assert.deepEqual(Array.from(im.data),f.pixels,f.name+' samples');
 if(!/deflate|-c8\./.test(f.name))assert.deepEqual(NSTiff.decodeSync(ab).data,im.data);
 console.log('PASS',f.name);
}
for(const b of [new ArrayBuffer(0),new Uint8Array([73,73,42,0,255,255,255,255]).buffer])await assert.rejects(()=>NSTiff.decode(b));
console.log('PASS malformed TIFF rejected');
