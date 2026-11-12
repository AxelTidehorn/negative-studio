/* TIFF, PNG16 and synchronous canvas export share prepared presentation sampling. */
'use strict';
// TIFF chunking keeps the UI responsive. The table is technical-only: profiles,
// saturation, shadows and highlights all retain the exact shared final pixel path.
let rgb16Metrics=null;
async function exportRgb16(format,control={}){
 if(!exportReady())throw Error('Ingen exportklar bild finns.');
 exportBusy=true;$('export').disabled=true;
 let png,prepared;
 const started=performance.now(),metrics=rgb16Metrics={format,chunks:0,yields:0,maxChunkMs:0,renderMs:0,encodeMs:0,blobMs:0,cancelled:false};
 const tick=async()=>{metrics.yields++;if(typeof globalThis.scheduler?.postTask==='function'){metrics.yieldBackend='background-task';await scheduler.postTask(()=>{},{priority:'background'});}else{metrics.yieldBackend='timer';await new Promise(r=>setTimeout(r,0));}control.check?.();};
 try{
  const im=working,opts={...state},c=configuration38(opts),selection=exportGeometrySnapshot(im,opts),g=selection.g,label=format==='png16'?'PNG 16-bit':'TIFF';
  control.check?.();
  if(format==='tiff'&&g.width*g.height*6>=4294960000)throw Error('Bilden är för stor för klassisk TIFF.');
  if(control.worker&&typeof Worker!=='undefined'&&im.encoding!=='icc'){
   try{
    const result=await control.worker({im,config:JSON.parse(JSON.stringify(c)),g,target:{width:g.width,height:g.height},opts:{...opts,cropExport:selection.crop},region:selection.region,format,label});control.check?.();
    const blob=result.blob;metrics.backend='worker';metrics.worker=result.metrics;metrics.width=g.width;metrics.height=g.height;metrics.outputPixelBytes=g.width*g.height*6;metrics.blobBytes=blob.size;
    if(blob.type!==(format==='tiff'?'image/tiff':'image/png')||!blob.size)throw Error('Fel bildformat från bakgrundsexport.');
    await tick();downloadBlob(blob,exportName(rollingExport?activeFrame:null,format==='tiff'?'tif':'png',format==='tiff'?'filmlabb-positive-16bit.tif':'filmlabb-positive-16bit.png'));setStatus(`${label} 16 bit · ${g.width}×${g.height} · sRGB`);return;
   }catch(e){control.check?.();if(e.stage!=='init')throw e;metrics.workerFallback=e.message;}
  }
  metrics.backend='main';
  if(format==='png16')png=NSPng.create(g.width,g.height,16);
  const parts=png?[]:[tiffHeader(g.width,g.height)],littleEndian=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
  metrics.width=g.width;metrics.height=g.height;metrics.outputPixelBytes=g.width*g.height*6;
  await tick();const preparing=performance.now();prepared=NSPixelKernel.prepare(im,c);metrics.prepareMs=performance.now()-preparing;
  let deadline=performance.now()+20;
  for(let y=0;y<g.height;){
   control.check?.();
   const rows=g.presentation?NSPresentation.rows(im,g,g,g.height-y):Math.min(16,Math.max(1,Math.floor(NSPresentation.STRIPE_BYTES/(g.width*6))),g.height-y),out=new Uint16Array(g.width*rows*3);
   for(let dy=0;dy<rows;dy++)for(let x=0;x<g.width;x+=256){
    control.check?.();const count=Math.min(256,g.width-x),began=performance.now();
    NSPresentation.rgb16Span(im,prepared,g,x,y+dy,count,out,(dy*g.width+x)*3);
    const elapsed=performance.now()-began;metrics.renderMs+=elapsed;metrics.maxChunkMs=Math.max(metrics.maxChunkMs,elapsed);metrics.chunks++;
    if(performance.now()>=deadline){setStatus(`${label} ${Math.floor(100*(y+dy+(x+count)/g.width)/g.height)} %`);control.progress?.(y+dy+(x+count)/g.width,g.height);await tick();deadline=performance.now()+20;}
   }
   const encoding=performance.now();
   if(png)await png.write(out,rows);
   else if(littleEndian)parts.push(out);
   else{
    const bytes=new Uint8Array(out.length*2),dv=new DataView(bytes.buffer);
    for(let i=0;i<out.length;i++)dv.setUint16(i*2,out[i],true);
    parts.push(bytes);
   }
   metrics.encodeMs+=performance.now()-encoding;metrics.parts=parts.length;
   if(performance.now()>=deadline){setStatus(`${label} ${Math.round(100*(y+rows)/g.height)} %`);await tick();deadline=performance.now()+20;}
   control.progress?.(y+rows,g.height);y+=rows;
  }
  control.check?.();
  await tick();const combining=performance.now(),blob=png?await png.finish():new Blob(parts,{type:'image/tiff'});metrics.blobMs=performance.now()-combining;metrics.blobBytes=blob.size;await tick();control.check?.();
  downloadBlob(blob,exportName(rollingExport?activeFrame:null,png?'png':'tif',png?'filmlabb-positive-16bit.png':'filmlabb-positive-16bit.tif'));
  setStatus(png?`PNG 16 bit · ${g.width}×${g.height} · sRGB`:`TIFF 16 bit · ${g.width}×${g.height} · inbäddad sRGB-profil`);
 }catch(e){metrics.cancelled=e.name==='AbortError';setStatus('Exportfel: '+e.message);throw e;}
 finally{metrics.cache=prepared?NSPresentation.cacheStats(prepared):(metrics.worker?.cache||null);if(prepared)NSPresentation.release(prepared);metrics.ms=performance.now()-started;await png?.abort();exportBusy=false;$('export').disabled=false;}
}
exportTiff=control=>exportRgb16('tiff',control);
function exportPng16(control){return exportRgb16('png16',control);}
globalThis.FILMLABB_RGB16={snapshot:()=>rgb16Metrics?JSON.parse(JSON.stringify(rgb16Metrics)):null};
