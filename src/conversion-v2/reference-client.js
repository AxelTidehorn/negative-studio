/* Fresh original-app control flow, isolated from all user project/preferences.
   Fetch + srcdoc avoids navigation rewriting by an existing offline worker. */
(function(root){
'use strict';
class Reference{
 constructor(){this.frame=null;this.closed=false;this.cancelPromise=new Promise((resolve,reject)=>this.rejectCancel=reject);this.cancelPromise.catch(()=>{});}
 release(){this.frame?.remove();this.frame=null;}
 close(){this.closed=true;this.release();this.rejectCancel(Object.assign(Error('Avbrutet'),{name:'AbortError'}));this.reject?.(Object.assign(Error('Avbrutet'),{name:'AbortError'}));}
 load(file){return Promise.race([this.run(file),this.cancelPromise]);}
 async run(file){
  const response=await fetch('./v2-reference.html',{cache:'no-store'});if(!response.ok)throw Error('REFERENCE_PAGE_MISSING');const html=await response.text();if(this.closed)throw Object.assign(Error('Avbrutet'),{name:'AbortError'});
  const frame=document.createElement('iframe');this.frame=frame;frame.title='Isolerad automatisk FILMLABB-referens';frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-20000px;top:0;width:1200px;height:900px;pointer-events:none;';
  const ready=new Promise((resolve,reject)=>{this.reject=reject;frame.onload=()=>{if(!frame.contentWindow?.FILMLABB_REFERENCE)return reject(Error('REFERENCE_BOOT_FAILED'));resolve();};frame.onerror=()=>reject(Error('REFERENCE_BOOT_FAILED'));});
  frame.srcdoc=html.replace('<head>','<head><base href="'+new URL('./',location.href).href+'">');document.body.append(frame);await ready;if(this.closed)throw Object.assign(Error('Avbrutet'),{name:'AbortError'});
  const result=await frame.contentWindow.FILMLABB_REFERENCE.load(file);if(this.closed)throw Object.assign(Error('Avbrutet'),{name:'AbortError'});return result;
 }
}
root.NSV2Reference=Reference;
})(globalThis);
