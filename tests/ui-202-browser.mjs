import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browserHarness} from './helpers/browser.mjs';
const h=await browserHarness();
try {
 const p=await h.browser.newPage({viewport:{width:1440,height:900},locale:'sv-SE',serviceWorkers:'block'}),errors=[];
 p.setDefaultTimeout(45000);
 p.on('pageerror',e=>errors.push(e.message));await p.goto(h.url);
 const buffer=fs.readFileSync('demo-negative.png');
 await p.locator('#imageFile').setInputFiles(['a.png','b.png'].map(name=>({name,mimeType:'image/png',buffer})));
 await p.waitForFunction(()=>working&&!rollLoading);
 for(const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844]]) {
  await p.setViewportSize({width,height});
  for(const [queue,adjust] of [[true,true],[false,true],[true,false],[false,false]]) {
   for(const [id,on] of [['toggleQueue',queue],['toggleAdjustments',adjust]]) if(await p.locator('#'+id).getAttribute('aria-pressed')!==String(on))await p.locator('#'+id).click();
   await p.waitForTimeout(80);
   assert.equal(await p.locator('#queuePanel').isVisible(),queue);
   assert.equal(await p.locator('#adjustmentPanel').isVisible(),adjust);
   assert.equal(await p.locator('#picture').isVisible(),true);
   const m=await p.evaluate(()=>({w:$('picture').clientWidth,h:$('picture').clientHeight,overflow:document.documentElement.scrollWidth>innerWidth}));
   assert.ok(m.w>250&&m.h>150,JSON.stringify({width,queue,adjust,m}));assert.equal(m.overflow,false);
   if(width>760)assert.ok(m.w>(queue?width-540:width-360));
  }
 }
 await p.setViewportSize({width:1440,height:900});await p.locator('#toggleFocus').click();
 const before=await p.locator('#picture').evaluate(e=>e.clientHeight);
 await p.evaluate(()=>window.scrollTo(0,52));await p.waitForTimeout(150);
 assert.ok(await p.locator('#picture').evaluate(e=>e.clientHeight)>=before+50);
 assert.ok(await p.locator('header').evaluate(e=>e.getBoundingClientRect().bottom)<=0);
 assert.ok(await p.locator('footer').evaluate(e=>e.getBoundingClientRect().top)>=900);
 await p.locator('footer').scrollIntoViewIfNeeded();assert.ok(await p.locator('footer a').first().isVisible());
 await p.evaluate(()=>window.scrollTo(0,0));
 const protectedGeometry=await p.evaluate(()=>JSON.stringify({calibration,cropRegion,geometry:roll[activeFrame].geometry,rollShared}));
 const protectedState=await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(state).filter(([key])=>!controls.some(c=>c[0]===key)))));
 // Exercise native keyboard input at each endpoint, reset, switch and save/reload a project.
 await p.evaluate(()=>document.querySelectorAll('#adjustmentPanel details').forEach(e=>e.open=true));
 for(const [id,,min,max,,neutral] of await p.evaluate(()=>controls)) {
  const interactive=await p.locator('#'+id).isEnabled()&&await p.locator('#'+id).isVisible();
  for(const [key,value,position] of [['Home',min,0],['End',max,1000]]) {
   if(interactive){await p.locator('#'+id).focus();await p.keyboard.press(key)}
   else await p.evaluate(({id,position})=>{$(id).value=position;$(id).dispatchEvent(new Event('input'))},{id,position});
   assert.ok(Math.abs(await p.evaluate(id=>state[id],id)-value)<1e-10,id);
   assert.equal(Number(await p.locator('#'+id).inputValue()),position);
  }
  if(interactive)await p.locator('#'+id).dblclick();else await p.evaluate(id=>restoreSliderDefault($(id)),id);assert.equal(await p.evaluate(id=>state[id],id),neutral);
  assert.equal(await p.locator('#'+id).inputValue(),'500');
 }
 await p.locator('#exposure').fill('750');await p.locator('#exposure').dispatchEvent('input');
 await p.locator('#reset').click();assert.equal(await p.evaluate(()=>state.exposure),0);
 assert.equal(await p.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(state).filter(([key])=>!controls.some(c=>c[0]===key))))),protectedState);
 assert.equal(await p.evaluate(()=>JSON.stringify({calibration,cropRegion,geometry:roll[activeFrame].geometry,rollShared})),protectedGeometry);
 await p.evaluate(async()=>{saveCurrentFrame();await chooseFrame(1);await chooseFrame(0)});
 assert.ok(await p.evaluate(()=>controls.every(([id,,,,,n])=>state[id]===n&&Number($(id).value)===500&&Number.parseFloat($(id+'Value').textContent)===n)));
 // Save non-neutral values too, to catch project restoration beyond defaults.
 await p.evaluate(()=>{for(const [id] of controls){$(id).value=625;$(id).dispatchEvent(new Event('input'));}saveCurrentFrame();});
 const expected=await p.evaluate(()=>controls.map(([id])=>[id,state[id]]));
 const downloaded=p.waitForEvent('download');await p.locator('#saveSettings').click();const d=await downloaded;const chunks=[];for await(const chunk of await d.createReadStream())chunks.push(chunk);const saved=Buffer.concat(chunks);
 await p.locator('#exposure').fill('750');await p.locator('#exposure').dispatchEvent('input');
 await p.locator('#settingsFile').setInputFiles({name:'project.json',mimeType:'application/json',buffer:saved});
 await p.waitForFunction(()=>!rollLoading&&state.exposure===.5);
 for(const [id,value] of expected){assert.equal(await p.evaluate(id=>state[id],id),value);assert.ok(await p.evaluate(id=>{const c=controls.find(c=>c[0]===id);return Math.abs(Number($(id).value)-sliderToUI(state[id],c[2],c[3],c[5]))<=1},id));}
 await p.locator('#toggleQueue').click();const queue=await p.locator('#toggleQueue').getAttribute('aria-pressed');
 await p.reload();assert.equal(await p.locator('#toggleQueue').getAttribute('aria-pressed'),queue);
 assert.deepEqual(errors,[]);
 console.log('PASS all 16 panel combinations; scroll frees header height; footer links; native slider endpoints/defaults, reset scope, frame switch/project reload; layout persistence');
} finally {await h.close()}
