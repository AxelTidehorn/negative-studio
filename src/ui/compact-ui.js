/* Presentation preferences are separate from film/project settings. */
(function(){
'use strict';
const advanced=document.getElementById('advancedSettings');if(!advanced)return;
const key='filmlabb-advanced-open-v2';document.body.classList.add('filmlabb-ui-refresh');try{advanced.open=localStorage.getItem(key)==='true';}catch{}
advanced.addEventListener('toggle',()=>{if(!advanced.open)document.getElementById('adjustmentPanel').scrollTop=0;try{localStorage.setItem(key,String(advanced.open));}catch{}});
const updateBefore=updateCalibrationUI;
function summary(){
 const items=[];
 if(state.engine!=='calibrated4')items.push('Jämförelsemotor');
 if(sourceInfo.colorSpace==='rec2020')items.push('Rec.2020-experiment');
 if(working?.flatField)items.push('Belysningskorrigering aktiv');
 else if(state.useFlatField)items.push('Belysningskorrigering pausad');
 if(state.useRollResponse4)items.push(response4()?'Rullkalibrering aktiv':'Rullkalibrering pausad');
 if(state.useRollBase)items.push(calibrationBase()?'Gemensam filmbas aktiv':'Gemensam filmbas pausad');
 if(!state.auto&&state.manualCalibration)items.push('Manuell filmbas');
 if(sharedLight)items.push(currentLight().some(v=>v!==1)?'Ljuskällereferens aktiv':'Ljuskällereferens tillgänglig');
 const p=document.getElementById('activeSettingsSummary');p.textContent=items.join(' · ');p.hidden=!items.length;
}
updateCalibrationUI=function(...args){const r=updateBefore(...args);summary();return r;};
// Gamma is a deeper tone control; the everyday controls stay together above profiles.
const gamma=document.getElementById('gamma')?.closest('.control'),deep=document.getElementById('controls');if(gamma&&deep)deep.prepend(gamma);

const frameQuick=document.querySelector('.frame-quick');
const imageControls=document.querySelector('.image-controls');
const backendStatus=document.getElementById('previewBackendStatus');
const zoomStatus=document.getElementById('zoomStatus');
const frameOptions=document.getElementById('frameOptions');
const cropConfirm=document.getElementById('cropConfirm');
const cropStatus=document.getElementById('cropStatus');
if(frameQuick){
 // Keep all existing IDs, event handlers and crop state; move only the controls.
 const editor=document.getElementById('adjustmentPanel');
 const advanced=document.getElementById('advancedSettings');
 if(editor&&advanced){
  const frameGroup=document.createElement('details');
  frameGroup.id='frameSettingsGroup';
  frameGroup.className='frame-settings-group';
  const title=document.createElement('summary');
  title.textContent='Filmruta · analysområde';
  frameGroup.append(title,frameQuick);
  if(cropStatus)frameGroup.append(cropStatus);
  const queueOption=document.createElement('div');queueOption.className='queue-crop-option';
  const cropLabel=document.getElementById('cropExport')?.closest('label');
  if(cropLabel){cropLabel.lastChild.textContent=' Hela kön: beskär till filmrutan';queueOption.append(cropLabel);const help=document.createElement('p');help.className='hint';help.textContent='Av: behåll synliga filmkanter. Analysen använder fortfarande filmrutan.';queueOption.append(help);frameGroup.append(queueOption);}
  editor.insertBefore(frameGroup,editor.firstElementChild);
  const geometryTools=document.getElementById('geometryTools');if(geometryTools)editor.insertBefore(geometryTools,advanced);
  const confirm=cropConfirm;
  if(confirm){
   const markPending=()=>{title.textContent=typeof working!=='undefined'&&working&&!confirm.hidden?'Filmruta · kontrollera':'Filmruta · analysområde';};
   // Signal uncertainty without replacing the final export view with edit context.
   new MutationObserver(markPending).observe(confirm,{attributes:true,attributeFilter:['hidden']});markPending();
  }
 }
 frameQuick.classList.add('viewer-toolbar-row');
 frameQuick.setAttribute('data-density','compact');
}
if(imageControls)imageControls.classList.add('viewer-toolbar-row');
if(backendStatus){
 backendStatus.classList.add('ui-badge','ui-badge--engine');
 const engineInfo=document.querySelector('#advancedSettings .frame-tools');
 if(engineInfo){
  const info=document.createElement('div');
  info.className='hint engine-technical-status';
  info.append('Förhandsvisning: ',backendStatus);
  engineInfo.append(info);
 }
}
if(zoomStatus)zoomStatus.classList.add('ui-meta-note');
if(frameOptions){
 frameOptions.classList.add('frame-quick-panel');
 frameOptions.addEventListener('toggle',()=>document.body.classList.toggle('frame-adjust-open',frameOptions.open));
 document.body.classList.toggle('frame-adjust-open',frameOptions.open);
}
if(cropConfirm){cropConfirm.classList.add('frame-confirm');cropConfirm.textContent='Bekräfta';}
if(cropStatus){cropStatus.classList.add('frame-status-inline');}

summary();

})();
