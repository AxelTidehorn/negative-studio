import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {chromium} from 'playwright';
const root=path.resolve('site'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png'};
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,p=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block',locale:'sv-SE'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(60000);
 await page.goto(url);const buffer=fs.readFileSync('demo-negative.png');await page.locator('#imageFile').setInputFiles([{name:'a.png',mimeType:'image/png',buffer},{name:'b.png',mimeType:'image/png',buffer}]);
 await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GEOMETRY.snapshot().draws>0);
 assert.deepEqual(errors,[]);console.log('PASS Beta 6 imports and presents cached GPU color');
 const parity=await page.evaluate(()=>{
  const source=document.createElement('canvas');source.width=9;source.height=7;const cx=source.getContext('2d'),data=new ImageData(9,7);for(let i=0;i<data.data.length;i++)data.data[i]=i%4===3?255:(i*37+17)%256;cx.putImageData(data,0,0);
  const c=document.createElement('canvas'),gpu=NSPreviewPresentation.create(c),gl=c.getContext('webgl2');gpu.upload(source);let max=0,cases=0;
  const im={width:9,height:7,channels:4,scale:255,data:data.data},prepared={pixel:i=>[im.data[i]/255,im.data[i+1]/255,im.data[i+2]/255]};
  for(const q of [0,1,2,3])for(const fine of [-15,-2,-.1,0,.1,2,15])for(const crop of [false,true]){
   const g=NSGeometry.create(q*90);g.rotation.fineDegrees=fine;const region={x:1/9,y:1/7,w:7/9,h:5/7},p=NSGeometry.compositionTransform(9,7,g,{cropExportToFrame:crop,analysisFrame:region});p.sourceWidth=9;p.sourceHeight=7;
   const b=NSGeometry.pixelBounds(9,7,crop?region:null),w=p.output.width,h=p.output.height;gpu.draw(p,w,h,b);const raw=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,raw);
   const scalar=NSPreviewPresentation.cpu(data,p,w,h,b),eg=NSPresentation.plan(im,g,crop,region),reference=NSPresentation.rgba(im,prepared,eg,eg,0,eg.height);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let k=0;k<3;k++){const i=(y*w+x)*4+k;max=Math.max(max,Math.abs(raw[((h-1-y)*w+x)*4+k]-reference[i]),Math.abs(scalar.data[i]-reference[i]));}cases++;
  }
  const neg=document.createElement('canvas');neg.width=9;neg.height=7;neg.getContext('2d').fillRect(0,0,9,7);gpu.upload(neg,true);
  const g=NSGeometry.create(90);g.rotation.fineDegrees=2;const p=NSGeometry.compositionTransform(9,7,g);p.sourceWidth=9;p.sourceHeight=7;const w=p.output.width,h=p.output.height,b=NSGeometry.pixelBounds(9,7,null);gpu.draw(p,w,h,b,true);const raw=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,raw);const expected=NSPreviewPresentation.cpu(data,p,w,h,b,neg.getContext('2d').getImageData(0,0,9,7));for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let k=0;k<3;k++)max=Math.max(max,Math.abs(raw[((h-1-y)*w+x)*4+k]-expected.data[(y*w+x)*4+k]));
  gpu.destroy();return {max,cases};
 });
 assert.ok(parity.max<=2,JSON.stringify(parity));console.log('PASS 56 GPU/CPU cached display geometries match export sampling within two 8-bit levels');

 await page.locator('#geometryTools').evaluate(el=>el.open=true);
 const before=await page.evaluate(()=>({color:JSON.stringify({base,calibration,state,sharedResponse4,cropRegion}),analyses:analysisCount38,uploads:FILMLABB_GPU.snapshot().sourceUploads,frames:FILMLABB_GPU.snapshot().frames,colorUploads:FILMLABB_GEOMETRY.snapshot().colorUploads}));
 await page.locator('#fineRotation').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.waitForFunction(()=>roll[0].geometry.rotation.fineDegrees===2&&FILMLABB_GEOMETRY.snapshot().draws>1);
 const after=await page.evaluate(()=>({color:JSON.stringify({base,calibration,state,sharedResponse4,cropRegion}),analyses:analysisCount38,uploads:FILMLABB_GPU.snapshot().sourceUploads,frames:FILMLABB_GPU.snapshot().frames,colorUploads:FILMLABB_GEOMETRY.snapshot().colorUploads}));assert.deepEqual(after,before);
 const dimensions=await page.evaluate(async()=>{let b;downloadBlob=v=>b=v;await exportTiff();const t=await NSTiff.decode(await b.arrayBuffer()),j=await createImageBitmap(new Blob([await jpegBytes()],{type:'image/jpeg'})),p=FILMLABB_GEOMETRY.plan();return {t:[t.width,t.height],j:[j.width,j.height],p:[p.output.width,p.output.height]};});assert.deepEqual(dimensions.t,dimensions.p);assert.deepEqual(dimensions.j,dimensions.p);
 console.log('PASS UI free rotation uses export geometry and performs no analysis, color render or source upload');
 await page.locator('#rotationDegrees').fill('-15');await page.locator('#rotationDegrees').dispatchEvent('change');assert.equal(await page.evaluate(()=>roll[0].geometry.rotation.fineDegrees),-15);
 await page.locator('#compositionEnabled').check();await page.waitForFunction(()=>FILMLABB_GEOMETRY.mode()==='composition');
 const handle=page.locator('[data-composition="2"]');await handle.waitFor({state:'visible'});const box=await handle.evaluate(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};});assert.ok(box);await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-70,box.y-50,{steps:5});await page.mouse.up();
 const crop=await page.evaluate(()=>({...roll[0].geometry.compositionCrop}));assert.ok(crop.w>0&&crop.h>0);await page.locator('#geometryDone').click();assert.equal(await page.evaluate(()=>FILMLABB_GEOMETRY.mode()),null);
 const colorBeforeGrid=await page.evaluate(()=>JSON.stringify({calibration,base,cropRegion}));await page.locator('#thirdsGrid').check();await page.waitForFunction(()=>document.querySelectorAll('#geometryOverlay .grid-line').length===4);assert.equal(await page.locator('#geometryOverlay .grid-line').count(),4);
 const gridBytes=await page.evaluate(async()=>{let b;downloadBlob=v=>b=v;await exportTiff();const a=Array.from(new Uint8Array(await b.arrayBuffer()));$('thirdsGrid').checked=false;$('thirdsGrid').dispatchEvent(new Event('change'));await exportTiff();return {same:JSON.stringify(a)===JSON.stringify(Array.from(new Uint8Array(await b.arrayBuffer()))),color:JSON.stringify({calibration,base,cropRegion})};});assert.equal(gridBytes.same,true);assert.equal(gridBytes.color,colorBeforeGrid);
 console.log('PASS mouse composition handles are independent of analysis; thirds grid never enters exported pixels');
 const mapping=await page.evaluate(()=>{zoom=1.5;panX=17;panY=-11;applyView();const p=FILMLABB_GEOMETRY.plan(),s=p.inverse({x:.5,y:.5}),b=$('picture').getBoundingClientRect();$('originalDetail').onclick();return {x:b.x+b.width/2+panX,y:b.y+b.height/2+panY,expected:{x:s.x/working.width,y:s.y/working.height},analyses:analysisCount38,source:[working.width,working.height]};});
 await page.mouse.click(mapping.x,mapping.y);const actualPoint=await page.evaluate(()=>({...detailAt,analyses:analysisCount38}));assert.ok(Math.abs(actualPoint.x-mapping.expected.x)*mapping.source[0]<1&&Math.abs(actualPoint.y-mapping.expected.y)*mapping.source[1]<1,JSON.stringify({actualPoint,mapping}));assert.equal(actualPoint.analyses,mapping.analyses);await page.locator('#detailClose').click();await page.locator('#zoomReset').click();
 console.log('PASS original loupe click maps through free rotation/composition/zoom/pan to the correct source point without analysis');

 await page.locator('#frameSettingsGroup').evaluate(el=>el.open=true);await page.waitForFunction(()=>FILMLABB_GEOMETRY.mode()==='frame');
 const line=page.locator('#geometryOverlay [data-side="left"]');await line.waitFor({state:'visible'});const lb=await line.evaluate(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};});assert.ok(lb);await page.mouse.move(lb.x+lb.width/2,lb.y+lb.height/2);await page.mouse.down();await page.mouse.move(lb.x+lb.width/2+15,lb.y+lb.height/2,{steps:4});await page.mouse.up();
 assert.equal(await page.evaluate(()=>state.cropMethod),'manual');const frame=await page.evaluate(()=>JSON.stringify(cropRegion));await page.locator('#frameSettingsGroup').evaluate(el=>el.open=false);await page.evaluate(async()=>{await chooseFrame(1,{force:true});await chooseFrame(0,{force:true});});assert.equal(await page.evaluate(()=>JSON.stringify(cropRegion)),frame);
 await page.locator('#frameSettingsGroup').evaluate(el=>el.open=true);await page.locator('#cropExport').check();assert.equal(await page.evaluate(()=>rollShared.cropExportToFrame),true);await page.locator('#frameSettingsGroup').evaluate(el=>el.open=false);
 const project=await page.evaluate(async()=>{let b;downloadBlob=v=>b=v;$('saveSettings').onclick();return JSON.parse(await b.text());});assert.equal(project.roll.cropExportToFrame,true);assert.equal(project.frames[0].settings.cropMethod,'manual');assert.equal(project.frames[0].geometry.rotation.fineDegrees,-15);assert.ok(project.frames[0].geometry.compositionCrop);
 await page.locator('#settingsFile').setInputFiles({name:'beta6.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('matchades'));
 assert.deepEqual(await page.evaluate(()=>roll[0].geometry.compositionCrop),project.frames[0].geometry.compositionCrop);assert.equal(await page.evaluate(()=>rollShared.cropExportToFrame),true);
 console.log('PASS manual technical frame survives image switch and project reload; geometry and queue limit round-trip');
 await page.locator('#geometryTools').evaluate(el=>el.open=true);await page.locator('#compositionEdit').click();await page.waitForFunction(()=>FILMLABB_GEOMETRY.mode()==='composition');await page.locator('#geometryTools').evaluate(el=>el.open=false);await page.waitForFunction(()=>FILMLABB_GEOMETRY.mode()===null);await page.locator('#geometryTools').evaluate(el=>el.open=true);await page.locator('#compositionReset').click();assert.equal(await page.evaluate(()=>roll[0].geometry.compositionCrop),null);await page.locator('#rotationReset').click();assert.deepEqual(await page.evaluate(()=>roll[0].geometry.rotation),{quarterTurns:0,fineDegrees:0});
 await page.screenshot({path:'/tmp/filmlabb-beta6-desktop.png'});assert.deepEqual(errors,[]);
 console.log('PASS geometry reset controls restore neutral model');
 await page.locator('#straighten').click();await page.waitForFunction(()=>FILMLABB_GEOMETRY.mode()==='straighten');const pb=await page.locator('#picture').boundingBox(),sx=pb.x+pb.width/2-60,sy=pb.y+pb.height/2;
 await page.mouse.move(sx,sy);await page.mouse.down();await page.mouse.move(sx+120,sy+12,{steps:5});await page.mouse.up();assert.ok(Math.abs(await page.evaluate(()=>roll[0].geometry.rotation.fineDegrees)+Math.atan2(12,120)*180/Math.PI)<.05);assert.equal(await page.evaluate(()=>FILMLABB_GEOMETRY.mode()),null);
 console.log('PASS drawn horizon line straightens the picture with the shared rotation model');
 const perf=await page.evaluate(async()=>{
  const before=FILMLABB_GPU.snapshot(),analyses=analysisCount38,uploads=FILMLABB_GEOMETRY.snapshot().colorUploads,times=[];
  for(let i=0;i<24;i++){$('fineRotation').value=String(-3+i*.25);$('fineRotation').dispatchEvent(new Event('input'));await new Promise(requestAnimationFrame);times.push(FILMLABB_GEOMETRY.snapshot().lastMs);}
  const after=FILMLABB_GPU.snapshot();times.sort((a,b)=>a-b);return {median:times[12],p95:times[22],noAnalysis:analyses===analysisCount38,noColor:before.frames===after.frames,noUpload:before.sourceUploads===after.sourceUploads&&uploads===FILMLABB_GEOMETRY.snapshot().colorUploads};
 });assert.ok(perf.noAnalysis&&perf.noColor&&perf.noUpload,JSON.stringify(perf));console.log('MEASURE geometry cached pass (SwiftShader submit ms)',JSON.stringify(perf));
 await page.evaluate(()=>{globalThis.geometryLoss=$('presentationPreview').getContext('webgl2').getExtension('WEBGL_lose_context');geometryLoss.loseContext();});await page.waitForFunction(()=>FILMLABB_GEOMETRY.snapshot().backend==='cpu'&&FILMLABB_GEOMETRY.snapshot().cpuPasses>0);
 await page.evaluate(()=>geometryLoss.restoreContext());await page.waitForFunction(()=>FILMLABB_GEOMETRY.snapshot().backend==='gpu'&&!$('presentationPreview').hidden);
 console.log('PASS geometry WebGL context loss uses CPU fallback and restores cached GPU presentation');

 // EXIF is applied once by the existing browser decoder, before geometry.
 const oriented=await page.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=12;c.height=8;const cx=c.getContext('2d');cx.fillStyle='#a57042';cx.fillRect(0,0,12,8);const raw=new Uint8Array(await (await new Promise(r=>c.toBlob(r,'image/jpeg'))).arrayBuffer());
  const exif=new Uint8Array(36),v=new DataView(exif.buffer);exif.set([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0]);v.setUint16(20,274,true);v.setUint16(22,3,true);v.setUint32(24,1,true);v.setUint16(28,6,true);
  const bytes=new Uint8Array(raw.length+exif.length);bytes.set(raw.slice(0,2));bytes.set(exif,2);bytes.set(raw.slice(2),2+exif.length);return Array.from(bytes);
 });
 await page.locator('#imageFile').setInputFiles({name:'oriented.jpg',mimeType:'image/jpeg',buffer:Buffer.from(oriented)});await page.waitForFunction(()=>!rollLoading&&working?.width===8&&working?.height===12);assert.equal(await page.evaluate(()=>state.rotation),0);
 await page.evaluate(()=>setQueueCropExportToFrame(false));const orientedSize=await page.evaluate(async()=>{let b;downloadBlob=v=>b=v;await exportTiff();const t=await NSTiff.decode(await b.arrayBuffer());return [t.width,t.height];});assert.deepEqual(orientedSize,[8,12]);
 console.log('PASS EXIF orientation is respected once; neutral export does not rotate again');
 // Queue choice survives replacement import and is inherited by every new image.
 assert.equal(await page.evaluate(()=>roll[0].settings.cropExport),false);await page.evaluate(()=>setQueueCropExportToFrame(true));await page.locator('#imageFile').setInputFiles([{name:'new-a.png',mimeType:'image/png',buffer},{name:'new-b.png',mimeType:'image/png',buffer}]);await page.waitForFunction(()=>!rollLoading&&working?.width===900);assert.equal(await page.evaluate(()=>roll.every(f=>f.settings.cropExport&&f.geometry.compositionCrop===null)),true);
 assert.deepEqual(errors,[]);
 // Touch editing on a mobile viewport, with actual browser-generated pointer capture.
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',locale:'sv-SE'});await mobile.goto(url);await mobile.locator('#imageFile').setInputFiles({name:'touch.png',mimeType:'image/png',buffer});await mobile.waitForFunction(()=>!rollLoading&&working&&FILMLABB_GEOMETRY.snapshot().draws>0);
 await mobile.locator('#geometryTools').evaluate(el=>el.open=true);await mobile.locator('#compositionEdit').click();await mobile.waitForFunction(()=>FILMLABB_GEOMETRY.mode()==='composition');
 await mobile.locator('[data-composition="2"]').waitFor({state:'visible'});const circle=await mobile.locator('[data-composition="2"]').boundingBox(),session=await mobile.context().newCDPSession(mobile),x=circle.x+circle.width/2,y=circle.y+circle.height/2,old=await mobile.evaluate(()=>roll[0].geometry.compositionCrop.w);
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-20,y:y-15}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.ok(await mobile.evaluate(()=>roll[0].geometry.compositionCrop.w)<old);
 await mobile.locator('#geometryDone').click();await mobile.locator('#fineRotation').evaluate(el=>{el.value='-2';el.dispatchEvent(new Event('input',{bubbles:true}));});await mobile.waitForFunction(()=>roll[0].geometry.rotation.fineDegrees===-2);
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await mobile.screenshot({path:'/tmp/filmlabb-beta6-mobile.png'});
 await mobile.evaluate(()=>$('themeToggle').click());await mobile.screenshot({path:'/tmp/filmlabb-beta6-mobile-light.png'});await mobile.close();
 console.log('PASS mobile touch composition and rotation, no horizontal overflow, light/dark themes');
 // Force all WebGL unavailable and exercise the cached CPU presentation path.
 const cpu=await browser.newPage({serviceWorkers:'block',locale:'sv-SE'});await cpu.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args);};});await cpu.goto(url);await cpu.locator('#imageFile').setInputFiles({name:'cpu.png',mimeType:'image/png',buffer});await cpu.waitForFunction(()=>!rollLoading&&FILMLABB_GEOMETRY.snapshot().cpuPasses>0);await cpu.locator('#geometryTools').evaluate(el=>el.open=true);const count=await cpu.evaluate(()=>analysisCount38);await cpu.locator('#fineRotation').evaluate(el=>{el.value='15';el.dispatchEvent(new Event('input',{bubbles:true}));});await cpu.waitForFunction(()=>roll[0].geometry.rotation.fineDegrees===15&&FILMLABB_GEOMETRY.snapshot().cpuPasses>1);assert.equal(await cpu.evaluate(()=>analysisCount38),count);await cpu.close();
 console.log('PASS unavailable GPU uses bounded cached CPU geometry without recalibration');

}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
