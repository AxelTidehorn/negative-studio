import {readSource} from './helpers/source.mjs';
import vm from 'node:vm';import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
function setup(frames=3,worker=true){const h=harness();
 let tick=0,clock=0;const timers=new Map();h.context.setTimeout=(fn,ms=0)=>{const id=++tick;timers.set(id,{fn,at:clock+ms});return id;};h.context.clearTimeout=id=>timers.delete(id);
 const workers=[];if(worker)h.context.Worker=class{constructor(){this.messages=[];this.dead=false;workers.push(this);}postMessage(m){this.messages.push(m);}terminate(){this.dead=true;}};
 // Load candidate scheduler in old and new harnesses consistently.
 if(h.run('typeof previewPerf')==='undefined')vm.runInContext(readSource('slider-response.js','utf8'),h.context);
 h.run(`working={width:80,height:60,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:80*60*3},(_,i)=>3000+i%45000)};workingPreview=CE.preview(working);src=new ImageData(80,60);previewSrc=src;sourceInfo={encoding:'linear'};state={...defaultState(),cropConfirmed:true};roll=Array.from({length:${frames}},(_,i)=>({file:{name:'f'+i+'.RAF'},settings:defaultState()}));activeFrame=0;analyzeLevels();`);
 function advance(ms){clock+=ms;for(let n=0;n<100;n++){const due=[...timers].filter(([,t])=>t.at<=clock);if(!due.length)return;for(const [id,t] of due){if(timers.delete(id))t.fn();}}throw Error('timer loop');}
 const jobs=w=>w.messages.filter(m=>m.id);
 function reply(w,job,value=10){w.onmessage({data:{id:job.id,width:1,height:1,data:new Uint8ClampedArray([value,value,value,255]),bins:new Uint32Array(256),renderMs:100}});}
 return {...h,advance,workers,jobs,reply};}
const h=setup();h.run('render();');let w=h.workers.at(-1);assert.equal(h.jobs(w).length,1,'direct detail call clears analysis timers');assert.equal(h.jobs(w)[0].limit,1400);
h.run('state.exposure=.1;scheduleRender();');assert.equal(w.dead,true,'new gesture interrupts expensive detail work');h.advance(16);w=h.workers.at(-1);const first=h.jobs(w)[0];assert.equal(first.limit,240);
for(const ev of [.2,.3,.4,.5]){h.run(`state.exposure=${ev};scheduleRender();`);h.advance(16);}
assert.equal(h.jobs(w).length,1,'one small preview in flight');assert.equal(h.run('queued38.config.opts.exposure'),.5,'only latest pending value retained');
h.reply(w,first,20);assert.equal(h.run('lastPreview38.data[0]'),20,'intermediate feedback remains visible during continuous dragging');const last=h.jobs(w).at(-1);assert.equal(last.config.opts.exposure,.5);h.reply(w,last,30);assert.equal(h.run('lastPreview38.data[0]'),30);
h.advance(650);const detail=h.jobs(w).at(-1);assert.equal(detail.limit,1400);assert.equal(detail.config.opts.exposure,.5);h.reply(w,detail,40);assert.equal(h.run('lastPreview38.data[0]'),40);
assert.equal(h.run('analysisCount38'),1,'slider sequence does not redo color analysis');assert.equal(w.messages.filter(m=>m.type==='source').length,1,'source copied once per worker, not per slider event');
console.log('PASS responsive preview: interrupted detail, bounded pending work, intermediate feedback, latest final state, no repeated analysis/source copies');
// A resumed gesture removes queued detail before the active small preview finishes.
h.run('state.exposure=.6;scheduleRender();');h.advance(16);const small=h.jobs(w).at(-1);h.run('scheduleRender(true);state.exposure=.7;scheduleRender();');h.reply(w,small);assert.equal(h.jobs(w).at(-1).id,small.id,'discarded detail is not launched between gestures');h.advance(16);assert.equal(h.jobs(w).at(-1).limit,240);
// Results from a terminated worker or a prior image cannot paint the current image.
const old=h.jobs(w).at(-1);h.run('sourceVersion38++;workingPreview={...workingPreview,data:workingPreview.data.slice()};');h.reply(w,old,90);assert.notEqual(h.run('lastPreview38.data[0]'),90);
h.run('render();');h.run('state.exposure=.8;scheduleRender();');const dead=w;h.advance(16);dead.onmessage({data:{id:old.id,width:1,height:1,data:new Uint8ClampedArray([99,99,99,255]),bins:new Uint32Array(256)}});assert.notEqual(h.run('lastPreview38.data[0]'),99);
console.log('PASS resumed gesture drops pending detail and old-image/terminated-worker results cannot overwrite the current preview');
function sequence(count){const x=setup(count);x.run('render();state.contrast=1.2;scheduleRender();');x.advance(16);const z=x.workers.at(-1),a=x.jobs(z)[0];x.run('state.contrast=1.3;scheduleRender();');x.advance(16);x.reply(z,a);x.reply(z,x.jobs(z).at(-1));x.advance(650);return {jobs:z.messages.filter(m=>m.id).map(m=>({limit:m.limit,contrast:m.config.opts.contrast})),analyses:x.run('analysisCount38'),sources:z.messages.filter(m=>m.type==='source').length};}
assert.deepEqual(sequence(1),sequence(3),'queue size cannot multiply preview work');console.log('PASS identical active-image workload with one versus three queued files');
const fallback=setup(3,false);let limit;fallback.context.NSPixelKernel.render=(im,c,mode,l)=>{limit=l;return {width:1,height:1,data:new Uint8ClampedArray([1,1,1,255]),bins:new Uint32Array(256)};};fallback.run('render();');assert.equal(limit,480);fallback.run('scheduleRender();');fallback.advance(16);assert.equal(limit,240);assert.equal(fallback.run('FILMLABB_PERFORMANCE.snapshot().worker'),false);console.log('PASS bounded no-worker preview fallback; source and export untouched');
// Actual import/selection path: thumbnail handling must not decode the other RAWs.
const q=setup();q.context.files=[{name:'one.ARW'},{name:'two.ARW'},{name:'three.ARW'}];q.run(`globalThis.decodedNames=[];readFile=async file=>{decodedNames.push(file.name);hires={width:80,height:60,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:80*60*3},(_,i)=>4000+i%20000)};src=new ImageData(80,60);previewSrc=src;sourceInfo={encoding:'linear'};finishImport(file.name);};`);
await q.run('importRoll(files)');assert.deepEqual(Array.from(q.context.decodedNames),['one.ARW']);assert.equal(q.run('roll.length'),3);assert.equal(q.run('roll.every(f=>!f.preview)'),true);await q.run('chooseFrame(1)');assert.deepEqual(Array.from(q.context.decodedNames),['one.ARW','two.ARW']);console.log('PASS actual three-file import decodes only selected image; queue keeps no decoded image buffers');

