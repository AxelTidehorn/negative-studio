/* Preview scheduling only. The color kernel, source pixels and export stay unchanged. */
'use strict';
let sourceVersion38=0,previewWorker38=null,workerBusy38=false,queued38=null,request38=0,lastPreview38=null;
const stats38={renders:0,stale:0,lastRenderMs:0,lastDispatchMs:0,analysisMs:0};
const now38=()=>globalThis.performance?.now?.()||Date.now();
let workerVersion38=-1,workerDisabled38=false;
let dragTimer38=null,previewTick38=null;
let ensureWorker38,sendPreview38;
convertImage=function(image,mode,params){const im=image===previewSrc?workingPreview:working;if(!im)return new ImageData(1,1);const r=NSPixelKernel.render(im,configuration38(params),mode,Math.max(im.width,im.height));const out=new ImageData(r.width,r.height);out.data.set(r.data);return out;};
function showPreview38(r){const c=$('preview');c.width=r.width;c.height=r.height;const out=new ImageData(r.width,r.height);out.data.set(r.data);c.getContext('2d').putImageData(out,0,0);lastPreview38=r;drawHistogram38(r.bins);drawCrop();}
function drawHistogram38(bins){const canvas=$('histogram'),cx=canvas?.getContext('2d');if(!cx||typeof cx.clearRect!=='function')return;const w=canvas.width,h=canvas.height;cx.clearRect(0,0,w,h);const a=Array.from(bins).sort((a,b)=>a-b),max=Math.max(1,a[Math.floor(a.length*.99)]);cx.fillStyle=globalThis.getComputedStyle?.(document.body).getPropertyValue('--ns-muted').trim()||'#9fb1b5';for(let i=0;i<256;i++){const v=Math.min(1,bins[i]/max);cx.fillRect(i*w/256,h-v*(h-4),Math.ceil(w/256),v*(h-4));}$('histogramInfo').textContent=display==='negative'?'Negativ · luminans':display==='split'?'Jämförelse · luminans':'Positiv · luminans';}
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
