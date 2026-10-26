'use strict';
let roll=[],activeFrame=-1,rollLoading=false,rollingExport=false;
const rollShared=NSProjectSettings.rollDefaults();
const copyState=()=>NSProjectSettings.clone(state);
function saveCurrentFrame(){if(activeFrame>=0&&roll[activeFrame]){reconcileLegacyCrop(activeFrame,!!state.cropExport);roll[activeFrame].geometry=geometryForFrame(roll[activeFrame],state,cropRegion);state.cropExport=NSGeometry.effectiveCrop(roll[activeFrame].geometry,rollShared.cropExportToFrame);roll[activeFrame].settings=copyState();roll[activeFrame].base=[...base];roll[activeFrame].levels=levels?JSON.parse(JSON.stringify(levels)):null;roll[activeFrame].crop={...cropRegion};}}
function refreshRollUI(){
 $('rollStatus').textContent=roll.length?`${roll.length} bilder · Bild ${activeFrame+1} · ${filmProfiles[rollShared.profile].label} · snabb förhandsvisning`:'Inga bilder inlästa.';
 $('batchJpeg').disabled=!roll.length||rollLoading; $('batchTiff').disabled=!roll.length||rollLoading; $('loadFullRaw').disabled=!roll.length;
 const strip=$('filmstrip');strip.textContent='';
 roll.forEach((frame,i)=>{const b=document.createElement('div');b.className='frame'+(i===activeFrame?' active':'');
 const img=document.createElement('img');if(frame.thumb)img.src=frame.thumb;img.alt='Miniatyr '+(i+1);b.append(img);
 const label=document.createElement('span');label.textContent=(i+1)+': '+frame.file.name;b.append(label);
 const check=document.createElement('input');check.type='checkbox';check.checked=frame.selected;check.title='Markera för TIFF-batch';check.onchange=()=>frame.selected=check.checked;b.append(check);
 b.onclick=e=>{if(e.target!==check)chooseFrame(i)};strip.append(b)});
}
function syncControls(){for(const [id] of controls){setSliderPosition(id)}$('auto').checked=state.auto;$('noBase').checked=state.noBase;$('autoLevels').checked=state.autoLevels;updateValues()}
async function makeThumb(file){try{
 let blob=file;
 if(/\.raf$/i.test(file.name)){blob=await readRafJpeg(file);if(!blob)return null}if(NSFileFormats.isRaw(file)&&NSFileFormats.extension(file)!=='raf')return null;
 if(/\.tiff?$/i.test(file.name))return null;
 const bitmap=await createImageBitmap(blob);const c=document.createElement('canvas');let scale=Math.min(1,160/Math.max(bitmap.width,bitmap.height));c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();return c.toDataURL('image/jpeg',.65)
 }catch(e){return null}}
// Fast browser preview: decode the RAF embedded JPEG, NEVER full RAW on selection.


async function importRoll(files){
 if(!files.length||rollLoading||exportBusy||rollingExport)return;
 const rejected=files.filter(f=>!NSFileFormats.supported(f));
 const acceptable=files.filter(NSFileFormats.supported);
 if(acceptable.length>5){setStatus('Max fem bilder åt gången. Välj fem filer eller färre.');return}
 if(!acceptable.length){setStatus(NSFileFormats.error(rejected[0]));return;}
 rollShared.profileVersion=2;roll=[];activeFrame=-1;src=null;hires=null;
 for(const file of acceptable){roll.push({file,geometry:NSGeometry.create(),settings:{...defaultState(),cropExport:rollShared.cropExportToFrame,noBase:false,autoLevels:true},base:null,levels:null,selected:true,thumb:null,preview:null,crop:null})}
 refreshRollUI();
 const imported=roll;
 await chooseFrame(0);
 for(const frame of imported){
  if(roll!==imported)return;
  const thumb=await makeThumb(frame.file);
  if(roll!==imported)return;
  frame.thumb=thumb;refreshRollUI();
 }
 if(rejected.length)setStatus(rejected.map(NSFileFormats.error).join(' '));
}
$('loadFullRaw').onclick=async()=>{if(activeFrame<0)return;await chooseFrame(activeFrame,{full:true,force:true})};
$('clearQueue').onclick=()=>{roll=[];activeFrame=-1;src=null;hires=null;previewSrc=null;working=null;workingPreview=null;cropRegion=null;$('preview').classList.add('hidden');$('empty').classList.remove('hidden');refreshRollUI();$('export').disabled=true;$('exportTiff').disabled=true;setStatus('Arbetskön tömd.');};
$('imageFile').addEventListener('change',async e=>{const files=Array.from(e.target.files);try{await importRoll(files)}catch(err){setStatus(err.message)}finally{e.target.value=''}});
$('filmProfile').onchange=e=>{rollShared.profile=e.target.value;rollShared.profileVersion=2;refreshProfileInfo();scheduleRender(true);refreshRollUI()};
$('profileStrength').oninput=e=>{rollShared.strength=Number(e.target.value)/100;$('profileStrengthValue').textContent=e.target.value+' %';scheduleRender()};$('profileStrength').onchange=()=>scheduleRender(true);
$('printStyle').onchange=e=>{rollShared.print=e.target.value;scheduleRender(true)};
$('applyRoll').onclick=()=>{if(!roll.length)return;saveCurrentFrame();const mode=$('copyMode').value;const color=['temperature','tint','saturation'],tone=['contrast','gamma','shadow','highlight','balanceStrength'];const keys=mode==='color'?color:mode==='tone'?tone:[...color,...tone];let count=0;for(const f of roll){if(!f.selected)continue;for(const k of keys)f.settings[k]=state[k];count++}setStatus(`${mode==='color'?'Färg':mode==='tone'?'Ton':'Alla inställningar utom exponering'} kopierades till ${count} markerade bilder. Individuell exponering bevarad.`);refreshRollUI()};
refreshProfileInfo();
// Commit per-image settings after slider debounce/change without affecting UI responsiveness
for(const [id] of controls){$(id).addEventListener('change',saveCurrentFrame)}
for(const id of ['auto','noBase','autoLevels'])$(id).addEventListener('change',()=>setTimeout(saveCurrentFrame,0));
$('sample').addEventListener('click',()=>setTimeout(saveCurrentFrame,500));
