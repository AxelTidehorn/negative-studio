'use strict';
let roll=[],activeFrame=-1,rollLoading=false,rollingExport=false;
const rollShared={cropExportToFrame:false,profile:'generic',profileVersion:2,print:'neutral',strength:.7,noBase:true,autoLevels:true,auto:true,manualBase:null};
const copyState=()=>JSON.parse(JSON.stringify(state));
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
 if(/\.raf$/i.test(file.name)){blob=extractRafJpeg(await file.arrayBuffer());if(!blob)return null}if(NSFileFormats.isRaw(file)&&NSFileFormats.extension(file)!=='raf')return null;
 if(/\.tiff?$/i.test(file.name))return null;
 const bitmap=await createImageBitmap(blob);const c=document.createElement('canvas');let scale=Math.min(1,160/Math.max(bitmap.width,bitmap.height));c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();return c.toDataURL('image/jpeg',.65)
 }catch(e){return null}}
// Fast browser preview: decode the RAF embedded JPEG, NEVER full RAW on selection.
async function loadFastPreview(file){
 if(NSFileFormats.isRaw(file)&&NSFileFormats.extension(file)!=='raf'){
  await readFile(file);return;
 }
 if(/\.raf$/i.test(file.name)){
  const jpeg=extractRafJpeg(await file.arrayBuffer());
  if(!jpeg)throw Error('RAF saknar inbäddad JPEG.');
  await importBrowserImage(new File([jpeg],file.name+'.jpg',{type:'image/jpeg'}),'Snabb förhandsvisning');
 }else{await readFile(file)}
}
let selectionToken=0,rawLoadedIndex=-1;
async function chooseFrame(i,{full=false,force=false}={}){
 if(i<0||i>=roll.length)return;
 if(!force&&i===activeFrame&&!full)return;
 const token=++selectionToken;
 if(activeFrame!==i)saveCurrentFrame();
 const f=roll[i];activeFrame=i;state={...defaultState(),...f.settings};cropRegion=f.crop?clampCrop(f.crop):{x:.04,y:.04,w:.92,h:.92};$("cropInset").value=Math.round(cropRegion.x*100);updateCropLabel();syncControls();zoom=1;panX=0;panY=0;applyView();
 // Cached 8-bit image used for instant navigation. Full RAW is transient.
 src=null;hires=null;previewSrc=null;rawLoadedIndex=-1;
 try{
  if(full){setStatus('Avkodar RAW: '+f.file.name);await readFile(f.file);rawLoadedIndex=i}
  else if(f.preview){src=f.preview;fullWidth=src.width;fullHeight=src.height;finishImport('Förhandsvisning i cache (8 bitar)')}
  else{await loadFastPreview(f.file);if(token===selectionToken&&previewSrc)f.preview=previewSrc}
  if(token!==selectionToken)return;
  if(f.base){base=[...f.base];levels=f.levels;render()}
  $('qualityInfo').textContent=full?'Full RAW laddad för aktuell bild (16 bitars källa).':'Snabb 8-bitars förhandsvisning; RAW avkodas vid TIFF-export.';
  setStatus(`Bild ${i+1}/${roll.length} · ${f.file.name} · ${full?'full RAW':'snabb förhandsvisning'}`);
 }catch(e){setStatus('Kunde inte öppna bild: '+e.message)}finally{refreshRollUI()}
}
async function importRoll(files){
 if(!files.length)return;
 const rejected=files.filter(f=>!NSFileFormats.supported(f));
 const acceptable=files.filter(NSFileFormats.supported);
 if(acceptable.length>5){setStatus('Max fem bilder åt gången. Välj fem filer eller färre.');return}
 if(!acceptable.length){setStatus(NSFileFormats.error(rejected[0]));return;}
 rollShared.profileVersion=2;roll=[];activeFrame=-1;src=null;hires=null;selectionToken++;
 for(const file of acceptable){roll.push({file,geometry:NSGeometry.create(),settings:{...defaultState(),cropExport:rollShared.cropExportToFrame,noBase:false,autoLevels:true},base:null,levels:null,selected:true,thumb:null,preview:null,crop:null})}
 refreshRollUI();
 await chooseFrame(0);
 for(let i=0;i<roll.length;i++){roll[i].thumb=await makeThumb(roll[i].file);refreshRollUI()}
 if(rejected.length)setStatus(rejected.map(NSFileFormats.error).join(' '));
}
$('loadFullRaw').onclick=async()=>{if(activeFrame<0)return;await chooseFrame(activeFrame,{full:true,force:true})};
$('clearQueue').onclick=()=>{selectionToken++;roll=[];activeFrame=-1;src=null;hires=null;previewSrc=null;working=null;workingPreview=null;cropRegion=null;$('preview').classList.add('hidden');$('empty').classList.remove('hidden');refreshRollUI();$('export').disabled=true;$('exportTiff').disabled=true;setStatus('Arbetskön tömd.');};
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
const originalExportTiff=exportTiff;
$('exportTiff').onclick=async()=>{if(activeFrame>=0&&roll[activeFrame]&&NSFileFormats.isRaw(roll[activeFrame].file.name)&&rawLoadedIndex!==activeFrame)await chooseFrame(activeFrame,{full:true,force:true});if(src)await originalExportTiff()};
async function exportFrameTiff(i){await chooseFrame(i,{full:true,force:true});if(src)await originalExportTiff()}
$('batchTiff').onclick=async()=>{if(rollingExport)return;const ids=roll.map((f,i)=>f.selected?i:-1).filter(x=>x>=0);
 if(!ids.length){setStatus('Markera några bilder i filmremsan.');return}
 if(ids.length>5){setStatus('Markera högst fem bilder.');return}
 rollingExport=true;const old=activeFrame;try{for(let j=0;j<ids.length;j++){await exportFrameTiff(ids[j]);await new Promise(r=>setTimeout(r,200))}setStatus('TIFF-export klar. Safari kan fråga om tillåtelse för flera nedladdningar.')}finally{rollingExport=false;await chooseFrame(old)}};
