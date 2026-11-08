import assert from 'node:assert/strict';
for(const n of ['core','render','fast','platform'])await import('../src/conversion-v2/'+n+'.js');
const V=NSConversionV2,R=NSV2Render,P=NSV2Platform,F=NSV2Fast,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`),Y=p=>.2126*p[0]+.7152*p[1]+.0722*p[2];
for(const y of [0,.001,.02,.18,.4,.8,1])R.present([y,y,y]).forEach(v=>close(v,y));
let seed=71;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<3000;i++){
 const p=[random(),random(),random()],original=[...p],q=R.present(p);assert.deepEqual(p,original);close(Y(p),Y(q));q.forEach(v=>assert.ok(Number.isFinite(v)&&v>=-1e-12&&v<=1+1e-12));
 const lo=Math.min(...p),hi=Math.max(...p),gain=(Math.max(...q)-Math.min(...q))/(hi-lo);assert.ok(gain>=.82-1e-12&&gain<=1.1+1e-12);
 for(let c=0;c<3;c++)for(let d=0;d<3;d++)assert.equal(Math.sign(q[c]-q[d]),Math.sign(p[c]-p[d]),'dominant color/hue direction changed');
 const alias=Float64Array.from(p);R.present(alias,alias);alias.forEach((v,c)=>close(v,q[c]));
}
const mid=[.32,.22,.14],r=R.present(mid);assert.ok(Math.max(...r)-Math.min(...r)>Math.max(...mid)-Math.min(...mid));
const pale=[.65,.64,.68],h=R.present(pale);assert.ok(Math.max(...h)-Math.min(...h)<Math.max(...pale)-Math.min(...pale));
assert.ok(R.present([.1,.3,.12])[1]>R.present([.1,.3,.12])[0]);assert.ok(R.present([.1,.12,.15])[2]>R.present([.1,.12,.15])[0]);
const im={width:48,height:36,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:Float32Array.from({length:48*36*3},()=>.005+random()*.5)},area={region:{x:0,y:0,w:1,h:1},status:'confirmed'},input={sourceKey:'presentation',capture:{session:'test',recipe:{decoder:'synthetic'}},measurement:{measured:[.8,.45,.2],kind:'manual-region',status:'review'},area},fresh=P.prepare(im,input);
assert.equal(fresh.intent.output,R.presentationRecipe.version);assert.equal(fresh.intent.tone,'luminance-matched-D-1');P.validate(fresh);
const historical=P.prepare(im,{...input,photographic:false});assert.equal(historical.intent.output,R.outputRecipe.version);
assert.deepEqual(fresh.calibration,historical.calibration);assert.deepEqual(fresh.base.rgb,historical.base.rgb);assert.deepEqual(fresh.intent.colorCorrection,historical.intent.colorCorrection);assert.equal(fresh.intent.analysis.exposure.candidateVersion,'scene-distribution-1');
for(const intent of [historical.intent,R.photographic(historical.intent),R.photographic(historical.intent,2)]){
 const previous=V.freeze({...historical,intent,analysisSignature:''}),reopened=P.prepare(im,{...input,previous}),changed=P.prepare(im,{...input,previous,measurement:{...input.measurement,measured:[.81,.45,.2]}});
 assert.equal(reopened.intent.output,R.outputRecipe.version);assert.equal(changed.intent.output,R.outputRecipe.version);assert.equal(changed.intent.tone,intent.tone);assert.deepEqual(changed.calibration,previous.calibration);
 const k=V.compile(previous.source,previous.base,previous.calibration),after=V.compile(reopened.source,reopened.base,reopened.calibration);for(let i=0;i<im.data.length;i+=75)assert.deepEqual(R.view(k.pixel(V.read(im,i)).positive,intent),R.view(after.pixel(V.read(im,i)).positive,reopened.intent));
}
const k=V.compile(fresh.source,fresh.base,fresh.calibration),fast=F.compile(k,fresh.intent),out=new Float64Array(3);
for(let i=0;i<im.data.length;i+=33){const j=V.read(im,i);fast.pixel(...j,out);const ref=R.view(k.pixel(j).positive,fresh.intent);out.forEach((v,c)=>close(v,ref[c]));}
const changed=P.prepare(im,{...input,previous:fresh,measurement:{...input.measurement,measured:[.81,.45,.2]}});assert.equal(changed.intent.output,R.presentationRecipe.version);
assert.throws(()=>P.validate({...fresh,intent:{...fresh.intent,output:'unknown-future-output'}}),/OUTPUT_RECIPE_INVALID/);
console.log('PASS automatic photographic presentation, neutral/luminance/hue/headroom protection, bounded chroma, fast/reference, historical neutral/photo1/photo2 restoration and base-change compatibility');
