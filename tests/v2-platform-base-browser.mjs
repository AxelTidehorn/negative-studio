import assert from 'node:assert/strict';
import {ensureBuild} from '../tools/build-artifact.mjs';
import {browserHarness} from './helpers/browser.mjs';
import {makeTiffHeader} from './helpers/legacy-tiff.mjs';

// Unprofiled RGB16 negative with a real border, imported through the ordinary
// file control. Its domain is explicitly declared through the existing UI.
const width=240,height=192;
const header=makeTiffHeader(width,height,makeTiffHeader(width,height,0).byteLength);
// Omit the historical fixture helper's optional SampleFormat tag (uint default).
new DataView(header).setUint16(10+10*12,65000,true);
const input=Buffer.alloc(header.byteLength+width*height*6);Buffer.from(header).copy(input);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const edge=x<30||x>=210||y<24||y>=168,t=edge?1:.1+.55*(x+y)/(width+height);
 for(let c=0;c<3;c++)input.writeUInt16LE(Math.round([.8,.5,.25][c]*t*65535),header.byteLength+((y*width+x)*3+c)*2);
}
ensureBuild();const h=await browserHarness();
const open=el=>el.evaluate(e=>{for(let p=e;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
const ready=p=>p.waitForFunction(()=>working&&!rollLoading);
const settled=p=>p.waitForFunction(()=>!workerBusy38&&!queued38&&previewCompletedKey===JSON.stringify([sourceVersion38,display,1400,configuration38()]));
try{
 const page=await h.browser.newPage({viewport:{width:1024,height:1000},locale:'sv-SE'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(30000);await page.addInitScript(()=>localStorage.setItem('filmlabb-preview-backend','cpu'));await page.goto(h.url);
 await page.locator('#imageFile').setInputFiles(['one','two'].map(name=>({name:name+'.tif',mimeType:'image/tiff',buffer:input})));
 await ready(page);
 async function selectV2(){
  await open(page.locator('#tiffEncoding'));await page.locator('#tiffEncoding').selectOption('linear-rec2020');
  await page.waitForFunction(()=>working&&!rollLoading&&working.colorSpace==='rec2020');
  await open(page.locator('#cropInset'));await page.locator('#cropInset').evaluate(e=>{e.value='14';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#engineMode').selectOption('v2');await page.waitForFunction(()=>state.engine==='v2'&&state.v2Recipe);
  await open(page.locator('#base2Panel'));
 }
 await selectV2();
 const automatic=await page.evaluate(()=>({base:state.v2Recipe.base,cal:state.v2Recipe.calibration,pixel:NSPixelKernel.compile(configuration38()).pixel([.2,.1,.05])}));
 assert.equal(automatic.base.acceptance,'automatic-platform');
 await page.locator('#base2Enable').click();await page.waitForFunction(()=>FILMLABB_BASE2.snapshot().proposal);
 assert.equal(await page.evaluate(()=>CE.findBase(working,cropRegion)),null);
 assert.equal(await page.evaluate(()=>state.v2Recipe.base.origin),'prior','warm automatic base cannot bypass Filmbas 2 acceptance');
 assert.equal(await page.evaluate(()=>accepted2()),null);
 await settled(page);
 assert.match(await page.locator('#calibrationStatus4').textContent(),/Filmbas saknas/);
 const fallback=await page.evaluate(()=>({rgb:state.v2Recipe.base.rgb,pixel:NSPixelKernel.compile(configuration38()).pixel([.2,.1,.05])}));
 assert.deepEqual(fallback.rgb,[1,1,1]);assert.notDeepEqual(fallback.pixel,automatic.pixel);
 await page.locator('#base2Preview').click();assert.equal(await page.evaluate(()=>state.v2Recipe.base.status),'proposal-preview');
 await page.locator('#base2Preview').click();assert.equal(await page.evaluate(()=>state.v2Recipe.base.origin),'prior');
 await page.locator('#base2Accept').click();await page.waitForFunction(()=>accepted2()&&state.v2Recipe.base.acceptance==='user-approved');
 assert.deepEqual(await page.evaluate(()=>state.v2Recipe.base.rgb),automatic.base.rgb);
 assert.deepEqual(await page.evaluate(()=>NSPixelKernel.compile(configuration38()).pixel([.2,.1,.05])),automatic.pixel,'approved automatic measurement restores the exact original V2 pixels');
 assert.deepEqual(await page.evaluate(()=>state.v2Recipe.calibration),automatic.cal);

 // Reanalysis/engine changes must not leak a new response or invalidate an
 // unchanged recipe. Exercise ordinary selectors as well as frozen snapshots.
 const stable=await page.evaluate(()=>({recipe:state.v2Recipe,count:FILMLABB_V2.snapshot().analysisCount}));
 await page.locator('#engineMode').selectOption('calibrated4');await page.locator('#engineMode').selectOption('v2');
 await page.evaluate(()=>{for(let i=0;i<3;i++){configuration38();analyzeLevels();}});
 assert.deepEqual(await page.evaluate(()=>({recipe:state.v2Recipe,count:FILMLABB_V2.snapshot().analysisCount})),stable);

 // Locked roll references remain owned by Filmbas 2, with explicit session and
 // source compatibility. A second frame gets its own source/intent identity.
 await open(page.locator('#base2Session'));await page.locator('#base2Session').fill('same-capture');await page.locator('#base2Session').dispatchEvent('change');
 assert.equal(await page.evaluate(()=>accepted2()),null);
 await page.locator('#base2Enable').click();await page.waitForFunction(()=>FILMLABB_BASE2.snapshot().proposal);
 await page.locator('#base2Accept').click();await page.waitForFunction(()=>!!accepted2());
 await open(page.locator('#shareBase'));await page.locator('#shareBase').click();
 assert.equal(await page.evaluate(()=>state.useRollBase2),true);
 const first=await page.evaluate(()=>state.v2Recipe);
 await page.locator('#filmstrip .frame').nth(1).click();await ready(page);await selectV2();
 await page.locator('#base2Enable').click();await page.waitForFunction(()=>FILMLABB_BASE2.snapshot().proposal);
 assert.equal(await page.evaluate(()=>state.v2Recipe.base.origin),'prior');
 await page.locator('#base2Session').fill('same-capture');await page.locator('#base2Session').dispatchEvent('change');
 await open(page.locator('#useRollBase'));await page.locator('#useRollBase').check();
 await page.waitForFunction(()=>state.useRollBase2&&state.v2Recipe.base.origin==='measured');
 const second=await page.evaluate(()=>state.v2Recipe);
 assert.deepEqual(second.base.rgb,first.base.rgb);assert.notEqual(second.source.revision,first.source.revision);
 await page.locator('#filmstrip .frame').nth(0).click();await ready(page);
 assert.deepEqual(await page.evaluate(()=>state.v2Recipe),first,'frame navigation restores the correct frozen recipe');
 await page.evaluate(()=>{window.captureDownload=downloadBlob;downloadBlob=b=>{window.projectData=b;};$('saveSettings').click();});
 const project=await page.evaluate(async()=>{downloadBlob=captureDownload;return await projectData.text();});
 await page.locator('#settingsFile').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(project)});
 await page.waitForFunction(()=>!rollLoading&&$('status').textContent.includes('matchades'));
 assert.deepEqual(await page.evaluate(()=>state.v2Recipe),first,'project restore uses the approved compatible reference and saved intent');
 await settled(page);
 assert.equal(await page.evaluate(()=>{const r=NSPixelKernel.render(workingPreview,configuration38(),display,1400);return r.data.every((v,i)=>v===lastPreview38.data[i]);}),true,'actual worker preview uses the current frozen recipe');
 assert.deepEqual(errors,[]);
 console.log('PASS ordinary TIFF→V2→Filmbas 2 activation/proposal/preview/accept, exact accepted pixels, stable engine/reanalysis, compatible roll reuse, distinct frame recipes, project round trip and actual worker output');
 console.log('Base-policy before/after sample',JSON.stringify({automatic:{rgb:automatic.base.rgb,pixel:automatic.pixel},unapproved:fallback,approvedRestoresAutomatic:true}));
}finally{await h.close();}
