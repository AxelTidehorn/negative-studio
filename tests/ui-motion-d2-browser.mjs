/* Caption containment and sidebar transitions on real native DOM/canvases. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness(),results=[],errors=[];
const cards=['imageAdjustments','creativeProfiles','calibration3','advancedSettings','exportProject'];
const formats=[[1440,900,false],[1920,1080,false],[1024,768,true],[768,1024,true],[390,844,true]];
async function settled(p){await p.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity),null,{timeout:5000});}
try{for(const reduced of [false,true])for(const [width,height,touch]of formats){
 const c=await h.browser.newContext({viewport:{width,height},hasTouch:touch,reducedMotion:reduced?'reduce':'no-preference',locale:'en-US',serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(h.url);
 await p.locator('#imageFile').setInputFiles(['d2-a.png','d2-b.png'].map(name=>({name,mimeType:'image/png',buffer:fs.readFileSync('demo-negative.png')})));
 await p.waitForFunction(()=>working&&!rollLoading&&!workerBusy38&&!queued38);await settled(p);
 if(width===1920){await p.locator('.divider-right').focus();for(let n=0;n<15;n++)await p.keyboard.press('ArrowLeft');await settled(p);}
 // All native card headers, including long localized export text. Closed glyphs
 // must be fully contained; open captions must actually be invisible, not clipped.
 const captions=async()=>p.evaluate(()=>Array.from(document.querySelectorAll('#adjustmentPanel > .tool-card'),d=>{const e=d.querySelector('.card-status'),s=d.querySelector('summary'),r=e.getBoundingClientRect(),b=s.getBoundingClientRect(),cs=getComputedStyle(e),visible=cs.visibility==='visible'&&e.checkVisibility();return{id:d.id,open:d.open,visible,visibility:cs.visibility,display:cs.display,fits:!visible||(r.left>=b.left-.1&&r.right<=b.right+.1&&r.top>=b.top-.1&&r.bottom<=b.bottom+.1&&r.height>=e.scrollHeight-.5)};}));
 for(const lang of reduced?['sv','en','fr','es','de']:['en']){
  await p.locator('#languageSelect').selectOption(lang);
  for(const id of cards){await p.locator('#'+id).evaluate(e=>e.open=false);}await settled(p);
  assert.ok((await captions()).every(x=>!x.open&&x.visible&&x.fits),lang+' closed captions');
  for(const id of cards){
   await p.locator('#'+id).evaluate(e=>e.open=true);assert.equal((await captions()).find(x=>x.id===id).visible,false,id+' expanded caption');
   if(!reduced){await p.waitForTimeout(100);assert.ok((await captions()).every(x=>x.fits&&! (x.open&&x.visible)),'no clipped/overlapping glyphs during opening');}
   await settled(p);await p.locator('#'+id).evaluate(e=>e.open=false);
   if(!reduced){await p.waitForTimeout(90);assert.ok((await captions()).every(x=>x.fits&&! (x.open&&x.visible)),'no caption fragments during closing');}
   await settled(p);assert.ok((await captions()).every(x=>x.fits));
  }
 }
 await p.evaluate(()=>{const g=NSGeometry.create();roll[activeFrame].geometry=NSGeometry.withComposition(g,{cx:.5,cy:.5,w:.72,h:.68});saveCurrentFrame();zoom=2;panX=12;panY=8;applyView();});await p.waitForTimeout(200);
 const frozen=()=>p.evaluate(()=>{const r=NSPixelKernel.render(workingPreview,configuration38(),'positive',24);return {source:sourceVersion38,analysis:analysisCount38,state:JSON.stringify({state,rollShared,calibration,cropRegion,geometry:roll[activeFrame].geometry}),pixels:Array.from(r.data),histogram:r.histogram,zoom,panX,panY};});
 const before=await frozen(),prefs=await p.evaluate(()=>JSON.parse(localStorage.getItem('filmlabb-workspace-1')));
 const traces=[];
 for(const [button,key,panel]of [['toggleQueue','queue','queuePanel'],['toggleAdjustments','adjust','adjustmentPanel'],['toggleFocus','both',null]]){
  for(const open of [false,true]){
   const trace=await p.evaluate(async({button,panel})=>{const samples=[],start=performance.now(),before=FILMLABB_GEOMETRY.snapshot();$(button).click();do{await new Promise(requestAnimationFrame);const s=panel?getComputedStyle($(panel)):null;samples.push({t:performance.now()-start,w:$('picture').clientWidth,h:$('picture').clientHeight,bitmap:[$('presentationPreview').width,$('presentationPreview').height],opacity:s?.opacity,translate:s?.translate});}while(performance.now()-start<400);return {samples,draws:FILMLABB_GEOMETRY.snapshot().draws-before.draws};},{button,panel});
   assert.ok(new Set(trace.samples.map(x=>x.w+','+x.h)).size<=2,'one viewport layout commit; no interpolated canvas sizes');
   if(reduced)assert.equal(new Set(trace.samples.map(x=>x.w+','+x.h)).size,1,'reduced layout is immediate');
   assert.deepEqual(await frozen(),before,'panel motion preserves zoom, crop, recipe, source, analysis and pixels');
   if(panel){assert.equal(await p.locator('#'+panel).evaluate(e=>e.inert),!open);assert.equal(await p.locator('#'+button).getAttribute('aria-pressed'),String(open));}
   traces.push({button,key,open,...trace});
  }
 }
 // Rapid reversal, focus exclusion, resize interruption and OS preference change.
 await p.evaluate(async()=>{for(let i=0;i<5;i++){$('toggleAdjustments').click();await new Promise(r=>setTimeout(r,35));}});
 await settled(p);assert.equal(await p.locator('#adjustmentPanel').evaluate(e=>e.inert),true);await p.locator('#toggleAdjustments')[touch?'tap':'click']();await settled(p);
 await p.locator('#imageAdjustments').evaluate(e=>e.open=true);await settled(p);
 if(width>760){await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop=90);const top=await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop);await p.locator('#toggleAdjustments').click();await settled(p);await p.locator('#toggleAdjustments').click();await settled(p);assert.equal(await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop),top,'sidebar scroll position survives collapse');}
 await p.locator('#exposure').focus();
 await p.evaluate(()=>$('toggleAdjustments').click());assert.equal(await p.evaluate(()=>document.activeElement.id),'toggleAdjustments');
 assert.equal(await p.evaluate(()=>{$('exposure').focus();return document.activeElement===$('exposure')}),false);
 await p.setViewportSize({width:width+1,height});await settled(p);assert.equal(await p.locator('#workspace').evaluate(e=>e.classList.contains('adjust-exiting')),false);
 await p.locator('#toggleAdjustments')[touch?'tap':'click']();await settled(p);await p.setViewportSize({width,height});await settled(p);
 const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('filmlabb-workspace-1')));assert.equal(after.widthQueue,prefs.widthQueue);assert.equal(after.widthAdjust,prefs.widthAdjust);
 await p.evaluate(()=>$('toggleQueue').click());await p.emulateMedia({reducedMotion:'reduce'});await settled(p);
 assert.equal(await p.locator('#workspace').evaluate(e=>e.classList.contains('queue-exiting')),false);await p.locator('#toggleQueue')[touch?'tap':'click']();await settled(p);
 await p.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 // Menu is operable during its entry and non-interactive during exit.
 await p.locator('#flInfoMenu > summary').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('.fl-info-content').checkVisibility());await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'themeIdentity');
 await p.evaluate(()=>$('flInfoMenu').open=false);await p.waitForFunction(()=>document.querySelector('.fl-info-content').inert);assert.equal(await p.evaluate(()=>$('themeIdentity').focus()||document.activeElement===$('themeIdentity')),false);await settled(p);
 // Internal geometry disclosure uses its original body; no new controls.
 await p.locator('#advancedSettings').evaluate(e=>e.open=true);await settled(p);await p.locator('#geometryTools').evaluate(e=>e.open=true);await settled(p);assert.equal(await p.locator('#geometryTools .geometry-body').evaluate(e=>e.inert),false);await p.locator('#geometryTools').evaluate(e=>e.open=false);await settled(p);assert.equal(await p.locator('#geometryTools .geometry-body').evaluate(e=>e.inert),true);
 await p.evaluate(()=>{$('exportProgressPanel').hidden=false;});await p.waitForTimeout(30);await p.locator('#exportProgressPanel').evaluate(e=>{const a=e.getAnimations()[0];window.motionProgressAnimation=a;return !!a});await p.evaluate(()=>{$('exportProgressPanel').querySelector('progress').value=50;$('exportProgressText').textContent='50 %';});assert.equal(await p.locator('#exportProgressPanel').evaluate(e=>e.getAnimations()[0]===window.motionProgressAnimation),true,'progress values must not restart entry animation');await p.evaluate(()=>$('exportProgressPanel').hidden=true);assert.equal(await p.locator('#exportProgressPanel').isVisible(),false);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);results.push({width,height,touch,reduced,traces});await c.close();console.log('PASS D2',width,height,'reduced',reduced);
}
assert.deepEqual(errors,[]);if(process.env.FILMLABB_MOTION_D2_REPORT)fs.writeFileSync(process.env.FILMLABB_MOTION_D2_REPORT,JSON.stringify({results,errors},null,2));console.log('PASS all five cards/captions/languages, bounded canvas commits, zoom/crop/pixel invariance, reversals, resize/reduced interruption, native focus/touch and menu');
}finally{await h.close();}
