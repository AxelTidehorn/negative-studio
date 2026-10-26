import assert from 'node:assert/strict';import path from 'node:path';
import {browserHarness} from './helpers/browser.mjs';
// Optional checkout argument lets the same tests reproduce failures on frozen main.
if(process.argv[2])process.chdir(path.resolve(process.argv[2]));
const {browser,url,close}=await browserHarness(),failures=[];
async function check(name,fn){try{await fn();console.log('PASS',name);}catch(e){failures.push(name+': '+e.message);console.error('FAIL',name,e.message);}}
try{
 const page=await browser.newPage({serviceWorkers:'block',locale:'sv-SE'}),errors=[];
 page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 await page.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu');
 await check('late TIFF reference decoding preserves the currently active source metadata',async()=>{
  const result=await page.evaluate(async()=>{
   const decode=NSTiff.decode;let release;
   NSTiff.decode=()=>new Promise(r=>release=r);
   const pending=readFlatNext(new File([new Uint8Array(100)],'reference.tif'));
   while(!release)await new Promise(r=>setTimeout(r,0));
   const current={encoding:'linear',label:'NEW ACTIVE SOURCE',domain:'new-domain'};sourceInfo=current;
   release({width:1,height:1,channels:3,bits:16,data:new Uint16Array([2000,3000,4000])});
   try{await pending;return sourceInfo===current;}finally{NSTiff.decode=decode;}
  });assert.equal(result,true);
 });
 // Reimport resets the deliberately substituted metadata above.
 await page.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu');
 await check('GPU renderer releases previous preview after a failed image switch',async()=>{
  await page.evaluate(async()=>{
   globalThis.previousPreview=new WeakRef(workingPreview);const read=readFile;
   roll.push({file:{name:'broken.png'},settings:defaultState(),geometry:NSGeometry.create()});
   readFile=async()=>{throw Error('synthetic decode failure');};
   try{await chooseFrame(1);}finally{readFile=read;}
  });
  const cdp=await page.context().newCDPSession(page);await cdp.send('HeapProfiler.collectGarbage');
  assert.equal(await page.evaluate(()=>previousPreview.deref()===undefined),true);await cdp.detach();
 });
 await page.evaluate(()=>chooseFrame(0));await page.waitForFunction(()=>working&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='gpu');
 await check('restored GPU preview reuses source upload across edits',async()=>{
  const before=await page.evaluate(()=>FILMLABB_GPU.snapshot().sourceUploads);
  await page.evaluate(()=>{state.exposure=.2;render();render();});
  assert.equal(await page.evaluate(()=>FILMLABB_GPU.snapshot().sourceUploads),before);
 });
 await check('completed CPU cache repaints identical bytes without repeated color work',async()=>{
  const result=await page.evaluate(()=>{
   $('previewBackend').value='cpu';$('previewBackend').onchange();stopPreviewWork();workerDisabled38=true;
   const original=NSPixelKernel.render;let calls=0;NSPixelKernel.render=(...a)=>{calls++;return original(...a);};
   try{render();const expected=Array.from(lastPreview38.data);render();render();return {calls,same:JSON.stringify(expected)===JSON.stringify(Array.from(lastPreview38.data))};}
   finally{NSPixelKernel.render=original;}
  });assert.equal(result.calls,1);assert.equal(result.same,true);
 });
 await check('JPEG main fallback reuses bounded stripes with exact pre-encode pixels',async()=>{
  const result=await page.evaluate(async()=>{
   const create=CanvasRenderingContext2D.prototype.createImageData,put=CanvasRenderingContext2D.prototype.putImageData,WorkerBefore=globalThis.Worker;
   let allocations=0,maxError=0,puts=0;globalThis.Worker=undefined;
   const selection=exportGeometrySnapshot(working),prepared=NSPixelKernel.prepare(working,configuration38());
   CanvasRenderingContext2D.prototype.createImageData=function(...a){allocations++;return create.apply(this,a);};
   CanvasRenderingContext2D.prototype.putImageData=function(out,x,y,...a){
    const expected=NSPresentation.rgba(working,prepared,selection.g,{width:this.canvas.width,height:this.canvas.height},y,out.height);
    for(let i=0;i<out.data.length;i++)maxError=Math.max(maxError,Math.abs(expected[i]-out.data[i]));puts++;return put.call(this,out,x,y,...a);
   };
   try{const bytes=await jpegBytes();return {allocations,puts,maxError,jpeg:bytes[0]===255&&bytes[1]===216};}
   finally{CanvasRenderingContext2D.prototype.createImageData=create;CanvasRenderingContext2D.prototype.putImageData=put;globalThis.Worker=WorkerBefore;}
  });assert.ok(result.puts>2);assert.ok(result.allocations<=2,JSON.stringify(result));assert.equal(result.maxError,0);assert.equal(result.jpeg,true);
 });
 await check('presentation initialization failure releases allocated GPU resources',async()=>{
  const result=await page.evaluate(()=>{
   const c=document.createElement('canvas'),gl=c.getContext('webgl2');let texture=0,program=0,shader=0,threw=false;
   for(const [method,count] of [['deleteTexture',()=>texture++],['deleteProgram',()=>program++],['deleteShader',()=>shader++]]){const original=gl[method].bind(gl);gl[method]=(...a)=>{count();return original(...a);};}
   gl.getProgramParameter=()=>false;
   try{NSPreviewPresentation.create(c);}catch{threw=true;}
   return {texture,program,shader,threw};
  });assert.deepEqual(result,{texture:1,program:1,shader:2,threw:true});
 });
 await check('presentation caches uniform locations across redraws and texture clearing',async()=>{
  const result=await page.evaluate(()=>{
   const c=document.createElement('canvas'),gpu=NSPreviewPresentation.create(c),gl=c.getContext('webgl2'),source=document.createElement('canvas');source.width=9;source.height=6;
   const original=gl.getUniformLocation.bind(gl);let lookups=0;gl.getUniformLocation=(...a)=>{lookups++;return original(...a);};
   const p=NSGeometry.compositionTransform(9,6,NSGeometry.create());p.sourceWidth=9;p.sourceHeight=6;const bounds=NSGeometry.pixelBounds(9,6,null);
   gpu.upload(source);gpu.draw(p,9,6,bounds);const first=lookups;
   gpu.draw(p,9,6,bounds);gpu.clear();gpu.upload(source);gpu.draw(p,9,6,bounds);gpu.destroy();return {first,total:lookups};
  });assert.ok(result.first>0);assert.equal(result.total,result.first);
 });
 assert.deepEqual(errors,[]);
 if(failures.length)throw Error(failures.join('\n'));
}finally{await close();}
