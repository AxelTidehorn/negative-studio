/* Frozen pre-encoder RGB8 and RGB16 references from pre-optimization main.
   No JPEG compression tolerance can hide a changed conversion/sampling pixel. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash,webcrypto} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {harness} from './helpers/app-harness.mjs';
const record=process.argv.indexOf('--record-ref'),ref=record<0?null:process.argv[record+1],h=harness();
h.context.crypto=webcrypto;
if(ref)vm.runInContext(execFileSync('git',['show',ref+':src/color/render-core.js'],{encoding:'utf8'}),h.context);
h.run(`render=()=>{};scheduleRender=()=>{};
 working={width:67,height:49,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:Float32Array.from({length:67*49*3},(_,i)=>.002+((i*173+273)%65000)/65535)};
 workingPreview=CE.preview(working);sourceInfo={encoding:'linear',colorSpace:'rec2020',domain:'synthetic-export'};src=new ImageData(67,49);previewSrc=src;
 state={...defaultState(),cropConfirmed:true};cropRegion={x:.1,y:.08,w:.8,h:.84};analyzeLevels();`);
const P=h.context.NSPresentation,K=h.context.NSPixelKernel,G=h.context.NSGeometry,E=h.context.NSExportPlan,hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex'),results={};
for(const mode of ['log39','calibrated4','v2-neutral','v2-photo1','v2-photo2'])for(const style of ['neutral','edited','bw']){
 h.run(`working.colorSpace=sourceInfo.colorSpace='${mode==='log39'?'srgb':'rec2020'}';state.engine='${mode.startsWith('v2')?'v2':mode}';
 state={...state,...NSEditing2.neutral,editVersion:2,...${style==='neutral'?'{}':"{exposure:.4,contrast:1.16,gamma:.93,shadow:.023,highlight:.97,shadows:14,highlights:-23,temperature:7,tint:-3,saturation:1.12}"}};
 rollShared.profile='${style==='neutral'?'generic':style==='bw'?'hp5':'portra'}';rollShared.profileVersion=2;rollShared.strength=.7;rollShared.print='${style==='neutral'?'neutral':'classic'}';analyzeLevels();`);
 // These frozen references represent saved historical output, not fresh defaults.
 if(mode.startsWith('v2'))h.run(`state.v2Recipe={...state.v2Recipe,intent:{...state.v2Recipe.intent,output:'luminance-gamut-2'},analysisSignature:''};FILMLABB_V2.setRendering('${mode==='v2-neutral'?'neutral':'photographic'}',{version:${mode==='v2-photo2'?2:1}});`);
 const im=h.run('working'),config=h.run('configuration38()');
 for(let geometry=0;geometry<4;geometry++)for(const scale of [1,.61]){
  const model=G.create(geometry*90);if(geometry===3){model.rotation.fineDegrees=3.25;model.compositionCrop={cx:0,cy:0,w:.53,h:.41};}
  const g=P.plan(im,model,geometry>0,{x:.1,y:.08,w:.8,h:.84}),target={width:Math.max(1,Math.floor(g.width*scale)),height:Math.max(1,Math.floor(g.height*scale))};
  const direct=K.prepare(im,config),pixels=P.rgba(im,direct,g,target,0,target.height),remote={...E.metadata(im),data:new Float32Array(0)},prepared=K.prepare(remote,config),packed=new Uint8ClampedArray(pixels.length);
  for(let y=0;y<target.height;y+=7){const rows=Math.min(7,target.height-y);remote.data=P.pack(im,g,target,y,rows);packed.set(P.rgba(remote,prepared,g,target,y,rows,true),y*target.width*4);}
  assert.deepEqual(packed,pixels,`${mode}/${style}/${geometry}/${scale}: packed worker input differs from direct source`);
  // Hash RGB bytes only; alpha is not supplied to the JPEG encoder as a channel.
  const rgb=new Uint8Array(target.width*target.height*3);for(let i=0,j=0;i<pixels.length;i+=4){rgb[j++]=pixels[i];rgb[j++]=pixels[i+1];rgb[j++]=pixels[i+2];assert.equal(pixels[i+3],255);}
  const tiff=P.tiff(im,config,g,0,g.height,direct);
  results[`${mode}/${style}/${geometry}/${scale}`]={width:target.width,height:target.height,rgb8:hash(rgb),rgb16:hash(tiff)};
 }
}
const file='tests/fixtures/jpeg-export-pixels.json';
if(ref){fs.writeFileSync(file,JSON.stringify({schema:'filmlabb.jpeg-pixel-reference',version:1,ref,source:'deterministic synthetic Float32 linear; no photographs',cases:results},null,2)+'\n');console.log('Recorded',Object.keys(results).length,'pre-optimization references from',ref);}
else{const expected=JSON.parse(fs.readFileSync(file));assert.deepEqual(results,expected.cases);console.log('PASS',Object.keys(results).length,'frozen RGB8-before-JPEG and RGB16 TIFF cases; worker packing/direct match; Original/Standard/V2 Neutral/Photo1/Photo2, Editing2, color/BW profiles, crop/rotation/free geometry and sizes');}
