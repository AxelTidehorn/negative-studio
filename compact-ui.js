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
 frameQuick.classList.add('viewer-toolbar-row');
 frameQuick.setAttribute('data-density','compact');
}
if(imageControls)imageControls.classList.add('viewer-toolbar-row');
if(backendStatus)backendStatus.classList.add('ui-badge','ui-badge--engine');
if(zoomStatus)zoomStatus.classList.add('ui-meta-note');
if(frameOptions){
 frameOptions.classList.add('frame-quick-panel');
 frameOptions.addEventListener('toggle',()=>document.body.classList.toggle('frame-adjust-open',frameOptions.open));
 document.body.classList.toggle('frame-adjust-open',frameOptions.open);
}
if(cropConfirm){cropConfirm.classList.add('frame-confirm');cropConfirm.textContent='Bekräfta';}
if(cropStatus){cropStatus.classList.add('frame-status-inline');}

const style=document.createElement('style');style.textContent=`
body.filmlabb-ui-refresh{
 --ns-bg:#0f1519;
 --ns-panel:#182128;
 --ns-panel-2:#12191f;
 --ns-text:#edf2ef;
 --ns-muted:#9dadb0;
 --ns-border:#314048;
 --ns-btn:#202d35;
 --ns-btn-border:#465860;
 --ns-btn-text:#edf2ef;
 --ns-accent:#79a8a4;
 --ns-accent-ink:#102023;
 --ns-accent-soft:rgba(121,168,164,.16);
 --ns-accent-line:#a8cbc5;
 --ns-warm:#d79c62;
 --ns-warm-soft:rgba(215,156,98,.16);
 background:var(--ns-bg)!important;
 color:var(--ns-text)!important;
}
body.filmlabb-ui-refresh.light-theme{
 --ns-bg:#ecefe9;
 --ns-panel:#fafaf6;
 --ns-panel-2:#f3f5f0;
 --ns-text:#1a2529;
 --ns-muted:#627277;
 --ns-border:#ccd4d2;
 --ns-btn:#edf2ef;
 --ns-btn-border:#bcc8c8;
 --ns-btn-text:#223036;
 --ns-accent:#356b73;
 --ns-accent-ink:#f7fbfb;
 --ns-accent-soft:rgba(53,107,115,.12);
 --ns-accent-line:#4f8690;
 --ns-warm:#b87548;
 --ns-warm-soft:rgba(184,117,72,.12);
 background:var(--ns-bg)!important;
 color:var(--ns-text)!important;
}
body.filmlabb-ui-refresh,
body.filmlabb-ui-refresh main,
body.filmlabb-ui-refresh .workspace-toolbar,
body.filmlabb-ui-refresh .foot,
html:has(body.filmlabb-ui-refresh.light-theme),
html:has(body.filmlabb-ui-refresh.light-theme) body,
html:has(body.filmlabb-ui-refresh.light-theme) main{background:var(--ns-bg)!important;color:var(--ns-text)!important}
body.filmlabb-ui-refresh header,
body.filmlabb-ui-refresh .workspace-toolbar,
body.filmlabb-ui-refresh .panel,
body.filmlabb-ui-refresh .histogram-panel,
body.filmlabb-ui-refresh .picture,
body.filmlabb-ui-refresh .seg,
body.filmlabb-ui-refresh .frame,
body.filmlabb-ui-refresh .toolrow select,
body.filmlabb-ui-refresh .locale-control select,
body.filmlabb-ui-refresh .sidebar-profile>select,
body.filmlabb-ui-refresh select{
 background:var(--ns-panel)!important;
 color:var(--ns-text)!important;
 border-color:var(--ns-border)!important;
}
body.filmlabb-ui-refresh .picture,
body.filmlabb-ui-refresh .seg,
body.filmlabb-ui-refresh .frame,
body.filmlabb-ui-refresh .histogram-panel,
body.filmlabb-ui-refresh .toolrow select,
body.filmlabb-ui-refresh .locale-control select,
body.filmlabb-ui-refresh .sidebar-profile>select,
body.filmlabb-ui-refresh select{background:var(--ns-panel-2)!important}
body.filmlabb-ui-refresh .btn,
body.filmlabb-ui-refresh .workspace-toolbar .btn{
 background:linear-gradient(180deg,color-mix(in srgb,var(--ns-btn) 92%, white 8%),var(--ns-btn))!important;
 color:var(--ns-btn-text)!important;
 border:1px solid var(--ns-btn-border)!important;
 border-radius:11px!important;
 box-shadow:0 1px 0 rgba(255,255,255,.04) inset,0 1px 2px rgba(0,0,0,.15);
}
body.filmlabb-ui-refresh .btn:hover:not(:disabled),
body.filmlabb-ui-refresh summary:hover{border-color:var(--ns-accent)!important;box-shadow:0 0 0 1px var(--ns-accent-soft),0 3px 10px rgba(0,0,0,.12)}
body.filmlabb-ui-refresh .btn:disabled{opacity:.46;box-shadow:none}
body.filmlabb-ui-refresh .btn.primary,
body.filmlabb-ui-refresh .seg button.active{
 background:linear-gradient(180deg,color-mix(in srgb,var(--ns-accent) 90%, white 10%),var(--ns-accent))!important;
 border-color:var(--ns-accent)!important;
 color:var(--ns-accent-ink)!important;
 box-shadow:0 0 0 1px var(--ns-accent-soft),0 6px 18px rgba(0,0,0,.16);
}
body.filmlabb-ui-refresh .seg button{border-radius:9px!important}
body.filmlabb-ui-refresh .seg{padding:4px!important;border:1px solid var(--ns-border)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
body.filmlabb-ui-refresh .hint,
body.filmlabb-ui-refresh .status,
body.filmlabb-ui-refresh small,
body.filmlabb-ui-refresh .muted,
body.filmlabb-ui-refresh .foot,
body.filmlabb-ui-refresh .eyebrow,
body.filmlabb-ui-refresh .version{color:var(--ns-muted)!important}
body.filmlabb-ui-refresh .control output,
body.filmlabb-ui-refresh a,
body.filmlabb-ui-refresh .footer-links a{color:var(--ns-accent)!important}
body.filmlabb-ui-refresh input[type=range]{accent-color:var(--ns-accent)!important}
body.filmlabb-ui-refresh header{
 position:relative;
 padding:10px max(18px,env(safe-area-inset-left))!important;
 min-height:64px!important;
 border-bottom:1px solid var(--ns-border)!important;
 box-shadow:0 1px 0 rgba(255,255,255,.03);
 z-index:15;
}
body.filmlabb-ui-refresh header::after{
 content:'';position:absolute;left:0;right:0;bottom:0;height:1px;
 background:linear-gradient(90deg,var(--ns-accent-soft),transparent 75%);
}
body.filmlabb-ui-refresh .brand-logo{width:150px;max-height:42px;filter:brightness(0) invert(1) sepia(.12) hue-rotate(130deg) saturate(.7)}
body.filmlabb-ui-refresh.light-theme .brand-logo{filter:none}
body.filmlabb-ui-refresh .header-tools{gap:8px!important}
body.filmlabb-ui-refresh .locale-control,
body.filmlabb-ui-refresh .support-link{white-space:nowrap}
body.filmlabb-ui-refresh .workspace-toolbar{
 position:sticky;top:0;z-index:30;
 display:flex;align-items:center;gap:8px;
 min-height:48px!important;height:auto!important;
 padding:8px 10px!important;
 border-bottom:1px solid var(--ns-border)!important;
 background:color-mix(in srgb,var(--ns-bg) 88%, transparent)!important;
 backdrop-filter:blur(10px);
}
body.filmlabb-ui-refresh .workspace-toolbar .actions{display:flex;align-items:center;gap:6px!important;flex-wrap:wrap;margin:0!important}
body.filmlabb-ui-refresh .workspace-toolbar .workspace-toggle,
body.filmlabb-ui-refresh .workspace-toolbar .workspace-reset{min-width:36px}
body.filmlabb-ui-refresh .workspace-toolbar .fl-roll-indicator{
 margin-left:auto!important;padding:0 10px;height:32px;display:inline-flex;align-items:center;
 border:1px solid var(--ns-border);border-radius:999px;background:var(--ns-panel-2);max-width:220px;
}
body.filmlabb-ui-refresh main.workspace{
 gap:10px!important;padding:10px!important;
 min-height:var(--fl-workspace-height,calc(100dvh - 118px));
 height:var(--fl-workspace-height,calc(100dvh - 118px))!important;
 max-width:none!important;overflow:hidden!important;
}
body.filmlabb-ui-refresh .panel{border-radius:16px!important;padding:12px!important;box-shadow:0 10px 25px rgba(0,0,0,.12)}
body.filmlabb-ui-refresh .image-panel{gap:10px!important}
body.filmlabb-ui-refresh .viewer-toolbar-row,
body.filmlabb-ui-refresh .image-controls{
 border:1px solid var(--ns-border)!important;
 border-radius:14px!important;
 background:color-mix(in srgb,var(--ns-panel) 82%, var(--ns-panel-2))!important;
 padding:8px 10px!important;
 box-shadow:0 1px 0 rgba(255,255,255,.03) inset;
}
body.filmlabb-ui-refresh .frame-quick{
 display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:start;
 gap:10px!important;flex:0 0 auto;min-height:0;padding:8px 10px!important;border:1px solid var(--ns-border)!important;
}
body.filmlabb-ui-refresh .frame-quick details{min-width:0;display:block}
body.filmlabb-ui-refresh .frame-quick summary,
body.filmlabb-ui-refresh .frame-quick details>summary{
 list-style:none;display:inline-flex;align-items:center;gap:8px;
 min-height:36px;padding:8px 12px;border-radius:10px;
 border:1px solid var(--ns-btn-border)!important;background:var(--ns-btn)!important;color:var(--ns-btn-text)!important;
 font-size:12px;font-weight:650;letter-spacing:.01em;
}
body.filmlabb-ui-refresh .frame-quick summary::-webkit-details-marker{display:none}
body.filmlabb-ui-refresh .frame-quick summary::before{content:'▣';opacity:.8;font-size:12px;margin:0}
body.filmlabb-ui-refresh .frame-quick details[open] summary{margin-bottom:10px}
body.filmlabb-ui-refresh .frame-quick details[open] .toolrow{margin-bottom:8px}
body.filmlabb-ui-refresh .frame-quick .toolrow{display:flex;gap:7px;flex-wrap:wrap;margin:0}
body.filmlabb-ui-refresh .frame-quick .btn{min-height:34px!important;padding:7px 10px!important;font-size:12px!important}
body.filmlabb-ui-refresh .frame-confirm{min-width:116px;align-self:start}
body.filmlabb-ui-refresh .frame-quick .switch{display:flex;align-items:center;gap:8px;margin:0 14px 8px 0;font-size:12px;color:var(--ns-muted)}
body.filmlabb-ui-refresh .frame-quick .switch input{margin:0}
body.filmlabb-ui-refresh .image-controls{
 display:grid!important;grid-template-columns:auto minmax(190px,1fr) auto;align-items:center;
 gap:10px!important;min-height:0;height:auto!important;justify-content:stretch;
}
body.filmlabb-ui-refresh .image-controls .seg{margin:0!important;min-width:0;display:flex}
body.filmlabb-ui-refresh .image-controls .toolrow{display:flex!important;flex-wrap:wrap;justify-content:flex-end;min-width:0;gap:6px!important;margin:0!important}
body.filmlabb-ui-refresh .image-controls .toolrow .btn{min-height:34px!important;padding:7px 10px!important;font-size:12px!important;white-space:nowrap}
body.filmlabb-ui-refresh .image-controls #zoomStatus{grid-column:1 / -1;display:block!important;margin-top:2px;font-size:11px;color:var(--ns-muted)}
body.filmlabb-ui-refresh .ui-badge{
 display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 11px;border-radius:999px;
 border:1px solid var(--ns-border);background:var(--ns-panel-2);color:var(--ns-muted)!important;
 font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
}
body.filmlabb-ui-refresh .ui-badge--engine::before{content:'Motor';font-size:10px;opacity:.72;margin-right:7px;letter-spacing:.06em}
body.filmlabb-ui-refresh .ui-meta-note{padding-left:2px}
body.filmlabb-ui-refresh .queue-panel,.editor-panel{overflow:auto!important}
body.filmlabb-ui-refresh .queue-heading{padding:2px 4px 10px!important;border-bottom:1px solid var(--ns-border)}
body.filmlabb-ui-refresh .queue-heading h2{font-size:13px!important}
body.filmlabb-ui-refresh .frame{border-radius:12px!important;border-width:1px!important;padding:4px!important}
body.filmlabb-ui-refresh .frame.active{box-shadow:0 0 0 1px var(--ns-accent-soft),0 0 0 1px var(--ns-accent) inset}
body.filmlabb-ui-refresh .histogram-panel{padding:10px 10px 6px!important;border-radius:14px!important}
body.filmlabb-ui-refresh .advanced-settings,
body.filmlabb-ui-refresh details,
body.filmlabb-ui-refresh .compact-separator{border-top-color:var(--ns-border)!important}
body.filmlabb-ui-refresh .fl-diagnostics summary{color:var(--ns-muted)!important}
body.filmlabb-ui-refresh .foot{max-width:none!important;padding:14px 18px 22px!important;margin:0!important}
body.filmlabb-ui-refresh .footer-links{padding-top:8px;border-top:1px solid var(--ns-border)}
body.filmlabb-ui-refresh .footer-links nav{gap:14px}
body.filmlabb-ui-refresh .picture{border-radius:16px!important;min-height:0!important;overflow:hidden!important}
body.filmlabb-ui-refresh .picture canvas{max-height:100%!important}
body.filmlabb-ui-refresh .frame-status-inline{font-size:12px}
@media (max-width:980px){
 body.filmlabb-ui-refresh .image-controls{grid-template-columns:1fr;align-items:stretch}
 body.filmlabb-ui-refresh .image-controls .toolrow{justify-content:flex-start}
 body.filmlabb-ui-refresh .frame-quick{grid-template-columns:1fr}
 body.filmlabb-ui-refresh .frame-confirm{justify-self:start}
}
@media (max-width:760px){
 body.filmlabb-ui-refresh header{padding:8px max(12px,env(safe-area-inset-left))!important;min-height:58px!important}
 body.filmlabb-ui-refresh .brand-logo{width:134px;max-width:34vw}
 body.filmlabb-ui-refresh .header-tools{gap:6px!important;flex-wrap:nowrap!important;width:auto!important}
 body.filmlabb-ui-refresh .header-tools .btn{min-height:32px!important;padding:5px 8px!important;font-size:12px!important}
 body.filmlabb-ui-refresh .workspace-toolbar{padding:6px!important;gap:6px!important;flex-wrap:wrap!important;top:0}
 body.filmlabb-ui-refresh .workspace-toolbar .actions{width:100%}
 body.filmlabb-ui-refresh main.workspace{gap:6px!important;padding:6px!important;min-height:var(--fl-workspace-height-mobile,auto);height:auto!important;overflow:visible!important}
 body.filmlabb-ui-refresh .panel{padding:10px!important;border-radius:14px!important}
 body.filmlabb-ui-refresh .frame-quick,
 body.filmlabb-ui-refresh .image-controls{padding:8px!important;border-radius:13px!important}
 body.filmlabb-ui-refresh .frame-quick .btn,
 body.filmlabb-ui-refresh .image-controls .toolrow .btn{min-height:32px!important;padding:6px 9px!important}
 body.filmlabb-ui-refresh .image-controls .seg button{min-height:32px;padding:6px 10px!important}
 body.filmlabb-ui-refresh .ui-badge{min-height:30px;font-size:10px}
 body.filmlabb-ui-refresh .image-controls #zoomStatus{font-size:10px}
 body.filmlabb-ui-refresh .workspace-toolbar .fl-roll-indicator{order:3;margin-left:0!important;max-width:100%;width:100%}
}
`;document.head.append(style);summary();

})();
