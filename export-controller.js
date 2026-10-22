/* Cancellable JPEG export. Source is never detached, copied wholesale or mutated. */
(function(){
'use strict';
let active=null,sequence=0,batch=null;
const stats={workerJobs:0,fallbackJobs:0,cancelled:0,maxStripeBytes:0,transferredBytes:0,lastBackend:null,lastSize:null};
const locked=new Map(),lockIds=['imageFile','settingsFile','referenceFile','flatFieldFile','rawMode4','tiffEncoding','export','exportTiff','batchJpeg','batchTiff','clearQueue','loadFullRaw','clearFlatField','useFlatField','clearReference','reset'];
const panel=document.createElement('section');panel.id='exportProgressPanel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','exportProgressTitle');
panel.innerHTML='<div class="export-top"><strong id="exportProgressTitle">JPEG-export</strong><button class="btn" id="cancelExport">Avbryt</button><button class="btn" id="closeExportProgress" hidden>Stäng</button></div><progress id="exportProgress" max="100" value="0" aria-label="Exportförlopp"></progress><p id="exportProgressText" role="status" aria-live="polite"></p><p class="hint" id="exportSnapshotNote">Exporterar inställningarna som gällde vid start.</p>';
document.body.appendChild(panel);
const ui=id=>document.getElementById(id),tick=()=>new Promise(r=>setTimeout(r,0));
function lock(){const busy=!!active||!!batch;for(const id of lockIds){const el=ui(id);if(!el)continue;if(busy){if(!locked.has(el))locked.set(el,el.disabled);el.disabled=true;}}if(!busy){for(const [el,disabled] of locked)el.disabled=disabled;locked.clear();if(typeof nextControls==='function')nextControls();}}
function show(text,value){panel.hidden=false;ui('exportProgressText').textContent=text;if(value!==undefined)ui('exportProgress').value=value;}
function cancelled(){return new DOMException('Exporten avbröts.','AbortError');}
function check(job){if(job.cancelled||active!==job||batch?.cancelled)throw cancelled();}
function cancel(){if(batch)batch.cancelled=true;if(active){active.cancelled=true;active.worker?.terminate();active.rejectCancel(cancelled());}if(batch&&!active)show('Avbryter efter pågående inläsning…');}
ui('cancelExport').onclick=cancel;ui('closeExportProgress').onclick=()=>{panel.hidden=true;};
function doneUI(message,ok=false){show(message,ok?100:undefined);ui('cancelExport').hidden=true;ui('closeExportProgress').hidden=false;}
function beginUI(){ui('exportProgressTitle').textContent='JPEG-export';panel.hidden=false;ui('cancelExport').hidden=false;ui('closeExportProgress').hidden=true;ui('exportSnapshotNote').textContent='Exporterar inställningarna som gällde vid start.';}
function description(job){return (batch?`Bild ${batch.index+1}/${batch.total} · `:'')+job.target.width+'×'+job.target.height;}
function progress(job,done,total){check(job);const value=Math.min(95,Math.floor(95*done/total));show(description(job)+' · '+value+' %',value);}
function geometry(job){return CE.exportGeometry(job.im,job.region,job.opts.cropExport,job.opts.rotation);}
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
    if(m.y!==job.nextY||m.rows!==NSExportPlan.rows(job.target.width,job.target.height-m.y))throw Error('Felaktig begäran om exportdata.');
    // Yield before each bounded copy so paint, input and cancellation can run.
    await tick();if(settled)return;check(job);const data=NSExportPlan.pack(job.im,job.g,job.target,m.y,m.rows);job.nextY+=m.rows;
    stats.maxStripeBytes=Math.max(stats.maxStripeBytes,data.byteLength);stats.transferredBytes+=data.byteLength;
    worker.postMessage({type:'stripe',id:job.id,y:m.y,rows:m.rows,data},[data.buffer]);
   }else if(m.type==='progress')progress(job,m.done,m.total);
   else if(m.type==='encoding')show(description(job)+' · JPEG-kodning…',97);
   else if(m.type==='error'){const e=Error(m.error);e.stage=m.stage;e.code=m.code;fail(e);}
   else if(m.type==='done'){settled=true;clearTimeout(timer);resolve(m.blob);}
  }catch(e){fail(e);}
 };
 try{worker.postMessage({type:'start',id:job.id,source:NSExportPlan.metadata(job.im),config:job.config,region:job.region,crop:job.opts.cropExport,rotation:job.opts.rotation,target:job.target});}catch(e){e.stage='init';fail(e);}
 // Cancel rejects immediately even when the native JPEG encoder is busy.
 job.cancelPromise.catch(fail);
 }).finally(()=>{job.worker?.terminate();job.worker=null;});}
