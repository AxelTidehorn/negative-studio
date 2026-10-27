/* UI/UX 3: move existing nodes, preserving controller ownership and project state. */
(() => {
'use strict';
const oldTechnical=$('rawMode4').closest('details');
const panel=$('adjustmentPanel'),t=(el,s)=>FILMLABB_I18N.source(el,s);
function details(id,title,parent){const d=document.createElement('details');d.id=id;const s=document.createElement('summary');t(s,title);d.append(s);parent.append(d);return d;}
function move(id,parent){const el=$(id);if(el)parent.append(el);return el;}
function field(id,parent){const el=$(id);if(!el)return;const label=document.querySelector(`label[for="${id}"]`)||el.closest('label');if(label)parent.append(label);if(!label?.contains(el))parent.append(el);}
const advanced=$('advancedSettings');t(advanced.querySelector('summary'),'Avancerad bildbehandling');
const diagnostic=details('diagnostics3','Experiment och diagnostik',panel);diagnostic.className='sidebar-details';
for(const id of ['colorMode4','toneMode4'])field(id,diagnostic);
const backend=$('previewBackend');if(backend){field('previewBackend',diagnostic);}
for(const id of ['sourceStatus','previewBackendStatus','calibrationStatus4','activeSettingsSummary'])move(id,diagnostic);
const raw=details('rawSettings3','RAW-avkodning och källfärgrymd',advanced);raw.className='sidebar-details';field('rawMode4',raw);
const rawDiagnostic=details('rawExperiment3','RAW-avkodning och källfärgrymd',diagnostic);rawDiagnostic.className='sidebar-details';
const technical=details('technicalResponse3','Teknisk filmrespons',advanced);
for(const id of ['neutralPair4','resetResponse4','saveResponse4'])move(id,technical);
technical.append($('useResponse4').closest('label'));
const source=$('flatFieldFile').closest('fieldset');source.parentElement.closest('details').open=false;
t(source.querySelector('legend'),'Ojämn belysning');t($('clearReference'),'Ta bort ljuskällereferens');
const tiff=$('tiffEncoding').closest('label');
const calibration=document.createElement('section');calibration.id='calibration3';calibration.className='tool-section';const heading=document.createElement('h2');t(heading,'Filmbas och kalibrering');calibration.append(heading);
$('imageAdjustments').after(calibration);move('base2Panel',calibration);$('base2Panel').removeAttribute('data-i18n-ignore');$('base2Panel').querySelector('h3').hidden=true;$('base2Panel').querySelector('p').hidden=true;
move('base2Status',$('base2Panel')).before($('base2Panel').querySelector('.toolrow'));
const sampleDetails=details('sampleDetails3','Prov och godkännande',$('base2Panel'));move('base2Status',sampleDetails);
const baseSummary=document.createElement('p');baseSummary.id='baseSummary3';baseSummary.className='status';baseSummary.setAttribute('role','status');$('base2Panel').prepend(baseSummary);
for(const id of ['base2Stats','base2Compare','base2Preview','base2Accept','base2Cancel','base2Undo','base2Auto','base2Lock'])move(id,sampleDetails);
const rollDetails=details('rollCalibration3','Filmrullens referens',$('base2Panel'));
field('base2Session',rollDetails);for(const id of ['shareBase','clearRollBase','rollBaseStatus'])move(id,rollDetails);rollDetails.append($('useRollBase').closest('label'));
oldTechnical.hidden=true;move('base2ResponseLock',technical);move('base2Lock',$('base2Panel'));
move('advanced',advanced);t($('advanced').querySelector('summary'),'Äldre kalibrering och nivåer');
const legacy=details('legacyBase3','Äldre filmbasverktyg',$('advanced'));
for(const id of ['auto','sample','recalc','noBase','baseInfo']){const el=$(id);legacy.append(el.closest('label')||el);}
// Primary image tools remain visible; exact angle/reset controls retain their IDs.
const toolbar=document.createElement('div');toolbar.id='imageTools3';toolbar.className='toolrow';toolbar.setAttribute('role','toolbar');t(toolbar,'Bildverktyg');toolbar.textContent='';toolbar.setAttribute('aria-label',FILMLABB_I18N.fromSource('Bildverktyg'));
$('picture').after(toolbar);
for(const id of ['rotateLeft','rotateRight','straighten','compositionEdit'])move(id,toolbar);
const grid=$('thirdsGrid').closest('label');toolbar.append(grid);const gridText=[...grid.childNodes].find(n=>n.nodeType===3);if(gridText)gridText.nodeValue=' Rutnät';$('thirdsGrid').setAttribute('aria-label',FILMLABB_I18N.fromSource('Tredjedelsrutnät'));for(const id of ['rotationReset','compositionReset'])move(id,toolbar);
move('geometryTools',$('picture').parentElement);$('geometryTools').classList.add('context-tools3');
const methods={log39:'Original · tidigare kanalnormalisering',calibrated4:'Standard · sparad färgrespons och separat tonomfång',curve3:'Curve · mjuk kurvform',density3:'Density · gemensam densitetston',matrix3:'Matrix · begränsad statistisk färgtransform'};
const description=document.createElement('p');description.id='methodDescription3';description.className='hint';description.setAttribute('aria-live','polite');$('engineMode').closest('.field').after(description);
const labels={rotateLeft:'Rotera 90° åt vänster',rotateRight:'Rotera 90° åt höger',compositionEdit:'Beskär komposition',compositionReset:'Återställ kompositionsbeskärning',cropReset:'Återställ teknisk filmruta'};
const shortNames={rotateLeft:'90° vänster',rotateRight:'90° höger',compositionEdit:'Beskär'};t($('straighten'),'Räta upp');$('straighten').setAttribute('aria-label',FILMLABB_I18N.fromSource('Räta upp med linje'));
for(const [id,s]of Object.entries(labels)){t($(id),shortNames[id]||s);$(id).setAttribute('aria-label',FILMLABB_I18N.fromSource(s));$(id).title=FILMLABB_I18N.fromSource(s);}
t(document.querySelector('label[for="engineMode"]'),'Konverteringsmetod');t($('imageAdjustments').querySelector('h2'),'Konvertering och bildjusteringar');
const creativeHint=document.createElement('p');creativeHint.className='hint';t(creativeHint,'Kreativ återgivning · ingen uppmätt filmprofil');$('creativeProfiles').append(creativeHint);
const icons={import:'M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6',export:'M12 15V3m-4 4 4-4 4 4M4 15v6h16v-6',queue:'M3 4h18v4H3zm0 6h18v4H3zm0 6h18v4H3z',settings:'M4 7h16M4 17h16M8 3v8m8 2v8',zoom:'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12m5 11 6 6',frame:'M3 8V3h5m8 0h5v5m0 8v5h-5M8 21H3v-5',sample:'m15 3 6 6-4 4-6-6zm-4 4-8 8v6h6l8-8',check:'m4 12 5 5L20 6'};
for(const [selector,name]of [['label[for="imageFile"]','import'],['#export','export'],['#exportTiff','export'],['#zoomIn','zoom'],['#zoomOut','zoom'],['#zoomReset','frame'],['#cropAuto','frame'],['#base2Region','sample'],['#base2Accept','check'],['#base2Enable','sample']]){const el=document.querySelector(selector);if(!el)continue;el.classList.add('ui3-icon');const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[name]}"/></svg>`;el.style.setProperty('--tool-icon',`url("data:image/svg+xml,${encodeURIComponent(svg)}")`);}
function localizeBase(){for(const id of ['base2Status','base2Preview','base2Lock','base2ResponseLock','base2Cancel','base2Accept','base2Undo','base2Auto']){const el=$(id);if(el.textContent!==FILMLABB_I18N.fromSource(el.textContent))t(el,el.textContent);}}
function baseState(){localizeBase();const snap=globalThis.FILMLABB_BASE2?.snapshot();const a=snap?.accepted;t(baseSummary,a?(state.useRollBase2?'Rullreferens':a.measurement.kind.startsWith('manual')?'Manuellt godkänd':'Automatisk referens'):snap?.proposal?'Kontrollera kandidaten':'Filmbas saknas');return snap;}
function refresh(){
 const snap=baseState();
 for(const option of $('engineMode').options)if(methods[option.value])option.textContent=({log39:'Original',calibrated4:'Standard',curve3:'Curve',density3:'Density',matrix3:'Matrix'})[option.value];
 t(description,methods[state.engine]||'Äldre projekt');
 const model=roll[activeFrame]?.geometry;$('rotationReset').hidden=!(state.rotation||model?.rotation?.fineDegrees);$('compositionReset').hidden=!model?.compositionCrop;
 const active=globalThis.FILMLABB_GEOMETRY?.mode();toolbar.dataset.mode=active||'view';
 for(const [id,mode]of [['straighten','straighten'],['compositionEdit','composition']])$(id).setAttribute('aria-pressed',String(active===mode));
 if(active==='straighten'||active==='composition')$('geometryTools').open=true;
 $('geometryTools').hidden=!active;
 $('base2Lock').hidden=!snap?.accepted;
 const v2=state.filmBaseVersion===2;legacy.hidden=v2;
 t($('base2Enable'),'Analysera automatiskt');t($('base2Region'),snap?.tool?'Avsluta provverktyg':'Välj filmbas manuellt');
 const proposal=snap?.proposal;sampleDetails.open=!!proposal||!!snap?.tool;
 const isRaw=!!working&&NSFileFormats.isRaw(roll[activeFrame]?.file?.name||'');raw.hidden=!isRaw||diagnostic.open;rawDiagnostic.hidden=!isRaw;
 const target=diagnostic.open?rawDiagnostic:raw;if($('rawMode4').parentElement!==target)field('rawMode4',target);if(diagnostic.open)rawDiagnostic.open=true;
 $('rawMode4').querySelector('option[value="wide"]').hidden=!diagnostic.open&&state.rawMode4!=='wide';
 tiff.hidden=!working||!(/\.tiff?$/i.test(roll[activeFrame]?.file?.name||''))||!!hires?.icc;
}
const ui=updateCalibrationUI;updateCalibrationUI=function(...a){const r=ui(...a);refresh();return r;};
$('engineMode').addEventListener('change',refresh);
new MutationObserver(refresh).observe($('rotationSummary'),{childList:true,subtree:true});
new MutationObserver(refresh).observe($('geometryHint'),{childList:true,subtree:true});
new MutationObserver(()=>{const snap=baseState();t($('base2Enable'),'Analysera automatiskt');t($('base2Region'),snap?.tool?'Avsluta provverktyg':'Välj filmbas manuellt');sampleDetails.open=!!globalThis.FILMLABB_BASE2?.snapshot().proposal||!!snap?.tool;}).observe($('base2Status'),{childList:true});
diagnostic.addEventListener('toggle',refresh);
$('filmProfile').setAttribute('aria-label',FILMLABB_I18N.fromSource('Kreativ profil'));
window.addEventListener('filmlabb:language',refresh);
refresh();
})();
