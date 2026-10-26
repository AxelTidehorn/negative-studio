/* Beta 4 workflow prototypes. Original source and analysis stay independent of loupe. */
'use strict';
let sharedFlatField=null,flatFieldBusy=false,flatFieldRead=0;
const sourceBeforeNext=workingSource;
function captureDomainNext(){return sourceInfo.captureDomain||sourceInfo.domain||sourceInfo.encoding+':'+sourceInfo.label;}
workingSource=function(){
 const im=sourceBeforeNext(),domain=captureDomainNext();if(!sourceInfo.captureDomain){sourceInfo.uncorrectedDomain=sourceInfo.domain;sourceInfo.captureDomain=domain;}sourceInfo.domain=sourceInfo.uncorrectedDomain;
 if(state.useFlatField&&NSFlatField.valid(sharedFlatField)&&sharedFlatField.signature===NSFlatField.signature(im,domain)){
  im.flatField=sharedFlatField;sourceInfo.domain=domain+'|'+sharedFlatField.id;
 }
 return im;
};
function nextControls(){
 $('jpegSize').value=state.jpegSize==='safe'?'safe':'original';$('useFlatField').checked=!!state.useFlatField;
 $('useFlatField').disabled=!sharedFlatField||!working||flatFieldBusy||rollLoading||exportBusy;
 $('flatFieldFile').disabled=flatFieldBusy||rollLoading||exportBusy;$('clearFlatField').disabled=flatFieldBusy||rollLoading||exportBusy;
 if(sharedFlatField)$('flatFieldStatus').textContent=(working?.flatField?'Korrigering aktiv':state.useFlatField?'Pausad · referensen kräver samma kamera, format och bildmått':'Referens redo')+' · '+sharedFlatField.name;
 else $('flatFieldStatus').textContent='Ingen referens. Fotografera ljuskällan utan film med samma kamera, utsnitt och inställningar.';
 $('originalDetail').disabled=!working;
}
const uiBeforeNext=updateCalibrationUI;updateCalibrationUI=function(){uiBeforeNext();nextControls();};
function rebuildFlatNext(){state.response4=null;state.useRollResponse4=false;state.manualCalibration=null;state.manualBase=null;state.useRollBase=false;state.auto=true;saveCurrentFrame();finishImport('Belysningskorrigeringen uppdaterad');persist();nextControls();}
$('jpegSize').onchange=e=>{state.jpegSize=e.target.value==='safe'?'safe':'original';saveCurrentFrame();persist();};
$('useFlatField').onchange=e=>{if(exportBusy||rollLoading||flatFieldBusy)return nextControls();state.useFlatField=!!e.target.checked;rebuildFlatNext();};
$('clearFlatField').onclick=()=>{if(exportBusy||rollLoading||flatFieldBusy)return;sharedFlatField=null;state.useFlatField=false;if(working)rebuildFlatNext();nextControls();};
$('flatFieldFile').accept=NSFileFormats.accept;
async function readFlatNext(file){
 if(NSFileFormats.isRaw(file)){const r=await NSRawDecoder.decode(file,state.rawMode4);if(r.im.inputDiagnostics4?.clipped.some(n=>n/r.im.inputDiagnostics4.pixels>.002))throw Error('RAW-referensen innehåller klippta källkanaler. Sänk exponeringen.');return {im:{width:r.im.width,height:r.im.height,channels:3,data:r.im.data,scale:r.im.scale||65535,colorSpace:r.im.colorSpace||'srgb',encoding:'linear'},domain:'raw-'+(r.im.rawMode4||'reference')+':'+(r.meta?.camera_model||'unknown')};}
 if(NSFileFormats.kind(file)==='tiff'){
  const decoded=await NSTiff.decode(await file.arrayBuffer());
  // Snapshot only after asynchronous decoding: a different image may now be
  // active. The temporary metadata substitution itself contains no await.
  const saved=sourceInfo;try{const raw=prepareTiff(decoded);return {im:{...raw,scale:65535,encoding:sourceInfo.encoding,colorSpace:'srgb'},domain:captureDomainNext()};}finally{sourceInfo=saved;}
 }
 if(NSFileFormats.kind(file)!=='browser')throw Error(NSFileFormats.error(file));
 const bitmap=await createImageBitmap(file);const c=document.createElement('canvas');try{c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d',{colorSpace:'srgb'});ctx.drawImage(bitmap,0,0);const p=ctx.getImageData(0,0,c.width,c.height);return {im:{...p,width:p.width,height:p.height,data:p.data,channels:4,scale:255,encoding:'srgb'},domain:'srgb:8 bit · sRGB via webbläsarens färghantering'};}finally{bitmap.close();c.width=c.height=0;}
}
$('flatFieldFile').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;if(!working||exportBusy||rollLoading||flatFieldBusy){e.target.value='';return;}
 const source=working,mode=state.rawMode4,request=++flatFieldRead;flatFieldBusy=true;nextControls();
 try{const {im,domain}=await readFlatNext(file);if(request!==flatFieldRead||working!==source||state.rawMode4!==mode)throw Error('Bilden ändrades under inläsningen. Välj referensen igen.');
  const f=NSFlatField.build(im,domain,file.name);if(f.signature!==NSFlatField.signature(working,captureDomainNext()))throw Error('Referensen måste ha samma kamera, RAW-import, färgkodning och bildmått.');
  sharedFlatField=f;state.useFlatField=true;rebuildFlatNext();
 }catch(err){setStatus('Belysningsreferens: '+err.message);}finally{flatFieldBusy=false;e.target.value='';nextControls();}
};
// A dedicated loupe samples the original, without changing crop or analysis.
let detailOpen=false,detailAt={x:.5,y:.5},detailSource=null,detailROI=null,detailVersion=-1,detailTimer=null,detailScale=1,detailGPU=null,detailFrame=null;
const detailPanel=document.createElement('section');detailPanel.id='originalDetailPanel';detailPanel.hidden=true;detailPanel.setAttribute('aria-label','Originaldetalj');
detailPanel.innerHTML='<div class="toolrow"><strong id="detailTitle">Originaldetalj · 100 %</strong><button class="btn" id="detailScale">200 %</button><button class="btn" id="detailClose">Stäng</button></div><p class="hint">En originalpixel per CSS-pixel vid 100 %. Välj plats med pilknapparna eller klicka i huvudbilden. Visas före rotation.</p><div class="detail-scroll"><canvas id="detailCanvas"></canvas></div><p class="hint" id="detailPosition"></p><div class="toolrow"><button class="btn" id="detailLeft" aria-label="Detalj åt vänster">←</button><button class="btn" id="detailUp" aria-label="Detalj uppåt">↑</button><button class="btn" id="detailDown" aria-label="Detalj nedåt">↓</button><button class="btn" id="detailRight" aria-label="Detalj åt höger">→</button></div>';
document.body.appendChild(detailPanel);
function closeDetailNext(){detailOpen=false;detailPanel.hidden=true;clearTimeout(detailTimer);cancelAnimationFrame(detailFrame);detailFrame=null;detailROI=null;detailSource=null;detailVersion=-1;if(detailGPU){detailGPU.destroy();detailGPU=null;}const c=$('detailCanvas');c.width=c.height=1;}
function detailCanvasNext(){const old=$('detailCanvas'),c=document.createElement('canvas');c.id='detailCanvas';old.replaceWith(c);return c;}
function drawDetailNext(){
 if(!detailOpen||!working)return;
 const version=sourceVersion38;
 if(detailSource!==working||detailVersion!==version||!detailROI){detailROI=NSFlatField.region(working,detailAt.x,detailAt.y,320);detailSource=working;detailVersion=version;}
 const c=configuration38();let canvas=$('detailCanvas'),usedGPU=false;
 if(NSGpuPreview.supports(c)){try{if(!detailGPU){canvas=detailCanvasNext();detailGPU=NSGpuPreview.create(canvas);detailGPU.validate(c);}detailGPU.draw(detailROI,c,display,320,version);usedGPU=true;}catch{if(detailGPU)detailGPU.destroy();detailGPU=null;canvas=detailCanvasNext();}}
 if(!usedGPU){if(detailGPU){detailGPU.destroy();detailGPU=null;canvas=detailCanvasNext();}const r=NSPixelKernel.render(detailROI,c,display,320),ctx=canvas.getContext('2d');canvas.width=r.width;canvas.height=r.height;ctx.putImageData(new ImageData(r.data,r.width,r.height),0,0);}
 canvas.style.width=detailROI.width*detailScale+'px';canvas.style.height=detailROI.height*detailScale+'px';
 $('detailTitle').textContent='Originaldetalj · '+detailScale*100+' %';$('detailScale').textContent=detailScale===1?'200 %':'100 %';
 $('detailPosition').textContent=`Original ${working.width}×${working.height} · x ${detailROI.x0}, y ${detailROI.y0} · ${detailROI.width}×${detailROI.height} pixlar`;
}
function queueDetailNext(){if(!detailOpen)return;clearTimeout(detailTimer);detailTimer=setTimeout(()=>{detailFrame=requestAnimationFrame(()=>{detailFrame=null;drawDetailNext();});},100);}
$('originalDetail').onclick=()=>{if(!working)return;detailOpen=true;detailPanel.hidden=false;drawDetailNext();};$('detailClose').onclick=closeDetailNext;
$('detailScale').onclick=()=>{detailScale=detailScale===1?2:1;drawDetailNext();};
for(const [id,dx,dy] of [['detailLeft',-1,0],['detailRight',1,0],['detailUp',0,-1],['detailDown',0,1]])$(id).onclick=()=>{if(!working)return;detailAt.x=CE.clamp(detailAt.x+dx*160/working.width);detailAt.y=CE.clamp(detailAt.y+dy*160/working.height);detailROI=null;drawDetailNext();};
$('picture').addEventListener('click',e=>{if(!detailOpen||!working||sampleMode||neutralSample39||neutralPair4)return;const p=imagePoint(e);if(p.x<0||p.y<0||p.x>1||p.y>1)return;detailAt=p;detailROI=null;drawDetailNext();});
const renderBeforeNext=render;render=function(...args){const r=renderBeforeNext(...args);queueDetailNext();return r;};
const scheduleBeforeNext=scheduleRender;scheduleRender=function(...args){const r=scheduleBeforeNext(...args);queueDetailNext();return r;};
const chooseBeforeNext=chooseFrame;chooseFrame=async function(...args){if(!exportBusy&&!rollLoading)closeDetailNext();const r=await chooseBeforeNext(...args);nextControls();return r;};
const clearBeforeNext=$('clearQueue').onclick;$('clearQueue').onclick=()=>{closeDetailNext();++flatFieldRead;const r=clearBeforeNext();nextControls();return r;};
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetailNext();});
const css=document.createElement('style');css.textContent='#originalDetailPanel{position:fixed;z-index:80;right:16px;bottom:16px;width:360px;max-width:calc(100vw - 32px);max-height:85vh;overflow:auto;padding:16px;background:var(--ns-panel,#172326);border:1px solid #697573;border-radius:12px;box-shadow:0 12px 48px #0009}#originalDetailPanel[hidden]{display:none}.detail-scroll{max-width:100%;overflow:auto;max-height:45vh;background:#111}#detailCanvas{display:block;image-rendering:pixelated}.flat-field-tools{border:1px solid #596463;border-radius:6px;margin:12px 0;padding:10px}.flat-field-tools input[type=file]{max-width:100%}';document.head.appendChild(css);
nextControls();

