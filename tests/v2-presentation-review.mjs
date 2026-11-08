import assert from 'node:assert/strict';import fs from 'node:fs';
import '../src/conversion-v2/core.js';import '../src/conversion-v2/render.js';import '../src/conversion-v2/fast.js';
import {parameters,tone,factor,install,gpuGLSL} from '../tools/v2-presentation-model.mjs';
const R=NSV2Render,V=NSConversionV2,original=R.photographicScale;
for(const amount of [.5,0]){
 let previous=-1;for(let i=0;i<=20000;i++){const y=2**(-30+i*60/20000),t=tone(y,amount);assert.ok(Number.isFinite(t)&&t>=previous&&t>=0&&t<=1);previous=t;const f=factor(y,amount),via=y*f/(1+y*f);assert.ok(Math.abs(t-via)<5e-15);}
 for(const y of [0,1e-300,1e-100,1e20,1e100,1e300])assert.ok(Number.isFinite(tone(y,amount)));
 for(const x of [1,2]){let lo=0,hi=4;for(let i=0;i<60;i++){const m=(lo+hi)/2;const pre=m*2**(amount*Math.tanh(Math.log2(m/.8)));if(pre<x)lo=m;else hi=m;}const y=(lo+hi)/2,h=1e-5,ls=(tone(y,amount)-tone(y-h,amount))/h,rs=(tone(y+h,amount)-tone(y,amount))/h;assert.ok(Math.abs(ls-rs)<3e-5);}
}
for(const y of [1e-9,.001,.1,.3,.5,.7,.8]){const x=y*original(y);if(x<=1)assert.equal(factor(y,.5),original(y));}
const s=V.source({width:10,height:10,data:new Float32Array(300),channels:3,encoding:'linear',colorSpace:'rec2020'},{revision:'presentation-test'}),base=V.assumed([.8,.45,.2],s,V.capture({session:'test',recipe:{decoder:'synthetic'}})),k=V.compile(s,base,V.latestPrior),intent=R.photographic(R.analyze({width:10,height:10,data:new Float32Array(300).fill(.01),channels:3},k,{algorithmVersion:3,output:R.presentationRecipe.version,analysisArea:{region:{x:0,y:0,w:1,h:1},status:'confirmed'}}),2),saved=JSON.stringify(intent);
for(const target of ['C','D']){const restore=install(R,target);assert.notEqual(R.photographicScale,original);const f=NSV2Fast.compile(k,intent),q=[0,0,0];for(let n=0;n<100;n++){
 const j=[.8,.45,.2].map((v,c)=>v*10**(-(.05+(n*(137+c*13)%997)/400))),p=R.balance(k.pixel(j).positive,intent),y=V.luminance(p)*2**intent.exposure,scale=y>0?tone(y,target==='C'?.5:0)/(y/2**intent.exposure):1,out=R.output(p.map(v=>v*scale),intent);
 f.pixel(...j,q);assert.ok(q.every((v,c)=>Number.isFinite(v)&&Math.abs(v-out[c])<1e-13));
 }restore();assert.equal(R.photographicScale,original);}
assert.equal(JSON.stringify(intent),saved);assert.throws(()=>install(R,'bad'));assert.throws(()=>gpuGLSL('different shader','C'));
for(const path of ['index.html','app-manifest.mjs','src/conversion-v2/render.js'])assert.ok(!fs.readFileSync(path,'utf8').includes('v2-presentation-model'));
assert.equal(parameters.version,'matched-shoulder-1');console.log('PASS monotone common shoulder, continuous knee/blend slopes, finite extremes, exact lower-tone C bypass, scalar chromaticity preservation/oracle, immutable recipe and isolated hooks');
