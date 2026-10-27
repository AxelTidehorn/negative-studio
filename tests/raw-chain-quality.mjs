import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness(),C=h.context.NSColorEngine,CC=h.context.NSColorCalibration,R=h.context.NSRawInput;
const base=[.7,.4,.2],pixel=[.15,.08,.025],wb=[1.1,.8,1.3],density=(p,b)=>p.map((v,k)=>-Math.log10(v/b[k]));
const d1=density(pixel,base),d2=density(pixel.map((v,k)=>v*wb[k]),base.map((v,k)=>v*wb[k]));assert.ok(d1.every((v,k)=>Math.abs(v-d2[k])<1e-12));
const clippedBase=[1,.4,.2],clippedPixel=[1,.08,.025];assert.notEqual(density(clippedPixel,clippedBase)[0],d1[0]);
for(const mode of ['protected','reference','wide']){const options=R.options(mode);assert.equal(options.useCameraWb,true);assert.equal(options.noAutoBright,true);assert.deepEqual(Array.from(options.gamm),[1,1,0,0,0,0]);}
const decoded={width:64,height:48,channels:3,colors:3,bits:16,data:Uint16Array.from({length:64*48*3},(_,i)=>500+(i*53)%21000)},raw=R.convert({...decoded,data:decoded.data.slice()},'protected');
const source={...raw,encoding:'linear',scale:65535,channels:3},controlledTiff={...source,data:source.data.slice()};
for(const r of [{x:0,y:0,w:1,h:1},{x:.2,y:.1,w:.7,h:.6}]){const a=CC.estimate(source,r),b=CC.estimate(controlledTiff,r);assert.deepEqual(a,b);assert.deepEqual(C.preview(source,20,'area-v1'),C.preview(controlledTiff,20,'area-v1'));}
const low={width:16,height:16,channels:3,data:new Uint16Array(16*16*3).fill(2),scale:65535,encoding:'linear'},stats=h.context.NSColorAnalysis.analyze(low,{x:0,y:0,w:1,h:1});assert.ok(stats.dark.every(v=>v===1));assert.ok(CC.coordinate([0,2/65535,1],CC.estimate(low,{x:0,y:0,w:1,h:1})).every(Number.isFinite));
console.log('PASS unclipped diagonal WB/base invariance, clipping exception, explicit linear RAW options, controlled post-decode TIFF equivalence, low-signal finite response');
