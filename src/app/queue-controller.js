'use strict';
let roll=[],activeFrame=-1,rollLoading=false,rollingExport=false;
const rollShared=NSProjectSettings.rollDefaults();
const copyState=()=>NSProjectSettings.clone(state);
function saveCurrentFrame(){if(working&&activeFrame>=0&&roll[activeFrame]){reconcileLegacyCrop(activeFrame,!!state.cropExport);roll[activeFrame].geometry=geometryForFrame(roll[activeFrame],state,cropRegion);state.cropExport=NSGeometry.effectiveCrop(roll[activeFrame].geometry,rollShared.cropExportToFrame);roll[activeFrame].settings=copyState();roll[activeFrame].base=[...base];roll[activeFrame].levels=levels?JSON.parse(JSON.stringify(levels)):null;roll[activeFrame].crop={...cropRegion};}}
function refreshRollUI(){
 if(roll.length&&activeFrame<0){if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source($('rollStatus'),'Välj en bild i arbetskön.');else $('rollStatus').textContent='Välj en bild i arbetskön.';}
 else if(globalThis.FILMLABB_I18N?.message&&roll.length)FILMLABB_I18N.message($('rollStatus'),'queue.status',{count:roll.length,index:activeFrame+1,profile:profileLabel()});
 else $('rollStatus').textContent=roll.length?`${roll.length} bilder · Bild ${activeFrame+1} · ${profileLabel()} · snabb förhandsvisning`:'Inga bilder inlästa.';
 $('batchJpeg').disabled=!roll.length||rollLoading; $('batchTiff').disabled=!roll.length||rollLoading; $('loadFullRaw').disabled=!roll.length;
 const strip=$('filmstrip');strip.textContent='';
 roll.forEach((frame,i)=>{const b=document.createElement('div');b.className='frame'+(i===activeFrame?' active':'');
 const img=document.createElement('img');img.src=frame.thumb||thumbPlaceholder;img.onerror=()=>{img.onerror=null;frame.thumb=null;frame.thumbPositive=false;img.src=thumbPlaceholder;};img.alt='Miniatyr '+(i+1);b.append(img);
 const label=document.createElement('span');label.textContent=(i+1)+': '+frame.file.name;label.setAttribute('data-i18n-ignore','');b.append(label);
 const check=document.createElement('input');check.type='checkbox';check.checked=frame.selected;check.title='Markera för TIFF-batch';check.onchange=()=>frame.selected=check.checked;b.append(check);
 b.onclick=e=>{if(e.target!==check)chooseFrame(i)};strip.append(b)});
}
function syncControls(){for(const [id] of controls){setSliderPosition(id)}$('auto').checked=state.auto;$('noBase').checked=state.noBase;$('autoLevels').checked=state.autoLevels;updateValues()}
// Queue decoration only: use pixels already rendered for a positive preview.
// Unopened files get a stable placeholder, never a separate RAW/JPEG decode.
const thumbPlaceholder='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="110"><rect width="160" height="110" fill="#292722"/><rect x="35" y="25" width="90" height="60" rx="3" fill="none" stroke="#b99a63" stroke-width="2"/></svg>');
function updateFrameThumb(canvas){
 const frame=roll[activeFrame];if(!working||!frame||frame.thumbPositive||display!=='positive'||!canvas.width||!canvas.height)return;
 try{const c=document.createElement('canvas'),scale=Math.min(1,160/Math.max(canvas.width,canvas.height));c.width=Math.max(1,Math.round(canvas.width*scale));c.height=Math.max(1,Math.round(canvas.height*scale));c.getContext('2d').drawImage(canvas,0,0,c.width,c.height);const url=c.toDataURL('image/jpeg',.65);c.width=c.height=0;frame.thumb=url;frame.thumbPositive=true;refreshRollUI();}catch{}
}
async function importRoll(files,{engine}={}){
 if(!files.length||rollLoading||exportBusy||rollingExport||cropDrag)return;
 const rejected=files.filter(f=>!NSFileFormats.supported(f));
 const acceptable=files.filter(NSFileFormats.supported);
 if(acceptable.length>5){setStatus('Max fem bilder åt gången. Välj fem filer eller färre.');return}
 if(!acceptable.length){setStatus(NSFileFormats.error(rejected[0]));return;}
 roll=[];activeFrame=-1;src=null;hires=null;
 for(const file of acceptable){roll.push({file,geometry:NSGeometry.create(),settings:{...NSProjectSettings.newImageDefaults({v2Compatible:NSFileFormats.isRaw(file.name),engine}),cropExport:rollShared.cropExportToFrame,noBase:false,autoLevels:true},base:null,levels:null,selected:true,thumb:null,crop:null})}
 refreshRollUI();
 const imported=roll;
 const ready=await chooseFrame(0);if(!ready||roll!==imported)return;
 if(rejected.length)setStatus(rejected.map(NSFileFormats.error).join(' '));
}
$('loadFullRaw').onclick=async()=>{if(activeFrame<0)return;await chooseFrame(activeFrame,{full:true,force:true})};
$('clearQueue').onclick=()=>{roll=[];activeFrame=-1;src=null;hires=null;previewSrc=null;working=null;workingPreview=null;cropRegion=null;$('preview').classList.add('hidden');$('empty').classList.remove('hidden');refreshRollUI();$('export').disabled=true;setStatus('Arbetskön tömd.');};
$('imageFile').addEventListener('change',async e=>{const files=Array.from(e.target.files);try{await importRoll(files)}catch(err){setStatus(err.message)}finally{e.target.value=''}});
$('filmProfile').onchange=e=>{const id=e.target.value;rollShared.monochrome=id==='mono.neutral';rollShared.look={id:rollShared.monochrome?'neutral':id,strength:rollShared.look.strength};NSProfiles.validate(rollShared.look,rollShared.monochrome);refreshProfileInfo();scheduleRender(true);refreshRollUI()};
$('profileStrength').oninput=e=>{rollShared.look={...rollShared.look,strength:Number(e.target.value)/100};$('profileStrengthValue').textContent=e.target.value+' %';scheduleRender()};$('profileStrength').onchange=()=>scheduleRender(true);
$('applyRoll').onclick=()=>{if(!roll.length)return;saveCurrentFrame();const mode=$('copyMode').value;const color=['temperature','tint','saturation','vibrance'],tone=['contrast','gamma','shadow','highlight','balanceStrength'];const keys=mode==='color'?color:mode==='tone'?tone:[...color,...tone];let count=0;for(const f of roll){if(!f.selected)continue;for(const k of keys)f.settings[k]=state[k];count++}setStatus(`${mode==='color'?'Färg':mode==='tone'?'Ton':'Alla inställningar utom exponering'} kopierades till ${count} markerade bilder. Individuell exponering bevarad.`);refreshRollUI()};
refreshProfileInfo();
// Commit per-image settings after slider debounce/change without affecting UI responsiveness
for(const [id] of controls){$(id).addEventListener('change',saveCurrentFrame)}
for(const id of ['auto','noBase','autoLevels'])$(id).addEventListener('change',()=>setTimeout(saveCurrentFrame,0));
$('sample').addEventListener('click',()=>setTimeout(saveCurrentFrame,500));
