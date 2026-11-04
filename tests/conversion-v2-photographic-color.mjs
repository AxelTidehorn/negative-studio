import assert from 'node:assert/strict';
for(const n of ['core','render','fast','output','diagnostics','platform'])await import('../src/conversion-v2/'+n+'.js');
const V=NSConversionV2,R=NSV2Render,F=NSV2Fast,O=NSV2Output,P=NSV2Platform;
const close=(a,b)=>assert.ok(Math.abs(a-b)<=1e-12*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const im={width:48,height:36,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(48*36*3)},rgb=[.8,.45,.2];
for(let i=0;i<im.data.length;i++)im.data[i]=rgb[i%3]*10**(-.1-(i%113)/65);
const source=V.source(im,{revision:'photo-color'}),capture=V.capture({session:'test',recipe:{decoder:'synthetic'}}),base=V.assumed(rgb,source,capture),k=V.compile(source,base,V.latestPrior),area={region:{x:0,y:0,w:1,h:1},status:'confirmed'};
const analyzed=R.analyze(im,k,{analysisArea:area,algorithmVersion:3});
const color={version:1,kind:'neutral-anchor-bands',status:'estimated',recipeVersion:'neutral-anchor-bands-2',knots:[.001,.1,1],gains:[[1,1,1],[.97,.99,1.3],[1.06,.98,.96]],terminal:{selected:true}};
const neutral=V.freeze({...analyzed,colorCorrection:color}),old=R.photographic(neutral),next=R.photographic(neutral,2),model=R.prepareBalance(next);
assert.deepEqual(next.colorCorrection,neutral.colorCorrection,'keep the original analysis for neutral/old rendering');
assert.equal(next.exposure,neutral.exposure);assert.deepEqual(next.analysis,neutral.analysis);
assert.equal(next.tone,'luminance-photographic-2');assert.equal(model.application,'global-terminal');assert.equal(model.fallback,null);
assert.deepEqual(model.gains,[color.gains[2],color.gains[2],color.gains[2]]);
assert.deepEqual(R.prepareBalance(old),color,'PR45 retains its original band model');

// Same channel ratios at all intensities: the new adaptation does not remove
// mixed-light differences merely because two surfaces have different luminance.
for(const p of [[.02,.04,.01],[.2,.1,.05],[3,2,1]]){
 const reference=R.balance(p,next);
 for(const scale of [1e-4,.1,1,1000]){
  const input=p.map(v=>v*scale),q=R.balance(input,next);
  close(V.luminance(q),V.luminance(input));
  close(q[0]/q[1],reference[0]/reference[1]);close(q[2]/q[1],reference[2]/reference[1]);
 }
 close(V.luminance(R.render(p,next)),V.luminance(R.render(p,old)));
 assert.deepEqual(R.toneOnly(p,next),R.toneOnly(p,old),'no new tone curve');
}
const fallbackNeutral={...neutral,colorCorrection:{...color,terminal:{selected:false}}},fallback=R.photographic(fallbackNeutral,2);
assert.equal(R.prepareBalance(fallback).fallback,'NO_SUPPORTED_TERMINAL_ANCHOR');
assert.deepEqual(R.prepareBalance(fallback).gains,color.gains);
for(const p of [[.02,.04,.01],[.2,.1,.05],[3,2,1]])assert.deepEqual(R.view(p,fallback),R.view(p,R.photographic(fallbackNeutral)));
const identity={...neutral,colorCorrection:{version:1,kind:'identity'}};
assert.equal(R.prepareBalance(R.photographic(identity,2)),null);
assert.deepEqual(R.view([.2,.1,.05],R.photographic(identity,2)),R.view([.2,.1,.05],R.photographic(identity)));
assert.throws(()=>R.photographic(neutral,99),/PHOTOGRAPHIC_RECIPE_INVALID/);
assert.throws(()=>R.toneOnly([.2,.1,.05],{...next,photographic:R.photographicRecipe}),/PHOTOGRAPHIC_RECIPE_INVALID/);
assert.equal(R.analysisKey(k,{algorithmVersion:3,photographic:true}),R.analysisKey(k,{algorithmVersion:3,photographic:1}));
assert.notEqual(R.analysisKey(k,{algorithmVersion:3,photographic:1}),R.analysisKey(k,{algorithmVersion:3,photographic:2}));

const scratch=new Float64Array(3);
for(const mode of ['auto','technical','fixed']){
 const fast=F.compile(k,next,{viewMode:mode});
 for(let i=0;i<im.data.length;i+=33){const j=V.read(im,i),technical=k.pixel(j).positive,expected=R.view(technical,next,mode);fast.pixel(...j,scratch);scratch.forEach((v,c)=>close(v,expected[c]));if(mode!=='auto')assert.deepEqual(expected,R.view(technical,old,mode));}
 for(const rotation of [0,90,180,270]){
  const g=O.geometry(im,{x:.1,y:.2,w:.7,h:.6},rotation,17),expected=O.rows(im,g,0,g.height,(x,y)=>O.pixel(im,k,next,x,y,mode),16),actual=await O.area(im,g,fast.pixel,16);
  actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<=1));
 }
}
const report=NSV2Diagnostics.diagnostic(im,k,next);
assert.deepEqual(report.colorBalance.value.gains,model.gains);assert.equal(report.colorBalance.value.application,'global-terminal');
assert.equal(report.colorBalance.methodVersion,R.photographicColorRecipe.version);
for(const intent of [neutral,old,next]){
 const d=NSV2Diagnostics.diagnostic(im,k,intent).darkness.value,y=d.technicalMedianY,expected=R.toneOnly([y,y,y],intent)[0];
 close(d.medianAfterTone,expected);
 close(d.toneChangeEV,Math.log2(expected/d.medianAfterExposure));
}

const input={sourceKey:'photo-color',capture,measurement:{measured:rgb,kind:'manual-region',status:'review'},area,photographic:2},recipe=P.prepare(im,input);
P.validate(recipe);assert.equal(P.prepare(im,{...input,previous:recipe}).intent.id,recipe.intent.id);
const changed=P.prepare(im,{...input,photographic:undefined,previous:recipe,measurement:{...input.measurement,measured:[.81,.45,.2]}});
assert.equal(changed.intent.tone,'luminance-photographic-2');assert.deepEqual(changed.calibration,recipe.calibration);
assert.equal(P.prepare(im,{...input,photographic:false,previous:recipe}).intent.tone,'luminance-reinhard-1');
assert.equal(P.prepare(im,{...input,photographic:true,previous:recipe}).intent.tone,'luminance-photographic-1');
assert.equal(P.prepare(im,{...input,photographic:undefined}).intent.tone,'luminance-reinhard-1','new candidate never becomes default');
console.log('PASS opt-in photographic color: qualified global anchor, intensity-invariant chromatic ratios, unchanged luminance/tone/technical response, explicit fallback, historical PR45/neutral, versioned persistence, all view modes/rotations/RGB16 and applied-model diagnostics');
