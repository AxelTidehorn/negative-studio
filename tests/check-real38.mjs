import {readSource} from './helpers/source.mjs';
/* Optional real-file comparison: node tests/check-real38.mjs INPUT_DIR OUTPUT_DIR */
import fs from 'node:fs';import path from 'node:path';import factory from '../node_modules/libraw-wasm/dist/libraw.js';import {harness} from './helpers/app-harness.mjs';import '../src/color/parameters.js';import '../src/color/render-core.js';
const dir=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);fs.mkdirSync(out,{recursive:true});const h=harness();h.run('scheduleRender=()=>{};render=()=>{};');
const mod=await factory({wasmBinary:readSource(new URL('../node_modules/libraw-wasm/dist/libraw.wasm',import.meta.url))}),results=[];
for(const name of fs.readdirSync(dir).filter(n=>/\.(RAF|dng|tif)$/i.test(n))){
 console.log('Reading',name);let full,decoder;const t=performance.now();
 if(/\.tif$/i.test(name)){const b=readSource(path.join(dir,name));h.set('globalThis.bytes',b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));full=h.run('({...prepareTiff(parseTiff16(bytes)),scale:65535})');}
 else{decoder=new mod.LibRaw();decoder.open(new Uint8Array(readSource(path.join(dir,name))),{outputBps:16,outputColor:1,useCameraWb:true,noAutoBright:true,gamm:[1,1,0,0,0,0],bright:1});const im=decoder.imageData();full={width:im.width,height:im.height,data:im.data,channels:3,scale:65535,encoding:'linear'};}
 const pre=h.context.NSColorEngine.preview(full,500);decoder?.delete();
 // Cache normalized preview for repeatable experiments without decoding again.
 fs.writeFileSync(path.join(out,name+'.f32'),Buffer.from(pre.data.buffer));fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({width:pre.width,height:pre.height}));
 h.set('working',pre);h.set('workingPreview',pre);h.set('sourceInfo',{encoding:'linear',label:name});h.run(`src=new ImageData(working.width,working.height);previewSrc=src;for(let j=0;j<working.data.length;j++)src.data[Math.floor(j/3)*4+j%3]=Math.round(working.data[j]*255);for(let j=3;j<src.data.length;j+=4)src.data[j]=255;cropRegion=CE.detectFrame(workingPreview).region;state={...defaultState(),cropConfirmed:true};`);
 const item={name,dimensions:[full.width,full.height],readSeconds:(performance.now()-t)/1000,roi:h.run('cropRegion'),modes:{}};
 for(const engine of ['reference','legacy','log39']){h.run(`state.engine='${engine}';analyzeLevels();`);const config=JSON.parse(h.run('JSON.stringify(configuration38())'));const start=performance.now(),r=NSPixelKernel.render(pre,config,'positive',500);item.modes[engine]={renderMs:performance.now()-start,base:h.run('calibration.base.kind')};const rgb=Buffer.alloc(r.width*r.height*3);for(let i=0;i<rgb.length;i++)rgb[i]=r.data[Math.floor(i/3)*4+i%3];fs.writeFileSync(path.join(out,name+'-'+engine+'.ppm'),Buffer.concat([Buffer.from(`P6\n${r.width} ${r.height}\n255\n`),rgb]));}
 results.push(item);console.log('OK',name,JSON.stringify(item.modes));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
}
