import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import '../src/editing/editing-engine.js';import '../src/editing/profile-catalog.js';import '../src/editing/profile-engine.js';
execFileSync(process.execPath,['tools/generate-profile-catalog.mjs','--check']);
const P=NSProfiles,E=NSEditing2,library=JSON.parse(fs.readFileSync('docs/profile-system/work/FILMLABB_3_Profile_Library.json')),colors=library.tests.synthetic_patch_input,ids=Object.keys(NSProfileCatalog.profiles);let cases=0;
assert.deepEqual(ids,['film.kodak-gold-200','film.kodak-ektar-100','film.fuji-pro-400h','film.kodak-portra-400','creative.backstreet','creative.afterglow','creative.pale-static','creative.redline']);
// Reviewed operator-2 designs; any data change must update these deliberately.
for(const [id,hash] of [
 ['film.kodak-gold-200','53de16f92f91909f0812048e479655082f8ac2dbfc491ff475018239fd4f1e52'],
 ['film.kodak-ektar-100','d728e0a839232402922cb266cbf07ab7c89783a2b9b4cd9a8c35b7be39d805dc'],
 ['film.fuji-pro-400h','a12ad8f199d3783d78db3e847587b2de587e1a9da5a56f05615f8b7bc1f94152'],
 ['film.kodak-portra-400','7a5b7d668adb28884c11f1ee253eec9341394440c6df0d04f32ee55749d5a738'],
 ['creative.backstreet','3bd3a0d662aa9f2e632f543d1c2a7ae07c09e8a727675282ed003bee009c22bb'],
 ['creative.afterglow','c3d12ce1a314f1bdc88a7dade54906d0aebc786bd99c52d15551e3798c14ca1a'],
 ['creative.pale-static','3340db851c5738b6557969609013768fcc3c32152f6b1a51ec3ee92cbeed06cd'],
 ['creative.redline','1bdb1438dd0752f78397a82efbfdb0576938705b1286da960ef4f41883b26071'],
])assert.equal(createHash('sha256').update(JSON.stringify(NSProfileCatalog.profiles[id])).digest('hex'),hash,id);
assert.deepEqual(NSProfileCatalog.neutral,{id:'neutral',label:'Neutral',category:'reference',presentation:'color',operator:'exact-identity',revision:1});
assert.deepEqual(NSProfileCatalog.monochrome,{id:'mono.neutral',label:'Neutral svartvit',category:'reference',presentation:'monochrome',operator:'monochrome-linear-Y-1',revision:1});
const lab=rgb=>E.lab(rgb.map(E.decode)),chroma=q=>Math.hypot(q[1],q[2]),hue=q=>Math.atan2(q[2],q[1])*180/Math.PI,luma=rgb=>E.W.reduce((s,w,k)=>s+w*E.decode(rgb[k]),0);
for(const id of ids)for(const strength of [0,.35,.7,1]){
 const k=P.compile({id,strength}),full=P.compile({id,strength:1});
 // Lower strengths are one encoded-sRGB mix with the full-strength result.
 for(const sample of colors){const q=k.pixel(sample.sRGB);assert.deepEqual(q,sample.sRGB.map((v,c)=>v+strength*(full.pixel(sample.sRGB)[c]-v)));if(strength===0)assert.equal(q,sample.sRGB);cases++;}
 for(let r=0;r<=16;r++)for(let g=0;g<=16;g++)for(let b=0;b<=16;b++)assert.ok(k.pixel([r/16,g/16,b/16]).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 // Grays may take the stock's shadow/highlight cast, but their luminance stays monotone.
 let prev=-1;for(let i=0;i<=10000;i++){const y=i/10000,v=luma(k.pixel([y,y,y]));assert.ok(v>=prev-1e-12,JSON.stringify({id,strength,y}));prev=v;}
 const rows=NSProfileCatalog.profiles[id].hue;for(const h of [0,...rows.map(v=>v[0]),360])for(const column of [1,2,3])assert.ok(Math.abs(P.hueValue(rows,h-1e-5,column)-P.hueValue(rows,h+1e-5,column))<1e-3);
 for(let n=0;n<=3600;n++){const lin=E.rgb([.6,.08*Math.cos(n*Math.PI/1800),.08*Math.sin(n*Math.PI/1800)]),input=lin.map(E.encode),a=k.pixel(input);assert.ok(a.every(Number.isFinite));}
}
// Distinctness and safety at the 100% default on a fixed sRGB cloud (synthetic, not photo acceptance).
let seed=7;const rand=()=>(seed=seed*16807%2147483647)/2147483647,cloud=Array.from({length:2000},()=>[rand(),rand(),rand()]),plain=cloud.map(lab);
const rendered=Object.fromEntries(ids.map(id=>[id,cloud.map(p=>lab(P.compile({id,strength:1}).pixel(p)))])),distance=(a,b)=>a.reduce((s,q,i)=>s+Math.hypot(q[0]-b[i][0],q[1]-b[i][1],q[2]-b[i][2]),0)/a.length;
const report={};for(const id of ids){
 let maxHue=0,maxChroma=0;for(const sample of colors.filter(p=>p.id.startsWith('skin_'))){const a=lab(sample.sRGB),b=lab(P.compile({id,strength:1}).pixel(sample.sRGB));maxHue=Math.max(maxHue,Math.abs(hue(b)-hue(a)));maxChroma=Math.max(maxChroma,Math.abs(chroma(b)-chroma(a)));}
 const cast=Math.max(...[.1,.3,.5,.7,.9].map(v=>chroma(lab(P.compile({id,strength:1}).pixel([v,v,v]))))),fromNeutral=distance(rendered[id],plain);
 assert.ok(fromNeutral>=.035,JSON.stringify({id,fromNeutral}));assert.ok(maxHue<=12&&maxChroma<=.045,JSON.stringify({id,maxHue,maxChroma}));assert.ok(cast<=.03,JSON.stringify({id,cast}));
 report[id]={fromNeutral:+fromNeutral.toFixed(4),skinHue:+maxHue.toFixed(1),skinChroma:+maxChroma.toFixed(3),grayCast:+cast.toFixed(3)};
}
let closest=1;for(const a of ids)for(const b of ids)if(a<b)closest=Math.min(closest,distance(rendered[a],rendered[b]));assert.ok(closest>=.03,JSON.stringify({closest}));
console.log('Profiles at 100% (mean OKLab distance, synthetic skin/gray limits)',JSON.stringify({closest:+closest.toFixed(4),report}));
// Matte endpoints use the existing PCHIP coefficients, identically on CPU/GPU.
assert.ok(P.compile({id:'creative.pale-static',strength:1}).pixel([0,0,0])[0]>0);
assert.ok(P.compile({id:'creative.pale-static',strength:1}).pixel([1,1,1])[0]<1);
const color=[.2,.4,.8];assert.equal(P.compile({id:'neutral',strength:1}).pixel(color),color);
const mono=P.compile({id:'film.kodak-gold-200',strength:0},true).pixel(color),Y=E.W.reduce((s,v,k)=>s+v*E.decode(color[k]),0);assert.deepEqual(mono,[E.encode(Y),E.encode(Y),E.encode(Y)]);assert.notEqual(mono[0],E.W.reduce((s,v,k)=>s+v*color[k],0));
for(const strength of [-1,2,NaN,Infinity])assert.throws(()=>P.compile({id:'neutral',strength}));for(const id of ['gold','__proto__','constructor','toString',null])assert.throws(()=>P.compile({id,strength:.7}));
for(const mutate of [p=>p.tone[3]=-.1,p=>p.hue[2][0]=1,p=>p.hue[2][0]=100,p=>p.chroma[2]=NaN,p=>p.skinPass=2,p=>p.tone[0]=-.001,p=>p.tone[8]=1.001,p=>p.tone[3]=p.tone[4]+.001]){const d=structuredClone(NSProfileCatalog.profiles['film.kodak-gold-200']);mutate(d);assert.throws(()=>P.validateDefinition(d));}
// A neutral-density negative under an uneven capture/base keeps its technical
// RGB information until positive luminance. This is synthetic, not a real B&W scan.
for(const file of ['conversion-v2/core','conversion-v2/render','conversion-v2/fast','conversion-v2/platform','color/parameters','color/render-core'])await import('../src/'+file+'.js');
const base=[.8,.43,.21],image={width:31,height:19,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:Float32Array.from({length:31*19*3},(_,i)=>base[i%3]*10**(-(.1+2*Math.floor(i/3)/(31*19))))},recipe=NSV2Platform.prepare(image,{sourceKey:'uneven-base-monochrome',capture:{session:'test',recipe:{decoder:'fixture'}},measurement:{measured:base,kind:'manual-region'},area:{region:{x:0,y:0,w:1,h:1},status:'confirmed'}}),config={kind:'v2',v2:recipe,opts:{...E.neutral,editVersion:2},look:{id:'neutral',strength:0},monochrome:false},colorKernel=NSPixelKernel.compile(config),monoKernel=NSPixelKernel.compile({...config,monochrome:true});let last=-1;
for(let n=0;n<100;n++){const input=base.map(v=>v*10**(-(.1+n/50))),positive=colorKernel.pixel(input),gray=monoKernel.pixel(input),Y=E.W.reduce((a,w,k)=>a+w*E.decode(positive[k]),0);assert.equal(gray[0],gray[1]);assert.equal(gray[1],gray[2]);assert.ok(Math.abs(E.decode(gray[0])-Y)<1e-13);assert.ok(gray[0]>=last-1e-14);last=gray[0];}
console.log('PASS profile operator 2',JSON.stringify({cases}),'17³ gamut, exact Neutral/zero, strength mix, monotone gray luminance, hue continuity, mono from positive linear luminance, strict catalogue validation');
