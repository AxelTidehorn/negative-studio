/* Preview scheduling only. The color kernel, source pixels and export stay unchanged. */
'use strict';
let sourceVersion38=0,previewWorker38=null,workerBusy38=false,queued38=null,request38=0,lastPreview38=null;
const stats38={renders:0,stale:0,lastRenderMs:0,lastDispatchMs:0,analysisMs:0};
const now38=()=>globalThis.performance?.now?.()||Date.now();
const previewConfigKey38=config=>globalThis.NSV2Platform?.fingerprint(JSON.stringify(config))??JSON.stringify(config);
let workerVersion38=-1,workerDisabled38=false;
let dragTimer38=null,previewTick38=null;
let ensureWorker38,sendPreview38;
convertImage=function(image,mode,params){const im=image===previewSrc?workingPreview:working;if(!im)return new ImageData(1,1);const r=NSPixelKernel.render(im,configuration38(params),mode,Math.max(im.width,im.height));const out=new ImageData(r.width,r.height);out.data.set(r.data);return out;};
function showPreview38(r){const c=$('preview');c.width=r.width;c.height=r.height;const out=new ImageData(r.width,r.height);out.data.set(r.data);c.getContext('2d').putImageData(out,0,0);lastPreview38=r;updateFrameThumb(c);drawHistogram38(r.histogram||r.bins);drawCrop();}
// The luminance trace retains the existing display-referred weighted sRGB bins.
// RGB is counted at those same bounded preview sample points, after all edits.
function drawHistogram38(histogram){
 const canvas=$('histogram'),cx=canvas?.getContext('2d');if(!cx||typeof cx.clearRect!=='function')return;
 const w=canvas.width,h=canvas.height,info=$('histogramInfo'),clip=$('histogramClipping'),source=(el,text)=>{if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source(el,text);else el.textContent=text;};
 cx.clearRect(0,0,w,h);
 if(!working){source(info,'Ingen bild');if(clip)clip.textContent='';return;}
 const rgb=histogram?.red?histogram:null,bins=rgb?.luminance||histogram;
 if(!bins)return;
 const curves=rgb?[[rgb.red,'#ff7373'],[rgb.green,'#62db95'],[rgb.blue,'#80adff']]:[],all=[bins,...curves.map(([b])=>b)].flatMap(b=>Array.from(b)).sort((a,b)=>a-b),max=Math.max(1,all[Math.floor(all.length*.99)]);
 function path(b){cx.beginPath();cx.moveTo(0,h);for(let i=0;i<256;i++)cx.lineTo(i*w/255,h-Math.min(1,b[i]/max)*(h-5)-2);cx.lineTo(w,h);cx.closePath();}
 for(const [b,color]of curves){path(b);cx.globalAlpha=.25;cx.fillStyle=color;cx.fill();cx.globalAlpha=.85;cx.strokeStyle=color;cx.lineWidth=1;cx.stroke();}
 path(bins);cx.globalAlpha=1;cx.strokeStyle='#f4f1e9';cx.lineWidth=2;cx.stroke();
 source(info,display==='negative'?'Negativ · RGB + luminans':display==='split'?'Jämförelse · positiv':'Positiv · RGB + luminans');
 if(clip){const percent=n=>(100*n/Math.max(1,rgb.samples)).toFixed(1);clip.textContent=rgb?FILMLABB_I18N.fromSource('Svart / vitt')+' · '+[['R',rgb.red],['G',rgb.green],['B',rgb.blue]].map(([name,b])=>name+' '+percent(b[0])+' / '+percent(b[255])+' %').join(' · '):'';}
}

