/* Standard-engine controls and persistent channel response. */
'use strict';
const CC4=NSColorCalibration;
let sharedResponse4=null,neutralPair4=null;
function domain4(){return sourceInfo.domain||sourceInfo.label||sourceInfo.encoding;}
function explicitBase4(){return !state.noBase&&(state.filmBaseVersion===2||state.useRollBase||!state.auto)?calibrationBase()?.measured:null;}
function response4(){
 const saved=state.useRollResponse4?sharedResponse4:state.response4;
 const ordinary=CC4.valid(saved)&&saved.domain===domain4()?saved:null;
 if(state.filmBaseVersion!==2||!working)return ordinary;
 const a=accepted2();return a?(a.responseLocked?a.response:ordinary):null;
}
function cancelPair4(){neutralPair4=null;$('neutralPair4').textContent='Kalibrera två neutrala ytor';}
function controls4(){
 syncEngineSelector();
 $('rawMode4').disabled=state.engine==='v2'||rollLoading||exportBusy;
 const enabled=!!working&&state.engine==='calibrated4';
 for(const id of ['neutralPair4','resetResponse4','saveResponse4'])$(id).disabled=!enabled;
 $('useResponse4').checked=!!state.useRollResponse4;$('useResponse4').disabled=!sharedResponse4;
 $('rawMode4').value=state.rawMode4||'protected';$('toneMode4').value=state.toneMode4||'smooth';$('toneMode4').disabled=state.engine!=='calibrated4';
 $('colorMode4').value=NSPixelKernel.colorVariant4(state.colorMode4);$('colorMode4').disabled=!enabled||rollLoading||exportBusy;

 if(sharedLight&&sourceInfo.domain&&sharedLight.domain!==sourceInfo.domain)$('referenceStatus').textContent='Ljuskälla pausad · annan kamera eller RAW-import';
 if(state.useRollBase&&sharedBase&&sourceInfo.domain&&sharedBase.sourceDomain!==sourceInfo.domain)$('rollBaseStatus').textContent='Filmbas pausad · annan kamera eller RAW-import';
 const diag=sourceInfo.diagnostics4;if(diag)$('sourceStatus').textContent=sourceInfo.label+' · klippt i Rec.2020 (hela bilden): '+diag.clipped.map(v=>(100*v/diag.pixels).toFixed(2)+' %').join(' / ');
 const r=response4()||calibration?.beta4?.response;$('calibrationStatus4').textContent=!working?'Ingen bild inläst':state.engine!=='calibrated4'?'Jämförelseläge · Beta 4-kalibrering pausad':r?(state.useRollResponse4?'Gemensam rullkalibrering · ':'')+(r.kind==='two-neutral'?'Två neutrala ytor uppmätta':'Motivbaserad uppskattning · ingen uppmätt färgreferens')+((state.frame?.status!=='pending'&&!!state.frame)?' · färgkurvor sparade':' · kontrollera filmrutan'):'Kalibrering saknas eller tillhör annan källa';
 if(state.engine==='v2'){const r=state.v2Recipe;$('calibrationStatus4').textContent='V2 · '+(r?(r.base.origin==='prior'?'Filmbas saknas – mät och godkänn filmkant':'Uppmätt filmbas')+' · '+(r.intent.analysis.exposure.fallback?'Ton: fallback':'Ton: aktiv')+' · '+(r.intent.colorCorrection.kind==='identity'?'Färg: avstår':'Färg: aktiv'):'Väntar på linjär källa');}
}
function analyzeStandardLevels(im=working){
if(!im||!calibration)return;
 if(state.engine!=='calibrated4'){controls4();return;}
 let r=response4();
 if(!r){state.useRollResponse4=false;const measured=!state.noBase&&calibration.base?.measured;r=CC4.estimate(im,frameRegion(),{base:measured||[1,1,1],light:measured?[1,1,1]:currentLight(),domain:domain4()});r.hasBase=!!measured;if((state.frame?.status!=='pending'&&!!state.frame))state.response4=r;}
 const explicit=explicitBase4(),rollMeasured=state.useRollResponse4&&calibration.base?.measured,b=state.noBase?[1,1,1]:explicit||rollMeasured||r.base;
 calibration.beta4=CC4.analyze(im,frameRegion(),r,{base:b,light:!state.noBase&&(explicit||rollMeasured||r.hasBase)?[1,1,1]:currentLight()});
 config38=null;controls4();saveCurrentFrame();
 $('levelsInfo').textContent=`${calibration.beta4.count} motivprov · gemensamt tonomfång${calibration.beta4.weak?' · lågt omfång':''} · `+(calibration.beta4.clipped.some(v=>v>.005)?'klippta källkanaler':'ingen tydlig kanalklippning');
};
$('colorMode4').onchange=e=>{if(state.engine!=='calibrated4'||rollLoading||exportBusy){controls4();return;}state.colorMode4=NSPixelKernel.colorVariant4(e.target.value);config38=null;saveCurrentFrame();persist();controls4();render();};
$('toneMode4').onchange=e=>{state.toneMode4=e.target.value==='reference'?'reference':'smooth';config38=null;saveCurrentFrame();persist();render();};
$('resetResponse4').onclick=()=>{if(!workingPreview)return;cancelPair4();state.response4=null;state.useRollResponse4=false;analyzeLevels();persist();render();setStatus('Färgkurvor uppskattade från den aktuella filmrutan.');};
$('saveResponse4').onclick=()=>{const r=calibration?.beta4?.response;if(!CC4.valid(r))return;sharedResponse4=JSON.parse(JSON.stringify(r));state.useRollResponse4=true;analyzeLevels();persist();render();setStatus('Rullkalibrering sparad. Använd på bilder från samma film och samma avfotografering.');};
$('useResponse4').onchange=e=>{if(e.target.checked&&(!CC4.valid(sharedResponse4)||sharedResponse4.domain!==domain4())){e.target.checked=false;setStatus('Rullkalibreringen tillhör en annan källa eller kamera.');return;}state.useRollResponse4=e.target.checked;analyzeLevels();persist();render();};
$('neutralPair4').onclick=()=>{if(!working||state.engine!=='calibrated4')return;if(neutralPair4){cancelPair4();return;}neutralSample39=false;sampleMode=false;neutralPair4=[];$('neutralPair4').textContent='Välj första neutrala ytan · klicka för att avbryta';setStatus('Välj en känd neutral yta. Välj sedan en annan neutral yta med tydligt annan ljushet.');};
$('preview').addEventListener('click',e=>{
 if(!neutralPair4||!working)return;e.stopImmediatePropagation();
 try{const p=imagePoint(e),r=frameRegion();if(p.x<r.x||p.x>r.x+r.w||p.y<r.y||p.y>r.y+r.h)throw Error('Välj neutrala ytor innanför filmrutan.');
 const ps=[],cx=Math.min(working.width-1,Math.floor(p.x*working.width)),cy=Math.min(working.height-1,Math.floor(p.y*working.height));
 for(let y=Math.max(0,cy-2);y<=Math.min(working.height-1,cy+2);y++)for(let x=Math.max(0,cx-2);x<=Math.min(working.width-1,cx+2);x++)ps.push(sourcePixel(working,x,y));
 const q=[0,1,2].map(k=>CE.quantile(ps.map(v=>v[k]),.5));
 if(q.some(v=>v<4/65535||v>=.98))throw Error('Provet är klippt eller för mörkt. Välj en annan yta.');
 if(!neutralPair4.length){neutralPair4.push(q);$('neutralPair4').textContent='Välj andra neutrala ytan · klicka för att avbryta';return;}
 const current=calibration.beta4,r4={...current.response,base:current.base,light:current.light};state.response4=CC4.fitNeutral(r4,neutralPair4[0],q);state.useRollResponse4=false;cancelPair4();analyzeLevels();persist();render();setStatus('Kanalrespons kalibrerad från två neutrala ytor. Kan sparas som rullkalibrering.');
 }catch(err){setStatus(err.message);}
},true);
for(const id of ['sample','neutralSample'])$(id).addEventListener('click',cancelPair4);
