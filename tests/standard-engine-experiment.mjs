/* Independent neutral-profile oracle and bounded synthetic experiment.
   No real RAF reproduction is claimed. Run after npm test unpacks the harness. */
import assert from 'node:assert/strict';
import {harness} from './helpers/app-harness.mjs';
const h=harness({editingVersion:1}),K=h.context.NSPixelKernel,CE=h.context.NSColorEngine,P=h.context.NSPresentation,G=h.context.NSGeometry;
h.run(`render=()=>{};scheduleRender=()=>{};working={width:32,height:24,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:32*24*3},(_,i)=>4000+(i*137)%40000)};workingPreview=CE.preview(working);sourceInfo={encoding:'linear'};state={...defaultState(),shadow:0,highlight:1,cropConfirmed:true};cropRegion={x:0,y:0,w:1,h:1};src=new ImageData(32,24);previewSrc=src;analyzeLevels();`);
const config=h.run('configuration38()');Object.assign(config,{neutralProfile:true,neutralPrint:true,strength:0});Object.assign(config.opts,{autoLevels:false});Object.assign(config.cal.beta4,{lo:0,span:1,base:[1,1,1],light:[1,1,1],response:{offset:[0,0,0],span:[4,4,4]}});
const W=[.2126,.7152,.0722],clamp=v=>Math.max(0,Math.min(1,v)),lum=(p,w=W)=>p.reduce((s,v,k)=>s+v*w[k],0),chroma=p=>Math.max(...p)-Math.min(...p);
const close=(a,b,t=1e-12)=>a.forEach((v,k)=>assert.ok(Math.abs(v-b[k])<=t,`${a} != ${b}`));
const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,encode=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
// Independent scalar oracle. Does not call technical(), finish(), lowSignal4()
// or production lookup helpers. Selected/old modes differ only in chroma confidence.
function reference(source,c,mode='old'){
 const a=c.cal.beta4,o=c.opts,p=source.map((v,k)=>(-Math.log10(Math.max(1/65535,v)*a.light[k]/a.base[k])-a.response.offset[k])/a.response.span[k]);
 let rgb=p.map(v=>Math.max(0,o.autoLevels?(v-a.lo)/a.span:v));
 if(mode==='selected'){
  const t=clamp(Math.log2(64/(65535*Math.max(1/65535,Math.min(...source))))/4),fade=.85*t*t*(3-2*t),y=lum(rgb);
  rgb=rgb.map(v=>v+fade*(y-v));
 }
 const gains=[Math.exp(o.temperature/180+o.tint/350),Math.exp(-o.tint/120),Math.exp(-o.temperature/180+o.tint/350)];rgb=rgb.map((v,k)=>v*2**o.exposure*gains[k]);
 const y=lum(rgb),target=Math.max(0,(y-decode(o.shadow))/Math.max(.01,decode(o.highlight)-decode(o.shadow)));
 if(y>1e-12)rgb=rgb.map(v=>v*target/y);
 const peak=Math.max(...rgb),mapped=o.toneMode4==='reference'?Math.min(1,peak):peak<=.8?peak:.8+.2*(1-Math.exp(-(peak-.8)/.2));
 if(peak>0)rgb=rgb.map(v=>v*mapped/peak);
 if(mode==='forced21'&&peak>.85){const t=clamp((peak-.85)/.45),fade=t*t*(3-2*t);rgb=rgb.map(v=>v+fade*(mapped-v));}
 return rgb.map(encode);
}
const kernel=K.compile(config),methods={old:p=>reference(p,config),forced21:p=>reference(p,config,'forced21'),softLog8:p=>reference(p.map(v=>Math.hypot(v,8/65535)),config),selected:p=>kernel.pixel(p)};
const metrics={};
for(const [name,pixel] of Object.entries(methods)){
 const center=pixel([.002,.001,8/65535]).map(decode);let sum=0;const ys=[];
 for(let b=0;b<=16;b++){const q=pixel([.002,.001,b/65535]).map(decode);sum+=q.reduce((s,v,k)=>s+(v-center[k])**2,0);ys.push(lum(q));}
 metrics[name]={rgbRms:Math.sqrt(sum/51),lumaRange:Math.max(...ys)-Math.min(...ys),clippedBlueChroma:chroma(pixel([.002,.001,0]).map(decode))};
}
console.log('EXPERIMENT (synthetic blue-channel perturbations, linear display units)',JSON.stringify(metrics));
assert.ok(metrics.selected.rgbRms<metrics.old.rgbRms*.4);assert.ok(metrics.selected.lumaRange<metrics.old.lumaRange*.3);assert.ok(metrics.selected.clippedBlueChroma<metrics.old.clippedBlueChroma*.25);
// Force PR21 on to test the hypothesis even though its UI currently saves smooth.
assert.ok(metrics.forced21.rgbRms>metrics.old.rgbRms);
// Soft-log reduces noise too, but changes neutral density/brightness even at fixed settings.
assert.ok(Math.abs(methods.softLog8([4/65535,4/65535,4/65535])[0]-methods.old([4/65535,4/65535,4/65535])[0])>.001);
console.log('PASS selected knee reduces this low-signal perturbation without the soft-log neutral tone shift; forced PR21 is not a general noise remedy');

