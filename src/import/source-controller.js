'use strict';
async function readFile(file){
 if(!file)return;
 if(NSFileFormats.isRaw(file.name)){
  try {
   setStatus('RAW: laddar LibRaw och avkodar bilden… Detta kan ta tid.');
   try {
     const {im,meta,provenance}=await NSRawDecoder.decode(file,state.rawMode4);
     await importRawRGB16(im,file.name,meta);
     sourceInfo.rawMetadata=provenance;
     if(roll[activeFrame])roll[activeFrame].sourceMetadata=provenance;
   } catch(rawError) {
     setStatus('RAW-avkodning misslyckades: '+rawError.message);
     const jpeg=/\.raf$/i.test(file.name)?await readRafJpeg(file):null;
     if(!jpeg)throw Error('RAW-avkodning misslyckades: '+rawError.message+' (ingen reserv-JPEG för denna filtyp)');
     if((globalThis.FILMLABB_I18N?.confirmSource||confirm)('RAW-avkodning misslyckades: '+rawError.message+'\n\nVill du använda den inbäddade 8-bitars JPEG-bilden i stället?')) {
       await importBrowserImage(new File([jpeg],file.name+'.jpg',{type:'image/jpeg'}),
          `RAF ${file.name} – JPEG-RESERVLÄGE (8 bitar), inte RAW.`);
     }
   }
  }catch(e){throw e;}
  return;
 }
 if(!file)return;setStatus('Läser in bild…');src=null;hires=null;
 if(/\.tiff?$/i.test(file.name)||file.type==='image/tiff'){
  try{const raw=prepareTiff(await NSTiff.decode(await file.arrayBuffer()));hires=raw;fullWidth=raw.width;fullHeight=raw.height;
   const scale=Math.min(1,1600/Math.max(raw.width,raw.height));const w=Math.max(1,Math.round(raw.width*scale)),h=Math.max(1,Math.round(raw.height*scale));
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const cx=canvas.getContext('2d',{willReadFrequently:true});const im=cx.createImageData(w,h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(raw.width-1,Math.floor(x*raw.width/w)),sy=Math.min(raw.height-1,Math.floor(y*raw.height/h)),j=(sy*raw.width+sx)*raw.channels,i=(y*w+x)*4;for(let c=0;c<3;c++)im.data[i+c]=Math.round(raw.data[j+c]/257);im.data[i+3]=255;}
   src=im;finishImport(`${file.name} · ${raw.width}×${raw.height} · ${raw.bits}-bitars TIFF-källa (förhandsvisning ${w}×${h}).`);return;
  }catch(e){throw Error('TIFF: '+e.message);}
 }
 if(NSFileFormats.kind(file)!=='browser'){throw Error(NSFileFormats.error(file));}
 await importBrowserImage(file);
}
async function importRawRGB16(im,name,meta){
 const raw={width:im.width,height:im.height,channels:3,data:im.data,scale:im.scale||65535,colorSpace:im.colorSpace||'srgb'};
 hires=raw;fullWidth=raw.width;fullHeight=raw.height;
 const scale=Math.min(1,1600/Math.max(raw.width,raw.height)),w=Math.max(1,Math.round(raw.width*scale)),h=Math.max(1,Math.round(raw.height*scale));
 const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d',{willReadFrequently:true});const p=cx.createImageData(w,h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=Math.min(raw.width-1,Math.floor(x*raw.width/w)),sy=Math.min(raw.height-1,Math.floor(y*raw.height/h));
  const j=(sy*raw.width+sx)*3,i=(y*w+x)*4;
  for(let c=0;c<3;c++)p.data[i+c]=Math.round(raw.data[j+c]/raw.scale*255);
  p.data[i+3]=255;
 }
 src=p;
 finishImport(`RAW 16-bit ${name} · ${raw.width}×${raw.height} · ${meta?.camera_model||'kamera'} · LibRaw RGB. Experimentell färghantering.`);
}
// Header parsing is shared by the buffer compatibility API and bounded File IO.
function rafPreviewRange(buffer,totalBytes=buffer.byteLength){
 const d=new DataView(buffer);
 if(d.byteLength<100)throw Error('Filen är för kort.');
 const sig=new TextDecoder('ascii').decode(new Uint8Array(buffer,0,16));
 if(!sig.startsWith('FUJIFILMCCD-RAW'))throw Error('Filen är inte en Fujifilm RAF.');
 const offset=d.getUint32(84,false),length=d.getUint32(88,false);
 if(length<4||length>40000000||offset<100||offset+length>totalBytes)throw Error('Felaktig offset eller längd i RAF-header.');
 return {offset,length};
}
function validRafJpeg(first,last){
 if(first[0]!==255||first[1]!==216||last[0]!==255||last[1]!==217)throw Error('JPEG-signaturen saknas.');
}
function extractRafJpeg(buffer){
 const {offset,length}=rafPreviewRange(buffer),bytes=new Uint8Array(buffer);
 validRafJpeg(bytes.subarray(offset,offset+2),bytes.subarray(offset+length-2,offset+length));
 return new Blob([buffer.slice(offset,offset+length)],{type:'image/jpeg'});
}
async function readRafJpeg(file){
 // Retain support for the existing buffer-only adapters and test sources.
 if(typeof file.slice!=='function'||!Number.isSafeInteger(file.size))return extractRafJpeg(await file.arrayBuffer());
 const {offset,length}=rafPreviewRange(await file.slice(0,100).arrayBuffer(),file.size);
 const [first,last]=await Promise.all([file.slice(offset,offset+2).arrayBuffer(),file.slice(offset+length-2,offset+length).arrayBuffer()]);
 validRafJpeg(new Uint8Array(first),new Uint8Array(last));
 // Blob slicing retains the original JPEG bytes without allocating the full RAF.
 return file.slice(offset,offset+length,'image/jpeg');
}
async function importBrowserImage(file,note=''){
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{let c;try{const maxSide=16384,budget=Number(navigator.deviceMemory)<4?24000000:40000000;const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight),Math.sqrt(budget/(img.naturalWidth*img.naturalHeight)));fullWidth=img.naturalWidth;fullHeight=img.naturalHeight;c=document.createElement('canvas');c.width=Math.max(1,Math.round(fullWidth*scale));c.height=Math.max(1,Math.round(fullHeight*scale));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);src=ctx.getImageData(0,0,c.width,c.height);finishImport(`${note ? note+" · " : ""}${file.name} · ${fullWidth}×${fullHeight} px · 8-bitars bild; bearbetning ${c.width}×${c.height}.`);resolve();}catch(e){setStatus('Kunde inte läsa bilden: '+e.message);reject(e);}finally{if(c)c.width=c.height=0;URL.revokeObjectURL(url);}};img.onerror=()=>{URL.revokeObjectURL(url);setStatus('Kunde inte öppna bilden.');reject(Error('Bildimport misslyckades'))};img.src=url;});
}
// Synchronous compatibility entry for uncompressed/LZW/PackBits TIFF.
function parseTiff16(buffer){return NSTiff.decodeSync(buffer);}
// v0.6: filmrulle-import hanteras efter de ursprungliga bildfunktionerna
