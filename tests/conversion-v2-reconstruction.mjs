import assert from 'node:assert/strict';
for(const n of ['core','render','fast','output','diagnostics'])await import('../src/conversion-v2/'+n+'.js');
const V=NSConversionV2,R=NSV2Render,F=NSV2Fast,O=NSV2Output;
const im={width:48,height:36,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(48*36*3)},rgb=[.82,.43,.21];
let seed=71;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<im.data.length;i++)im.data[i]=rgb[i%3]*10**(-.08-1.5*random());
const source=V.source(im,{revision:'reconstruction-test'}),ctx=V.capture({session:'reconstruction',recipe:{decoder:'synthetic'}}),base=V.assumed(rgb,source,ctx),k=V.compile(source,base,V.latestPrior),old=V.compile(source,base),area={region:{x:0,y:0,w:1,h:1},status:'confirmed'};
let maxError=0;
const close=(a,b,t=1e-12)=>{const e=Math.abs(a-b)/Math.max(1,Math.abs(b));maxError=Math.max(maxError,e);assert.ok(e<t,`${a} != ${b}; relative/absolute error ${e}`);};
assert.equal(V.prior.version,2);assert.equal(old.calibration.id,V.prior.id);assert.equal(V.latestPrior.version,3);
assert.ok(Object.isFrozen(V.latestPrior)&&Object.isFrozen(V.latestPrior.densityMatrix[0]));
// Historical affine inversion remains the original formula, independently of
// the new profile selected by a fresh application recipe.
for(const d of [.01,.2,1,3,5]){const j=rgb.map(v=>v*10**(-d)),p=old.pixel(j);p.positive.forEach(v=>close(v,.18*10**((d-1)/.65)));assert.deepEqual(k.pixel(j).density,p.density);}
// Density physics remains independent of reconstruction and creative geometry.
const j=rgb.map((v,c)=>v*10**(-[.12,.35,.8][c])),first=k.pixel(j),step=1e-5,changed=V.compile(source,{...base,rgb:rgb.map(v=>v*10**step)},V.latestPrior).pixel(j);
changed.density.forEach((v,c)=>close((v-first.density[c])/step,1,1e-9));
for(const scale of [.01,.25,1,4]){const scaled=V.compile(source,{...base,rgb:rgb.map(v=>v*scale)},V.latestPrior).pixel(j.map(v=>v*scale));scaled.density.forEach((v,c)=>close(v,first.density[c]));scaled.positive.forEach((v,c)=>close(v,first.positive[c]));}
const black=k.pixel(rgb);assert.deepEqual(black.flags.bounded,[true,true,true]);black.positive.forEach(v=>assert.equal(v,.18*1e-20));assert.ok(black.logPositive.every(Number.isFinite));
// Independent scalar inverse-H&D oracle with identity density mixing: base is
// black, reference density is 18%, monotonic through the toe and full range.
const identity={...V.clone(V.latestPrior),densityMatrix:[[1,0,0],[0,1,0],[0,0,1]]},scalar=V.compile(source,base,identity),response=identity.responses[0],denominator=Math.expm1(Math.LN10*response.slope*response.referenceDensity);
let previous=0;
for(const d of [1e-12,1e-10,1e-8,.0001,.01,.1,.5,1,2,4,6]){const p=scalar.pixel(rgb.map(v=>v*10**(-d))).positive;const expected=.18*Math.expm1(Math.LN10*response.slope*d)/denominator;p.forEach(v=>close(v,expected));assert.ok(p[0]>previous);previous=p[0];}
scalar.pixel(rgb.map(v=>v*.1)).positive.forEach(v=>close(v,.18));
// Off-diagonal density mixing acts before the nonlinearity. It is fixed for all
// pixels, and is not equivalent to a per-image or constant positive RGB gain.
const d=[.25,.4,.65],jd=rgb.map((v,c)=>v*10**(-d[c])),mixed=k.pixel(jd).positive;
V.latestPrior.densityMatrix.forEach((row,c)=>{const q=row.reduce((n,a,i)=>n+a*d[i],0),expected=.18*Math.expm1(Math.LN10*response.slope*q)/denominator;close(mixed[c],expected);});
const shifted=k.pixel(rgb.map((v,c)=>v*10**(-(d[c]+(c===1?.1:0))))).positive;shifted.forEach((v,c)=>assert.ok(v>mixed[c],'green-density increase affects each reconstructed channel'));
const ratios=[.1,1].map(delta=>k.pixel(rgb.map((v,c)=>v*10**(-(d[c]+delta)))).positive[2]/scalar.pixel(rgb.map((v,c)=>v*10**(-(d[c]+delta)))).positive[2]);assert.ok(Math.abs(ratios[0]-ratios[1])>.01,'density-dependent reconstruction, not constant blue reduction');
// Frozen compile snapshots survive external mutation and base changes never
// recalibrate slope, matrix or reference offset.
const mutable=V.clone(V.latestPrior),frozen=V.compile(source,base,mutable),frozenPixel=frozen.pixel(j);mutable.responses[0].slope=9;mutable.densityMatrix[0][0]=1.5;assert.deepEqual(frozen.pixel(j),frozenPixel);
assert.deepEqual(V.compile(source,{...base,rgb:rgb.map(v=>v*1.2)},V.latestPrior).calibration,k.calibration);
for(const invalid of [{...V.clone(V.latestPrior),version:4},{...V.clone(V.latestPrior),densityMatrix:[[1,0,0],[0,1,0]]},{...V.clone(V.latestPrior),densityMatrix:[[1,0,0],[0,NaN,0],[0,0,1]]},{...V.clone(V.latestPrior),densityMatrix:[[3,0,0],[0,1,0],[0,0,1]]},{...V.clone(V.latestPrior),responses:V.latestPrior.responses.map(r=>({...r,kind:'affine'}))},{...V.clone(V.latestPrior),responses:V.latestPrior.responses.map(r=>({...r,referenceDensity:0}))}])assert.throws(()=>V.compile(source,base,invalid),/CALIBRATION_INVALID/);
// Tiny positive parameters can underflow their normalizing product to zero;
// reject this calibration before any project/worker state is mutated.
const underflow=V.clone(V.latestPrior);underflow.responses=underflow.responses.map(r=>({...r,slope:Number.MIN_VALUE,referenceDensity:Number.MIN_VALUE}));assert.throws(()=>V.compile(source,base,underflow),/CALIBRATION_INVALID/);
const analyzed=R.analyzeWithMask(im,k,{analysisArea:area}),intent=analyzed.intent,oldIntent=R.analyze(im,old,{analysisArea:area});
assert.equal(intent.analysisVersion,R.reconstructionExposureRecipe.version);assert.equal(intent.analysis.exposure.recipe.target,.8);assert.equal(intent.analysis.exposure.recipe.highlightCeiling,16);assert.equal(oldIntent.analysisVersion,R.exposureRecipe.version);assert.equal(oldIntent.analysis.exposure.recipe.target,.25);assert.equal(oldIntent.analysis.exposure.recipe.highlightCeiling,3);
assert.notEqual(R.analysisKey(k,{analysisArea:area}),R.analysisKey(old,{analysisArea:area}));assert.equal(R.analysisKey(k,{analysisArea:area}),R.analysisKey(k,{analysisArea:area,crop:{x:.2,y:.3,w:.4,h:.5},rotation:90}));
const ea=intent.analysis.exposure,em=.8/ea.percentiles.p60,eh=16/ea.percentiles.p99;close(2**intent.exposure,em/Math.hypot(1,em/eh));
assert.equal(R.analyze(im,k).analysis.exposure.fallback,'ANALYSIS_AREA_UNCONFIRMED');
const inputs=[[0,-1,NaN],[Infinity,-Infinity,Number.MIN_VALUE],[1e-300,1e-200,1e-30],[1e100,1e50,1e20],[1.2,2,1.1],rgb,[rgb[0]*(1+1e-12),rgb[1],rgb[2]],...Array.from({length:500},()=>rgb.map(v=>v*10**(2-random()*14)))];
const scratch=new Float64Array(3),color={...intent,colorCorrection:{version:1,kind:'neutral-anchor-bands',knots:[.001,.1,10],gains:[[1,1,1],[1.1,.95,1.02],[.96,1.04,.99]]}};
for(const p of inputs){const ref=k.pixel(p);assert.ok(ref.positive.every(Number.isFinite));assert.ok(ref.logPositive.every(Number.isFinite));assert.deepEqual(k.pixel(p),ref);}
assert.deepEqual(k.pixel([0,-1,NaN]).flags.invalid,[true,true,true]);assert.deepEqual(k.pixel([0,-1,NaN]).flags.floor,[true,true,true]);assert.deepEqual(k.pixel([1.2,2,1.1]).flags.clipped,[true,true,true]);assert.ok(k.pixel([1e100,1e50,1e20]).density.every(v=>v<0),'T>1 remains negative density');
for(const i of [intent,color])for(const viewMode of ['auto','fixed','technical']){const f=F.compile(k,i,{viewMode});for(const p of inputs){f.technical(...p,scratch);scratch.forEach((v,c)=>close(v,k.pixel(p).positive[c]));f.pixel(...p,scratch);const expected=R.view(k.pixel(p).positive,i,viewMode);scratch.forEach((v,c)=>{assert.ok(Number.isFinite(v)&&v>=0&&v<=1);close(v,expected[c]);});}}
// RGB8/RGB16 geometric integration samples the same converted pixels as the
// scalar reference; no negative averaging before reconstruction.
for(const rotation of [0,90,180,270])for(const bits of [8,16])for(const mode of ['auto','fixed','technical']){const g=O.geometry(im,{x:.1,y:.1,w:.8,h:.8},rotation,17),ref=O.rows(im,g,0,g.height,(x,y)=>O.pixel(im,k,intent,x,y,mode),bits),actual=await O.area(im,g,F.compile(k,intent,{viewMode:mode}).pixel,bits);actual.forEach((v,n)=>assert.ok(Math.abs(v-ref[n])<=1));}
const diagnostic=NSV2Diagnostics.diagnostic(im,k,intent,{mask:analyzed.mask});assert.equal(diagnostic.calibration.value.version,3);assert.deepEqual(diagnostic.calibration.value.densityMatrix,V.latestPrior.densityMatrix);assert.equal(diagnostic.tonePlacement.value.currentStatistics.recipe.version,intent.analysisVersion);assert.equal(diagnostic.tonePlacement.value.currentStatistics.recipe.target,.8);
console.log('PASS reconstruction: frozen base-zero prior, density/gain invariants, scalar toe oracle, fixed density mixing, legacy affine preservation, explicit bounds, fast/reference/view/area/RGB16 parity, versioned P60/P99 and diagnostics; max relative/absolute error',maxError);
