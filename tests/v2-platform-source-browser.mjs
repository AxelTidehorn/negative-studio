import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browserHarness} from './helpers/browser.mjs';

// The suite/build owner prepares site/. Keep this test safe with a shared site.
const h=await browserHarness(),errors=[];
const open=locator=>locator.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
const ready=page=>page.waitForFunction(()=>working&&!rollLoading);
const preview=page=>page.waitForFunction(()=>!workerBusy38&&!queued38&&previewCompletedKey===JSON.stringify([sourceVersion38,display,1400,configuration38()]));
const settings=page=>page.evaluate(()=>({engine:state.engine,conversionVersion:state.conversionVersion,editVersion:state.editVersion,rawMode4:state.rawMode4,exposure:state.exposure,rotation:state.rotation,v2Recipe:state.v2Recipe||null}));
try{
 const page=await h.browser.newPage({viewport:{width:1024,height:1000},hasTouch:true,locale:'sv-SE'});page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url);
 await page.locator('#imageFile').setInputFiles('tests/fixtures/tiff/rgb16-tile0-planar1-c1.tif');await ready(page);
 const sourceBefore=await page.evaluate(()=>({engine:state.engine,bytes:working.data.byteLength,source:sourceVersion38}));
 await page.locator('#engineMode').selectOption('v2');
 assert.equal(await page.locator('#engineMode').inputValue(),sourceBefore.engine);assert.equal(await page.evaluate(()=>state.engine),sourceBefore.engine);assert.equal(await page.evaluate(()=>sourceVersion38),sourceBefore.source);assert.match(await page.locator('#status').textContent(),/verifierad linjär Rec.2020/);
 await open(page.locator('#tiffEncoding'));await page.locator('#tiffEncoding').selectOption('linear-rec2020');await page.waitForFunction(()=>working&&!rollLoading&&working.colorSpace==='rec2020');
 assert.equal(await page.evaluate(()=>working.data instanceof Float32Array),true);assert.equal(await page.evaluate(()=>working.scale),1);
 await page.locator('#engineMode').selectOption('v2');await page.waitForFunction(()=>state.engine==='v2'&&!!state.v2Recipe);await preview(page);
 assert.equal(await page.evaluate(()=>FILMLABB_GPU.snapshot().backend),'cpu');assert.equal(await page.evaluate(()=>!!previewWorker38&&!workerDisabled38),true);
 assert.equal(await page.evaluate(()=>{const expected=NSPixelKernel.render(workingPreview,configuration38(),display,1400);return expected.data.every((v,i)=>v===lastPreview38.data[i])&&expected.bins.every((v,i)=>v===lastPreview38.bins[i]);}),true);
 assert.ok((await page.locator('#histogramInfo').textContent()).trim());
 const v2Before=await settings(page);await page.locator('#engineMode').selectOption('log39');assert.deepEqual(await settings(page),v2Before);assert.equal(await page.locator('#engineMode').inputValue(),'v2');assert.match(await page.locator('#status').textContent(),/Original kräver en sRGB-källa/);
 for(const engine of ['curve3','density3','matrix3','calibrated4','v2']){await page.locator('#engineMode').selectOption(engine);await page.waitForFunction(e=>state.engine===e,engine);}
 await preview(page);assert.equal(await page.evaluate(()=>state.v2Recipe.intent.id),v2Before.v2Recipe.intent.id);
 console.log('PASS unverified TIFF rejects V2, explicit linear Rec.2020 reimport, actual CPU-worker pixel/histogram parity, Original domain rejection and all wide-capable engine switches');

 const raw=await h.browser.newPage({viewport:{width:1024,height:1000},locale:'sv-SE'});raw.setDefaultTimeout(60000);raw.on('pageerror',e=>errors.push(e.message));await raw.goto(h.url);
 await raw.locator('#imageFile').setInputFiles({name:'negative.dng',mimeType:'image/x-adobe-dng',buffer:fs.readFileSync('tests/fixtures/synthetic-negative.dng')});await ready(raw);
 // Deliberate decoder failure at the already-validated owner's boundary.
 await raw.evaluate(()=>{window.decoderBeforeFailure=NSRawDecoder.decode;NSRawDecoder.decode=async()=>{throw Error('INTENTIONAL_TEST_FAILURE');};});
 const prior=await settings(raw);await raw.locator('#engineMode').selectOption('v2');await raw.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('INTENTIONAL_TEST_FAILURE'));
 assert.deepEqual(await settings(raw),prior);assert.equal(await raw.locator('#engineMode').inputValue(),prior.engine);assert.equal(await raw.evaluate(()=>working),null);
 await raw.evaluate(()=>{NSRawDecoder.decode=decoderBeforeFailure;$('loadFullRaw').click();});await ready(raw);assert.equal(await raw.evaluate(()=>sourceInfo.colorSpace),'srgb');
 await raw.locator('#engineMode').selectOption('v2');await raw.waitForFunction(()=>!rollLoading&&state.engine==='v2'&&working);
 const v2=await settings(raw);await raw.evaluate(()=>{NSRawDecoder.decode=async()=>{throw Error('INTENTIONAL_TEST_FAILURE');};});await raw.locator('#engineMode').selectOption('log39');await raw.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('INTENTIONAL_TEST_FAILURE'));
 assert.deepEqual(await settings(raw),v2);assert.equal(await raw.locator('#engineMode').inputValue(),'v2');assert.equal(await raw.evaluate(()=>working),null);
 await raw.evaluate(()=>{NSRawDecoder.decode=decoderBeforeFailure;$('loadFullRaw').click();});await ready(raw);assert.equal(await raw.evaluate(()=>sourceInfo.colorSpace),'rec2020');assert.equal(await raw.evaluate(()=>state.v2Recipe.intent.id),v2.v2Recipe.intent.id);
 console.log('PASS failed RAW domain changes restore engine/settings/recipe in both directions, release invalid source and recover through ordinary reload');

 await raw.locator('#engineMode').selectOption('calibrated4');await open(raw.locator('#rawMode4'));await raw.locator('#rawMode4').selectOption('reference');await raw.waitForFunction(()=>working&&!rollLoading&&sourceInfo.rawMode4==='reference');
 const original=await raw.evaluate(()=>({domain:sourceInfo.domain,pixels:[0,300,working.data.length-3].flatMap(i=>Array.from(working.data.subarray(i,i+3)))}));
 await raw.locator('#engineMode').selectOption('v2');await raw.waitForFunction(()=>working&&!rollLoading&&state.engine==='v2');
 await raw.evaluate(()=>{state.filmBaseVersion=2;setProposal2(FM2.measure(working,{x:.05,y:.1,w:.07,h:.6}));FILMLABB_BASE2.accept();});
 await raw.locator('#engineMode').selectOption('calibrated4');
 const sourceRecipe=()=>raw.evaluate(()=>({domain:sourceInfo.domain,decoder:sourceInfo.rawMetadata.options,locked:state.rawSourceRecipeV2,decoded:sourceInfo.v2Decoded,accepted:accepted2()?.id,base:accepted2()?.measurement.measured,pixels:[0,300,working.data.length-3].flatMap(i=>Array.from(working.data.subarray(i,i+3))),positive:[0,300,working.data.length-3].flatMap(i=>NSPixelKernel.prepare(working,configuration38()).pixel(i))}));
 const beforeReload=await sourceRecipe();assert.ok(beforeReload.accepted);assert.equal(beforeReload.locked,1);assert.equal(beforeReload.decoded,true);
 await raw.evaluate(()=>$('loadFullRaw').click());await ready(raw);assert.deepEqual(await sourceRecipe(),beforeReload,'Standard reload preserves locked decode, compatible base and exact source/output pixels');
 await raw.locator('#engineMode').selectOption('v2');await raw.locator('#engineMode').selectOption('log39');await raw.waitForFunction(()=>working&&!rollLoading&&state.engine==='log39'&&sourceInfo.rawMode4==='reference');
 assert.equal(await raw.evaluate(()=>state.rawMode4),'reference');assert.equal(await raw.evaluate(()=>state.rawSourceRecipeV2||0),0);assert.deepEqual(await raw.evaluate(()=>({domain:sourceInfo.domain,pixels:[0,300,working.data.length-3].flatMap(i=>Array.from(working.data.subarray(i,i+3)))})),original);
 assert.deepEqual(errors,[]);console.log('PASS Standard forced reload retains locked source recipe, base and pixel results; Original restores prior reference RAW recipe and pixels');
}finally{await h.close();}
