import assert from 'node:assert/strict';
for(const n of ['import/raw-input','image/image-model','conversion-v2/core','conversion-v2/render','conversion-v2/fast'])await import('../src/'+n+'.js');
const V=NSConversionV2,R=NSV2Render,im={width:60,height:40,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(7200)};let seed=37;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};for(let i=0;i<im.data.length;i++)im.data[i]=10**(-random()*7);
const s=V.source(im,{revision:'fast-test'}),ctx=V.capture({session:'fast',recipe:{decoder:'fixture'}}),out=new Float64Array(3);let maxError=0;
const relative=(a,b,t=1e-12)=>{const e=Math.abs(a-b)/Math.max(1,Math.abs(b));maxError=Math.max(maxError,e);assert.ok(e<t,`${a} != ${b}, error ${e}`);};
for(const rgb of [[.8,.45,.2],[1,1,1],[.02,.6,.003]])for(const exposure of [-1,0,1]){
 const base=V.assumed(rgb,s,ctx),k=V.compile(s,base),intent={...R.analyze(im,k),exposure},fast=NSV2Fast.compile(k,intent);
 const inputs=[[0,-1,NaN],[Infinity,1e-38,1],[1.2,2,1.1]];for(let i=0;i<3000;i+=3)inputs.push([im.data[i],im.data[i+1],im.data[i+2]]);
 for(const p of inputs){const ref=k.pixel(p);fast.technical(...p,out);out.forEach((v,c)=>relative(v,ref.positive[c]));const expected=R.display(R.render(ref.positive,intent));fast.pixel(...p,out);out.forEach((v,c)=>relative(v,expected[c]));}
 for(const viewMode of ['auto','fixed','technical']){const viewFast=NSV2Fast.compile(k,intent,{viewMode});for(const p of inputs){const expected=R.view(k.pixel(p).positive,intent,viewMode);viewFast.pixel(...p,out);out.forEach((v,c)=>relative(v,expected[c]));}}

}
console.log('PASS scalar V2 oracle, invalid signals, 9 recipes, all view modes; max relative error',maxError);
