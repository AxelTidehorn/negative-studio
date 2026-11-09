/* Import ownership and diagnostics. Preliminary camera JPEG is a separate DOM
   canvas: never a source, recipe, histogram, geometry or export input. */
'use strict';
(()=>{
 const clock=()=>performance.now();let trace=null,next=0,proof=null,cancelButton=null;
 const painted=fn=>typeof requestAnimationFrame==='function'?requestAnimationFrame(()=>requestAnimationFrame(fn)):fn();
 const stageText={initialise:'Initierar RAW-avkodare…',read:'Läser fil…',decode:'Avkodar RAW…',convert:'Förbereder bild…',prepare:'Analyserar negativ…'};
 function phase(stage){if(!trace||trace.cancelled||trace.usableMs!==undefined)return;trace.phase=stage;const text=stageText[stage];if(text)setStatus(text);}
 function removeProof(){$('picture').classList.remove('import-proof-visible');if(proof){proof.remove();proof=null;}if(cancelButton){cancelButton.remove();cancelButton=null;}}
 // Disposable display approximation only. A bounded camera JPEG, histogram and
 // three 256-entry lookup tables never enter working/analysis/cache/export.
 function approximatePositive(canvas){
  const cx=canvas.getContext('2d'),image=cx.getImageData(0,0,canvas.width,canvas.height),p=image.data,hist=Array.from({length:3},()=>new Uint32Array(256));
  for(let i=0;i<p.length;i+=4)for(let c=0;c<3;c++)hist[c][p[i+c]]++;
  const tables=hist.map(h=>{let sum=0,base=255;for(let v=0;v<256;v++){sum+=h[v];if(sum>=canvas.width*canvas.height*.985){base=v;break;}}if(base<16)return null;return Uint8ClampedArray.from({length:256},(_,v)=>Math.round(255*Math.sqrt(Math.max(0,1-v/base))));});
  if(tables.some(t=>!t))return false;
  for(let i=0;i<p.length;i+=4)for(let c=0;c<3;c++)p[i+c]=tables[c][p[i+c]];
  cx.putImageData(image,0,0);return true;
 }
 function cancel(){if(!rollLoading||!trace||trace.cancelled||trace.readyMs!==undefined)return false;frameLoadSequence++;NSRawDecoder.cancel();if(trace){trace.cancelled=true;trace.elapsedMs=clock()-trace.started;}rollLoading=false;activeFrame=-1;working=workingPreview=hires=src=previewSrc=null;stopPreviewWork();setFrameLoading(false);removeProof();$('preview').classList.add('hidden');$('gpuPreview')?.classList.add('hidden');$('empty').classList.remove('hidden');$('export').disabled=true;refreshRollUI();setStatus('Import avbruten.');return true;}
 function rawPaint(t){if(t!==trace||t.cancelled||t.technicalPaintMs!==undefined)return;painted(()=>{if(t!==trace||t.cancelled)return;t.technicalPaintMs=clock()-t.started;if(t.firstVisibleMs===undefined)t.firstVisibleMs=t.technicalPaintMs;removeProof();if(t.readyMs!==undefined){t.usableMs=Math.max(t.readyMs,t.technicalPaintMs);t.phase='ready';}});}
 async function preliminary(file,t,force=false){
  const locked=NSV2Platform.usesLockedSource(state);if(!force&&NSRawDecoder.isCached(file,locked?'wide':state.rawMode4,locked?NSV2Platform.decoderOptions():undefined))return;
  if(!/\.raf$/i.test(file.name)||typeof createImageBitmap!=='function')return;
  let bitmap;
  try{
   const began=clock(),jpeg=await readRafJpeg(file);
   if(!jpeg||jpeg.size>4*1024*1024||t!==trace||!rollLoading)return;
   bitmap=await createImageBitmap(jpeg,{resizeWidth:640});
   if(t!==trace||t.cancelled||!rollLoading||t.technicalPaintMs!==undefined)return;
   const box=document.createElement('div');box.className='import-camera-proof';box.setAttribute('role','status');
   if(cancelButton)box.append(cancelButton);const imageBox=document.createElement('div');imageBox.className='import-proof-image';box.append(imageBox);
   const c=document.createElement('canvas'),scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);let positive=false;const converting=clock();try{positive=approximatePositive(c);}catch{}t.preliminaryTransformMs=clock()-converting;imageBox.append(c);
   const label=document.createElement('p'),text=positive?'Snabb positivförhandsvisning · preliminär · ungefärliga färger, inte färdigt RAW-resultat':'Kameraförhandsvisning · preliminär · inte FILMLABB-resultat';if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source(label,text);else label.textContent=text;box.append(label);$('picture').append(box);$('picture').classList.add('import-proof-visible');proof=box;t.jpegPrepareMs=clock()-began;t.preliminaryKind=positive?'approximate-positive':'camera-jpeg';
   painted(()=>{if(t===trace&&!t.cancelled&&proof===box){t.preliminaryPaintMs=clock()-t.started;if(t.firstVisibleMs===undefined)t.firstVisibleMs=t.preliminaryPaintMs;}});
  }catch{}finally{bitmap?.close();}
 }
 const choose=chooseFrame;
 chooseFrame=async function(i,opts={}){
  if(i<0||i>=roll.length||exportBusy||cropDrag||(!opts.force&&i===activeFrame&&working))return choose(i,opts);
  if(rollLoading&&!cancel())return choose(i,opts);removeProof();
  const t=trace={id:++next,started:clock(),phase:'read',stages:{},sourceVersion:sourceVersion38,cancelled:false};
  cancelButton=document.createElement('button');cancelButton.className='import-cancel';cancelButton.type='button';cancelButton.textContent='Avbryt import';cancelButton.onclick=cancel;$('picture').append(cancelButton);
  phase('read');$('export').disabled=true;
  const promise=choose(i,opts);void preliminary(roll[i].file,t,opts.full===true);
  const ok=await promise;if(t!==trace||t.cancelled)return false;
  t.readyMs=clock()-t.started;t.success=ok===true;t.decoder=NSFileFormats.isRaw(roll[i]?.file.name)?NSRawDecoder.metrics():null;
  if(ok){t.renderMetrics={cpuRenderMs:stats38.lastRenderMs,gpu:globalThis.FILMLABB_GPU?.snapshot()||null};t.memory={sourceBytes:working.data.byteLength,previewBytes:workingPreview.data.byteLength,legacyPreviewBytes:previewSrc?.data.byteLength||0};if(t.technicalPaintMs!==undefined){t.usableMs=Math.max(t.readyMs,t.technicalPaintMs);t.phase='ready';}}
  else removeProof();return ok;
 };
 const clear=$('clearQueue').onclick;$('clearQueue').onclick=()=>{if(exportBusy||rollingExport)return;if(rollLoading&&!cancel())return;removeProof();NSRawDecoder.clearCache();clear();};
 const importFiles=importRoll;importRoll=async function(files,options){if(exportBusy||rollingExport||cropDrag)return;if(rollLoading&&!cancel())return;NSRawDecoder.clearCache();return importFiles(files,options);};
 const finish=finishImport;finishImport=function(...args){phase('prepare');const t=clock();try{return finish(...args);}finally{if(trace&&trace.usableMs===undefined)trace.stages.finishImport=clock()-t;}};
 const renderImport=render;render=function(...args){const t=trace,start=clock(),before=globalThis.FILMLABB_GPU?.snapshot().frames,result=renderImport(...args);if(t===trace&&t&&t.usableMs===undefined&&sourceVersion38!==t.sourceVersion){t.stages.renderSubmit=(t.stages.renderSubmit||0)+clock()-start;if(globalThis.FILMLABB_GPU?.snapshot().frames>before)rawPaint(t);}return result;};
 const show=showPreview38;showPreview38=function(...args){const start=clock(),result=show(...args);if(trace&&trace.usableMs===undefined)trace.stages.canvasPresentation=(trace.stages.canvasPresentation||0)+clock()-start;if(trace&&sourceVersion38!==trace.sourceVersion)rawPaint(trace);return result;};
 for(const [owner,key,name]of [[NSV2Platform,'preview','preview'],[NSV2Platform,'prepare','v2Analysis'],[CE,'detectFrame','frameAnalysis'],[CE,'findBase','baseAnalysis']]){const original=owner[key];owner[key]=function(...args){const t=clock();try{return original.apply(this,args);}finally{if(trace&&trace.usableMs===undefined)trace.stages[name]=(trace.stages[name]||0)+clock()-t;}};}
 globalThis.FILMLABB_IMPORT={phase,cancel,snapshot:()=>trace?JSON.parse(JSON.stringify({...trace,elapsedMs:trace.usableMs??trace.readyMs??(clock()-trace.started),heap:performance.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize}:null})):null};
})();
