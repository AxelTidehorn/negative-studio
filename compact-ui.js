/* Presentation preferences are separate from film/project settings. */
(function(){
'use strict';
const advanced=document.getElementById('advancedSettings');if(!advanced)return;
const key='filmlabb-advanced-open-v1';try{advanced.open=localStorage.getItem(key)==='true';}catch{}
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
const style=document.createElement('style');style.textContent=`
.editor-panel .histogram-panel{margin-top:0}.editor-panel .adjustment-head{margin-top:16px}.editor-panel .sidebar-profile{margin-top:18px}.editor-panel .advanced-settings{margin-top:18px;border-top:1px solid var(--ns-border);padding-top:12px}.advanced-settings>summary{cursor:pointer;font-weight:600;padding:8px 0}.advanced-settings-body{padding-top:10px}.advanced-settings-body>.frame-tools{margin-bottom:12px}.frame-quick{display:flex;align-items:center;justify-content:space-between;gap:8px;flex:0 0 auto;min-height:0;padding:2px 4px;border:0}.frame-quick details{min-width:0;font-size:12px;flex:1 1 auto}.frame-quick summary{cursor:pointer;display:inline-flex;align-items:center;min-height:28px;padding:3px 9px;border:1px solid var(--ns-border);border-radius:6px;list-style:none;font-size:12px;font-weight:500}.frame-quick summary::-webkit-details-marker{display:none}.frame-quick summary::before{content:"▣";font-size:12px;opacity:.75;margin-right:6px}.frame-quick details[open]{align-self:stretch}.frame-quick details[open] summary{margin-bottom:5px}.frame-quick .toolrow{display:flex;gap:5px;flex-wrap:wrap;margin:3px 0}.frame-quick .btn{min-height:28px!important;padding:4px 8px!important;font-size:11px}.frame-quick #cropConfirm{flex:0 0 auto;font-size:12px}.frame-quick #cropConfirm[hidden]{display:none!important}.frame-quick .switch{display:inline-flex;align-items:center;margin:3px 12px 3px 0;font-size:11px}.frame-quick .switch input{margin-right:5px}@media(max-width:600px){main.workspace .frame-quick{padding:1px 3px!important;gap:5px}.frame-quick summary{min-height:26px;padding:2px 7px}.frame-quick .btn{min-height:27px!important;padding:3px 7px!important}.frame-quick .toolrow{gap:4px}.frame-quick .switch{margin:2px 8px 2px 0}}.active-settings-summary{padding:8px 0;border-bottom:1px solid var(--ns-border)}.advanced-settings-body h2{font-size:15px}.advanced-settings-body .sidebar-details{margin-top:10px}
#exportProgressPanel{position:fixed;z-index:100;left:50%;bottom:max(16px,env(safe-area-inset-bottom));transform:translateX(-50%);width:440px;max-width:calc(100vw - 24px);padding:14px 16px;box-sizing:border-box;background:var(--ns-panel,#172326);border:1px solid var(--ns-border,#64716e);border-radius:10px;box-shadow:0 8px 36px #0008}#exportProgressPanel[hidden]{display:none}#exportProgressPanel progress{display:block;width:100%;height:10px;accent-color:var(--ns-accent);margin:10px 0}#exportProgressPanel .export-top{display:flex;align-items:center;gap:10px;justify-content:space-between}#exportProgressPanel p{font-size:12px;margin:6px 0}#exportProgressPanel button{min-height:32px}
`;document.head.append(style);summary();
})();
