'use strict';
// Normalize scan exposure on every imported preview, not original film exposure.
const v08FinishImport=finishImport;
finishImport=function(message){v08FinishImport(message);estimateScanExposure();analyzeLevels();render()};
// v0.8 image-region and illumination reference state. Stored as normalized coordinates.
let cropRegion={x:.04,y:.04,w:.92,h:.92},referenceGains=[1,1,1],referenceAvailable=false,scanExposureGain=1;
let zoom=1,panX=0,panY=0,dragPoint=null;
function clampCrop(r){const x=clamp(r.x,0,.95),y=clamp(r.y,0,.95);return {x,y,w:clamp(r.w,.03,1-x),h:clamp(r.h,.03,1-y)}}
function cropBounds(image){const r=cropRegion;return {x0:Math.floor(r.x*image.width),y0:Math.floor(r.y*image.height),x1:Math.ceil((r.x+r.w)*image.width),y1:Math.ceil((r.y+r.h)*image.height)}}
function cropStats(image){const {data:d,width:w,height:h}=image;const channels=[[],[],[]],b=cropBounds(image),step=Math.max(1,Math.floor(Math.sqrt(w*h/14000)));for(let y=b.y0;y<b.y1;y+=step)for(let x=b.x0;x<b.x1;x+=step){let i=(y*w+x)*4;for(let c=0;c<3;c++)channels[c].push(d[i+c]/255)}channels.forEach(a=>a.sort((a,b)=>a-b));return channels.map(a=>a.length?percentile(a,.98):1)}
function updateCropLabel(){$('cropInsetValue').textContent=$('cropInset').value+' %';}
function estimateScanExposure(){if(!previewSrc)return;const q=cropStats(previewSrc);const ref=Math.max(.05,q[1]);scanExposureGain=1; /* v0.8.1: motivbaserad förstärkning avstängd */}
function setCropByInset(v){const n=Number(v)/100;cropRegion={x:n,y:n,w:1-2*n,h:1-2*n};updateCropLabel();if(previewSrc){estimateScanExposure();analyzeLevels();scheduleRender()}saveCrop();}
function saveCrop(){if(activeFrame>=0&&roll[activeFrame])roll[activeFrame].crop={...cropRegion}}
$('cropInset').oninput=e=>{setCropByInset(e.target.value)};
$('cropReset').onclick=()=>{setCropByInset(0);setStatus('Hela bilden används. Filmkanter kan påverka statistiken.')};
// Conservative edge detection: detects large bright/dark bands; always adjustable.
$('cropAuto').onclick=()=>{if(!previewSrc)return;const im=previewSrc,w=im.width,h=im.height,d=im.data,points=[];for(let y=0;y<h;y+=Math.max(2,Math.floor(h/140)))for(let x=0;x<w;x+=Math.max(2,Math.floor(w/140))){const i=(y*w+x)*4;const v=(d[i]+d[i+1]+d[i+2])/3;points.push(v)}points.sort((a,b)=>a-b);const lo=percentile(points,.05),hi=percentile(points,.95),r={x:.04,y:.04,w:.92,h:.92};const edge=Math.min(.22,Math.max(.03,(hi-lo)/900));r.x=edge;r.y=edge;r.w=1-edge*2;r.h=1-edge*2;cropRegion=clampCrop(r);$('cropInset').value=Math.round(edge*100);updateCropLabel();saveCrop();estimateScanExposure();analyzeLevels();setStatus('Försiktig automatisk kantmarginal vald. Kontrollera manuellt – ingen exakt kantdetektor ännu.')};
// A blank illuminated holder reference estimates global color cast; this is not flat-field correction.
// Active linear reference import is installed by frame-controller.js.
$('clearReference').onclick=()=>{referenceGains=[1,1,1];referenceAvailable=false;$('referenceStatus').textContent='Ingen referens vald';if(previewSrc){estimateScanExposure();analyzeLevels();scheduleRender()}};
function applyView(){const angle=((state.rotation||0)%360+360)%360;const c=$('preview');c.style.transform=`translate(-50%, -50%) translate(${panX}px,${panY}px) scale(${zoom}) rotate(${angle}deg)`;$('zoomStatus').textContent=`${Math.round(zoom*100)} % · dra för att panorera`;if(typeof window!=='undefined'&&typeof Event!=='undefined')window.dispatchEvent(new Event('filmlabb:view-change'))}
$('rotateLeft').onclick=()=>rotateBy(-90);$('rotateRight').onclick=()=>rotateBy(90);function rotateBy(deg){state.rotation=((state.rotation||0)+deg+360)%360;panX=0;panY=0;applyView();persist();saveCurrentFrame();} 
$('zoomIn').onclick=()=>{zoom=clamp(zoom*1.5,1,8);applyView()};$('zoomOut').onclick=()=>{zoom=clamp(zoom/1.5,1,8);if(zoom===1){panX=0;panY=0}applyView()};$('zoomReset').onclick=()=>{zoom=1;panX=0;panY=0;applyView()};
$('picture').addEventListener('pointerdown',e=>{if(sampleMode||zoom===1)return;dragPoint={x:e.clientX,y:e.clientY,px:panX,py:panY};$('picture').setPointerCapture(e.pointerId)});
$('picture').addEventListener('pointermove',e=>{if(!dragPoint)return;panX=dragPoint.px+e.clientX-dragPoint.x;panY=dragPoint.py+e.clientY-dragPoint.y;applyView()});
for(const event of ['pointerup','pointercancel'])$('picture').addEventListener(event,()=>dragPoint=null);

