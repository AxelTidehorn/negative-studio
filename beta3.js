/* Beta 2 controller. Keeps the Beta 1 developer untouched for side-by-side evaluation. */
'use strict';
const CE=NSColorEngine,legacyDevelop=develop,legacyAnalyze=analyzeLevels;
let working=null,workingPreview=null,calibration=null,legacyLevels=null,beta3Base=null,beta3Levels=null,sourceInfo={encoding:'srgb',label:'sRGB (webbläsare)'},sharedBase=null,sharedLight=null,cropDrag=null,exportBusy=false;
function workingSource(){if(hires)return {width:hires.width,height:hires.height,channels:hires.channels,data:hires.data,scale:65535,encoding:hires.encoding||sourceInfo.encoding,profile:hires.profile,normalization:hires.normalization||1};return {width:src.width,height:src.height,channels:4,data:src.data,scale:255,encoding:'srgb'};}
function sourcePixel(im,x,y){return CE.pixel(im,x,y);}
function calibrationBase(){const b=state.useRollBase&&sharedBase?sharedBase:state.manualCalibration;return b&&(!b.sourceEncoding||b.sourceEncoding===sourceInfo.encoding)&&(!sourceInfo.domain||b.sourceDomain===sourceInfo.domain||(!b.sourceDomain&&sourceInfo.rawMode4==='reference'))?b:null;}
function currentLight(){return sharedLight&&sharedLight.encoding===sourceInfo.encoding&&(!sourceInfo.domain||sharedLight.domain===sourceInfo.domain||(!sharedLight.domain&&sourceInfo.rawMode4==='reference'))?sharedLight.gains:[1,1,1];}
updateBase=function(){if(!working)return;base=state.manualBase||estimateBase(previewSrc);};
function estimateBeta3Base(){
 const legacyValue=v=>Math.round(255*(sourceInfo.encoding==='linear'?CE.clamp(v):CE.encode(v)));
 if(state.useRollBase&&sharedBase?.sourceEncoding===sourceInfo.encoding)return sharedBase.measured.map(legacyValue);
 if(!state.auto&&state.manualBase)return [...state.manualBase];
 const edge=CE.findBase(workingPreview,cropRegion);
 if(edge)return edge.measured.map(legacyValue);
 // A missing film edge is a fallback, not a measurement of clear film.
 // Sample the motif only; neither the holder nor the backlight may enter.
 const scene=CE.sample(workingPreview,cropRegion,.012,20000);
 return [0,1,2].map(c=>legacyValue(CE.quantile(scene.map(p=>p[c]),.995)));
}
analyzeLevels=function(){if(!workingPreview)return;legacyAnalyze();legacyLevels=levels;
 beta3Base=estimateBeta3Base();const previousBase=base;
 try{base=beta3Base;legacyAnalyze();beta3Levels=levels;}finally{base=previousBase;levels=legacyLevels;}
 calibration=CE.analyze(workingPreview,cropRegion,{base:calibrationBase(),light:currentLight(),noBase:state.noBase});
 $('baseInfo').textContent=calibration.base.kind==='fallback'?'Fallback · filmbas saknas. Kanalernas ljusaste motivvärden uppskattar masken; färgen är osäker.':`${state.useRollBase?'Gemensam rullreferens':calibration.base.kind==='manual'?'Manuell filmbas':'Automatisk filmkant'} · ${calibration.base.samples||'valt'} prov · ${Math.round(calibration.base.confidence*100)} % heuristisk signal`;
 $('levelsInfo').textContent=`Densitet ${calibration.lo.toFixed(3)}–${calibration.hi.toFixed(3)} · gemensamt tonomfång · ${calibration.count} prov${calibration.clipped>.005?' · Varning: klippta källvärden':''}`;
 updateCalibrationUI();saveCurrentFrame();scheduleRender();};
