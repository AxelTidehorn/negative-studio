
import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
import {harness} from './helpers/app-harness.mjs';
const h=harness(),E=h.context.NSEditing2,K=h.context.NSPixelKernel,defaults=h.run('defaultState()');
let seed=4711;const random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
const dot=(p,w=[.2126,.7152,.0722])=>p.reduce((s,v,k)=>s+v*w[k],0),decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const span={exposure:[-2,2],contrast:[.5,1.7],gamma:[.65,1.6],shadows:[-100,100],highlights:[-100,100],shadow:[0,.12],highlight:[.85,1],temperature:[-35,35],tint:[-35,35],saturation:[0,1.8]};
const cases=[{...defaults},...Object.entries(span).flatMap(([k,a])=>a.map(v=>({...defaults,[k]:v})))];
const toneKeys=['exposure','contrast','gamma','shadows','highlights','shadow','highlight'];
for(let mask=0;mask<128;mask++){const o={...defaults};toneKeys.forEach((k,i)=>o[k]=span[k][(mask>>i)&1]);cases.push(o);}
for(let j=0;j<500;j++){const o={...defaults};for(const [k,[lo,hi]]of Object.entries(span))o[k]=lo+(hi-lo)*random();cases.push(o);}
for(const o of cases){
 const p=E.prepare(o),tone=p.tone;let last=-1;
 for(let i=0;i<=4096;i++){const v=E.evaluate(tone,i/4096);assert.ok(Number.isFinite(v)&&v>=last-1e-12&&v>=-1e-12&&v<=1+1e-12);last=v;}
 assert.equal(E.evaluate(tone,0),tone.values[0]);assert.ok(Math.abs(E.evaluate(tone,1)-tone.values.at(-1))<1e-12);
 for(let i=1;i<8;i++){
  const x=E.X[i],eps=1e-7,left=(E.evaluate(tone,x)-E.evaluate(tone,x-eps))/eps,right=(E.evaluate(tone,x+eps)-E.evaluate(tone,x))/eps;
  assert.ok(Math.abs(left-right)<.005,'C1 continuity '+[left,right]);
 }
}
// Independent Hermite basis evaluation, including endpoint slopes.
for(let j=0;j<50;j++){
 const t=E.prepare(cases[j]).tone;
 for(let k=0;k<8;k++)for(const u of [.1,.37,.8]){
  const width=E.X[k+1]-E.X[k],expected=(2*u**3-3*u*u+1)*t.values[k]+(u**3-2*u*u+u)*width*t.slopes[k]+(-2*u**3+3*u*u)*t.values[k+1]+(u**3-u*u)*width*t.slopes[k+1];
  assert.ok(Math.abs(E.evaluate(t,E.X[k]+u*width)-expected)<1e-12);
 }
}
for(const p of [[0,0,0],[1,1,1],[.1,.2,.3],[1/65535,.5,.99]])assert.deepEqual(Array.from(E.compile(defaults).pixel(p)),p);
const curve=o=>E.prepare({...defaults,...o}).tone;
assert.ok(E.evaluate(curve({shadows:100}),.04)>E.evaluate(curve({}),.04));assert.ok(E.evaluate(curve({highlights:100}),.85)<E.evaluate(curve({}),.85));
assert.ok(Math.abs(E.evaluate(curve({contrast:1.7}),.18)-.18)<1e-12);
for(const gamma of [.65,1.6])assert.ok(E.evaluate(curve({gamma}),.18)>0);
console.log('PASS',cases.length,'tone combinations: dense monotonicity, finite endpoints, C1 knots, independent Hermite reference, pivot, directions and exact neutral identity');
const colors=[[0,0,0],[1,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0],[0,1,1],[1,0,1],[.62,.34,.22],[.2,.11,.075],[.95,.72,.6],[.00001,.00002,.0001]];
for(let i=0;i<128;i++)colors.push([i/127,.3*(i/127)**2,1-i/127]);
for(const o of cases.slice(0,80)){
 const edit=E.compile(o),compiled=E.prepare(o);for(const p of colors){const q=edit.pixel(p);assert.ok(q.every(v=>Number.isFinite(v)&&v>=0&&v<=1+1e-12));
  if(!compiled.identity){const balanced=p.map((v,k)=>decode(v)*compiled.gains[k]),y=dot(balanced),floor=compiled.tone.values[0],target=E.evaluate(compiled.tone,y),scale=y>1e-12?(target-floor)/y:compiled.tone.slopes[0];const reference=E.gamut(E.saturation(balanced.map(v=>floor+v*scale),compiled.saturation),compiled.knee).map(v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055);assert.ok(q.every((v,k)=>Math.abs(v-reference[k])<1e-12),'scalar/reference equivalence');}
 }
 let last=-1;for(let i=0;i<2048;i++){const q=edit.pixel([i/2047,i/2047,i/2047]);if(!o.temperature&&!o.tint){assert.ok(Math.max(...q)-Math.min(...q)<1e-7);const y=dot(q.map(decode));assert.ok(y>=last-1e-9);last=y;}}
}
for(const p of [[.3,.15,.1],[.1,.2,.15],[.2,.25,.3]]){
 const original=E.lab(p),out=E.lab(E.saturation(p,1.2));assert.ok(Math.abs(out[0]-original[0])<1e-7);assert.ok(Math.abs(out[1]*original[2]-out[2]*original[1])<1e-8);
 assert.ok(E.gamut(p).every((v,k)=>Math.abs(v-p[k])<1e-12));
}
for(const value of [NaN,Infinity,-Infinity,null,'wrong'])assert.ok(E.compile({...defaults,exposure:value,contrast:value,gamma:value,saturation:value}).pixel([.2,.3,.4]).every(Number.isFinite));
for(const p of colors.slice(0,12)){const q=E.compile({...defaults,exposure:1e-7}).pixel(p);assert.ok(q.every((v,k)=>Math.abs(v-p[k])<1e-5),'continuous from neutral');}
console.log('PASS grays, skin-like swatches, saturated colors, gradients, gamut/OKLab invariants and invalid editing inputs remain finite/bounded');
console.log('PASS Editing 2 mathematics; conversion/preview/export identity is covered by architecture oracle');
