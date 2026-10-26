import {readSource} from './helpers/source.mjs';
import assert from 'node:assert/strict';

import vm from 'node:vm';
import {harness} from './helpers/app-harness.mjs';
const h=harness(),{run,set,elements,context}=h;
const picture=elements.get('picture');
for(const el of elements.values()){
 el.style.setProperty=function(k,v){this[k]=v;};
 el.style.removeProperty=function(k){delete this[k];};
 el.querySelector=()=>null;
 el.classList.contains=()=>false;
}
const captures=new Set();picture.setPointerCapture=id=>captures.add(id);picture.hasPointerCapture=id=>captures.has(id);picture.releasePointerCapture=id=>captures.delete(id);
run(`scheduleRender=()=>{};render=()=>{drawCrop();};working={width:1000,height:800,channels:3,scale:65535,encoding:'linear',data:new Uint16Array(1000*800*3)};
// Deliberately irregular, discontinuous bright/dark outer edges. No photographic reference claimed.
for(let y=0;y<800;y++)for(let x=0;x<1000;x++){const edge=x<40+(y%37)||y<35+(x%41)||x>950-(y%29)||y>760-(x%43);working.data.set(edge?[64000,12000,50000]:[18000+(x*11+y*7)%16000,12000+(x*7+y*3)%9000,6000+(x+y)%5000],(y*1000+x)*3);}
workingPreview=CE.preview(working);src=new ImageData(1000,800);previewSrc=src;sourceInfo={encoding:'linear',label:'irregular fixture'};state={...defaultState(),cropConfirmed:true};cropRegion={x:.1,y:.15,w:.8,h:.7};
roll=[{file:{name:'a.png'},settings:{...state},crop:{...cropRegion}},{file:{name:'b.png'},settings:{...state},crop:{x:.2,y:.2,w:.5,h:.5}}];activeFrame=0;
`);
const fixture=run('working');
const json=expr=>JSON.parse(run('JSON.stringify('+expr+')'));
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-12,msg+': '+a+' ≠ '+b);
// Independent forward transform, including a CSS-scaled/offset containing panel.
function screen(x,y){const a=run('state.rotation')*Math.PI/180,w=1000,hgt=800,c=Math.cos(a),s=Math.sin(a),fit=Math.min(picture.clientWidth/(Math.abs(w*c)+Math.abs(hgt*s)),picture.clientHeight/(Math.abs(w*s)+Math.abs(hgt*c))),z=run('zoom'),b=picture.getBoundingClientRect();const xx=picture.clientWidth/2+run('panX')+fit*z*((x-.5)*w*c-(y-.5)*hgt*s),yy=picture.clientHeight/2+run('panY')+fit*z*((x-.5)*w*s+(y-.5)*hgt*c);return {clientX:b.left+xx*b.width/picture.clientWidth,clientY:b.top+yy*b.height/picture.clientHeight};}
function event(type,x,y,id=7,side){const e={...screen(x,y),pointerId:id,target:{dataset:{side}},preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};const listeners=picture.listeners[type]||[]; // Capture listeners run before legacy panning handlers.
 const ordered=type==='pointerdown'||type==='pointermove'||type==='pointerup'||type==='pointercancel'?[...listeners.slice(1),listeners[0]]:listeners;
 for(const fn of ordered){if(!fn)continue;fn(e);if(e.stopped)break;}
}
function drag(side,from,to,end='pointerup'){const vertical=side==='top'||side==='bottom';event('pointerdown',vertical?.5:from,vertical?from:.5,7,side);assert.equal(run('state.cropMethod'),'manual','manual on down');event('pointermove',vertical?.5:to,vertical?to:.5);const moved=json('cropRegion');event(end,vertical?.5:to,vertical?to:.5);assert.deepEqual(json('cropRegion'),moved,'end retains selected rectangle');assert.equal(captures.size,0);return moved;}
let detected=0;const detect=context.NSColorEngine.detectFrame;context.NSColorEngine.detectFrame=im=>{detected++;return detect(im);};
for(const rotation of [0,90,180,270])for(const z of [1,2.3])for(const width of [460,980]){
 picture.clientWidth=width;picture.clientHeight=620;picture.getBoundingClientRect=()=>({left:31,top:47,width:width*.8,height:496});run(`state.rotation=${rotation};zoom=${z};panX=19;panY=-27;cropRegion={x:.1,y:.15,w:.8,h:.7};state.cropLocked=false;`);
 let r=drag('top',.15,.07);near(r.y,.07,'top independent');near(r.y+r.h,.85,'bottom stationary');
 r=drag('bottom',.85,.94);near(r.y,.07,'top stationary');near(r.y+r.h,.94,'bottom independent');
 r=drag('left',.1,.02);near(r.x,.02,'left independent');near(r.x+r.w,.9,'right stationary');
 r=drag('right',.9,.98);near(r.x,.02,'left stationary');near(r.x+r.w,.98,'right independent');
 const before=json('cropRegion');run('applyView();drawCrop();analyzeLevels();render();');assert.deepEqual(json('cropRegion'),before);assert.deepEqual(json('roll[0].crop'),before);
}
assert.equal(detected,0,'no detector called on manual or render');
console.log('PASS 64 edge drags: four rotations, two zooms, two panel widths; independent sides and unchanged image coordinates');
// Capture offset and other pointers cannot snap/move a selected edge.
run('cropRegion={x:.1,y:.15,w:.8,h:.7};');event('pointerdown',.5,.16,7,'top');event('pointermove',.5,.8,8);near(run('cropRegion.y'),.15,'ignore second pointer');event('pointermove',.5,.16);near(run('cropRegion.y'),.15,'grab offset retained');event('pointermove',.5,.08);event('pointercancel',.5,.08);near(run('cropRegion.y'),.07,'cancel commits last position');
let r=drag('top',.07,.05,'lostpointercapture');near(r.y,.05,'lost capture retains position');
// Thin valid frame reaches last source pixel; no 3% clamp on edit, queue or project.
run('cropRegion={x:.1,y:.1,w:.8,h:.8};');r=drag('left',.1,.899);near(r.w,.001,'one-pixel minimum');r=drag('right',.9,2);near(r.x+r.w,1,'image boundary');
run('cropRegion={x:.999,y:.999,w:.001,h:.001};state.cropExport=true;saveCurrentFrame();');
const g=run('CE.exportGeometry(working,cropRegion,true,0)');assert.equal(g.width,1);assert.equal(g.height,1);
console.log('PASS offset, secondary pointers, pointercancel/lost capture, image boundaries and one-pixel export');
// Execute the actual workspace layout script: it must not rewrite overlay geometry.
context.window=context;context.innerHeight=900;context.matchMedia=()=>({matches:false});context.requestAnimationFrame=fn=>fn();const windowListeners={};context.addEventListener=(k,fn)=>(windowListeners[k]||=[]).push(fn);context.Event=class{constructor(type){this.type=type;}};context.dispatchEvent=e=>{for(const fn of windowListeners[e.type]||[])fn(e);};
run('drawCrop();');const overlay=elements.get('cropOverlay'),canvas=elements.get('preview'),beforeStyle={...overlay.style};vm.runInContext(readSource('workspace-layout.js','utf8'),context);for(const k of ['width','height','left','top','transform'])assert.equal(overlay.style[k],beforeStyle[k]);run('applyView();');assert.equal(canvas.style.width,overlay.style.width);assert.equal(canvas.style.height,overlay.style.height);assert.equal(canvas.style.transform,overlay.style.transform);
console.log('PASS actual workspace layout and editor use the same canvas/overlay transform');
// Real chooseFrame and finishImport, with only the file decoder substituted.
set('testImage',fixture);run(`readFile=async()=>{hires=testImage;src=new ImageData(1000,800);previewSrc=src;finishImport('fixture');};`);
const selected=json('cropRegion');await run('chooseFrame(1)');await run('chooseFrame(0)');assert.deepEqual(json('cropRegion'),selected);assert.equal(run('state.cropMethod'),'manual');assert.equal(detected,0);
const saveDownload=run('downloadBlob');run('downloadBlob=b=>globalThis.savedProject=b;');elements.get('saveSettings').onclick();const project=JSON.parse(await context.savedProject.text());assert.deepEqual(project.frames[0].crop,selected);
run('cropRegion={x:0,y:0,w:1,h:1};state.cropMethod="auto";');await elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify(project)}],value:'x'}});assert.deepEqual(json('cropRegion'),selected);assert.equal(run('state.cropMethod'),'manual');assert.equal(detected,0);
// Lock persists through project load; commands clearly require unlock.
elements.get('cropLock').onclick();const locked=json('cropRegion');event('pointerdown',.9995,.999,7,'top');event('pointermove',.9995,.4);event('pointerup',.9995,.4);elements.get('cropAuto').onclick();elements.get('cropReset').onclick();assert.deepEqual(json('cropRegion'),locked);assert.equal(detected,0);assert.match(elements.get('status').textContent,/Lås upp/);
elements.get('saveSettings').onclick();const lockedProject=JSON.parse(await context.savedProject.text());await elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify(lockedProject)}],value:'x'}});assert.equal(run('state.cropLocked'),true);assert.deepEqual(json('cropRegion'),locked);
elements.get('cropLock').onclick();elements.get('cropAuto').onclick();assert.equal(detected,1);assert.equal(run('state.cropMethod'),'auto');elements.get('cropReset').onclick();assert.deepEqual(json('cropRegion'),{x:0,y:0,w:1,h:1});assert.equal(run('state.cropMethod'),'manual');assert.equal(run('state.cropExport'),true,'full image does not toggle export option');
run('state.cropLocked=true;');elements.get('reset').onclick();assert.equal(run('state.cropMethod'),'manual');assert.equal(run('state.cropLocked'),true);assert.equal(run('state.cropExport'),true);
console.log('PASS queue return and JSON round-trip retain exact sub-3% coordinates/mode/lock; explicit detect, full image and slider reset');
