/* Shared cancellable JPEG/PNG export. Source is never detached, copied wholesale or mutated. */
(function(){
'use strict';
let active=null,sequence=0,batch=null;
const stats={workerJobs:0,fallbackJobs:0,cancelled:0,maxStripeBytes:0,transferredBytes:0,lastBackend:null,lastSize:null};
const locked=new Map(),lockIds=['editVersion','imageFile','settingsFile','referenceFile','flatFieldFile','rawMode4','colorMode4','tiffEncoding','export','exportFormat','batchJpeg','batchTiff','clearQueue','loadFullRaw','clearFlatField','useFlatField','clearReference','reset','fineRotation','rotationDegrees','rotationReset','straighten','compositionEnabled','compositionEdit','compositionReset','geometryDone','cropExport','rotateLeft','rotateRight'];
const panel=document.createElement('section');panel.id='exportProgressPanel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','exportProgressTitle');
panel.innerHTML='<div class="export-top"><strong id="exportProgressTitle">JPEG-export</strong><button class="btn" id="cancelExport">Avbryt</button><button class="btn" id="closeExportProgress" hidden>Stäng</button></div><progress id="exportProgress" max="100" value="0" aria-label="Exportförlopp"></progress><p id="exportProgressText" role="status" aria-live="polite"></p><p class="hint" id="exportSnapshotNote">Exporterar inställningarna som gällde vid start.</p>';
document.body.appendChild(panel);
const ui=id=>document.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,0));
function lock(){const busy=!!active||!!batch;for(const id of lockIds){const el=ui(id);if(!el)continue;if(busy){if(!locked.has(el))locked.set(el,el.disabled);el.disabled=true;}}if(!busy){for(const [el,disabled] of locked)el.disabled=disabled;locked.clear();if(typeof nextControls==='function')nextControls();}}
function show(text,value){panel.hidden=false;if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source(ui('exportProgressText'),text);else ui('exportProgressText').textContent=text;if(value!==undefined)ui('exportProgress').value=value;}
function cancelled(){return new DOMException('Exporten avbröts.','AbortError');}
function check(job){if(job.cancelled||active!==job||batch?.cancelled)throw cancelled();}
function cancel(){if(batch)batch.cancelled=true;if(active){active.cancelled=true;active.worker?.terminate();active.rejectCancel(cancelled());}if(batch&&!active)show('Avbryter efter pågående inläsning…');}
ui('cancelExport').onclick=cancel;ui('closeExportProgress').onclick=()=>{panel.hidden=true;};
function doneUI(message,ok=false){show(message,ok?100:undefined);ui('cancelExport').hidden=true;ui('closeExportProgress').hidden=false;}
function beginUI(label='JPEG'){ui('exportProgressTitle').textContent=label+'-export';panel.hidden=false;ui('cancelExport').hidden=false;ui('closeExportProgress').hidden=true;ui('exportSnapshotNote').textContent='Exporterar inställningarna som gällde vid start.';}
function description(job){return (batch?`Bild ${batch.index+1}/${batch.total} · `:'')+job.target.width+'×'+job.target.height;}
function progress(job,done,total){check(job);const value=Math.min(95,Math.floor(95*done/total));show(description(job)+' · '+value+' %',value);}
function workerAttempt(job){return new Promise((resolve,reject)=>{
 let worker,timer=null,settled=false;
 const fail=e=>{if(settled)return;settled=true;clearTimeout(timer);reject(e instanceof Error?e:Error(String(e)));};
 const watch=ms=>{clearTimeout(timer);timer=setTimeout(()=>fail(Error('Bakgrundsexporten svarade inte.')),ms);};
 try{worker=new Worker('./export-worker.js');job.worker=worker;stats.workerJobs++;stats.lastBackend='worker';}
 catch(e){e.stage='init';fail(e);return;}
 watch(15000);
 worker.onerror=e=>{const error=Error(e.message||'Bakgrundsexporten kunde inte starta.');error.stage='init';fail(error);};
 worker.onmessage=async({data:m})=>{
  if(settled||m.id!==job.id||active!==job||job.cancelled)return;
  try{
   watch(m.type==='encoding'?120000:45000);
   if(m.type==='need'){
    if(m.y!==job.nextY||m.rows!==NSPresentation.rows(job.im,job.g,job.target,job.target.height-m.y))throw Error('Felaktig begäran om exportdata.');
    // Yield before each bounded copy so paint, input and cancellation can run.
    await tick();if(settled)return;check(job);const data=NSPresentation.pack(job.im,job.g,job.target,m.y,m.rows);job.nextY+=m.rows;
    stats.maxStripeBytes=Math.max(stats.maxStripeBytes,data.byteLength);stats.transferredBytes+=data.byteLength;
    worker.postMessage({type:'stripe',id:job.id,y:m.y,rows:m.rows,data},[data.buffer]);
   }else if(m.type==='progress')progress(job,m.done,m.total);
   else if(m.type==='encoding')show(description(job)+' · '+job.label+'-kodning…',97);
   else if(m.type==='error'){const e=Error(m.error);e.stage=m.stage;e.code=m.code;fail(e);}
   else if(m.type==='done'){settled=true;clearTimeout(timer);job.workerMetrics=m.metrics||null;resolve(m.blob);}
  }catch(e){fail(e);}
 };
 try{worker.postMessage({type:'start',id:job.id,source:NSExportPlan.metadata(job.im),config:job.config,region:job.region,crop:job.opts.cropExport,rotation:job.opts.rotation,target:job.target,presentation:job.g.spec||null,format:job.format});}catch(e){e.stage='init';fail(e);}
 // Cancel rejects immediately even when the native JPEG encoder is busy.
 job.cancelPromise.catch(fail);
 }).finally(()=>{job.worker?.terminate();job.worker=null;});}
