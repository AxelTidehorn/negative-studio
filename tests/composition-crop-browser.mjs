/* Real pointer/touch crop interaction: anchored corners, single-dimension edges,
   size-preserving moves, boundary clamping, direction reversal and rotation. */
import assert from 'node:assert/strict';import fs from 'node:fs';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness,confirmFrameIfNeeded} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness(),buffer=fs.readFileSync('demo-negative.png');
const eq=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-9,label+': '+a+' != '+b);
async function open(page){
 await page.goto(h.url);await page.locator('#imageFile').setInputFiles({name:'crop.png',mimeType:'image/png',buffer});
 await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GEOMETRY.snapshot().draws>0);await confirmFrameIfNeeded(page);
}
async function enter(page){
 await page.locator('#advancedSettings').evaluate(e=>e.open=true);await page.locator('#geometryTools').evaluate(e=>e.open=true);
 if(await page.evaluate(()=>FILMLABB_GEOMETRY.mode())!=='composition'){await page.locator('#compositionEdit').click();await page.waitForFunction(()=>FILMLABB_GEOMETRY.mode()==='composition');}
 await page.locator('[data-composition="2"]').waitFor({state:'visible'});
}
const edges=page=>page.evaluate(()=>{const c=roll[activeFrame].geometry.compositionCrop;return {l:c.cx-c.w/2,r:c.cx+c.w/2,t:c.cy-c.h/2,b:c.cy+c.h/2,w:c.w,h:c.h};});
const valid=page=>page.evaluate(()=>NSGeometry.isValidCrop(working.width,working.height,roll[activeFrame].geometry.rotation,roll[activeFrame].geometry.compositionCrop,{cropExportToFrame:rollShared.cropExportToFrame,analysisFrame:frameRegion()}));
const center=(page,part)=>page.locator(`[data-composition="${part}"]`).first().evaluate(e=>{const b=e.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});
async function mouseDrag(page,part,path){const p=await center(page,part);await page.mouse.move(p.x,p.y);await page.mouse.down();for(const [dx,dy] of path)await page.mouse.move(p.x+dx,p.y+dy,{steps:4});await page.mouse.up();await page.waitForTimeout(30);}
const fixed=(a,b,keys,label)=>{for(const k of keys)eq(a[k],b[k],label+' '+k);};
try{
 const page=await h.browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block',locale:'sv-SE'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await open(page);await enter(page);const full=await edges(page);
 // Shrink from the bottom-right corner: the top-left corner stays put.
 await mouseDrag(page,'2',[[-160,-110]]);let a=await edges(page);fixed(a,full,['l','t'],'corner');assert.ok(a.r<full.r&&a.b<full.b);
 // Corner past the right/bottom boundary: clamps there, other corner fixed, no rescale.
 await mouseDrag(page,'2',[[3000,40]]);let b=await edges(page);fixed(b,a,['l','t'],'corner clamp');eq(b.r,full.r,'right clamps to boundary');assert.ok(b.b>a.b&&b.b<=full.b+1e-9);
 await mouseDrag(page,'2',[[-200,-150]]);a=await edges(page);
 // Edges move one side only, even with perpendicular motion and past the boundary.
 await mouseDrag(page,'right',[[2500,300]]);b=await edges(page);fixed(b,a,['l','t','b'],'right edge');eq(b.r,full.r,'right edge clamp');
 await mouseDrag(page,'top',[[400,-2500]]);let c=await edges(page);fixed(c,b,['l','r','b'],'top edge');eq(c.t,full.t,'top edge clamp');
 // Reverse direction within one gesture: out past the boundary, then back inside.
 await mouseDrag(page,'left',[[-80,0]]);a=await edges(page);
 await mouseDrag(page,'left',[[-2500,0],[90,0]]);b=await edges(page);fixed(b,a,['r','t','b'],'left reversal');assert.ok(b.l>a.l,'returning inside follows the pointer, not the clamp');
 await mouseDrag(page,'left',[[90,0],[-40,0],[0,0]]);c=await edges(page);eq(c.l,b.l,'out-and-back returns exactly');
 // Moving keeps the size; a blocked axis does not stop the other one.
 await mouseDrag(page,'move',[[3000,25]]);c=await edges(page);eq(c.w,b.w,'move width');eq(c.h,b.h,'move height');eq(c.r,full.r,'move clamps right');assert.ok(Math.abs(c.t-b.t)>1e-6,'vertical part of a blocked move still applies');
 // Fine rotation: dragging outward stays inside the rotated image and keeps the anchor.
 await page.locator('#geometryDone').click();await page.locator('#fineRotation').evaluate(e=>{e.value='8';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>roll[activeFrame].geometry.rotation.fineDegrees===8);
 await enter(page);await mouseDrag(page,'2',[[-120,-80]]);a=await edges(page);
 for(const [part,keep,sx,sy] of [['0',['r','b'],-1,-1],['right',['l','t','b'],1,0],['bottom',['l','t','r'],0,1]]){await mouseDrag(page,part,[[3000*sx,3000*sy],[20*sx,20*sy]]);b=await edges(page);fixed(b,a,keep,'rotated '+part);assert.equal(await valid(page),true,'rotated '+part+' stays valid');a=b;}
 assert.deepEqual(errors,[]);await page.close();
 // Touch uses the same pointer path: the right edge changes width only.
 const mobile=await h.browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',locale:'sv-SE'});mobile.setDefaultTimeout(60000);await open(mobile);await enter(mobile);
 const touch=await mobile.context().newCDPSession(mobile),p=await center(mobile,'right'),before=await edges(mobile);
 assert.equal(await mobile.evaluate(({x,y})=>document.elementFromPoint(x,y+15)?.dataset.composition,p),'right','edge handle is reachable by touch');
 for(const [type,dx] of [['touchStart',0],['touchMove',-40],['touchMove',-70],['touchEnd',null]])await touch.send('Input.dispatchTouchEvent',{type,touchPoints:dx===null?[]:[{x:p.x+dx,y:p.y+15}]});
 await mobile.waitForTimeout(30);const after=await edges(mobile);fixed(after,before,['l','t','b'],'touch right edge');assert.ok(after.r<before.r);
 await mobile.close();
 console.log('PASS composition crop: anchored corners, single-axis edges, size-preserving moves, boundary clamps, reversal, rotation and touch');
}finally{await h.close();}
