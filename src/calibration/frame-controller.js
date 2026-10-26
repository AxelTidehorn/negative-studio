/* Source import, film-frame interaction and source-coordinate tools. */
'use strict';
const CE=NSColorEngine;
let cropDisplayDismissed=false,working=null,workingPreview=null,calibration=null,legacyLevels=null,beta3Base=null,beta3Levels=null,sourceInfo={encoding:'srgb',label:'sRGB (webbläsare)'},sharedBase=null,sharedLight=null,cropDrag=null,exportBusy=false;
function workingSource(){if(hires)return {width:hires.width,height:hires.height,channels:hires.channels,data:hires.data,scale:hires.scale||65535,colorSpace:hires.colorSpace||'srgb',encoding:hires.encoding||sourceInfo.encoding,profile:hires.profile,normalization:hires.normalization||1};return {width:src.width,height:src.height,channels:4,data:src.data,scale:255,encoding:'srgb'};}
function sourcePixel(im,x,y){return CE.pixel(im,x,y);}
function calibrationBase(){const b=state.useRollBase&&sharedBase?sharedBase:state.manualCalibration;return b&&(!b.sourceEncoding||b.sourceEncoding===sourceInfo.encoding)&&(!sourceInfo.domain||b.sourceDomain===sourceInfo.domain||(!b.sourceDomain&&sourceInfo.rawMode4==='reference'))?b:null;}
function currentLight(){return sharedLight&&sharedLight.encoding===sourceInfo.encoding&&(!sourceInfo.domain||sharedLight.domain===sourceInfo.domain||(!sharedLight.domain&&sourceInfo.rawMode4==='reference'))?sharedLight.gains:[1,1,1];}