// ZIP (store/no compression): no remote libraries, no server. Intended for preview JPEGs.
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(bytes){let c=-1;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^-1)>>>0}
function makeZip(entries){const enc=new TextEncoder(),parts=[],central=[];let off=0;
 for(const [filename,data] of entries){const name=enc.encode(filename),local=new Uint8Array(30+name.length),v=new DataView(local.buffer),crc=crc32(data);
 v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);
 const cen=new Uint8Array(46+name.length),c=new DataView(cen.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);cen.set(name,46);central.push(cen);
 parts.push(local,data);off+=local.length+data.length}
 const start=off;for(const x of central){parts.push(x);off+=x.length}const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,off-start,true);e.setUint32(16,start,true);parts.push(end);return new Blob(parts,{type:'application/zip'})}
async function jpegBytes(){
 // Use exactly the same final pixel pipeline as TIFF/preview when high-bit source exists.
 const source=(typeof working!=='undefined'&&working&&typeof makeExportCanvas==='function')?makeExportCanvas():null;
 const canvas=source||(()=>{const im=convertImage(src,'positive',state,base),c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').putImageData(im,0,0);return rotatedCanvas(c,state.rotation||0)})();
 const limit=12000000;
 let target=canvas;
 if(canvas.width*canvas.height>limit){const ratio=Math.sqrt(limit/(canvas.width*canvas.height));target=document.createElement('canvas');target.width=Math.max(1,Math.floor(canvas.width*ratio));target.height=Math.max(1,Math.floor(canvas.height*ratio));target.getContext('2d',{alpha:false}).drawImage(canvas,0,0,target.width,target.height);}
 const blob=await new Promise(resolve=>target.toBlob(resolve,'image/jpeg',.94));
 if(!blob||!blob.size)throw Error('JPEG-kodning misslyckades ('+target.width+'×'+target.height+')');
 return new Uint8Array(await blob.arrayBuffer());
}
$('batchJpeg').onclick=async()=>{if(rollingExport||!roll.length)return;rollingExport=true;const old=activeFrame,files=[];try{
 for(let i=0;i<roll.length;i++){setStatus(`Batch JPEG: ${i+1}/${roll.length}. RAW avkodas en åt gången…`);await chooseFrame(i,{full:true,force:true});if(!src)continue;const bytes=await jpegBytes();files.push([`bild_${String(i+1).padStart(3,'0')}.jpg`,bytes]);await new Promise(r=>setTimeout(r,0))}
 if(files.length)downloadBlob(makeZip(files),'filmlabb-filmrulle.zip');setStatus('JPEG-ZIP färdig. TIFF behåller mer toninformation.');
 }catch(e){setStatus('Batchfel: '+e.message)}finally{rollingExport=false;await chooseFrame(old)}};
