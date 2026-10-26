'use strict';
let cropRegion={x:.04,y:.04,w:.92,h:.92},referenceGains=[1,1,1],referenceAvailable=false;
let zoom=1,panX=0,panY=0,dragPoint=null;

function cropBounds(image){const r=cropRegion;return {x0:Math.floor(r.x*image.width),y0:Math.floor(r.y*image.height),x1:Math.ceil((r.x+r.w)*image.width),y1:Math.ceil((r.y+r.h)*image.height)}}

function updateCropLabel(){$('cropInsetValue').textContent=$('cropInset').value+' %';}


function saveCrop(){if(activeFrame>=0&&roll[activeFrame])roll[activeFrame].crop={...cropRegion}}
$('cropInset').oninput=e=>{setCropByInset(e.target.value)};
function applyView(){const angle=((state.rotation||0)%360+360)%360;const c=$('preview');c.style.transform=`translate(-50%, -50%) translate(${panX}px,${panY}px) scale(${zoom}) rotate(${angle}deg)`;$('zoomStatus').textContent=`${Math.round(zoom*100)} % · dra för att panorera`;if(typeof window!=='undefined'&&typeof Event!=='undefined')window.dispatchEvent(new Event('filmlabb:view-change'))}
$('rotateLeft').onclick=()=>rotateBy(-90);$('rotateRight').onclick=()=>rotateBy(90);function rotateBy(deg){state.rotation=((state.rotation||0)+deg+360)%360;panX=0;panY=0;applyView();persist();saveCurrentFrame();} 
$('zoomIn').onclick=()=>{zoom=clamp(zoom*1.5,1,8);applyView()};$('zoomOut').onclick=()=>{zoom=clamp(zoom/1.5,1,8);if(zoom===1){panX=0;panY=0}applyView()};$('zoomReset').onclick=()=>{zoom=1;panX=0;panY=0;applyView()};
$('picture').addEventListener('pointerdown',e=>{if(sampleMode||zoom===1)return;dragPoint={x:e.clientX,y:e.clientY,px:panX,py:panY};$('picture').setPointerCapture(e.pointerId)});
$('picture').addEventListener('pointermove',e=>{if(!dragPoint)return;panX=dragPoint.px+e.clientX-dragPoint.x;panY=dragPoint.py+e.clientY-dragPoint.y;applyView()});
for(const event of ['pointerup','pointercancel'])$('picture').addEventListener(event,()=>dragPoint=null);

