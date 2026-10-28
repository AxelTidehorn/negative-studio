/* Reproducible same-machine comparison: unchanged reference path vs worker path.
   Uses synthetic data only. It does not extrapolate DNG results to Fuji RAF. */
import fs from 'node:fs';import {execFileSync} from 'node:child_process';import {ensureBuild} from './build-artifact.mjs';import {browserHarness} from '../tests/helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{
 const page=await h.browser.newPage();await page.goto(h.url+'v2.html');
 for(const file of ['raw-input.js','raw-decoder.js','film-base-measurement.js','color-analysis.js','color-calibration.js','project-settings.js','color-parameters.js','render-core.js','srgb-profile.js','tiff-header.js'])await page.addScriptTag({url:h.url+file});
 const oldBase=execFileSync('git',['show','b0f68ed:src/conversion-v2/base.js'],{encoding:'utf8'});await page.addScriptTag({content:oldBase});
 const baseline=await page.evaluate(async()=>{
  const im={width:1000,height:1000,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(3000000)};for(let i=0;i<im.data.length;i++)im.data[i]=.04+(i%503)/600;
  const V=NSConversionV2,R=NSV2Render,O=NSV2Output,s=V.source(im,{revision:'profile'}),capture=V.capture({session:'profile',recipe:{decoder:'fixture'}}),base=V.assumed([1,1,1],s,capture),k=V.compile(s,base),intent=R.analyze(im,k),region={x:0,y:0,w:1,h:1},response=NSColorCalibration.estimate(im,region,{base:base.rgb,light:[1,1,1]}),config={kind:'calibrated4',opts:{...NSProjectSettings.imageDefaults(),shadow:0,highlight:1,editVersion:1},workingSpace:'rec2020',cal:{beta4:NSColorCalibration.analyze(im,region,response)},profile:{type:'color'},print:{},neutralProfile:true,neutralPrint:true,strength:0},legacy=NSPixelKernel.compile(config),sampleA=(x,y)=>legacy.pixel(V.read(im,(y*im.width+x)*3)).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),sampleB=(x,y)=>O.pixel(im,k,intent,x,y),g=O.geometry(im,region,0,1400);
  let t=performance.now();await NSV2Base.detect(im,s);const baseMs=performance.now()-t;t=performance.now();for(const sample of [sampleA,sampleB]){const cv=await O.canvas(im,g,sample);cv.width=cv.height=0;}const pairMs=performance.now()-t;t=performance.now();const blob=await O.tiff(im,O.geometry(im),sampleB),tiffMs=performance.now()-t;
  window.profileInput={im,s,capture};return {pixels:im.width*im.height,baseMs,pairMs,tiffMs,tiffBytes:blob.size,sourceBytes:im.data.byteLength};
 });
 const after=await page.evaluate(async()=>{
  const {im,s,capture}=profileInput,t0=performance.now();await NSV2Lab.useSource(im,s,capture);document.querySelector('summary').parentElement.open=true;const initMs=performance.now()-t0;return {initMs};
 });
 await page.locator('#detect').click();await page.waitForFunction(()=>!document.getElementById('cancel').hidden===false);const baseMs=await page.evaluate(()=>NSV2Lab.getMetrics().baseDetectMs);
 await page.locator('summary').filter({hasText:'Ingen användbar filmkant?'}).evaluate(e=>e.parentElement.open=true);let start=Date.now();await page.locator('#prior').click();await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('A/B klart'));after.pairMs=Date.now()-start;after.workerPairMs=await page.evaluate(()=>NSV2Lab.getMetrics().previewMs);after.baseMs=baseMs;
 const pending=page.waitForEvent('download');start=Date.now();await page.locator('#tiff').click();const download=await pending;await download.path();after.tiffMs=Date.now()-start;after.workerTiffMs=await page.evaluate(()=>NSV2Lab.getMetrics().exportMs);after.metrics=await page.evaluate(()=>NSV2Lab.getMetrics());
 console.log(JSON.stringify({schema:'filmlabb.v2-performance',version:1,referenceCommit:'b0f68ed',fixture:'deterministic normalized Float32 1000x1000',before:baseline,after},null,2));
}finally{await h.close();}
