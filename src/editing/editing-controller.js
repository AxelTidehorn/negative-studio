/* Hidden per-image legacy-version binding. New imports use Editing 2.0. */
'use strict';
(() => {
 const row=document.createElement('div');row.className='control';row.hidden=true; // Compatibility binding only; new images use Editing 2.0.
 const label=document.createElement('label');label.htmlFor='editVersion';label.textContent='Redigering';
 const select=document.createElement('select');select.id='editVersion';select.setAttribute('aria-label','Redigering');
 for(const [value,text] of [['1','Originalredigering'],['2','Redigering 2.0']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
 select.title='Samma värden kan ge olika styrka. 2.0: +Skuggor lyfter, +Högdagrar dämpar.';
 row.append(label,select);$('simpleControls').prepend(row);
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
