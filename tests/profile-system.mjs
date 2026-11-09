import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import '../src/editing/editing-engine.js';import '../src/editing/profile-catalog.js';import '../src/editing/profile-engine.js';
execFileSync(process.execPath,['tools/generate-profile-catalog.mjs','--check']);
const P=NSProfiles,E=NSEditing2,library=JSON.parse(fs.readFileSync('docs/profile-system/work/FILMLABB_3_Profile_Library.json')),colors=library.tests.synthetic_patch_input;let maxError=0,cases=0;
for(const id of Object.keys(NSProfileCatalog.profiles))for(const strength of [0,.35,.7,1]){
 const k=P.compile({id,strength});
 for(const sample of colors){const q=k.pixel(sample.sRGB),expected=library.tests.synthetic_result[id][String(strength)][sample.id].sRGB;maxError=Math.max(maxError,...q.map((v,c)=>Math.abs(v-expected[c])));if(strength===0)assert.equal(q,sample.sRGB);cases++;}
 for(let r=0;r<=16;r++)for(let g=0;g<=16;g++)for(let b=0;b<=16;b++)assert.ok(k.pixel([r/16,g/16,b/16]).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 let prev=-1;for(let i=0;i<=10000;i++){const y=i/10000,q=k.pixel([y,y,y]);assert.equal(q[0],q[1]);assert.equal(q[1],q[2]);assert.ok(q[0]>=prev-1e-15);prev=q[0];}
 const rows=NSProfileCatalog.profiles[id].hue;for(const h of [0,...rows.map(v=>v[0]),360])for(const column of [1,2,3])assert.ok(Math.abs(P.hueValue(rows,h-1e-5,column)-P.hueValue(rows,h+1e-5,column))<1e-5);
 for(let n=0;n<=3600;n++){const lin=E.rgb([.6,.08*Math.cos(n*Math.PI/1800),.08*Math.sin(n*Math.PI/1800)]),input=lin.map(E.encode),a=k.pixel(input);assert.ok(a.every(Number.isFinite));}
}
assert.ok(maxError<1e-7,JSON.stringify({maxError}));
const color=[.2,.4,.8];assert.equal(P.compile({id:'neutral',strength:1}).pixel(color),color);
const mono=P.compile({id:'film.kodak-gold-200',strength:0},true).pixel(color),Y=E.W.reduce((s,v,k)=>s+v*E.decode(color[k]),0);assert.deepEqual(mono,[E.encode(Y),E.encode(Y),E.encode(Y)]);assert.notEqual(mono[0],E.W.reduce((s,v,k)=>s+v*color[k],0));
for(const strength of [-1,2,NaN,Infinity])assert.throws(()=>P.compile({id:'neutral',strength}));for(const id of ['gold','__proto__','constructor','toString',null])assert.throws(()=>P.compile({id,strength:.7}));
for(const mutate of [p=>p.tone[3]=-.1,p=>p.hue[2][0]=1,p=>p.chroma[2]=NaN,p=>p.skinPass=2]){const d=structuredClone(NSProfileCatalog.profiles['film.kodak-gold-200']);mutate(d);assert.throws(()=>P.validateDefinition(d));}
for(const doc of [{format:'old'},{format:P.FORMAT},{format:P.FORMAT,look:{id:'gold',strength:.7},monochrome:false}])assert.throws(()=>P.validateProject(doc));
// A neutral-density negative under an uneven capture/base keeps its technical
// RGB information until positive luminance. This is synthetic, not a real B&W scan.
for(const file of ['conversion-v2/core','conversion-v2/render','conversion-v2/fast','conversion-v2/platform','color/parameters','color/render-core'])await import('../src/'+file+'.js');
const base=[.8,.43,.21],image={width:31,height:19,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:Float32Array.from({length:31*19*3},(_,i)=>base[i%3]*10**(-(.1+2*Math.floor(i/3)/(31*19))))},recipe=NSV2Platform.prepare(image,{sourceKey:'uneven-base-monochrome',capture:{session:'test',recipe:{decoder:'fixture'}},measurement:{measured:base,kind:'manual-region'},area:{region:{x:0,y:0,w:1,h:1},status:'confirmed'}}),config={kind:'v2',v2:recipe,opts:{...E.neutral,editVersion:2},look:{id:'neutral',strength:0},monochrome:false},colorKernel=NSPixelKernel.compile(config),monoKernel=NSPixelKernel.compile({...config,monochrome:true});let last=-1;
for(let n=0;n<100;n++){const input=base.map(v=>v*10**(-(.1+n/50))),positive=colorKernel.pixel(input),gray=monoKernel.pixel(input),Y=E.W.reduce((a,w,k)=>a+w*E.decode(positive[k]),0);assert.equal(gray[0],gray[1]);assert.equal(gray[1],gray[2]);assert.ok(Math.abs(E.decode(gray[0])-Y)<1e-13);assert.ok(gray[0]>=last-1e-14);last=gray[0];}
console.log('PASS Work independent numeric oracle',JSON.stringify({cases,maxError}),'17³ gamut, exact Neutral/zero, monotone gray, hue continuity, mono from positive linear luminance, strict catalogue/project validation');
