
'use strict';
// Safari on iPad may still interpret pinch gestures as browser page zoom.
// Only block the page-level gesture: image zoom buttons and scrolling remain available.
if(typeof document.addEventListener==='function'){
 for(const type of ['gesturestart','gesturechange','gestureend']){
  document.addEventListener(type,event=>event.preventDefault(),{passive:false});
 }
}
const $=id=>document.getElementById(id);
const controls=[['exposure','Exponering',-2,2,.05,0,' EV'],['contrast','Kontrast',.5,1.7,.02,1,'×'],['temperature','Varm / kall',-35,35,1,0,''],['tint','Grön / magenta',-35,35,1,0,''],['saturation','Färgmättnad',0,1.8,.02,1,'×'],['balanceStrength','Autofärgbalans',0,1,.05,.75,'×'],['shadow','Svartpunkt',0,.12,.005,.015,''],['highlight','Vitpunkt',.85,1,.005,.99,''],['gamma','Mellantoner',.65,1.6,.025,1,'×'],['shadows','Skuggor',-100,100,1,0,''],['highlights','Högdagrar',-100,100,1,0,''],['redSlope','Röd kanallutning',.7,1.3,.01,1,'×'],['blueSlope','Blå kanallutning',.7,1.3,.01,1,'×']];
const defaultState=()=>({auto:true,exposure:0,contrast:1,temperature:0,tint:0,saturation:1,balanceStrength:.75,shadow:.015,highlight:.99,gamma:1,shadows:0,highlights:0,noBase:false,autoLevels:true,manualBase:null,rotation:0,engine:"calibrated4",analysisSampling:"source",useFlatField:false,jpegSize:"original",rawMode4:"protected",toneMode4:"smooth",colorMode4:"legacy",response4:null,useRollResponse4:false,sourceCalibrationVersion:39,redSlope:1,blueSlope:1,cropConfirmed:false,cropVisible:true,cropLocked:false,cropExport:false,cropMethod:"auto",manualCalibration:null,useRollBase:false,tiffEncoding:"srgb"});
let state=defaultState(),src=null,previewSrc=null,hires=null,display='positive',base=[235,167,105],sampleMode=false,fullWidth=0,fullHeight=0,levels=null;
const clamp=(x,min=0,max=255)=>Math.max(min,Math.min(max,x));
try{const prev=JSON.parse(localStorage.getItem('negative-studio-v03')||'null');if(prev&&typeof prev==='object')state={...state,...prev,analysisSampling:prev.analysisSampling==='source'?'source':'preview'}}catch(e){}
// Each slider has a visually centered neutral position, even for asymmetric physical ranges.
// Its data model stays in the original units for compatibility with saved projects.
function sliderToUI(value,min,max,neutral){const v=clamp(Number(value),min,max);return v<=neutral?(neutral===min?500:500*(v-min)/(neutral-min)):(neutral===max?500:500+500*(v-neutral)/(max-neutral));}
function sliderFromUI(position,min,max,step,neutral){const t=Number(position),v=t<=500?min+(neutral-min)*t/500:neutral+(max-neutral)*(t-500)/500;return clamp(Math.round(v/step)*step,min,max);}
function setSliderPosition(id){const cfg=controls.find(c=>c[0]===id);if(cfg)$(id).value=sliderToUI(state[id],cfg[2],cfg[3],cfg[5]);}
for(const [id,label,min,max,step,val,unit] of controls){const div=document.createElement('div');div.className='control';if(['redSlope','blueSlope'].includes(id))div.dataset.legacySlope='true';div.innerHTML=`<label for="${id}">${label}<output id="${id}Value"></output></label><input id="${id}" type="range" min="0" max="1000" step="1" aria-label="${label}" style="--neutral:50%">`;$( ['exposure','contrast','temperature','tint','saturation','shadows','highlights','gamma'].includes(id) ? 'simpleControls' : 'controls').append(div);setSliderPosition(id);$(id).addEventListener('input',()=>{state[id]=sliderFromUI($(id).value,min,max,step,val);updateValues();
scheduleRender();schedulePersist()});$(id).addEventListener('change',()=>{scheduleRender(true);persist()})}
// Double-click (or double-tap on touch devices) to restore the individual slider's original default.
// The centred UI sliders use 0–1000 internally, so restore their documented data value instead.
function restoreSliderDefault(slider,id=slider.id){
 const cfg=controls.find(c=>c[0]===id);
 if(cfg){state[id]=cfg[5];setSliderPosition(id);updateValues();scheduleRender(true);persist();saveCurrentFrame();}
 else{slider.value=slider.defaultValue;slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));}
}
for(const id of [...controls.map(c=>c[0]),'profileStrength','cropInset']){
 const slider=$(id);if(!slider)continue;
 slider.title=(slider.title?slider.title+' · ':'')+'Dubbelklicka eller dubbeltryck för att återställa';
 slider.addEventListener('dblclick',e=>{e.preventDefault();restoreSliderDefault(slider,id)});
 let previousTap=0;
 slider.addEventListener('touchend',e=>{
  const now=Date.now();
  if(now-previousTap<350){e.preventDefault();previousTap=0;restoreSliderDefault(slider,id)}
  else previousTap=now;
 },{passive:false});
}
// Optional naming is independent of per-frame processing settings.
function safeExportPrefix(value){return String(value||'').normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1F]/g,'_').replace(/\s+/g,' ').replace(/[. ]+$/g,'').trim().slice(0,100);}
function exportName(index,extension,legacy){const prefix=safeExportPrefix($('exportName')?.value);if(!prefix)return legacy;return prefix+(index===null?'':'_'+String(index+1).padStart(Number($('exportDigits')?.value)||3,'0'))+'.'+extension;}
function exportZipName(){const prefix=safeExportPrefix($('exportName')?.value);return prefix?prefix+'.zip':'filmlabb-filmrulle.zip';}
function syncExportNaming(){const prefix=safeExportPrefix($('exportName').value);$('exportNamePreview').textContent=prefix?'Exempel: '+exportName(0,'jpg','bild_001.jpg')+' · '+exportName(1,'jpg','bild_002.jpg'):'Standardnamn används: bild_001.jpg, bild_002.jpg …';try{localStorage.setItem('filmlabb-export-name-v1',JSON.stringify({prefix:$('exportName').value,digits:$('exportDigits').value}))}catch{}}
try{const prior=JSON.parse(localStorage.getItem('filmlabb-export-name-v1')||'null');if(prior){$('exportName').value=prior.prefix||'';$('exportDigits').value=String(prior.digits||3);}}catch{}
$('exportName').addEventListener('input',syncExportNaming);$('exportDigits').addEventListener('change',syncExportNaming);syncExportNaming();
const themeKey='negative-studio-theme-v092';
let currentTheme='dark';try{currentTheme=localStorage.getItem(themeKey)||'dark'}catch(e){}
function applyTheme(theme){currentTheme=theme;document.body.classList.toggle('light-theme',theme==='light');const m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',theme==='light'?'#e9e8e3':'#1c1c1c');if($('themeToggle'))$('themeToggle').textContent=theme==='light'?'Nattläge':'Dagläge';}
applyTheme(currentTheme);
$('themeToggle').onclick=()=>{applyTheme(currentTheme==='light'?'dark':'light');try{localStorage.setItem(themeKey,currentTheme)}catch(e){}};

$('auto').checked=!!state.auto;$('noBase').checked=!!state.noBase;$('autoLevels').checked=!!state.autoLevels;
function updateValues(){for(const [id,,min,max,step,,unit] of controls){const v=Number(state[id]);$(id+'Value').textContent=(id==='exposure'&&v>0?'+':'')+v.toFixed(step<1?2:0)+unit}}
let persistTimer=null;function schedulePersist(){clearTimeout(persistTimer);persistTimer=setTimeout(persist,450)}
function persist(){clearTimeout(persistTimer);try{localStorage.setItem('negative-studio-v03',JSON.stringify(state))}catch(e){}}
updateValues();
for(const id of ['imageFile','referenceFile'])$(id).accept=NSFileFormats.accept;
function setStatus(s){$('status').textContent=s}
