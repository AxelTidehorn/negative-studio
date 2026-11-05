import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';
import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const h=await browserHarness(),errors=[];
const settled=p=>p.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu'&&!FILMLABB_GPU.snapshot().positivePending&&FILMLABB_GEOMETRY.snapshot().sourceVersion===sourceVersion38&&FILMLABB_GEOMETRY.snapshot().configKey===previewConfigKey38(configuration38()));
try{
 const p=await h.browser.newPage({viewport:{width:1024,height:768},hasTouch:true,locale:'sv-SE',serviceWorkers:'block'});p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.goto(h.url);
 await p.locator('#imageFile').setInputFiles(['one.dng','two.dng'].map(name=>({name,mimeType:'image/x-adobe-dng',buffer:fs.readFileSync('tests/fixtures/synthetic-negative.dng')})));await p.waitForFunction(()=>working&&!rollLoading);await p.locator('#engineMode').selectOption('v2');await settled(p);
 const parity=await p.evaluate(()=>{
  const K=NSPixelKernel,P=NSV2Platform,gpu=NSGpuPreview.create(document.createElement('canvas')),gl=gpu.context,ext=gl.getExtension('WEBGL_debug_renderer_info'),renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  const width=53,height=37,rgb=[.8,.45,.2],data=new Float32Array(width*height*3);
  for(let n=0;n<width*height;n++)for(let c=0;c<3;c++)data[n*3+c]=rgb[c]*10**(-(.08+1.8*((n*(177+c*263)+c*337)%65536)/65535));
  const im={width,height,data,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'},base=configuration38(),cases=[];let total=0,sum=0,worst=0,channelSum=[0,0,0],absolute=[];
  const adjustments=[{}, {exposure:1.1,contrast:1.35,gamma:.82,shadow:.02,highlight:.96,shadows:35,highlights:-42}, {temperature:25,tint:-15,saturation:1.4,vibrance:60}, {temperature:-25,tint:15,saturation:.65,vibrance:-100},{exposure:-1,contrast:.85,vibrance:100}];
  for(const [algorithm,photo,finish] of [[1,0,false],[2,0,false],[3,0,false],[3,1,false],[3,2,false],[3,2,true]]){
   const prepared=P.prepare(im,{sourceKey:'gpu-fixture',recipe:{decoder:'fixture',version:'1'},capture:{session:'test',recipe:{decoder:'fixture'}},measurement:{measured:rgb,kind:'manual-region',status:'review'},area:{region:{x:0,y:0,w:1,h:1},status:'confirmed'},algorithmVersion:algorithm,calibration:algorithm===1?NSConversionV2.prior:NSConversionV2.latestPrior,photographic:photo});
   const recipe=finish?{...prepared,intent:{...prepared.intent,output:NSV2Render.presentationRecipe.version}}:prepared;
   const c0={...base,v2:recipe},positive=K.v2PositiveImage(im,c0,{cache:false});
   for(const profile of ['generic','gold','portra','hp5','trix'])for(let edit=0;edit<adjustments.length;edit++){
    const c={...c0,opts:{...base.opts,...NSEditing2.neutral,editVersion:2,...adjustments[edit]},profile:NSCreativeProfiles.resolve(filmProfiles,profile,2),neutralProfile:profile==='generic',strength:.7,print:edit%2?printStyles.soft:printStyles.neutral,neutralPrint:!(edit%2)};
    gpu.draw(im,c,'positive',width,JSON.stringify([algorithm,photo,finish]),positive);const actual=gpu.read().data,oracle=K.compile(c);let max=0;
    for(let n=0;n<width*height;n++){const q=oracle.pixel(P.read(im,n*3));for(let c=0;c<3;c++){const d=actual[n*4+c]-Math.round(q[c]*255);max=Math.max(max,Math.abs(d));worst=Math.max(worst,Math.abs(d));sum+=Math.abs(d);channelSum[c]+=d;absolute.push(Math.abs(d));total++;}}
    cases.push({algorithm,photo,finish,profile,edit,max});
   }
  }
  // Float32 positive ramp includes tiny chroma and dark values. Quantized input
  // is an intentionally worse control, never the real preview representation.
  const encoded={...im,colorSpace:'srgb',encoding:'srgb',data:new Float32Array(data.length)};
  for(let n=0;n<width*height;n++){const v=.005+.35*n/(width*height);encoded.data.set([v,v+.0007,v-.0003],n*3);}
  const quantized={...encoded,data:Float32Array.from(encoded.data,v=>Math.round(v*255)/255)},c={...base,opts:{...base.opts,exposure:4,contrast:1.6,shadow:.02,highlight:.5,vibrance:100},neutralProfile:true,neutralPrint:true},oracle=K.compile({...c,v2Positive:true});let floatError=0,quantizedError=0;
  for(const [input,id]of [[encoded,'float'],[quantized,'quantized']]){gpu.draw(im,c,'positive',width,id,input);const out=gpu.read().data;for(let n=0;n<width*height;n++){const ref=oracle.pixel(Array.from(encoded.data.subarray(n*3,n*3+3)));for(let c=0;c<3;c++){const error=Math.abs(out[n*4+c]-Math.round(ref[c]*255));if(id==='float')floatError=Math.max(floatError,error);else quantizedError=Math.max(quantizedError,error);}}}
  let negativeMax=0;for(const flatField of [undefined,{size:17,gains:Array.from({length:17*17*3},(_,i)=>.9+(i%5)/20)}])for(const limit of [53,31]){
   const source={...im,flatField},c={...base,workingSpace:'rec2020'};gpu.draw(source,c,'negative',limit,flatField?'flat':'raw');const actual=gpu.read(),ref=K.render(source,c,'negative',limit);for(let i=0;i<ref.data.length;i++)negativeMax=Math.max(negativeMax,Math.abs(actual.data[i]-ref.data[i]));
  }
  absolute.sort((a,b)=>a-b);gpu.destroy();return {renderer,cases,worst,negativeMax,meanAbsolute:sum/total,p99:absolute[Math.floor(.99*absolute.length)],signedMean:channelSum.map(s=>s/(total/3)),precision:{floatError,quantizedError}};
 });
 assert.ok(parity.negativeMax<=2);assert.ok(parity.worst<=2,JSON.stringify(parity.cases.filter(c=>c.max>2)));assert.ok(parity.precision.floatError<=2);assert.ok(parity.precision.quantizedError>parity.precision.floatError);console.log('PASS V2 CPU/GPU',JSON.stringify({...parity,cases:parity.cases.length}));
 // Let the idle histogram run as well: it must reuse the very same positive.
 await p.waitForTimeout(400);const before=await p.evaluate(()=>({gpu:FILMLABB_GPU.snapshot(),recipe:JSON.stringify(state.v2Recipe),analyses:analysisCount38}));
 await p.evaluate(()=>{for(let i=0;i<40;i++){state.exposure=i/50;state.vibrance=i;state.saturation=1+i/100;scheduleRender();}scheduleRender(true);});await settled(p);await p.waitForTimeout(400);
 const after=await p.evaluate(()=>({gpu:FILMLABB_GPU.snapshot(),recipe:JSON.stringify(state.v2Recipe),analyses:analysisCount38}));
 assert.equal(after.gpu.positiveReconstructions,before.gpu.positiveReconstructions);assert.equal(after.gpu.positiveUploads,before.gpu.positiveUploads);assert.equal(after.gpu.validationUploads,before.gpu.validationUploads);assert.equal(after.recipe,before.recipe);assert.equal(after.analyses,before.analyses);
 for(const id of ['gold','hp5','generic']){await p.evaluate(id=>{rollShared.profile=id;scheduleRender(true);},id);await settled(p);}
 await p.locator('#rotateRight').evaluate(e=>e.click());await p.waitForTimeout(80);
 assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().positiveReconstructions),before.gpu.positiveReconstructions);assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().positiveUploads),before.gpu.positiveUploads);
 // Full recipe mutation invalidates, even if a metadata ID stays unchanged.
 await p.evaluate(()=>{state.v2Recipe={...state.v2Recipe,intent:{...state.v2Recipe.intent,exposure:state.v2Recipe.intent.exposure+.1}};scheduleRender(true);});await settled(p);assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().positiveReconstructions),before.gpu.positiveReconstructions+1);
 const current=await p.evaluate(()=>JSON.stringify(state.v2Recipe));
 await p.evaluate(()=>{$('previewBackend').value='cpu';$('previewBackend').onchange();});await p.waitForFunction(()=>!!lastPreview38&&!workerBusy38&&!queued38);assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().mainPositive.conversions),0,'CPU fallback adopts cache');
 await p.evaluate(()=>{$('previewBackend').value='auto';$('previewBackend').onchange();});await settled(p);assert.equal(await p.evaluate(()=>JSON.stringify(state.v2Recipe)),current);assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().positiveReconstructions),before.gpu.positiveReconstructions+1);
 await p.evaluate(()=>{window.loss=$('gpuPreview').getContext('webgl2').getExtension('WEBGL_lose_context');loss.loseContext();});await p.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='cpu'&&lastPreview38);await p.evaluate(()=>loss.restoreContext());await settled(p);assert.equal(await p.evaluate(()=>JSON.stringify(state.v2Recipe)),current);assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().positiveReconstructions),before.gpu.positiveReconstructions+1);
 // Start a new recipe preparation then switch image immediately. Late jobs may
 // not paint over the next image (the source owner terminates its old worker).
 await p.evaluate(()=>{state.v2Recipe={...state.v2Recipe,intent:{...state.v2Recipe.intent,exposure:state.v2Recipe.intent.exposure+.1}};render();return chooseFrame(1);});await p.waitForFunction(()=>activeFrame===1&&!rollLoading);await p.locator('#engineMode').selectOption('v2');await settled(p);assert.equal(await p.evaluate(()=>FILMLABB_GEOMETRY.snapshot().sourceVersion),await p.evaluate(()=>sourceVersion38));
 await p.locator('#engineMode').selectOption('log39');await p.waitForFunction(()=>state.engine==='log39'&&!rollLoading&&FILMLABB_GPU.snapshot().backend==='cpu');await p.locator('#engineMode').selectOption('calibrated4');await p.waitForFunction(()=>FILMLABB_GPU.snapshot().backend==='gpu');await p.locator('#engineMode').selectOption('v2');await settled(p);
 // The ordinary FilmBas 2 acceptance/undo owners invalidate the GPU source
 // while leaving the frozen technical response unchanged.
 const baseBefore=await p.evaluate(()=>({rgb:state.v2Recipe.base.rgb,cal:state.v2Recipe.calibration,count:FILMLABB_GPU.snapshot().positiveReconstructions}));
 await p.evaluate(()=>{if(state.filmBaseVersion!==2)$('base2Enable').click();const a=accepted2();if(a)a.baseLocked=false;setProposal2(FM2.measure(working,{x:.4,y:.2,w:.15,h:.5}));FILMLABB_BASE2.accept();});await settled(p);
 assert.notDeepEqual(await p.evaluate(()=>state.v2Recipe.base.rgb),baseBefore.rgb);assert.deepEqual(await p.evaluate(()=>state.v2Recipe.calibration),baseBefore.cal);assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().positiveReconstructions),baseBefore.count+1);
 await p.evaluate(()=>$('base2Undo').click());await settled(p);assert.deepEqual(await p.evaluate(()=>state.v2Recipe.base.rgb),baseBefore.rgb);assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().positiveReconstructions),baseBefore.count+2);
 for(const mode of ['negative','split','positive']){await p.evaluate(mode=>{display=mode;render();},mode);await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>FILMLABB_GPU.snapshot().backend),'gpu');}
 // Existing project/export UI exercised by v2-platform-browser, plus backend
 // invariance of actual encoder inputs here (same current frozen recipe).
 const exports=await p.evaluate(async()=>{state.cropConfirmed=true;let blob;const old=downloadBlob;downloadBlob=b=>blob=b;try{await exportTiff();const a=new Uint8Array(await blob.arrayBuffer());$('previewBackend').value='cpu';$('previewBackend').onchange();await exportTiff();const b=new Uint8Array(await blob.arrayBuffer()),bytes=await jpegBytes(),decoded=await createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));return {same:a.length===b.length&&a.every((v,i)=>v===b[i]),jpeg:[bytes[0],bytes[1],bytes.at(-2),bytes.at(-1)],width:decoded.width};}finally{downloadBlob=old;}});assert.equal(exports.same,true);assert.deepEqual(exports.jpeg,[255,216,255,217]);assert.ok(exports.width>0);
 assert.deepEqual(errors,[]);console.log('PASS actual V2 worker→Float32→GPU, burst/profile/geometry cache reuse, recipe invalidation, CPU seeding/context recovery, stale source jobs, Original/Standard/V2 switch, exact TIFF and decoded JPEG');
 // Optional existing decoded RAF overviews; no original or pixel is published.
 const referenceRoot=process.env.FILMLABB_V2_GPU_REFERENCES,realReferences=[];
 if(referenceRoot)for(const id of ['04','09','10']){
  const meta=JSON.parse(fs.readFileSync(referenceRoot+'/'+id+'_source.json')),bytes=fs.readFileSync(referenceRoot+'/'+id+'_overview.f32');
  const result=await p.evaluate(({meta,encoded,id})=>{
   const raw=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),im={...meta.overview,data:new Float32Array(raw.buffer)},gpu=NSGpuPreview.create(document.createElement('canvas')),base=configuration38(),recipe={schema:'FILMLABB.V2Recipe',version:1,algorithmVersion:3,source:meta.source,base:meta.base,calibration:meta.calibration,intent:{...NSV2Render.photographic(meta.intent,2),output:NSV2Render.presentationRecipe.version},analysisSignature:'frozen-reference'},cases=[];
   NSV2Platform.validate(recipe);const positive=NSPixelKernel.v2PositiveImage(im,{...base,v2:recipe},{cache:false});
   for(const opts of [{}, {exposure:.7,contrast:1.3,vibrance:60,saturation:1.25},{temperature:20,tint:-8,shadows:30,highlights:-25}]){
    const config={...base,v2:recipe,opts:{...NSEditing2.neutral,editVersion:2,...opts},profile:{type:'color'},neutralProfile:true,neutralPrint:true};gpu.draw(im,config,'positive',1400,id,positive);const actual=gpu.read().data,k=NSPixelKernel.compile(config);let max=0,sum=0,bias=[0,0,0],aboveOne=0;
    for(let n=0;n<im.width*im.height;n++){const expected=k.pixel(NSV2Platform.read(im,n*3));for(let c=0;c<3;c++){const d=actual[n*4+c]-Math.round(expected[c]*255);max=Math.max(max,Math.abs(d));sum+=Math.abs(d);bias[c]+=d;aboveOne+=Math.abs(d)>1;}}
    cases.push({opts,max,meanAbsolute:sum/(im.width*im.height*3),signedMean:bias.map(v=>v/(im.width*im.height)),aboveOne});
   }gpu.destroy();return {id,dimensions:[im.width,im.height],basis:'existing locked linear Rec.2020 RAF point overview; frozen base/calibration/automatic exposure/color; current Photographic 2 + photographic-finish-1; identical input for CPU/GPU',cases};
  },{meta,encoded:bytes.toString('base64'),id});assert.ok(result.cases.every(r=>r.max<=2),JSON.stringify(result));realReferences.push(result);
 }
 if(realReferences.length){console.log('PASS existing RAF overview parity',JSON.stringify(realReferences));fs.writeFileSync('.cache/v2-gpu-raf-parity.json',JSON.stringify(realReferences,null,2));}
 // Actual V2 CPU fallback for unavailable contexts, shader failure and missing
 // highp precision. Same standard source owner and current frozen recipe.
 for(const fault of ['webgl','shader','precision']){
  const q=await h.browser.newPage({serviceWorkers:'block'});q.setDefaultTimeout(60000);q.on('pageerror',e=>errors.push(e.message));
  await q.addInitScript(fault=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'&&this.id==='gpuPreview'){
   if(fault==='webgl')return null;const gl=get.call(this,type,...args);if(fault==='precision'){gl.getShaderPrecisionFormat=()=>({precision:10});}else{const param=gl.getProgramParameter.bind(gl);gl.getProgramParameter=(program,key)=>key===gl.LINK_STATUS?false:param(program,key);}return gl;
  }return get.call(this,type,...args);};},fault);
  await q.goto(h.url);await q.locator('#imageFile').setInputFiles('tests/fixtures/synthetic-negative.dng');await q.waitForFunction(()=>working&&!rollLoading);await q.locator('#engineMode').selectOption('v2');await q.waitForFunction(()=>state.engine==='v2'&&!rollLoading&&lastPreview38&&!workerBusy38&&!queued38);
  const state=await q.evaluate(()=>({gpu:FILMLABB_GPU.snapshot(),queue:roll.length,recipe:!!state.v2Recipe,pixels:lastPreview38.data.length}));assert.equal(state.gpu.backend,'cpu');assert.ok(state.gpu.reason);assert.ok(state.recipe&&state.queue&&state.pixels);await q.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS V2 fallback for missing WebGL2, shader link failure and insufficient highp');
 fs.mkdirSync('.cache',{recursive:true});fs.writeFileSync('.cache/v2-gpu-parity.json',JSON.stringify(parity,null,2));
}finally{await h.close();}
