/* Device-local light mode only. Never reads/writes image or project state. */
'use strict';
const appearanceKey='filmlabb-appearance-v2',appearanceModes=['dark','light'];
let currentTheme='dark';
try{
 const saved=JSON.parse(localStorage.getItem(appearanceKey)||'null');
 // Removed palette identities and malformed/legacy preferences start in Dark.
 if(saved&&typeof saved==='object'&&!('theme' in saved)&&appearanceModes.includes(saved.mode))currentTheme=saved.mode;
}catch{}
function applyTheme(mode){
 currentTheme=appearanceModes.includes(mode)?mode:'dark';
 const html=document.documentElement;if(html){html.removeAttribute('data-theme');html.dataset.mode=currentTheme;html.style.colorScheme=currentTheme;}
 document.body.classList.toggle('light-theme',currentTheme==='light');
 const select=document.getElementById('themeMode'),toggle=document.getElementById('themeToggle');
 if(select)select.value=currentTheme;
 if(toggle){const source=currentTheme==='light'?'Nattläge':'Dagläge';if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source(toggle,source);else toggle.textContent=source;toggle.setAttribute('aria-pressed',String(currentTheme==='light'));}
 try{localStorage.setItem(appearanceKey,JSON.stringify({mode:currentTheme}));}catch{}
 if(globalThis.getComputedStyle){const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',getComputedStyle(document.body).getPropertyValue('--ui-bg').trim());}
 if(typeof Event!=='undefined')globalThis.dispatchEvent?.(new Event('filmlabb:appearance'));
}
document.getElementById('themeMode').onchange=e=>applyTheme(e.target.value);
document.getElementById('themeToggle').onclick=()=>applyTheme(currentTheme==='light'?'dark':'light');
globalThis.FILMLABB_APPEARANCE={get:()=>({mode:currentTheme}),set:applyTheme,modes:[...appearanceModes]};
applyTheme(currentTheme);
