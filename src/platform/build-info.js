/* Build replaces this sentinel in the copied asset. Source checkout stays honest. */
(function(root){
'use strict';
const INFO=null;
root.NSBuildInfo=INFO?Object.freeze(INFO):null;
if(typeof document==='undefined')return;
function show(){for(const el of document.querySelectorAll('[data-build-label]')){
 el.textContent=INFO?'FILMLABB '+INFO.version+' · '+(INFO.sourceBranch||'gren saknas')+' · '+(INFO.sourceCommit?.slice(0,7)||'revision saknas')+' · '+INFO.contentHash.slice(0,8)+(INFO.dirty?' · lokala källändringar':''):'Versionsinformation saknas · kör npm run build';
 if(INFO)el.title='Källrevision '+(INFO.sourceCommit||'saknas')+' · innehåll '+INFO.contentHash;
}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})(globalThis);
