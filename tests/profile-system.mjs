import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import '../src/editing/editing-engine.js';import '../src/editing/profile-catalog.js';import '../src/editing/profile-engine.js';
execFileSync(process.execPath,['tools/generate-profile-catalog.mjs','--check']);
const P=NSProfiles,E=NSEditing2,library=JSON.parse(fs.readFileSync('docs/profile-system/work/FILMLABB_3_Profile_Library.json')),colors=library.tests.synthetic_patch_input;let maxError=0,cases=0;
assert.deepEqual(Object.keys(NSProfileCatalog.profiles),['film.kodak-gold-200','film.kodak-ektar-100','film.fuji-pro-400h','film.kodak-portra-400','creative.backstreet','creative.afterglow','creative.pale-static','creative.redline']);
// Only Gold/Portra intentionally move to Work P revision 2. All six others freeze.
for(const [id,hash] of [
 ['film.kodak-gold-200','f27f9024d50168c05c866a15e37e77d9f742bddab2fdfdeb1e0a26ce7b2b2feb'],
 ['film.kodak-ektar-100','548759f66a382783ec9b0cd0ff0be08a030e12492c0195a9a9c4f5ed01bdd6cf'],
 ['film.fuji-pro-400h','09ad5204669f4460dd4ff8e9ac0c33d4138b8ac030bbdd46daf7daea7b525223'],
 ['film.kodak-portra-400','26015e7103ef518983adeaba7732987789149f84ae0dbdb65e5d08832d64f179'],
 ['creative.backstreet','5cb246c710ff28c5b1367324797a5d1af9ca5a950dc3f75a1e39fb69effb4584'],
 ['creative.afterglow','7d64832aa6bf7a0c9eb9cc005ba19e55d0295faf66987af5852f4e3b8b9b3884'],
 ['creative.pale-static','507ffed1e0e6b76adc3dbcb90e472547b42122a61a1a63d3a758e05fdca99271'],
 ['creative.redline','cf27e43ac0dd7781af7eb07505c873dbb2822ff0058ccd201b87e79e434cc478'],
])assert.equal(createHash('sha256').update(JSON.stringify(NSProfileCatalog.profiles[id])).digest('hex'),hash,id);
assert.deepEqual(NSProfileCatalog.neutral,{id:'neutral',label:'Neutral',category:'reference',presentation:'color',operator:'exact-identity',revision:1});
assert.deepEqual(NSProfileCatalog.monochrome,{id:'mono.neutral',label:'Neutral svartvit',category:'reference',presentation:'monochrome',operator:'monochrome-linear-Y-1',revision:1});
// Independent Python Work renderer output, not a JavaScript self-reference.
const workP=JSON.parse(fs.readFileSync('tests/fixtures/work-parametric-oracle.json')),revised=new Set(Object.keys(workP.parameters));
let workPError=0,workPCases=0;
for(const id of revised){
 const definition=NSProfileCatalog.profiles[id];assert.equal(definition.revision,2);
 for(const [field,expected] of Object.entries(workP.parameters[id]))assert.deepEqual(definition[field],expected,id+' '+field);
 for(const strength of [0,.35,.7,1]){
  const kernel=P.compile({id,strength}),column=workP.columns.indexOf(id);
  for(const row of workP.samples){const input=row[0],expected=input.map((v,c)=>v+strength*(row[column][c]-v)),actual=kernel.pixel(input);workPError=Math.max(workPError,...actual.map((v,c)=>Math.abs(v-expected[c])));if(strength===0)assert.equal(actual,input);workPCases++;}
 }
}
assert.ok(workPError<2e-7,JSON.stringify({workPError}));
console.log('PASS supplied Work P independent oracle',JSON.stringify({workPCases,workPError}));
for(const id of Object.keys(NSProfileCatalog.profiles))for(const strength of [0,.35,.7,1]){
 const k=P.compile({id,strength});
 for(const sample of colors){const q=k.pixel(sample.sRGB),expected=revised.has(id)?null:library.tests.synthetic_result[id]?.[String(strength)][sample.id].sRGB;if(expected)maxError=Math.max(maxError,...q.map((v,c)=>Math.abs(v-expected[c])));else assert.deepEqual(q,sample.sRGB.map((v,c)=>v+strength*(P.compile({id,strength:1}).pixel(sample.sRGB)[c]-v)));if(strength===0)assert.equal(q,sample.sRGB);cases++;}
 for(let r=0;r<=16;r++)for(let g=0;g<=16;g++)for(let b=0;b<=16;b++)assert.ok(k.pixel([r/16,g/16,b/16]).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 let prev=-1;for(let i=0;i<=10000;i++){const y=i/10000,q=k.pixel([y,y,y]);assert.equal(q[0],q[1]);assert.equal(q[1],q[2]);assert.ok(q[0]>=prev-1e-15);prev=q[0];}
 const rows=NSProfileCatalog.profiles[id].hue;for(const h of [0,...rows.map(v=>v[0]),360])for(const column of [1,2,3])assert.ok(Math.abs(P.hueValue(rows,h-1e-5,column)-P.hueValue(rows,h+1e-5,column))<1e-5);
 for(let n=0;n<=3600;n++){const lin=E.rgb([.6,.08*Math.cos(n*Math.PI/1800),.08*Math.sin(n*Math.PI/1800)]),input=lin.map(E.encode),a=k.pixel(input);assert.ok(a.every(Number.isFinite));}
}
assert.ok(maxError<1e-7,JSON.stringify({maxError}));
// Work P-SKIN/F-WHITE safety limits on synthetic regions, not a photographic verdict.
const lab=rgb=>E.lab(rgb.map(E.decode)),chroma=q=>Math.hypot(q[1],q[2]),hue=q=>Math.atan2(q[2],q[1])*180/Math.PI;
for(const id of ['film.fuji-pro-400h','film.kodak-portra-400']){
 const k=P.compile({id,strength:.7});
 for(const sample of colors.filter(p=>p.id.startsWith('skin_'))){const a=lab(sample.sRGB),b=lab(k.pixel(sample.sRGB));assert.ok(Math.abs(hue(b)-hue(a))<=3);assert.ok(Math.abs(chroma(b)-chroma(a))<=.008);}
 const cloud=colors.find(p=>p.id==='cloud_high'),a=lab(cloud.sRGB),b=lab(k.pixel(cloud.sRGB));assert.ok(Math.abs(chroma(b)-chroma(a))<=.004);assert.ok(Math.abs(b[0]-a[0])<=.015);
}
// Matte endpoints use the existing PCHIP coefficients, identically on CPU/GPU.
assert.ok(P.compile({id:'creative.pale-static',strength:1}).pixel([0,0,0])[0]>0);
assert.ok(P.compile({id:'creative.pale-static',strength:1}).pixel([1,1,1])[0]<1);
const creativeSkin=[];
for(const id of Object.keys(NSProfileCatalog.profiles).filter(id=>id.startsWith('creative.'))){
 let maxHue=0,maxChroma=0;
 for(const sample of colors.filter(p=>p.id.startsWith('skin_'))){const a=lab(sample.sRGB),b=lab(P.compile({id,strength:1}).pixel(sample.sRGB));maxHue=Math.max(maxHue,Math.abs(hue(b)-hue(a)));maxChroma=Math.max(maxChroma,Math.abs(chroma(b)-chroma(a)));}
 assert.ok(maxHue<=5,JSON.stringify({id,maxHue}));assert.ok(maxChroma<=.02,JSON.stringify({id,maxChroma}));creativeSkin.push({id,maxHue,maxChroma});
}
console.log('Creative skin safety at 100% (synthetic, not photo acceptance)',JSON.stringify(creativeSkin));
const color=[.2,.4,.8];assert.equal(P.compile({id:'neutral',strength:1}).pixel(color),color);
const mono=P.compile({id:'film.kodak-gold-200',strength:0},true).pixel(color),Y=E.W.reduce((s,v,k)=>s+v*E.decode(color[k]),0);assert.deepEqual(mono,[E.encode(Y),E.encode(Y),E.encode(Y)]);assert.notEqual(mono[0],E.W.reduce((s,v,k)=>s+v*color[k],0));
for(const strength of [-1,2,NaN,Infinity])assert.throws(()=>P.compile({id:'neutral',strength}));for(const id of ['gold','__proto__','constructor','toString',null])assert.throws(()=>P.compile({id,strength:.7}));
for(const mutate of [p=>p.tone[3]=-.1,p=>p.hue[2][0]=1,p=>p.chroma[2]=NaN,p=>p.skinPass=2,p=>p.tone[0]=-.001,p=>p.tone[8]=1.001,p=>p.tone[3]=p.tone[4]+.001]){const d=structuredClone(NSProfileCatalog.profiles['film.kodak-gold-200']);mutate(d);assert.throws(()=>P.validateDefinition(d));}
// A neutral-density negative under an uneven capture/base keeps its technical
// RGB information until positive luminance. This is synthetic, not a real B&W scan.
for(const file of ['conversion-v2/core','conversion-v2/render','conversion-v2/fast','conversion-v2/platform','color/parameters','color/render-core'])await import('../src/'+file+'.js');
const base=[.8,.43,.21],image={width:31,height:19,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:Float32Array.from({length:31*19*3},(_,i)=>base[i%3]*10**(-(.1+2*Math.floor(i/3)/(31*19))))},recipe=NSV2Platform.prepare(image,{sourceKey:'uneven-base-monochrome',capture:{session:'test',recipe:{decoder:'fixture'}},measurement:{measured:base,kind:'manual-region'},area:{region:{x:0,y:0,w:1,h:1},status:'confirmed'}}),config={kind:'v2',v2:recipe,opts:{...E.neutral,editVersion:2},look:{id:'neutral',strength:0},monochrome:false},colorKernel=NSPixelKernel.compile(config),monoKernel=NSPixelKernel.compile({...config,monochrome:true});let last=-1;
for(let n=0;n<100;n++){const input=base.map(v=>v*10**(-(.1+n/50))),positive=colorKernel.pixel(input),gray=monoKernel.pixel(input),Y=E.W.reduce((a,w,k)=>a+w*E.decode(positive[k]),0);assert.equal(gray[0],gray[1]);assert.equal(gray[1],gray[2]);assert.ok(Math.abs(E.decode(gray[0])-Y)<1e-13);assert.ok(gray[0]>=last-1e-14);last=gray[0];}
console.log('PASS Work independent numeric oracle',JSON.stringify({cases,maxError}),'17³ gamut, exact Neutral/zero, monotone gray, hue continuity, mono from positive linear luminance, strict catalogue/project validation');
