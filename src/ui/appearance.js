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
 const select=document.getElementById('themeMode');
 if(select)select.value=currentTheme;
 try{localStorage.setItem(appearanceKey,JSON.stringify({mode:currentTheme}));}catch{}
 if(globalThis.getComputedStyle){const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',getComputedStyle(document.body).getPropertyValue('--ui-bg').trim());}
 if(typeof Event!=='undefined')globalThis.dispatchEvent?.(new Event('filmlabb:appearance'));
}
document.getElementById('themeMode').onchange=e=>applyTheme(e.target.value);
globalThis.FILMLABB_APPEARANCE={get:()=>({mode:currentTheme}),set:applyTheme,modes:[...appearanceModes]};
applyTheme(currentTheme);
