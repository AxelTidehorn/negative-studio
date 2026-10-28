/* Runs before the unchanged application scripts, in a private iframe only. */
(function(){
'use strict';
function storage(){const data=new Map();return {get length(){return data.size;},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(String(k))??null,setItem:(k,v)=>data.set(String(k),String(v)),removeItem:k=>data.delete(String(k)),clear:()=>data.clear()};}
Object.defineProperty(window,'localStorage',{value:storage(),configurable:true});
Object.defineProperty(window,'sessionStorage',{value:storage(),configurable:true});
// Failed RAW must not silently become a camera JPEG in this reference run.
window.confirm=()=>false;
window.FILMLABB_REFERENCE_ISOLATED=true;
})();
