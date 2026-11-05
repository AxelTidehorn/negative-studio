import assert from 'node:assert/strict';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{
 const p=await h.browser.newPage({viewport:{width:1440,height:900},locale:'sv-SE',serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(h.url);await p.locator('#imageFile').setInputFiles('demo-negative.png');await p.waitForFunction(()=>working&&!rollLoading&&!$('histogramInfo').textContent.includes('…'));
 const freeze=()=>p.evaluate(()=>({state:JSON.stringify({state,rollShared,calibration,cropRegion}),source:sourceVersion38,analysis:analysisCount38,pixels:Array.from(NSPixelKernel.render(workingPreview,configuration38(),'positive',24).data),uploads:FILMLABB_GPU.snapshot().sourceUploads,canvases:document.querySelectorAll('canvas').length}));
 const before=await freeze();
 const styles=()=>p.evaluate(()=>{
  const read=s=>{const c=getComputedStyle(document.querySelector(s));return {image:c.backgroundImage,color:c.backgroundColor,blur:c.backdropFilter,shadow:c.boxShadow,radius:c.borderRadius,padding:c.padding,animation:c.animationName};};
  return {workspace:read('#workspace'),editor:read('#adjustmentPanel'),header:read('#imageAdjustments > summary'),body:read('#imageAdjustments > .tool-card-body'),photo:read('#picture'),card:read('#imageAdjustments')};
 });
 const material=await styles();assert.equal((material.workspace.image.match(/radial-gradient/g)||[]).length,4);assert.match(material.header.image,/linear-gradient/);assert.equal(material.header.blur,'blur(10px)');assert.notEqual(material.header.shadow,'none');assert.equal(material.editor.color,'rgba(0, 0, 0, 0)');assert.equal(material.body.color,'rgb(23, 18, 16)');assert.equal(material.body.image,'none');assert.equal(material.body.blur,'none');assert.equal(material.body.shadow,'none');assert.equal(material.body.padding,'6px');assert.equal(material.card.radius,'6px');assert.equal(material.photo.image,'none');
 await p.locator('#advancedSettings > summary').click();
 const anchored=await p.evaluate(()=>{const box=$('workspace').getBoundingClientRect();$('adjustmentPanel').scrollTop=250;return {top:box.top,image:getComputedStyle($('workspace')).backgroundImage};});
 assert.ok(await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop>0));assert.deepEqual(await p.evaluate(()=>({top:$('workspace').getBoundingClientRect().top,image:getComputedStyle($('workspace')).backgroundImage})),anchored);
 for(const theme of ['classic','olive','burgundy','industrial','paper','aubergine'])for(const mode of ['dark','light']){
  await p.evaluate(({theme,mode})=>FILMLABB_APPEARANCE.set(theme,mode),{theme,mode});const s=await styles();
  if(theme!=='classic'||mode!=='dark'){assert.equal(s.workspace.image,'none');assert.equal(s.header.image,'none');assert.equal(s.card.shadow,'none');}
  for(const key of ['workspace','header','body'])assert.equal(s[key].animation,'none');
 }
 assert.deepEqual(await freeze(),before,'materials must not alter source, recipe, analysis, pixels or source uploads');
 await p.evaluate(()=>FILMLABB_APPEARANCE.set('classic','dark'));const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});const reduced=await styles();assert.equal(reduced.header.blur,'none');assert.equal(reduced.header.image,'none');
 assert.deepEqual(errors,[]);console.log('PASS scoped Amber material, opaque content/photo, fixed workspace under editor scroll, unchanged pixels/state/uploads, all other themes and reduced-transparency fallback');
}finally{await h.close();}
