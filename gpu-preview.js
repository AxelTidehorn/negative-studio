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
 let lastSource=null,lastVersion=-1,interactiveLimit=700;
 const metrics={backend:'cpu',frames:0,sourceUploads:0,validationError:null,lastSubmitMs:0,lastGpuMs:null,reason:null,contextLosses:0};
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
 function eligible(){return preference!=='cpu'&&!failure&&!!workingPreview&&NSGpuPreview.supports(configuration38());}
 function cpu(reason,limit=1400){
  active=false;syncView();status('cpu',reason);return cpuRender(limit);
 }
 function stopHistogram(){clearTimeout(histTimer);histTimer=null;histSequence++;histPending=null;histBusy=false;histSource=-1;if(histWorker)histWorker.terminate();histWorker=null;}
 function resetSource(){cancelTimers();stopHistogram();active=false;lastSource=null;lastVersion=-1;validationKey=null;syncView();}
 function dispose(){if(renderer)renderer.destroy();renderer=null;lastSource=null;validationKey=null;}
 function fail(e){
  failure=e?.message||String(e);metrics.reason=failure;cancelTimers();stopHistogram();dispose();active=false;syncView();status('cpu','GPU-reservläge · '+failure);
 }
 function sendHistogram(job){histBusy=true;histWorker.postMessage(job);}
 function updateHistogram(config,version,source,sequence){
  const job={id:sequence,config,mode:display,limit:160};
  if(!histDisabled&&typeof Worker!=='undefined'){
   try{
    if(!histWorker){
     const worker=new Worker('./preview-worker.js');histWorker=worker;
     worker.onmessage=({data:r})=>{
      if(worker!==histWorker)return;histBusy=false;
      if(r.error){histDisabled=true;stopHistogram();if(active)scheduleHistogram(configuration38());return;}
      if(active&&r.id===histSequence&&histSource===sourceVersion38){drawHistogram38(r.bins);}
      if(histPending){const next=histPending;histPending=null;sendHistogram(next);}
     };
     worker.onerror=()=>{if(worker!==histWorker)return;histDisabled=true;stopHistogram();if(active)scheduleHistogram(configuration38());};
    }
    if(histSource!==version){const data=source.data.slice();histWorker.postMessage({type:'source',image:{...source,data}},[data.buffer]);histSource=version;}
    if(histBusy)histPending=job;else sendHistogram(job);return;
   }catch{histDisabled=true;stopHistogram();if(active)scheduleHistogram(config);return;}
  }
  // Small idle-only fallback. Never run a CPU histogram in the slider's frame loop.
  if(active&&version===sourceVersion38&&source===workingPreview&&sequence===histSequence){const r=NSPixelKernel.render(source,config,display,100);drawHistogram38(r.bins);}
 }
 function scheduleHistogram(config){
  clearTimeout(histTimer);const sequence=++histSequence,version=sourceVersion38,source=workingPreview;
  $('histogramInfo').textContent='Histogram uppdateras…';
  histTimer=setTimeout(()=>{histTimer=null;updateHistogram(config,version,source,sequence);},220);
 }
 function drawGpu(interactive=false){
  if(!workingPreview)return;
  if(!eligible())return cpu(failure?'GPU-reservläge · '+failure:preference==='cpu'?'CPU vald':'Detta färgläge använder CPU');
  try{
   const config=configuration38();
   if(!renderer)renderer=NSGpuPreview.create(canvas);
   const key=JSON.stringify([config.profile,config.print,sourceVersion38]);
   if(validationKey!==key){metrics.validationError=renderer.validate(config);validationKey=key;}
   if(!active){stopPreviewWork();clearTimeout(previewTick38);clearTimeout(dragTimer38);previewTick38=dragTimer38=null;}
   const ms=renderer.metrics.gpuMs;
   if(ms!==null){if(ms>25)interactiveLimit=Math.max(400,Math.round(interactiveLimit*.75));else if(ms<10)interactiveLimit=Math.min(1400,interactiveLimit+100);}
   const start=now38(),r=renderer.draw(workingPreview,config,display,interactive?interactiveLimit:1400,sourceVersion38);
   active=true;lastSource=workingPreview;lastVersion=sourceVersion38;++request38;stats38.renders++;metrics.frames++;
   metrics.sourceUploads=renderer.metrics.uploads;metrics.lastSubmitMs=now38()-start;metrics.lastGpuMs=renderer.metrics.gpuMs;
   // Geometry and all click-to-source mappings retain their original dimensions.
   if(baseCanvas.width!==r.width)baseCanvas.width=r.width;if(baseCanvas.height!==r.height)baseCanvas.height=r.height;
   lastPreview38=null;status('gpu');drawCrop();scheduleHistogram(config);
  }catch(e){fail(e);return cpu('GPU-reservläge · '+failure);}
 }
 render=function(limit=1400){
  if(eligible()){cancelFrame();clearTimeout(idle);idle=null;return drawGpu(false);}
  cancelTimers();stopHistogram();return cpu(failure?'GPU-reservläge · '+failure:preference==='cpu'?'CPU vald':'Detta färgläge använder CPU',limit);
 };
 scheduleRender=function(immediate=false){
  if(!eligible()){if(active){active=false;syncView();}return cpuSchedule(immediate);}
  clearTimeout(idle);clearTimeout(histTimer);histSequence++;
  if(immediate){cancelFrame();return drawGpu(false);}
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
 globalThis.FILMLABB_GPU={snapshot:()=>({...metrics,preference,interactiveLimit,sourceVersion:lastVersion,sourceMatches:!!lastSource&&lastSource===workingPreview}),retry:()=>{failure=null;dispose();if(workingPreview)render();}};
 globalThis.FILMLABB_PERFORMANCE={snapshot:()=>({...perfBefore.snapshot(),gpu:globalThis.FILMLABB_GPU.snapshot()})};
 status('cpu',preference==='cpu'?'CPU vald':'GPU provas när en bild öppnas');
})();