const engineNext=$('engineMode').onchange;
$('engineMode').onchange=e=>{if(sourceInfo.colorSpace==='rec2020'&&e.target.value!=='calibrated4'){e.target.value='calibrated4';setStatus('Rec.2020-experimentet kräver Standardmotorn. Välj en annan RAW-import för jämförelsemotorn.');return;}return engineNext(e);};
const rawNext=$('rawMode4').onchange;
$('rawMode4').onchange=async e=>{if(e.target.value==='wide'&&!exportBusy&&!rollLoading){state.engine='calibrated4';$('engineMode').value='calibrated4';}return rawNext(e);};
// Use the same decoder and color domain for the scalar light reference.
async function decodeLightFile(file){const {im,domain}=await readFlatNext(file);return {...im,domain};}
$('referenceFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;if(exportBusy||rollLoading||flatFieldBusy){e.target.value='';return;}const source=working,mode=state.rawMode4;try{const im=await decodeLightFile(file);if(working!==source||state.rawMode4!==mode)throw Error('Bilden ändrades under inläsningen.');const samples=CE.sample(im,{x:.1,y:.1,w:.8,h:.8},0,12000),med=[0,1,2].map(k=>CE.quantile(samples.map(p=>p[k]),.5));if(med.some(v=>v<.005||v>.98))throw Error('Referensen är för mörk eller klippt.');const center=med.reduce((s,v)=>s+v,0)/3;sharedLight={name:file.name,encoding:im.encoding,domain:im.domain,gains:med.map(v=>center/v)};referenceAvailable=true;if(working)analyzeLevels();else updateCalibrationUI();}catch(err){setStatus('Ljuskällereferens: '+err.message);}finally{e.target.value='';}};

const resetNext=$('reset').onclick;
$('reset').onclick=()=>{if(exportBusy||rollLoading||flatFieldBusy)return;const corrected=!!working?.flatField,rawMode=state.rawMode4;resetNext();state.rawMode4=rawMode;if(corrected)rebuildFlatNext();else{controls4();saveCurrentFrame();persist();}nextControls();};
