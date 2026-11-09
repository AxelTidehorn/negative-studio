/* Native controls + event lifecycle tests. Chromium CDP sends trusted touch
   scrolls; WebKit exercises trusted taps and synthetic cancellation sequences.
   Neither engine substitutes for testing on a physical iPad Safari. */
import assert from 'node:assert/strict';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();let alternate;
try{if(process.env.FILMLABB_TEST_WEBKIT){const {webkit}=await import('playwright');alternate=await webkit.launch({headless:true});}
 const browser=alternate||h.browser,context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,locale:'sv-SE',serviceWorkers:'block'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(h.url);await p.locator('#exposure').scrollIntoViewIfNeeded();
 assert.equal(await p.locator('#exposure').evaluate(e=>getComputedStyle(e).touchAction),'pan-y');
 const sequence=async(id,{move=false,end='pointerup',start=4}={})=>p.evaluate(({id,move,end,start})=>{const s=$(id),send=(type,x,y)=>s.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:start,isPrimary:true,clientX:x,clientY:y}));send('pointerdown',80,80);if(move)send('pointermove',120,82);return send(end,move?120:80,move?82:80);},{id,move,end,start});
 const set=async(id,value)=>p.evaluate(({id,value})=>{const s=$(id);s.value=value;s.dispatchEvent(new Event('input',{bubbles:true}));},{id,value});
 // Cancelled tentative inputs must not round a saved physical value or invoke
 // another owner's side effects (the frame inset is a geometry operation).
 const tentative=await p.evaluate(()=>{
  state.exposure=.123;setSliderPosition('exposure');const original=$('exposure').value,frame=JSON.stringify(cropRegion);
  for(const id of ['exposure','cropInset']){const el=$(id),start=el.value,send=(type,x,y)=>el.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:19,isPrimary:true,clientX:x,clientY:y}));send('pointerdown',80,80);el.value=id==='exposure'?'750':'12';el.dispatchEvent(new Event('input',{bubbles:true}));send('pointermove',80,110);send('pointercancel',80,110);if(el.value!==start)throw Error('Tentative thumb not restored');}
  return {physical:state.exposure,thumb:$('exposure').value,original,frameUnchanged:JSON.stringify(cropRegion)===frame};
 });assert.equal(tentative.physical,.123);assert.equal(tentative.thumb,tentative.original);assert.equal(tentative.frameUnchanged,true);
 // Two drag endings are not double taps, and every termination releases owner.
 await set('exposure',700);await sequence('exposure',{move:true});await sequence('exposure',{move:true});assert.equal(await p.locator('#exposure').inputValue(),'700');assert.equal(await p.evaluate(()=>NSRangeInteraction.snapshot().active),null);
 for(const end of ['pointercancel','lostpointercapture']){await sequence('exposure',{end});assert.equal(await p.evaluate(()=>NSRangeInteraction.snapshot().active),null);await sequence('exposure');assert.equal(await p.locator('#exposure').inputValue(),'700','cancel clears tap history');await p.evaluate(()=>window.dispatchEvent(new Event('blur')));}
 // Terminal events remain uncancelled; movement, long press, and another control
 // do not complete a double-tap reset. No blur is used on release.
 assert.equal(await sequence('exposure'),true);assert.equal(await sequence('exposure'),true);assert.equal(await p.locator('#exposure').inputValue(),'500');
 await set('exposure',700);await set('contrast',800);await sequence('exposure');await sequence('contrast');assert.equal(await p.locator('#exposure').inputValue(),'700');assert.equal(await p.locator('#contrast').inputValue(),'800');
 await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.locator('#exposure').focus();await sequence('exposure',{move:true});assert.equal(await p.evaluate(()=>document.activeElement.id),'exposure');await p.keyboard.press('Home');assert.equal(await p.evaluate(()=>state.exposure),-2);await p.keyboard.press('End');assert.equal(await p.evaluate(()=>state.exposure),2);await p.keyboard.press('ArrowLeft');assert.ok(Number(await p.locator('#exposure').inputValue())<1000);
 await p.locator('#exposure').dblclick();assert.equal(await p.evaluate(()=>state.exposure),0);
 // Trusted double tap (native input value changes and compatibility events).
 const box=await p.locator('#exposure').boundingBox(),x=box.x+box.width*.65,y=box.y+box.height/2;await p.touchscreen.tap(x,y);await p.touchscreen.tap(x,y);assert.equal(await p.locator('#exposure').inputValue(),'500');assert.equal(await p.evaluate(()=>NSRangeInteraction.snapshot().active),null);await p.locator('#creativeProfiles > summary').tap();assert.equal(await p.locator('#creativeProfiles').evaluate(e=>e.open),true);
 const trusted=[];
 if(!alternate){const cdp=await context.newCDPSession(p);
  const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y,id:1}]});
  for(const mode of ['drag','double-tap','precise-saved-value']){
   await p.locator('#exposure').scrollIntoViewIfNeeded();if(mode==='precise-saved-value')await p.evaluate(()=>{state.exposure=.123;setSliderPosition('exposure');updateValues();});const b=await p.locator('#exposure').boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
   // Real horizontal range drag, release, then vertical scroll starting on thumb.
   if(mode==='drag'){await touch('touchStart',x,y);for(let i=1;i<=5;i++)await touch('touchMove',x+i*8,y);await touch('touchEnd');}
   else if(mode==='double-tap'){await p.touchscreen.tap(x,y);await p.touchscreen.tap(x,y);}
   const before=await p.locator('#exposure').inputValue(),beforeState=await p.evaluate(()=>state.exposure);const thumbX=await p.locator('#exposure').evaluate(e=>{const r=e.getBoundingClientRect();return r.x+10+(r.width-20)*Number(e.value)/1000;});
   const scrollX=mode==='precise-saved-value'?thumbX+30:thumbX;await touch('touchStart',scrollX,y);for(let i=1;i<=6;i++)await touch('touchMove',scrollX,y-i*12);await touch('touchEnd');
   const after=await p.locator('#exposure').inputValue();trusted.push({mode,before,after,active:await p.evaluate(()=>NSRangeInteraction.snapshot().active)});assert.equal(after,before,'vertical scroll after completed drag must not change value');assert.equal(await p.evaluate(()=>state.exposure),beforeState,'cancelled scrolling preserves exact saved model precision');assert.equal(trusted.at(-1).active,null);const open=await p.locator('#creativeProfiles').evaluate(e=>e.open);await p.locator('#creativeProfiles > summary').tap();assert.equal(await p.locator('#creativeProfiles').evaluate(e=>e.open),!open);
  }
 }
 // Disabled native ranges may still emit pointer events in Chromium. They
 // must neither acquire a touch owner nor run the reset callback.
 await p.locator('#contrast').scrollIntoViewIfNeeded();await set('contrast',800);await p.evaluate(()=>$('contrast').disabled=true);const disabled=await p.locator('#contrast').boundingBox();await p.touchscreen.tap(disabled.x+disabled.width/2,disabled.y+disabled.height/2);await p.touchscreen.tap(disabled.x+disabled.width/2,disabled.y+disabled.height/2);assert.equal(await p.locator('#contrast').inputValue(),'800');assert.equal(await p.evaluate(()=>NSRangeInteraction.snapshot().active),null);await p.evaluate(()=>$('contrast').disabled=false);
 assert.deepEqual(errors,[]);console.log('PASS range: drag vs tap discrimination, uncancelled pointer endings, cancellation/lost capture, two sliders, trusted double tap, immediate card navigation, native keyboard/focus/mouse, disabled-control protection; trusted Chromium horizontal drag and vertical scroll',JSON.stringify({browser:await p.evaluate(()=>navigator.userAgent),trusted,physicalIPad:false,webkitTouchDrag:alternate?'not available through Playwright; cancellation synthetic':undefined}));await context.close();
}finally{await alternate?.close();await h.close();}
