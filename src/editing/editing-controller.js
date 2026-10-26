/* One per-image A/B choice. No calibration or conversion-engine mutation. */
'use strict';
(() => {
 const row=document.createElement('div');row.className='control';
 const label=document.createElement('label');label.htmlFor='editVersion';label.textContent='Redigering / Editing';
 const select=document.createElement('select');select.id='editVersion';select.setAttribute('aria-label','Redigering / Editing');
 for(const [value,text] of [['1','Original editing'],['2','Editing 2.0 (experimental)']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
 const hint=document.createElement('p');hint.className='hint';hint.textContent='A/B: samma reglagevärden kan ge olika styrka. 2.0: +Skuggor lyfter, +Högdagrar dämpar. / Same values can differ in strength. 2.0: +Shadows lifts, +Highlights compresses.';
 row.append(label,select,hint);$('simpleControls').prepend(row);
 function sync(){select.value=String(NSEditing2.version(state.editVersion));select.disabled=!working||rollLoading||exportBusy||rollingExport;}
 select.onchange=()=>{
  if(!working||rollLoading||exportBusy||rollingExport){sync();return;}
  state.editVersion=Number(select.value)===2?2:1;config38=null;saveCurrentFrame();persist();sync();render();
 };
 const controlsBefore=nextControls;nextControls=function(...args){const result=controlsBefore(...args);sync();return result;};
 const chooseBefore=chooseFrame;chooseFrame=async function(...args){const result=await chooseBefore(...args);sync();return result;};
 const updateBefore=syncControls;syncControls=function(...args){const result=updateBefore(...args);sync();return result;};
 const clearBefore=$('clearQueue').onclick;$('clearQueue').onclick=()=>{const result=clearBefore();sync();return result;};
 sync();
})();
