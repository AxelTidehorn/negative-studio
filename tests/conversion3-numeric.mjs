import assert from 'node:assert/strict';
import '../src/import/raw-input.js';import '../src/image/image-model.js';import '../src/calibration/color-analysis.js';import '../src/color/conversion3.js';
import {negative,region} from './helpers/conversion3-fixtures.mjs';
const C=NSConversion3,close=(a,b,e=1e-11)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
for(const confidence of [0,.1,.5,1]){const c=C.curveResponse(confidence);let last=-1;for(let i=0;i<=4000;i++){const x=-.5+i*.001,y=C.evaluate(c,x);assert.ok(y>=last-1e-14);assert.ok(Number.isFinite(y));assert.ok(C.derivative(c,x)>=-1e-12);assert.ok(C.derivative(c,x)<=1.7);last=y;}
 for(let j=0;j<c.knots.length-1;j++){const h=c.knots[j+1]-c.knots[j],a=c.coefficients[j],b=c.coefficients[Math.min(j+1,c.coefficients.length-1)],y0=c.values[j],y1=c.values[j+1],m0=a[1],m1=j+1<c.coefficients.length?b[1]:(3*a[3]*h+2*a[2])*h+a[1];for(const t of [.1,.3,.7,.9]){const expected=(2*t**3-3*t*t+1)*y0+(t**3-2*t*t+t)*h*m0+(-2*t**3+3*t*t)*y1+(t**3-t*t)*h*m1;close(C.evaluate(c,c.knots[j]+t*h),expected);}if(j+1<c.coefficients.length)close((3*a[3]*h+2*a[2])*h+a[1],b[1]);}}
let last=0;for(let i=0;i<=20000;i++){const x=-100+i*.01,t=C.densityTone(x);assert.ok(t.value>=last-1e-14);assert.ok(t.value>=0&&t.value<=1&&t.slope>=0&&t.slope<=.980000001);last=t.value;}
close(C.densityTone(.5).value,.5);for(const x of [0,.8]){close(C.densityTone(x-1e-8).value,C.densityTone(x+1e-8).value,2e-8);close(C.densityTone(x-1e-8).slope,C.densityTone(x+1e-8).slope,2e-6);}
for(const scene of ['neutral','mixed','dominant'])for(const gain of [.25,1,1.2]){
 const im=negative({scene,gain}),s=NSColorAnalysis.analyze(im,region),a=C.analyze(im,region,{comparison:s,base:[.74,.43,.24],light:[1,1,1],domain:'synthetic'});assert.ok(C.valid(a));
 for(const id of C.ids){const k=C.compile(id,a),identity=C.compile(id,a,true,{identity:true});for(let i=0;i<im.data.length;i+=3){const p=Array.from(im.data.subarray(i,i+3)),out=k.pixel(p);assert.ok(out.every(v=>Number.isFinite(v)&&v>=0&&v<=1));const u=p.map((v,j)=>C.coordinate(v,j,a.reference));assert.deepEqual(identity.pixel(p),u.map(v=>Math.max(0,Math.min(1,v))));if(scene==='neutral')assert.ok(Math.max(...out)-Math.min(...out)<3e-6);}
  assert.ok(k.technical(1/65535,0)>1);assert.ok(k.technical(1,0)<0);
 }
 const m=a.matrix.matrix,w=C.weights(a.workingSpace),D=m.map((r,i)=>r.map((v,j)=>v-(i===j?1:0))),norm=Math.hypot(...D.flat());assert.ok(norm<=.0750000001);assert.ok(a.matrix.conditionBound<1.163);for(let i=0;i<3;i++){close(m[i].reduce((s,v)=>s+v),1);close(m.reduce((s,r,k)=>s+w[k]*r[i],0),w[i]);}
 if(scene==='mixed'){assert.equal(a.matrix.kind,'regularized-chroma-covariance');assert.ok(norm>1e-5);assert.ok(C.compile('curve3',a).pixel([.2,.13,.09]).some((v,i)=>Math.abs(v-C.compile('curve3',a,true,{identity:true}).pixel([.2,.13,.09])[i])>1e-4));}
}
const validModel=C.analyze(negative(),region,{comparison:NSColorAnalysis.analyze(negative(),region),base:[.74,.43,.24],light:[1,1,1],domain:'validation'});for(const mutate of [a=>a.reference.spans[0]=1e-300,a=>a.curve.channels[0].coefficients[0][1]=100,a=>a.matrix.matrix[0][0]=2]){const bad=structuredClone(validModel);mutate(bad);assert.equal(C.valid(bad),false);assert.throws(()=>C.compile('curve3',bad),/Invalid/);}
assert.equal(C.matrixModel(Array(200).fill([.5,.5,.5])).kind,'identity');assert.equal(C.matrixModel([]).kind,'identity');
for(const id of C.ids)assert.throws(()=>C.compile(id,{version:99}),/Invalid/);
console.log('PASS Curve: dense monotonicity, C1/Hermite reference, bounded slopes and identity; Density: signed range, C1 monotone tails and bounded derivative; Matrix: nontrivial bounded transform, neutral/luminance axes, regularization and safe fallback; all models finite through source exposure/scene cases');
