import assert from 'node:assert/strict';
import {browserHarness,selectEngine} from './helpers/browser.mjs';

// The build/suite owner prepares site/. --probe records the frozen baseline.
const probe=process.argv.includes('--probe'),h=await browserHarness(),errors=[];
try{
 const page=await h.browser.newPage({viewport:{width:1024,height:1000},locale:'sv-SE',hasTouch:true});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url);
 const empty=await page.evaluate(()=>({left:$('rotateLeft').disabled,right:$('rotateRight').disabled}));
 await page.locator('#previewBackend').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});await page.locator('#previewBackend').selectOption('cpu');
 await page.locator('#imageFile').setInputFiles('tests/fixtures/synthetic-negative.dng');await page.waitForFunction(()=>working&&!rollLoading);
 await selectEngine(page,'v2');await page.waitForFunction(()=>state.engine==='v2'&&!!state.v2Recipe&&!rollLoading);
 await page.waitForFunction(()=>!workerBusy38&&!queued38&&previewCompletedKey===JSON.stringify([sourceVersion38,display,1400,configuration38()]));
 const descriptions={sv:await page.locator('#methodDescription3').textContent()};
 for(const language of ['en','fr','es','de']){
  await page.locator('#languageSelect').selectOption(language);descriptions[language]=await page.locator('#methodDescription3').textContent();
  const label=await page.evaluate(()=>{updateCalibrationUI();return {actual:$('engineMode').querySelector('[value="v2"]').textContent,expected:FILMLABB_I18N.fromSource('V2 · standard')};});
  if(!probe)assert.equal(label.actual,label.expected,'V2 option remains localized after controller refresh in '+language);
 }
 for(const viewport of [{width:1440,height:900},{width:820,height:1180},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  assert.equal(await page.locator('footer.foot').count(),1,'footer remains in the document');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow at '+viewport.width);
 }
 await page.setViewportSize({width:1024,height:1000});
 await page.locator('#languageSelect').selectOption('en');
 const failed=await page.evaluate(async()=>{const read=readFile;readFile=async()=>{throw Error('INTENTIONAL_UI_IMPORT_FAILURE');};try{await chooseFrame(activeFrame,{force:true});return {empty:!working,histogram:$('histogramInfo').textContent};}finally{readFile=read;}});
 await page.evaluate(()=>chooseFrame(activeFrame,{force:true}));await page.waitForFunction(()=>working&&!rollLoading&&!workerBusy38&&!queued38&&previewCompletedKey===JSON.stringify([sourceVersion38,display,1400,configuration38()]));
 const busyNoop=await page.evaluate(()=>{const worker=previewWorker38,result=lastPreview38;rollLoading=true;try{$('clearQueue').onclick();return {source:!!working,worker:worker===previewWorker38,result:result===lastPreview38};}finally{rollLoading=false;nextControls();}});
 await page.evaluate(()=>{const worker=previewWorker38;window.previewTerminations=0;const terminate=worker.terminate.bind(worker);worker.terminate=()=>{previewTerminations++;terminate();};scheduleRender();$('clearQueue').click();});
 await page.waitForTimeout(750);
 const cleared=await page.evaluate(()=>({empty:!working&&!roll.length,worker:previewWorker38===null,result:lastPreview38===null,busy:workerBusy38,queued:queued38===null,tick:previewTick38===null,idle:dragTimer38===null,terminated:previewTerminations,rotation:[$('rotateLeft').disabled,$('rotateRight').disabled],histogram:$('histogramInfo').textContent,histogramEmpty:!$('histogram').getContext('2d').getImageData(0,0,$('histogram').width,$('histogram').height).data.some(v=>v!==0)}));
 await page.evaluate(()=>FILMLABB_APPEARANCE.set('paper','light'));
 await page.waitForTimeout(30);const afterTheme=await page.locator('#histogramInfo').textContent();
 if(probe){console.log(JSON.stringify({empty,descriptions,failed,busyNoop,cleared,afterTheme,errors},null,2));}
 else{
  assert.deepEqual(empty,{left:true,right:true},'rotation controls unavailable without an image');
  for(const [language,text]of Object.entries(descriptions)){assert.match(text,/^V2/,'V2 explanation in '+language);assert.doesNotMatch(text,/Äldre projekt|Legacy project/);}
  assert.deepEqual(failed,{empty:true,histogram:'No image'},'failed import cannot retain old histogram');
  assert.deepEqual(busyNoop,{source:true,worker:true,result:true},'blocked clear preserves valid source and preview');
  assert.deepEqual(cleared,{empty:true,worker:true,result:true,busy:false,queued:true,tick:true,idle:true,terminated:1,rotation:[true,true],histogram:'No image',histogramEmpty:true});
  assert.equal(afterTheme,'No image','appearance refresh does not revive the old histogram');assert.deepEqual(errors,[]);
  console.log('PASS localized V2 method status, empty rotation controls, busy clear no-op, CPU worker/timer/cache release and empty histogram across theme changes');
 }
}finally{await h.close();}
