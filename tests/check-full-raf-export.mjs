import {readSource} from './helpers/source.mjs';
/* Optional slow end-to-end export check with a real camera RAF. */
import assert from 'node:assert/strict';
import factory from '../node_modules/libraw-wasm/dist/libraw.js';import {harness} from './helpers/app-harness.mjs';
const filename=process.argv[2];if(!filename)throw Error('Usage: node tests/check-full-raf-export.mjs image.RAF');
const L=await factory({wasmBinary:readSource(new URL('../node_modules/libraw-wasm/dist/libraw.wasm',import.meta.url))}),decoder=new L.LibRaw();
try{
 console.log('Decoding RAW…');decoder.open(new Uint8Array(readSource(filename)),{outputBps:16,outputColor:1,useCameraWb:true,noAutoBright:true,gamm:[1,1,0,0,0,0],bright:1});
 const raw=decoder.imageData(),h=harness();assert.equal(raw.bits,16);assert.equal(raw.colors,3);
 h.set('hires',{width:raw.width,height:raw.height,data:raw.data,channels:3,encoding:'linear'});h.set('sourceInfo',{encoding:'linear',label:'RAW'});
 h.run(`working=workingSource();workingPreview=CE.preview(working,500);previewSrc=new ImageData(workingPreview.width,workingPreview.height);for(let i=0;i<workingPreview.data.length;i++)previewSrc.data[Math.floor(i/3)*4+i%3]=Math.round(255*CE.clamp(workingPreview.data[i]));for(let i=3;i<previewSrc.data.length;i+=4)previewSrc.data[i]=255;src=previewSrc;cropRegion=CE.detectFrame(workingPreview).region;state={...defaultState(),engine:'log39',cropConfirmed:true,cropExport:false};updateBase();analyzeLevels();downloadBlob=blob=>{globalThis.outputBlob=blob;};`);
 if(process.argv[3]==='--crop-benchmark')h.run(`cropRegion={x:.4,y:.4,w:.2,h:.2};state.cropExport=true;`);
 const geometry=h.run('CE.exportGeometry(working,cropRegion,state.cropExport,state.rotation)');
 console.log('Rendering full-resolution TIFF…');const start=performance.now();await h.run('exportTiff()');const blob=h.context.outputBlob;assert.ok(blob,'No TIFF output');
 const head=new DataView(await blob.slice(0,64).arrayBuffer());assert.equal(head.getUint32(10+0*12+8,true),geometry.width);assert.equal(head.getUint32(10+1*12+8,true),geometry.height);
 const bitsOffset=8+2+12*12+4,iccOffset=bitsOffset+6,pixelOffset=iccOffset+h.context.NSSRGBProfile.length+(h.context.NSSRGBProfile.length%2);
 assert.equal(blob.size,geometry.width*geometry.height*6+pixelOffset);
 const centerX=Math.floor(geometry.width/2),centerY=Math.floor(geometry.height/2),centerOffset=pixelOffset+(centerY*geometry.width+centerX)*6;
 const actual=new DataView(await blob.slice(centerOffset,centerOffset+6).arrayBuffer());
 h.set('globalThis.__sampleXY',[centerX,centerY]);
 const expected=h.run(`(()=>{const [x,y]=CE.exportGeometry(working,cropRegion,state.cropExport,state.rotation).at(__sampleXY[0],__sampleXY[1]);return technicalPositive(sourcePixel(working,x,y),state).map(v=>Math.round(v*65535));})()`);
 for(let c=0;c<3;c++)assert.ok(Math.abs(actual.getUint16(c*2,true)-expected[c])<=1,'Exported pixel differs from preview color calculation');
 console.log(JSON.stringify({width:geometry.width,height:geometry.height,bytes:blob.size,seconds:Math.round((performance.now()-start)/1000),status:h.elements.get('status').textContent}));
}finally{decoder.delete();}