function updateCalibrationUI(){const compatible=sharedLight&&sharedLight.encoding===sourceInfo.encoding;$('referenceStatus').textContent=sharedLight?(compatible?'Gemensam ljuskälla aktiv · ':'Ljuskälla pausad: annan källkodning · ')+sharedLight.name:'Ingen ljuskällereferens';$('rollBaseStatus').textContent=sharedBase?'Gemensam filmbas tillgänglig · '+sharedBase.sourceEncoding:'Ingen gemensam filmbas';$('useRollBase').checked=!!state.useRollBase;$('useRollBase').disabled=!sharedBase;$('sourceStatus').textContent=sourceInfo.label;$('engineMode').value=state.engine||'legacy';$('balanceStrength').disabled=state.engine==='beta2';$('balanceStrength').title=state.engine==='beta2'?'Beta 2 använder filmbasen för färgbalans. Justera Varm/kall och Grön/magenta manuellt.':'Styr kanalbalanseringen';}
finishImport=function(message){
 working=workingSource();workingPreview=CE.preview(working);
 // The legacy engine must analyze the same normalized samples that full-size
 // export reads, rather than an independently encoded camera/TIFF thumbnail.
 previewSrc=new ImageData(workingPreview.width,workingPreview.height);
 for(let i=0;i<workingPreview.data.length;i++)previewSrc.data[Math.floor(i/3)*4+i%3]=Math.round(255*(sourceInfo.encoding==='linear'?CE.clamp(workingPreview.data[i]):CE.encode(workingPreview.data[i])));
 for(let i=3;i<previewSrc.data.length;i+=4)previewSrc.data[i]=255;
 $('preview').width=workingPreview.width;$('preview').height=workingPreview.height;$('preview').classList.remove('hidden');$('empty').classList.add('hidden');
 for(const id of ['export','exportTiff','sample','recalc','analyzeLevels'])$(id).disabled=false;
 sampleMode=false;
 const f=roll[activeFrame];if(!f?.crop){const d=CE.detectFrame(workingPreview);cropRegion=d.region;state.cropConfidence=d.confidence;state.cropMethod='auto';state.cropConfirmed=d.confidence>=.7;}
 $('cropInset').value=1;updateCropUI();updateBase();analyzeLevels();render();setStatus(message+(state.cropConfirmed?'':' · Kontrollera och bekräfta filmrutan före export.'));
};
const importRawOriginal=importRawRGB16;
importRawRGB16=async function(im,name,meta){sourceInfo={encoding:'linear',domain:'raw-'+(im.rawMode4||'reference')+':'+(meta?.camera_model||'unknown'),rawMode4:im.rawMode4||'reference',diagnostics4:im.inputDiagnostics4,label:im.rawMode4==='protected'?'Avkodad RAW · linjär sRGB · Beta 4-färgmarginal (Rec.2020 → sRGB, gemensam ½-skala)':'Avkodad RAW · 16 bit · linjär sRGB · 3.9-import'};await importRawOriginal(im,name,meta);};
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
function applyTonalZones(p,opts){
 const shadows=Number(opts.shadows)||0,highlights=Number(opts.highlights)||0;
 if(!shadows&&!highlights)return p;
 const lum=CE.clamp(.2126*p[0]+.7152*p[1]+.0722*p[2]);
 const sw=(1-CE.clamp(lum/.65))**2,hw=CE.clamp((lum-.35)/.65)**2;
 const adjustment=-(shadows/100)*sw*(1-lum)*.7+(highlights/100)*hw*lum*.7;
 return p.map(v=>CE.clamp(v+adjustment));
}
function technicalPositive(linear,opts){
 if((opts.engine||'legacy')!=='beta2'){levels=opts.engine==='beta3'&&beta3Levels?beta3Levels:legacyLevels;
  const filmBase=opts.engine==='beta3'&&beta3Base?beta3Base:base,values=linear.map(v=>(sourceInfo.encoding==='linear'?v:CE.encode(v))*255);
  return applyTonalZones(legacyDevelop(values,filmBase,opts,255),opts);}
 let p=CE.positive(linear,calibration,opts.autoLevels,opts.balanceStrength).map(CE.encode);
 const f=filmProfiles[rollShared.profile]||filmProfiles.generic,profileOut=applyEmulsion(p);p=f.type==='bw'?profileOut:p.map((v,c)=>v+(profileOut[c]-v)*rollShared.strength);p=applyPrint(p);
 const ev=2**opts.exposure,gains=f.type==='bw'?[1,1,1]:[Math.exp(opts.temperature/180+opts.tint/350),Math.exp(-opts.tint/120),Math.exp(-opts.temperature/180+opts.tint/350)];
 p=p.map((v,c)=>{v=CE.clamp((v-opts.shadow)/Math.max(.1,opts.highlight-opts.shadow));v=v**(1/Math.max(.25,opts.gamma));return CE.clamp(.5+(CE.clamp(v*ev*gains[c])-.5)*opts.contrast);});
 const l=.2126*p[0]+.7152*p[1]+.0722*p[2];return applyTonalZones(p.map(v=>CE.clamp(l+(v-l)*(f.type==='bw'?0:opts.saturation))),opts);
}
// Neutral profile and saturation 1 have independent channels. Cache the exact
// developer output for each possible 16-bit input before rendering a RAW/TIFF.
function neutralLookup(opts,im){
 if(!im||im.encoding!=='linear'||im.scale!==65535||(im.normalization||1)!==1||
    (opts.engine||'legacy')==='beta2'||rollShared.profile!=='generic'||
    rollShared.print!=='neutral'||opts.saturation!==1||opts.shadows||opts.highlights)return null;
 const table=[new Uint16Array(65536),new Uint16Array(65536),new Uint16Array(65536)];
 for(let v=0;v<65536;v++){const p=technicalPositive([v/65535,v/65535,v/65535],opts);for(let c=0;c<3;c++)table[c][v]=Math.round(p[c]*65535);}
 return table;
}
convertImage=function(image,mode,params){const im=image===previewSrc?workingPreview:working;if(!im)return new ImageData(1,1);const out=new ImageData(im.width,im.height);for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const p=sourcePixel(im,x,y),q=mode==='negative'||(mode==='split'&&x<im.width/2)?p.map(CE.encode):technicalPositive(p,params);const i=(y*im.width+x)*4;for(let c=0;c<3;c++)out.data[i+c]=Math.round(q[c]*255);out.data[i+3]=255;}return out;};
const oldRender=render;render=function(){oldRender();drawCrop();};
chooseFrame=async function(i,{force=false}={}){
 if(i<0||i>=roll.length||rollLoading||exportBusy||(!force&&i===activeFrame))return;saveCurrentFrame();rollLoading=true;
 const f=roll[i];activeFrame=i;state={...defaultState(),...f.settings};cropRegion=f.crop?CE.rect(f.crop):{x:0,y:0,w:1,h:1};syncControls();
 src=null;hires=null;previewSrc=null;working=null;workingPreview=null;calibration=null;legacyLevels=null;beta3Base=null;beta3Levels=null;zoom=1;panX=0;panY=0;applyView();
 try{await readFile(f.file);if(!working)throw Error('Ingen bild avkodades.');rawLoadedIndex=sourceInfo.encoding==='linear'?i:-1;$('qualityInfo').textContent=sourceInfo.label+' · samma färgkedja i förhandsvisning och export';saveCurrentFrame();}
 catch(e){src=null;hires=null;previewSrc=null;working=null;workingPreview=null;$('preview').classList.add('hidden');$('cropOverlay').classList.add('hidden');for(const id of ['export','exportTiff'])$(id).disabled=true;setStatus('Importfel: '+e.message);}
 finally{rollLoading=false;refreshRollUI();}
};
const saveFrameOriginal=saveCurrentFrame;saveCurrentFrame=function(){saveFrameOriginal();};
function updateCropUI(){$('cropStatus').textContent=(state.cropMethod==='manual'?'Manuell filmruta':'Automatisk filmruta')+(state.cropConfirmed?' · bekräftad':' · osäker, kontrollera rektangeln');$('cropConfirm').hidden=!!state.cropConfirmed;$('cropLock').textContent=state.cropLocked?'Lås upp filmruta':'Lås filmruta';$('cropVisible').checked=state.cropVisible!==false;$('cropExport').checked=!!state.cropExport;drawCrop();}
function cropChanged(method='manual'){state.cropMethod=method;state.cropConfirmed=method==='manual';saveCrop();updateCropUI();updateBase();analyzeLevels();scheduleRender(true);}
setCropByInset=function(v){if(state.cropLocked)return;const n=Number(v)/100;cropRegion={x:n,y:n,w:1-2*n,h:1-2*n};updateCropLabel();cropChanged();};
$('cropAuto').onclick=()=>{if(!workingPreview||state.cropLocked)return;const d=CE.detectFrame(workingPreview);cropRegion=d.region;state.cropConfidence=d.confidence;state.cropConfirmed=d.confidence>=.7;state.cropMethod='auto';saveCrop();updateCropUI();updateBase();analyzeLevels();};
$('cropReset').onclick=()=>{if(state.cropLocked)return;cropRegion={x:0,y:0,w:1,h:1};cropChanged();};
$('cropConfirm').onclick=()=>{state.cropConfirmed=true;updateCropUI();saveCurrentFrame();render();};
$('cropLock').onclick=()=>{state.cropLocked=!state.cropLocked;updateCropUI();saveCurrentFrame();};
$('cropVisible').onchange=e=>{state.cropVisible=e.target.checked;drawCrop();saveCurrentFrame();};
$('cropExport').onchange=e=>{state.cropExport=e.target.checked;saveCurrentFrame();};
function imagePoint(e){const box=$('picture').getBoundingClientRect(),w=workingPreview.width,h=workingPreview.height,s=Math.min(box.width/w,box.height/h)*zoom,angle=-(state.rotation||0)*Math.PI/180,dx=e.clientX-box.left-box.width/2-panX,dy=e.clientY-box.top-box.height/2-panY;return {x:(dx*Math.cos(angle)-dy*Math.sin(angle))/s/w+.5,y:(dx*Math.sin(angle)+dy*Math.cos(angle))/s/h+.5};}
function drawCrop(){const svg=$('cropOverlay');if(!workingPreview||!src||state.cropVisible===false){svg.classList.add('hidden');return;}svg.classList.remove('hidden');const w=workingPreview.width,h=workingPreview.height,box=$('picture'),s=Math.min(box.clientWidth/w,box.clientHeight/h);svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.style.width=w*s+'px';svg.style.height=h*s+'px';svg.style.left=(box.clientWidth-w*s)/2+'px';svg.style.top=(box.clientHeight-h*s)/2+'px';svg.style.transform=`translate(${panX}px,${panY}px) scale(${zoom}) rotate(${state.rotation||0}deg)`;
 const r=cropRegion,x=r.x*w,y=r.y*h,rw=r.w*w,rh=r.h*h;$('cropRect').setAttribute('x',x);$('cropRect').setAttribute('y',y);$('cropRect').setAttribute('width',rw);$('cropRect').setAttribute('height',rh);
 const sides={left:[x,y,x,y+rh],right:[x+rw,y,x+rw,y+rh],top:[x,y,x+rw,y],bottom:[x,y+rh,x+rw,y+rh]};for(const [name,v] of Object.entries(sides)){const el=$('crop-'+name);['x1','y1','x2','y2'].forEach((a,i)=>el.setAttribute(a,v[i]));el.style.pointerEvents=state.cropLocked||sampleMode?'none':'stroke';}svg.style.pointerEvents='none';}
