import assert from 'node:assert/strict';
import {ensureBuild} from '../tools/build-artifact.mjs';
import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{
 const page=await h.browser.newPage({locale:'sv-SE'}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);
 await page.goto(h.url+'v2.html');await page.addScriptTag({url:h.url+'tiff-codec.js'});
 const result=await page.evaluate(async()=>{
  const V=NSConversionV2,R=NSV2Render,O=NSV2Output,width=96,height=80,rgb=[.8,.45,.2];
  // Construct a synthetic mixed-light scene through the inverse of the frozen
  // technical prior; the color test has no real-photo pixels or fitted targets.
  const augmented=V.latestPrior.densityMatrix.map((row,i)=>[...row,...[0,1,2].map(j=>i===j?1:0)]);
  for(let i=0;i<3;i++){const d=augmented[i][i];for(let j=0;j<6;j++)augmented[i][j]/=d;for(let k=0;k<3;k++)if(k!==i){const t=augmented[k][i];for(let j=0;j<6;j++)augmented[k][j]-=t*augmented[i][j];}}
  const inverse=augmented.map(row=>row.slice(3)),im={width,height,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(width*height*3)};
  for(let i=0;i<width*height;i++){
   if(i%width<3){im.data.set(rgb,i*3);continue;}
   const y=.04+((i*37)%(width*height))/(width*height)*6,p=i%4?[.98,1,1.03]:[1.2,1,.6],s=y/V.luminance(p),q=p.map((v,c)=>Math.log10(1+v*s/.18*(10**V.latestPrior.responses[c].slope-1))/V.latestPrior.responses[c].slope),density=inverse.map(row=>row.reduce((n,v,c)=>n+v*q[c],0));
   im.data.set(density.map((d,c)=>rgb[c]*10**-d),i*3);
  }
  const source=V.source(im,{revision:'photo-color-worker'}),capture=V.capture({session:'test',recipe:{decoder:'synthetic'}}),owner=new NSV2Client(),view={crop:{x:0,y:0,w:1,h:1},rotation:0,limit:96,comparison:'technical',viewMode:'auto'},area={region:{x:.05,y:0,w:.95,h:1},status:'confirmed'},check=(ok,msg)=>{if(!ok)throw Error(msg);};
  try{
   await owner.run('source',{image:im,source,capture,limit:96,calibration:V.latestPrior,algorithmVersion:3});
   await owner.run('measure',{regions:[{x:0,y:0,w:.02,h:1}]});let r=await owner.run('accept',{...view,analysisArea:area});
   const neutral=r.snapshot;check(neutral.intent.colorCorrection.terminal?.selected,'synthetic terminal evidence missing');
   r=await owner.run('photographic',{...view,enabled:true});check(r.snapshot.intent.tone==='luminance-photographic-1','PR45 not preserved');
   r=await owner.run('photographic',{...view,enabled:true,version:2});const active=r.snapshot,model=R.prepareBalance(active.intent);
   check(active.intent.tone==='luminance-photographic-2'&&model.application==='global-terminal','new model not active');
   check(JSON.stringify(active.calibration)===JSON.stringify(neutral.calibration),'rendering changed calibration');
   check(JSON.stringify(active.intent.colorCorrection)===JSON.stringify(neutral.intent.colorCorrection),'rendering overwrote neutral analysis');
   const k=V.compile(source,active.base,active.calibration),g=O.geometry(im),expected=O.rows(im,g,0,height,(x,y)=>O.pixel(im,k,active.intent,x,y),16),tiff=await owner.run('export',{...view,engine:'B',format:'tiff'}),decoded=NSTiff.decodeSync(await tiff.blob.arrayBuffer());let maxError=0;
   decoded.data.forEach((v,i)=>maxError=Math.max(maxError,Math.abs(v-expected[i])));check(maxError<=1,'worker TIFF differs from scalar reference');check(decoded.bits===16&&decoded.icc.length===588,'TIFF bit depth/profile');
   const pixels=O.rows(im,g,0,height,(x,y)=>O.pixel(im,k,active.intent,x,y));r.b.forEach((v,i)=>check(Math.abs(v-pixels[i])<=1,'worker preview uses another recipe'));
   const jpeg=await owner.run('export',{...view,engine:'B',format:'jpeg'}),head=new Uint8Array(await jpeg.blob.slice(0,2).arrayBuffer());check(head[0]===255&&head[1]===216,'JPEG missing');
   const report=(await owner.run('diagnostic',view)).report;check(report.colorBalance.value.application==='global-terminal','diagnostic reports the analyzed rather than applied balance');
   const count=active.metrics.toneAnalysisCount;r=await owner.run('photographic',{...view,enabled:true,version:2});check(r.snapshot.metrics.toneAnalysisCount===count&&r.snapshot.intent.id===active.intent.id,'identical rendering selection reanalyzes');
   let rejected=false;try{await owner.run('photographic',{...view,enabled:true,version:99});}catch{rejected=true;}check(rejected,'unknown version accepted');r=await owner.run('pair',view);check(r.snapshot.intent.id===active.intent.id,'invalid version mutated recipe');
   r=await owner.run('reuse',{...view,base:{...active.base,id:'changed',rgb:active.base.rgb.map(v=>v*1.01)}});check(r.snapshot.intent.tone==='luminance-photographic-2','base update lost rendering version');
   r=await owner.run('undo',view);check(JSON.stringify(r.snapshot.intent.colorCorrection)===JSON.stringify(active.intent.colorCorrection),'undo changed frozen color analysis');
   return {maxRGB16Error:maxError,application:report.colorBalance.value.application};
  }finally{owner.close();}
 });
 await page.goto(h.url);await page.locator('#imageFile').setInputFiles('tests/fixtures/synthetic-negative.dng');await page.waitForFunction(()=>working&&!rollLoading);
 await page.locator('#engineMode').selectOption('v2');await page.waitForFunction(()=>state.engine==='v2'&&working&&!rollLoading);
 await page.evaluate(()=>$('cropReset').click());
 const selected=await page.evaluate(()=>{const cal=JSON.stringify(state.v2Recipe.calibration);FILMLABB_V2.setRendering('photographic',{version:2});NSV2Platform.validate(state.v2Recipe);return {cal,recipe:state.v2Recipe};});
 assert.equal(selected.recipe.intent.tone,'luminance-photographic-2');assert.equal(JSON.stringify(selected.recipe.calibration),selected.cal);
 const exported=await page.evaluate(async()=>{
  const previous=downloadBlob;let blob;downloadBlob=b=>{blob=b;};
  try{const c=configuration38(),g=exportGeometrySnapshot(working).g,expected=NSPixelKernel.exportRows(working,c,g,0,g.height);await exportTiff();const im=NSTiff.decodeSync(await blob.arrayBuffer()),jpeg=await jpegBytes();let max=0;im.data.forEach((v,i)=>max=Math.max(max,Math.abs(v-expected[i])));return {tone:c.v2.intent.tone,bits:im.bits,icc:im.icc.length,max,jpeg:jpeg[0]===255&&jpeg[1]===216};}finally{downloadBlob=previous;}
 });
 assert.deepEqual(exported,{tone:'luminance-photographic-2',bits:16,icc:588,max:0,jpeg:true});
 await page.evaluate(()=>{window.downloadBefore=downloadBlob;downloadBlob=b=>{window.savedProject=b;};$('saveSettings').click();});
 const project=await page.evaluate(async()=>{downloadBlob=downloadBefore;return await savedProject.text();});
 await page.evaluate(()=>FILMLABB_V2.setRendering('neutral'));
 await page.locator('#settingsFile').setInputFiles({name:'photo-color.json',mimeType:'application/json',buffer:Buffer.from(project)});
 try{await page.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('matchades'));}catch(e){console.error(await page.evaluate(()=>({status:$('status').textContent,engine:state.engine,tone:state.v2Recipe?.intent.tone})));throw e;}
 assert.deepEqual(await page.evaluate(()=>state.v2Recipe),selected.recipe,'ordinary project round trip retains exact optional version and intent');
 await page.evaluate(()=>{const id=state.v2Recipe.intent.id;state.exposure=.4;render();if(state.v2Recipe.intent.id!==id)throw Error('Editing reanalyzed');FILMLABB_V2.setRendering('photographic',{version:1});if(state.v2Recipe.intent.tone!=='luminance-photographic-1')throw Error('PR45 unavailable');FILMLABB_V2.setRendering('neutral');if(state.v2Recipe.intent.tone!=='luminance-reinhard-1')throw Error('Neutral unavailable');});
 assert.deepEqual(errors,[]);console.log('PASS actual worker/photo1/photo2, selected anchor, immutable technical/neutral recipes, preview/JPEG/RGB16 diagnostics, invalid version/reuse/undo, main API/project restoration and Editing 2.0',JSON.stringify(result));
}finally{await h.close();}
