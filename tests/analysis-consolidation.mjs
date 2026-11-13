/* Fresh active-engine analysis compared with configs captured from main #97.
   The separate 2,241-case oracle freezes the rendering/export contract. */
import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
import {numericReference,numericImages} from './helpers/numeric-fixtures.mjs';
const setups=numericReference().setups,images=numericImages(),h=harness();h.context.crypto=globalThis.crypto;
for(const s of setups){const im=images[s.name];h.set('im',im);h.set('frozen',s.config);h.run(`render=()=>{};scheduleRender=()=>{};working=im;workingPreview=im;src=null;sourceInfo={encoding:'linear',colorSpace:im.colorSpace,label:'oracle',domain:'oracle'};state={...defaultState(),engine:frozen.kind,colorMode4:frozen.opts.colorMode4,toneMode4:frozen.opts.toneMode4,frame:NSFrameSelection.rectangular({x:.1,y:.1,w:.8,h:.8},{status:'confirmed'})};roll=[{file:{name:'oracle.dng'},settings:{...state},geometry:NSGeometry.create()}];activeFrame=0;analyzeLevels();`);
 const current=h.run('configuration38()');if(s.config.kind==='calibrated4')assert.deepEqual(JSON.parse(JSON.stringify(current.cal.beta4)),s.config.cal.beta4);
 const a=h.context.NSPixelKernel.compile(current),b=h.context.NSPixelKernel.compile(s.config);
 for(let i=0;i<39;i++){const n=Math.floor(i*(im.width*im.height-1)/38)*3,p=Array.from(im.data.subarray(n,n+3));assert.deepEqual(Array.from(a.pixel(p)),Array.from(b.pixel(p)),JSON.stringify([s.name,s.config.kind,i]));}
 const count=h.run('v2AnalysisCount');h.run('analyzeLevels();');if(s.config.kind==='v2')assert.equal(h.run('v2AnalysisCount'),count);
}
console.log('PASS 27 fresh Standard/V2 analyses and 1,053 exact float samples vs main; repeated V2 recipe reused');
