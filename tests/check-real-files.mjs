import {readSource,sourcePath} from './helpers/source.mjs';
/* Optional: node tests/check-real-files.mjs /absolute/input-directory /absolute/output-directory */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import factory from '../node_modules/libraw-wasm/dist/libraw.js';import {harness} from './helpers/app-harness.mjs';
const dir=path.resolve(process.argv[2]||'../../inputs'),out=path.resolve(process.argv[3]||'../../qa');fs.mkdirSync(out,{recursive:true});
const h=harness(),C=h.context.NSColorEngine,mod=await factory({wasmBinary:readSource(new URL('../node_modules/libraw-wasm/dist/libraw.wasm',import.meta.url))}),report=[];
for(const name of fs.readdirSync(dir).filter(x=>/\.(raf|dng)$/i.test(x))){
 const decoder=new mod.LibRaw();try{console.log('Decoding',name);decoder.open(new Uint8Array(readSource(path.join(dir,name))),{outputBps:16,outputColor:1,useCameraWb:true,noAutoBright:true,gamm:[1,1,0,0,0,0],bright:1});const im=decoder.imageData();assert.equal(im.bits,16);assert.equal(im.colors,3);
 const full={width:im.width,height:im.height,data:im.data,channels:3,scale:65535,encoding:'linear'},pre=C.preview(full,640),det=C.detectFrame(pre);
 const cal=C.analyze(pre,det.region),pixels=new Uint8Array(pre.width*pre.height*3),negative=new Uint8Array(pixels.length);
 h.set('sourceInfo',{encoding:'linear',label:name});h.set('state',h.run('({...defaultState(),engine:"beta2",cropConfirmed:true})'));h.set('workingPreview',pre);h.set('working',pre);h.set('src',{width:pre.width,height:pre.height,data:new Uint8ClampedArray(pre.width*pre.height*4)});h.set('previewSrc',h.run('src'));h.set('cropRegion',det.region);h.set('calibration',cal);
 // Native host Float32Array crosses VM correctly; old engine uses the same linear samples as the original RAW path.
 h.run(`base=estimateBase({width:workingPreview.width,height:workingPreview.height,data:Uint8ClampedArray.from(Array.from({length:workingPreview.width*workingPreview.height*4},(_,i)=>i%4===3?255:Math.round(workingPreview.data[Math.floor(i/4)*3+i%4]*255)))});src.data=Uint8ClampedArray.from(Array.from({length:workingPreview.width*workingPreview.height*4},(_,i)=>i%4===3?255:Math.round(workingPreview.data[Math.floor(i/4)*3+i%4]*255)));legacyAnalyze();legacyLevels=levels;`);
 for(let y=0;y<pre.height;y++)for(let x=0;x<pre.width;x++){const p=C.pixel(pre,x,y),i=(y*pre.width+x)*3,q=C.positive(p,cal).map(C.encode);for(let c=0;c<3;c++){pixels[i+c]=Math.round(q[c]*255);negative[i+c]=Math.round(C.encode(p[c])*255);}}
 // App rendering includes manual defaults; core image above is neutral technical output for independent inspection.
 const beta=h.run('state.engine="beta2";convertImage(previewSrc,"positive",state,base)'),legacy=h.run('state.engine="legacy";convertImage(previewSrc,"positive",state,base)');
 function ppm(data,suffix,rgba=false){const body=rgba?Uint8Array.from(Array.from({length:pre.width*pre.height*3},(_,i)=>data[Math.floor(i/3)*4+i%3])):data;fs.writeFileSync(path.join(out,name+suffix+'.ppm'),Buffer.concat([Buffer.from(`P6\n${pre.width} ${pre.height}\n255\n`),Buffer.from(body)]));}
 ppm(pixels,'-technical');ppm(negative,'-negative');ppm(beta.data,'-beta2',true);ppm(legacy.data,'-beta1',true);
 report.push({name,width:im.width,height:im.height,decoded:true,detection:det,base:cal.base.kind,clipped:cal.clipped,density:[cal.lo,cal.hi]});console.log('OK',name,cal.base.kind,det.region);
 }catch(e){report.push({name,error:e.message});console.error('FAIL',name,e.message);}finally{decoder.delete();}
 fs.writeFileSync(path.join(out,'real-file-results.json'),JSON.stringify(report,null,2));
}
