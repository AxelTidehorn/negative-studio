import {confirmFrameIfNeeded} from './helpers/browser.mjs';
/* Native disclosure/hidden-state behavior under real motion and reduced motion.
   Assert interaction and rendered data, not a particular decorative palette. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';
import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness(),results=[],errors=[];
const extended=process.env.FILMLABB_TEST_LEVEL==='extended',viewports=extended?[[1440,900,false],[1920,1080,false],[1024,768,true],[768,1024,true],[390,844,true]]: [[1920,1080,false],[1024,768,true],[390,844,true]];
try{
 for(const [width,height,touch]of viewports)for(const reduced of (extended?[false,true]:[width===1024])){
  const c=await h.browser.newContext({viewport:{width,height},hasTouch:touch,reducedMotion:reduced?'reduce':'no-preference',locale:'sv-SE',serviceWorkers:'block'}),p=await c.newPage();
  p.on('pageerror',e=>errors.push(e.message));await p.goto(h.url);
  await p.locator('#imageFile').setInputFiles({name:'motion.png',mimeType:'image/png',buffer:fs.readFileSync('demo-negative.png')});
  await p.waitForFunction(()=>working&&!rollLoading&&!workerBusy38&&!queued38);await confirmFrameIfNeeded(p);await p.waitForTimeout(300);
  const frozen=()=>p.evaluate(()=>{const r=NSPixelKernel.render(workingPreview,configuration38(),'positive',24);return {pixels:Array.from(r.data),histogram:r.histogram,state:JSON.stringify({state,calibration,rollShared,region:frameRegion(),geometry:roll[activeFrame].geometry}),source:sourceVersion38,analyses:analysisCount38};});
  const before=await frozen();
  const dimensions=()=>p.locator('#picture').evaluate(e=>{const b=e.getBoundingClientRect();return {width:b.width,height:b.height}});
  const picture=await dimensions();
  // Sample actual frames; no interception of summary clicks/native open state.
  const sample=async open=>p.evaluate(async open=>{
   const card=$('imageAdjustments'),summary=card.querySelector('summary'),rows=[];card.open=open;
   const start=performance.now();do{await new Promise(requestAnimationFrame);const b=card.getBoundingClientRect(),header=summary.getBoundingClientRect();rows.push({t:performance.now()-start,height:b.height,top:header.top,content:b.height-header.height-2,body:card.querySelector('.tool-card-body').getBoundingClientRect().height});}while(performance.now()-start<320);
   return {rows,open:card.open,inert:card.querySelector('.tool-card-body').inert,scroll:$('adjustmentPanel').scrollTop};
  },open);
  const closed=await sample(false);assert.equal(closed.inert,true);assert.equal(closed.open,false);
  assert.ok(Math.max(...closed.rows.map(x=>x.top))-Math.min(...closed.rows.map(x=>x.top))<.1,'header stays anchored');
  const floor=closed.rows.at(-1).height;
  await p.locator('#imageAdjustments > summary').focus();await p.keyboard.press('Tab');
  assert.notEqual(await p.evaluate(()=>document.activeElement.id),'exposure','closed body must leave the tab order');
  assert.equal(await p.evaluate(()=>{$('exposure').focus();return document.activeElement===$('exposure')}),false);
  await p.evaluate(()=>$('adjustmentPanel').scrollTop=0);
  const opened=await sample(true),ceiling=opened.rows.at(-1).height;assert.ok(ceiling>floor+50);assert.equal(opened.inert,false);
  for(const s of [closed,opened])assert.ok(s.rows.every(x=>x.body>=x.content-.1),'opaque body covers the entire animated opening without transparent gaps');
  if(reduced){assert.ok(opened.rows.every(x=>Math.abs(x.height-ceiling)<.1),'reduced opening is immediate');assert.ok(closed.rows.every(x=>Math.abs(x.height-floor)<.1),'reduced closing is immediate');}
  else for(const s of [closed,opened])assert.ok(s.rows.some(x=>x.height>floor+1&&x.height<ceiling-1),'normal motion has intermediate geometry');
  // Reversals also work for API/session-driven changes, without delayed jobs.
  await p.evaluate(async()=>{const d=$('imageAdjustments');for(const open of [false,true,false,true]){d.open=open;await new Promise(r=>setTimeout(r,35));}});
  await p.waitForTimeout(300);assert.equal(await p.locator('#imageAdjustments').evaluate(e=>e.open&&!e.querySelector('.tool-card-body').inert),true);
  assert.ok(Math.abs((await p.locator('#imageAdjustments').boundingBox()).height-ceiling)<.1,'rapid reversal settles at the same height');
  // A control accepts keyboard input while its disclosure is still opening.
  await sample(false);await p.locator('#imageAdjustments > summary').focus();await p.keyboard.press('Enter');
  await p.waitForFunction(()=>getComputedStyle($('imageAdjustments'),'::details-content').contentVisibility!=='hidden',null,{timeout:2000});
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'exposure');
  const value=await p.locator('#exposure').inputValue();await p.keyboard.press('ArrowRight');assert.notEqual(await p.locator('#exposure').inputValue(),value);
  await p.locator('#exposure').evaluate(e=>e.dispatchEvent(new MouseEvent('dblclick',{bubbles:true})));await p.waitForFunction(()=>!workerBusy38&&!queued38);
  // Hide/show keeps immediate focus and hit testing even during its visual exit.
  await p.locator('#hideImageTools').focus();await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>$('imageTools3').hidden&&$('imageTools3').inert&&!$('showImageTools').inert),true);
  assert.equal(await p.evaluate(()=>{$('rotateLeft').focus();return document.activeElement===$('rotateLeft')}),false);
  assert.equal(await p.locator('#showImageTools').evaluate(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return hit===e||e.contains(hit)}),true);
  await p.locator('#showImageTools').focus();await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>$('showImageTools').hidden&&$('showImageTools').inert&&!$('imageTools3').inert&&document.activeElement===$('hideImageTools')),true);
  await p.waitForTimeout(300);assert.deepEqual(await dimensions(),picture);
  assert.deepEqual(await frozen(),before,'motion never changes source, pixels, histogram, recipe, analysis or geometry');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  // Native touch toggles still accept repeated taps, with controls in the body.
  if(touch){await p.locator('#creativeProfiles > summary').tap();assert.equal(await p.locator('#creativeProfiles').evaluate(e=>e.open),true);await p.locator('#creativeProfiles > summary').tap();await p.waitForTimeout(300);assert.equal(await p.locator('#creativeProfiles').evaluate(e=>!e.open&&e.querySelector('.tool-card-body').inert),true);}
  console.log('PASS motion viewport',width,height,'reduced',reduced);
  results.push({width,height,touch,reduced,opening:opened.rows,closing:closed.rows});await c.close();
 }
 assert.deepEqual(errors,[]);
 if(process.env.FILMLABB_MOTION_REPORT)fs.writeFileSync(process.env.FILMLABB_MOTION_REPORT,JSON.stringify({results,errors},null,2));
 console.log('PASS native smooth/reduced disclosures in five viewports; anchored headers; rapid reversal; closed-body focus exclusion; live keyboard edits; inert hidden overlays; touch; unchanged pixels/histogram/recipes/analysis/geometry');
}finally{await h.close();}
