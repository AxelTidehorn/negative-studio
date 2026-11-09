import {closeSettings} from './helpers/browser.mjs';
import {selectLanguage} from './helpers/browser.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';
import {browserHarness,selectEngine} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
const cards=['imageAdjustments','creativeProfiles','calibration3','advancedSettings','exportProject'];
try{
 const p=await h.browser.newPage({viewport:{width:1440,height:900},locale:'sv-SE',serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 // Historical persistent disclosure preference must not override the new-session default.
 await p.addInitScript(()=>localStorage.setItem('filmlabb-advanced-open-v2','true'));
 await p.goto(h.url);
 const open=()=>p.evaluate(ids=>ids.map(id=>document.getElementById(id).open),cards);
 assert.deepEqual(await open(),[true,false,false,false,false]);
 assert.equal(await p.locator('#adjustmentPanel > .tool-card').count(),5);
 const bytes=fs.readFileSync('tests/fixtures/synthetic-negative.dng');
 await p.locator('#imageFile').setInputFiles(['a.dng','b.dng'].map(name=>({name,mimeType:'image/x-adobe-dng',buffer:bytes})));
 await p.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu');
 await selectEngine(p,'v2');await p.waitForFunction(()=>state.engine==='v2'&&state.v2Recipe&&!rollLoading);
 await p.waitForTimeout(600);
 const frozen=()=>p.evaluate(()=>({state:JSON.stringify({state,rollShared,calibration,cropRegion}),source:sourceVersion38,analysis:analysisCount38,v2:FILMLABB_V2.snapshot().analysisCount,uploads:FILMLABB_GPU.snapshot().sourceUploads,reconstructions:FILMLABB_GPU.snapshot().positiveReconstructions}));
 const before=await frozen();
 const structure=await p.evaluate(()=>({workspace:getComputedStyle($('workspace')).backgroundColor,editor:getComputedStyle($('adjustmentPanel')).backgroundColor,image:getComputedStyle(document.querySelector('.image-panel')).backgroundColor,queue:getComputedStyle($('queuePanel')).backgroundColor,gear:getComputedStyle($('flInfoMenu').querySelector('summary'),'::after').maskImage,gap:getComputedStyle($('imageAdjustments').querySelector('summary')).columnGap,chevron:getComputedStyle($('imageAdjustments').querySelector('summary'),'::before').display,bodyPadding:getComputedStyle($('imageAdjustments').querySelector('.tool-card-body')).padding}));
 assert.equal(structure.editor,'rgba(0, 0, 0, 0)');assert.equal(structure.queue,structure.image,'image housing shares the queue glass');
 assert.notEqual(structure.gear,'none');assert.equal(structure.chevron,'none');
 await p.evaluate(()=>$('workspace').style.setProperty('--adjust-width','500px'));
 assert.equal(await p.locator('#creativeProfilesSummary').evaluate(e=>getComputedStyle(e).gridRowStart),'1','wide card status shares title row');
 await p.evaluate(()=>$('workspace').style.removeProperty('--adjust-width'));

 assert.equal(await p.locator('#adjustmentPanel summary').evaluateAll(es=>es.every(e=>getComputedStyle(e,'::before').display==='none')),true);
 assert.equal(await p.locator('label[for="imageFile"]').textContent(),'Importera');
 assert.equal(await p.locator('label[for="imageFile"]').evaluate(e=>e.classList.contains('ui3-icon')),true);
 for(const id of cards){
  for(let i=0;i<2;i++){
   const summary=p.locator('#'+id+' > summary');await summary.hover();await summary.focus();
   assert.equal(await summary.evaluate(e=>getComputedStyle(e,'::before').display),'none');
   assert.equal(await summary.evaluate(e=>getComputedStyle(e).listStyleType),'none');
   await summary.click();
  }
 }
 assert.deepEqual(await open(),[true,false,false,false,false]);
 // Native summary keyboard semantics, plus a visible focus outline.
 await p.locator('#creativeProfiles > summary').focus();await p.keyboard.press('Enter');assert.equal((await open())[1],true);
 assert.notEqual(await p.locator('#creativeProfiles > summary').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
 await p.keyboard.press('Space');assert.equal((await open())[1],false);
 for(const lang of ['en','fr','es','de','sv'])await selectLanguage(p,lang);
 assert.deepEqual(await frozen(),before,'disclosures and localization must not render, analyse or change a recipe');
 // Sliders use their actual physical units, not 0..1000 thumb positions.
 await p.locator('#exposure').fill('600');await p.locator('#exposure').dispatchEvent('input');
 await p.locator('#vibrance').fill('600');await p.locator('#vibrance').dispatchEvent('input');
 assert.match(await p.locator('#imageAdjustmentsSummary').textContent(),/Exponering \+0,4 EV.*Lyster \+20/);
 await p.locator('#exposure').dblclick();assert.doesNotMatch(await p.locator('#imageAdjustmentsSummary').textContent(),/Exponering/);
 await p.locator('#reset').click();assert.equal(await p.locator('#imageAdjustmentsSummary').textContent(),'Inga manuella justeringar');
 await p.locator('#creativeProfiles > summary').click();await p.locator('#filmProfile').selectOption('film.kodak-ektar-100');
 await p.locator('#profileStrength').fill('55');await p.locator('#profileStrength').dispatchEvent('input');
 assert.match(await p.locator('#creativeProfilesSummary').textContent(),/Kodak Ektar 100 · 55 %/);
 await p.locator('#filmProfile').selectOption('neutral');assert.equal(await p.locator('#creativeProfilesSummary').textContent(),'Ingen kreativ profil');
 await p.locator('#exportProject > summary').click();await p.locator('#jpegSize').selectOption('safe');assert.match(await p.locator('#exportProjectSummary').textContent(),/12 megapixel/);
 const chosen=await open();await p.evaluate(async()=>{saveCurrentFrame();await chooseFrame(1)});await p.waitForFunction(()=>!rollLoading);
 assert.deepEqual(await open(),chosen);assert.equal(await p.locator('#imageAdjustmentsSummary').textContent(),'Inga manuella justeringar');
 assert.match(await p.locator('#exportProjectSummary').textContent(),/originalstorlek/);
 await p.evaluate(()=>chooseFrame(0));await p.waitForFunction(()=>!rollLoading);assert.deepEqual(await open(),chosen);
 assert.match(await p.locator('#exportProjectSummary').textContent(),/12 megapixel/);
 // Exercise actual project round-trip; open state belongs only to this UI session.
 const project=await p.evaluate(async()=>{saveCurrentFrame();let b;const download=downloadBlob;downloadBlob=x=>b=x;try{$('saveSettings').onclick();return await b.text();}finally{downloadBlob=download;}});
 await p.locator('#settingsFile').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(project)});
 await p.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('matchades'));assert.deepEqual(await open(),chosen);
 // Reference owner provides review/accept/undo; a candidate is never labelled accepted.
 await p.locator('#calibration3 > summary').click();await p.locator('#base2Enable').click();await p.waitForFunction(()=>FILMLABB_BASE2.snapshot().proposal);
 assert.doesNotMatch(await p.locator('#calibration3Summary').textContent(),/Godkänd/);
 assert.equal(await p.locator('#calibration3Summary').textContent(),'Antagen filmbas · ej uppmätt');
 await p.evaluate(()=>setProposal2(FM2.measure(working,{x:.05,y:.1,w:.07,h:.6})));
 await p.locator('#base2Preview').click();assert.match(await p.locator('#calibration3Summary').textContent(),/inte godkänt/);
 await p.locator('#base2Preview').click();
 await p.locator('#base2Accept').click();await p.waitForFunction(()=>FILMLABB_BASE2.snapshot().accepted);
 assert.equal(await p.locator('#calibration3Summary').textContent(),'Manuell referens · Godkänd');
 await p.locator('#base2Undo').click();await p.waitForFunction(()=>!FILMLABB_BASE2.snapshot().accepted);
 assert.doesNotMatch(await p.locator('#calibration3Summary').textContent(),/Godkänd/);
 await p.locator('#advancedSettings').evaluate(e=>e.open=true);
 const beforeEngine=await open();
 for(const engine of ['calibrated4','log39','v2']){await selectEngine(p,engine);await p.waitForFunction(e=>state.engine===e&&!rollLoading,engine);assert.deepEqual(await open(),beforeEngine);}
 const backend=p.locator('#previewBackend');await backend.evaluate(el=>{for(let a=el.parentElement;a;a=a.parentElement)if(a.tagName==='DETAILS')a.open=true;});
 await backend.selectOption('cpu');await p.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='cpu'&&!workerBusy38&&!queued38);
 await backend.selectOption('auto');await p.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu');await closeSettings(p);
 assert.equal(await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size;}),true);
 for(const [width,height]of [[1440,900],[1024,768],[768,1024],[390,844]])for(const mode of ['dark','light']){
  await p.setViewportSize({width,height});await p.evaluate(mode=>{FILMLABB_APPEARANCE.set(mode);document.querySelectorAll('.tool-card').forEach(e=>e.open=true);},mode);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}/${mode}`);
  const material=await p.evaluate(()=>{
   const style=selector=>{const s=getComputedStyle(document.querySelector(selector));return {background:s.backgroundColor,filter:s.backdropFilter,opacity:s.opacity,image:s.backgroundImage};};
   return {body:style('#imageAdjustments > .tool-card-body'),head:style('#imageAdjustments > summary'),header:style('header'),footer:style('footer'),toolbar:style('#imageTools3')};
  });
  for(const key of ['body','header','footer']){assert.match(material[key].background,/^rgb\(/);assert.equal(material[key].filter,'none');assert.equal(material[key].opacity,'1');assert.equal(material[key].image,'none');}
  if(mode==='dark')assert.match(material.head.image,/linear-gradient/);

  await p.locator('#imageAdjustments > summary').click();
  await p.locator('#imageAdjustments > .tool-card-body').waitFor({state:'hidden'});
  assert.equal(await p.locator('#imageAdjustments > .tool-card-body').isVisible(),false);

 }
 const cdp=await p.context().newCDPSession(p);
 await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
 assert.equal(await p.evaluate(()=>matchMedia('(prefers-reduced-transparency:reduce)').matches),true);
 assert.equal(await p.locator('#imageAdjustments > summary').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
 assert.equal(await p.locator('#imageTools3').evaluate(e=>getComputedStyle(e).backdropFilter),'none');
 const touch=await h.browser.newContext({hasTouch:true,locale:'sv-SE',serviceWorkers:'block'}),tablet=await touch.newPage();
 tablet.on('pageerror',e=>errors.push(e.message));await tablet.goto(h.url);
 for(const [width,height]of [[1024,768],[768,1024],[390,844]]){
  await tablet.setViewportSize({width,height});
  for(const mode of ['dark','light']){
   await tablet.evaluate(mode=>FILMLABB_APPEARANCE.set(mode),mode);
   for(const id of cards){await tablet.locator('#'+id+' > summary').tap();await tablet.locator('#'+id+' > summary').tap();}
   assert.deepEqual(await tablet.evaluate(ids=>ids.map(id=>document.getElementById(id).open),cards),[true,false,false,false,false]);
   assert.equal(await tablet.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   assert.ok(await tablet.locator('#imageAdjustments > summary').evaluate(e=>e.getBoundingClientRect().height>=44));
   assert.ok(await tablet.locator('#exposure').evaluate(e=>e.getBoundingClientRect().height>=36));
  }
 }
 await touch.close();
 assert.deepEqual(errors,[]);
 console.log('PASS UI 2.1 defaults, independent native disclosures, keyboard, session persistence, localized summaries, live editing/reset/profile/base accept/undo, project roundtrip, CPU/GPU, unique controls and material/viewport checks');
}finally{await h.close();}