async function mainAttempt(job){
 stats.fallbackJobs++;stats.lastBackend='main';const c=document.createElement('canvas');
 try{
  c.width=job.target.width;c.height=job.target.height;const ctx=c.getContext('2d',{colorSpace:'srgb'});if(!ctx)throw Error('Kunde inte skapa JPEG-yta.');
  if(!job.prepared)job.prepared=NSPixelKernel.prepare(job.im,job.config);
  let out;
  for(let y=0;y<c.height;){
   check(job);const rows=NSPresentation.rows(job.im,job.g,job.target,c.height-y,16384);
   if(!out||out.height!==rows)out=ctx.createImageData(c.width,rows);
   NSPresentation.rgba(job.im,job.prepared,job.g,job.target,y,rows,false,out.data);
   ctx.putImageData(out,0,y);y+=rows;progress(job,y,c.height);await tick();
  }
  check(job);show(description(job)+' · '+job.label+'-kodning i reservläge…',97);
  return await Promise.race([new Promise((resolve,reject)=>{try{c.toBlob(resolve,job.mime,.94);}catch(e){reject(e);}}),job.cancelPromise]);
 }finally{c.width=c.height=0;}
}
async function canvasBytes(format,skipBusyCheck=false){
 if(active)throw Error('En export pågår redan.');
 if(!(skipBusyCheck?(!rollLoading&&working):exportReady()))throw Error('Ingen exportklar bild finns.');
 if(typeof finishProposalPreviewForExport2==='function')finishProposalPreviewForExport2();
 const selection=exportGeometrySnapshot(working);
 const job={id:++sequence,format,label:format==='png8'?'PNG':'JPEG',mime:format==='png8'?'image/png':'image/jpeg',im:working,opts:{...state,cropExport:selection.crop},region:selection.region,config:JSON.parse(JSON.stringify(configuration38())),cancelled:false,worker:null,prepared:null};
 job.g=selection.g;job.cancelPromise=new Promise((_,reject)=>{job.rejectCancel=reject;});job.cancelPromise.catch(()=>{});
 active=job;exportBusy=true;lock();beginUI(job.label);let workerUsable=typeof Worker!=='undefined'&&job.im.encoding!=='icc';
 try{
  let error;
  for(const budget of (format==='png8'?[null]:NSExportPlan.budgets(job.opts.jpegSize,navigator.deviceMemory))){
   check(job);job.target=format==='png8'?{width:job.g.width,height:job.g.height}:NSExportPlan.size(job.g,budget);job.nextY=0;show(description(job)+' · Förbereder export…',0);
   try{
    let blob;
    if(workerUsable){
     try{blob=await workerAttempt(job);}
     catch(e){check(job);if(e.stage==='encode'&&e.code!=='mime')throw e;workerUsable=false;show('Reservläge · '+description(job),0);blob=await mainAttempt(job);}
    }else blob=await mainAttempt(job);
    check(job);if(!blob||blob.type!==job.mime||!blob.size)throw Error('Webbläsaren returnerade ingen '+job.label+'.');
    let bytes=new Uint8Array(await blob.arrayBuffer());check(job);
    if(format==='png8')bytes=NSPng.withSrgb(bytes);
    else if(bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)throw Error('Ogiltig JPEG-kodning.');
    jpegExportInfo={...job.target,originalWidth:job.g.width,originalHeight:job.g.height};stats.lastSize={...jpegExportInfo};
    if(!batch)doneUI(job.label+' klar · '+description(job)+(job.target.width!==job.g.width||job.target.height!==job.g.height?' · anpassad storlek':''),true);
    return bytes;
   }catch(e){check(job);error=e;}
  }
  throw Error((format==='png8'?'PNG-kodning i originalstorlek misslyckades: ':'JPEG-kodning misslyckades även vid reducerad storlek: ')+(error?.message||'okänt fel'));
 }catch(e){if(e.name==='AbortError'){stats.cancelled++;if(!batch)doneUI('Export avbruten. Ingen fil har hämtats.');}else if(!batch)doneUI('Exportfel: '+e.message);throw e;}
 finally{job.worker?.terminate();if(job.prepared)NSPresentation.release(job.prepared);job.prepared=null;active=null;exportBusy=false;lock();}
};
jpegBytes=skipBusyCheck=>canvasBytes('jpeg',skipBusyCheck);
const formats=['jpeg','png8','png16','tiff'],formatKey='filmlabb-export-format-v1';
try{const prior=localStorage.getItem(formatKey);ui('exportFormat').value=formats.includes(prior)?prior:'jpeg';}catch{ui('exportFormat').value='jpeg';}
syncExportNaming();
ui('exportFormat').addEventListener('change',()=>{if(!formats.includes(ui('exportFormat').value))ui('exportFormat').value='jpeg';try{localStorage.setItem(formatKey,ui('exportFormat').value);}catch{}syncExportNaming();});
ui('export').onclick=async()=>{
 if(batch||active||!exportReady())return;
 const format=formats.includes(ui('exportFormat').value)?ui('exportFormat').value:'jpeg';
 try{
  if(format==='tiff'){await exportTiff();return;}
  if(format==='png16'){
   if(typeof finishProposalPreviewForExport2==='function')finishProposalPreviewForExport2();
   await export16('PNG 16-bit',exportPng16);return;
  }
  const bytes=await (format==='jpeg'?jpegBytes():canvasBytes('png8'));
  const png=format==='png8',label=png?'PNG':'JPEG',info=jpegExportInfo;
  downloadBlob(new Blob([bytes],{type:png?'image/png':'image/jpeg'}),exportName(null,png?'png':'jpg',png?'filmlabb-positive.png':'filmlabb-positive.jpg'));
  setStatus(label+' exporterad · sRGB · '+info.width+'×'+info.height+(info.width!==info.originalWidth||info.height!==info.originalHeight?' · anpassad storlek för webbläsaren':''));
 }catch(e){setStatus(e.name==='AbortError'?'Export avbruten.':'Exportfel: '+e.message);}
};
async function restoreSelection(index){
 await chooseFrame(index,{force:true});
 // The import owner reports decode failures in the UI instead of rejecting.
 if(activeFrame!==index||!working)throw Error('Bilden kunde inte läsas.');
}
ui('batchJpeg').onclick=async()=>{
 if(batch||active||rollingExport||exportBusy||rollLoading||!roll.length)return;
 batch={cancelled:false,index:0,total:roll.length};rollingExport=true;lock();beginUI();const original=activeFrame,files=[];let resultMessage;
 try{
  for(let i=0;i<batch.total;i++){
   if(batch.cancelled)throw cancelled();batch.index=i;show(`Bild ${i+1}/${batch.total} · Läser in…`,0);
   await chooseFrame(i,{force:true});if(batch.cancelled)throw cancelled();if(!working)throw Error('Bilden kunde inte läsas.');
   const bytes=await jpegBytes();if(batch.cancelled)throw cancelled();files.push([exportName(i,'jpg',`bild_${String(i+1).padStart(3,'0')}.jpg`),bytes]);
  }
  if(batch.cancelled)throw cancelled();downloadBlob(makeZip(files),exportZipName());resultMessage='JPEG-ZIP klar · '+files.length+' bilder';doneUI(resultMessage,true);setStatus('JPEG-ZIP färdig.');
 }catch(e){resultMessage=e.name==='AbortError'?'Batch-export avbruten. Ingen ZIP har hämtats.':'Batchfel: '+e.message;doneUI(resultMessage);setStatus(e.name==='AbortError'?'Batch-export avbruten.':'Batchfel: '+e.message);}
 finally{files.length=0;rollingExport=false;try{await restoreSelection(original);}catch(e){const message=resultMessage+' · Återställningsfel: '+e.message;doneUI(message);setStatus(message);}finally{batch=null;lock();}}
};
// RGB16 formats share the existing sampler, locking, progress and cancellation.
const writeTiff=exportTiff;
async function export16(label,write){
 if(active||!exportReady())throw Error('Ingen exportklar bild finns.');
 const job={id:++sequence,im:working,cancelled:false,worker:null,rejectCancel:()=>{}};
 job.cancelPromise=new Promise((_,reject)=>{job.rejectCancel=reject;});job.cancelPromise.catch(()=>{});active=job;lock();beginUI(label);
 try{
  await write({worker:async snapshot=>{Object.assign(job,snapshot);job.nextY=0;return {blob:await workerAttempt(job),metrics:job.workerMetrics};},check:()=>check(job),progress:(done,total)=>{
   check(job);show((batch?`Bild ${batch.index+1}/${batch.total} · `:'')+label+' '+Math.floor(100*done/total)+' %',100*done/total);
  }});
  if(!batch)doneUI(label+' klar',true);
 }catch(e){if(!batch)doneUI(e.name==='AbortError'?label+'-export avbruten.':'Exportfel: '+e.message);throw e;}
 finally{active=null;exportBusy=false;lock();}
}
exportTiff=()=>export16('TIFF',writeTiff);
ui('batchTiff').onclick=async()=>{
 if(batch||active||rollingExport||exportBusy||rollLoading)return;
 const ids=roll.map((f,i)=>f.selected?i:-1).filter(i=>i>=0);
 if(!ids.length||ids.length>5){setStatus('Markera en till högst fem bilder.');return;}
 batch={cancelled:false,index:0,total:ids.length};rollingExport=true;lock();beginUI();
 const original=activeFrame,errors=[];let exported=0,aborted=false,restoreError=null;
 try{
  for(let j=0;j<ids.length;j++){
   if(batch.cancelled){aborted=true;break;}batch.index=j;
   show(`Bild ${j+1}/${ids.length} · Läser in…`,0);
   try{await exportFrameTiff(ids[j]);exported++;}
   catch(e){if(e.name==='AbortError'||batch.cancelled){aborted=true;break;}errors.push(roll[ids[j]].file.name+': '+e.message);}
  }
  aborted=aborted||batch.cancelled;
 }finally{
  rollingExport=false;
  try{await restoreSelection(original);}catch(e){restoreError=e.message;}
  finally{batch=null;lock();}
 }
 const message=(aborted?'TIFF-export avbruten · ':'TIFF-export: ')+exported+' av '+ids.length+' exporterade, '+errors.length+' misslyckade'+(errors.length?' · '+errors.join('; '):'')+(restoreError?' · Återställningsfel: '+restoreError:'');
 doneUI(message,!aborted&&!errors.length&&!restoreError);setStatus(message);
};
globalThis.FILMLABB_EXPORT={cancel,snapshot:()=>({...stats,active:!!active,batch:!!batch,progress:Number(ui('exportProgress').value),sourceIntact:!!active?.im.data.byteLength})};
})();
