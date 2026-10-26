
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
const defaultState=NSProjectSettings.imageDefaults;
let analyzeLevels,finishImport,chooseFrame,setCropByInset,updateBase,render,scheduleRender,convertImage,technicalPositive,neutralLookup,exportTiff,exportFrameTiff,jpegBytes;
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

function setDisplay(mode){display=mode;for(const [id,value] of [['tabPos','positive'],['tabNeg','negative'],['tabSplit','split']])$(id).classList.toggle('active',mode===value);render()}
$('tabPos').onclick=()=>setDisplay('positive');$('tabNeg').onclick=()=>setDisplay('negative');$('tabSplit').onclick=()=>setDisplay('split');
$('auto').onchange=()=>{state.auto=$('auto').checked;updateBase();analyzeLevels();persist();render()};$('noBase').onchange=()=>{state.noBase=$('noBase').checked;updateBase();analyzeLevels();persist();render()};$('autoLevels').onchange=()=>{state.autoLevels=$('autoLevels').checked;persist();render()};$('analyzeLevels').onclick=()=>analyzeLevels();$('recalc').onclick=()=>{state.auto=true;state.manualBase=null;$('auto').checked=true;updateBase();analyzeLevels();persist();render()};
$('sample').onclick=()=>{sampleMode=!sampleMode;$('sample').textContent=sampleMode?'Tryck på en oexponerad filmkant…':'Välj filmbas med pipett';setStatus(sampleMode?'Tryck på en tydligt oexponerad filmkant i bilden för att välja basfärg.':'Pipetten avbruten.')};
$('reset').onclick=()=>{const frame=Object.fromEntries(['rotation','cropMethod','cropConfirmed','cropConfidence','cropLocked','cropExport','cropVisible'].map(k=>[k,state[k]])),keepBase=state.manualBase,keepAuto=state.auto,keepNoBase=state.noBase;state={...defaultState(),...frame,manualBase:keepBase,auto:keepAuto,noBase:keepNoBase};for(const [id] of controls)$(id).value=state[id];updateValues();analyzeLevels();persist();render()};
