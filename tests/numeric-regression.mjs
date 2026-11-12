/* Exact reviewed Float64 color and Uint16 export values; no git/reference build. */
import assert from 'node:assert/strict';import crypto from 'node:crypto';import {harness} from './helpers/app-harness.mjs';import {numericReference,numericImages} from './helpers/numeric-fixtures.mjs';
const reference=numericReference(),images=numericImages(),h=harness();h.context.crypto=globalThis.crypto;
const digest=v=>crypto.createHash('sha256').update(Buffer.from(v.buffer,v.byteOffset,v.byteLength)).digest('hex');
const profiles=['neutral','film.kodak-gold-200','film.kodak-ektar-100','film.fuji-pro-400h','film.kodak-portra-400','creative.backstreet','creative.afterglow','creative.pale-static','creative.redline','mono.neutral'];
let index=0,checked=0;const fast=process.env.FILMLABB_TEST_LEVEL==='fast';
for(const s of reference.setups){const im=images[s.name],K=h.context.NSPixelKernel,selected=!fast||(s.name==='rec2020'&&(s.config.kind==='v2'||s.config.opts.colorMode4==='legacy'&&s.config.opts.toneMode4==='smooth'));
 if(!selected){index+=83;continue;}
 for(const profile of profiles)for(const strength of [0,.35,.7,1])for(const edit of [false,true]){
  const c=structuredClone(s.config);c.look={id:profile==='mono.neutral'?'neutral':profile,strength};c.monochrome=profile==='mono.neutral';if(edit)Object.assign(c.opts,{exposure:.35,contrast:1.18,gamma:.9,shadows:21,highlights:-17,temperature:8,tint:-5,saturation:1.2,vibrance:30});
  const k=K.compile(c),out=new Float64Array(39*3);for(let i=0;i<39;i++){const n=Math.floor(i*(im.width*im.height-1)/38)*3,p=Array.from(im.data.subarray(n,n+3));out.set(k.pixel(p),i*3);}
  assert.equal(digest(out),reference.hashes[index++],JSON.stringify([s.name,c.kind,profile,strength,edit]));checked++;
 }
 // Every retained engine's exact exported uint16 pixels, including bilinear
 // fine rotation and composition, via the existing production sampler.
 for(const rotation of [0,90,2]){const model=h.context.NSGeometry.create(rotation===90?90:0);model.rotation.fineDegrees=rotation===2?2:0;const g=h.context.NSPresentation.plan(im,model,true,{x:.1,y:.1,w:.8,h:.8}),pixels=h.context.NSPresentation.tiff(im,s.config,g,0,g.height,K.prepare(im,s.config));assert.equal(digest(pixels),reference.hashes[index++],JSON.stringify([s.name,s.config.kind,'RGB16',rotation]));checked++;}
}
assert.equal(index,reference.hashes.length);console.log('PASS',checked,'exact reviewed Float64/RGB16 production cases');