function updateCalibrationUI(){syncEngineSelector();const compatible=sharedLight&&sharedLight.encoding===sourceInfo.encoding;$('referenceStatus').textContent=sharedLight?(compatible?'Gemensam ljuskälla aktiv · ':'Ljuskälla pausad: annan källkodning · ')+sharedLight.name:'Ingen ljuskällereferens';$('rollBaseStatus').textContent=sharedBase?'Gemensam filmbas tillgänglig · '+sharedBase.sourceEncoding:'Ingen gemensam filmbas';$('useRollBase').checked=!!state.useRollBase;$('useRollBase').disabled=!sharedBase;$('sourceStatus').textContent=sourceInfo.label;$('engineMode').value=state.engine||'legacy';$('balanceStrength').disabled=state.engine==='beta2';$('balanceStrength').title=state.engine==='beta2'?'Beta 2 använder filmbasen för färgbalans. Justera Varm/kall och Grön/magenta manuellt.':'Styr kanalbalanseringen';}
finishImport=function(message){
 cropDisplayDismissed=false;
 working=workingSource();workingPreview=CE.preview(working);
 // The legacy engine must analyze the same normalized samples that full-size
 // export reads, rather than an independently encoded camera/TIFF thumbnail.
 previewSrc=new ImageData(workingPreview.width,workingPreview.height);
 for(let i=0;i<workingPreview.data.length;i++)previewSrc.data[Math.floor(i/3)*4+i%3]=Math.round(255*(sourceInfo.encoding==='linear'?CE.clamp(workingPreview.data[i]):CE.encode(workingPreview.data[i])));
 for(let i=3;i<previewSrc.data.length;i+=4)previewSrc.data[i]=255;
 $('preview').width=workingPreview.width;$('preview').height=workingPreview.height;$('preview').classList.remove('hidden');$('empty').classList.add('hidden');
 for(const id of ['export','exportTiff','sample','recalc','analyzeLevels'])$(id).disabled=false;
 sampleMode=false;
 const f=roll[activeFrame];if(!f?.crop&&state.cropMethod!=='manual'&&!state.cropLocked){const d=CE.detectFrame(workingPreview);cropRegion=d.region;state.cropConfidence=d.confidence;state.cropMethod='auto';state.cropConfirmed=d.confidence>=.7;}
 $('cropInset').value=1;updateCropUI();updateBase();analyzeLevels();render();setStatus(message+(state.cropConfirmed?'':' · Filmrutan är osäker – kontrollera gärna före export.'));
};
const importRawOriginal=importRawRGB16;
importRawRGB16=async function(im,name,meta){sourceInfo={encoding:'linear',domain:'raw-'+(im.rawMode4||'reference')+':'+(meta?.camera_model||'unknown'),rawMode4:im.rawMode4||'reference',colorSpace:im.colorSpace||'srgb',diagnostics4:im.inputDiagnostics4,label:im.rawMode4==='wide'?'Experimentell RAW · Rec.2020 · flyttal · inversion före sRGB':im.rawMode4==='protected'?'Avkodad RAW · linjär sRGB · Beta 4-färgmarginal (Rec.2020 → sRGB, gemensam ½-skala)':'Avkodad RAW · 16 bit · linjär sRGB · 3.9-import'};await importRawOriginal(im,name,meta);};
const importBrowserOriginal=importBrowserImage;
importBrowserImage=async function(file,note=''){sourceInfo={encoding:'srgb',label:/JPEG-RESERV|inbäddad/i.test(note)?'INBÄDDAD JPEG · 8 bit · sRGB via webbläsaren · inte RAW':'8 bit · sRGB via webbläsarens färghantering'};await importBrowserOriginal(file,note);};
// Normalize all channels together before quantizing the ICC result. A direct
// conversion into [0,1] sRGB clipped over half the red pixels in the test TIFF.
function normalizeIccTiff(raw){const profile=NSColorManagement.parseICC(raw.icc),peaks=[];const step=Math.max(1,Math.floor(raw.width*raw.height/18000));for(let j=0;j<raw.width*raw.height;j+=step){const i=j*raw.channels,p=profile.toLinear([raw.data[i]/65535,raw.data[i+1]/65535,raw.data[i+2]/65535]);peaks.push(Math.max(...p));}const normalization=Math.max(1,CE.quantile(peaks,.999));for(let i=0;i<raw.data.length;i+=raw.channels){const p=profile.toLinear([raw.data[i]/65535,raw.data[i+1]/65535,raw.data[i+2]/65535]);for(let c=0;c<3;c++)raw.data[i+c]=Math.round(CE.clamp(p[c]/normalization)*65535);}raw.encoding='linear';return {raw,label:profile.label+' · gemensam skala '+normalization.toFixed(3)};}
function prepareTiff(raw){
 if(raw.icc){const converted=normalizeIccTiff(raw);sourceInfo={encoding:'linear',label:converted.label+' · '+raw.bits+' bit källa'};}
 else{sourceInfo={encoding:state.tiffEncoding||'srgb',label:'TIFF utan ICC · antagen '+(state.tiffEncoding==='linear'?'linjär sRGB':'sRGB')+' · kontrollera källkodning'};}
 return raw;
}
// Smooth tonal adjustments in output sRGB space; neutral at zero.
// Used identically by preview and full-resolution JPEG/TIFF export.


// Neutral profile and saturation 1 have independent channels. Cache the exact
// developer output for each possible 16-bit input before rendering a RAW/TIFF.

