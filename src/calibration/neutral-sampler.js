/* Positive neutral-pipette; independent of negative reconstruction. */
'use strict';
let neutralSample39=false;
$('neutralSample').onclick=()=>{neutralSample39=!neutralSample39;sampleMode=false;$('neutralSample').textContent=neutralSample39?'Välj en neutral yta i motivet…':'Neutralpipett';setStatus(neutralSample39?'Välj en känd neutral grå yta i motivet, inte hud eller en klippt högdager.':'Neutralpipetten avbruten.');};
$('preview').addEventListener('click',e=>{
 if(!neutralSample39||!working)return;e.stopImmediatePropagation();const p=imagePoint(e);if(p.x<frameRegion().x||p.x>frameRegion().x+frameRegion().w||p.y<frameRegion().y||p.y>frameRegion().y+frameRegion().h){setStatus('Välj en neutral yta innanför filmrutan.');return;}
 const samples=[],x=Math.floor(p.x*working.width),y=Math.floor(p.y*working.height),opts={...state,temperature:0,tint:0,saturation:1,vibrance:0,shadows:0,highlights:0,contrast:1,exposure:0},saved={...rollShared};
 try{rollShared.look={id:'neutral',strength:0};rollShared.monochrome=false;for(let yy=Math.max(0,y-2);yy<=Math.min(working.height-1,y+2);yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(working.width-1,x+2);xx++)samples.push(technicalPositive(sourcePixel(working,xx,yy),opts));}finally{Object.assign(rollShared,saved);config38=null;}
 const q=[0,1,2].map(c=>CE.quantile(samples.map(v=>v[c]),.5));if(Math.min(...q)<.04||Math.max(...q)>.94){setStatus('Provet är för mörkt eller klippt. Välj en mellangrå yta.');return;}
 const [r,g,b]=q.map(v=>Math.log(Math.max(1e-6,state.engine==='calibrated4'||NSEditing2.version(state.editVersion)===2?CE.decode(v):v)));state.temperature=CE.clamp((b-r)*90,-35,35);state.tint=CE.clamp((g-(r+b)/2)/(1/120+1/350),-35,35);
 neutralSample39=false;$('neutralSample').textContent='Neutralpipett';syncControls();saveCurrentFrame();persist();render();setStatus('Positiv färgbalans justerad från neutralprovet.');
},true);

$('sample').addEventListener('click',()=>{neutralSample39=false;$('neutralSample').textContent='Neutralpipett';});
