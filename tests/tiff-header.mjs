import assert from 'node:assert/strict';
import '../src/import/srgb-profile.js';
import '../src/export/tiff-header.js';
import '../src/import/tiff-codec.js';

// Read the IFD independently of FILMLABB's permissive TIFF importer. TIFF 6.0
// section 19 requires one SHORT SampleFormat value per sample (RGB: three).
const head=tiffHeader(2,1),v=new DataView(head),ifd=v.getUint32(4,true),tags=new Map();
for(let i=0;i<v.getUint16(ifd,true);i++){
 const p=ifd+2+i*12;
 tags.set(v.getUint16(p,true),{type:v.getUint16(p+2,true),count:v.getUint32(p+4,true),value:v.getUint32(p+8,true)});
}
const shorts=tag=>Array.from({length:tag.count},(_,i)=>v.getUint16(tag.value+i*2,true));
assert.equal(tags.get(339).type,3);
assert.equal(tags.get(339).count,tags.get(277).value);
assert.deepEqual(shorts(tags.get(339)),[1,1,1]);
assert.deepEqual(shorts(tags.get(258)),[16,16,16]);
assert.deepEqual(new Uint8Array(head,tags.get(34675).value,tags.get(34675).count),NSSRGBProfile);
assert.equal(tags.get(273).value,head.byteLength);
assert.equal(tags.get(279).value,12);
assert.equal(head.byteLength%2,0);
const samples=[0,1,255,256,32768,65535],file=new Uint8Array(head.byteLength+12);
file.set(new Uint8Array(head));samples.forEach((value,i)=>new DataView(file.buffer).setUint16(head.byteLength+i*2,value,true));
for(const decoded of [NSTiff.decodeSync(file.buffer),await NSTiff.decode(file.buffer)]){
 assert.equal(decoded.width,2);assert.equal(decoded.height,1);assert.equal(decoded.bits,16);
 assert.deepEqual(Array.from(decoded.data),samples);assert.deepEqual(decoded.icc,NSSRGBProfile);
}
console.log('PASS RGB16 TIFF SampleFormat cardinality/type, unsigned values, ICC bytes, aligned strip offset and exact 16-bit boundary sample round trip');