const previewPerf={cancelledDetail:0,intermediateShown:0,deduplicated:0,workerFailures:0,lastWorkerError:null};
let previewActive=null,previewInteractive=false,previewShown=-1,previewCompletedKey=null;
function stopPreviewWork(){
 ++request38;queued38=null;previewActive=null;previewCompletedKey=null;workerBusy38=false;workerVersion38=-1;
 if(previewWorker38){previewWorker38.terminate();previewWorker38=null;}
}
function displayPreviewResult(r,job){
 if(!job||job.sourceVersion!==sourceVersion38||job.source!==workingPreview)return;
 // During a drag, intermediate results keep the picture moving. After release,
 // show the small result before detail only if it matches the final settings.
 const intermediate=job.interactive&&r.id>previewShown&&job.mode===display&&(previewInteractive||JSON.stringify(job.config)===JSON.stringify(configuration38()));
 if(r.id===request38||intermediate){showPreview38({...r,configKey:previewConfigKey38(job.config)});previewCompletedKey=job.key;previewShown=r.id;if(intermediate&&r.id!==request38)previewPerf.intermediateShown++;}
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
   workerBusy38=false;previewActive=null;stats38.lastRenderMs=r.renderMs||0;stats38.v2Cache=r.v2Cache||null;
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
 workingPreview.previewRevision=sourceVersion38;
 const config=configuration38(),key=JSON.stringify([sourceVersion38,display,limit,config]);
 if(!queued38&&previewActive?.key===key){previewPerf.deduplicated++;return;}
 if(queued38?.key===key){previewPerf.deduplicated++;return;}
 // Keep repainting the existing result for geometry/context restoration, but
 // do not repeat color work for an identical completed request.
 if(!previewActive&&!queued38&&lastPreview38&&previewCompletedKey===key){previewPerf.deduplicated++;showPreview38(lastPreview38);return;}
 if(previewActive&&!previewActive.interactive&&!interactive){previewPerf.cancelledDetail++;stopPreviewWork();}
 const t=now38(),id=++request38;stats38.renders++;
 if(!workerDisabled38)ensureWorker38();
 const job={id,key,config,mode:display,limit,interactive,sourceVersion:sourceVersion38,source:workingPreview};
 if(previewWorker38){
  if(workerVersion38!==sourceVersion38){const data=workingPreview.data.slice();previewWorker38.postMessage({type:'source',image:{...workingPreview,data}},[data.buffer]);if(config.kind==='v2'){const positive=NSPixelKernel.cachedV2Positive(workingPreview,config);if(positive){const copy=positive.data.slice();previewWorker38.postMessage({type:'v2-seed',config,cacheKey:NSPixelKernel.v2PreviewKey(workingPreview,config),data:copy},[copy.buffer]);}}workerVersion38=sourceVersion38;}
  sendPreview38(job);
 }else{
  const bounded=interactive?240:480;
  const r=NSPixelKernel.render(workingPreview,config,display,Math.min(limit,bounded));
  if(display==='split'){const positive=NSPixelKernel.render(workingPreview,config,'positive',Math.min(limit,bounded));r.positive=positive.data;r.bins=positive.bins;r.histogram=positive.histogram;}
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
  stopPreviewWork();lastPreview38=null;clearTimeout(previewTick38);clearTimeout(dragTimer38);previewTick38=null;dragTimer38=null;previewInteractive=false;previewShown=-1;
 }
 const result=await chooseBeforePreview(i,opts);if(!working)drawHistogram38(new Uint32Array(256));return result;
};
const clearBeforePreview=$('clearQueue').onclick;
$('clearQueue').onclick=()=>{if(rollLoading||exportBusy||rollingExport)return;previewActive=null;previewCompletedKey=null;previewShown=-1;previewInteractive=false;const result=clearBeforePreview();if(!working&&!roll.length)drawHistogram38(new Uint32Array(256));return result;};
globalThis.FILMLABB_PERFORMANCE={snapshot:()=>({...stats38,...previewPerf,analyses:analysisCount38,worker:!!previewWorker38,activeLimit:previewActive?.limit||null,pendingLimit:queued38?.limit||null,interactiveLimit:240,detailLimit:workerDisabled38?480:1400,queueLength:roll.length})};
