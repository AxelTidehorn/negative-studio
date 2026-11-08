/* Optional display backend. Owns no calibration, project settings or export path. */
'use strict';
(() => {
 const canvas=$('gpuPreview'),baseCanvas=$('preview'),selector=$('previewBackend'),badge=$('previewBackendStatus'),info=$('previewBackendInfo');
 if(!canvas||!selector||typeof NSGpuPreview==='undefined')return;
 const cpuRender=render,cpuSchedule=scheduleRender,cpuDrawCrop=drawCrop,cpuShow=showPreview38,cpuClear=$('clearQueue').onclick,cpuChoose=chooseFrame,cpuFinish=finishImport;
 const perfBefore=globalThis.FILMLABB_PERFORMANCE;
 let preference='auto';try{if(localStorage.getItem('filmlabb-preview-backend')==='cpu')preference='cpu';}catch{}
 selector.value=preference;
 let renderer=null,failure=null,active=false,frame=null,frameIsRaf=false,idle=null,histTimer=null,histWorker=null,histSource=-1,histSequence=0,histPending=null,histBusy=false,histDisabled=false,validationKey=null;
 let lastSource=null,lastVersion=-1,interactiveLimit=700,histSourceKey=null,histSmall=null;
 const metrics={backend:'cpu',frames:0,sourceUploads:0,validationError:null,lastSubmitMs:0,lastGpuMs:null,reason:null,contextLosses:0,positiveRequests:0,positiveReconstructions:0,positiveDiscards:0,positiveCancelled:0,positiveCacheBytes:0,positivePreparationMs:0,positiveReconstructionMs:0,positiveCopyMs:0,positiveStartedAt:null,positiveReadyAt:null,histogramReconstructions:0,histogramSourceBytes:0};
 const requestFrame=fn=>{frameIsRaf=typeof requestAnimationFrame==='function';return frameIsRaf?requestAnimationFrame(fn):setTimeout(fn,16);};
 function cancelFrame(){if(frame!==null){if(frameIsRaf)cancelAnimationFrame(frame);else clearTimeout(frame);frame=null;}}
 function cancelTimers(){cancelFrame();clearTimeout(idle);clearTimeout(histTimer);idle=histTimer=null;}
 function status(backend,reason=''){
  metrics.backend=backend;metrics.reason=reason||null;badge.textContent=backend==='gpu'?'GPU':'CPU';
  badge.title=backend==='gpu'?'GPU-förhandsvisning · prototyp':reason||'CPU-förhandsvisning';
  info.textContent=backend==='gpu'?'GPU-prototyp aktiv · export använder CPU':reason||'CPU-förhandsvisning aktiv';
 }
 function syncView(){
  const visible=active&&!!workingPreview&&!!src&&!baseCanvas.classList.contains('hidden');
  canvas.classList.toggle('hidden',!visible);
  // Keep the original canvas as the pointer target for all existing eyedroppers.
  const opacity=visible?'0':'';if(baseCanvas.style.opacity!==opacity)baseCanvas.style.opacity=opacity;
  if(visible){canvas.style.cssText=baseCanvas.style.cssText;canvas.style.opacity='1';canvas.style.pointerEvents='none';}
 }
 drawCrop=function(){cpuDrawCrop();syncView();};
 if(typeof MutationObserver!=='undefined')new MutationObserver(syncView).observe(baseCanvas,{attributes:true,attributeFilter:['style','class']});
 function eligible(config){if(preference==='cpu'||failure||!workingPreview)return false;const c=config||configuration38();return NSGpuPreview.supports(c)&&!(c.kind==='v2'&&renderer?.capabilities.floatColor===false);}
 function cpu(reason,limit=1400){
  active=false;syncView();status('cpu',reason);return cpuRender(limit);
 }
 function stopHistogram(){histSourceKey=null;histSmall=null;metrics.histogramSourceBytes=0;clearTimeout(histTimer);histTimer=null;histSequence++;histPending=null;histBusy=false;histSource=-1;if(histWorker)histWorker.terminate();histWorker=null;}
 function resetSource(){metrics.positiveCacheBytes=0;NSPixelKernel.clearV2Positive();cancelTimers();stopHistogram();renderer?.releaseSource();active=false;lastSource=null;lastVersion=-1;validationKey=null;syncView();}
 function dispose(){if(renderer)renderer.destroy();renderer=null;lastSource=null;validationKey=null;}
 function fail(e){
  failure=e?.message||String(e);metrics.reason=failure;cancelTimers();stopHistogram();dispose();active=false;syncView();status('cpu','GPU-reservläge · '+failure);
 }
 function sendHistogram(job){histBusy=true;histWorker.postMessage(job);}
 function sourceKey(version,source){return JSON.stringify([version,source.width,source.height,source.channels,source.scale,source.normalization,source.encoding,source.colorSpace,source.flatField]);}
 function histogramWorker(config,version,source){
  if(histDisabled||typeof Worker==='undefined')throw Error('Preview histogram worker is unavailable');
  if(!histWorker){
   const worker=new Worker('./preview-worker.js');histWorker=worker;
   worker.onmessage=({data:r})=>{
    if(worker!==histWorker)return;histBusy=false;metrics.histogramReconstructions+=r.reconstructions||0;
    if(r.error){histDisabled=true;stopHistogram();if(active)scheduleHistogram(configuration38());return;}
    if(active&&r.id===histSequence&&histSource===sourceVersion38)drawHistogram38(r.histogram||r.bins);
    if(histPending){const next=histPending;histPending=null;sendHistogram(next);}
   };
   worker.onerror=()=>{if(worker!==histWorker)return;histDisabled=true;stopHistogram();if(active)scheduleHistogram(configuration38());};
  }
  const key=JSON.stringify([sourceKey(version,source),config.kind==='v2']);
  if(histSourceKey!==key){
   // Point coordinates match the existing 160px CPU histogram. A small retained
   // negative/positive cache avoids reconstructing the full image for histogram.
   const image=config.kind==='v2'?NSV2Platform.preview(source,160):source,data=config.kind==='v2'?image.data:image.data.slice(),bytes=data.byteLength;
   histWorker.postMessage({type:'source',image:{...image,previewRevision:version,data}},[data.buffer]);histSource=version;histSourceKey=key;metrics.histogramSourceBytes=bytes;
  }
  return histWorker;
 }
 function updateHistogram(config,version,source,sequence){
  const job={id:sequence,config,mode:display==='split'?'positive':display,limit:160};
  if(!histDisabled&&typeof Worker!=='undefined')try{histogramWorker(config,version,source);if(histBusy)histPending=job;else sendHistogram(job);return;}catch{histDisabled=true;stopHistogram();}
  // Small idle-only fallback, retaining the same bounded V2 source across edits.
  if(active&&version===sourceVersion38&&source===workingPreview&&sequence===histSequence){if(config.kind==='v2'&&(!histSmall||histSmall.source!==source||histSmall.key!==sourceKey(version,source)))histSmall={source,key:sourceKey(version,source),image:NSV2Platform.preview(source,100)};const image=config.kind==='v2'?histSmall.image:source,r=NSPixelKernel.render(image,config,display==='split'?'positive':display,100);drawHistogram38(r.histogram||r.bins);}
 }

 function scheduleHistogram(config){
  clearTimeout(histTimer);const sequence=++histSequence,version=sourceVersion38,source=workingPreview;
  $('histogramInfo').textContent='Histogram uppdateras…';
  histTimer=setTimeout(()=>{histTimer=null;updateHistogram(config,version,source,sequence);},220);
 }
 function drawGpu(interactive=false,config=workingPreview?configuration38():null){
  if(!workingPreview)return;
  workingPreview.previewRevision=sourceVersion38;
  if(!eligible(config))return cpu(failure?'GPU-reservläge · '+failure:preference==='cpu'?'CPU vald':'Detta färgläge använder CPU');
  try{
   if(!renderer)renderer=NSGpuPreview.create(canvas);
   if(config.kind==='v2'&&!renderer.capabilities.floatColor){stopHistogram();renderer.releaseSource();lastSource=null;lastVersion=-1;metrics.positiveCacheBytes=0;return cpu('V2 kräver flyttalsbuffer som GPU:n inte stöder.');}
   // Engine switches can replace the bounded source without a new import. Do
   // not retain the previous negative texture beside the new V2 positive.
   if((lastSource&&lastSource!==workingPreview)||(lastVersion>=0&&lastVersion!==sourceVersion38)){stopHistogram();renderer.releaseSource();metrics.positiveCacheBytes=0;NSPixelKernel.clearV2Positive();lastSource=null;lastVersion=-1;}
   const key=config.kind==='v2'?JSON.stringify([NSV2GpuMath.version,sourceVersion38,NSPixelKernel.v2PreviewKey(workingPreview,config),NSEditing2.version(config.opts.editVersion)]):JSON.stringify([config.kind,config.conversion3?.revision,config.look,config.monochrome,sourceVersion38,NSEditing2.version(config.opts.editVersion)]);
   if(validationKey!==key){metrics.validationError=renderer.validate(config);if(config.kind==='v2')metrics.validationError=Math.max(metrics.validationError,renderer.validate({...config,look:{id:'neutral',strength:0},monochrome:false,opts:{...config.opts,exposure:1.3,contrast:1.4,saturation:1.4,vibrance:60}}));validationKey=key;}
   if(!active){stopPreviewWork();clearTimeout(previewTick38);clearTimeout(dragTimer38);previewTick38=dragTimer38=null;}
   const ms=renderer.metrics.gpuMs;
   if(ms!==null){if(ms>25)interactiveLimit=Math.max(400,Math.round(interactiveLimit*.75));else if(ms<10)interactiveLimit=Math.min(1400,interactiveLimit+100);}
   const start=now38(),before=renderer.metrics.reconstructions,id=++request38,mode=display==='split'&&globalThis.FILMLABB_GEOMETRY?'positive':display,r=renderer.draw(workingPreview,config,mode,interactive?interactiveLimit:1400,sourceVersion38);r.id=id;r.configKey=previewConfigKey38(config);
   globalThis.FILMLABB_GEOMETRY?.colorGpu(canvas,r,sourceVersion38);
   if(display==='split'&&globalThis.FILMLABB_GEOMETRY){renderer.draw(workingPreview,config,'negative',interactive?interactiveLimit:1400,sourceVersion38);FILMLABB_GEOMETRY.colorGpu(canvas,r,sourceVersion38,true);}
   const reconstructed=renderer.metrics.reconstructions-before;if(reconstructed){metrics.positiveRequests+=reconstructed;metrics.positiveReconstructions+=reconstructed;metrics.positiveStartedAt=start;metrics.positiveReadyAt=now38();metrics.positivePreparationMs=renderer.metrics.reconstructionSubmitMs;}metrics.positiveCacheBytes=renderer.metrics.positiveTextureBytes;
   active=true;lastSource=workingPreview;lastVersion=sourceVersion38;stats38.renders++;metrics.frames++;
   metrics.sourceUploads=renderer.metrics.uploads;metrics.lastSubmitMs=now38()-start;metrics.lastGpuMs=renderer.metrics.gpuMs;
   // Geometry and all click-to-source mappings retain their original dimensions.
   if(baseCanvas.width!==r.width)baseCanvas.width=r.width;if(baseCanvas.height!==r.height)baseCanvas.height=r.height;
   lastPreview38=null;status('gpu');drawCrop();scheduleHistogram(config);
  }catch(e){fail(e);return cpu('GPU-reservläge · '+failure);}
 }
 render=function(limit=1400){
  const config=preference!=='cpu'&&!failure&&workingPreview?configuration38():null;
  if(eligible(config)){cancelFrame();clearTimeout(idle);idle=null;return drawGpu(false,config);}
  cancelTimers();stopHistogram();return cpu(failure?'GPU-reservläge · '+failure:preference==='cpu'?'CPU vald':'Detta färgläge använder CPU',limit);
 };
 scheduleRender=function(immediate=false){
  const config=preference!=='cpu'&&!failure&&workingPreview?configuration38():null;
  if(!eligible(config)){if(active){active=false;syncView();}return cpuSchedule(immediate);}
  clearTimeout(idle);clearTimeout(histTimer);histSequence++;
  if(immediate){cancelFrame();return drawGpu(false,config);}
  if(frame===null)frame=requestFrame(()=>{frame=null;drawGpu(true);});
  idle=setTimeout(()=>{idle=null;drawGpu(false);},180);
 };
 // A late CPU worker must never paint over a newer GPU preview.
 showPreview38=function(r){if(active&&eligible())return;return cpuShow(r);};
 selector.onchange=()=>{
  preference=selector.value==='cpu'?'cpu':'auto';try{localStorage.setItem('filmlabb-preview-backend',preference);}catch{}
  cancelTimers();stopHistogram();failure=null;
  if(preference==='cpu'){active=false;dispose();syncView();status('cpu','CPU vald');}
  if(workingPreview)render();else status('cpu',preference==='cpu'?'CPU vald':'GPU provas när en bild öppnas');
 };
 finishImport=function(message){resetSource();return cpuFinish(message);};
 chooseFrame=async function(index,opts={}){
  if(index>=0&&index<roll.length&&!rollLoading&&!exportBusy&&!cropDrag&&(opts.force||index!==activeFrame))resetSource();
  return cpuChoose(index,opts);
 };
 $('clearQueue').onclick=()=>{if(rollLoading||exportBusy)return;resetSource();dispose();cpuClear();status('cpu',preference==='cpu'?'CPU vald':'GPU provas när en bild öppnas');};
 canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();metrics.contextLosses++;fail(Error('Grafikanslutningen förlorades'));
  if(workingPreview)cpuRender();
 });
 canvas.addEventListener('webglcontextrestored',()=>{renderer=null;failure=null;validationKey=null;if(workingPreview&&preference!=='cpu')render();});
 globalThis.FILMLABB_GPU={snapshot:()=>({...metrics,preference,interactiveLimit,sourceVersion:lastVersion,sourceMatches:!!lastSource&&lastSource===workingPreview,positivePending:false,positiveKey:renderer?.metrics.reconstructionKey||null,reconstructionBackend:metrics.backend==='gpu'&&state.engine==='v2'?'gpu':state.engine==='v2'?'cpu':null,positiveUploads:renderer?.metrics.positiveUploads||0,validationUploads:renderer?.metrics.validationUploads||0,positiveUploadSubmitMs:renderer?.metrics.lastPositiveUploadMs||0,gpuReconstructionSubmitMs:renderer?.metrics.reconstructionSubmitMs||0,gpuReconstructionMs:renderer?.metrics.reconstructionGpuMs??null,sourcePreparationMs:renderer?.metrics.sourcePreparationMs||0,sourceUploadSubmitMs:renderer?.metrics.sourceUploadSubmitMs||0,positiveFloatError:renderer?.metrics.positiveFloatError??null,technicalRelativeError:renderer?.metrics.technicalRelativeError??null,capabilities:renderer?.capabilities||null,textureBytes:renderer?(renderer.metrics.positiveTextureBytes+renderer.metrics.sourceTextureBytes):0,mainPositive:NSPixelKernel.v2PreviewMetrics()}),retry:()=>{failure=null;dispose();if(workingPreview)render();}};
 globalThis.FILMLABB_PERFORMANCE={snapshot:()=>({...perfBefore.snapshot(),gpu:globalThis.FILMLABB_GPU.snapshot()})};
 status('cpu',preference==='cpu'?'CPU vald':'GPU provas när en bild öppnas');
})();