// Film navigation feedback is presentation-only; no image/export geometry is changed.
let frameLoadSequence=0;
function setFrameLoading(visible,name=''){
 const picture=$('picture');if(!picture)return;
 let overlay=$('frameLoadingOverlay');
 if(!overlay){
  overlay=document.createElement('div');overlay.id='frameLoadingOverlay';overlay.className='frame-loading-overlay';
  overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
  const spinner=document.createElement('span');spinner.className='frame-loading-spinner';spinner.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='frame-loading-label';overlay._loadingLabel=label;
  overlay.append(spinner,label);picture.append(overlay);
 }
 if(!overlay._loadingLabel){const label=document.createElement('span');label.className='frame-loading-label';overlay._loadingLabel=label;overlay.append(label);}
 if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source(overlay._loadingLabel,name?'Laddar '+name+'…':'Laddar bild…');else overlay._loadingLabel.textContent=name?'Laddar '+name+'…':'Laddar bild…';
 overlay.hidden=!visible;
 picture.setAttribute('aria-busy',String(visible));
}
chooseFrame=async function(i,{force=false}={}){
 if(i<0||i>=roll.length||rollLoading||exportBusy||cropDrag||(!force&&i===activeFrame))return;
 const loadId=++frameLoadSequence;
 setFrameLoading(true,roll[i].file.name);
 saveCurrentFrame();rollLoading=true;
 cropDisplayDismissed=false;$('frameOptions').open=false;const f=roll[i];activeFrame=i;state={...defaultState(),...f.settings};cropRegion=f.crop?CE.rect(f.crop):{x:0,y:0,w:1,h:1};syncControls();
 src=null;hires=null;previewSrc=null;working=null;workingPreview=null;calibration=null;legacyLevels=null;beta3Base=null;beta3Levels=null;zoom=1;panX=0;panY=0;applyView();
 try{(typeof requestAnimationFrame==='function'?await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))):null);await readFile(f.file);if(!working)throw Error('Ingen bild avkodades.');$('qualityInfo').textContent=sourceInfo.label+' · samma färgkedja i förhandsvisning och export';saveCurrentFrame();}
 catch(e){src=null;hires=null;previewSrc=null;working=null;workingPreview=null;$('preview').classList.add('hidden');$('cropOverlay').classList.add('hidden');for(const id of ['export','exportTiff'])$(id).disabled=true;setStatus('Importfel: '+e.message);}
 finally{rollLoading=false;refreshRollUI();if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{if(loadId===frameLoadSequence)setFrameLoading(false);});else if(loadId===frameLoadSequence)setFrameLoading(false);}
};

