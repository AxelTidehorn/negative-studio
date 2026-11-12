/* File preparation and source metadata; no independent conversion pipeline. */
'use strict';
async function readFile(file,{isCurrent=()=>true,force=false}={}){
 const current=()=>{if(!isCurrent())throw Object.assign(Error('Import avbruten.'),{name:'AbortError'});};
 if(!file)return;
 if(NSFileFormats.isRaw(file.name)){
  setStatus('RAW: laddar LibRaw och avkodar bilden… Detta kan ta tid.');
  try {
    const locked=NSV2Platform.usesLockedSource(state),{im,meta,provenance}=await NSRawDecoder.decode(file,locked?'wide':state.rawMode4,{...(locked?{options:NSV2Platform.decoderOptions()}:{}),force,cache:true,onStage:stage=>{if(isCurrent())globalThis.FILMLABB_IMPORT?.phase(stage);}});
    current();globalThis.FILMLABB_IMPORT?.phase('prepare');
    if(locked){state.rawMode4='wide';state.rawSourceRecipeV2=1;}
    im.v2Decoded=locked;im.decoderRecipe=provenance;await importRawRGB16(im,file.name,meta);
    sourceInfo.rawMetadata=provenance;
    if(roll[activeFrame])roll[activeFrame].sourceMetadata=provenance;
  } catch(rawError) {
    if(rawError.name==='AbortError'||!isCurrent())throw rawError;
    if(state.engine==='v2')throw rawError;
    setStatus('RAW-avkodning misslyckades: '+rawError.message);
    const jpeg=/\.raf$/i.test(file.name)?await readRafJpeg(file):null;
    current();if(!jpeg)throw Error('RAW-avkodning misslyckades: '+rawError.message+' (ingen reserv-JPEG för denna filtyp)');
    if((globalThis.FILMLABB_I18N?.confirmSource||confirm)('RAW-avkodning misslyckades: '+rawError.message+'\n\nVill du använda den inbäddade 8-bitars JPEG-bilden i stället?')) {
      await importBrowserImage(new File([jpeg],file.name+'.jpg',{type:'image/jpeg'}),
         `RAF ${file.name} – JPEG-RESERVLÄGE (8 bitar), inte RAW.`,isCurrent);
    }
  }
  return;
 }
 setStatus('Läser in bild…');src=null;hires=null;
 if(/\.tiff?$/i.test(file.name)||file.type==='image/tiff'){
  try{const decoded=await NSTiff.decode(await file.arrayBuffer());current();const raw=prepareTiff(decoded);hires=raw;fullWidth=raw.width;fullHeight=raw.height;
   src=null;finishImport(`${file.name} · ${raw.width}×${raw.height} · ${raw.bits}-bitars TIFF-källa.`);return;
  }catch(e){throw Error('TIFF: '+e.message);}
 }
 if(NSFileFormats.kind(file)!=='browser'){throw Error(NSFileFormats.error(file));}
 await importBrowserImage(file,'',isCurrent);
}
async function importRawRGB16(im,name,meta){
 const mode=im.rawMode4||(im.colorSpace==='rec2020'?'wide':'protected');
 sourceInfo={rawMetadata:im.decoderRecipe||null,v2Decoded:!!im.v2Decoded,encoding:'linear',gain:im.linearGain4||1,whiteBalance:meta?.color_data?.cam_mul||null,decoder:'libraw-wasm@1.6.0',domain:'raw-'+(im.v2Decoded?'wide-v2-1':mode)+':'+(meta?.camera_model||'unknown'),rawMode4:mode,colorSpace:im.colorSpace||'srgb',diagnostics4:im.inputDiagnostics4,label:mode==='wide'?'Experimentell RAW · Rec.2020 · flyttal · inversion före sRGB':'Avkodad RAW · linjär sRGB · Beta 4-färgmarginal (Rec.2020 → sRGB, gemensam ½-skala)'};
 const raw={width:im.width,height:im.height,channels:3,data:im.data,scale:im.scale||65535,colorSpace:im.colorSpace||'srgb',encoding:'linear'};
 hires=raw;fullWidth=raw.width;fullHeight=raw.height;
 src=null;
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
async function importBrowserImage(file,note='',isCurrent=()=>true){
 if(!isCurrent())return;
 sourceInfo={encoding:'srgb',label:/JPEG-RESERV|inbäddad/i.test(note)?'INBÄDDAD JPEG · 8 bit · sRGB via webbläsaren · inte RAW':'8 bit · sRGB via webbläsarens färghantering'};
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{let c;try{if(!isCurrent())throw Object.assign(Error('Import avbruten.'),{name:'AbortError'});const maxSide=16384,budget=Number(navigator.deviceMemory)<4?24000000:40000000;const scale=Math.min(1,maxSide/Math.max(img.naturalWidth,img.naturalHeight),Math.sqrt(budget/(img.naturalWidth*img.naturalHeight)));fullWidth=img.naturalWidth;fullHeight=img.naturalHeight;c=document.createElement('canvas');c.width=Math.max(1,Math.round(fullWidth*scale));c.height=Math.max(1,Math.round(fullHeight*scale));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);src=ctx.getImageData(0,0,c.width,c.height);finishImport(`${note ? note+" · " : ""}${file.name} · ${fullWidth}×${fullHeight} px · 8-bitars bild; bearbetning ${c.width}×${c.height}.`);resolve();}catch(e){if(isCurrent())setStatus('Kunde inte läsa bilden: '+e.message);reject(e);}finally{if(c)c.width=c.height=0;URL.revokeObjectURL(url);}};img.onerror=()=>{URL.revokeObjectURL(url);if(isCurrent())setStatus('Kunde inte öppna bilden.');reject(Error('Bildimport misslyckades'))};img.src=url;});
}

