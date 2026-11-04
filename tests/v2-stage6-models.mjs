import assert from 'node:assert/strict';
import fs from 'node:fs';
for(const n of ['core','render','fast'])await import('../src/conversion-v2/'+n+'.js');
const {parameters,inverse,adaptation,outputWithKnee,compile}=await import('../tools/v2-stage6-models.mjs');
const V=NSConversionV2,R=NSV2Render,F=NSV2Fast,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,`${a} != ${b}`),mul=(m,p)=>m.map(row=>row.reduce((s,v,i)=>s+v*p[i],0));
assert.ok(Object.isFrozen(parameters)&&Object.isFrozen(parameters.H1));assert.equal(parameters.version,1);
assert.ok(!fs.readFileSync('app-manifest.mjs','utf8').includes('v2-stage6'),'research must not ship in the application');
const im={width:48,height:36,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:Float32Array.from({length:48*36*3},(_,i)=>.005+(i*173%60000)/65535)},s=V.source(im,{revision:'research-fixture'}),ctx=V.capture({session:'test',recipe:{decoder:'synthetic'}}),base=V.assumed([.8,.45,.2],s,ctx),k=V.compile(s,base,V.latestPrior),neutral=R.analyze(im,k,{analysisArea:{region:{x:0,y:0,w:1,h:1},status:'confirmed'},algorithmVersion:3}),color={version:1,kind:'neutral-anchor-bands',recipeVersion:'neutral-anchor-bands-2',knots:[.001,.1,1],gains:[[1,1,1],[1,1,1],[1.06,.98,.96]],terminal:{selected:true}},intent=V.freeze({...R.photographic(neutral,2),colorCorrection:color}),before=JSON.stringify({k,intent}),statistics={p50:.5,p60:.8,p95:1,p99:2,samples:1000,validFraction:1,areaStatus:'confirmed',areaConfidence:1};
const h1=compile('H1',k,intent,statistics);assert.ok(Math.abs(h1.metadata.deltaEV)<=1);assert.equal(h1.metadata.fallback,null);
const fallback=compile('H1',k,{...intent,analysis:{...intent.analysis,exposure:{...intent.analysis.exposure,fallback:'ANALYSIS_AREA_UNCONFIRMED'}}},statistics);assert.equal(fallback.metadata.deltaEV,0);
const untrusted=compile('H1',k,intent,{...statistics,areaStatus:'unconfirmed'});assert.equal(untrusted.metadata.deltaEV,0);
const cat=adaptation(color.gains[2]),identity=adaptation([1,1,1]);identity.matrix.forEach((r,i)=>r.forEach((v,j)=>close(v,i===j?1:0)));
const white=mul(cat.matrix,color.gains[2].map(v=>1/v));close(white[0]/white[1],1);close(white[2]/white[1],1);
assert.throws(()=>adaptation([0,1,1]),/INVALID/);assert.throws(()=>inverse([[0,0,0],[0,0,0],[0,0,0]]),/SINGULAR/);assert.throws(()=>outputWithKnee([1,1,1],1),/INVALID/);
const unsupported={...intent,colorCorrection:{...color,terminal:{selected:false}}},h2Fallback=compile('H2',k,unsupported,statistics),baseline=F.compile(k,unsupported),a=new Float64Array(3),b=new Float64Array(3);
assert.equal(h2Fallback.metadata.fallback,'NO_SUPPORTED_TERMINAL_ANCHOR');
for(let i=0;i<900;i++){
 const p=[(i*17%139)/80,(i*37%173)/91,(i*53%163)/99],oracle=R.displayNeutral(p);outputWithKnee(p,.8).forEach((v,c)=>close(v,oracle[c]));
 const q=outputWithKnee(p,.95);q.forEach(v=>assert.ok(Number.isFinite(v)&&v>=-1e-12&&v<=1+1e-12));
 const pre=mul(R.matrix,p),Y=.2126*pre[0]+.7152*pre[1]+.0722*pre[2];if(Y>=0&&Y<1)close(.2126*q[0]+.7152*q[1]+.0722*q[2],Y);
 const j=[.1+i%31/100,.08+i%17/110,.02+i%19/120];h2Fallback.pixel(...j,a);baseline.pixel(...j,b);assert.deepEqual(a,b);
 for(const name of ['photo1','photo2','H1','H2','H3'])compile(name,k,intent,statistics).pixel(...j,a).forEach(v=>assert.ok(Number.isFinite(v)&&v>=-1e-12&&v<=1+1e-12));
}
assert.equal(JSON.stringify({k,intent}),before,'experiments must not mutate source/base/calibration/historical recipes');
assert.throws(()=>compile('unknown',k,intent,statistics),/UNKNOWN/);
console.log('PASS research-only one-stage experiments: historical recipes immutable, P95 bounds/fallback, Bradford neutral mapping/fallback, old gamut oracle and output luminance/range');
