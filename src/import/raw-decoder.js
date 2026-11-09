/* Camera-independent adapter; one existing LibRaw/RAW-input mathematical path. */
(function(root){
'use strict';
function validate(im){
 if(!im||im.bits!==16||im.colors!==3||!Number.isSafeInteger(im.width)||!Number.isSafeInteger(im.height)||im.width<1||im.height<1||!(im.data instanceof Uint16Array)||im.data.length!==im.width*im.height*3)
  throw Error('LibRaw gav inte en komplett 16-bitars RGB-bild.');
 return im;
}
let cached=null,last=null;const active=new Map();
const abort=()=>Object.assign(Error('Import avbruten.'),{name:'AbortError'});
function cancel(){for(const [worker,reject]of active){worker.terminate();reject(abort());}active.clear();}
function clearCache(){cached=null;}
function isCached(file,mode,options=NSRawInput.options(mode)){return cached?.file===file&&cached.key===JSON.stringify([mode,options]);}
function workerDecode(file,mode,options,onStage){return new Promise((resolve,reject)=>{
 const worker=new Worker('./raw-worker.js',{type:'module'}),finish=(fn,value)=>{active.delete(worker);worker.terminate();fn(value);};active.set(worker,reject);
 worker.onerror=e=>finish(reject,Error(e.message||'RAW-worker misslyckades.'));
 worker.onmessage=({data})=>{if(!active.has(worker))return;if(data.stage){onStage?.(data.stage);return;}if(data.error)finish(reject,Error(data.error));else finish(resolve,data);};
 try{worker.postMessage({file,mode,options});}catch(e){finish(reject,e);}
});}
async function decode(file,mode,{createDecoder,options:explicitOptions,onStage,force=false,cache=false}={}){
 let d;
 try{
  if(!NSFileFormats.isRaw(file))throw Error(NSFileFormats.error(file));
  const options=explicitOptions||NSRawInput.options(mode),key=JSON.stringify([mode,options]),began=performance.now();
  if(!createDecoder){
   if(cache&&!force&&cached?.file===file&&cached.key===key){last={cacheHit:true,totalMs:performance.now()-began,stages:{},memory:cached.memory};return {...cached.result,im:{...cached.result.im}};}
   // Only main-image imports opt into this cache. Reference-image analysis
   // never retains another full-resolution buffer. File identity + recipe,
   // never filename alone, determines a hit. No inactive-image LRU.
   if(cache)cached=null;const result=await workerDecode(file,mode,options,onStage),im=result.im;
   if(im.bits!==16||im.colors!==3||!Number.isSafeInteger(im.width)||!Number.isSafeInteger(im.height)||im.width<1||im.height<1||im.data.length!==im.width*im.height*3||!(im.data instanceof Float32Array||im.data instanceof Uint16Array))throw Error('LibRaw gav inte en komplett 16-bitars RGB-bild.');
   const output={im,meta:result.meta,provenance:{decoder:'libraw-wasm',version:'1.6.0',format:NSFileFormats.extension(file),mode:im.rawMode4,options,metadata:result.meta||null}};
   last={cacheHit:false,totalMs:performance.now()-began,stages:result.stages,memory:result.memory};if(cache)cached={file,key,result:output,memory:result.memory};return {...output,im:{...im}};
  }
  // Injection retains the original adapter contract for independent oracles.
  d=await createDecoder();const bytes=new Uint8Array(await file.arrayBuffer());
  await d.open(bytes,options);const full=await d.metadata(true),meta={};
  for(const key of ['width','height','raw_width','raw_height','top_margin','left_margin','flip','camera_make','camera_model','iso_speed','shutter','aperture','focal_len','timestamp','color_data'])if(full?.[key]!==undefined)meta[key]=full[key];
  const im=NSRawInput.convert(validate(await d.imageData()),mode);
  return {im,meta,provenance:{decoder:'libraw-wasm',version:'1.6.0',format:NSFileFormats.extension(file),mode:im.rawMode4,options,metadata:meta||null}};
 }catch(err){if(err.name==='AbortError')throw err;throw Error(NSFileFormats.extension(file).toUpperCase()+'-avkodning misslyckades för '+file.name+': '+err.message+'. Kameramodell eller komprimering kan sakna stöd; filen kan också vara skadad eller enhetens minne otillräckligt.');}
 finally{d?.dispose();}
}
root.NSRawDecoder={decode,validate,cancel,clearCache,isCached,metrics:()=>({...last,activeWorkers:active.size,cacheBytes:cached?.result.im.data.byteLength||0})};
})(globalThis);
