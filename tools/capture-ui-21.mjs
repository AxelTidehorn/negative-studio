// Real application screenshots using the existing public demo, never private RAFs.
import fs from 'node:fs';
import {browserHarness} from '../tests/helpers/browser.mjs';
const captureImage=process.env.FILMLABB_CAPTURE_IMAGE||'demo-negative.png';
const phase=process.argv[2]||'after',dir=`${process.argv[3]||'docs/ui-2.1'}/${phase}`;
fs.mkdirSync(dir,{recursive:true});
const h=await browserHarness(),metrics=[];
try{
 for(const [name,width,height,touch] of [['desktop',1440,900,false],['ipad-landscape',1024,768,true],['ipad-portrait',768,1024,true],['mobile',390,844,true]]){
  const c=await h.browser.newContext({viewport:{width,height},hasTouch:touch,locale:'sv-SE',serviceWorkers:'block'}),p=await c.newPage();
  await p.goto(h.url);await p.locator('#imageFile').setInputFiles(captureImage);await p.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GEOMETRY.snapshot().draws>0&&!$('histogramInfo').textContent.includes('…'));if(process.env.FILMLABB_CAPTURE_SOURCE_VIEW){await p.locator('#tabNeg').click();await p.waitForFunction(()=>$('histogramInfo').textContent.includes('Negativ'));}
  await p.waitForTimeout(100);
  await p.screenshot({path:`${dir}/${name}.png`});
  if(phase==='after'||phase==='before'){
   if(name==='desktop'){
    await p.locator('#imageAdjustments').screenshot({path:`${dir}/card-open.png`});
    await p.locator('#imageAdjustments > summary').click();await p.locator('#imageAdjustments').screenshot({path:`${dir}/card-closed.png`});
    await p.screenshot({path:`${dir}/desktop-closed.png`});
    await p.locator('#creativeProfiles > summary').click();await p.screenshot({path:`${dir}/creative-open.png`});await p.locator('#creativeProfiles > summary').click();
    // Capture the document in place: scrolling triggers the existing workspace
    // height owner and can move the footer while a viewport clip is taken.
    await p.screenshot({path:`${dir}/footer.png`,fullPage:true});
    await p.evaluate(()=>window.scrollTo(0,0));
    // Uniform test images isolate toolbar readability; no private photographs.
    for(const [label,value]of [['light',.015],['dark',.92]]){
     await p.evaluate(value=>{const im=working;im.data.fill(im.data instanceof Uint8Array||im.data instanceof Uint8ClampedArray?Math.round(value*255):value);workingPreview=working;sourceVersion38++;config38=null;render();zoom=3;applyView();},value);
     await p.waitForTimeout(400);await p.locator('#picture').screenshot({path:`${dir}/toolbar-${label}.png`});
    }
    await p.locator('#zoomReset').click();await p.locator('#imageFile').setInputFiles(captureImage);await p.waitForFunction(()=>working&&!rollLoading&&!$('histogramInfo').textContent.includes('…'));
   }
   await p.evaluate(()=>FILMLABB_APPEARANCE.set('classic','light'));await p.screenshot({path:`${dir}/${name}-light.png`});
  }
  await p.evaluate(()=>FILMLABB_APPEARANCE.set('classic','dark'));
  metrics.push(await p.evaluate(async name=>{
   const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const ids=['imageAdjustments','creativeProfiles','calibration3','advancedSettings','exportProject'],states=ids.map(id=>$(id).open),cards={};
   for(const id of ids){const e=$(id),s=e.querySelector(':scope > summary'),body=e.querySelector(':scope > .tool-card-body');e.open=true;await frame();cards[id]={openHeight:e.getBoundingClientRect().height,headerHeight:s.getBoundingClientRect().height,padding:getComputedStyle(body).padding};e.open=false;await frame();cards[id].closedHeight=e.getBoundingClientRect().height;}
   $('imageAdjustments').open=true;await frame();
   const row=id=>$(id).closest('.control').getBoundingClientRect(),a=row('exposure'),b=row('contrast');
   const result={name,cards,rowHeight:a.height,rowPitch:b.top-a.top,sliderHeight:$('exposure').getBoundingClientRect().height,panelWidth:$('adjustmentPanel').getBoundingClientRect().width,pictureWidth:$('picture').getBoundingClientRect().width};
   ids.forEach((id,i)=>$(id).open=states[i]);return result;
  },name));
  await c.close();
 }
 fs.writeFileSync(`${dir}/metrics.json`,JSON.stringify(metrics,null,2)+'\n');
}finally{await h.close();}
