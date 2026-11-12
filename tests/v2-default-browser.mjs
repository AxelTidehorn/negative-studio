import {selectBackend} from './helpers/browser.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness,selectEngine} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness();
try{
 const p=await h.browser.newPage({viewport:{width:1360,height:950},locale:'sv-SE',serviceWorkers:'block'}),errors=[];
 p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('negative-studio-v03',JSON.stringify({engine:'log39',exposure:1.2,editVersion:1})));
 await p.goto(h.url);
 await p.evaluate(()=>{window.decoderCalls=[];const decode=NSRawDecoder.decode;NSRawDecoder.decode=(file,mode,options)=>{decoderCalls.push({mode,options});return decode(file,mode,options);};});
 const buffer=fs.readFileSync('tests/fixtures/synthetic-negative.dng');
 await p.locator('#imageFile').setInputFiles(['fresh-a.dng','fresh-b.dng'].map(name=>({name,mimeType:'image/x-adobe-dng',buffer})));
 await p.waitForFunction(()=>working&&!rollLoading&&state.v2Recipe&&FILMLABB_GPU.snapshot().backend==='gpu');
 const fresh=await p.evaluate(()=>({engine:state.engine,queue:roll.map(f=>f.settings.engine),exposure:state.exposure,edit:state.editVersion,kind:configuration38().kind,source:sourceInfo.colorSpace,locked:sourceInfo.v2Decoded,calls:decoderCalls.length,options:decoderCalls[0].options.options,expected:NSV2Platform.decoderOptions(),picker:$('engineMode').closest('.tool-card').id,duplicates:document.querySelectorAll('#engineMode').length,summary:$('advancedSettingsSummary').textContent}));
 assert.deepEqual(fresh.queue,['v2','v2']);assert.equal(fresh.engine,'v2');assert.equal(fresh.exposure,0);assert.equal(fresh.edit,2);assert.equal(fresh.kind,'v2');assert.equal(fresh.source,'rec2020');assert.equal(fresh.locked,true);assert.equal(fresh.calls,1);assert.deepEqual(fresh.options,fresh.expected);
 assert.equal(fresh.picker,'advancedSettings');assert.equal(fresh.duplicates,1);assert.doesNotMatch(fresh.summary,/V2/);assert.equal(await p.locator('#engineMode').isVisible(),false);
 const save=()=>p.evaluate(async()=>{saveCurrentFrame();let blob;const download=downloadBlob;downloadBlob=b=>blob=b;try{$('saveSettings').onclick();return JSON.parse(await blob.text());}finally{downloadBlob=download;}});
 // Await this load's completion, not a matching status left by the prior project.
 const load=async data=>{await p.evaluate(()=>setStatus(''));await p.locator('#settingsFile').setInputFiles({name:'saved.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await p.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('matchades'));};
 const original=await save();assert.equal(original.format,'filmlabb-roll-4');assert.equal(original.frames[0].settings.engine,'v2');
 const exported=await p.evaluate(async()=>{confirmFrameSelection();saveCurrentFrame();const c=configuration38(),g=exportGeometrySnapshot(working).g;const recipe=JSON.stringify(c.v2);let blob;const download=downloadBlob;downloadBlob=b=>blob=b;try{const expected=NSPresentation.tiff(working,c,g,0,g.height,NSPixelKernel.prepare(working,c));await exportTiff();const tiff=await NSTiff.decode(await blob.arrayBuffer()),bytes=await jpegBytes(),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));const result={bits:tiff.bits,icc:tiff.icc.length,pixels:tiff.data.every((v,i)=>v===expected[i]),size:[bitmap.width,bitmap.height],expectedSize:[g.width,g.height],jpeg:[bytes[0],bytes[1]],recipe:recipe===JSON.stringify(configuration38().v2)};bitmap.close();return result;}finally{downloadBlob=download;}});
 assert.equal(exported.bits,16);assert.equal(exported.icc,588);assert.equal(exported.pixels,true);assert.equal(exported.recipe,true);assert.deepEqual(exported.jpeg,[255,216]);assert.deepEqual(exported.size,exported.expectedSize);
 await selectBackend(p,'cpu');await p.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='cpu'&&!workerBusy38&&!queued38&&lastPreview38);
 assert.equal(await p.evaluate(()=>{const e=NSPixelKernel.render(workingPreview,configuration38(),display,1400);return e.data.every((v,i)=>v===lastPreview38.data[i]);}),true);
 await selectEngine(p,'calibrated4');await p.locator('#exposure').fill('650');await p.locator('#exposure').dispatchEvent('input');await p.locator('#reset').click();assert.equal(await p.evaluate(()=>state.engine),'calibrated4');
 assert.match(await p.locator('#advancedSettingsSummary').textContent(),/Konverteringsmotor: Standard/);
 await p.evaluate(async()=>{saveCurrentFrame();await chooseFrame(1);});await p.waitForFunction(()=>!rollLoading);assert.equal(await p.evaluate(()=>state.engine),'v2');
 await p.evaluate(()=>chooseFrame(0));await p.waitForFunction(()=>!rollLoading);assert.equal(await p.evaluate(()=>state.engine),'calibrated4');
 const mixed=await save();await load(mixed);assert.equal(await p.evaluate(()=>state.engine),'calibrated4');assert.deepEqual(await p.evaluate(()=>roll.map(f=>f.settings.engine)),['calibrated4','v2']);
 // Retired outer formats reject atomically instead of inheriting new defaults.
 const frozen=await p.evaluate(()=>JSON.stringify({state,rollShared,roll:roll.map(f=>f.settings)}));
 await p.locator('#settingsFile').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...original,format:'negative-studio-roll-v08'}))});await p.waitForFunction(()=>$('status').textContent.startsWith('Projektimport:'));assert.equal(await p.evaluate(()=>JSON.stringify({state,rollShared,roll:roll.map(f=>f.settings)})),frozen);
 await load(original);assert.equal(await p.evaluate(()=>state.engine),'v2');assert.equal(await p.evaluate(()=>state.v2Recipe.intent.id),original.frames[0].settings.v2Recipe.intent.id);
 await p.locator('#imageFile').setInputFiles('demo-negative.png');await p.waitForFunction(()=>working&&!rollLoading);
 assert.equal(await p.evaluate(()=>state.engine),'calibrated4');assert.match(await p.locator('#status').textContent(),/Standard: V2 kräver RAW/);assert.match(await p.locator('#advancedSettingsSummary').textContent(),/Konverteringsmotor: Standard/);
 await selectEngine(p,'v2');assert.equal(await p.evaluate(()=>state.engine),'calibrated4','no silent nonlinear-source conversion');
 // Real keyboard activation of the same import label, after removing the plus.
 assert.equal(await p.locator('label[for="imageFile"]').textContent(),'Importera');
 const picker=p.waitForEvent('filechooser');await p.locator('label[for="imageFile"]').focus();await p.keyboard.press('Enter');await (await picker).setFiles({name:'keyboard.dng',mimeType:'image/x-adobe-dng',buffer});
 await p.waitForFunction(()=>working&&!rollLoading&&state.engine==='v2');assert.equal(await p.evaluate(()=>state.editVersion),2);
 assert.deepEqual(errors,[]);console.log('PASS fresh locked V2 import/projects, one advanced selector, manual/queue/reset state, old explicit/missing engines, exact historical pixels, V2 recipe restore, GPU/CPU, JPEG/RGB16 TIFF and explicit nonlinear-source fallback');
}finally{await h.close();}
