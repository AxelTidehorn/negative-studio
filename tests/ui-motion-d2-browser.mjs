/* Caption containment and sidebar transitions on real native DOM/canvases. */
import assert from 'node:assert/strict';import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness(),results=[],errors=[];
const cards=['imageAdjustments','creativeProfiles','calibration3','advancedSettings','exportProject'];
const formats=[[1440,900,false],[1920,1080,false],[1024,768,true],[768,1024,true],[390,844,true]];
async function settled(p){await p.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity),null,{timeout:5000});}
try{for(const reduced of [false,true])for(const [width,height,touch]of formats){
 const c=await h.browser.newContext({viewport:{width,height},hasTouch:touch,reducedMotion:reduced?'reduce':'no-preference',locale:'en-US',serviceWorkers:'block'}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(h.url);
 if(width===768)await p.evaluate(()=>{NSPreviewPresentation.create=()=>{throw Error('Test CPU presentation fallback')};});
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
 const frozen=()=>p.evaluate(()=>{const r=NSPixelKernel.render(workingPreview,configuration38(),'positive',24);return {source:sourceVersion38,analysis:analysisCount38,state:JSON.stringify({state,rollShared,calibration,cropRegion,geometry:roll[activeFrame].geometry}),pixels:Array.from(r.data),histogram:r.histogram,request:request38,zoom,panX,panY};});
 const before=await frozen(),prefs=await p.evaluate(()=>JSON.parse(localStorage.getItem('filmlabb-workspace-1')));
 const traces=[];
 for(const [button,key,panel]of [['toggleQueue','queue','queuePanel'],['toggleAdjustments','adjust','adjustmentPanel'],['toggleFocus','both',null]]){
  for(const open of [false,true]){
   const trace=await p.evaluate(async({button,panel})=>{
    const samples=[],controlled=[],start=performance.now(),before=FILMLABB_GEOMETRY.snapshot(),frames=FILMLABB_GPU.snapshot().frames,initial={w:$('picture').clientWidth,h:$('picture').clientHeight};
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,w:r.width,shown:getComputedStyle(e).display!=='none'}};
    const sample=()=>{const s=panel?getComputedStyle($(panel)):null;return {t:performance.now()-start,centerY:FILMLABB_GEOMETRY.sourceToView(FILMLABB_GEOMETRY.view().inverse({x:.5,y:.5})).y,w:$('picture').clientWidth,h:$('picture').clientHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,bitmap:[$('presentationPreview').width,$('presentationPreview').height,$('presentationFallback').width,$('presentationFallback').height],q:box($('queuePanel')),a:box($('adjustmentPanel')),image:box(document.querySelector('.image-panel')),tracks:getComputedStyle($('workspace')).gridTemplateColumns.split(' ').map(parseFloat),opacity:s?.opacity,translate:s?.translate};};
    $(button).click();const animation=$('workspace').getAnimations().find(a=>a.transitionProperty==='grid-template-columns');
    // Test actual native interpolation, not a minimum FPS on a shared CI host.
    // Then restore time zero and observe the unmodified real-time playback too.
    if(animation){animation.pause();for(const f of [0,.3,.6]){animation.currentTime=animation.effect.getTiming().duration*f;controlled.push(sample());}animation.currentTime=0;animation.play();}
    const playbackStart=performance.now();do{await new Promise(requestAnimationFrame);samples.push(sample());}while(performance.now()-playbackStart<400);
    const end=FILMLABB_GEOMETRY.snapshot();return {samples,controlled,initial,panY,draws:end.draws-before.draws,cpuPasses:end.cpuPasses-before.cpuPasses,colorUploads:end.colorUploads-before.colorUploads,colorFrames:FILMLABB_GPU.snapshot().frames-frames};
   },{button,panel});
   const all=[...trace.controlled,...trace.samples];
   assert.ok(all.every(x=>!x.overflow),'no horizontal overflow during panel motion');
   assert.equal(new Set(all.map(x=>x.bitmap.join(','))).size,1,'presentation bitmaps are not resized during grid motion');
   assert.equal(trace.draws,0,'viewport-only movement never resamples the photograph');assert.equal(trace.cpuPasses,0);assert.equal(trace.colorUploads,0);assert.equal(trace.colorFrames,0);
   const sizes=new Set(trace.samples.map(x=>x.w+','+x.h)).size;
   if(reduced||width<=760)assert.equal(sizes,1,'reduced motion and the stacked phone layout switch immediately');
   else{
    assert.equal(trace.controlled.length,3,'a native grid transition must exist');
    assert.equal(new Set(trace.controlled.map(x=>x.w)).size,3,'native grid interpolation changes width at controlled intermediate times');
    for(const side of ['q','a']){const visible=all.filter(x=>x[side].shown);assert.ok(visible.every(x=>Math.abs(x[side].w-visible[0][side].w)<.1),'panel contents keep their full width');}
    const last=trace.samples.at(-1);
    for(const x of all){
     const t=(x.w-trace.initial.w)/(last.w-trace.initial.w),height=trace.initial.h+(last.h-trace.initial.h)*t;
     assert.ok(Math.abs(x.centerY-height/2-trace.panY)<1,'responsive status wrapping must not jump the photograph');
     if(x.q.shown)assert.ok(Math.abs(x.image.x-x.q.right-x.tracks[1])<.2,'left picture edge follows queue edge');
     if(x.a.shown)assert.ok(Math.abs(x.a.x-x.image.right-x.tracks[3])<.2,'right picture edge follows editor edge');
     if(panel&&(panel==='queuePanel'?x.q:x.a).shown){assert.equal(x.opacity,'1','no separate fade');assert.equal(x.translate,'none');}
    }
   }
   assert.deepEqual(await frozen(),before,'panel motion preserves zoom, crop, recipe, source, analysis and pixels');
   if(panel){assert.equal(await p.locator('#'+panel).evaluate(e=>e.inert),!open);assert.equal(await p.locator('#'+button).getAttribute('aria-pressed'),String(open));}
   traces.push({button,key,open,...trace});
  }
 }
 // Rapid reversal, focus exclusion, resize interruption and OS preference change.
 const reversals=await p.evaluate(async()=>{const rows=[];for(let i=0;i<5;i++){await new Promise(requestAnimationFrame);const before=$('picture').getBoundingClientRect();$('toggleAdjustments').click();const after=$('picture').getBoundingClientRect();rows.push({jump:Math.max(Math.abs(before.x-after.x),Math.abs(before.right-after.right))});await new Promise(r=>setTimeout(r,55));}return rows;});if(!reduced&&width>760)assert.ok(reversals.every(r=>r.jump<1),'native reversals start at the current interpolated position');
 await settled(p);assert.equal(await p.locator('#adjustmentPanel').evaluate(e=>e.inert),true);await p.locator('#toggleAdjustments')[touch?'tap':'click']();await settled(p);
 await p.locator('#imageAdjustments').evaluate(e=>e.open=true);await settled(p);
 if(width>760){await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop=90);const top=await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop);await p.locator('#toggleAdjustments').click();await settled(p);await p.locator('#toggleAdjustments').click();await settled(p);assert.equal(await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop),top,'sidebar scroll position survives collapse');}
 await p.locator('#exposure').focus();
 await p.evaluate(()=>$('toggleAdjustments').click());assert.equal(await p.evaluate(()=>document.activeElement.id),'toggleAdjustments');
 assert.equal(await p.evaluate(()=>{$('exposure').focus();return document.activeElement===$('exposure')}),false);
 await p.setViewportSize({width:width+1,height});await settled(p);assert.equal(await p.locator('#workspace').evaluate(e=>e.classList.contains('sidebar-sliding')),false);
 await p.locator('#toggleAdjustments')[touch?'tap':'click']();await settled(p);await p.setViewportSize({width,height});await settled(p);
 const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('filmlabb-workspace-1')));assert.equal(after.widthQueue,prefs.widthQueue);assert.equal(after.widthAdjust,prefs.widthAdjust);
 await p.evaluate(()=>$('toggleQueue').click());await p.emulateMedia({reducedMotion:'reduce'});await settled(p);
 assert.equal(await p.locator('#workspace').evaluate(e=>e.classList.contains('sidebar-sliding')),false);await p.locator('#toggleQueue')[touch?'tap':'click']();await settled(p);
 await p.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
 // Menu is operable during its entry and non-interactive during exit.
 await p.locator('#flInfoMenu > summary').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('.fl-info-content').checkVisibility());await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'themeMode');
 await p.evaluate(()=>$('flInfoMenu').open=false);await p.waitForFunction(()=>document.querySelector('.fl-info-content').inert);assert.equal(await p.evaluate(()=>$('themeMode').focus()||document.activeElement===$('themeMode')),false);await settled(p);
 // Internal geometry disclosure uses its original body; no new controls.
 await p.locator('#advancedSettings').evaluate(e=>e.open=true);await settled(p);await p.locator('#geometryTools').evaluate(e=>e.open=true);await settled(p);assert.equal(await p.locator('#geometryTools .geometry-body').evaluate(e=>e.inert),false);await p.locator('#geometryTools').evaluate(e=>e.open=false);await settled(p);assert.equal(await p.locator('#geometryTools .geometry-body').evaluate(e=>e.inert),true);
 await p.evaluate(()=>{$('exportProgressPanel').hidden=false;});await p.waitForTimeout(30);await p.locator('#exportProgressPanel').evaluate(e=>{const a=e.getAnimations()[0];window.motionProgressAnimation=a;return !!a});await p.evaluate(()=>{$('exportProgressPanel').querySelector('progress').value=50;$('exportProgressText').textContent='50 %';});assert.equal(await p.locator('#exportProgressPanel').evaluate(e=>e.getAnimations()[0]===window.motionProgressAnimation),true,'progress values must not restart entry animation');await p.evaluate(()=>$('exportProgressPanel').hidden=true);assert.equal(await p.locator('#exportProgressPanel').isVisible(),false);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);results.push({width,height,touch,reduced,traces});await c.close();console.log('PASS D2',width,height,'reduced',reduced);
}
assert.deepEqual(errors,[]);if(process.env.FILMLABB_MOTION_D2_REPORT)fs.writeFileSync(process.env.FILMLABB_MOTION_D2_REPORT,JSON.stringify({results,errors},null,2));console.log('PASS all five cards/captions/languages, continuous grid / cached canvas, zoom/crop/pixel invariance, reversals, resize/reduced interruption, native focus/touch and menu');
}finally{await h.close();}
