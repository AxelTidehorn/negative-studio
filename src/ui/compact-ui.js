/* Panel presentation only; the actual controls keep their IDs and handlers. */
(() => {
'use strict';
const advanced=$('advancedSettings'),key='filmlabb-advanced-open-v2';
try{advanced.open=localStorage.getItem(key)==='true';}catch{}
advanced.addEventListener('toggle',()=>{try{localStorage.setItem(key,String(advanced.open));}catch{}});
for(const id of ['gamma','shadow','highlight']){const control=$(id).closest('.control');if(control)$('toneFineControls').append(control);}
const everyday=['exposure','contrast','highlights','shadows','temperature','tint','saturation'];
for(const id of everyday){const control=$(id).closest('.control');if(control)$('simpleControls').append(control);}
function source(el,text){if(globalThis.FILMLABB_I18N)FILMLABB_I18N.source(el,text);else el.textContent=text;}
const frameTitle=$('frameSettingsGroup').querySelector('summary');
function pending(){source(frameTitle,working&&!$('cropConfirm').hidden?'Filmruta · kontrollera':'Filmruta · analysområde');}
new MutationObserver(pending).observe($('cropConfirm'),{attributes:true,attributeFilter:['hidden']});
const updateBefore=updateCalibrationUI;
function summary(){
 const items=[];
 if(state.engine!=='calibrated4')items.push(({log39:'Original',curve3:'Curve',density3:'Density',matrix3:'Matrix'})[state.engine]||'Äldre projekt');
 if(sourceInfo.colorSpace==='rec2020')items.push('Rec.2020-experiment');
 if(working?.flatField)items.push('Belysningskorrigering aktiv');else if(state.useFlatField)items.push('Belysningskorrigering pausad');
 if(state.useRollResponse4)items.push(response4()?'Rullkalibrering aktiv':'Rullkalibrering pausad');
 if(state.useRollBase)items.push(calibrationBase()?'Gemensam filmbas aktiv':'Gemensam filmbas pausad');
 if(!state.auto&&state.manualCalibration)items.push('Manuell filmbas');
 if(sharedLight)items.push(currentLight().some(v=>v!==1)?'Ljuskällereferens aktiv':'Ljuskällereferens tillgänglig');
 source($('activeSettingsSummary'),items.join(' · '));$('activeSettingsSummary').hidden=!items.length;refreshProfileInfo();pending();
}
updateCalibrationUI=function(...args){const r=updateBefore(...args);summary();return r;};
const oldDisplay=setDisplay;
function tabs(){for(const [id,value]of [['tabPos','positive'],['tabNeg','negative'],['tabSplit','split']]){$(id).setAttribute('aria-pressed',String(display===value));}}
setDisplay=function(...args){const r=oldDisplay(...args);tabs();return r;};
const oldRollUI=refreshRollUI;
refreshRollUI=function(...args){const r=oldRollUI(...args);$('filmstrip').querySelectorAll('.frame').forEach((el,i)=>{el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-current',String(i===activeFrame));el.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target===el){e.preventDefault();chooseFrame(i);}};});return r;};
for(const label of document.querySelectorAll('label[for]'))if($(label.htmlFor)?.type==='file'){label.tabIndex=0;label.setAttribute('role','button');label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$(label.htmlFor).click();}};}
const oldHistogram=drawHistogram38;let lastBins=null;
drawHistogram38=function(bins){lastBins=bins;return oldHistogram(bins);};
window.addEventListener('filmlabb:appearance',()=>{if(lastBins)oldHistogram(lastBins);});
summary();tabs();
})();