$('picture').addEventListener('pointerdown',e=>{const side=e.target.dataset?.side;if(!side||state.cropLocked||sampleMode||!workingPreview)return;e.stopImmediatePropagation();cropDrag={side,initial:{...cropRegion}};$('picture').setPointerCapture(e.pointerId);},true);
$('picture').addEventListener('pointermove',e=>{if(!cropDrag)return;e.stopImmediatePropagation();const p=imagePoint(e),r={...cropRegion},right=r.x+r.w,bottom=r.y+r.h;if(cropDrag.side==='left'){r.x=CE.clamp(p.x,0,right-.03);r.w=right-r.x;}if(cropDrag.side==='right')r.w=CE.clamp(p.x-r.x,.03,1-r.x);if(cropDrag.side==='top'){r.y=CE.clamp(p.y,0,bottom-.03);r.h=bottom-r.y;}if(cropDrag.side==='bottom')r.h=CE.clamp(p.y-r.y,.03,1-r.y);cropRegion=r;state.cropConfirmed=true;state.cropMethod='manual';updateCropUI();},true);
for(const type of ['pointerup','pointercancel'])$('picture').addEventListener(type,e=>{if(!cropDrag)return;e.stopImmediatePropagation();if(type==='pointercancel')cropRegion=cropDrag.initial;cropDrag=null;cropChanged();},true);
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
function exportReady(){if(exportBusy||rollLoading||!working)return false;if(!state.cropConfirmed){setStatus('Kontrollera filmrutan och tryck Bekräfta filmruta före export.');return false;}return true;}
function makeExportCanvas(){const g=CE.exportGeometry(working,cropRegion,state.cropExport,state.rotation),c=document.createElement('canvas');c.width=g.width;c.height=g.height;const cx=c.getContext('2d',{colorSpace:'srgb'}),out=cx.createImageData(g.width,g.height),lookup=neutralLookup(state,working);for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){const [sx,sy]=g.at(x,y),i=(y*g.width+x)*4;if(lookup){const j=(sy*working.width+sx)*working.channels;for(let k=0;k<3;k++)out.data[i+k]=Math.round(lookup[k][working.data[j+k]]/257);}else{const p=technicalPositive(sourcePixel(working,sx,sy),state);for(let k=0;k<3;k++)out.data[i+k]=Math.round(p[k]*255);}out.data[i+3]=255;}cx.putImageData(out,0,0);return c;}
jpegBytes=async function(){if(!exportReady())throw Error('Filmrutan måste bekräftas före export.');const c=makeExportCanvas(),blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.94));if(!blob)throw Error('JPEG-kodning misslyckades');return new Uint8Array(await blob.arrayBuffer());};
$('export').onclick=async()=>{if(!exportReady())return;try{const bytes=await jpegBytes();downloadBlob(new Blob([bytes],{type:'image/jpeg'}),'negative-studio-positive.jpg');setStatus('JPEG exporterad · sRGB');}catch(e){setStatus('Exportfel: '+e.message);}};
function tiffHeader(w,h){const icc=NSSRGBProfile,nt=12,bitsOffset=8+2+nt*12+4,iccOffset=bitsOffset+6,pixelOffset=iccOffset+icc.length+(icc.length%2),ab=new ArrayBuffer(pixelOffset),v=new DataView(ab),tags=[[256,4,1,w],[257,4,1,h],[258,3,3,bitsOffset],[259,3,1,1],[262,3,1,2],[273,4,1,pixelOffset],[277,3,1,3],[278,4,1,h],[279,4,1,w*h*6],[284,3,1,1],[339,3,1,1],[34675,7,icc.length,iccOffset]];v.setUint16(0,0x4949,true);v.setUint16(2,42,true);v.setUint32(4,8,true);v.setUint16(8,nt,true);tags.forEach(([tag,type,n,value],i)=>{const p=10+i*12;v.setUint16(p,tag,true);v.setUint16(p+2,type,true);v.setUint32(p+4,n,true);v.setUint32(p+8,value,true);});for(let i=0;i<3;i++)v.setUint16(bitsOffset+i*2,16,true);new Uint8Array(ab).set(icc,iccOffset);return ab;}
exportTiff=async function(){if(!exportReady())return;exportBusy=true;$('exportTiff').disabled=true;try{const g=CE.exportGeometry(working,cropRegion,state.cropExport,state.rotation),parts=[tiffHeader(g.width,g.height)];if(g.width*g.height*6>=4294960000)throw Error('Bilden är för stor för klassisk TIFF.');const lookup=neutralLookup(state,working);for(let y0=0;y0<g.height;y0+=32){const rows=Math.min(32,g.height-y0),ab=new ArrayBuffer(g.width*rows*6),v=new DataView(ab);for(let dy=0;dy<rows;dy++)for(let x=0;x<g.width;x++){const [sx,sy]=g.at(x,y0+dy),i=(dy*g.width+x)*6;if(lookup){const j=(sy*working.width+sx)*working.channels;for(let k=0;k<3;k++)v.setUint16(i+k*2,lookup[k][working.data[j+k]],true);}else{const p=technicalPositive(sourcePixel(working,sx,sy),state);for(let k=0;k<3;k++)v.setUint16(i+k*2,Math.round(p[k]*65535),true);}}parts.push(ab);setStatus(`TIFF ${Math.round(100*(y0+rows)/g.height)} %`);await new Promise(r=>setTimeout(r,0));}downloadBlob(new Blob(parts,{type:'image/tiff'}),'negative-studio-positive-16bit.tif');setStatus(`TIFF 16 bit · ${g.width}×${g.height} · inbäddad sRGB-profil`);}catch(e){setStatus('Exportfel: '+e.message);}finally{exportBusy=false;$('exportTiff').disabled=false;}};
$('exportTiff').onclick=()=>exportTiff();
exportFrameTiff=async function(i){await chooseFrame(i,{force:true});if(!exportReady())throw Error('Bekräfta filmrutan för bild '+(i+1)+' före batch-export.');await exportTiff();};
$('batchTiff').onclick=async()=>{if(rollingExport||rollLoading)return;saveCurrentFrame();const ids=roll.map((f,i)=>f.selected?i:-1).filter(i=>i>=0);if(!ids.length)return;if(ids.some(i=>!roll[i].settings.cropConfirmed)){setStatus('Öppna och bekräfta varje markerad filmruta före batch-export.');return;}rollingExport=true;const old=activeFrame;try{for(const i of ids)await exportFrameTiff(i);}catch(e){setStatus('Batchfel: '+e.message);}finally{rollingExport=false;await chooseFrame(old,{force:true});}};
$('saveSettings').onclick=()=>{saveCurrentFrame();downloadBlob(new Blob([JSON.stringify({format:'negative-studio-roll-beta3',sourceCalibrationVersion:39,profile:rollShared.profile,print:rollShared.print,strength:rollShared.strength,sharedBase,sharedLight,sharedResponse4,frames:roll.map(f=>({filename:f.file.name,settings:f.settings,crop:f.crop,sourceMetadata:f.sourceMetadata||null}))},null,2)],{type:'application/json'}),'filmlabb-beta4-project.json');};
$('settingsFile').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!['negative-studio-roll-beta3','negative-studio-roll-beta2','negative-studio-roll-v08'].includes(data.format))throw Error('Okänt projektformat');rollShared.profile=filmProfiles[data.profile]?data.profile:'generic';rollShared.print=printStyles[data.print]?data.print:'neutral';rollShared.strength=CE.clamp(Number(data.strength)||0);let retiredCalibration=false;sharedBase=data.sharedBase||null;sharedLight=data.sharedLight||null;sharedResponse4=NSColorCalibration.valid(data.sharedResponse4)?data.sharedResponse4:null;if(data.sourceCalibrationVersion!==39){if(sharedBase?.sourceEncoding==='linear'){sharedBase=null;retiredCalibration=true;}if(sharedLight?.encoding==='linear'&&(!sharedLight.name||NSFileFormats.isRaw(sharedLight.name))){sharedLight=null;retiredCalibration=true;}}for(const saved of data.frames||[]){const f=roll.find(x=>x.file.name===saved.filename);if(f){const next={...defaultState(),...saved.settings};if(data.sourceCalibrationVersion!==39&&NSFileFormats.isRaw(f.file.name)){next.manualCalibration=null;next.manualBase=null;next.useRollBase=false;next.auto=true;next.sourceCalibrationVersion=39;retiredCalibration=true;}for(const [key,,min,max] of controls)next[key]=CE.clamp(Number(next[key])||0,min,max);next.engine=['legacy','beta2','beta3','reference','density38','log39','calibrated4'].includes(next.engine)?next.engine:'log39';next.rawMode4=saved.settings?.rawMode4==='protected'?'protected':'reference';next.toneMode4=next.toneMode4==='reference'?'reference':'smooth';if(!NSColorCalibration.valid(next.response4))next.response4=null;next.rotation=[0,90,180,270].includes(next.rotation)?next.rotation:0;f.settings=next;f.crop=saved.crop?CE.rect(saved.crop):null;}}$('filmProfile').value=rollShared.profile;$('printStyle').value=rollShared.print;$('profileStrength').value=rollShared.strength*100;$('profileStrengthValue').textContent=Math.round(rollShared.strength*100)+' %';refreshProfileInfo();/* Avoid writing current state over restored settings. */activeFrame=-1;await chooseFrame(0,{force:true});if(retiredCalibration)setStatus('Äldre RAW-kalibrering behöver mätas om efter den korrigerade RAW-importen.');}catch(err){setStatus('Projektimport: '+err.message);}finally{e.target.value='';}};
const clearOriginal=$('clearQueue').onclick;$('clearQueue').onclick=()=>{if(rollLoading||exportBusy)return;clearOriginal();working=null;workingPreview=null;calibration=null;beta3Base=null;beta3Levels=null;$('cropOverlay').classList.add('hidden');for(const id of ['export','exportTiff','sample','recalc'])$(id).disabled=true;};
updateCalibrationUI();
// Keep technical calibration and the frame when resetting only the photographic controls.
$('reset').onclick=()=>{for(const [id,,,,,] of controls)state[id]=defaultState()[id];syncControls();saveCurrentFrame();persist();render();};
async function decodeLightFile(file){
 if(NSFileFormats.isRaw(file)){const {im,meta}=await NSRawDecoder.decode(file,state.rawMode4);return {width:im.width,height:im.height,data:im.data,channels:3,scale:65535,encoding:'linear',domain:'raw-'+(im.rawMode4||'reference')+':'+(meta?.camera_model||'unknown'),inputDiagnostics4:im.inputDiagnostics4};}
 if(/\.tiff?$/i.test(file.name)){const im=parseTiff16(await file.arrayBuffer());if(im.icc)normalizeIccTiff(im);else im.encoding=state.tiffEncoding||'srgb';return {...im,scale:65535};}
 if(NSFileFormats.kind(file)!=='browser')throw Error(NSFileFormats.error(file));
 const bitmap=await createImageBitmap(file,{colorSpaceConversion:'default'}),c=document.createElement('canvas');c.width=128;c.height=128;const cx=c.getContext('2d',{colorSpace:'srgb',willReadFrequently:true});cx.drawImage(bitmap,0,0,128,128);bitmap.close();return {width:128,height:128,data:cx.getImageData(0,0,128,128).data,channels:4,scale:255,encoding:'srgb'};
}
$('referenceFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const im=await decodeLightFile(f),p=CE.sample(im,{x:.15,y:.15,w:.7,h:.7}),m=[0,1,2].map(k=>CE.quantile(p.map(v=>v[k]),.5));if(Math.max(...m)>.98||Math.min(...m)<.01||(im.inputDiagnostics4&&Math.max(...im.inputDiagnostics4.clipped)>im.inputDiagnostics4.pixels*.001))throw Error('Ljuskällereferensen är klippt eller för mörk.');const target=(m[0]*m[1]*m[2])**(1/3);sharedLight={name:f.name,encoding:im.encoding,domain:im.domain,gains:m.map(v=>target/v)};if(working)analyzeLevels();else updateCalibrationUI();}catch(err){setStatus('Referensfel: '+err.message);}finally{e.target.value='';}};

// Luminance histogram of actual displayed preview, not the unconverted negative.
const renderBeforeHistogram=render;
render=function(){renderBeforeHistogram();updateHistogram();};
function updateHistogram(){
 const canvas=$('histogram');if(!canvas)return;
 const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 if(typeof ctx?.clearRect!=='function'||typeof ctx?.fillRect!=='function')return; // Headless test canvas
 ctx.clearRect(0,0,w,h);
 if(!workingPreview||$('preview').classList.contains('hidden')){$('histogramInfo').textContent='Ingen bild';return;}
 const shown=$('preview'),data=shown.getContext('2d',{willReadFrequently:true}).getImageData(0,0,shown.width,shown.height).data;
 const bins=new Uint32Array(256),step=Math.max(1,Math.floor(data.length/4/25000));
 for(let i=0;i<data.length;i+=4*step){const l=Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);bins[l]++;}
 const peaks=Array.from(bins).sort((a,b)=>a-b),max=Math.max(1,peaks[Math.floor(peaks.length*.99)]);
 ctx.fillStyle=getComputedStyle(document.body).getPropertyValue('--ns-muted').trim()||'#9fb1b5';
 for(let k=0;k<256;k++){const v=Math.min(1,bins[k]/max),x=k*w/256;ctx.fillRect(x,h-v*(h-4),Math.ceil(w/256),v*(h-4));}
 $('histogramInfo').textContent=display==='negative'?'Negativ · luminans':display==='split'?'Jämförelse · luminans':'Positiv · luminans';
}