// Normalize all channels together before quantizing the ICC result. A direct
// conversion into [0,1] sRGB clipped over half the red pixels in the test TIFF.
function normalizeIccTiff(raw){const profile=NSColorManagement.parseICC(raw.icc),peaks=[];const step=Math.max(1,Math.floor(raw.width*raw.height/18000));for(let j=0;j<raw.width*raw.height;j+=step){const i=j*raw.channels,p=profile.toLinear([raw.data[i]/65535,raw.data[i+1]/65535,raw.data[i+2]/65535]);peaks.push(Math.max(...p));}const normalization=Math.max(1,CE.quantile(peaks,.999));for(let i=0;i<raw.data.length;i+=raw.channels){const p=profile.toLinear([raw.data[i]/65535,raw.data[i+1]/65535,raw.data[i+2]/65535]);for(let c=0;c<3;c++)raw.data[i+c]=Math.round(CE.clamp(p[c]/normalization)*65535);}raw.encoding='linear';return {raw,normalization,label:profile.label+' · gemensam skala '+normalization.toFixed(3)};}
function prepareTiff(raw){
 if(state.tiffEncoding==='linear-rec2020'){
  if(raw.icc)throw Error('Verifierad linjär Rec.2020 kräver TIFF utan ICC.');
  raw={...raw,data:NSColorEngine.unitFloat32(raw.data),channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'};
  sourceInfo={encoding:'linear',colorSpace:'rec2020',gain:1,domain:'verified-linear-rec2020-tiff',label:'Verifierad linjär Rec.2020-TIFF'};return raw;
 }
 if(state.engine==='v2')throw Error('V2 kräver verifierad linjär Rec.2020-TIFF.');
 if(raw.icc){const converted=normalizeIccTiff(raw);sourceInfo={encoding:'linear',normalization:converted.normalization,label:converted.label+' · '+raw.bits+' bit källa'};}
 else{sourceInfo={encoding:state.tiffEncoding||'srgb',label:'TIFF utan ICC · antagen '+(state.tiffEncoding==='linear'?'linjär sRGB':'sRGB')+' · kontrollera källkodning'};}
 return raw;
}
