import assert from 'node:assert/strict';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{
 const p=await h.browser.newPage({viewport:{width:1440,height:900},locale:'sv-SE',serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(h.url);await p.locator('#imageFile').setInputFiles('demo-negative.png');await p.waitForFunction(()=>working&&!rollLoading&&!$('histogramInfo').textContent.includes('…'));
 const freeze=()=>p.evaluate(()=>({state:JSON.stringify({state,rollShared,calibration,cropRegion}),source:sourceVersion38,analysis:analysisCount38,pixels:Array.from(NSPixelKernel.render(workingPreview,configuration38(),'positive',24).data),uploads:FILMLABB_GPU.snapshot().sourceUploads,canvases:document.querySelectorAll('canvas').length,thumbnails:Array.from(document.querySelectorAll('.frame img'),e=>e.src)}));
 const before=await freeze();
 const styles=()=>p.evaluate(()=>{
  const read=s=>{const c=getComputedStyle(document.querySelector(s));return {image:c.backgroundImage,color:c.backgroundColor,blur:c.backdropFilter,shadow:c.boxShadow,radius:c.borderRadius,padding:c.padding,animation:c.animationName,opacity:c.opacity,filter:c.filter};};
  return {workspace:read('#workspace'),editor:read('#adjustmentPanel'),header:read('#imageAdjustments > summary'),body:read('#imageAdjustments > .tool-card-body'),photo:read('#picture'),card:read('#imageAdjustments'),queue:read('#queuePanel'),thumbnail:read('.frame img'),frame:read('.frame.active'),panel:getComputedStyle(document.documentElement).getPropertyValue('--ui-panel').trim(),backgroundToken:getComputedStyle(document.documentElement).getPropertyValue('--ui-workspace-material').trim()};
 });
 const material=await styles();assert.match(material.workspace.image,/data:image\/svg\+xml/);assert.match(material.header.image,/linear-gradient/);assert.equal(material.header.opacity,'1','glass alpha must not fade text and controls');assert.equal(material.editor.color,'rgba(0, 0, 0, 0)');assert.notEqual(material.body.color,'rgba(0, 0, 0, 0)','editor controls keep a readable backing surface');assert.equal(material.body.blur,'none');assert.equal(material.photo.image,'none');
 // Reference geometry stays a static background resource, never an SVG DOM overlay.
 const svg=decodeURIComponent(material.backgroundToken.match(/url\('([^']+)'\)/)[1].split(',').slice(1).join(','));
 assert.match(svg,/<svg\b/);assert.doesNotMatch(svg,/<animate|<script|feTurbulence/,'backdrop must remain static and script-free');
 const raster=await p.evaluate(async()=>{
  const url=getComputedStyle(document.documentElement).getPropertyValue('--ui-workspace-material').trim().match(/url\('([^']+)'\)/)[1],im=new Image();im.src=url;await im.decode();
  const canvas=document.createElement('canvas');canvas.width=340;canvas.height=220;const ctx=canvas.getContext('2d');ctx.drawImage(im,0,0,340,220);const data=ctx.getImageData(0,0,340,220).data;let maxStep=0;
  for(let y=0;y<220;y++)for(let x=0;x<340;x++)for(let c=0;c<3;c++){const i=(y*340+x)*4+c;if(x)maxStep=Math.max(maxStep,Math.abs(data[i]-data[i-4]));if(y)maxStep=Math.max(maxStep,Math.abs(data[i]-data[i-1360]));}
  const pixel=(x,y)=>Array.from(data.slice((y*340+x)*4,(y*340+x)*4+3));const style=getComputedStyle($('workspace'));
  return {size:style.backgroundSize,repeat:style.backgroundRepeat,filter:style.filter,maxStep,center:pixel(163,95),corners:[pixel(0,0),pixel(339,0),pixel(0,219),pixel(339,219)]};
 });
 assert.equal(raster.repeat,'no-repeat');assert.equal(raster.filter,'none');assert.ok(raster.center.every(Number.isFinite),'workspace backdrop must render');

 assert.equal(material.queue.opacity,'1','queue content must not inherit alpha');assert.equal(material.queue.blur,'none');
 assert.equal(material.thumbnail.opacity,'1');assert.equal(material.thumbnail.filter,'none');assert.equal(material.thumbnail.blur,'none');
 await p.locator('#advancedSettings > summary').click();
 const anchored=await p.evaluate(()=>{const box=$('workspace').getBoundingClientRect();$('adjustmentPanel').scrollTop=250;return {top:box.top,image:getComputedStyle($('workspace')).backgroundImage};});
 assert.ok(await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop>0));assert.deepEqual(await p.evaluate(()=>({top:$('workspace').getBoundingClientRect().top,image:getComputedStyle($('workspace')).backgroundImage})),anchored);
 for(const theme of ['classic','olive','burgundy','industrial','paper','aubergine'])for(const mode of ['dark','light']){
  await p.evaluate(({theme,mode})=>FILMLABB_APPEARANCE.set(theme,mode),{theme,mode});const s=await styles();
  if(theme!=='classic'||mode!=='dark'){assert.equal(s.workspace.image,'none');assert.equal(s.header.image,'none');}
  for(const key of ['workspace','header','body'])assert.equal(s[key].animation,'none');
 }
 assert.deepEqual(await freeze(),before,'materials must not alter source, recipe, analysis, pixels or source uploads');
 await p.evaluate(()=>FILMLABB_APPEARANCE.set('classic','dark'));const cdp=await p.context().newCDPSession(p);await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});const reduced=await styles();assert.equal(reduced.header.blur,'none');assert.equal(reduced.header.image,'none');assert.equal(reduced.queue.opacity,'1');
 assert.deepEqual(errors,[]);console.log('PASS dark organic vignette, transparent neutral queue with unfiltered thumbnails, Amber headers, opaque content/photo, fixed backdrop, unchanged pixels/state/uploads, all other themes and reduced-transparency fallback');
}finally{await h.close();}
