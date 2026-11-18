/* Manual, reviewed recapture of numeric-regression PROFILE cases only, for an
   intentional profile change: node tools/update-profile-hashes.mjs
   Writes tests/fixtures/numeric/node<major>.json for the running Node 22/24.
   Refuses if any engine, Neutral, monochrome, zero-strength or RGB16 export hash changes. */
import fs from 'node:fs';import crypto from 'node:crypto';import {harness} from '../tests/helpers/app-harness.mjs';import {numericReference,numericImages} from '../tests/helpers/numeric-fixtures.mjs';
const reference=numericReference(),images=numericImages(),h=harness();h.context.crypto=globalThis.crypto;
const digest=v=>crypto.createHash('sha256').update(Buffer.from(v.buffer,v.byteOffset,v.byteLength)).digest('hex');
const profiles=['neutral','film.kodak-gold-200','film.kodak-ektar-100','film.fuji-pro-400h','film.kodak-portra-400','creative.backstreet','creative.afterglow','creative.pale-static','creative.redline','mono.neutral'];
let index=0,changed=0;const K=h.context.NSPixelKernel,hashes=[...reference.hashes];
function check(value,mayChange,label){if(value!==hashes[index]){if(!mayChange)throw Error('Non-profile hash changed: '+label);hashes[index]=value;changed++;}index++;}
// Same case order as tests/numeric-regression.mjs.
for(const s of reference.setups){const im=images[s.name];
 for(const profile of profiles)for(const strength of [0,.35,.7,1])for(const edit of [false,true]){
  const c=structuredClone(s.config);c.look={id:profile==='mono.neutral'?'neutral':profile,strength};c.monochrome=profile==='mono.neutral';if(edit)Object.assign(c.opts,{exposure:.35,contrast:1.18,gamma:.9,shadows:21,highlights:-17,temperature:8,tint:-5,saturation:1.2,vibrance:30});
  const k=K.compile(c),out=new Float64Array(39*3);for(let i=0;i<39;i++){const n=Math.floor(i*(im.width*im.height-1)/38)*3;out.set(k.pixel(Array.from(im.data.subarray(n,n+3))),i*3);}
  check(digest(out),!['neutral','mono.neutral'].includes(profile)&&strength>0,JSON.stringify([s.name,profile,strength,edit]));
 }
 for(const rotation of [0,90,2]){const model=h.context.NSGeometry.create(rotation===90?90:0);model.rotation.fineDegrees=rotation===2?2:0;const g=h.context.NSPresentation.plan(im,model,true,{x:.1,y:.1,w:.8,h:.8});check(digest(h.context.NSPresentation.tiff(im,s.config,g,0,g.height,K.prepare(im,s.config))),false,JSON.stringify([s.name,'RGB16',rotation]));}
}
if(index!==hashes.length)throw Error('Case count differs from fixture');
const file=new URL('../tests/fixtures/numeric/node'+process.versions.node.split('.')[0]+'.json',import.meta.url);
fs.writeFileSync(file,JSON.stringify({...reference,hashes})+'\n');console.log('Updated',changed,'profile hashes in',file.pathname);