let oracleCases=0;
for(const toneMode4 of ['smooth','reference','experimental'])for(const autoLevels of [false,true])for(const exposure of [-1,0,1]){
 const c=structuredClone(config);Object.assign(c.opts,{toneMode4,autoLevels,exposure,temperature:7,tint:-3});Object.assign(c.cal.beta4,{lo:.08,span:1.3,base:[.7,.4,.2],light:[.8,1.2,1.1],response:{offset:[.1,-.2,.15],span:[2.5,3.2,4.8]}});
 // experimental additionally retains PR21's shoulder, exercised separately in browser parity.
 if(toneMode4==='experimental')continue;
 const k=K.compile(c);
 for(const p of [[0,.001,.003],[.002,.001,1/65535],[4/65535,8/65535,32/65535],[64/65535,.01,.1],[.8,.3,.1]]){close(k.pixel(p),reference(p,c,'selected'));oracleCases++;}
}
console.log('PASS',oracleCases,'independent scalar oracles with unequal response spans, base/light, common range, exposure and white balance');

// Uniform neutral transmission has no chroma to remove, including both boundaries.
let previous=-1;
for(let n=0;n<=1200;n++){
 const v=10**(-5+5*n/1200),p=[v,v,v],out=kernel.pixel(p),old=methods.old(p);close(out,old);close(out,[out[0],out[0],out[0]]);
 assert.ok(out[0]<=1&&out[0]>=0&&out.every(Number.isFinite));
 // As transmission increases, the converted neutral becomes darker.
 if(previous>=0)assert.ok(out[0]<=previous+1e-12);previous=out[0];
}
// A calibrated neutral remains neutral even with unequal film masks/responses.
const uneven=structuredClone(config);Object.assign(uneven.cal.beta4,{base:[.7,.4,.2],light:[.8,1.2,1.1],response:{offset:[.1,-.2,.15],span:[2.5,3.2,4.8]}});
for(const d of [.1,.5,.75,.8]){const a=uneven.cal.beta4,source=a.base.map((v,k)=>v/a.light[k]*10**(-a.response.offset[k]-a.response.span[k]*d));close(K.compile(uneven).pixel(source),reference(source,uneven));}
// Monochrome bypasses chroma confidence, including colored clipped source pixels.
const mono=structuredClone(config);mono.profile={type:'bw'};
for(const source of [[.002,.001,0],[0,0,0],[.01,.2,.7]]){const density=source.map(v=>-Math.log10(Math.max(1/65535,v))/4),y=lum(density),mapped=y<=.8?y:.8+.2*(1-Math.exp(-(y-.8)/.2));close(K.compile(mono).pixel(source),[encode(mapped),encode(mapped),encode(mapped)]);}
// Strong, valid colors with all source channels above the knee are unchanged.
let highSignal=0;
for(let i=0;i<500;i++){
 const p=[0,1,2].map(k=>.001+((i*(197+k*41)+k*73)%997)/997*.899);
 close(kernel.pixel(p),methods.old(p));highSignal++;
}
// No boundary discontinuity; dense colored gradients retain color rather than white.
let last=null,maxStep=0;
for(let n=0;n<=8192;n++){
 const p=[.002,.001,(1+n*127/8192)/65535],out=kernel.pixel(p);assert.ok(out.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 if(last)maxStep=Math.max(maxStep,...out.map((v,k)=>Math.abs(v-last[k])));last=out;
}
assert.ok(maxStep<.0002,maxStep);
const dense=kernel.pixel([.002,.001,0]).map(decode);assert.ok(chroma(dense)>.05&&chroma(dense)<.1);assert.ok(Math.max(...dense)<.9);
// A low-signal color below the shoulder retains pre-tone luminance and hue direction.
const low=structuredClone(config);low.opts.exposure=-3;const lk=K.compile(low),raw=[.002,.001,0],old=reference(raw,low).map(decode),fresh=lk.pixel(raw).map(decode),y=lum(old);
assert.ok(Math.abs(lum(fresh)-y)<1e-12);close(fresh.map(v=>(v-y)/.15),old.map(v=>v-y));
// Preserve information in extreme neutral highlights that log39 clips to white.
const comparison=structuredClone(config);comparison.kind='log39';comparison.opts.autoLevels=true;comparison.cal.log39={lo:[0,0,0],spans:[4,4,4]};
const log=K.compile(comparison),samples=[1/65535,2/65535,4/65535];
assert.ok(samples.every(v=>log.pixel([v,v,v]).every(x=>Math.abs(x-1)<1e-12)));
const smooth=samples.map(v=>kernel.pixel([v,v,v])[0]);assert.ok(smooth[0]>smooth[1]&&smooth[1]>smooth[2]&&smooth[0]<1);
for(const v of [0,1/65535,.001,.03,.7,1])close(log.pixel([v,v,v]),[0,1,2].map(()=>encode(clamp(-Math.log10(Math.max(1/65535,v))/4))));
console.log('PASS neutral stability/monotonicity,',highSignal,'unchanged high-signal colors, smooth gradients (max step',maxStep+'), hue/luminance, highlight separation beyond comparison clipping; log39 reference unchanged');

// Prepared tables, CPU preview, presentation TIFF/JPEG and raw Float32 agree in
// the affected signal range, including source normalization and flat-field reads.
for(const Type of [Uint16Array,Float32Array])for(const flat of [false,true]){
 const scale=Type===Uint16Array?65535:1,im={width:17,height:9,channels:3,scale,encoding:'linear',data:Type.from({length:17*9*3},(_,i)=>scale*(i%3===0?.002:i%3===1?.001:(i%67)/65535))};
 if(flat)im.flatField={size:2,gains:Array(12).fill(1.1)};
 const prepared=K.prepare(im,config),preview=K.render(im,config,'positive',1000);
 for(let i=0;i<im.data.length;i+=3){const expected=kernel.pixel(CE.pixel(im,(i/3)%17,Math.floor(i/3/17)));close(prepared.pixel(i),expected);for(let k=0;k<3;k++)assert.ok(Math.abs(preview.data[i/3*4+k]-Math.round(expected[k]*255))<=1);}
 for(const fine of [0,-2,2]){const model=G.create();model.rotation.fineDegrees=fine;const g=P.plan(im,model,false,null),tiff=P.tiff(im,config,g,0,g.height,prepared),jpeg=P.rgba(im,prepared,g,g,0,g.height);
  for(let i=0;i<tiff.length;i++)assert.ok(Math.abs(jpeg[Math.floor(i/3)*4+i%3]-Math.round(tiff[i]/257))<=1);
 }
}
const before=h.run('JSON.stringify({state,calibration,sharedResponse4,cropRegion,analysisCount38})');
K.render(h.run('working'),h.run('configuration38()'),'positive',32);
assert.equal(h.run('JSON.stringify({state,calibration,sharedResponse4,cropRegion,analysisCount38})'),before);
console.log('PASS low-signal CPU preview, prepared/LUT/float/flat-field and TIFF/JPEG sampling agree; rendering does not change calibration');
