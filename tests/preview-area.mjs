import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';import {harness} from './helpers/app-harness.mjs';
const h=harness(),C=h.context.NSColorEngine;
function image(w,h,fn){const data=new Float32Array(w*h*3);for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let k=0;k<3;k++)data[(y*w+x)*3+k]=fn(x,y,k);return {width:w,height:h,data,channels:3,scale:1,encoding:'linear'};}
const checker=image(256,192,(x,y)=>((x+y)%2)),area=C.preview(checker,64,'area-v1'),old=C.preview(checker,64),error=im=>Array.from(im.data).reduce((s,v)=>s+Math.abs(v-.5),0)/im.data.length;
assert.ok(error(area)<1e-6);assert.ok(error(old)>.49);assert.deepEqual(C.preview(checker,64,'nearest'),old);
for(const [w,h,limit] of [[37,29,11],[256,192,91],[1,101,13]]){const im=image(w,h,()=>.23),p=C.preview(im,limit,'area-v1');assert.ok(Array.from(p.data).every(v=>Math.abs(v-.23)<1e-6));}
const im=image(31,23,(x,y,k)=>(x+2*y+k)/100),p=C.preview(im,9,'area-v1'),mean=a=>a.reduce((s,v)=>s+v,0)/a.length;assert.ok(Math.abs(mean(im.data)-mean(p.data))<1e-6);
assert.deepEqual(C.preview(im,100,'area-v1'),C.preview(im,100));
const big=image(3000,2000,(x,y,k)=>(x+y+k)%256/255),start=performance.now();C.preview(big,1400,'area-v1');console.log(JSON.stringify({syntheticPixels:6000000,areaImportMs:performance.now()-start,checkerMeanError:{nearest:error(old),area:error(area)}}));
assert.equal(h.context.NSProjectSettings.imageDefaults().previewSampling,'area-v1');
console.log('PASS exact area filter checkerboard suppression, noninteger/one-pixel dimensions, DC/mean preservation and unchanged legacy/default API');
// Exercise actual project save/import migration, including absent legacy version.
h.set('hires',im);h.run("render=()=>{};scheduleRender=()=>{};working=workingSource();workingPreview=CE.preview(working);src=new ImageData(working.width,working.height);previewSrc=src;cropRegion={x:0,y:0,w:1,h:1};sourceInfo={encoding:'linear',colorSpace:'srgb'};state={...defaultState(),cropConfirmed:true};roll=[{file:{name:'synthetic.tif'},settings:{...state},geometry:NSGeometry.create(),crop:{...cropRegion}}];activeFrame=0;analyzeLevels();downloadBlob=b=>globalThis.savedProject=b;$('saveSettings').onclick();");
const project=JSON.parse(await h.context.savedProject.text());assert.equal(project.frames[0].settings.previewSampling,'area-v1');h.run("readFile=async()=>finishImport('fixture');");
await h.elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify(project)}],value:'x'}});assert.equal(h.run('state.previewSampling'),'area-v1');
delete project.frames[0].settings.previewSampling;await h.elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify(project)}],value:'x'}});assert.equal(h.run('state.previewSampling'),'nearest');
console.log('PASS new preview version persists and older project import explicitly preserves nearest rendering');
