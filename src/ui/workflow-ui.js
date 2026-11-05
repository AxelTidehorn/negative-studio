/* UI/UX 3: move existing nodes, preserving controller ownership and project state. */
(() => {
'use strict';
const oldTechnical=$('rawMode4').closest('details');let lastTool3=null;
const panel=$('adjustmentPanel'),t=(el,s)=>FILMLABB_I18N.source(el,s);
function details(id,title,parent){const d=document.createElement('details');d.id=id;const s=document.createElement('summary');t(s,title);d.append(s);parent.append(d);return d;}
function move(id,parent){const el=$(id);if(el)parent.append(el);return el;}
function field(id,parent){const el=$(id);if(!el)return;const label=document.querySelector(`label[for="${id}"]`)||el.closest('label');if(label)parent.append(label);if(!label?.contains(el))parent.append(el);}
const advanced=$('advancedSettings');t(advanced.querySelector('summary'),'Avancerad bildbehandling');
const diagnostic=details('diagnostics3','Experiment och diagnostik',advanced);diagnostic.className='sidebar-details';
for(const id of ['colorMode4','toneMode4'])field(id,diagnostic);
const backend=$('previewBackend');if(backend){field('previewBackend',diagnostic);}
for(const id of ['sourceStatus','previewBackendStatus','previewBackendInfo','calibrationStatus4','activeSettingsSummary'])move(id,diagnostic);
const raw=details('rawSettings3','RAW-avkodning och källfärgrymd',diagnostic);raw.className='sidebar-details';
const rawHint=$('rawMode4').nextElementSibling;field('rawMode4',raw);if(rawHint?.matches('p'))raw.append(rawHint);
const technical=details('technicalResponse3','Teknisk filmrespons',advanced);
for(const id of ['neutralPair4','resetResponse4','saveResponse4'])move(id,technical);
technical.append($('useResponse4').closest('label'));
const source=$('flatFieldFile').closest('fieldset');source.parentElement.closest('details').open=false;
t(source.querySelector('legend'),'Ojämn belysning');t($('clearReference'),'Ta bort ljuskällereferens');
const tiff=$('tiffEncoding').closest('label');
const calibrationSection=document.createElement('details');calibrationSection.id='calibration3';calibrationSection.className='tool-section';const heading=document.createElement('summary');t(heading,'Filmbas och kalibrering');calibrationSection.append(heading);
$('imageAdjustments').after(calibrationSection);move('base2Panel',calibrationSection);$('base2Panel').removeAttribute('data-i18n-ignore');$('base2Panel').querySelector('h3').hidden=true;$('base2Panel').querySelector('p').hidden=true;
// The technical analysis frame belongs to calibration. Rotation/crop tools are
// already in the floating image toolbar; keep the numeric fine controls in Advanced.
move('frameSettingsGroup',calibrationSection);
move('geometryTools',advanced);
// Retain the existing summary output (#rotationSummary): it is updated by geometry-ui.js.
// Replacing summary.textContent here would detach that live angle indicator.
// Creative profiles belong to the everyday photographic workflow, ahead of calibration and geometry.
$('imageAdjustments').after($('creativeProfiles'));
const adjustments=$('imageAdjustments');adjustments.querySelector('summary').after(adjustments.querySelector('.histogram-panel'));
for(const [title,ids]of [['Exponering och ton',['exposure','contrast','highlights','shadows']],['Färg',['temperature','tint','saturation','vibrance']]]){
 const group=document.createElement('section');group.className='adjustment-group3';const h=document.createElement('h3');t(h,title);group.append(h);$('simpleControls').append(group);for(const id of ids)group.append($(id).closest('.control'));
}
const resetHint=document.createElement('p');resetHint.className='hint';t(resetHint,'Dubbeltryck på ett reglage för att återställa det.');$('reset').after(resetHint);
const sampleDetails=details('sampleDetails3','Prov och godkännande',$('base2Panel'));move('base2Status',sampleDetails);
const baseSummary=document.createElement('p');baseSummary.id='baseSummary3';baseSummary.className='status';baseSummary.setAttribute('role','status');$('base2Panel').prepend(baseSummary);
for(const id of ['base2Stats','base2Compare','base2Preview','base2Accept','base2Cancel','base2Undo','base2Auto'])move(id,sampleDetails);
const rollDetails=details('rollCalibration3','Filmrullens referens',$('base2Panel'));
field('base2Session',rollDetails);for(const id of ['shareBase','clearRollBase','rollBaseStatus'])move(id,rollDetails);rollDetails.append($('useRollBase').closest('label'));
oldTechnical.hidden=true;move('base2ResponseLock',technical);move('base2Lock',$('base2Panel'));
move('advanced',advanced);t($('advanced').querySelector('summary'),'Äldre kalibrering och nivåer');
const legacy=details('legacyBase3','Äldre filmbasverktyg',$('advanced'));
for(const id of ['auto','sample','recalc','noBase','baseInfo']){const el=$(id);legacy.append(el.closest('label')||el);}
// Primary image tools remain visible; exact angle/reset controls retain their IDs.
const toolbar=document.createElement('div');toolbar.id='imageTools3';toolbar.className='toolrow';toolbar.setAttribute('role','toolbar');t(toolbar,'Bildverktyg');toolbar.textContent='';toolbar.setAttribute('aria-label',FILMLABB_I18N.fromSource('Bildverktyg'));
$('picture').append(toolbar);
for(const id of ['rotateLeft','rotateRight','straighten','compositionEdit','geometryDone'])move(id,toolbar);
const grid=$('thirdsGrid').closest('label');toolbar.append(grid);const gridText=[...grid.childNodes].find(n=>n.nodeType===3);if(gridText)gridText.nodeValue=' Rutnät';$('thirdsGrid').setAttribute('aria-label',FILMLABB_I18N.fromSource('Tredjedelsrutnät'));for(const id of ['rotationReset','compositionReset'])move(id,toolbar);
// Session-only visibility, independent of geometry/tool state and project settings.
let toolsHidden3=false;
const hideTools=document.createElement('button');hideTools.id='hideImageTools';hideTools.className='btn';hideTools.type='button';
const showTools=document.createElement('button');showTools.id='showImageTools';showTools.className='btn';showTools.type='button';showTools.setAttribute('aria-controls','imageTools3');$('picture').append(showTools);toolbar.prepend(hideTools);
function toolsVisibility3(){toolbar.hidden=toolsHidden3;showTools.hidden=!toolsHidden3;showTools.setAttribute('aria-expanded',String(!toolsHidden3));t(hideTools,'Dölj');hideTools.setAttribute('aria-label',FILMLABB_I18N.fromSource('Dölj bildverktyg'));hideTools.title=FILMLABB_I18N.fromSource('Dölj bildverktyg');t(showTools,'Visa bildverktyg');}
hideTools.onclick=()=>{toolsHidden3=true;toolsVisibility3();showTools.focus();};showTools.onclick=()=>{toolsHidden3=false;toolsVisibility3();hideTools.focus();};
// Keep retired engine options only while an older project's frame uses one.
// The render/export recipes remain untouched; regular users see three choices.
const engineSelect=$('engineMode');
const retiredEngines=new Map(['curve3','density3','matrix3'].map(id=>[id,engineSelect.querySelector('option[value="'+id+'"]')]));
function syncRetiredEngineOptions(){
 for(const [id,option] of retiredEngines){
  if(!option)continue;
  if(state.engine===id){if(!option.isConnected)engineSelect.insertBefore(option,engineSelect.querySelector('option[value="v2"]'));}
  else option.remove();
 }
 if(retiredEngines.has(state.engine))engineSelect.value=state.engine;
}
const methods={log39:'Original · tidigare kanalnormalisering',calibrated4:'Standard · sparad färgrespons och separat tonomfång',curve3:'Curve · mjuk kurvform',density3:'Density · gemensam densitetston',matrix3:'Matrix · begränsad statistisk färgtransform',v2:'V2 · fryst filmrespons och separat positiv återgivning'};
const description=document.createElement('p');description.id='methodDescription3';description.className='hint';description.setAttribute('aria-live','polite');$('engineMode').closest('.field').after(description);
const labels={rotateLeft:'Rotera 90° åt vänster',rotateRight:'Rotera 90° åt höger',compositionEdit:'Beskär komposition',compositionReset:'Återställ kompositionsbeskärning',cropReset:'Återställ teknisk filmruta'};
const shortNames={rotateLeft:'90° vänster',rotateRight:'90° höger',compositionEdit:'Beskär',compositionReset:'Återställ komposition'};t($('straighten'),'Räta upp');$('straighten').setAttribute('aria-label',FILMLABB_I18N.fromSource('Räta upp med linje'));
for(const [id,s]of Object.entries(labels)){t($(id),shortNames[id]||s);$(id).setAttribute('aria-label',FILMLABB_I18N.fromSource(s));$(id).title=FILMLABB_I18N.fromSource(s);}
t(document.querySelector('label[for="engineMode"]'),'Konverteringsmetod');t($('imageAdjustments').querySelector('summary'),'Bildjusteringar');
const creativeHint=document.createElement('p');creativeHint.className='hint';t(creativeHint,'Kreativ återgivning · ingen uppmätt filmprofil');$('creativeProfiles').append(creativeHint);
// Five existing groups, with one opaque content surface each. Move the live
// controls; never clone them or bind a second set of image-control handlers.
const cards=['imageAdjustments','creativeProfiles','calibration3','advancedSettings','exportProject'];
const cardStatus=new Map();
for(const id of cards){
 const card=$(id),summary=card.querySelector(':scope > summary');
 card.classList.add('tool-card');card.open=id==='imageAdjustments';
 const title=document.createElement('span');title.className='card-title';
 while(summary.firstChild)title.append(summary.firstChild);
 const status=document.createElement('span');status.className='card-status';status.id=id+'Summary';
 summary.append(title,status);cardStatus.set(id,status);
 const body=card.querySelector(':scope > .advanced-settings-body, :scope > .export-body')||document.createElement('div');
 body.classList.add('tool-card-body');
 for(const node of [...card.childNodes])if(node!==summary&&node!==body)body.append(node);
 card.append(body);
}
const tr=s=>FILMLABB_I18N.fromSource(s);
function cardSummaries(){
 const number=(v,d=0)=>new Intl.NumberFormat(FILMLABB_I18N.get(),{maximumFractionDigits:d}).format(v);
 const signed=(v,d=0)=>(v>0?'+':'')+number(v,d);
 const changes=controls.filter(([id,,,,,neutral])=>Number.isFinite(state[id])&&Math.abs(state[id]-neutral)>1e-8&&
  !['balanceStrength','redSlope','blueSlope'].includes(id)&&!(id==='vibrance'&&NSEditing2.version(state.editVersion)!==2))
  .map(([id,label,,,,,unit])=>tr(label)+' '+signed(state[id],unit==='×'?2:id==='exposure'?2:unit===''&&['shadow','highlight'].includes(id)?3:0)+unit);
 function write(id,items,fallback){
  const all=items.length?items:[tr(fallback)],el=cardStatus.get(id),text=all.slice(0,3).join(' · ')+(all.length>3?' …':'');
  // No repeated DOM writes during slider/GPU updates and no image analysis.
  if(el.textContent!==text)el.textContent=text;
  const full=all.join(' · ');if(el.title!==full)el.title=full;
 }
 write('imageAdjustments',changes,'Inga manuella justeringar');
 const profile=rollShared.profile,print=rollShared.print;
 const profiles=profile&&profile!=='generic'?[tr($('filmProfile').selectedOptions[0]?.textContent||filmProfiles[profile]?.label||profile),number(rollShared.strength*100)+' %']:[];
 if(print&&print!=='neutral')profiles.push(tr($('printStyle').selectedOptions[0]?.textContent||printStyles[print]?.label||print));
 write('creativeProfiles',profiles,'Ingen kreativ profil');
 // Use the calibration owner's compatibility-filtered accepted reference, not
 // a candidate, lock checkbox, or the mere presence of a saved recipe.
 const snap=globalThis.FILMLABB_BASE2?.snapshot(),accepted=snap?.accepted;
 const baseItems=snap?.preview?[tr('Förhandsvisning av förslag · inte godkänt')]:accepted?
  [tr(state.useRollBase2?'Rullreferens':accepted.measurement.kind.startsWith('manual')?'Manuell referens':'Automatisk referens'),tr('Godkänd')]:[tr(baseSummary.textContent)];
 if(working&&state.engine==='v2'&&state.v2Recipe?.base?.origin==='prior')baseItems.splice(0,baseItems.length,tr('Antagen filmbas · ej uppmätt'));
 write('calibration3',baseItems,'Filmbas saknas');
 const advancedItems=[],fine=roll[activeFrame]?.geometry?.rotation?.fineDegrees||0;
 if(fine)advancedItems.push(tr('Finrotation')+' '+signed(fine,2)+'°');
 if(state.rotation)advancedItems.push(tr('Rotation')+' '+number(state.rotation)+'°');
 if(working?.flatField)advancedItems.push(tr('Belysningskorrigering aktiv'));
 else if(state.useFlatField)advancedItems.push(tr('Belysningskorrigering pausad'));
 if(state.useRollResponse4)advancedItems.push(tr(response4()?'Rullkalibrering aktiv':'Rullkalibrering pausad'));
 if(sharedLight)advancedItems.push(tr(currentLight().some(v=>v!==1)?'Ljuskällereferens aktiv':'Ljuskällereferens tillgänglig'));
 if(!state.autoLevels)advancedItems.push(tr('Manuellt tonomfång'));
 write('advancedSettings',advancedItems,'Standardinställningar');
 // There is no exclusive export-format setting: both real export buttons are
 // available. State both formats rather than inventing a selected TIFF/JPEG mode.
 write('exportProject',[state.jpegSize==='safe'?tr('JPEG · högst 12 megapixel'):tr('JPEG · originalstorlek'),tr('TIFF 16-bit · full upplösning'),...(rollShared.cropExportToFrame?[tr('Beskär till filmrutan')]:[])],'Standardinställningar');
}
const valuesBefore=updateValues;
updateValues=function(...args){const result=valuesBefore(...args);cardSummaries();return result;};
for(const id of ['filmProfile','profileStrength','printStyle','jpegSize','cropExport']){
 for(const event of ['input','change'])$(id).addEventListener(event,cardSummaries);
}
const icons={import:'M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6',export:'M12 15V3m-4 4 4-4 4 4M4 15v6h16v-6',queue:'M3 4h18v4H3zm0 6h18v4H3zm0 6h18v4H3z',settings:'M4 7h16M4 17h16M8 3v8m8 2v8',zoom:'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12m5 11 6 6',frame:'M3 8V3h5m8 0h5v5m0 8v5h-5M8 21H3v-5',sample:'m15 3 6 6-4 4-6-6zm-4 4-8 8v6h6l8-8',check:'m4 12 5 5L20 6'};
for(const [selector,name]of [['label[for="imageFile"]','import'],['#export','export'],['#exportTiff','export'],['#zoomIn','zoom'],['#zoomOut','zoom'],['#zoomReset','frame'],['#cropAuto','frame'],['#base2Region','sample'],['#base2Accept','check'],['#base2Enable','sample']]){const el=document.querySelector(selector);if(!el)continue;el.classList.add('ui3-icon');const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[name]}"/></svg>`;el.style.setProperty('--tool-icon',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);}
function localizeBase(){for(const id of ['base2Status','base2Preview','base2Lock','base2ResponseLock','base2Cancel','base2Accept','base2Undo','base2Auto']){const el=$(id);if(el.textContent!==FILMLABB_I18N.fromSource(el.textContent))t(el,el.textContent);}}
function baseState(){
 localizeBase();const snap=globalThis.FILMLABB_BASE2?.snapshot(),a=snap?.accepted;
 let label=working?'Ingen separat filmbasreferens godkänd':'Importera en bild för att analysera filmbasen';
 if(a)label=state.useRollBase2?'Rullreferens':a.measurement.kind.startsWith('manual')?'Manuellt godkänd':'Automatisk referens';
 else if(snap?.proposal)label=snap.proposal.measurement.status==='missing'?'Filmbas saknas':'Kontrollera kandidaten';
 else if(state.filmBaseVersion===2&&(state.acceptedCalibration2||state.useRollBase2))label='Referens pausad';
 else if(state.filmBaseVersion!==2&&calibration?.base?.measured)label=state.useRollBase?'Rullreferens':String(calibration.base.kind||'').startsWith('manual')?'Manuellt godkänd':'Automatisk referens';
 t(baseSummary,label);return snap;
}
function refresh(){
 syncRetiredEngineOptions();
 const snap=baseState();
 for(const option of $('engineMode').options)if(methods[option.value])t(option,({log39:'Original',calibrated4:'Standard',curve3:'Curve',density3:'Density',matrix3:'Matrix',v2:'V2 · experimentell'})[option.value]);
 t(description,(retiredEngines.has(state.engine)?'Äldre projektmotor · ':'')+(methods[state.engine]||'Äldre projekt'));
 const model=roll[activeFrame]?.geometry;$('rotationReset').hidden=!(state.rotation||model?.rotation?.fineDegrees);$('compositionReset').hidden=!model?.compositionCrop;
 const active=globalThis.FILMLABB_GEOMETRY?.mode();toolbar.dataset.mode=active||'view';showTools.dataset.mode=active||'view';toolsVisibility3();
 for(const [id,mode]of [['straighten','straighten'],['compositionEdit','composition']])$(id).setAttribute('aria-pressed',String(active===mode));
 if(active!==lastTool3){if(active==='straighten'||active==='composition'){
  $('geometryTools').open=true;
  // Scroll only the editor on tablets/desktops; keep direct manipulation in view.
  if(advanced.open&&matchMedia('(min-width:761px)').matches){const b=$('geometryTools').getBoundingClientRect(),p=panel.getBoundingClientRect();if(b.bottom>p.bottom||b.top<p.top)panel.scrollTop+=b.top-p.top;}
 }lastTool3=active;}
 $('geometryTools').hidden=active==='base';
 $('base2Lock').hidden=!snap?.accepted;
 const v2=state.filmBaseVersion===2;legacy.hidden=v2;
 t($('base2Enable'),'Analysera automatiskt');t($('base2Region'),snap?.tool?'Avsluta provverktyg':'Välj filmbas manuellt');
 // A review panel is useful only for an actual proposal, active sample tool or undo.
 // Keep all original controls/bindings intact; this is presentation only.
 const proposal=snap?.proposal,reviewActive=!!proposal||!!snap?.tool;
 const canUndo=!$('base2Undo').disabled;
 sampleDetails.hidden=!reviewActive&&!canUndo;
 if(reviewActive||canUndo)sampleDetails.open=true;
 $('base2Status').hidden=!reviewActive;
 $('base2Stats').hidden=!reviewActive||!$('base2Stats').textContent;
 $('base2Compare').hidden=!reviewActive||!$('base2Compare').textContent;
 for(const id of ['base2Preview','base2Accept','base2Cancel','base2Auto'])$(id).hidden=!reviewActive;
 $('base2Undo').hidden=!canUndo;
 cardSummaries();
 const isRaw=!!working&&NSFileFormats.isRaw(roll[activeFrame]?.file?.name||'');raw.hidden=!isRaw;
 tiff.hidden=!working||!(/\.tiff?$/i.test(roll[activeFrame]?.file?.name||''))||!!hires?.icc;
}
const ui=updateCalibrationUI;updateCalibrationUI=function(...a){const r=ui(...a);refresh();return r;};
$('engineMode').addEventListener('change',refresh);
new MutationObserver(refresh).observe($('rotationSummary'),{childList:true,subtree:true});
new MutationObserver(refresh).observe($('geometryHint'),{childList:true,subtree:true});
new MutationObserver(refresh).observe($('base2Status'),{childList:true});
$('filmProfile').setAttribute('aria-label',FILMLABB_I18N.fromSource('Kreativ profil'));
window.addEventListener('filmlabb:language',refresh);
refresh();
})();
