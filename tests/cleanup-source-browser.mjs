import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browserHarness} from './helpers/browser.mjs';

// Site is prepared by the suite owner. Decoder deferrals exercise real controls
// deterministically without changing the application's pixel algorithms.
const h=await browserHarness(),failures=[],errors=[];
async function check(name,fn){try{await fn();console.log('PASS',name);}catch(e){failures.push({name,error:e.message});console.error('FAIL',name,e.message);}}
try{
 const page=await h.browser.newPage({viewport:{width:820,height:1180},hasTouch:true,locale:'sv-SE'});page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url);
 await page.locator('#imageFile').setInputFiles({name:'negative.dng',mimeType:'image/x-adobe-dng',buffer:fs.readFileSync('tests/fixtures/synthetic-negative.dng')});await page.waitForFunction(()=>working&&!rollLoading);
 await page.evaluate(()=>{window.lightDecoderBeforeCleanup=decodeLightFile;window.pendingCleanupLights=[];decodeLightFile=file=>new Promise((resolve,reject)=>pendingCleanupLights.push({name:file.name,resolve,reject}));});
 const start=async name=>{await page.locator('#referenceFile').setInputFiles({name,mimeType:'image/png',buffer:Buffer.from([0])});await page.waitForFunction(n=>pendingCleanupLights.some(p=>p.name===n),name);};
 const resolve=async name=>{await page.evaluate(n=>{const p=pendingCleanupLights.find(p=>p.name===n),data=new Float32Array(64*64*3);for(let i=0;i<data.length;i+=3)data.set([.25,.35,.45],i);p.resolve({width:64,height:64,channels:3,data,scale:1,encoding:'linear',domain:sourceInfo.domain});},name);await page.waitForTimeout(30);};
 await check('latest scalar-light reference wins when older decoding finishes last',async()=>{
  await start('older.png');await start('latest.png');await resolve('latest.png');await page.waitForFunction(()=>sharedLight?.name==='latest.png');const analyses=await page.evaluate(()=>analysisCount38);await resolve('older.png');assert.equal(await page.evaluate(()=>sharedLight?.name),'latest.png');assert.equal(await page.evaluate(()=>analysisCount38),analyses,'obsolete decode must not trigger another analysis');
 });
 await check('obsolete scalar-light completion does not clear a newer pending file selection',async()=>{
  await start('selection-old.png');await start('selection-new.png');try{await resolve('selection-old.png');assert.match(await page.locator('#referenceFile').inputValue(),/selection-new\.png$/);}finally{await resolve('selection-new.png');}
 });
 await check('clearing light reference prevents its pending decode from resurrecting it',async()=>{
  await start('cleared.png');await page.locator('#clearReference').evaluate(el=>el.click());assert.equal(await page.locator('#referenceFile').inputValue(),'');await resolve('cleared.png');assert.equal(await page.evaluate(()=>sharedLight),null);
 });
 await check('obsolete scalar-light decoder failures do not overwrite current status',async()=>{
  await start('failed-old.png');await start('healthy-new.png');await resolve('healthy-new.png');await page.evaluate(()=>pendingCleanupLights.find(p=>p.name==='failed-old.png').reject(Error('OBSOLETE_REFERENCE_FAILURE')));await page.waitForTimeout(30);assert.doesNotMatch(await page.locator('#status').textContent(),/OBSOLETE_REFERENCE_FAILURE/);assert.equal(await page.evaluate(()=>sharedLight?.name),'healthy-new.png');
 });
 await check('a scalar reference finishing during export cannot mutate frozen image state',async()=>{
  const before=await page.evaluate(()=>JSON.stringify(sharedLight));await start('during-export.png');await page.evaluate(()=>{exportBusy=true;});try{await resolve('during-export.png');assert.equal(await page.evaluate(()=>JSON.stringify(sharedLight)),before);}finally{await page.evaluate(()=>{exportBusy=false;});}
 });
 await check('a blocked queue clear does not cancel a valid pending reference',async()=>{
  await start('blocked-clear.png');await page.evaluate(()=>{rollLoading=true;});try{await page.locator('#clearQueue').evaluate(el=>el.click());}finally{await page.evaluate(()=>{rollLoading=false;});}await resolve('blocked-clear.png');assert.equal(await page.evaluate(()=>sharedLight?.name),'blocked-clear.png');
 });
 await check('reference status follows the same capture-domain compatibility as actual gains',async()=>{
  const values=await page.evaluate(()=>{const oldInfo=sourceInfo,oldLight=sharedLight;try{sourceInfo={...sourceInfo,encoding:'linear',domain:'capture-A',rawMode4:'protected'};sharedLight={name:'reference',encoding:'linear',domain:'capture-B',gains:[1.1,.9,1]};updateCalibrationUI();const mismatch={status:$('referenceStatus').textContent,gains:currentLight()};sharedLight.domain='capture-A';updateCalibrationUI();const matched={status:$('referenceStatus').textContent,gains:currentLight()};delete sharedLight.domain;sourceInfo.rawMode4='reference';updateCalibrationUI();const legacy={status:$('referenceStatus').textContent,gains:currentLight()};return {mismatch,matched,legacy};}finally{sourceInfo=oldInfo;sharedLight=oldLight;updateCalibrationUI();}});
  assert.deepEqual(values.mismatch.gains,[1,1,1]);assert.match(values.mismatch.status,/pausad/);assert.match(values.matched.status,/aktiv/);assert.deepEqual(values.matched.gains,[1.1,.9,1]);assert.match(values.legacy.status,/aktiv/);assert.deepEqual(values.legacy.gains,[1.1,.9,1]);
 });
 await check('RAW/TIFF thumbnail ImageData needs no temporary canvas and preserves bytes',async()=>{
  const result=await page.evaluate(async()=>{const oldFinish=finishImport,oldSrc=src,oldHires=hires,oldWidth=fullWidth,oldHeight=fullHeight,oldCreate=document.createElement,oldDecode=NSTiff.decode,oldPrepare=prepareTiff;let canvases=0;try{finishImport=()=>{};document.createElement=function(tag,...args){if(tag.toLowerCase()==='canvas')canvases++;return oldCreate.call(this,tag,...args);};const data=Uint16Array.from([0,32768,65535,1000,2000,3000,62000,45000,20000,40000,10000,100,1,2,3,65535,65535,65535]),raw={width:3,height:2,channels:3,data,scale:65535,bits:16,encoding:'linear',colorSpace:'srgb'};await importRawOriginal(raw,'memory-fixture.dng',{});const rawPixels=Array.from(src.data),rawCanvases=canvases;canvases=0;NSTiff.decode=async()=>({...raw});prepareTiff=r=>r;await readFile(new File([new Uint8Array(1)],'memory-fixture.tif',{type:'image/tiff'}));const expected=[];for(let i=0;i<data.length;i+=3)expected.push(...Array.from(data.subarray(i,i+3),v=>Math.round(v/65535*255)),255);return {rawPixels,tiffPixels:Array.from(src.data),expected,rawCanvases,tiffCanvases:canvases};}finally{finishImport=oldFinish;src=oldSrc;hires=oldHires;fullWidth=oldWidth;fullHeight=oldHeight;document.createElement=oldCreate;NSTiff.decode=oldDecode;prepareTiff=oldPrepare;}});
  assert.deepEqual(result.rawPixels,result.expected);assert.deepEqual(result.tiffPixels,result.expected);assert.equal(result.rawCanvases,0);assert.equal(result.tiffCanvases,0);
 });
 await check('clearing queue invalidates pending scalar references without stale status',async()=>{
  await page.locator('#clearReference').evaluate(el=>el.click());await start('removed-source.png');await page.locator('#clearQueue').evaluate(el=>el.click());await resolve('removed-source.png');assert.equal(await page.evaluate(()=>sharedLight),null);assert.match(await page.locator('#status').textContent(),/Arbetskön tömd/);
 });
 await page.evaluate(()=>{decodeLightFile=lightDecoderBeforeCleanup;});assert.deepEqual(errors,[]);
 assert.deepEqual(failures,[],'cleanup source regressions');
}finally{await h.close();}
