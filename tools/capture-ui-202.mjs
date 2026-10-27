// Reuses the production build and existing browser harness. Run before/after on the same fixture.
import fs from 'node:fs';
import {browserHarness} from '../tests/helpers/browser.mjs';
const phase=process.argv[2]||'after',dir=`docs/ui-ux-2.0.2/${phase}`;
fs.mkdirSync(dir,{recursive:true});
const h=await browserHarness();
try {
 const metrics=[];
 for(const [name,width,height,touch] of [['desktop',1440,900,false],['ipad-landscape',1024,768,true],['ipad-portrait',768,1024,true],['mobile',390,844,true]]) {
  const c=await h.browser.newContext({viewport:{width,height},hasTouch:touch,locale:'sv-SE',serviceWorkers:'block'}),p=await c.newPage();
  await p.goto(h.url);await p.locator('#imageFile').setInputFiles('demo-negative.png');await p.waitForFunction(()=>working&&!rollLoading);await p.waitForTimeout(500);
  await p.screenshot({path:`${dir}/${name}.png`});
  metrics.push(await p.evaluate(name=>({name,picture:{width:$('picture').clientWidth,height:$('picture').clientHeight},workspace:$('workspace').clientHeight,scrollHeight:document.documentElement.scrollHeight}),name));
  if(name==='desktop') for(const theme of ['classic','olive','burgundy','industrial','paper','aubergine']) {
   await p.evaluate(t=>FILMLABB_APPEARANCE.set(t,'dark'),theme);await p.screenshot({path:`${dir}/${theme}.png`});
  }
  if(phase==='after'&&name==='desktop') {
   await p.evaluate(()=>FILMLABB_APPEARANCE.set('classic','dark'));
   await p.locator('#toggleFocus').click();await p.evaluate(()=>window.scrollTo(0,52));await p.waitForTimeout(200);
   await p.screenshot({path:`${dir}/focus-scrolled.png`});
   await p.locator('footer').scrollIntoViewIfNeeded();await p.screenshot({path:`${dir}/footer.png`});
  }
  await c.close();
 }
 fs.writeFileSync(`${dir}/metrics.json`,JSON.stringify(metrics,null,2));
} finally {await h.close();}
