'use strict';
function syncEngineSelector(){
 const select=$('engineMode'),names={legacy:'Äldre projekt · Beta 1',beta2:'Äldre projekt · densitet',beta3:'Äldre projekt · Beta 3',reference:'Äldre projekt · 3.7',density38:'Äldre projekt · 3.8'};
 if(typeof select.querySelectorAll==='function')for(const o of select.querySelectorAll('option[data-legacy]'))o.remove();
 if(names[state.engine]){const o=document.createElement('option');o.value=state.engine;o.textContent=names[state.engine];o.dataset.legacy='true';select.append(o);}
 select.value=state.engine;
 if(typeof document.querySelectorAll==='function')for(const el of document.querySelectorAll('[data-legacy-slope]'))el.hidden=state.engine!=='density38';
}
