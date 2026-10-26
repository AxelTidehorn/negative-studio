import {readSource} from './helpers/source.mjs';
import assert from 'node:assert/strict';import vm from 'node:vm';import {createHash} from 'node:crypto';import {harness} from './helpers/app-harness.mjs';
import {fixtureConfig,field,robust,localChroma,density,positive,lum,W} from './helpers/color-ab-candidates.mjs';
const h=harness(),K=h.context.NSPixelKernel,CE=h.context.NSColorEngine,P=h.context.NSPresentation,G=h.context.NSGeometry;
const close=(a,b,t=1e-12)=>a.forEach((v,k)=>assert.ok(Math.abs(v-b[k])<=t,`${a} != ${b}`));
const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const historical=JSON.parse(readSource(new URL('./fixtures/color-ab-reference.json',import.meta.url)));
// Compare unmodified historical kernels in the SAME runtime: stored IEEE-754
// doubles can differ by one ULP between Node/V8 versions. Keep exact regression
// checks, and independently require identical 8/16-bit output to the frozen JSON.
const referenceKernels={};
for(const [variant,fixture] of Object.entries(historical.kernels)){
 const source=readSource(new URL('./fixtures/'+fixture.file,import.meta.url),'utf8');
 assert.equal(createHash('sha256').update(source).digest('hex'),fixture.sha256);
 const ctx={NSCreativeProfiles:h.context.NSCreativeProfiles,NSRawInput:h.context.NSRawInput};vm.createContext(ctx);vm.runInContext(source,ctx);referenceKernels[variant]=ctx.NSPixelKernel;
}
function historicalConfig(row){const c=structuredClone(fixtureConfig);Object.assign(c,{workingSpace:row.space,profile:h.context.NSCreativeProfiles.resolve(h.run('filmProfiles'),row.profile,2),neutralProfile:row.profile==='generic',strength:.7});Object.assign(c.opts,{toneMode4:row.tone,...(row.edit?{autoLevels:true,exposure:.7,gamma:.8,contrast:1.2,saturation:1.3,temperature:20,tint:-8,shadows:24,highlights:-31}:{})});Object.assign(c.cal.beta4,{lo:.08,span:1.1,base:[.7,.4,.2],light:[.8,1.2,1.1],response:{offset:[.1,-.2,.15],span:[2.5,3.2,4.8]}});return c;}
for(const row of historical.cases)for(const variant of ['original','legacy']){
 const c=historicalConfig(row);c.opts.colorMode4=variant;const k=K.compile(c);
 const ref=referenceKernels[variant].compile(c),expected=historical.sources.map(p=>Array.from(ref.pixel(p)));
 historical.sources.forEach((p,i)=>{
  assert.deepEqual(Array.from(k.pixel(p)),expected[i]);
  for(const scale of [255,65535])assert.deepEqual(expected[i].map(v=>Math.round(v*scale)),row.expected[variant][i].map(v=>Math.round(v*scale)));
 });
 if(variant==='legacy'){delete c.opts.colorMode4;historical.sources.forEach((p,i)=>assert.deepEqual(Array.from(K.compile(c).pixel(p)),expected[i]));c.opts.colorMode4='invalid';historical.sources.forEach((p,i)=>assert.deepEqual(Array.from(K.compile(c).pixel(p)),expected[i]));}
}
console.log('PASS original matches pre-#21',historical.original,'and default/missing/unknown variant matches main',historical.legacy,'exactly across 36 configs, including BW and #21 experimental tone');
const original=structuredClone(fixtureConfig);original.opts.colorMode4='original';const selected=structuredClone(original);selected.opts.colorMode4='robust';const ko=K.compile(original),ka=K.compile(selected),report=[];
for(const name of ['neutral','weak-blue','cyan','specks','edge','thin']){
 const f=field(name),truth=f.clean.map(p=>ko.pixel(p).map(decode)),outputs={original:f.source.map(p=>ko.pixel(p).map(decode)),A:f.source.map(p=>ka.pixel(p).map(decode)),B:localChroma(f.source,f.width,f.height,original.cal.beta4,false).map(p=>ko.finish(p).map(decode))},row={name};
 for(const [variant,out] of Object.entries(outputs)){let ce=0,ye=0;for(let i=0;i<out.length;i++){const dy=lum(out[i])-lum(truth[i]);ye+=dy*dy;for(let k=0;k<3;k++)ce+=(out[i][k]-lum(out[i])-truth[i][k]+lum(truth[i]))**2;}row[variant]={chromaRms:Math.sqrt(ce/out.length/3),lumaRms:Math.sqrt(ye/out.length)};}
 report.push(row);if(['neutral','weak-blue','specks'].includes(name)){assert.ok(row.A.chromaRms<row.original.chromaRms*.8);assert.ok(row.A.lumaRms<row.original.lumaRms*.8);}if(name==='cyan')assert.ok(row.A.chromaRms<row.original.chromaRms);if(name==='specks')assert.ok(row.B.chromaRms<row.A.chromaRms);if(name==='thin')assert.ok(row.A.chromaRms<row.B.chromaRms*.6);
}
console.log('A/B SYNTHETIC REPORT',JSON.stringify(report));
// Independent full-precision A oracle, unequal response/mask/light, both working spaces.
let cases=0;for(const row of historical.cases.filter(r=>r.profile==='generic'))for(const p of [...historical.sources,[.0001,.0002,.0003]]){
 const c=historicalConfig(row);c.opts.colorMode4='robust';const ref=structuredClone(c);ref.opts.colorMode4='original';const q=robust(p,c.cal.beta4,c.opts.autoLevels,row.space==='rec2020'?[.2627,.678,.0593]:W),pp=q.map(v=>c.opts.autoLevels?v*c.cal.beta4.span+c.cal.beta4.lo:v);
 close(K.compile(c).pixel(p),K.compile(ref).finish(pp));cases++;
 // Common calibrated intensity survives A before white balance/shoulder.
 close([lum(q,row.space==='rec2020'?[.2627,.678,.0593]:W)],[lum(positive(density(p,c.cal.beta4),c.cal.beta4,c.opts.autoLevels),row.space==='rec2020'?[.2627,.678,.0593]:W)]);
}
// All source channels above the bound stay exactly unchanged, even saturated colors.
for(let i=0;i<1000;i++){const p=[0,1,2].map(k=>.001+((i*(173+k*13))%65536)/65535*.99);assert.deepEqual(Array.from(ka.pixel(p)),Array.from(ko.pixel(p)));}
// Finite neutral gradients, continuous signal-boundary transition; no tint introduced.
let previous=Infinity,last=null,maxStep=0;for(let i=0;i<=8192;i++){
 const v=10**(-5+5*i/8192),p=[v,v,v],q=ka.pixel(p);close(q,ko.pixel(p));assert.ok(q.every(Number.isFinite)&&q[0]<=previous+1e-12);previous=q[0];
 const color=ka.pixel([.002,.001,(1+i*127/8192)/65535]);assert.ok(color.every(v=>Number.isFinite(v)&&v>=0&&v<=1));if(last)maxStep=Math.max(maxStep,...color.map((v,k)=>Math.abs(v-last[k])));last=color;
}assert.ok(maxStep<.0003,maxStep);
console.log('PASS',cases,'independent robust-channel oracles, exact high-signal color, common intensity/neutral gradients and continuous boundaries; no spatial neighbor dependence');
// Shared 16-bit, float, flat-field and sRGB paths in the affected signal range.
for(const Type of [Uint16Array,Float32Array])for(const flat of [false,true])for(const encoding of ['linear','srgb']){
 const scale=Type===Uint16Array?65535:1,im={width:17,height:9,channels:3,scale,encoding,data:Type.from({length:17*9*3},(_,i)=>scale*(encoding==='linear'?(i%3===0?.002:i%3===1?.001:i%67/65535):CE.encode(i%67/65535)))};
 if(flat)im.flatField={size:2,gains:Array(12).fill(1.1)};
 const prepared=K.prepare(im,selected),preview=K.render(im,selected,'positive',1000);
 for(let i=0;i<im.data.length;i+=3){const q=ka.pixel(CE.pixel(im,(i/3)%17,Math.floor(i/3/17)));close(prepared.pixel(i),q);for(let k=0;k<3;k++)assert.ok(Math.abs(preview.data[i/3*4+k]-Math.round(q[k]*255))<=1);}
 for(const fine of [0,-2,2]){const model=G.create();model.rotation.fineDegrees=fine;const g=P.plan(im,model,false,null),tiff=P.tiff(im,selected,g,0,g.height,prepared),jpeg=P.rgba(im,prepared,g,g,0,g.height);for(let i=0;i<tiff.length;i++)assert.ok(Math.abs(jpeg[Math.floor(i/3)*4+i%3]-Math.round(tiff[i]/257))<=1);}
}
console.log('PASS robust prepared/LUT, float, sRGB, flat-field, CPU preview and 16-bit TIFF/JPEG geometry sampling agree');
if(process.argv.includes('--benchmark')){
 const f=field('weak-blue',127,95),runs={original:()=>f.source.map(p=>ko.pixel(p)),A:()=>f.source.map(p=>ka.pixel(p)),B:()=>localChroma(f.source,f.width,f.height,original.cal.beta4,false).map(p=>ko.finish(p))},timings={};let checksum=0;
 for(let pass=0;pass<9;pass++)for(const name of (pass%2?['B','A','original']:['original','A','B'])){const start=performance.now(),out=runs[name]();checksum+=out[100][0];if(pass>=2)(timings[name]??=[]).push(performance.now()-start);}
 console.log('A/B CPU BENCHMARK',JSON.stringify({pixels:f.source.length,medianMs:Object.fromEntries(Object.entries(timings).map(([k,v])=>[k,v.sort((a,b)=>a-b)[3]])),checksum,environment:'Node, shared executor; B is a full-source prototype on a small fixture, not production performance'}));
}
