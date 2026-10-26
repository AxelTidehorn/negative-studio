import {readSource} from './helpers/source.mjs';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness();h.run(`scheduleRender=()=>{};render=()=>{};sourceInfo={encoding:'srgb'};working={width:65,height:47,channels:3,scale:65535,encoding:'srgb',data:Uint16Array.from({length:65*47*3},(_,i)=>(i*173+2143)%65536)};workingPreview=CE.preview(working);src=new ImageData(65,47);previewSrc=src;state={...defaultState(),cropConfirmed:true};cropRegion={x:.1,y:.1,w:.8,h:.8};analyzeLevels();downloadBlob=b=>globalThis.savedBlob=b;`);
const K=h.context.NSPixelKernel;
// Compare every pixel of prepared output with exact direct evaluation, for
// linear/sRGB, RGB/BW profiles, neutral/creative tones and old/new engines.
let combinations=0;
for(const engine of ['calibrated4','log39','reference','beta2'])for(const encoding of ['srgb','linear'])for(const scale of [255,65535])for(const profile of ['generic','gold','bw']){
 h.run(`state.engine='${engine}';working.encoding='${encoding}';sourceInfo.encoding='${encoding}';working.scale=${scale};working.data=${scale===255?'Uint8Array':'Uint16Array'}.from({length:65*47*3},(_,i)=>(i*173+2143)%${scale+1});workingPreview=CE.preview(working);rollShared.profile='${profile}';state.saturation=1.15;state.shadows=18;state.highlights=-22;analyzeLevels();`);
 const c=h.run('configuration38()'),im=h.run('working'),kernel=K.compile(c),prepared=K.prepare(im,c);
 for(let i=0;i<im.data.length;i+=87){const a=kernel.pixel(h.run(`sourcePixel(working,${i/3%65},${Math.floor(i/3/65)})`)),b=prepared.pixel(i);for(let k=0;k<3;k++)assert.ok(Math.abs(a[k]-b[k])<1e-12,`${engine}/${encoding}/${scale}/${profile}`);}
 combinations++;
}
console.log('PASS',combinations,'prepared export combinations match direct pixels');
// All new independently produced TIFF fixtures go through actual import and
// both export handlers. Capture their blobs without relying on a fake JPEG encoder.
for(const name of ['rgb16-tile1-planar2-c5.tif','rgb16-tile0-planar1-c8.tif','gray16-big-packbits.tif']){
 const b=readSource('tests/fixtures/tiff/'+name);h.context.inputFile={name,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.length)};
 await h.run('readFile(inputFile)');h.run('state.cropConfirmed=true;state.rotation=90;state.cropExport=true;');
 const expected=h.run(`(()=>{const g=CE.exportGeometry(working,cropRegion,true,90),k=NSPixelKernel.compile(configuration38());return {width:g.width,height:g.height,pixels:Array.from({length:g.width*g.height},(_,i)=>{const [x,y]=g.at(i%g.width,Math.floor(i/g.width));return k.pixel(sourcePixel(working,x,y)).map(v=>Math.round(v*65535));}).flat()};})()`);
 await h.run('exportTiff()');fs.writeFileSync('../qa-export.tif',new Uint8Array(await h.context.savedBlob.arrayBuffer()));const raw=await NSTiffFromBlob(h.context.savedBlob);assert.equal(raw.width,expected.width);assert.equal(raw.height,expected.height);assert.deepEqual(Array.from(raw.data),Array.from(expected.pixels));
 h.run('globalThis.configurationCalls=0;globalThis.origConfiguration=configuration38;configuration38=(...args)=>{configurationCalls++;return origConfiguration(...args)};');
 await h.run("$('export').onclick()");assert.ok(h.run('configurationCalls')<=2,'configuration must not be built per pixel');assert.equal(h.context.savedBlob.type,'image/jpeg');h.run('configuration38=origConfiguration;');
 console.log('PASS actual TIFF import → rotated/cropped 16-bit TIFF and JPEG export',name);
}
async function NSTiffFromBlob(blob){h.context.exportBuffer=await blob.arrayBuffer();return h.run('NSTiff.decode(exportBuffer)');}
// Real controller retries null/throwing canvas encoders and releases every canvas.
const create=h.context.document.createElement,canvases=[];let attempts=0;
h.context.document.createElement=tag=>{const el=create(tag);if(tag==='canvas'){canvases.push(el);el.toBlob=(resolve,type)=>{attempts++;if(attempts===1)resolve(null);else if(attempts===2)throw Error('simulated encoder allocation failure');else resolve(new Blob([new Uint8Array([255,216,255,217])],{type}));};}return el;};
const jpeg=await h.run('jpegBytes()');assert.equal(attempts,3);assert.equal(jpeg.length,4);assert.ok(canvases.every(c=>c.width===0&&c.height===0));
console.log('PASS JPEG encoder null/throw fallback releases all canvas buffers');
