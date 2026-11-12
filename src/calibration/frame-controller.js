/* Source import, film-frame interaction and source-coordinate tools. */
'use strict';
const CE=NSColorEngine;
let cropDisplayDismissed=false,working=null,workingPreview=null,calibration=null,sourceInfo={encoding:'srgb',label:'sRGB (webbläsare)'},sharedBase=null,sharedLight=null,sharedFlatField=null,cropDrag=null,exportBusy=false;
function workingSource(){if(hires)return {width:hires.width,height:hires.height,channels:hires.channels,data:hires.data,bits:hires.bits||16,inputDiagnostics4:sourceInfo.diagnostics4,scale:hires.scale||65535,colorSpace:hires.colorSpace||'srgb',encoding:hires.encoding||sourceInfo.encoding,profile:hires.profile,normalization:hires.normalization||1};return {width:src.width,height:src.height,channels:4,data:src.data,scale:255,encoding:'srgb'};}
function sourcePixel(im,x,y){return CE.pixel(im,x,y);}
function calibrationBase(){
 if(state.filmBaseVersion===2&&working){const p=effectiveProposal2(),a=accepted2();return p?p.measurement:a?.measurement||null;}
 const b=state.useRollBase&&sharedBase?sharedBase:state.manualCalibration;return b&&(!b.sourceEncoding||b.sourceEncoding===sourceInfo.encoding)&&(!sourceInfo.domain||b.sourceDomain===sourceInfo.domain)?b:null;
}
function lightCompatible(){return !!sharedLight&&sharedLight.encoding===sourceInfo.encoding&&(!sourceInfo.domain||sharedLight.domain===sourceInfo.domain);}
function currentLight(){return lightCompatible()?sharedLight.gains:[1,1,1];}

function updateCalibrationUI(){syncEngineSelector();$('referenceStatus').textContent=sharedLight?(lightCompatible()?'Gemensam ljuskälla aktiv · ':'Ljuskälla pausad: annan källkodning · ')+sharedLight.name:'Ingen ljuskällereferens';$('rollBaseStatus').textContent=sharedBase?'Gemensam filmbas tillgänglig · '+sharedBase.sourceEncoding:'Ingen gemensam filmbas';$('useRollBase').checked=!!state.useRollBase;$('useRollBase').disabled=!sharedBase;$('sourceStatus').textContent=sourceInfo.label;$('engineMode').value=state.engine;if(typeof updateBasePanel2==='function')updateBasePanel2();}
finishImport=function(message){
 resetBaseSession();cropDisplayDismissed=false;sourceVersion38++;lastPreview38=null;config38=null;
 working=workingSource();workingPreview=state.engine==='v2'?NSV2Platform.preview(working):CE.preview(working,1400,state.previewSampling);
 $('preview').width=workingPreview.width;$('preview').height=workingPreview.height;$('preview').classList.remove('hidden');$('empty').classList.add('hidden');
 for(const id of ['export','sample','recalc','analyzeLevels'])$(id).disabled=false;
 sampleMode=false;
 const f=roll[activeFrame];
 if(NSFrameSelection.valid(state.frame)&&state.frame.locked)state.frame={...state.frame,sourceDimensions:{width:working.width,height:working.height}};
 else if(!NSFrameSelection.matches(state.frame,working)){const d=CE.detectFrame(workingPreview);applyFrameSelection(NSFrameSelection.detected({...d,sourceDimensions:{width:working.width,height:working.height}},working));}
 $('cropInset').value=1;updateCropUI();analyzeLevels();render();setStatus(message+((state.frame?.status!=='pending'&&!!state.frame)?'':' · Filmrutan är osäker – kontrollera och bekräfta bildytan.')+(f&&!NSFileFormats.isRaw(f.file.name)&&state.engine==='calibrated4'&&!NSV2Platform.validSource(working)?' · Standard: V2 kräver RAW eller verifierad linjär Rec.2020-TIFF.':''));
};
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
chooseFrame=async function(i,{force=false,full=false}={}){
 if(i<0||i>=roll.length||rollLoading||exportBusy||cropDrag||(!force&&i===activeFrame&&working))return;
 resetImageSession();
 const loadId=++frameLoadSequence,frame=roll[i],fields=['settings','geometry','sourceMetadata','thumb','thumbPositive'];
 setFrameLoading(true,roll[i].file.name);
 saveCurrentFrame();
 const saved=NSProjectSettings.clone(Object.fromEntries(fields.filter(k=>Object.hasOwn(frame,k)).map(k=>[k,frame[k]])));
 rollLoading=true;
 cropDisplayDismissed=false;$('frameOptions').open=false;const f=roll[i];activeFrame=i;state={...defaultState(),...f.settings};syncControls();
 src=null;hires=null;working=null;workingPreview=null;calibration=null;zoom=1;panX=0;panY=0;applyView();
 try{(typeof requestAnimationFrame==='function'?await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))):null);await readFile(f.file,{isCurrent:()=>loadId===frameLoadSequence,force:full});if(loadId!==frameLoadSequence)return false;if(!working)throw Error('Ingen bild avkodades.');$('qualityInfo').textContent=sourceInfo.label+' · samma färgkedja i förhandsvisning och export';saveCurrentFrame();return true;}
 catch(e){if(loadId!==frameLoadSequence)return false;for(const key of fields)delete frame[key];Object.assign(frame,saved);src=null;hires=null;working=null;workingPreview=null;calibration=null;stopPreviewWork();$('empty').classList.remove('hidden');$('gpuPreview')?.classList.add('hidden');$('preview').classList.add('hidden');$('cropOverlay').classList.add('hidden');for(const id of ['export'])$(id).disabled=true;setStatus('Importfel: '+e.message);return false;}
 finally{if(loadId===frameLoadSequence){rollLoading=false;controls4();if(typeof nextControls==='function')nextControls();updateBasePanel2();$('neutralSample').disabled=!working;$('base2Session').value=state.captureSession2||'';refreshRollUI();if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{if(loadId===frameLoadSequence)setFrameLoading(false);});else if(loadId===frameLoadSequence)setFrameLoading(false);}}
};

