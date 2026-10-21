/* 3.9: log-channel response, central-frame detection and source diagnostics. */
'use strict';
const analyzeBefore39=analyzeLevels,configBefore39=configuration38;
NSColorEngine.detectFrame=NSColorAnalysis.detect;
analyzeLevels=function(){
 analyzeBefore39();if(!workingPreview||!calibration)return;
 calibration.log39=NSColorAnalysis.analyze(workingPreview,cropRegion);config38=null;technicalCache38=null;
 const s=calibration.log39,labels=['R','G','B'],warnings=s.clipped.map((v,c)=>v>.005?`${labels[c]} ${Math.round(v*1000)/10} %`:null).filter(Boolean);
 $('levelsInfo').textContent=`${s.count} motivprov · ${s.weak?'lågt tonomfång · ':''}${warnings.length?'Klippt RGB: '+warnings.join(' / '):'Ingen tydlig kanalklippning'} · ${state.engine==='log39'?'densitetskurvor':'jämförelse'}`;
 $('balanceStrength').disabled=['log39','beta2','density38'].includes(state.engine);
 $('balanceStrength').title=state.engine==='log39'?'Kanalkurvorna balanseras separat. Varm/kall och Grön/magenta justerar den positiva färgen.':'';
 for(const id of ['redSlope','blueSlope'])$(id).disabled=state.engine!=='density38';
};
configuration38=function(opts=state){const c=configBefore39(opts);if(opts.engine==='log39'){c.kind='log39';c.cal={...calibration,log39:calibration?.log39||NSColorAnalysis.analyze(workingPreview,cropRegion)};}return c;};
try{const previous=JSON.parse(localStorage.getItem('negative-studio-v03')||'null');if(previous&&previous.sourceCalibrationVersion!==39&&previous.manualCalibration?.sourceEncoding==='linear'){state.manualCalibration=null;state.manualBase=null;state.useRollBase=false;state.auto=true;}state.sourceCalibrationVersion=39;}catch{}
try{if(!localStorage.getItem('filmlabb-default-engine39')){if(state.engine==='legacy'||state.engine==='beta3')state.engine='log39';localStorage.setItem('filmlabb-default-engine39','1');persist();}}catch{}
$('engineMode').value=state.engine;
let neutralSample39=false;
$('neutralSample').onclick=()=>{neutralSample39=!neutralSample39;sampleMode=false;$('neutralSample').textContent=neutralSample39?'Välj en neutral yta i motivet…':'Neutralpipett';setStatus(neutralSample39?'Välj en känd neutral grå yta i motivet, inte hud eller en klippt högdager.':'Neutralpipetten avbruten.');};
$('preview').addEventListener('click',e=>{
 if(!neutralSample39||!working)return;e.stopImmediatePropagation();const p=imagePoint(e);if(p.x<cropRegion.x||p.x>cropRegion.x+cropRegion.w||p.y<cropRegion.y||p.y>cropRegion.y+cropRegion.h){setStatus('Välj en neutral yta innanför filmrutan.');return;}
 const samples=[],x=Math.floor(p.x*working.width),y=Math.floor(p.y*working.height),opts={...state,temperature:0,tint:0,saturation:1,shadows:0,highlights:0,contrast:1,exposure:0},saved={...rollShared};
 try{rollShared.profile='generic';rollShared.print='neutral';rollShared.strength=0;for(let yy=Math.max(0,y-2);yy<=Math.min(working.height-1,y+2);yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(working.width-1,x+2);xx++)samples.push(technicalPositive(sourcePixel(working,xx,yy),opts));}finally{Object.assign(rollShared,saved);config38=null;}
 const q=[0,1,2].map(c=>CE.quantile(samples.map(v=>v[c]),.5));if(Math.min(...q)<.04||Math.max(...q)>.94){setStatus('Provet är för mörkt eller klippt. Välj en mellangrå yta.');return;}
 const [r,g,b]=q.map(v=>Math.log(Math.max(1e-6,v)));state.temperature=CE.clamp((b-r)*90,-35,35);state.tint=CE.clamp((g-(r+b)/2)/(1/120+1/350),-35,35);
 neutralSample39=false;$('neutralSample').textContent='Neutralpipett';syncControls();saveCurrentFrame();persist();render();setStatus('Positiv färgbalans justerad från neutralprovet.');
},true);

const chooseBefore39=chooseFrame;
chooseFrame=async function(i,opts){neutralSample39=false;$('neutralSample').textContent='Neutralpipett';$('neutralSample').disabled=true;try{return await chooseBefore39(i,opts);}finally{$('neutralSample').disabled=!working;}};
const clearBefore39=$('clearQueue').onclick;
$('clearQueue').onclick=()=>{neutralSample39=false;$('neutralSample').textContent='Neutralpipett';clearBefore39();$('neutralSample').disabled=!working;};

const finishBefore39=finishImport;
finishImport=function(message){finishBefore39(message);$('neutralSample').disabled=!working;};
const filmSampleBefore39=$('sample').onclick;
$('sample').onclick=()=>{neutralSample39=false;$('neutralSample').textContent='Neutralpipett';filmSampleBefore39();};