// A short keyboard/touch adjustment must show the quick result, even if the
// input/change pair arrives before the first scheduled preview has started.
const short=setup(1);short.run('render();');const initial=short.workers.at(-1);
short.run('state.exposure=.25;scheduleRender();scheduleRender(true);');
const sw=short.workers.at(-1),shortSmall=short.jobs(sw)[0];
assert.equal(initial.dead,true,'new gesture interrupts the previous detail');
assert.equal(shortSmall.limit,240);assert.equal(short.run('queued38.limit'),1400);
short.reply(sw,shortSmall,51);assert.equal(short.run('lastPreview38.data[0]'),51,'small preview appears before detail after release');
short.reply(sw,short.jobs(sw).at(-1),77);assert.equal(short.run('lastPreview38.data[0]'),77);
const oldSetting=setup(1);oldSetting.run('render();state.exposure=.25;scheduleRender();');oldSetting.advance(16);
const ow=oldSetting.workers.at(-1),oldSmall=oldSetting.jobs(ow)[0];oldSetting.run('state.exposure=.5;scheduleRender(true);');
oldSetting.reply(ow,oldSmall,91);assert.notEqual(oldSetting.run('lastPreview38?.data?.[0]'),91,'outdated slider state cannot flash after release');
console.log('PASS short input/change gesture shows matching small image before detail, rejects old slider states');

const cache=setup(1,false);let rendered=0;const original=cache.context.NSPixelKernel.render;
cache.context.NSPixelKernel.render=(...args)=>{rendered++;return original(...args);};
cache.run('render();');const pixels=Array.from(cache.run('lastPreview38.data'));
cache.run('render();render();');assert.equal(rendered,1);assert.deepEqual(Array.from(cache.run('lastPreview38.data')),pixels);
cache.run('state.exposure=.3;render();');assert.equal(rendered,2);
cache.run('display="negative";render();');assert.equal(rendered,3);
cache.run('sourceVersion38++;render();');assert.equal(rendered,4);
console.log('PASS completed CPU preview reuses identical pixels; color, display and source changes invalidate cache');
