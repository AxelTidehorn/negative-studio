import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';
import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const app=await browserHarness();fs.mkdirSync('docs/filmbas2/screenshots',{recursive:true});
try{
 for(const [name,width,height,touch]of [['desktop',1360,950,false],['ipad-landscape',1024,768,true],['ipad-portrait',768,1024,true],['mobile',390,844,true]]){
  const page=await app.browser.newPage({viewport:{width,height},hasTouch:touch,isMobile:touch,serviceWorkers:'block',locale:'sv-SE'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);await page.goto(app.url);
  const png=await page.evaluate(async()=>{const c=document.createElement('canvas');c.width=480;c.height=320;const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const border=x<60||x>=420||y<40||y>=280,t=border?1:.15+.5*(x+y)/800;for(let k=0;k<3;k++)im.data[(y*c.width+x)*4+k]=Math.round(255*NSColorEngine.encode([.8,.5,.25][k]*t));im.data[(y*c.width+x)*4+3]=255;}ctx.putImageData(im,0,0);return Array.from(new Uint8Array(await(await new Promise(r=>c.toBlob(r))).arrayBuffer()));});
  await page.locator('#imageFile').setInputFiles({name:'synthetic-negative.png',mimeType:'image/png',buffer:Buffer.from(png)});await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GEOMETRY.snapshot().draws>0);
  await page.locator('#base2Panel').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
  await page.evaluate(()=>{const d=document.getElementById('rollCalibration3');if(d)d.open=true;});await page.locator('#base2Session').fill('synthetic-session');await page.locator('#base2Session').dispatchEvent('change');
  await page.locator('#base2Enable').click();await page.waitForFunction(()=>FILMLABB_BASE2.snapshot().proposal);assert.ok(await page.evaluate(()=>FILMLABB_BASE2.snapshot().proposal.measurement.measured));
  const acceptedBefore=await page.evaluate(()=>state.acceptedCalibration2||null);assert.equal(acceptedBefore,null);
  await page.locator('#base2Region').click();await page.waitForFunction(()=>FILMLABB_GEOMETRY.mode()==='base'&&display==='negative');
  // Source-space endpoints pass through exactly the same geometry transform as the overlay.
  const points=await page.evaluate(()=>{const b=$('picture').getBoundingClientRect();return [.02,.10].map((x,i)=>{const p=FILMLABB_GEOMETRY.sourceToView({x:x*working.width,y:(i?.65:.25)*working.height});return {x:p.x+b.left,y:p.y+b.top};});});
  if(touch){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[points[0]]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:points[0].x+(points[1].x-points[0].x)*i/5,y:points[0].y+(points[1].y-points[0].y)*i/5}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await page.mouse.move(points[0].x,points[0].y);await page.mouse.down();await page.mouse.move(points[1].x,points[1].y,{steps:5});await page.mouse.up();}
  await page.waitForFunction(()=>FILMLABB_BASE2.snapshot().proposal?.measurement.kind==='manual-region');const measurement=await page.evaluate(()=>FILMLABB_BASE2.snapshot().proposal.measurement);assert.equal(measurement.status,'safe');assert.ok(measurement.samples>=16);assert.equal(await page.locator('#base2Loupe').isVisible(),true);
  // Move the rectangle, then resize a corner using actual pointer capture.
  if(!touch){const body=await page.locator('#base2Overlay polygon').boundingBox();await page.mouse.move(body.x+body.width/2,body.y+body.height/2);await page.mouse.down();await page.mouse.move(body.x+body.width/2+3,body.y+body.height/2+4,{steps:3});await page.mouse.up();const old=await page.evaluate(()=>baseRegion2.w),corner=await page.locator('#base2Overlay circle').nth(2).boundingBox();await page.mouse.move(corner.x+14,corner.y+14);await page.mouse.down();await page.mouse.move(corner.x+16,corner.y+20,{steps:3});await page.mouse.up();assert.notEqual(await page.evaluate(()=>baseRegion2.w),old);}
  await page.screenshot({path:`docs/filmbas2/screenshots/${name}-sample.png`});
  await page.locator('#base2Preview').click();assert.equal(await page.evaluate(()=>FILMLABB_BASE2.snapshot().preview),true);await page.locator('#base2Preview').click();assert.equal(await page.evaluate(()=>FILMLABB_BASE2.snapshot().preview),false);
  await page.locator('#base2Accept').click();await page.waitForFunction(()=>state.acceptedCalibration2?.baseLocked);const reference=await page.evaluate(()=>JSON.stringify(state.acceptedCalibration2));
  await page.evaluate(()=>{cropRegion={x:.2,y:.2,w:.6,h:.6};cropChanged();});assert.equal(await page.evaluate(()=>JSON.stringify(state.acceptedCalibration2)),reference);
  await page.locator('#base2Enable').click();await page.waitForFunction(()=>FILMLABB_BASE2.snapshot().proposal);assert.equal(await page.locator('#base2Accept').isDisabled(),true);assert.equal(await page.evaluate(()=>JSON.stringify(state.acceptedCalibration2)),reference);
  await page.locator('#base2Cancel').click();
  const n=await page.evaluate(()=>analysisCount38);await page.evaluate(()=>$('themeToggle').click());assert.equal(await page.evaluate(()=>analysisCount38),n);assert.equal(await page.locator('footer.foot').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:`docs/filmbas2/screenshots/${name}-accepted.png`});
  if(name==='desktop'){
   const parity=await page.evaluate(async()=>{
    const saved=state.engine,results=[];downloadBlob=()=>{};
    for(const engine of ['log39','calibrated4','curve3','density3','matrix3']){
     state.engine=engine;analyzeLevels();const c=configuration38(),kernel=NSPixelKernel.compile(c);let max=0,gpuTested=false;
     if(NSGpuPreview.supports(c)){const canvas=document.createElement('canvas'),gpu=NSGpuPreview.create(canvas);gpu.draw(working,c,'positive',480,sourceVersion38);const pixels=gpu.read();for(let y=0;y<working.height;y+=7)for(let x=0;x<working.width;x+=7){const p=kernel.pixel(CE.pixel(working,x,y));for(let k=0;k<3;k++)max=Math.max(max,Math.abs(pixels.data[(y*working.width+x)*4+k]-Math.round(p[k]*255)));}gpu.destroy();gpuTested=true;}
     let output;downloadBlob=b=>output=b;await exportTiff();const tiff=await NSTiff.decode(await output.arrayBuffer());const jpeg=await jpegBytes();results.push({engine,max,gpuTested,tiffValid:tiff.width>0&&tiff.height>0,jpegValid:jpeg[0]===255&&jpeg[1]===216});
    }state.engine=saved;analyzeLevels();render();return results;
   });assert.ok(parity.every(r=>r.max<=2&&r.tiffValid&&r.jpegValid),JSON.stringify(parity));console.log('PASS v2 five engine TIFF/JPEG exports and supported GPU/CPU parity',JSON.stringify(parity));
   await page.locator('#shareBase').click();assert.equal(await page.evaluate(()=>state.useRollBase2),true);
   const project=await page.evaluate(async()=>{let b;downloadBlob=x=>b=x;$('saveSettings').onclick();return JSON.parse(await b.text());});assert.ok(project.sharedBase2);
   await page.locator('#settingsFile').setInputFiles({name:'v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('matchades'));assert.equal(await page.evaluate(()=>JSON.stringify(state.acceptedCalibration2)),reference);assert.equal(await page.evaluate(()=>!!accepted2()),true);
   await page.evaluate(()=>{const d=document.getElementById('rollCalibration3');if(d)d.open=true;});await page.locator('#base2Session').fill('different-light-session');await page.locator('#base2Session').dispatchEvent('change');assert.equal(await page.evaluate(()=>accepted2()),null);assert.match(await page.locator('#base2Status').textContent(),/pausad/);
  }
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${name}: automatic proposal, ${touch?'touch':'mouse'} rectangle, source loupe, before/after, accept/lock, ROI stability, theme/footer/layout`);
 }
}finally{await app.close();}
