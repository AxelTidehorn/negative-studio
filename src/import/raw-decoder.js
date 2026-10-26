/* Camera-independent adapter; conversion/options remain in unchanged raw-input.js. */
(function(root){
'use strict';
function validate(im){
 if(!im||im.bits!==16||im.colors!==3||!Number.isSafeInteger(im.width)||!Number.isSafeInteger(im.height)||im.width<1||im.height<1||!(im.data instanceof Uint16Array)||im.data.length!==im.width*im.height*3)
  throw Error('LibRaw gav inte en komplett 16-bitars RGB-bild.');
 return im;
}
async function decode(file,mode,{createDecoder}={}){
 let d;
 try{
  if(!NSFileFormats.isRaw(file))throw Error(NSFileFormats.error(file));
  d=createDecoder?await createDecoder():new (await import('./libraw/dist/index.js')).default();
  const bytes=new Uint8Array(await file.arrayBuffer());
  await d.open(bytes,NSRawInput.options(mode));
  const full=await d.metadata(true);
  // Retain camera settings and calibration; omit unrelated GPS/artist/maker notes.
  const meta={};for(const key of ['width','height','raw_width','raw_height','top_margin','left_margin','flip','camera_make','camera_model','iso_speed','shutter','aperture','focal_len','timestamp','color_data'])if(full?.[key]!==undefined)meta[key]=full[key];
  const im=NSRawInput.convert(validate(await d.imageData()),mode);
  return {im,meta,provenance:{decoder:'libraw-wasm',version:'1.6.0',format:NSFileFormats.extension(file),mode:im.rawMode4,options:NSRawInput.options(mode),metadata:meta||null}};
 }catch(err){throw Error(`${NSFileFormats.extension(file).toUpperCase()}-avkodning misslyckades för ${file.name}: ${err.message}. Kameramodell eller komprimering kan sakna stöd; filen kan också vara skadad eller enhetens minne otillräckligt.`);}
 finally{d?.dispose();}
}
root.NSRawDecoder={decode,validate};
})(globalThis);