$('frameOptions').addEventListener('toggle',()=>{if($('frameOptions').open)cropDisplayDismissed=false;drawCrop();});
function applyFrameSelection(selection){state.frame=selection;}
function currentFrameSelection(){return state.frame;}
function updateCropUI(){$('cropStatus').textContent=(state.frame?.origin==='manual'?'Manuell filmruta':'Automatisk filmruta')+((state.frame?.status!=='pending'&&!!state.frame)?' · bekräftad':' · osäker, kontrollera rektangeln');$('cropConfirm').hidden=!!(state.frame?.status!=='pending'&&!!state.frame)&&cropDisplayDismissed;$('cropLock').textContent=state.frame?.locked?'Lås upp filmruta':'Lås filmruta';$('cropVisible').checked=state.cropVisible!==false;$('cropExport').checked=rollShared.cropExportToFrame;drawCrop();globalThis.FILMLABB_FRAME_REVIEW?.refresh();}
function cropChanged(method='manual',{keepQuad=false}={}){
 if(method==='manual'){

  const quad=keepQuad?currentFrameSelection().quad:NSFrameSelection.rectangle(frameRegion());
  const options={sourceDimensions:working?{width:working.width,height:working.height}:undefined};
  applyFrameSelection(keepQuad?NSFrameSelection.create(quad,options):NSFrameSelection.rectangular(frameRegion(),options));
 }
 saveCrop();updateCropUI();analyzeLevels();scheduleRender(true);saveCurrentFrame();setStatus('Filmrutan har ändrats. Bekräfta bildytan för automatisk analys.');globalThis.FILMLABB_FRAME_REVIEW?.openPending();
}
setCropByInset=function(v){if(state.frame?.locked)return;const n=Number(v)/100;applyFrameSelection(NSFrameSelection.rectangular({x:n,y:n,w:1-2*n,h:1-2*n}));updateCropLabel();cropChanged();};
$('cropAuto').onclick=()=>{if(!workingPreview||cropDrag)return;if(state.frame?.locked){setStatus('Lås upp filmrutan före automatisk detektering.');return;}const d=CE.detectFrame(workingPreview);applyFrameSelection(NSFrameSelection.detected({...d,sourceDimensions:{width:working.width,height:working.height}},working));saveCrop();updateCropUI();analyzeLevels();render();saveCurrentFrame();globalThis.FILMLABB_FRAME_REVIEW?.openPending();};
$('cropReset').onclick=()=>{if(cropDrag)return;if(state.frame?.locked){setStatus('Lås upp filmrutan före återställning.');return;}applyFrameSelection(NSFrameSelection.rectangular({x:0,y:0,w:1,h:1},{origin:'full'}));cropChanged();};
function confirmFrameSelection(){
 if(!working||cropDrag||rollLoading||exportBusy)return;
 const s=currentFrameSelection();applyFrameSelection({...s,status:'confirmed'},{preserveBounds:true});cropDisplayDismissed=true;
 // A confirmed detector proposal retains its quad; this records consent rather
 // than changing detector evidence/confidence or composition/export geometry.
 saveCrop();analyzeLevels();saveCurrentFrame();$('frameOptions').open=false;
 globalThis.FILMLABB_GEOMETRY?.setTool(null);updateCropUI();render();
 setStatus(s.origin==='full'?'Hela bilden har valts. Bildanalysen har uppdaterats.':'Filmrutan är bekräftad. Bildanalysen har uppdaterats.');
 if(['frameReviewConfirm','frameReviewFull','cropConfirm'].includes(document.activeElement?.id))$('frameReviewEdit')?.focus?.({preventScroll:true});
}
$('cropConfirm').onclick=confirmFrameSelection;
$('cropLock').onclick=()=>{if(state.frame)state.frame={...state.frame,locked:!state.frame.locked};updateCropUI();saveCurrentFrame();};
$('cropVisible').onchange=e=>{state.cropVisible=e.target.checked;drawCrop();saveCurrentFrame();};
$('cropExport').onchange=e=>setQueueCropExportToFrame(e.target.checked);
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
 const svg=$('cropOverlay');if(!workingPreview||!working){svg.classList.add('hidden');return;}
 const {w,h,fit} = frameView(),canvas=$('preview');
 const transform=`translate(-50%, -50%) translate(${panX}px,${panY}px) scale(${zoom}) rotate(${state.rotation||0}deg)`;
 canvas.style.setProperty('width',w*fit+'px','important');canvas.style.setProperty('height',h*fit+'px','important');
 canvas.style.transform=transform;
 svg.classList.toggle('hidden',state.cropVisible===false||cropDisplayDismissed);
 svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
 svg.style.width=w*fit+'px';svg.style.height=h*fit+'px';svg.style.left='50%';svg.style.top='50%';svg.style.transform=transform;
 const r=frameRegion(),x=r.x*w,y=r.y*h,rw=r.w*w,rh=r.h*h;
 $('cropRect').setAttribute('x',x);$('cropRect').setAttribute('y',y);$('cropRect').setAttribute('width',rw);$('cropRect').setAttribute('height',rh);
 const sides={left:[x,y,x,y+rh],right:[x+rw,y,x+rw,y+rh],top:[x,y,x+rw,y],bottom:[x,y+rh,x+rw,y+rh]};
 for(const [name,v] of Object.entries(sides)){const el=$('crop-'+name);['x1','y1','x2','y2'].forEach((a,i)=>el.setAttribute(a,v[i]));el.style.pointerEvents=state.frame?.locked||sampleMode?'none':'stroke';}
 svg.style.pointerEvents='none';
}
function finishCropDrag(e){
 if(!cropDrag||e.pointerId!==cropDrag.pointerId)return;
 e.stopImmediatePropagation();const id=cropDrag.pointerId;cropDrag=null;
 const picture=$('picture');if(picture.hasPointerCapture(id))picture.releasePointerCapture(id);
 // Cancellation/lost capture keeps the last user-selected coordinates too.
 cropChanged('manual',{keepQuad:true});
}
$('picture').addEventListener('pointerdown',e=>{
 const side=e.target.dataset?.side,corner=e.target.dataset?.frameCorner;
 if((!['left','right','top','bottom'].includes(side)&&corner===undefined)||state.frame?.locked||sampleMode||!workingPreview||cropDrag||rollLoading||exportBusy||e.isPrimary===false||(e.pointerType==='mouse'&&e.button!==0))return;
 e.preventDefault();e.stopImmediatePropagation();dragPoint=null;
 const s=currentFrameSelection(),quad=s.quad.map(p=>({...p})),p=imagePoint(e);
 // The visible polygon supplies the exact source edge index; legacy rectangle
 // handles keep their established top/right/bottom/left correspondence.
 const edge=e.target.dataset?.frameEdge===undefined?['top','right','bottom','left'].indexOf(side):Number(e.target.dataset.frameEdge);
 cropDrag={pointerId:e.pointerId,start:p,quad,corner:corner===undefined?null:Number(corner),edge};
 applyFrameSelection(NSFrameSelection.create(quad,{sourceDimensions:{width:working.width,height:working.height}}));saveCurrentFrame();updateCropUI();
 $('picture').setPointerCapture(e.pointerId);
},true);
$('picture').addEventListener('pointermove',e=>{
 if(!cropDrag||e.pointerId!==cropDrag.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 const p=imagePoint(e),d=cropDrag,W=working.width,H=working.height,quad=d.quad.map(v=>({...v}));
 let dx=p.x-d.start.x,dy=p.y-d.start.y,indices;
 if(d.corner!==null)indices=[d.corner];
 else{
  indices=[d.edge,(d.edge+1)%4];const a=quad[indices[0]],b=quad[indices[1]],nx=(b.y-a.y)*H,ny=-(b.x-a.x)*W,l2=nx*nx+ny*ny,t=(dx*W*nx+dy*H*ny)/l2;dx=t*nx/W;dy=t*ny/H;
 }
 // Clamp the translation as a unit, preserving straight sides and grab offset.
 // Stop before a corner crosses another side; no format/aspect prior is used.
 let fraction=1;
 for(const i of indices){const q=quad[i];if(dx<0)fraction=Math.min(fraction,-q.x/dx);if(dx>0)fraction=Math.min(fraction,(1-q.x)/dx);if(dy<0)fraction=Math.min(fraction,-q.y/dy);if(dy>0)fraction=Math.min(fraction,(1-q.y)/dy);}
 const at=t=>quad.map((q,i)=>indices.includes(i)?{x:CE.clamp(q.x+dx*t),y:CE.clamp(q.y+dy*t)}:{...q});
 const valid=q=>{const r=NSFrameDetector.bounds(q);return NSFrameDetector.validQuad(q)&&r.w>=1/W-1e-12&&r.h>=1/H-1e-12;};
 if(!valid(at(fraction))){let lo=0,hi=fraction;for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(valid(at(mid)))lo=mid;else hi=mid;}fraction=lo;}
 applyFrameSelection(NSFrameSelection.create(at(fraction),{sourceDimensions:{width:W,height:H}}));saveCurrentFrame();updateCropUI();
},true);
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('picture').addEventListener(type,finishCropDrag,true);
const applyViewOriginal=applyView;applyView=function(){applyViewOriginal();drawCrop();};
if(typeof ResizeObserver!=='undefined')new ResizeObserver(drawCrop).observe($('picture'));
$('preview').addEventListener('click',e=>{if(!sampleMode||!working)return;e.stopImmediatePropagation();try{const p=imagePoint(e);if(p.x<0||p.x>1||p.y<0||p.y>1)throw Error('Välj ett prov i bilden.');state.manualCalibration={...CE.sampleBase(working,p.x,p.y),sourceEncoding:sourceInfo.encoding,sourceDomain:sourceInfo.domain};state.auto=false;state.noBase=false;state.useRollBase=false;sampleMode=false;$('sample').textContent='Välj filmbas med pipett';syncControls();analyzeLevels();persist();render();}catch(err){setStatus(err.message);}},true);
$('sample').onclick=()=>{sampleMode=!sampleMode;$('sample').textContent=sampleMode?'Tryck på oexponerad filmkant…':'Välj filmbas med pipett';drawCrop();setStatus(sampleMode?'Välj synlig oexponerad filmkant. Prov tas från källvärden, även i positivvisning.':'Pipetten avbruten.');};
$('recalc').onclick=()=>{state.manualCalibration=null;state.useRollBase=false;state.auto=true;state.noBase=false;syncControls();analyzeLevels();render();};
$('auto').onchange=()=>{state.auto=$('auto').checked;if(state.auto){state.manualCalibration=null;state.useRollBase=false;}analyzeLevels();render();};
$('shareBase').onclick=()=>{if(!calibration||calibration.base.kind==='fallback'){setStatus('Mät en säker filmkant med pipetten innan den delas.');return;}sharedBase={...calibration.base,sourceEncoding:sourceInfo.encoding,sourceDomain:sourceInfo.domain,kind:'manual'};state.useRollBase=true;analyzeLevels();};
$('useRollBase').onchange=e=>{if(e.target.checked&&(sharedBase?.sourceEncoding!==sourceInfo.encoding||(sourceInfo.domain&&sharedBase?.sourceDomain!==sourceInfo.domain))){e.target.checked=false;setStatus('Gemensam filmbas kräver samma källkodning och avfotograferingsinställningar.');return;}state.useRollBase=e.target.checked;analyzeLevels();};
$('clearRollBase').onclick=()=>{sharedBase=null;for(const f of roll)f.settings.useRollBase=false;state.useRollBase=false;if(working)analyzeLevels();else updateCalibrationUI();};
$('tiffEncoding').onchange=async e=>{state.tiffEncoding=e.target.value;saveCurrentFrame();if(activeFrame>=0&&/\.tiff?$/i.test(roll[activeFrame].file.name))await chooseFrame(activeFrame,{force:true});};
$('clearReference').onclick=()=>{sharedLight=null;if(working)analyzeLevels();else updateCalibrationUI();};
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

function resetImageSession(){
 cancelPair4();neutralSample39=false;$('neutralSample').textContent='Neutralpipett';
 if(typeof closeDetailNext==='function')closeDetailNext();
 const restore=previewBase2;resetBaseSession();
 // Restore any temporary base preview before saving the outgoing image, but
 // do not repaint/re-upload a source that the preview owner just released.
 if(restore&&working)analyzeLevels({redraw:false});
 stopPreviewWork();lastPreview38=null;config38=null;
 v2LastSource=null;v2LastKey=null;v2AutomaticCache=null;
}
