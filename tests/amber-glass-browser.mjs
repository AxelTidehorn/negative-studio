import assert from 'node:assert/strict';import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{
 const p=await h.browser.newPage({viewport:{width:1440,height:900},locale:'sv-SE',serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(h.url);await p.locator('#imageFile').setInputFiles('demo-negative.png');await p.waitForFunction(()=>working&&!rollLoading&&!workerBusy38&&!queued38&&!$('histogramInfo').textContent.includes('…'));await p.waitForTimeout(250);
 const freeze=()=>p.evaluate(()=>{const r=NSPixelKernel.render(workingPreview,configuration38(),'positive',24);return {state:JSON.stringify({state,rollShared,calibration,region:frameRegion()}),source:sourceVersion38,analysis:analysisCount38,request:request38,pixels:Array.from(r.data),histogram:r.histogram,uploads:FILMLABB_GPU.snapshot().sourceUploads,canvases:document.querySelectorAll('canvas').length,thumbnails:Array.from(document.querySelectorAll('.frame img'),e=>e.src)};});
 const before=await freeze();
 const styles=async()=>{await p.waitForFunction(()=>!document.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations!==Infinity));return p.evaluate(()=>{
  const read=s=>{const c=getComputedStyle(document.querySelector(s));return {image:c.backgroundImage,color:c.backgroundColor,blur:c.backdropFilter,shadow:c.boxShadow,radius:c.borderRadius,padding:c.padding,animation:c.animationName,opacity:c.opacity,filter:c.filter};};
  return {workspace:read('#workspace'),editor:read('#adjustmentPanel'),housing:read('.image-panel'),header:read('#imageAdjustments > summary'),body:read('#imageAdjustments > .tool-card-body'),photo:read('#picture'),queue:read('#queuePanel'),overlay:read('#imageTools3'),thumbnail:read('.frame img'),backgroundToken:getComputedStyle(document.documentElement).getPropertyValue('--ui-workspace-material').trim()};
 });};
 // Measure real composite pixels behind text, including translucent material
 // and the SVG substrate. Hiding only glyph paint keeps the exact same layout.
 const headerContrast=async()=>{
  await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop=0);await styles();
  const probe=await p.locator('#imageAdjustments > summary').evaluate(e=>{const b=e.getBoundingClientRect(),parts=[...e.querySelectorAll('.card-title,.card-status')].filter(t=>getComputedStyle(t).visibility==='visible'&&t.getBoundingClientRect().height>0).map(t=>{const c=getComputedStyle(t),r=t.getBoundingClientRect(),saved={visibility:t.style.visibility,transition:t.style.transition};t.style.transition='none';t.style.visibility='hidden';return {cls:t.className,color:c.color,x:r.x-b.x,y:r.y-b.y,w:r.width,h:r.height,saved};});return {box:{x:b.x,y:b.y,width:b.width,height:b.height},parts};});
  const png=await p.screenshot({clip:probe.box});
  await p.locator('#imageAdjustments > summary').evaluate((e,parts)=>{for(const p of parts){const t=e.querySelector('.'+p.cls);t.style.visibility=p.saved.visibility;t.style.transition=p.saved.transition;}},probe.parts);
  return p.evaluate(async({url,parts})=>{const im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data,l=rgb=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);return parts.map(p=>{const f=l(p.color.match(/[\d.]+/g).slice(0,3).map(Number));let min=Infinity;for(let y=Math.ceil(p.y)+1;y<Math.min(c.height,p.y+p.h-1);y++)for(let x=Math.ceil(p.x)+1;x<Math.min(c.width,p.x+p.w-1);x++){const i=(y*c.width+x)*4,b=l([d[i],d[i+1],d[i+2]]);min=Math.min(min,(Math.max(f,b)+.05)/(Math.min(f,b)+.05));}return{cls:p.cls,contrast:min};});},{url:'data:image/png;base64,'+png.toString('base64'),parts:probe.parts});
 };
 const svgFor=s=>decodeURIComponent(s.backgroundToken.match(/url\('([^']+)'\)/)[1].split(',').slice(1).join(','));
 let darkSvg;
 for(const mode of ['dark','light']){
  await p.evaluate(mode=>FILMLABB_APPEARANCE.set(mode),mode);const m=await styles();
  assert.match(m.workspace.image,/data:image\/svg\+xml/);if(mode==='dark'){assert.match(m.header.image,/linear-gradient/);}else{assert.equal(m.header.image,'none','Light card header has no independent gradient');assert.equal(m.header.color,'rgba(235, 160, 55, 0.68)','Light card header uses the intended uniform amber tint');}assert.equal(m.header.opacity,'1');assert.equal(m.editor.color,'rgba(0, 0, 0, 0)');assert.equal(m.body.blur,'none');
  assert.equal(m.housing.color,m.queue.color,'outer image housing and queue share Smoke Workspace');assert.equal(m.housing.shadow,m.queue.shadow);assert.match(m.queue.color,/rgba\(/,'actual translucent fill, not parent opacity');
  assert.equal(m.queue.opacity,'1');assert.equal(m.queue.blur,'none');assert.equal(m.thumbnail.opacity,'1');assert.equal(m.thumbnail.filter,'none');assert.equal(m.thumbnail.blur,'none');
  const channels=m.photo.color.match(/[\d.]+/g).map(Number);assert.equal(channels[0],channels[1]);assert.equal(channels[1],channels[2]);assert.equal(channels[3]??1,1,'photographic aperture remains opaque neutral');assert.equal(m.photo.image,'none');assert.equal(m.photo.filter,'none');
  const bodyChannels=m.body.color.match(/[\d.]+/g).map(Number);assert.equal(bodyChannels[3]??1,1,'open card body stays solid');
  for(const open of [true,false]){await p.locator('#imageAdjustments').evaluate((e,open)=>e.open=open,open);const ratios=await headerContrast();console.log('Composite header contrast',mode,open?'open':'closed',ratios);assert.equal(ratios.length,open?1:2,'both title and visible caption are measured');for(const t of ratios)assert.ok(t.contrast>=4.5,mode+' '+t.cls+' composite contrast '+t.contrast);}await p.locator('#imageAdjustments').evaluate(e=>e.open=true);
  const svg=svgFor(m);assert.doesNotMatch(svg,/<animate|<script|feTurbulence/);assert.equal((svg.match(/<path\b/g)||[]).length,6);
  if(mode==='dark')darkSvg=svg;else assert.equal(svg.replace(/#[a-f\d]{6}/gi,'COLOR'),darkSvg.replace(/#[a-f\d]{6}/gi,'COLOR'),'Light changes only SVG colors, preserving every shape, placement, opacity and blur');
  const raster=await p.evaluate(async()=>{const style=getComputedStyle($('workspace')),url=getComputedStyle(document.documentElement).getPropertyValue('--ui-workspace-material').trim().match(/url\('([^']+)'\)/)[1],im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');c.width=340;c.height=220;const x=c.getContext('2d');x.drawImage(im,0,0,340,220);const d=x.getImageData(0,0,340,220).data;let lo=255,hi=0;for(let i=0;i<d.length;i+=4){lo=Math.min(lo,d[i]);hi=Math.max(hi,d[i]);}return {lo,hi,size:style.backgroundSize,repeat:style.backgroundRepeat,filter:style.filter};});
  assert.ok(raster.hi>raster.lo,'organic backdrop must render actual tonal variation');assert.equal(raster.size,'100% 100%');assert.equal(raster.repeat,'no-repeat');assert.equal(raster.filter,'none');
  await p.evaluate(()=>$('advancedSettings').open=true);await p.waitForTimeout(350);const anchored=await p.evaluate(()=>{const b=$('workspace').getBoundingClientRect();$('adjustmentPanel').scrollTop=250;return {top:b.top,image:getComputedStyle($('workspace')).backgroundImage};});assert.ok(await p.locator('#adjustmentPanel').evaluate(e=>e.scrollTop>0));assert.deepEqual(await p.evaluate(()=>({top:$('workspace').getBoundingClientRect().top,image:getComputedStyle($('workspace')).backgroundImage})),anchored);
 }
 assert.deepEqual(await freeze(),before,'mode changes do not mutate image/project settings, pixels, histogram, source uploads or render/analysis requests');
 const cdp=await p.context().newCDPSession(p);
 for(const mode of ['dark','light']){
  await p.evaluate(mode=>FILMLABB_APPEARANCE.set(mode),mode);
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});const m=await styles();assert.equal(m.header.blur,'none');assert.equal(m.header.image,'none');assert.equal(m.housing.color,m.queue.color);for(const key of ['queue','housing','header','overlay'])assert.equal(m[key].color.match(/[\d.]+/g).map(Number)[3]??1,1,key+' reduced transparency must be solid');
  await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});const forced=await styles();assert.equal(forced.workspace.image,'none');assert.equal(forced.header.image,'none');assert.equal(await p.locator('#histogram').evaluate(e=>getComputedStyle(e).forcedColorAdjust),'none','plot data keeps a controlled dark backing in forced colors');
  await cdp.send('Emulation.setEmulatedMedia',{features:[]});
 }
 assert.deepEqual(await freeze(),before);assert.deepEqual(errors,[]);console.log('PASS Amber Dark/Light organic geometry/color-only variant, shared translucent Smoke housing, solid neutral photograph and card content, stable backdrop, unchanged pixels/histogram/state, reduced transparency and forced colors');
}finally{await h.close();}
