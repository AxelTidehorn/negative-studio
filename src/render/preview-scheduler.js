/* Preview scheduling only. The color kernel, source pixels and export stay unchanged. */
'use strict';
const previewPerf={cancelledDetail:0,intermediateShown:0,deduplicated:0,workerFailures:0,lastWorkerError:null};
let previewActive=null,previewInteractive=false,previewShown=-1;
function stopPreviewWork(){
 ++request38;queued38=null;previewActive=null;workerBusy38=false;workerVersion38=-1;
 if(previewWorker38){previewWorker38.terminate();previewWorker38=null;}
}
function displayPreviewResult(r,job){
 if(!job||job.sourceVersion!==sourceVersion38||job.source!==workingPreview)return;
 // During a drag, intermediate results keep the picture moving. After release,
 // show the small result before detail only if it matches the final settings.
 const intermediate=job.interactive&&r.id>previewShown&&job.mode===display&&(previewInteractive||JSON.stringify(job.config)===JSON.stringify(configuration38()));
 if(r.id===request38||intermediate){showPreview38(r);previewShown=r.id;if(intermediate&&r.id!==request38)previewPerf.intermediateShown++;}
 else stats38.stale++;
}
function failPreviewWorker(worker,message){
 if(worker!==previewWorker38)return;
 previewPerf.workerFailures++;previewPerf.lastWorkerError=String(message||'Preview worker failed');
 stopPreviewWork();workerDisabled38=true;
 console.warn('FILMLABB preview worker:',previewPerf.lastWorkerError);
 // Keep a usable editor even when worker loading is blocked. Export remains full size.
 $('qualityInfo').textContent=sourceInfo.label+' · förhandsvisning i reservläge; export använder originalet';
 render(previewInteractive?240:1400);
}
ensureWorker38=function(){
 if(previewWorker38||workerDisabled38)return;
 if(typeof Worker==='undefined'){workerDisabled38=true;return;}
 try{
  const worker=new Worker('./preview-worker.js');previewWorker38=worker;
  worker.onmessage=({data:r})=>{
   if(worker!==previewWorker38)return;
   const job=previewActive;
   if(r.error){failPreviewWorker(worker,r.error);return;}
   if(!job||r.id!==job.id)return;
   workerBusy38=false;previewActive=null;stats38.lastRenderMs=r.renderMs||0;
   displayPreviewResult(r,job);
   if(queued38){const next=queued38;queued38=null;sendPreview38(next);}
  };
  worker.onerror=e=>failPreviewWorker(worker,e.message);
 }catch(e){workerDisabled38=true;previewPerf.workerFailures++;previewPerf.lastWorkerError=e.message;}
};
sendPreview38=function(job){
 if(workerBusy38){queued38=job;return;}
 workerBusy38=true;previewActive=job;
 // Source references are controller bookkeeping; never clone full source per edit.
 previewWorker38.postMessage({id:job.id,config:job.config,mode:job.mode,limit:job.limit});
};
render=function(limit=1400){
 if(!workingPreview)return;
 limit=typeof limit==='number'?limit:1400;
 const interactive=limit<1400;
 if(!interactive){clearTimeout(previewTick38);clearTimeout(dragTimer38);previewTick38=null;dragTimer38=null;previewInteractive=false;}
 const config=configuration38(),key=JSON.stringify([sourceVersion38,display,limit,config]);
 if(!queued38&&previewActive?.key===key){previewPerf.deduplicated++;return;}
 if(queued38?.key===key){previewPerf.deduplicated++;return;}
 if(previewActive&&!previewActive.interactive&&!interactive){previewPerf.cancelledDetail++;stopPreviewWork();}
 const t=now38(),id=++request38;stats38.renders++;
 if(!workerDisabled38)ensureWorker38();
 const job={id,key,config,mode:display,limit,interactive,sourceVersion:sourceVersion38,source:workingPreview};
 if(previewWorker38){
  if(workerVersion38!==sourceVersion38){const data=workingPreview.data.slice();previewWorker38.postMessage({type:'source',image:{...workingPreview,data}},[data.buffer]);workerVersion38=sourceVersion38;}
  sendPreview38(job);
 }else{
  const bounded=interactive?240:480;
  const r=NSPixelKernel.render(workingPreview,config,display,Math.min(limit,bounded));
  displayPreviewResult({...r,id},job);stats38.lastRenderMs=now38()-t;
 }
 stats38.lastDispatchMs=now38()-t;
};
scheduleRender=function(immediate=false){
 if(!workingPreview)return;
 clearTimeout(dragTimer38);
 if(immediate){
  if(previewTick38&&previewInteractive){clearTimeout(previewTick38);previewTick38=null;render(240);}
  render(1400);return;
 }
 previewInteractive=true;queued38=null;
 // A multi-second detail job must not stand ahead of a new slider gesture.
 if(previewActive&&!previewActive.interactive){previewPerf.cancelledDetail++;stopPreviewWork();}
 // One active small preview and one latest pending edit; no unbounded backlog.
 if(!previewTick38)previewTick38=setTimeout(()=>{previewTick38=null;render(240);},16);
 dragTimer38=setTimeout(()=>{dragTimer38=null;render(1400);},650);
};
const finishBeforePreview=finishImport;
finishImport=function(message){
 stopPreviewWork();clearTimeout(previewTick38);clearTimeout(dragTimer38);previewTick38=null;dragTimer38=null;previewInteractive=false;previewShown=-1;
 return finishBeforePreview(message);
};
const chooseBeforePreview=chooseFrame;
chooseFrame=async function(i,opts={}){
 if(i>=0&&i<roll.length&&!rollLoading&&!exportBusy&&!cropDrag&&(opts.force||i!==activeFrame)){
  stopPreviewWork();clearTimeout(previewTick38);clearTimeout(dragTimer38);previewTick38=null;dragTimer38=null;previewInteractive=false;previewShown=-1;
 }
 return chooseBeforePreview(i,opts);
};
const clearBeforePreview=$('clearQueue').onclick;
$('clearQueue').onclick=()=>{previewActive=null;previewShown=-1;previewInteractive=false;return clearBeforePreview();};
globalThis.FILMLABB_PERFORMANCE={snapshot:()=>({...stats38,...previewPerf,analyses:analysisCount38,worker:!!previewWorker38,activeLimit:previewActive?.limit||null,pendingLimit:queued38?.limit||null,interactiveLimit:240,detailLimit:workerDisabled38?480:1400,queueLength:roll.length})};
