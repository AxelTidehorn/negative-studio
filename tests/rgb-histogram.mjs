/* Histogram counts must describe the final quantized preview, not source RGB. */
import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';import {negative,region} from './helpers/transmission-fixtures.mjs';
const h=harness();h.context.crypto=globalThis.crypto;const im=negative({width:72,height:48});h.set('working',im);h.set('testRegion',region);
h.run(`render=()=>{};scheduleRender=()=>{};workingPreview=working;src=new ImageData(working.width,working.height);sourceInfo={encoding:'linear',colorSpace:'srgb',domain:'histogram-fixture'};state={...defaultState(),frame:NSFrameSelection.rectangular(typeof testRegion==='undefined'?{x:0,y:0,w:1,h:1}:testRegion,{status:NSFrameSelection.status.confirmed})};roll=[{file:{name:'histogram.tif'},settings:{...state},geometry:NSGeometry.create()}];activeFrame=0;`);
function verify(r){
 const expected=Array.from({length:4},()=>Array(256).fill(0)),step=Math.max(1,Math.floor(r.width*r.height/25000));let n=0;
 for(let p=0;p<r.width*r.height;p+=step){const i=p*4;for(let c=0;c<3;c++)expected[c][r.data[i+c]]++;expected[3][Math.round(.2126*r.data[i]+.7152*r.data[i+1]+.0722*r.data[i+2])]++;n++;}
 const hist=r.histogram;assert.equal(hist.samples,n);assert.equal(hist.luminance,r.bins,'historical luminance bins remain the same array');
 for(const [c,key]of ['red','green','blue','luminance'].entries()){assert.deepEqual(Array.from(hist[key]),expected[c]);assert.equal(Array.from(hist[key]).reduce((a,b)=>a+b,0),n);}
}
for(const engine of ['calibrated4','v2']){
 h.run(`state.engine='${engine}';working.colorSpace=sourceInfo.colorSpace='${engine==='v2'?'rec2020':'srgb'}';analyzeLevels();`);
 for(const mode of ['positive','negative','split'])verify(h.run(`NSPixelKernel.render(working,configuration38(),'${mode}',64)`));
 const before=h.run(`NSPixelKernel.render(working,configuration38(),'positive',64)`),negative=h.run(`NSPixelKernel.render(working,configuration38(),'negative',64)`);
 h.run('state.exposure=1;state.saturation=1.3;config38=null;');const edited=h.run(`NSPixelKernel.render(working,configuration38(),'positive',64)`);verify(edited);
 assert.notDeepEqual(Array.from(edited.histogram.luminance),Array.from(before.histogram.luminance),engine+' responds to Editing 2.0');
 assert.deepEqual(Array.from(h.run(`NSPixelKernel.render(working,configuration38(),'negative',64)`).data),Array.from(negative.data),'negative visualization is independent of creative adjustments');h.run('state.exposure=0;state.saturation=1;config38=null;');
}
const large=negative({width:700,height:500});h.set('working',large);h.run(`state.engine='calibrated4';workingPreview=working;analyzeLevels();`);const bounded=h.run(`NSPixelKernel.render(working,configuration38(),'positive',700)`);verify(bounded);assert.ok(bounded.histogram.samples<50000);assert.equal(bounded.histogram.red.byteLength+bounded.histogram.green.byteLength+bounded.histogram.blue.byteLength,3072);
console.log('PASS RGB/luminance counts from edited RGB8, all display modes, Original/Standard/V2, bounded samples, unchanged negative rendering and 3 KiB additional histogram buffers');
