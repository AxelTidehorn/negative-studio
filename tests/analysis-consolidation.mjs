/* Fresh active-engine analysis compared with configs captured from main #97.
   The separate 2,241-case oracle freezes the rendering/export contract. */
import assert from 'node:assert/strict';import fs from 'node:fs';import zlib from 'node:zlib';import {harness} from './helpers/app-harness.mjs';
const setups=JSON.parse(fs.readFileSync('tests/fixtures/consolidation/oracle.json')).setups,h=harness();h.context.crypto=globalThis.crypto;
const images={};
for(const id of ['8983','9235']){const meta=JSON.parse(fs.readFileSync(`tests/fixtures/frame-real/dsf${id}.json`)),b=zlib.gunzipSync(fs.readFileSync(`tests/fixtures/frame-real/dsf${id}.f32.gz`));images[id]={...meta,data:new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};}
for(const space of ['srgb','rec2020'])images[space]={width:67,height:45,data:Float32Array.from({length:67*45*3},(_,i)=>i<36?[0,1/65535,.0001,.001,.01,.18,.5,1,.9999,1e-8,.7,.07][i%12]:.005+((i*673+71)%65536)/65535*.89),channels:3,encoding:'linear',scale:1,colorSpace:space};
for(const s of setups){const im=images[s.name];h.set('im',im);h.set('frozen',s.config);h.run(`render=()=>{};scheduleRender=()=>{};working=im;workingPreview=im;src=null;sourceInfo={encoding:'linear',colorSpace:im.colorSpace,label:'oracle',domain:'oracle'};state={...defaultState(),engine:frozen.kind,colorMode4:frozen.opts.colorMode4,toneMode4:frozen.opts.toneMode4,frame:NSFrameSelection.rectangular({x:.1,y:.1,w:.8,h:.8},{status:'confirmed'})};roll=[{file:{name:'oracle.dng'},settings:{...state},geometry:NSGeometry.create()}];activeFrame=0;analyzeLevels();`);
 const current=h.run('configuration38()');if(s.config.kind==='calibrated4')assert.deepEqual(JSON.parse(JSON.stringify(current.cal.beta4)),s.config.cal.beta4);
 const a=h.context.NSPixelKernel.compile(current),b=h.context.NSPixelKernel.compile(s.config);
 for(let i=0;i<39;i++){const n=Math.floor(i*(im.width*im.height-1)/38)*3,p=Array.from(im.data.subarray(n,n+3));assert.deepEqual(Array.from(a.pixel(p)),Array.from(b.pixel(p)),JSON.stringify([s.name,s.config.kind,i]));}
 const count=h.run('v2AnalysisCount');h.run('analyzeLevels();');if(s.config.kind==='v2')assert.equal(h.run('v2AnalysisCount'),count);
}
console.log('PASS 27 fresh Standard/V2 analyses and 1,053 exact float samples vs main; repeated V2 recipe reused');
