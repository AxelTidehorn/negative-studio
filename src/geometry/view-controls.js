'use strict';
function frameRegion(){return NSFrameSelection.region(state.frame);}
let zoom=1,panX=0,panY=0,dragPoint=null;

function updateCropLabel(){$('cropInsetValue').textContent=$('cropInset').value+' %';}


function saveCrop(){saveCurrentFrame();}
$('cropInset').oninput=e=>{setCropByInset(e.target.value)};
function applyView(){const angle=((state.rotation||0)%360+360)%360;const c=$('preview');c.style.transform=`translate(-50%, -50%) translate(${panX}px,${panY}px) scale(${zoom}) rotate(${angle}deg)`;$('zoomStatus').textContent=`${Math.round(zoom*100)} % · dra för att panorera`;if(typeof window!=='undefined'&&typeof Event!=='undefined')window.dispatchEvent(new Event('filmlabb:view-change'))}
$('rotateLeft').onclick=()=>rotateBy(-90);$('rotateRight').onclick=()=>rotateBy(90);function rotateBy(deg){state.rotation=((state.rotation||0)+deg+360)%360;panX=0;panY=0;applyView();persist();saveCurrentFrame();}
$('zoomIn').onclick=()=>{zoom=clamp(zoom*1.5,1,8);applyView()};$('zoomOut').onclick=()=>{zoom=clamp(zoom/1.5,1,8);if(zoom===1){panX=0;panY=0}applyView()};$('zoomReset').onclick=()=>{zoom=1;panX=0;panY=0;applyView()};
$('picture').addEventListener('pointerdown',e=>{if(sampleMode||zoom===1)return;dragPoint={x:e.clientX,y:e.clientY,px:panX,py:panY};$('picture').setPointerCapture(e.pointerId)});
$('picture').addEventListener('pointermove',e=>{if(!dragPoint)return;panX=dragPoint.px+e.clientX-dragPoint.x;panY=dragPoint.py+e.clientY-dragPoint.y;applyView()});
for(const event of ['pointerup','pointercancel'])$('picture').addEventListener(event,()=>dragPoint=null);
