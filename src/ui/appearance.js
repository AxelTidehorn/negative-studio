/* Device preference only. Never reads/writes image or project state. */
'use strict';
const appearanceKey='filmlabb-appearance-v2',themeIdentities=['classic','olive','burgundy','industrial','paper','aubergine'];
let currentTheme='dark',currentIdentity='classic';
try{const old=localStorage.getItem('negative-studio-theme-v092');if(old==='light'||old==='dark')currentTheme=old;}catch{}
try{const saved=JSON.parse(localStorage.getItem(appearanceKey)||'null');if(saved&&themeIdentities.includes(saved.theme)&&['light','dark'].includes(saved.mode)){currentIdentity=saved.theme;currentTheme=saved.mode;}}catch{}
function applyTheme(mode,identity=currentIdentity){
 currentTheme=mode==='light'?'light':'dark';currentIdentity=themeIdentities.includes(identity)?identity:'classic';
 const html=document.documentElement;if(html){html.dataset.theme=currentIdentity;html.dataset.mode=currentTheme;html.style.colorScheme=currentTheme;}
 document.body.classList.toggle('light-theme',currentTheme==='light');
 const theme=document.getElementById('themeIdentity'),select=document.getElementById('themeMode'),toggle=document.getElementById('themeToggle');
 if(theme)theme.value=currentIdentity;if(select)select.value=currentTheme;
 if(toggle){const source=currentTheme==='light'?'Nattläge':'Dagläge';if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source(toggle,source);else toggle.textContent=source;toggle.setAttribute('aria-pressed',String(currentTheme==='light'));}
 try{localStorage.setItem(appearanceKey,JSON.stringify({theme:currentIdentity,mode:currentTheme}));}catch{}
 if(globalThis.getComputedStyle){const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',getComputedStyle(document.body).getPropertyValue('--ui-bg').trim());}
 if(typeof Event!=='undefined')globalThis.dispatchEvent?.(new Event('filmlabb:appearance'));
}
document.getElementById('themeIdentity').onchange=e=>applyTheme(currentTheme,e.target.value);
document.getElementById('themeMode').onchange=e=>applyTheme(e.target.value);
document.getElementById('themeToggle').onclick=()=>applyTheme(currentTheme==='light'?'dark':'light');
globalThis.FILMLABB_APPEARANCE={get:()=>({theme:currentIdentity,mode:currentTheme}),set:(theme,mode=currentTheme)=>applyTheme(mode,theme),themes:[...themeIdentities]};
applyTheme(currentTheme,currentIdentity);