$('frameOptions').addEventListener('toggle',()=>{if($('frameOptions').open)cropDisplayDismissed=false;drawCrop();});
function updateCropUI(){$('cropStatus').textContent=(state.cropMethod==='manual'?'Manuell filmruta':'Automatisk filmruta')+(state.cropConfirmed?' · bekräftad':' · osäker, kontrollera rektangeln');$('cropConfirm').hidden=!!state.cropConfirmed&&cropDisplayDismissed;$('cropLock').textContent=state.cropLocked?'Lås upp filmruta':'Lås filmruta';$('cropVisible').checked=state.cropVisible!==false;$('cropExport').checked=!!state.cropExport;drawCrop();}
function cropChanged(method='manual'){state.cropMethod=method;state.cropConfirmed=method==='manual';saveCrop();updateCropUI();updateBase();analyzeLevels();scheduleRender(true);}
setCropByInset=function(v){if(state.cropLocked)return;const n=Number(v)/100;cropRegion={x:n,y:n,w:1-2*n,h:1-2*n};updateCropLabel();cropChanged();};
$('cropAuto').onclick=()=>{if(!workingPreview||cropDrag)return;if(state.cropLocked){setStatus('Lås upp filmrutan före automatisk detektering.');return;}const d=CE.detectFrame(workingPreview);cropRegion=d.region;state.cropConfidence=d.confidence;state.cropConfirmed=d.confidence>=.7;state.cropMethod='auto';saveCrop();updateCropUI();updateBase();analyzeLevels();};
$('cropReset').onclick=()=>{if(cropDrag)return;if(state.cropLocked){setStatus('Lås upp filmrutan före återställning.');return;}cropRegion={x:0,y:0,w:1,h:1};cropChanged();};
$('cropConfirm').onclick=()=>{cropDisplayDismissed=true;state.cropConfirmed=true;$('frameOptions').open=false;updateCropUI();saveCurrentFrame();render();};
$('cropLock').onclick=()=>{state.cropLocked=!state.cropLocked;updateCropUI();saveCurrentFrame();};
$('cropVisible').onchange=e=>{state.cropVisible=e.target.checked;drawCrop();saveCurrentFrame();};
$('cropExport').onchange=e=>setLegacyCropExport(e.target.checked);
// One image-to-screen transform for canvas, overlay and inverse pointer mapping.
function frameView(){
 const box=$('picture'),w=workingPreview.width,h=workingPreview.height;
 const angle=(state.rotation||0)*Math.PI/180,c=Math.cos(angle),sn=Math.sin(angle);
 const fit=Math.min(box.clientWidth/(Math.abs(w*c)+Math.abs(h*sn)),box.clientHeight/(Math.abs(w*sn)+Math.abs(h*c)));
 return {w,h,fit,c,sn};
}
function imagePoint(e){
 const box=$('picture'),b=box.getBoundingClientRect(),v=frameView();
 const dx=(e.clientX-b.left)*box.clientWidth/b.width-box.clientWidth/2-panX;
 const dy=(e.clientY-b.top)*box.clientHeight/b.height-box.clientHeight/2-panY;
 return {x:(dx*v.c+dy*v.sn)/(v.fit*zoom*v.w)+.5,y:(-dx*v.sn+dy*v.c)/(v.fit*zoom*v.h)+.5};
}
function drawCrop(){
 const svg=$('cropOverlay');if(!workingPreview||!src){svg.classList.add('hidden');return;}
 const {w,h,fit} = frameView(),canvas=$('preview');
 const transform=`translate(-50%, -50%) translate(${panX}px,${panY}px) scale(${zoom}) rotate(${state.rotation||0}deg)`;
 canvas.style.setProperty('width',w*fit+'px','important');canvas.style.setProperty('height',h*fit+'px','important');
 canvas.style.transform=transform;
 svg.classList.toggle('hidden',state.cropVisible===false||cropDisplayDismissed);
 svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
 svg.style.width=w*fit+'px';svg.style.height=h*fit+'px';svg.style.left='50%';svg.style.top='50%';svg.style.transform=transform;
 const r=cropRegion,x=r.x*w,y=r.y*h,rw=r.w*w,rh=r.h*h;
 $('cropRect').setAttribute('x',x);$('cropRect').setAttribute('y',y);$('cropRect').setAttribute('width',rw);$('cropRect').setAttribute('height',rh);
 const sides={left:[x,y,x,y+rh],right:[x+rw,y,x+rw,y+rh],top:[x,y,x+rw,y],bottom:[x,y+rh,x+rw,y+rh]};
 for(const [name,v] of Object.entries(sides)){const el=$('crop-'+name);['x1','y1','x2','y2'].forEach((a,i)=>el.setAttribute(a,v[i]));el.style.pointerEvents=state.cropLocked||sampleMode?'none':'stroke';}
 svg.style.pointerEvents='none';
}
function finishCropDrag(e){
 if(!cropDrag||e.pointerId!==cropDrag.pointerId)return;
 e.stopImmediatePropagation();const id=cropDrag.pointerId;cropDrag=null;
 const picture=$('picture');if(picture.hasPointerCapture(id))picture.releasePointerCapture(id);
 // Cancellation/lost capture keeps the last user-selected coordinates too.
 cropChanged();
}
$('picture').addEventListener('pointerdown',e=>{
 const side=e.target.dataset?.side;
 if(!['left','right','top','bottom'].includes(side)||state.cropLocked||sampleMode||!workingPreview||cropDrag||rollLoading||exportBusy)return;
 e.preventDefault();e.stopImmediatePropagation();dragPoint=null;
 const p=imagePoint(e),r=cropRegion,edge=side==='left'?r.x:side==='right'?r.x+r.w:side==='top'?r.y:r.y+r.h;
 cropDrag={side,pointerId:e.pointerId,offset:(side==='left'||side==='right'?p.x:p.y)-edge};
 state.cropMethod='manual';state.cropConfirmed=true;saveCurrentFrame();updateCropUI();
 $('picture').setPointerCapture(e.pointerId);
},true);
$('picture').addEventListener('pointermove',e=>{
 if(!cropDrag||e.pointerId!==cropDrag.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 const p=imagePoint(e),r={...cropRegion},right=r.x+r.w,bottom=r.y+r.h;
 const minW=Math.min(r.w,1/working.width),minH=Math.min(r.h,1/working.height);
 if(cropDrag.side==='left'){r.x=CE.clamp(p.x-cropDrag.offset,0,right-minW);r.w=right-r.x;}
 if(cropDrag.side==='right')r.w=CE.clamp(p.x-cropDrag.offset-r.x,minW,1-r.x);
 if(cropDrag.side==='top'){r.y=CE.clamp(p.y-cropDrag.offset,0,bottom-minH);r.h=bottom-r.y;}
 if(cropDrag.side==='bottom')r.h=CE.clamp(p.y-cropDrag.offset-r.y,minH,1-r.y);
 cropRegion=r;saveCurrentFrame();updateCropUI();
},true);
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('picture').addEventListener(type,finishCropDrag,true);
const applyViewOriginal=applyView;applyView=function(){applyViewOriginal();drawCrop();};
if(typeof ResizeObserver!=='undefined')new ResizeObserver(drawCrop).observe($('picture'));
$('preview').addEventListener('click',e=>{if(!sampleMode||!working)return;e.stopImmediatePropagation();try{const p=imagePoint(e);if(p.x<0||p.x>1||p.y<0||p.y>1)throw Error('Välj ett prov i bilden.');state.manualCalibration={...CE.sampleBase(working,p.x,p.y),sourceEncoding:sourceInfo.encoding,sourceDomain:sourceInfo.domain};state.manualBase=state.manualCalibration.measured.map(v=>Math.round((sourceInfo.encoding==='linear'?v:CE.encode(v))*255));state.auto=false;state.noBase=false;state.useRollBase=false;sampleMode=false;$('sample').textContent='Välj filmbas med pipett';syncControls();updateBase();analyzeLevels();persist();render();}catch(err){setStatus(err.message);}},true);
$('sample').onclick=()=>{sampleMode=!sampleMode;$('sample').textContent=sampleMode?'Tryck på oexponerad filmkant…':'Välj filmbas med pipett';drawCrop();setStatus(sampleMode?'Välj synlig oexponerad filmkant. Prov tas från källvärden, även i positivvisning.':'Pipetten avbruten.');};
$('recalc').onclick=()=>{state.manualCalibration=null;state.manualBase=null;state.useRollBase=false;state.auto=true;state.noBase=false;syncControls();updateBase();analyzeLevels();render();};
$('auto').onchange=()=>{state.auto=$('auto').checked;if(state.auto){state.manualCalibration=null;state.manualBase=null;state.useRollBase=false;}updateBase();analyzeLevels();render();};
$('shareBase').onclick=()=>{if(!calibration||calibration.base.kind==='fallback'){setStatus('Mät en säker filmkant med pipetten innan den delas.');return;}sharedBase={...calibration.base,sourceEncoding:sourceInfo.encoding,sourceDomain:sourceInfo.domain,kind:'manual'};state.useRollBase=true;analyzeLevels();};
$('useRollBase').onchange=e=>{if(e.target.checked&&(sharedBase?.sourceEncoding!==sourceInfo.encoding||(sourceInfo.domain&&sharedBase?.sourceDomain!==sourceInfo.domain&&!(!sharedBase?.sourceDomain&&sourceInfo.rawMode4==='reference')))){e.target.checked=false;setStatus('Gemensam filmbas kräver samma källkodning och avfotograferingsinställningar.');return;}state.useRollBase=e.target.checked;analyzeLevels();};
$('clearRollBase').onclick=()=>{sharedBase=null;for(const f of roll)f.settings.useRollBase=false;state.useRollBase=false;if(working)analyzeLevels();else updateCalibrationUI();};
$('engineMode').onchange=e=>{state.engine=e.target.value;updateCalibrationUI();saveCurrentFrame();render();setStatus(state.engine==='beta3'?'Beta 3 · Beta 1-färg med filmruteberoende kalibrering (utvärdering)':state.engine==='beta2'?'Beta 2 · tidigare densitetsmotor (utvärdering)':'Beta 1 · tidigare färgmotor');};
$('tiffEncoding').onchange=async e=>{state.tiffEncoding=e.target.value;saveCurrentFrame();if(activeFrame>=0&&/\.tiff?$/i.test(roll[activeFrame].file.name))await chooseFrame(activeFrame,{force:true});};
$('clearReference').onclick=()=>{sharedLight=null;referenceGains=[1,1,1];referenceAvailable=false;if(working)analyzeLevels();else updateCalibrationUI();};
function exportReady(){return !exportBusy&&!rollLoading&&!!working;}
// Safari (especially iOS) may return null from canvas.toBlob when the canvas
// exceeds its pixel/side budget. Render directly at the selected JPEG size;
// never allocate a full-resolution RGBA buffer merely to shrink it afterwards.
async function makeSafeJpegExportCanvas(maxPixels=12000000,snapshot){
 const {im,g,pixels}=snapshot;
 if(!Number.isSafeInteger(g.width*g.height)||g.width<1||g.height<1)throw Error('Ogiltig exportstorlek.');
 const factor=Math.min(1,(maxPixels>12000000?16384:8192)/g.width,(maxPixels>12000000?16384:8192)/g.height,Math.sqrt(maxPixels/(g.width*g.height)));
 const w=Math.max(1,Math.floor(g.width*factor)),h=Math.max(1,Math.floor(g.height*factor));
 const c=document.createElement('canvas');
 try{c.width=w;c.height=h;
 const cx=c.getContext('2d',{colorSpace:'srgb'});
 if(!cx)throw Error('Kunde inte skapa JPEG-canvas.');
 // Drawing in strips avoids allocating an additional full-frame ImageData.
 for(let y0=0;y0<h;){
  const rows=NSPresentation.rows(im,g,{width:w,height:h},h-y0),out=cx.createImageData(w,rows);
  NSPresentation.rgba(im,pixels,g,{width:w,height:h},y0,rows,false,out.data);
  cx.putImageData(out,0,y0);y0+=rows;
  await new Promise(r=>setTimeout(r,0));
 }
 return {canvas:c,width:w,height:h,originalWidth:g.width,originalHeight:g.height};
 }catch(e){c.width=0;c.height=0;throw e;}
}
jpegBytes=async function(skipBusyCheck=false){
 if(!(skipBusyCheck ? (!rollLoading&&working) : exportReady()))throw Error('Ingen exportklar bild finns.');
 const im=working,opts={...state},config=configuration38(opts);
 const snapshot={im,g:exportGeometrySnapshot(im,opts).g,pixels:NSPixelKernel.prepare(im,config)};
 let lastError=null;
 for(const budget of (state.jpegSize==='safe'?[12000000,6000000,3000000]:[Math.min(60000000,Number(navigator.deviceMemory)<4?24000000:40000000),12000000,6000000,3000000])){
  let result;
  try{
   result=await makeSafeJpegExportCanvas(budget,snapshot);
   const blob=await new Promise((resolve,reject)=>{
    try{result.canvas.toBlob(resolve,'image/jpeg',.94);}catch(e){reject(e);}
   });
   if(blob&&blob.type==='image/jpeg'&&blob.size>0){
    jpegExportInfo={width:result.width,height:result.height,originalWidth:result.originalWidth,originalHeight:result.originalHeight};
    return new Uint8Array(await blob.arrayBuffer());
   }
   lastError=new Error('Webbläsaren kunde inte JPEG-koda '+result.width+'×'+result.height+'.');
  }catch(e){lastError=e;}
  finally{if(result){result.canvas.width=0;result.canvas.height=0;}}
 }
 throw new Error('JPEG-kodning misslyckades även vid reducerad storlek: '+(lastError?.message||'okänt fel'));
};
let jpegExportInfo=null;
$('export').onclick=async()=>{
 if(!exportReady())return;
 exportBusy=true;$('export').disabled=true;
 try{
  const bytes=await jpegBytes(true);
  downloadBlob(new Blob([bytes],{type:'image/jpeg'}),exportName(null,'jpg','negative-studio-positive.jpg'));
  const info=jpegExportInfo;
  setStatus('JPEG exporterad · sRGB · '+info.width+'×'+info.height+(info.width!==info.originalWidth||info.height!==info.originalHeight?' · anpassad storlek för webbläsaren':''));
 }catch(e){setStatus('Exportfel: '+e.message);}
 finally{exportBusy=false;$('export').disabled=false;}
};



$('clearQueue').addEventListener('click',()=>{frameLoadSequence++;setFrameLoading(false);});
