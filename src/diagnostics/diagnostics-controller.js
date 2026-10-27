/* Presentation-only local download. No network, reanalysis or state writes. */
(() => {
'use strict';
const button=document.createElement('button');button.id='exportDiagnostics';button.className='btn';button.type='button';
FILMLABB_I18N.source(button,'Exportera bilddiagnostik (.json)');$('diagnostics3').append(button);
const hint=document.createElement('p');hint.className='hint';FILMLABB_I18N.source(hint,'Lokalt · endast sammanställda mätvärden, inga bilddata eller filnamn.');button.after(hint);
function update(){button.disabled=!working||rollLoading||exportBusy;}
const oldUI=updateCalibrationUI;updateCalibrationUI=function(...args){const r=oldUI(...args);update();return r;};
const oldChoose=chooseFrame;chooseFrame=async function(...args){try{return await oldChoose(...args);}finally{update();}};
const oldClear=$('clearQueue').onclick;$('clearQueue').onclick=()=>{oldClear();update();};
function report(){
 if(!working||rollLoading||exportBusy)throw Error('No image available');
 const snapshot=FILMLABB_BASE2.snapshot();
 return NSImageDiagnostics.build({image:working,config:configuration38(),info:sourceInfo,format:NSFileFormats.extension(roll[activeFrame]?.file?.name||''),rawBits:sourceInfo.rawMetadata?16:hires?.bits||(working.scale===255?8:null),accepted:snapshot.accepted,proposal:snapshot.proposal,rollReference:!!state.useRollBase2,analysisRegion:cropRegion,analysisSampling:state.analysisSampling,previewSampling:state.previewSampling||'nearest',preview:snapshot.preview,responseOrigin:snapshot.accepted?.responseLocked?'accepted-locked':state.useRollResponse4?'roll-response':state.response4?'saved-image-response':'scene-estimate'});
}
button.onclick=()=>{try{downloadBlob(new Blob([NSImageDiagnostics.serialize(report())],{type:'application/json'}),'filmlabb-diagnostics-v1.json');}catch{setStatus(FILMLABB_I18N.fromSource('Diagnostikexporten misslyckades.'));}};
globalThis.FILMLABB_DIAGNOSTICS=Object.freeze({report});update();
})();
