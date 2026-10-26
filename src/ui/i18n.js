/* Explicit message bindings plus a compatibility bridge for older UI producers.
   No document/image data is translated, only DOM text and UI attributes. */
(() => {
'use strict';
const api=globalThis.FILMLABB_I18N,select=document.getElementById('languageSelect'),pref='filmlabb-language-v1';if(!api||!select)return;
let initial;try{initial=localStorage.getItem(pref);}catch{}
if(!api.languages.includes(initial)){const browser=(navigator.language||'en').slice(0,2).toLowerCase();initial=api.languages.includes(browser)?browser:'en';}
const textSources=new WeakMap(),attributeSources=new WeakMap(),bindings=new Map(),attributes=['title','placeholder','aria-label','aria-description','alt','label'];
const protectedTags=new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA']);
function text(node){
 const actual=node.nodeValue;let record=textSources.get(node);
 if(!record||actual!==record.last){record={source:actual,last:actual};textSources.set(node,record);}
 const target=api.fromSource(record.source);record.last=target;if(actual!==target)node.nodeValue=target;
}
function attribute(el,name){
 const actual=el.getAttribute(name);if(actual===null)return;
 let sources=attributeSources.get(el);if(!sources){sources=new Map();attributeSources.set(el,sources);}
 let record=sources.get(name);if(!record||record.last!==actual){record={source:actual,last:actual};sources.set(name,record);}
 const target=api.fromSource(record.source);record.last=target;if(actual!==target)el.setAttribute(name,target);
}
function translate(node){
 if(node.nodeType===3){if(!protectedTags.has(node.parentElement?.tagName))text(node);return;}
 if(node.nodeType!==1||protectedTags.has(node.tagName)||node.hasAttribute('data-i18n-ignore'))return;
 for(const name of attributes)attribute(node,name);
 for(const child of [...node.childNodes])translate(child);
}
function write(el,value){el.textContent=value;for(const node of el.childNodes)if(node.nodeType===3)textSources.set(node,{source:value,last:value});}
api.source=(el,value)=>{if(!el)return;const source=String(value??''),last=api.fromSource(source);bindings.set(el,{source,last});write(el,last);};
api.message=(el,key,params={})=>{if(!el)return;const last=api.t(key,params);bindings.set(el,{key,params:{...params},last});write(el,last);};
api.status=(el,source)=>{api.source(el,source);el.dataset.level=/fel|misslyck|kunde inte|stöds inte/i.test(source)?'error':/osäker|kontrollera|fallback/i.test(source)?'warning':'info';};
api.confirmSource=source=>window.confirm(api.fromSource(source));
let scheduled=false;const pending=new Set();
const observer=new MutationObserver(records=>{
 for(const r of records){if(r.type==='characterData')pending.add(r.target);else if(r.type==='attributes')pending.add(r.target);else for(const n of r.addedNodes)pending.add(n);}
 if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;observer.disconnect();for(const [el,record]of bindings)if(!el.isConnected||el.textContent!==record.last)bindings.delete(el);for(const node of pending)if(node.isConnected&&!node.parentElement?.closest('[data-i18n-ignore]'))translate(node);pending.clear();observe();});
});
function observe(){observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributes});}
function setLanguage(lang){
 api.setLocale(lang);select.value=api.get();document.documentElement.lang=api.get();observer.disconnect();
 for(const [el,record]of bindings){if(!el.isConnected||el.textContent!==record.last){bindings.delete(el);continue;}record.last=record.key?api.t(record.key,record.params):api.fromSource(record.source);write(el,record.last);}
 translate(document.body);document.title=api.fromSource('FILMLABB · Negativframkallning');
 try{localStorage.setItem(pref,api.get());}catch{}observe();window.dispatchEvent(new Event('filmlabb:language'));
}
select.addEventListener('change',e=>setLanguage(e.target.value));
window.FILMLABB_LANGUAGE={get:api.get,set:setLanguage};setLanguage(initial);
})();
