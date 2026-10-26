/* Beta 6 tools and presentation routing. Color, analysis and export own no UI.
   Geometry-only edits redraw bounded cached color; late color results use the
   latest geometry and are still gated by the existing source/request guards. */
'use strict';
(() => {
 const picture=$('picture'),baseCanvas=$('preview'),gpuCanvas=$('gpuPreview');
 const canvas=document.createElement('canvas');canvas.id='presentationPreview';canvas.hidden=true;picture.append(canvas);
 const fallback=document.createElement('canvas');fallback.id='presentationFallback';fallback.hidden=true;picture.append(fallback);
 const ns='http://www.w3.org/2000/svg',overlay=document.createElementNS(ns,'svg');overlay.id='geometryOverlay';overlay.setAttribute('aria-label','Bildgeometri');picture.append(overlay);
 let presenter=null,failed=false,cpuImage=null,negativeImage=null,colorSource=null,colorVersion=-1,mode=null,drag=null,lineStart=null,lineEnd=null,scheduled=null,grid=false,cpuLimit=480,cpuIdle=null;
 // New rolls start with the entire exposed frame; imported projects keep their explicit choice.
 if(!roll.length){rollShared.cropExportToFrame=true;state.cropExport=true;}
 const metrics={draws:0,colorUploads:0,cpuPasses:0,lastMs:0,lastError:null};
 try{grid=localStorage.getItem('filmlabb-thirds')==='true';}catch{}$('thirdsGrid').checked=grid;
 function busy(){return !working||rollLoading||exportBusy||rollingExport;}
 function current(){const f=roll[activeFrame];return f?geometryForFrame(f,state,cropRegion):NSGeometry.create(state.rotation||0);}
 function plan(context=!!mode){
  if(!working)return null;const g=current(),W=working.width,H=working.height;
  const p=context?NSGeometry.contextTransform(W,H,g):NSGeometry.compositionTransform(W,H,g,{cropExportToFrame:rollShared.cropExportToFrame,analysisFrame:cropRegion});
  return {...p,sourceWidth:W,sourceHeight:H,model:g};
 }
 function layout(p){
  const width=picture.clientWidth,height=picture.clientHeight,fit=Math.min(width/p.area.width,height/p.area.height),scale=fit*zoom;
  return {width,height,fit,scale,ox:width/2+panX,oy:height/2+panY,
   toView(s){const q=p.forward(s);return {x:this.ox+(q.x-.5)*p.area.width*scale,y:this.oy+(q.y-.5)*p.area.height*scale};},
   fromView(v){return p.inverse({x:.5+(v.x-this.ox)/(p.area.width*scale),y:.5+(v.y-this.oy)/(p.area.height*scale)});}};
 }
 function viewPoint(e,p=plan()){const b=picture.getBoundingClientRect();return layout(p).fromView({x:(e.clientX-b.left)*picture.clientWidth/b.width,y:(e.clientY-b.top)*picture.clientHeight/b.height});}
 const oldPoint=imagePoint;imagePoint=function(e){if(!working)return oldPoint(e);const p=viewPoint(e);return {x:p.x/working.width,y:p.y/working.height};};
 function styleView(p){
  const v=layout(p),css=`translate(-50%, -50%) translate(${panX}px,${panY}px) scale(${zoom})`;
  for(const c of [baseCanvas,gpuCanvas,canvas,fallback]){c.style.setProperty('width',p.area.width*v.fit+'px','important');c.style.setProperty('height',p.area.height*v.fit+'px','important');c.style.transform=css;}
  $('cropOverlay').classList.add('hidden');return v;
 }
 function svg(tag,attrs,klass){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(klass)e.setAttribute('class',klass);overlay.append(e);return e;}
 function points(ps){return ps.map(p=>p.x+','+p.y).join(' ');}
 function rectPoints(p,crop){const L=Math.max(working.width,working.height),t=NSGeometry.transform(working.width,working.height,p.model.rotation);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>t.inverse({x:(crop.cx+x*crop.w/2)*L,y:(crop.cy+y*crop.h/2)*L}));}
 function drawOverlay(p,v){
  overlay.replaceChildren();overlay.setAttribute('viewBox',`0 0 ${v.width} ${v.height}`);
  const effective=NSGeometry.effectiveComposition(working.width,working.height,p.model,{cropExportToFrame:rollShared.cropExportToFrame,analysisFrame:cropRegion}).crop;
  const corners=rectPoints(p,effective).map(s=>v.toView(s));
  if(grid){for(const f of [1/3,2/3]){const lerp=(a,b)=>({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});for(const [a,b]of [[lerp(corners[0],corners[1]),lerp(corners[3],corners[2])],[lerp(corners[0],corners[3]),lerp(corners[1],corners[2])]])svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y},'grid-line');}}
  if(mode==='frame'&&state.cropVisible!==false){
   const r=cropRegion,W=working.width,H=working.height,ps=[[r.x*W,r.y*H],[(r.x+r.w)*W,r.y*H],[(r.x+r.w)*W,(r.y+r.h)*H],[r.x*W,(r.y+r.h)*H]].map(([x,y])=>v.toView({x,y}));
   svg('polygon',{points:points(ps)},'frame-line');if(!state.cropLocked)for(const [side,a,b]of [['top',0,1],['right',1,2],['bottom',3,2],['left',0,3]])svg('line',{x1:ps[a].x,y1:ps[a].y,x2:ps[b].x,y2:ps[b].y,'data-side':side},'hit');
  }
  if(mode==='composition'){
   const body=svg('polygon',{points:points(corners),'data-composition':'move',fill:'transparent','pointer-events':'all'},'composition-line');body.style.cursor='move';
   for(let i=0;i<4;i++){svg('circle',{cx:corners[i].x,cy:corners[i].y,r:18,'data-composition':String(i)},'composition-touch');svg('circle',{cx:corners[i].x,cy:corners[i].y,r:5},'composition-handle');}
  }
  if(lineStart&&lineEnd){const a=v.toView(lineStart),b=v.toView(lineEnd);svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y},'straight-line');}
 }
 function draw(){
  scheduled=null;if(!working||!src){canvas.hidden=fallback.hidden=true;overlay.replaceChildren();return;}
  const p=plan(),v=styleView(p);drawOverlay(p,v);controls();
  if(colorSource!==workingPreview||colorVersion!==sourceVersion38)return;
  const t=performance.now(),ratio=Math.min(1,(failed?cpuLimit:1400)/Math.max(p.area.width,p.area.height)),width=Math.max(1,Math.round(p.area.width*ratio)),height=Math.max(1,Math.round(p.area.height*ratio));
  const bounds=mode?NSGeometry.pixelBounds(working.width,working.height,null):NSGeometry.pixelBounds(working.width,working.height,rollShared.cropExportToFrame?cropRegion:null);
  try{if(presenter&&!failed){presenter.draw(p,width,height,bounds,display==='split');canvas.hidden=false;fallback.hidden=true;}else{
   if(!cpuImage)return;const r=NSPreviewPresentation.cpu(cpuImage,p,width,height,bounds,negativeImage);fallback.width=r.width;fallback.height=r.height;fallback.getContext('2d').putImageData(new ImageData(r.data,r.width,r.height),0,0);fallback.hidden=false;canvas.hidden=true;metrics.cpuPasses++;
  }}catch(e){const wasFailed=failed;metrics.lastError=e.message;failed=true;canvas.hidden=true;if(!wasFailed)ensureCpu();else setStatus('Förhandsvisning: '+e.message);return;}
  metrics.draws++;metrics.lastMs=performance.now()-t;
 }
 function queue(interactive=false){if(interactive){cpuLimit=240;clearTimeout(cpuIdle);cpuIdle=setTimeout(()=>{cpuLimit=480;queue();},180);}if(scheduled===null)scheduled=requestAnimationFrame(draw);}
 function ensurePresenter(){if(!presenter&&!failed)try{presenter=NSPreviewPresentation.create(canvas);}catch{failed=true;}}
 function ensureCpu(){if(!workingPreview)return;cpuImage=NSPixelKernel.render(workingPreview,configuration38(),display==='split'?'positive':display,480);negativeImage=display==='split'?NSPixelKernel.render(workingPreview,configuration38(),'negative',480):null;colorSource=workingPreview;colorVersion=sourceVersion38;queue();}
 function colorGpu(c,r,version,negative=false){
  ensurePresenter();colorSource=workingPreview;colorVersion=version;cpuImage=negativeImage=null;
  if(!failed)try{presenter.upload(c,negative);metrics.colorUploads++;}catch{failed=true;}
  if(failed&&!negative)ensureCpu();queue();
 }
 const oldShow=showPreview38;showPreview38=function(r){
  const result=oldShow(r);
  if(FILMLABB_GPU.snapshot().backend==='gpu')return result;
  cpuImage=display==='split'?{...r,data:r.positive||NSPixelKernel.render(workingPreview,configuration38(),'positive',r.width).data}:r;negativeImage=display==='split'?{...r,data:r.negative||NSPixelKernel.render(workingPreview,configuration38(),'negative',r.width).data}:null;colorSource=workingPreview;colorVersion=sourceVersion38;ensurePresenter();
  if(!failed){const temp=document.createElement('canvas');temp.width=r.width;temp.height=r.height;temp.getContext('2d').putImageData(new ImageData(cpuImage.data,r.width,r.height),0,0);try{presenter.upload(temp);if(negativeImage){temp.getContext('2d').putImageData(new ImageData(negativeImage.data,r.width,r.height),0,0);presenter.upload(temp,true);}metrics.colorUploads++;}catch{failed=true;}temp.width=temp.height=0;}
  queue();return result;
 };
 const oldComposition=setCompositionCrop;setCompositionCrop=function(...args){const r=oldComposition(...args);queue();return r;};
 const oldQueue=setQueueCropExportToFrame;setQueueCropExportToFrame=function(...args){const r=oldQueue(...args);queue();return r;};
 const oldDraw=drawCrop;drawCrop=function(){oldDraw();if(working){const p=plan();styleView(p);drawOverlay(p,layout(p));queue();}else draw();};
 function controls(){
  const g=working?current():NSGeometry.create(),fine=g.rotation.fineDegrees,total=g.rotation.quarterTurns*90+fine;
  $('fineRotation').value=fine;if(document.activeElement!==$('rotationDegrees'))$('rotationDegrees').value=fine;
  $('rotationValue').textContent=fine.toFixed(2)+'°';$('rotationSummary').textContent=total.toFixed(2)+'°';
  $('compositionEnabled').checked=g.compositionCrop!==null;$('cropExport').checked=rollShared.cropExportToFrame;
  for(const id of ['fineRotation','rotationDegrees','rotationReset','straighten','compositionEnabled','compositionEdit','compositionReset','geometryDone','cropExport'])$(id).disabled=busy();
  $('geometryDone').hidden=!mode;$('straighten').setAttribute('aria-pressed',String(mode==='straighten'));
 }
 function commit(g,interactive=false){if(busy())return;roll[activeFrame].geometry=g;state.rotation=g.rotation.quarterTurns*90;saveCurrentFrame();controls();queue(interactive);}
 function fine(value){if(busy())return;const n=Number(value);if(!Number.isFinite(n)||n< -45||n>45){controls();return;}const g=current();g.rotation.fineDegrees=n;commit(g,true);}
 $('fineRotation').oninput=e=>fine(e.target.value);$('rotationDegrees').oninput=e=>{if(e.target.value!=='')fine(e.target.value);};$('rotationDegrees').onchange=()=>{$('rotationDegrees').value=working?current().rotation.fineDegrees:0;controls();};
 const oldRotate=rotateBy;rotateBy=function(degrees){if(busy())return;oldRotate(degrees);controls();queue();};
 $('rotationReset').onclick=()=>{if(busy())return;const g=NSGeometry.syncLegacy(current(),0);g.rotation.fineDegrees=0;panX=panY=0;commit(g);};
 function setMode(value){
  if(drag&&picture.hasPointerCapture(drag.id))picture.releasePointerCapture(drag.id);
  mode=value;lineStart=lineEnd=null;drag=null;zoom=1;panX=panY=0;picture.classList.toggle('geometry-line-tool',mode==='straighten');
  if(mode!=='frame'){$('frameOptions').open=false;const group=$('frameSettingsGroup');if(group)group.open=false;}
  $('geometryHint').textContent=mode==='composition'?'Dra utsnittet eller ett hörn. Klar visar exportytan.':mode==='straighten'?'Dra längs en horisontell eller lodrät linje i bilden.':mode==='frame'?'Orange filmruta används för analys. Dra en sida.':'Komposition ändrar inte färgkalibreringen.';
  controls();queue();
 }
 $('geometryDone').onclick=()=>setMode(null);
 $('geometryTools').addEventListener('toggle',()=>{if(!$('geometryTools').open&&(mode==='composition'||mode==='straighten'))setMode(null);});
 $('compositionEnabled').onchange=e=>{if(busy())return;let g=current();const c=e.target.checked?NSGeometry.effectiveComposition(working.width,working.height,g,{cropExportToFrame:rollShared.cropExportToFrame,analysisFrame:cropRegion}).crop:null;g=NSGeometry.withComposition(g,c);commit(g);setMode(c?'composition':null);};
 $('compositionEdit').onclick=()=>{if(busy())return;const g=current();if(!g.compositionCrop)commit(NSGeometry.withComposition(g,NSGeometry.effectiveComposition(working.width,working.height,g,{cropExportToFrame:rollShared.cropExportToFrame,analysisFrame:cropRegion}).crop));setMode('composition');};
 $('compositionReset').onclick=()=>{if(busy())return;commit(NSGeometry.withComposition(current(),null));setMode(null);};
 $('straighten').onclick=()=>{if(!busy())setMode(mode==='straighten'?null:'straighten');};
 $('thirdsGrid').onchange=e=>{grid=e.target.checked;try{localStorage.setItem('filmlabb-thirds',String(grid));}catch{}queue();};
 $('cropExport').onchange=e=>{if(busy())return controls();setQueueCropExportToFrame(e.target.checked);controls();queue();};
 $('frameOptions').addEventListener('toggle',()=>{if($('frameOptions').open&&mode!=='frame')setMode('frame');else if(!$('frameOptions').open&&mode==='frame')setMode(null);});
 // compact-ui owns the outer section; its toggle also serves as the edit tool.
 document.addEventListener('toggle',e=>{if(e.target.id==='frameSettingsGroup'){if(e.target.open){$('frameOptions').open=true;setMode('frame');}else if(mode==='frame')setMode(null);}},true);
 function finishDrag(e){
  if(!drag||e.pointerId!==drag.id)return;e.preventDefault();e.stopImmediatePropagation();const saved=drag;drag=null;
  if(picture.hasPointerCapture(e.pointerId))picture.releasePointerCapture(e.pointerId);
  if(saved.kind==='line'&&lineStart&&lineEnd&&e.type==='pointerup'){
   const t=NSGeometry.transform(working.width,working.height,current().rotation),a=t.forward(lineStart),b=t.forward(lineEnd);
   if(Math.hypot(b.x-a.x,b.y-a.y)>Math.max(working.width,working.height)*.015){let angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;angle-=Math.round(angle/90)*90;const g=current();let f=g.rotation.fineDegrees-angle,q=g.rotation.quarterTurns;
    while(f>45){f-=90;q=(q+1)%4;}while(f< -45){f+=90;q=(q+3)%4;}const rotated={...g,rotation:{quarterTurns:q,fineDegrees:f}};if(q!==g.rotation.quarterTurns&&rotated.legacyCrop)rotated.legacyCrop={...rotated.legacyCrop,edited:true};commit(rotated);
   }setMode(null);
  }else if(saved.kind==='line')setMode(null);else{saveCurrentFrame();queue();}
 }
 picture.addEventListener('pointerdown',e=>{
  if(busy()||drag||sampleMode||neutralSample39||neutralPair4||e.isPrimary===false)return;
  const part=e.target.dataset?.composition;if(mode!=='straighten'&&part===undefined)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();dragPoint=null;
  const p=plan(),s=viewPoint(e,p),t=NSGeometry.transform(working.width,working.height,p.model.rotation),r=t.forward(s),L=Math.max(working.width,working.height);
  if(mode==='straighten'){lineStart=lineEnd=s;drag={id:e.pointerId,kind:'line',source:working};}
  else drag={id:e.pointerId,kind:'crop',part,start:{x:r.x/L,y:r.y/L},crop:{...p.model.compositionCrop},source:working};
  picture.setPointerCapture(e.pointerId);queue();
 },true);
 picture.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId||drag.source!==working)return;e.preventDefault();e.stopImmediatePropagation();
  const p=plan(),s=viewPoint(e,p);if(drag.kind==='line'){lineEnd=s;queue();return;}
  const t=NSGeometry.transform(working.width,working.height,p.model.rotation),r=t.forward(s),L=Math.max(working.width,working.height),dx=r.x/L-drag.start.x,dy=r.y/L-drag.start.y,c=drag.crop;
  let desired;
  if(drag.part==='move')desired={...c,cx:c.cx+dx,cy:c.cy+dy};
  else{const i=Number(drag.part),left=c.cx-c.w/2,right=c.cx+c.w/2,top=c.cy-c.h/2,bottom=c.cy+c.h/2,min=1/L;
   const x=i===0||i===3?Math.min(right-min,left+dx):Math.max(left+min,right+dx),y=i<2?Math.min(bottom-min,top+dy):Math.max(top+min,bottom+dy);
   const a=i===0||i===3?x:left,b=i===0||i===3?right:x,d=i<2?y:top,f=i<2?bottom:y;desired={cx:(a+b)/2,cy:(d+f)/2,w:b-a,h:f-d};
  }
  desired.cx=Math.max(-2,Math.min(2,desired.cx));desired.cy=Math.max(-2,Math.min(2,desired.cy));desired.w=Math.min(4,desired.w);desired.h=Math.min(4,desired.h);
  const g=NSGeometry.withComposition(p.model,desired),effective=NSGeometry.effectiveComposition(working.width,working.height,g,{cropExportToFrame:rollShared.cropExportToFrame,analysisFrame:cropRegion}).crop;
  // Commit what the handles actually show. No hidden oversize crop on release.
  roll[activeFrame].geometry=NSGeometry.withComposition(g,effective);controls();queue(true);
 },true);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])picture.addEventListener(type,finishDrag,true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mode){if(drag&&picture.hasPointerCapture(drag.id))picture.releasePointerCapture(drag.id);setMode(null);}});
 const oldChoose=chooseFrame;chooseFrame=async function(i,opts={}){if(i>=0&&i<roll.length&&!rollLoading&&!exportBusy&&!cropDrag&&(opts.force||i!==activeFrame)){setMode(null);colorSource=null;cpuImage=null;canvas.hidden=fallback.hidden=true;}const r=await oldChoose(i,opts);controls();queue();return r;};
 const oldClear=$('clearQueue').onclick;$('clearQueue').onclick=()=>{if(exportBusy||rollLoading)return;setMode(null);colorSource=null;cpuImage=negativeImage=null;clearTimeout(cpuIdle);canvas.width=canvas.height=fallback.width=fallback.height=1;if(presenter)presenter.clear();const r=oldClear();controls();draw();return r;};
 const oldNextControls=nextControls;nextControls=function(...args){const r=oldNextControls(...args);controls();return r;};
 const oldUI=updateCalibrationUI;updateCalibrationUI=function(...args){const r=oldUI(...args);controls();return r;};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;ensureCpu();});canvas.addEventListener('webglcontextrestored',()=>{if(presenter)presenter.destroy();presenter=null;failed=false;colorSource=null;if(working)render();});
 new ResizeObserver(()=>{if(working)queue();}).observe(picture);
 globalThis.FILMLABB_GEOMETRY={colorGpu,refresh:queue,plan:()=>plan(false),view:()=>plan(),mode:()=>mode,snapshot:()=>({...metrics,mode,grid,backend:failed?'cpu':'gpu',sourceVersion:colorVersion})};
 controls();
})();
