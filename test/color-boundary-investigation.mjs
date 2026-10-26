/* Reproduces mechanisms, not the still-unavailable reported RAF defect. */
import assert from 'node:assert/strict';import {harness} from '../tests/check-app-harness.mjs';
const h=harness();h.run(`render=()=>{};scheduleRender=()=>{};working={width:48,height:32,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:48*32*3},(_,i)=>4000+(i*137)%45000)};workingPreview=CE.preview(working);sourceInfo={encoding:'linear'};state={...defaultState(),cropConfirmed:true};cropRegion={x:0,y:0,w:1,h:1};src=new ImageData(48,32);previewSrc=src;analyzeLevels();`);
const R=h.context.NSRawInput,K=h.context.NSPixelKernel,P=h.context.NSPresentation,G=h.context.NSGeometry,c=h.run('configuration38()');
const data=new Uint16Array([12000,5000,600,12000,5000,644,12000,5000,645,12000,5000,700]),original=Uint16Array.from(data),im=R.convert({width:4,height:1,bits:16,colors:3,data},'protected');
const expected=[];let negative=0;
for(let i=0;i<original.length;i+=3)for(let k=0;k<3;k++){const value=R.matrix[k].reduce((sum,v,j)=>sum+v*original[i+j],0)*.5;expected.push(Math.round(Math.max(0,Math.min(65535,value))));if(k===2&&value<0)negative++;}
assert.deepEqual(Array.from(im.data),expected);assert.equal(im.inputDiagnostics4.negative[2],negative);assert.ok(negative>0);assert.ok(im.data[2]===0&&im.data[11]>0);
console.log('OBSERVATION protected RAW clips negative matrix channels before density (independent synthetic original-RGB reference; no buffer-order defect)');
const kernel=K.compile(c);for(const v of [0,1e-10,1/65535/2])assert.equal(kernel.technical(v,2),kernel.technical(1/65535,2));
assert.ok(Math.abs(kernel.technical(1/65535,2)-kernel.technical(2/65535,2))>Math.abs(kernel.technical(.1,2)-kernel.technical(.1+1/65535,2)));
console.log('OBSERVATION logarithmic floor and low-transmission amplification are measurable; this alone does not identify the RAF dots');
const source={width:2,height:2,channels:3,scale:1,encoding:'linear',data:new Float32Array([.1,.03,0,.1,.03,1/65535,.1,.03,2/65535,.1,.03,.002])};
const prepared=K.prepare(source,c),colors=Array.from({length:4},(_,i)=>prepared.pixel(i*3)),decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
for(const q of [0,90,180,270])for(const fine of [-15,-.1,.1,15]){const model=G.create(q);model.rotation.fineDegrees=fine;const g=P.plan(source,model,false,null);for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){
 const p=P.pixel(source,prepared,g,g,x,y);assert.ok(p.every(Number.isFinite));for(let k=0;k<3;k++){const values=colors.map(p=>decode(p[k]));assert.ok(decode(p[k])>=Math.min(...values)-1e-12&&decode(p[k])<=Math.max(...values)+1e-12);}
}}
console.log('PASS new presentation interpolation remains finite and within per-channel linear-display neighbor bounds; no interpolation overshoot');
