import assert from 'node:assert/strict';
for(const n of ['core','render','fast'])await import('../src/conversion-v2/'+n+'.js');
await import('./helpers/v2-output-oracle.js');
const V=NSConversionV2,R=NSV2Render,F=NSV2Fast,O=NSV2OutputOracle,area={region:{x:0,y:0,w:1,h:1},status:'confirmed'};
const close=(a,b)=>assert.ok(Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(b)),`${a} != ${b}`),ys=p=>.2126*p[0]+.7152*p[1]+.0722*p[2];
const rgb=[.82,.43,.21],im={width:48,height:36,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(48*36*3)};
let seed=71;for(let i=0;i<im.data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;im.data[i]=rgb[i%3]*10**(-.08-1.5*seed/2**32);}
const source=V.source(im,{revision:'render3-test'}),base=V.assumed(rgb,source,V.capture({session:'test',recipe:{decoder:'synthetic'}})),k=V.compile(source,base,V.latestPrior),options={analysisArea:area};
const old=R.analyze(im,k,options),next=R.analyze(im,k,{...options,algorithmVersion:3});
assert.equal(old.algorithmVersion,undefined);assert.equal(old.output,undefined);assert.equal(next.algorithmVersion,3);assert.equal(next.output,'luminance-gamut-2');
assert.equal(next.exposure,old.exposure,'rendering does not change exposure analysis');assert.deepEqual(next.analysis.exposure,old.analysis.exposure);
assert.equal(R.analysisKey(k,options),R.analysisKey(k,{...options,algorithmVersion:2}));assert.notEqual(R.analysisKey(k,options),R.analysisKey(k,{...options,algorithmVersion:3}));
assert.equal(R.analysisKey(k,{...options,algorithmVersion:3}),R.analysisKey(k,{...options,algorithmVersion:3,crop:{x:.2,y:.1,w:.5,h:.7},rotation:90}));
assert.throws(()=>R.outputVersion({...next,output:'unknown'}),/OUTPUT_RECIPE_INVALID/);
const scratch=new Float64Array(3),inputs=[[0,0,0],[.8,.8,.8],[1e20,1e20,1e20],[.02,.08,.8],[.1,.8,.15],[2,.2,.5],[.3,.7,1.1]];
for(const p of inputs){
 const out=R.displayNeutral(p);assert.ok(out.every(v=>Number.isFinite(v)&&v>=0&&v<=1));F.displayNeutral(...p,scratch);scratch.forEach((v,c)=>close(v,out[c]));
 const raw=R.matrix.map(row=>row.reduce((sum,v,c)=>sum+v*p[c],0)),y=Math.max(0,ys(raw));if(y<=1)close(ys(out),y);else assert.deepEqual(out,[1,1,1]);
 // The mapping scales chroma by one common factor, preserving its direction.
 if(y>0&&y<1&&Math.min(...raw)>=0){const a=raw.map(v=>v-y),b=out.map(v=>v-y);close(a[0]*b[1],a[1]*b[0]);close(a[1]*b[2],a[2]*b[1]);}
 assert.deepEqual(R.view(p,old),R.display(R.render(p,old)),'old output formula remains unchanged');
 for(const mode of ['technical','fixed'])assert.deepEqual(R.view(p,next,mode),R.view(p,old,mode));
}
for(const x of [0,.01,.2,.79,.8,.9,.999])R.displayNeutral([x,x,x]).forEach(v=>close(v,x));
const cols=80,rows=80,n=cols*rows;
function pool(kind){const positive=new Float64Array(n*3),luma=new Float64Array(n),mask=new Uint8Array(n).fill(1);for(let i=0;i<n;i++){
 const y=.01+((i*37)%n)/n*.9,p=kind==='near'?[2**-.15,1,2**.1]:kind==='blue'?[.35,.65,1.2]:i%5<3?[2**-.2,1,2**.5]:i%2?[1.8,.6,.25]:[.25,1.2,.4],s=y/V.luminance(p);positive.set(p.map(v=>v*s),i*3);luma[i]=y;
 }return {positive,luma,mask};}
const estimate=(p,recipe)=>R.estimateBalance(p.positive,p.luma,p.mask,cols,rows,area,true,recipe),near=pool('near'),colored=pool('blue'),fallback=pool('fallback');
assert.equal(estimate(near,R.balanceRecipe).kind,'identity');const balanced=estimate(near,R.balanceRecipe2);assert.equal(balanced.kind,'neutral-anchor-bands');assert.ok(balanced.evidence.some(e=>e.dominantNeutral));
assert.equal(estimate(colored,R.balanceRecipe2).kind,'identity','saturated dominant blue is not a neutral reference');
const a=estimate(fallback,R.balanceRecipe),b=estimate(fallback,R.balanceRecipe2);assert.equal(b.terminal.selected,false);assert.deepEqual(b.gains,a.gains,'unsupported terminal pool keeps original high anchor');
for(let i=0;i<n;i+=37){const p=Array.from(near.positive.subarray(i*3,i*3+3));close(V.luminance(R.balance(p,{...next,colorCorrection:balanced})),V.luminance(p));}
for(const mode of ['auto','technical','fixed']){
 const fast=F.compile(k,next,{viewMode:mode});for(let i=0;i<im.data.length;i+=39){const p=V.read(im,i),expected=R.view(k.pixel(p).positive,next,mode);fast.pixel(...p,scratch);scratch.forEach((v,c)=>close(v,expected[c]));}
 for(const rotation of [0,90,180,270]){const g=O.geometry(im,{x:.1,y:.2,w:.7,h:.6},rotation,17),ref=O.rows(im,g,0,g.height,(x,y)=>O.pixel(im,k,next,x,y,mode),16),actual=await O.area(im,g,fast.pixel,16);actual.forEach((v,i)=>assert.ok(Math.abs(v-ref[i])<=1));}
}
console.log('PASS render3: old output/analysis unchanged, luminance and hue direction, bounded highlights, near-neutral evidence and terminal fallback, frozen keys, fixed/technical identity, fast/reference/area RGB16 parity');
