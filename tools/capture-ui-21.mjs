// Real application screenshots using the existing public demo, never private RAFs.
import fs from 'node:fs';
import {browserHarness} from '../tests/helpers/browser.mjs';
const phase=process.argv[2]||'after',dir=`docs/ui-2.1/${phase}`;
fs.mkdirSync(dir,{recursive:true});
const h=await browserHarness();
try{
 for(const [name,width,height,touch] of [['desktop',1440,900,false],['ipad-landscape',1024,768,true],['ipad-portrait',768,1024,true],['mobile',390,844,true]]){
  const c=await h.browser.newContext({viewport:{width,height},hasTouch:touch,locale:'sv-SE',serviceWorkers:'block'}),p=await c.newPage();
  await p.goto(h.url);await p.locator('#imageFile').setInputFiles('demo-negative.png');await p.waitForFunction(()=>working&&!rollLoading);await p.waitForTimeout(600);
  await p.screenshot({path:`${dir}/${name}.png`});
  if(phase==='after'){
   if(name==='desktop'){
    await p.locator('#imageAdjustments').screenshot({path:`${dir}/card-open.png`});
    await p.locator('#imageAdjustments > summary').click();await p.locator('#imageAdjustments').screenshot({path:`${dir}/card-closed.png`});
    await p.screenshot({path:`${dir}/desktop-closed.png`});
    // Capture the document in place: scrolling triggers the existing workspace
    // height owner and can move the footer while a viewport clip is taken.
    await p.screenshot({path:`${dir}/footer.png`,fullPage:true});
    await p.evaluate(()=>window.scrollTo(0,0));
    // Uniform test images isolate toolbar readability; no private photographs.
    for(const [label,value]of [['light',.015],['dark',.92]]){
     await p.evaluate(value=>{const im=working;im.data.fill(im.data instanceof Uint8Array||im.data instanceof Uint8ClampedArray?Math.round(value*255):value);workingPreview=working;sourceVersion38++;config38=null;render();zoom=3;applyView();},value);
     await p.waitForTimeout(400);await p.locator('#picture').screenshot({path:`${dir}/toolbar-${label}.png`});
    }
    await p.locator('#zoomReset').click();await p.locator('#imageFile').setInputFiles('demo-negative.png');await p.waitForFunction(()=>working&&!rollLoading);
   }
   await p.evaluate(()=>FILMLABB_APPEARANCE.set('classic','light'));await p.screenshot({path:`${dir}/${name}-light.png`});
  }
  await c.close();
 }
}finally{await h.close();}
