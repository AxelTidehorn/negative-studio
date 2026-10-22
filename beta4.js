/* Beta 4 controller. Beta 3.9 remains an unchanged color-method reference. */
'use strict';
const CC4=NSColorCalibration,analyzeBefore4=analyzeLevels,configurationBefore4=configuration38;
let sharedResponse4=null,neutralPair4=null;
function domain4(){return sourceInfo.domain||sourceInfo.label||sourceInfo.encoding;}
function explicitBase4(){return !state.noBase&&(state.useRollBase||!state.auto)?calibrationBase()?.measured:null;}
function response4(){const saved=state.useRollResponse4?sharedResponse4:state.response4;return CC4.valid(saved)&&saved.domain===domain4()?saved:null;}
function cancelPair4(){neutralPair4=null;$('neutralPair4').textContent='Kalibrera två neutrala ytor';}
function controls4(){
 syncEngineSelector();
 const enabled=!!working&&state.engine==='calibrated4';
 for(const id of ['neutralPair4','resetResponse4','saveResponse4'])$(id).disabled=!enabled;
 $('useResponse4').checked=!!state.useRollResponse4;$('useResponse4').disabled=!sharedResponse4;
 $('rawMode4').value=state.rawMode4||'protected';$('toneMode4').value=state.toneMode4||'smooth';$('toneMode4').disabled=state.engine!=='calibrated4';
 $('balanceStrength').disabled=state.engine==='calibrated4'||$('balanceStrength').disabled;
 if(sharedLight&&sourceInfo.domain&&sharedLight.domain!==sourceInfo.domain&&!(!sharedLight.domain&&sourceInfo.rawMode4==='reference'))$('referenceStatus').textContent='Ljuskälla pausad · annan kamera eller RAW-import';
 if(state.useRollBase&&sharedBase&&sourceInfo.domain&&sharedBase.sourceDomain!==sourceInfo.domain&&!(!sharedBase.sourceDomain&&sourceInfo.rawMode4==='reference'))$('rollBaseStatus').textContent='Filmbas pausad · annan kamera eller RAW-import';
 const diag=sourceInfo.diagnostics4;if(diag)$('sourceStatus').textContent=sourceInfo.label+' · klippt i Rec.2020 (hela bilden): '+diag.clipped.map(v=>(100*v/diag.pixels).toFixed(2)+' %').join(' / ');
 const r=response4()||calibration?.beta4?.response;$('calibrationStatus4').textContent=!working?'Ingen bild inläst':state.engine!=='calibrated4'?'Jämförelseläge · Beta 4-kalibrering pausad':r?(state.useRollResponse4?'Gemensam rullkalibrering · ':'')+(r.kind==='two-neutral'?'Två neutrala ytor uppmätta':'Motivbaserad uppskattning · ingen uppmätt färgreferens')+(state.cropConfirmed?' · färgkurvor sparade':' · kontrollera filmrutan'):'Kalibrering saknas eller tillhör annan källa';
}
analyzeLevels=function(){
 analyzeBefore4();if(!workingPreview||!calibration)return;
 if(state.engine!=='calibrated4'){controls4();return;}
 let r=response4();
 if(!r){state.useRollResponse4=false;const measured=!state.noBase&&calibration.base?.measured;r=CC4.estimate(workingPreview,cropRegion,{base:measured||[1,1,1],light:measured?[1,1,1]:currentLight(),domain:domain4()});r.hasBase=!!measured;if(state.cropConfirmed)state.response4=r;}
 const explicit=explicitBase4(),rollMeasured=state.useRollResponse4&&calibration.base?.measured,b=state.noBase?[1,1,1]:explicit||rollMeasured||r.base;
 calibration.beta4=CC4.analyze(workingPreview,cropRegion,r,{base:b,light:!state.noBase&&(explicit||rollMeasured||r.hasBase)?[1,1,1]:currentLight()});
 config38=null;technicalCache38=null;controls4();saveCurrentFrame();
 $('levelsInfo').textContent=`${calibration.beta4.count} motivprov · gemensamt tonomfång${calibration.beta4.weak?' · lågt omfång':''} · `+(calibration.beta4.clipped.some(v=>v>.005)?'klippta källkanaler':'ingen tydlig kanalklippning');
};
configuration38=function(opts=state){const c=configurationBefore4(opts);if(opts.engine==='calibrated4'){c.kind='calibrated4';c.workingSpace=sourceInfo.colorSpace||'srgb';c.cal={...calibration,beta4:calibration.beta4};}return c;};
// Complete per-channel output tables are invalid for a hue-preserving RGB shoulder.
const tablesBefore4=technicalTables38;
technicalTables38=function(c){if(c.kind!=='calibrated4')return tablesBefore4(c);const a=c.cal.beta4,key='beta4:'+JSON.stringify([a.response.offset,a.response.span,a.base,a.light]);if(!technicalCache38||technicalCache38.key!==key)technicalCache38={key,value:NSPixelKernel.tables(NSPixelKernel.compile(c)),complete:false};return technicalCache38.value;};
const lookupBefore4=neutralLookup;
neutralLookup=function(opts,im){return opts.engine==='calibrated4'?null:lookupBefore4(opts,im);};
$('toneMode4').onchange=e=>{state.toneMode4=e.target.value==='reference'?'reference':'smooth';config38=null;saveCurrentFrame();persist();render();};
$('resetResponse4').onclick=()=>{if(!workingPreview)return;cancelPair4();state.response4=null;state.useRollResponse4=false;analyzeLevels();persist();render();setStatus('Färgkurvor uppskattade från den aktuella filmrutan.');};
$('saveResponse4').onclick=()=>{const r=calibration?.beta4?.response;if(!CC4.valid(r))return;sharedResponse4=JSON.parse(JSON.stringify(r));state.useRollResponse4=true;analyzeLevels();persist();render();setStatus('Rullkalibrering sparad. Använd på bilder från samma film och samma avfotografering.');};
$('useResponse4').onchange=e=>{if(e.target.checked&&(!CC4.valid(sharedResponse4)||sharedResponse4.domain!==domain4())){e.target.checked=false;setStatus('Rullkalibreringen tillhör en annan källa eller kamera.');return;}state.useRollResponse4=e.target.checked;analyzeLevels();persist();render();};
$('neutralPair4').onclick=()=>{if(!working||state.engine!=='calibrated4')return;if(neutralPair4){cancelPair4();return;}neutralSample39=false;sampleMode=false;neutralPair4=[];$('neutralPair4').textContent='Välj första neutrala ytan · klicka för att avbryta';setStatus('Välj en känd neutral yta. Välj sedan en annan neutral yta med tydligt annan ljushet.');};
$('preview').addEventListener('click',e=>{
 if(!neutralPair4||!working)return;e.stopImmediatePropagation();
 try{const p=imagePoint(e),r=cropRegion;if(p.x<r.x||p.x>r.x+r.w||p.y<r.y||p.y>r.y+r.h)throw Error('Välj neutrala ytor innanför filmrutan.');
 const ps=[],cx=Math.min(working.width-1,Math.floor(p.x*working.width)),cy=Math.min(working.height-1,Math.floor(p.y*working.height));
 for(let y=Math.max(0,cy-2);y<=Math.min(working.height-1,cy+2);y++)for(let x=Math.max(0,cx-2);x<=Math.min(working.width-1,cx+2);x++)ps.push(sourcePixel(working,x,y));
 const q=[0,1,2].map(k=>CE.quantile(ps.map(v=>v[k]),.5));
 if(q.some(v=>v<4/65535||v>=.98))throw Error('Provet är klippt eller för mörkt. Välj en annan yta.');
 if(!neutralPair4.length){neutralPair4.push(q);$('neutralPair4').textContent='Välj andra neutrala ytan · klicka för att avbryta';return;}
 const current=calibration.beta4,r4={...current.response,base:current.base,light:current.light};state.response4=CC4.fitNeutral(r4,neutralPair4[0],q);state.useRollResponse4=false;cancelPair4();analyzeLevels();persist();render();setStatus('Kanalrespons kalibrerad från två neutrala ytor. Kan sparas som rullkalibrering.');
 }catch(err){setStatus(err.message);}
},true);
for(const id of ['sample','neutralSample'])$(id).addEventListener('click',cancelPair4);
const chooseBefore4=chooseFrame;
chooseFrame=async function(i,opts){cancelPair4();try{return await chooseBefore4(i,opts);}finally{controls4();}};
const clearBefore4=$('clearQueue').onclick;$('clearQueue').onclick=()=>{if(rollLoading||exportBusy)return;cancelPair4();sharedResponse4=null;clearBefore4();controls4();};
const confirmBefore4=$('cropConfirm').onclick;$('cropConfirm').onclick=()=>{confirmBefore4();if(state.engine==='calibrated4'){analyzeLevels();render();}};
const engineBefore4=$('engineMode').onchange;$('engineMode').onchange=e=>{cancelPair4();engineBefore4(e);};
// Global preferences must not seed a different imported image with an old response.
state.response4=null;state.useRollResponse4=false;
try{if(!localStorage.getItem('filmlabb-default-engine4')){state.engine='calibrated4';localStorage.setItem('filmlabb-default-engine4','1');persist();}}catch{}
$('engineMode').value=state.engine;controls4();

$('rawMode4').onchange=async e=>{const mode=['reference','wide'].includes(e.target.value)?e.target.value:'protected';if(rollLoading||exportBusy){e.target.value=state.rawMode4;return;}state.rawMode4=mode;const raw=activeFrame>=0&&NSFileFormats.isRaw(roll[activeFrame].file.name);if(raw){state.response4=null;state.useRollResponse4=false;state.manualCalibration=null;state.manualBase=null;state.useRollBase=false;state.auto=true;}saveCurrentFrame();persist();if(raw)await chooseFrame(activeFrame,{force:true});else controls4();};
