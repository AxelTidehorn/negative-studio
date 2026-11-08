import {selectBackend} from './helpers/browser.mjs';
import {selectLanguage} from './helpers/browser.mjs';
/* Exercise the real CPU worker/GPU histogram lifecycle and existing editor bindings. */
import assert from 'node:assert/strict';import fs from 'node:fs';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{
 const c=await h.browser.newContext({viewport:{width:1024,height:768},hasTouch:true,locale:'sv-SE',serviceWorkers:'block'}),p=await c.newPage(),errors=[];p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));await p.goto(h.url);
 await p.evaluate(()=>{const draw=drawHistogram38;window.histogramRevision=0;window.currentHistogram=null;drawHistogram38=function(hist){window.currentHistogram=hist;histogramRevision++;return draw(hist);};});
 await p.locator('#imageFile').setInputFiles(['demo-negative.png','icon-192.png']);
 await p.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu'&&currentHistogram?.red&&!$('histogramInfo').textContent.includes('…'));
 const hiddenState=await p.evaluate(()=>JSON.stringify({state,rollShared,calibration}));
 for(const id of ['colorMode4','toneMode4','rawMode4']){
  assert.equal(await p.locator('#'+id).isVisible(),false,id+' must not appear in the normal editor');
  assert.equal(await p.locator('#'+id).evaluate(e=>!!e.closest('#diagnostics3')&&!!e.closest('#advancedSettings')),true);
 }
 assert.equal(await p.locator('#performanceSettings #previewBackend').count(),1);
 assert.equal(await p.evaluate(()=>JSON.stringify({state,rollShared,calibration})),hiddenState,'UI grouping does not mutate recipes');
 assert.equal(await p.evaluate(()=>$('frameSettingsGroup').closest('.tool-card')===$('calibration3')&&$('geometryTools').closest('.tool-card')===$('advancedSettings')),true);
 // Active controls are moved, never cloned; no second geometry section remains.
 assert.equal(await p.evaluate(()=>!document.getElementById('imageGeometry3')&&['rotateLeft','rotateRight','straighten','compositionEdit','geometryDone','rotationReset','compositionReset'].every(id=>document.querySelectorAll('#'+id).length===1&&!!document.querySelector('#imageTools3 #'+id))),true);
 assert.equal(await p.evaluate(()=>!!($('imageAdjustments').compareDocumentPosition($('calibration3'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
 const validate=async backend=>{
  const result=await p.evaluate(backend=>{
   const hist=currentHistogram,expected=NSPixelKernel.render(workingPreview,configuration38(),display==='split'?'positive':display,backend==='gpu'?160:Math.max(lastPreview38.width,lastPreview38.height)),step=Math.max(1,Math.floor(expected.width*expected.height/25000)),bins=Array.from({length:4},()=>Array(256).fill(0));let count=0;
   for(let n=0;n<expected.width*expected.height;n+=step){const i=n*4;for(let k=0;k<3;k++)bins[k][expected.data[i+k]]++;bins[3][Math.round(.2126*expected.data[i]+.7152*expected.data[i+1]+.0722*expected.data[i+2])]++;count++;}
   return {actual:['red','green','blue','luminance'].map(k=>Array.from(hist[k])),bins,count,samples:hist.samples,label:$('histogramInfo').textContent,clip:$('histogramClipping').textContent,rgba:Array.from($('histogram').getContext('2d').getImageData(0,0,384,112).data)};
  },backend);
  assert.deepEqual(result.actual,result.bins,backend+' histogram describes the final edited RGB8 preview');assert.equal(result.samples,result.count);
  assert.ok(result.rgba.some((v,i)=>i%4===3&&v>0));assert.match(result.clip,/R .*G .*B /);return result;
 };
 await validate('gpu');const before=await p.evaluate(()=>JSON.stringify(currentHistogram.luminance)),revision=await p.evaluate(()=>histogramRevision);
 await p.locator('#exposure').fill('750');await p.locator('#exposure').dispatchEvent('input');await p.locator('#exposure').dispatchEvent('change');
 await p.waitForFunction(n=>histogramRevision>n&&!$('histogramInfo').textContent.includes('…'),revision);assert.notEqual(await p.evaluate(()=>JSON.stringify(currentHistogram.luminance)),before);assert.equal(await p.evaluate(()=>state.exposure),1);await validate('gpu');
 for(const [tab,label]of [['tabNeg','Negativ · RGB + luminans'],['tabSplit','Jämförelse · positiv'],['tabPos','Positiv · RGB + luminans']]){
  const n=await p.evaluate(()=>histogramRevision);await p.locator('#'+tab).click();await p.waitForFunction(({n,label})=>histogramRevision>n&&$('histogramInfo').textContent===label,{n,label});await validate('gpu');
 }
 const first=await p.evaluate(()=>JSON.stringify(currentHistogram.luminance)),n=await p.evaluate(()=>histogramRevision);await p.evaluate(()=>chooseFrame(1));await p.waitForFunction(n=>!rollLoading&&histogramRevision>n&&currentHistogram?.red&&!$('histogramInfo').textContent.includes('…'),n);assert.notEqual(await p.evaluate(()=>JSON.stringify(currentHistogram.luminance)),first);await validate('gpu');
 // The diagnostic switch still exercises the real CPU worker; no user preference migration.
 await selectBackend(p,'cpu');await p.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='cpu'&&!workerBusy38&&!queued38&&lastPreview38?.histogram);await validate('cpu');
 for(const tab of ['tabNeg','tabSplit','tabPos']){const n=await p.evaluate(()=>histogramRevision);await p.locator('#'+tab).click();await p.waitForFunction(n=>histogramRevision>n&&!workerBusy38&&!queued38,n);await validate('cpu');}
 // Worker-free fallback also reports the positive in comparison view.
 await p.evaluate(()=>{stopPreviewWork();workerDisabled38=true;setDisplay('split');});await p.waitForFunction(()=>currentHistogram?.red&&lastPreview38?.positive);await validate('cpu');
 for(const [lang,label]of [['en','Black / white'],['fr','Noir / blanc'],['es','Negro / blanco'],['de','Schwarz / Weiß'],['sv','Svart / vitt']]){
  await selectLanguage(p,lang);await p.waitForFunction(label=>$('histogramClipping').textContent.startsWith(label),label);
 }
 // Keep the same controls, reset semantics, footer and two-column tablet layout.
 await p.evaluate(()=>{setDisplay('positive');$('reset').click();});assert.equal(await p.evaluate(()=>state.exposure),0);
 const advancedWasOpen=await p.locator('#advancedSettings').evaluate(e=>e.open);
 await p.locator('#straighten').click();await p.waitForFunction(()=>FILMLABB_GEOMETRY.mode()==='straighten'&&$('geometryTools').open);
 assert.equal(await p.locator('#imageTools3 #geometryDone').isVisible(),true,'finish stays reachable beside the photograph');
 assert.equal(await p.locator('#advancedSettings').evaluate(e=>e.open),advancedWasOpen,'floating image tools preserve advanced panel state');
 await p.locator('#geometryDone').click();
 for(const [width,height]of [[1440,900],[1024,768],[820,1180],[390,844]]){
  await p.setViewportSize({width,height});for(const id of ['exposure','contrast','saturation','reset']){await p.locator('#'+id).scrollIntoViewIfNeeded();assert.equal(await p.locator('#'+id).evaluate(e=>{const b=e.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return hit===e||e.contains(hit);}),true,id+' touch target');}
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);assert.equal(await p.locator('body > footer.foot').count(),1);
 }
 await p.evaluate(()=>{$('clearQueue').click();});assert.equal(await p.locator('#histogramClipping').textContent(),'');assert.equal(await p.locator('#histogramInfo').textContent(),'Ingen bild');
 assert.deepEqual(errors,[]);await c.close();
 // Public screenshots use only the repository's existing synthetic demo image.
 const shots=process.env.FILMLABB_UI_SCREENSHOTS;if(shots){fs.mkdirSync(shots,{recursive:true});for(const [name,width,height]of [['ipad-landscape',1024,768],['ipad-portrait',820,1180]]){const context=await h.browser.newContext({viewport:{width,height},hasTouch:true,locale:'sv-SE',serviceWorkers:'block'}),page=await context.newPage();await page.goto(h.url);await page.locator('#imageFile').setInputFiles('demo-negative.png');await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu'&&!$('histogramInfo').textContent.includes('…'));await page.screenshot({path:shots+'/'+name+'.png'});await context.close();}}
 console.log('PASS RGB/luminance after edits/image switching, positive/negative/comparison, GPU idle worker/CPU worker/no-worker fallback, clipping, hidden live diagnostics, reset, touch viewports, footer and no JavaScript errors');
}finally{await h.close();}
