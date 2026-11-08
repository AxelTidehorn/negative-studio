import assert from 'node:assert/strict';
import '../src/conversion-v2/core.js';import '../src/conversion-v2/render.js';import '../src/conversion-v2/fast.js';import '../src/conversion-v2/platform.js';
import {factor} from '../tools/v2-presentation-model.mjs';import {placement} from '../tools/v2-scene-tone-model.mjs';
const V=NSConversionV2,R=NSV2Render,P=NSV2Platform;
for(let n=0;n<1000;n++){const y=2**(-20+n/25);assert.equal(R.matchedFactor(y),factor(y,0));}
const stats={p10:.01,p50:.04,p60:.055,p90:.073,p99:.082,samples:1000,validFraction:.9,areaStatus:'confirmed'};assert.deepEqual(R.sceneExposure(stats,R.reconstructionExposureRecipe),placement(R,stats,R.reconstructionExposureRecipe));
const im={width:100,height:100,data:Float32Array.from({length:30000},(_,i)=>[.8,.45,.2][i%3]*10**(-(.1+(i%331)/200))),channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'},args={sourceKey:'approved-D',capture:{session:'test',recipe:{decoder:'fixture'}},measurement:{measured:[.8,.45,.2],kind:'manual-region'},area:{region:{x:0,y:0,w:1,h:1},status:'confirmed'}};
const fresh=P.prepare(im,args);assert.equal(fresh.intent.tone,'luminance-matched-D-1');P.validate(fresh);assert.equal(P.prepare(im,{...args,previous:fresh}).intent.id,fresh.intent.id);
assert.equal(P.prepare(im,{...args,previous:fresh,photographic:0}).intent.tone,'luminance-reinhard-1');
const old=P.prepare(im,{...args,photographic:2});assert.equal(old.intent.tone,'luminance-photographic-2');const reopened=P.prepare(im,{...args,previous:old});assert.deepEqual(reopened.intent,old.intent);
const changed=P.prepare(im,{...args,previous:fresh,measurement:{measured:[.79,.44,.2],kind:'manual-region'}});assert.equal(changed.intent.tone,fresh.intent.tone);assert.notEqual(changed.intent.id,fresh.intent.id);
assert.throws(()=>P.validate({...fresh,intent:{...fresh.intent,toneRecipe:{...fresh.intent.toneRecipe,contrastEV:.5}}}));
for(const recipe of [fresh,old]){const k=V.compile(recipe.source,recipe.base,recipe.calibration),f=NSV2Fast.compile(k,recipe.intent);for(let n=0;n<100;n++){const j=Array.from(im.data.slice(n*3,n*3+3)),q=[0,0,0];f.pixel(...j,q);const oracle=R.view(k.pixel(j).positive,recipe.intent);assert.ok(q.every((v,c)=>Math.abs(v-oracle[c])<1e-13));}}

// The approved shoulder is continuous/monotonic, neutral and ratio preserving
// before gamut. An untrusted frame must retain the documented safe fallback.
let last=-1;
for(let n=0;n<=10000;n++){const y=2**(-24+n/200),q=R.toneOnly([y,y,y],{...fresh.intent,exposure:0});assert.ok(q.every(Number.isFinite));assert.equal(q[0],q[1]);assert.equal(q[1],q[2]);assert.ok(q[0]>=last-4*Number.EPSILON);last=q[0];}
for(const y of [1,2]){const f=x=>x*R.matchedFactor(x)/(1+x*R.matchedFactor(x));assert.ok(Math.abs(f(y-1e-8)-f(y+1e-8))<1e-7);}
const fallback=R.sceneExposure({...stats,areaStatus:'missing'},R.reconstructionExposureRecipe);assert.equal(fallback.appliedEV,0);assert.ok(fallback.candidateFallback);
const json=JSON.parse(JSON.stringify(fresh));P.validate(json);assert.deepEqual(P.prepare(im,{...args,previous:json}).intent,fresh.intent);
console.log('PASS approved D exact frozen factor/exposure, fresh default, historical reopen, frozen cache, base invalidation and CPU oracle');
