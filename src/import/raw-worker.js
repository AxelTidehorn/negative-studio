/* Same LibRaw 1.6.0/options and raw-input transform as the adapter. One job,
   one worker: terminating it releases the WASM heap, including on cancellation. */
import factory from './libraw/dist/libraw.js';
import './raw-input.js';
self.onmessage=async({data:{file,mode,options}})=>{
 const stages={},now=()=>performance.now();let d;
 const span=(name,fn)=>{const t=now();try{return fn();}finally{stages[name]=now()-t;}};
 try{
  self.postMessage({stage:'initialise'});let t=now();const module=await factory();stages.librawInit=now()-t;d=new module.LibRaw();
  self.postMessage({stage:'read'});t=now();const bytes=new Uint8Array(await file.arrayBuffer());stages.fileRead=now()-t;
  self.postMessage({stage:'decode'});span('rawOpen',()=>d.open(bytes,options));
  const full=span('metadata',()=>d.metadata(true)),meta={};
  for(const key of ['width','height','raw_width','raw_height','top_margin','left_margin','flip','camera_make','camera_model','iso_speed','shutter','aperture','focal_len','timestamp','color_data'])if(full?.[key]!==undefined)meta[key]=full[key];
  if(meta.timestamp!==undefined)meta.timestamp=new Date(meta.timestamp*1000);
  // Public imageData combines processing, RGB allocation and retrieval.
  const rgb=span('rawImageData',()=>d.imageData());
  if(rgb.bits!==16||rgb.colors!==3||!(rgb.data instanceof Uint16Array)||rgb.data.length!==rgb.width*rgb.height*3)throw Error('LibRaw gav inte en komplett 16-bitars RGB-bild.');
  self.postMessage({stage:'convert'});const rgb16Bytes=rgb.data.byteLength,im=span('rgbConvert',()=>NSRawInput.convert(rgb,mode));
  self.postMessage({im,meta,stages,memory:{fileBytes:bytes.byteLength,rgb16Bytes,sourceBytes:im.data.byteLength,wasmHeapBytes:module.HEAPU8?.buffer.byteLength||null}},[im.data.buffer]);
 }catch(e){self.postMessage({error:e.message});}
 finally{d?.delete();}
};
