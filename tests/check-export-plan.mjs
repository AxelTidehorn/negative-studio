import {readSource} from './helpers/source.mjs';
import assert from 'node:assert/strict';import vm from 'node:vm';import {harness} from './helpers/app-harness.mjs';
const h=harness();vm.runInContext(readSource('export-plan.js','utf8'),h.context);h.run('render=()=>{};scheduleRender=()=>{};');
let checked=0;
for(const encoding of ['linear','srgb'])for(const scale of [1,255,65535])for(const flat of [false,true])for(const rotation of [0,90,180,270]){
 h.run(`working={width:67,height:49,channels:4,scale:${scale},encoding:'${encoding}',data:${scale===1?'Float32Array':scale===255?'Uint8ClampedArray':'Uint16Array'}.from({length:67*49*4},(_,i)=>${scale===1?'((i*173+273)%65536)/65535':`(i*173+273)%${scale+1}`})};`);
 if(flat)h.run(`working.flatField={size:17,gains:Array.from({length:17*17*3},(_,i)=>.65+(i%23)/32)};`);
 h.run(`state={...defaultState(),rotation:${rotation},cropExport:true,cropConfirmed:true};cropRegion={x:.13,y:.11,w:.72,h:.73};workingPreview=CE.preview(working);sourceInfo={encoding:working.encoding};analyzeLevels();globalThis.c=configuration38();globalThis.g=CE.exportGeometry(working,cropRegion,true,${rotation});globalThis.target=NSExportPlan.size(g,2000);globalThis.remote={...NSExportPlan.metadata(working),data:new Uint8Array(0)};globalThis.prepared=NSPixelKernel.prepare(remote,c);globalThis.direct=NSPixelKernel.prepare(working,c);`);
 const target=h.run('target');for(let y=0;y<target.height;y+=7){const rows=Math.min(7,target.height-y);h.run(`remote.data=NSExportPlan.pack(working,g,target,${y},${rows});`);for(let dy=0;dy<rows;dy++)for(let x=0;x<target.width;x++){const d=h.run(`(()=>{const [sx,sy]=NSExportPlan.at(g,target,${x},${y+dy}),a=prepared.pixel((${dy}*target.width+${x})*3,sx,sy),b=direct.pixel((sy*working.width+sx)*working.channels);return Math.max(...a.map((v,k)=>Math.abs(v-b[k])));})()`);assert.ok(d<1e-12,`${encoding}/${scale}/${flat}/${rotation}: ${d}`);}}
 checked++;
}
assert.ok(h.run('NSExportPlan.rows(16384,100)*16384*3*4')<=786432);assert.equal(h.run("NSExportPlan.budgets('safe',8)[0]"),12000000);assert.equal(h.run("NSExportPlan.budgets('original',2)[0]"),24000000);
console.log('PASS',checked,'striped worker/direct export combinations: RGB(A), integer/float, sRGB/linear, flat-field, crop, rotation; bounded transfer memory');