async function mainAttempt(job){
 stats.fallbackJobs++;stats.lastBackend='main';const c=document.createElement('canvas');
 try{
  c.width=job.target.width;c.height=job.target.height;const ctx=c.getContext('2d',{colorSpace:'srgb'});if(!ctx)throw Error('Kunde inte skapa JPEG-yta.');
  if(!job.prepared)job.prepared=NSPixelKernel.prepare(job.im,job.config);
  for(let y=0;y<c.height;){
   check(job);const rows=NSExportPlan.rows(c.width,c.height-y,16384),out=ctx.createImageData(c.width,rows);
   for(let dy=0;dy<rows;dy++)for(let x=0;x<c.width;x++){
    const [sx,sy]=NSExportPlan.at(job.g,job.target,x,y+dy),p=job.prepared.pixel((sy*job.im.width+sx)*job.im.channels),i=(dy*c.width+x)*4;
    for(let k=0;k<3;k++)out.data[i+k]=Math.round(p[k]*255);out.data[i+3]=255;
   }
   ctx.putImageData(out,0,y);y+=rows;progress(job,y,c.height);await tick();
  }
  check(job);show(description(job)+' · JPEG-kodning i reservläge…',97);
  return await Promise.race([new Promise((resolve,reject)=>{try{c.toBlob(resolve,'image/jpeg',.94);}catch(e){reject(e);}}),job.cancelPromise]);
 }finally{c.width=c.height=0;}
}
jpegBytes=async function(skipBusyCheck=false){
 if(active)throw Error('En export pågår redan.');
 if(!(skipBusyCheck?(!rollLoading&&working):exportReady()))throw Error('Ingen exportklar bild finns.');
 const selection=exportGeometrySnapshot(working);
 const job={id:++sequence,im:working,opts:{...state,cropExport:selection.crop},region:selection.region,config:JSON.parse(JSON.stringify(configuration38())),cancelled:false,worker:null,prepared:null};
 job.g=geometry(job);job.cancelPromise=new Promise((_,reject)=>{job.rejectCancel=reject;});job.cancelPromise.catch(()=>{});
 active=job;exportBusy=true;lock();beginUI();let workerUsable=typeof Worker!=='undefined'&&job.im.encoding!=='icc';
 try{
  let error;
  for(const budget of NSExportPlan.budgets(job.opts.jpegSize,navigator.deviceMemory)){
   check(job);job.target=NSExportPlan.size(job.g,budget);job.nextY=0;show(description(job)+' · Förbereder export…',0);
   try{
    let blob;
    if(workerUsable){
     try{blob=await workerAttempt(job);}
     catch(e){check(job);if(e.stage==='encode'&&e.code!=='mime')throw e;workerUsable=false;show('Reservläge · '+description(job),0);blob=await mainAttempt(job);}
    }else blob=await mainAttempt(job);
    check(job);if(!blob||blob.type!=='image/jpeg'||!blob.size)throw Error('Webbläsaren returnerade ingen JPEG.');
    const bytes=new Uint8Array(await blob.arrayBuffer());check(job);
    if(bytes[0]!==255||bytes[1]!==216||bytes[bytes.length-2]!==255||bytes[bytes.length-1]!==217)throw Error('Ogiltig JPEG-kodning.');
    jpegExportInfo={...job.target,originalWidth:job.g.width,originalHeight:job.g.height};stats.lastSize={...jpegExportInfo};
    if(!batch)doneUI('JPEG klar · '+description(job)+(job.target.width!==job.g.width||job.target.height!==job.g.height?' · anpassad storlek':''),true);
    return bytes;
   }catch(e){check(job);error=e;}
  }
  throw Error('JPEG-kodning misslyckades även vid reducerad storlek: '+(error?.message||'okänt fel'));
 }catch(e){if(e.name==='AbortError'){stats.cancelled++;if(!batch)doneUI('Export avbruten. Ingen fil har hämtats.');}else if(!batch)doneUI('Exportfel: '+e.message);throw e;}
 finally{job.worker?.terminate();job.prepared=null;active=null;exportBusy=false;lock();}
};
ui('export').onclick=async()=>{
 if(batch||!exportReady())return;
 try{const bytes=await jpegBytes();downloadBlob(new Blob([bytes],{type:'image/jpeg'}),exportName(null,'jpg','filmlabb-positive.jpg'));const i=jpegExportInfo;setStatus('JPEG exporterad · sRGB · '+i.width+'×'+i.height+(i.width!==i.originalWidth||i.height!==i.originalHeight?' · anpassad storlek för webbläsaren':''));}
 catch(e){setStatus(e.name==='AbortError'?'JPEG-export avbruten.':'Exportfel: '+e.message);}
};
ui('batchJpeg').onclick=async()=>{
 if(batch||active||rollingExport||exportBusy||rollLoading||!roll.length)return;
 batch={cancelled:false,index:0,total:roll.length};rollingExport=true;lock();beginUI();const original=activeFrame,files=[];
 try{
  for(let i=0;i<batch.total;i++){
   if(batch.cancelled)throw cancelled();batch.index=i;show(`Bild ${i+1}/${batch.total} · Läser in…`,0);
   await chooseFrame(i,{force:true});if(batch.cancelled)throw cancelled();if(!working)throw Error('Bilden kunde inte läsas.');
   const bytes=await jpegBytes();if(batch.cancelled)throw cancelled();files.push([exportName(i,'jpg',`bild_${String(i+1).padStart(3,'0')}.jpg`),bytes]);
  }
  if(batch.cancelled)throw cancelled();downloadBlob(makeZip(files),exportZipName());doneUI('JPEG-ZIP klar · '+files.length+' bilder',true);setStatus('JPEG-ZIP färdig.');
 }catch(e){doneUI(e.name==='AbortError'?'Batch-export avbruten. Ingen ZIP har hämtats.':'Batchfel: '+e.message);setStatus(e.name==='AbortError'?'Batch-export avbruten.':'Batchfel: '+e.message);}
 finally{files.length=0;rollingExport=false;try{await chooseFrame(original,{force:true});}finally{batch=null;lock();}}
};
// Keep the existing TIFF pixel writer; share only locking, progress and cancellation.
const writeTiff=exportTiff;
exportTiff=async function(){
 if(active||!exportReady())throw Error('Ingen exportklar bild finns.');
 const job={id:++sequence,im:working,cancelled:false,worker:null,rejectCancel:()=>{}};
 active=job;lock();beginUI();ui('exportProgressTitle').textContent='TIFF-export';
 try{
  await writeTiff({check:()=>check(job),progress:(done,total)=>{
   check(job);show((batch?`Bild ${batch.index+1}/${batch.total} · `:'')+'TIFF '+Math.floor(100*done/total)+' %',100*done/total);
  }});
  if(!batch)doneUI('TIFF klar',true);
 }catch(e){if(!batch)doneUI(e.name==='AbortError'?'TIFF-export avbruten.':'Exportfel: '+e.message);throw e;}
 finally{active=null;exportBusy=false;lock();}
};
ui('exportTiff').onclick=async()=>{if(batch||active||!exportReady())return;try{await exportTiff();}catch(e){setStatus(e.name==='AbortError'?'TIFF-export avbruten.':'Exportfel: '+e.message);}};
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
  try{await chooseFrame(original,{force:true});}catch(e){restoreError=e.message;}
  finally{batch=null;lock();}
 }
 const message=(aborted?'TIFF-export avbruten · ':'TIFF-export: ')+exported+' av '+ids.length+' exporterade, '+errors.length+' misslyckade'+(errors.length?' · '+errors.join('; '):'')+(restoreError?' · Återställningsfel: '+restoreError:'');
 doneUI(message,!aborted&&!errors.length&&!restoreError);setStatus(message);
};
globalThis.FILMLABB_EXPORT={cancel,snapshot:()=>({...stats,active:!!active,batch:!!batch,progress:Number(ui('exportProgress').value),sourceIntact:!!active?.im.data.byteLength})};
})();
