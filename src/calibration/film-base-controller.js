/* Opt-in Filmbas 2: proposals never own accepted references or source buffers. */
'use strict';
let sharedBase2=null,proposal2=null,autoProposal2=null,previewBase2=false,revision2=0,baseTool2=false,baseRegion2=null,baseDrag2=null,baseDisplay2=null,undoBase2=null;
const FB2=NSFilmBaseReference,FM2=NSFilmBaseMeasurement;
function capture2(){return FB2.context({...working,linearGain4:hires?.linearGain4},sourceInfo,state,currentLight(),working.flatField||null);}
function accepted2(){const a=state.useRollBase2?sharedBase2:state.acceptedCalibration2;return FB2.valid(a)&&FB2.compatible(a.context,capture2())?a:null;}
function effectiveProposal2(){return previewBase2&&proposal2&&proposal2.revision===revision2&&FB2.compatible(proposal2.context,capture2())?proposal2:null;}
const oldBase2=calibrationBase;
calibrationBase=function(){if(state.filmBaseVersion!==2||!working)return oldBase2();const p=effectiveProposal2(),a=accepted2();return p?p.measurement:a?.measurement||null;};
const oldEnsureConversion2=ensureConversion3Calibration;
ensureConversion3Calibration=function(){const a=state.filmBaseVersion===2&&working?accepted2():null;return a?.responseLocked&&!effectiveProposal2()&&a.adapters.conversions?.[state.engine]?FB2.clone(a.adapters.conversions[state.engine]):oldEnsureConversion2();};
const oldFindBase2=CE.findBase;
CE.findBase=function(...args){return state.filmBaseVersion===2?null:oldFindBase2(...args);};
const oldExplicit2=explicitBase4;
explicitBase4=function(){return state.filmBaseVersion===2?calibrationBase()?.measured:oldExplicit2();};
const oldResponse2=response4;
response4=function(){if(state.filmBaseVersion!==2||!working)return oldResponse2();const a=accepted2();return a?(a.responseLocked?a.response:oldResponse2()):null;};
function adapters2(){
 const comparison=NSColorAnalysis.analyze(working,cropRegion),measurement=calibrationBase(),b=measurement?.measured||base.map(v=>v/255),light=currentLight();
 const conversions={};for(const engine of NSConversion3.ids)conversions[engine]=NSConversion3.analyze(working,cropRegion,{comparison,base:b,light,noBase:!!state.noBase,domain:sourceInfo.domain||sourceInfo.encoding});
 return {version:2,comparison,legacy:FB2.clone(legacyLevels),conversions};
}
const oldAnalyze2=analyzeLevels;
analyzeLevels=function(){
 const result=oldAnalyze2();
 if(state.filmBaseVersion!==2||!working||!calibration)return result;
 calibration.sceneAnalysis2={version:2,sourceRevision:sourceVersion38,region:CE.rect(cropRegion),statistics:FB2.clone(calibration.log39)};
 const a=accepted2();
 if(a&&!effectiveProposal2()){
  // Scene tone may change. Technical channel offsets/slopes remain the accepted snapshot.
  if(a.responseLocked&&a.adapters.comparison)calibration.log39=FB2.clone(a.adapters.comparison);
  if(a.responseLocked&&a.adapters.legacy){legacyLevels=FB2.clone(a.adapters.legacy);beta3Levels=legacyLevels;levels=legacyLevels;}
  if(NSConversion3.is(state.engine)&&a.responseLocked&&a.adapters.conversions?.[state.engine])calibration.conversion3=FB2.clone(a.adapters.conversions[state.engine]);
 }
 config38=null;technicalCache38=null;updateBasePanel2();saveCurrentFrame();return result;
};
const oldConfig2=configuration38;
configuration38=function(...args){const c=oldConfig2(...args);return state.filmBaseVersion===2?FB2.clone(c):c;};
function setProposal2(measurement){
 previewBase2=false;++revision2;proposal2=FB2.proposal(measurement,capture2(),revision2);baseRegion2=measurement.region||null;updateBasePanel2();drawBaseRegion2();
}
async function detectBase2(){
 if(!working||exportBusy||rollLoading)return;
 state.filmBaseVersion=2;previewBase2=false;const revision=++revision2,source=working,context=capture2(),region=CE.rect(cropRegion);$('base2Status').textContent='Söker homogena regioner i negativets källvärden…';
 // Yield before bounded sampling. Source/revision guards reject stale image and cancelled work.
 await new Promise(r=>setTimeout(r,0));
 if(revision!==revision2||source!==working)return;
 const measurement=await FM2.detectAsync(source,region,()=>revision===revision2&&source===working&&JSON.stringify(region)===JSON.stringify(CE.rect(cropRegion)));
 if(!measurement)return;
 if(revision!==revision2||source!==working||!FB2.compatible(context,capture2()))return;
 autoProposal2=FB2.proposal(measurement,context,revision);proposal2=autoProposal2;baseRegion2=measurement.region||null;updateBasePanel2();drawBaseRegion2();saveCurrentFrame();
}
function updateBasePanel2(){
 if(!$('base2Status'))return;
 const enabled=state.filmBaseVersion===2&&!!working,a=working&&enabled?accepted2():null,stored=state.useRollBase2?sharedBase2:state.acceptedCalibration2,m=proposal2?.measurement;
 $('base2Enable').textContent=enabled?'Sök nytt automatiskt förslag':'Aktivera Filmbas 2';
 for(const id of ['base2Enable','base2Region'])$(id).disabled=!working||exportBusy||rollLoading;
 $('base2Accept').disabled=!enabled||!m?.measured||m.status==='missing'||!!a?.baseLocked||proposal2.revision!==revision2;
 $('base2Preview').disabled=!enabled||!m?.measured||m.status==='missing';$('base2Preview').textContent=previewBase2?'Visa godkänd / före':'Förhandsgranska förslag / efter';
 $('base2Lock').disabled=!a;$('base2Lock').textContent=a?.baseLocked?'Lås upp filmbas':'Lås filmbas';
 $('base2ResponseLock').disabled=!a;$('base2ResponseLock').textContent=a?.responseLocked?'Lås upp respons':'Lås respons';
 if(enabled){$('shareBase').disabled=!a;$('useRollBase').disabled=!sharedBase2;$('useRollBase').checked=!!state.useRollBase2;$('rollBaseStatus').textContent=sharedBase2?(FB2.compatible(sharedBase2.context,capture2())?'Kompatibel godkänd rullreferens · ':'Rullreferens pausad · ')+sharedBase2.id:'Ingen godkänd Filmbas 2-rullreferens';}else $('shareBase').disabled=false;
 $('auto').disabled=enabled;
 if(enabled)$('baseInfo').textContent=previewBase2?'Förhandsvisning av förslag · inte godkänt':a?'Godkänd '+(a.measurement.kind.startsWith('manual')?'manuell':'automatisk')+' filmbas · linjära källvärden':'Motivbaserad reserv · ingen aktiv godkänd filmbas';
 $('base2Undo').disabled=!undoBase2;
 const label={safe:'Säker kandidat',review:'Kontrollera kandidaten',missing:'Filmbas saknas'};
 $('base2Status').textContent=!enabled?'Filmbas 2 aktiveras uttryckligen. Äldre beräkning behålls tills dess.':(stored&&!a?'Referensen är pausad: inkompatibel källa, ljus, gain eller session. ':a?'Godkänd referens '+a.id+(a.baseLocked?' · låst. ':'. '):'Ingen godkänd referens. ')+(m?(label[m.status]||'Kontrollera provet')+(m.reasons?.length?' · '+m.reasons.join(' · '):''):'Sök automatiskt eller rita ett provområde.');
 $('base2Stats').textContent=m?.measured?`Linjär RGB (${m.domain}): ${m.measured.map(v=>v.toFixed(5)).join(' / ')} · median · MAD ${m.mad.map(v=>v.toFixed(5)).join(' / ')} · spridning ${m.spread.map(v=>(v*100).toFixed(1)+' %').join(' / ')} · ${m.samples} prov · klippning ${m.clipped.map(v=>(v*100).toFixed(1)+' %').join(' / ')} · låg signal ${m.dark.map(v=>(v*100).toFixed(1)+' %').join(' / ')}`:'';
 const auto=autoProposal2?.measurement;$('base2Compare').textContent=auto?.measured&&m?.measured?'Automatisk RGB: '+auto.measured.map(v=>v.toFixed(5)).join(' / ')+' · skillnad från aktivt prov: '+m.measured.map((v,c)=>(v-auto.measured[c]).toFixed(5)).join(' / '):'';
}
function endBaseTool2(){
 baseTool2=false;baseDrag2=null;drawBaseRegion2();$('base2Loupe').hidden=true;
 if(globalThis.FILMLABB_GEOMETRY?.mode()==='base')FILMLABB_GEOMETRY.setTool(null);
 if(baseDisplay2){const old=baseDisplay2;baseDisplay2=null;$(old==='negative'?'tabNeg':old==='split'?'tabSplit':'tabPos').click();}
 $('base2Region').textContent='Rita / flytta provområde';
}
function cancelProposal2(){const restore=previewBase2;previewBase2=false;proposal2=null;++revision2;endBaseTool2();if(restore&&working)analyzeLevels();updateBasePanel2();if(working)render();}
function acceptBase2(){
 try{
  if(!working||exportBusy||rollLoading||!proposal2||proposal2.revision!==revision2)throw Error('Provet är inaktuellt. Mät igen.');
  const previous=state.useRollBase2?sharedBase2:state.acceptedCalibration2;if(previous?.baseLocked)throw Error('Lås upp filmbasen före godkännande.');
  if(proposal2.measurement.status==='missing')throw Error('Välj ett tillförlitligt prov.');
  const saved=state.acceptedCalibration2||null;
  previewBase2=true;analyzeLevels();
  const adapters=adapters2(),b=proposal2.measurement.measured;
  const response=previous?.responseLocked&&previous.response?previous.response:CC4.estimate(working,cropRegion,{base:b,light:[1,1,1],domain:domain4()});response.hasBase=true;
  if(previous?.responseLocked){adapters.comparison=FB2.clone(previous.adapters.comparison);adapters.legacy=FB2.clone(previous.adapters.legacy);adapters.conversions=FB2.clone(previous.adapters.conversions);for(const model of Object.values(adapters.conversions))model.reference.base=[...b];}
  const accepted=FB2.accept(proposal2,capture2(),previous,adapters,response);undoBase2={accepted:saved,useRoll:!!state.useRollBase2};state.acceptedCalibration2=accepted;state.useRollBase2=false;state.response4=FB2.clone(response);
  state.noBase=false;previewBase2=false;proposal2=null;endBaseTool2();analyzeLevels();saveCurrentFrame();render();updateBasePanel2();
 }catch(e){previewBase2=false;if(working)analyzeLevels();setStatus(e.message);}
}
$('base2Enable').onclick=()=>{endBaseTool2();detectBase2().catch(e=>setStatus(e.message));};
$('base2Accept').onclick=acceptBase2;
$('base2Cancel').onclick=cancelProposal2;
$('base2Preview').onclick=()=>{if(!working||!proposal2?.measurement.measured||proposal2.measurement.status==='missing')return;endBaseTool2();previewBase2=!previewBase2;analyzeLevels();render();updateBasePanel2();};
$('base2Auto').onclick=()=>{if(!autoProposal2||!FB2.compatible(autoProposal2.context,capture2()))return detectBase2();previewBase2=false;proposal2=FB2.proposal(autoProposal2.measurement,capture2(),revision2);baseRegion2=proposal2.measurement.region;analyzeLevels();updateBasePanel2();drawBaseRegion2();render();};
$('base2Undo').onclick=()=>{if(!undoBase2||!working||exportBusy)return;state.acceptedCalibration2=undoBase2.accepted;state.useRollBase2=undoBase2.useRoll;undoBase2=null;cancelProposal2();analyzeLevels();saveCurrentFrame();render();};
$('base2Lock').onclick=()=>{const a=working&&accepted2();if(a){a.baseLocked=!a.baseLocked;saveCurrentFrame();updateBasePanel2();}};
$('base2ResponseLock').onclick=()=>{const a=working&&accepted2();if(a){a.responseLocked=!a.responseLocked;saveCurrentFrame();analyzeLevels();render();}};
const oldShare2=$('shareBase').onclick;$('shareBase').onclick=()=>{if(state.filmBaseVersion!==2)return oldShare2();const a=working&&accepted2();if(!a)return;if(!a.context.session){setStatus('Ange samma film- och avfotograferingssession på kompatibla bilder före delning. Okända ljus- och WB-inställningar kan inte verifieras automatiskt.');return;}sharedBase2=FB2.clone(a);state.useRollBase2=true;saveCurrentFrame();updateBasePanel2();};
const oldUseRoll2=$('useRollBase').onchange;$('useRollBase').onchange=e=>{if(state.filmBaseVersion!==2)return oldUseRoll2(e);if(e.target.checked&&(!working||!FB2.compatible(sharedBase2?.context,capture2()))){e.target.checked=false;setStatus('Rullreferensen kräver samma import, gain, normalisering, ljus, flat-field och session.');return;}state.filmBaseVersion=2;state.useRollBase2=e.target.checked;cancelProposal2();analyzeLevels();saveCurrentFrame();render();};
$('base2Session').onchange=e=>{state.captureSession2=e.target.value.trim()||null;cancelProposal2();if(working)analyzeLevels();saveCurrentFrame();};
$('base2Region').onclick=()=>{
 if(!working||exportBusy||rollLoading)return;if(baseTool2){endBaseTool2();return;}
 state.filmBaseVersion=2;sampleMode=false;neutralSample39=false;cancelPair4();previewBase2=false;
 baseTool2=true;baseDisplay2=display;globalThis.FILMLABB_GEOMETRY?.setTool('base');$('tabNeg').click();$('base2Region').textContent='Klar med provområdet';$('base2Loupe').hidden=false;drawBaseRegion2();updateBasePanel2();setStatus('Rita på negativet. Dra inuti för att flytta, eller dra ett hörn för att ändra storlek.');
};
function viewBasePoint2(p){
 if(globalThis.FILMLABB_GEOMETRY)return FILMLABB_GEOMETRY.sourceToView({x:p.x*working.width,y:p.y*working.height});
 const v=frameView(),dx=(p.x-.5)*v.w*v.fit*zoom,dy=(p.y-.5)*v.h*v.fit*zoom;
 return {x:$('picture').clientWidth/2+panX+dx*v.c-dy*v.sn,y:$('picture').clientHeight/2+panY+dx*v.sn+dy*v.c};
}
function drawBaseRegion2(){
 const svg=$('base2Overlay');if(!svg||typeof svg.replaceChildren!=='function')return;svg.replaceChildren();const hidden=!baseTool2||!working||!baseRegion2;svg.toggleAttribute('hidden',hidden);if(hidden)return;
 svg.setAttribute('viewBox',`0 0 ${$('picture').clientWidth} ${$('picture').clientHeight}`);
 const r=baseRegion2,ps=[[r.x,r.y],[r.x+r.w,r.y],[r.x+r.w,r.y+r.h],[r.x,r.y+r.h]].map(([x,y])=>viewBasePoint2({x,y}));
 const make=(tag,attrs)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);svg.append(el);};
 make('polygon',{points:ps.map(p=>`${p.x},${p.y}`).join(' '),fill:'#41e0bf22',stroke:'#41e0bf','stroke-width':2,'data-base2':'move','pointer-events':'all'});
 for(let i=0;i<4;i++)make('circle',{cx:ps[i].x,cy:ps[i].y,r:14,fill:'#41e0bf55',stroke:'#41e0bf','data-base2':i,'pointer-events':'all'});
}
function loupe2(p){const c=$('base2Loupe'),size=112,ctx=c.getContext('2d'),out=ctx.createImageData(size,size),cx=Math.floor(p.x*working.width),cy=Math.floor(p.y*working.height);c.width=c.height=size;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const rgb=CE.pixel(working,CE.clamp(cx+Math.floor((x-size/2)/8),0,working.width-1),CE.clamp(cy+Math.floor((y-size/2)/8),0,working.height-1)),i=(y*size+x)*4;const visible=working.colorSpace==='rec2020'?NSRawInput.displayLinear(rgb):rgb;for(let k=0;k<3;k++)out.data[i+k]=CE.encode(visible[k])*255;out.data[i+3]=255;}
 ctx.putImageData(out,0,0);ctx.strokeStyle='#fff';ctx.strokeRect(52,52,8,8);
}
$('picture').addEventListener('pointerdown',e=>{
 if(!baseTool2||!working||exportBusy||rollLoading||e.isPrimary===false||e.button>0)return;
 e.preventDefault();e.stopImmediatePropagation();dragPoint=null;const p=imagePoint(e),start={x:CE.clamp(p.x),y:CE.clamp(p.y)};
 baseDrag2={id:e.pointerId,start,old:baseRegion2?{...baseRegion2}:null,part:e.target.dataset?.base2,source:working};$('picture').setPointerCapture(e.pointerId);loupe2(start);
},true);
$('picture').addEventListener('pointermove',e=>{
 if(!baseTool2||!working)return;if(!baseDrag2){loupe2(imagePoint(e));return;}if(e.pointerId!==baseDrag2.id||baseDrag2.source!==working)return;
 e.preventDefault();e.stopImmediatePropagation();const p=imagePoint(e),d=baseDrag2,s=d.start,r=d.old,dx=p.x-s.x,dy=p.y-s.y;
 if(d.part==='move'&&r)baseRegion2={...r,x:CE.clamp(r.x+dx,0,1-r.w),y:CE.clamp(r.y+dy,0,1-r.h)};
 else{let a=s,b={x:CE.clamp(p.x),y:CE.clamp(p.y)};if(r&&d.part!==undefined){const i=Number(d.part);a={x:i===0||i===3?r.x+r.w:r.x,y:i<2?r.y+r.h:r.y};}
 baseRegion2=CE.rect({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.max(1/working.width,Math.abs(a.x-b.x)),h:Math.max(1/working.height,Math.abs(a.y-b.y))});}
 setProposal2(FM2.measure(working,baseRegion2));loupe2(p);
},true);
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('picture').addEventListener(type,e=>{
 if(!baseDrag2||e.pointerId!==baseDrag2.id)return;e.preventDefault();e.stopImmediatePropagation();const d=baseDrag2;baseDrag2=null;
 if(type==='pointercancel'){baseRegion2=d.old;if(d.old)setProposal2(FM2.measure(working,d.old));else{proposal2=null;drawBaseRegion2();updateBasePanel2();}}
 if($('picture').hasPointerCapture(e.pointerId))$('picture').releasePointerCapture(e.pointerId);
},true);
// Capture first at the picture, ahead of the legacy canvas pipette listener.
$('picture').addEventListener('click',e=>{
 if(state.filmBaseVersion!==2||!sampleMode||!working)return;e.preventDefault();e.stopImmediatePropagation();const p=imagePoint(e);if(p.x<0||p.x>1||p.y<0||p.y>1)return;
 const x=Math.floor(p.x*working.width),y=Math.floor(p.y*working.height);setProposal2(FM2.measure(working,{x:Math.max(0,x-3)/working.width,y:Math.max(0,y-3)/working.height,w:Math.min(7,working.width)/working.width,h:Math.min(7,working.height)/working.height},{kind:'manual-7x7'}));sampleMode=false;$('sample').textContent='Välj filmbas med pipett';
},true);
const oldRecalc2=$('recalc').onclick;$('recalc').onclick=()=>state.filmBaseVersion===2?detectBase2():oldRecalc2();
const oldFinish2=finishImport;finishImport=function(...args){++revision2;proposal2=autoProposal2=null;previewBase2=false;undoBase2=null;baseRegion2=null;const result=oldFinish2(...args);updateBasePanel2();return result;};
const oldChoose2=chooseFrame;chooseFrame=async function(...args){if(rollLoading||exportBusy)return;cancelProposal2();undoBase2=null;autoProposal2=null;const result=await oldChoose2(...args);$('base2Session').value=state.captureSession2||'';updateBasePanel2();return result;};
const oldClear2=$('clearQueue').onclick;$('clearQueue').onclick=()=>{if(exportBusy||rollLoading)return;cancelProposal2();autoProposal2=null;undoBase2=null;const r=oldClear2();updateBasePanel2();return r;};
const oldView2=applyView;applyView=function(...args){const r=oldView2(...args);drawBaseRegion2();return r;};
if(typeof ResizeObserver!=='undefined')new ResizeObserver(drawBaseRegion2).observe($('picture'));
globalThis.FILMLABB_BASE2={leaveTool:endBaseTool2,detect:detectBase2,accept:acceptBase2,cancel:cancelProposal2,refresh:drawBaseRegion2,snapshot:()=>({version:state.filmBaseVersion,proposal:proposal2?FB2.clone(proposal2):null,accepted:working&&state.filmBaseVersion===2?FB2.clone(accepted2()):null,preview:previewBase2,tool:baseTool2,revision:revision2})};
updateBasePanel2();

function finishProposalPreviewForExport2(){if(previewBase2){previewBase2=false;analyzeLevels();render();updateBasePanel2();}}
const oldJpeg2=jpegBytes;jpegBytes=async function(...args){finishProposalPreviewForExport2();return oldJpeg2(...args);};
const oldTiff2=exportTiff;exportTiff=async function(...args){finishProposalPreviewForExport2();return oldTiff2(...args);};

if(typeof document.addEventListener==='function')document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(baseTool2||previewBase2))cancelProposal2();});
// Global preferences must never seed another image with a technical reference.
state.acceptedCalibration2=null;state.useRollBase2=false;

const oldClearRoll2=$('clearRollBase').onclick;$('clearRollBase').onclick=()=>{if(state.filmBaseVersion!==2)return oldClearRoll2();sharedBase2=null;state.useRollBase2=false;for(const f of roll)f.settings.useRollBase2=false;if(working){analyzeLevels();render();}updateBasePanel2();};
