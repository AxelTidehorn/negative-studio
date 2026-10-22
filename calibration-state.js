/* 3.8: one linear calibration domain, shared pixel kernel, bounded preview work. */
'use strict';
let config38=null,sourceVersion38=0,previewWorker38=null,workerBusy38=false,queued38=null,request38=0,lastPreview38=null,technicalCache38=null,analysisCount38=0;
const stats38={renders:0,stale:0,lastRenderMs:0,lastDispatchMs:0,analysisMs:0};
const now38=()=>globalThis.performance?.now?.()||Date.now();
function sorted38(a){return a.sort((a,b)=>a-b);}
function at38(a,q){return a[Math.floor(q*(a.length-1))]||0;}
// Scene statistics always use normalized linear samples inside the selected frame.
updateBase=function(){if(!workingPreview)return;};
analyzeLevels=function(){
 if(!workingPreview)return;const start=now38(),p=CE.sample(workingPreview,cropRegion,.012,20000),channels=[0,1,2].map(c=>sorted38(p.map(v=>v[c])));
 const measured=calibrationBase()||(!state.noBase?CE.findBase(workingPreview,cropRegion):null);
 const manual=!state.auto&&(calibrationBase()||((!sourceInfo.domain||sourceInfo.rawMode4==='reference')&&state.manualBase?{kind:'manual',confidence:1,measured:state.manualBase.map(v=>sourceInfo.encoding==='linear'?v/255:CE.decode(v/255))}:null));
 const film=manual||measured;
 const b=film?.measured?[...film.measured]:[0,1,2].map(c=>at38(channels[c],.995));
 const safe=b.map(v=>Math.max(1/65535,v));base=safe.map(v=>v*255);beta3Base=[...base];
 const light=currentLight();referenceGains=[...light];
 const lo=[],hi=[];
 for(let c=0;c<3;c++){const a=sorted38(channels[c].map(v=>Math.max(0,1-(state.noBase?v*light[c]:v/safe[c]))));lo[c]=at38(a,.015);hi[c]=at38(a,.985);}
 legacyLevels={lo,hi};beta3Levels=legacyLevels;levels=legacyLevels;
 // The base and source receive the same light correction. For measured film,
 // diagonal light gains cancel in the transmission ratio, as they should.
 const shape=CE.normalizeBase(safe.map((v,c)=>v*light[c]));
 const exposure=CE.quantile(p.map(v=>Math.max(...v.map((x,c)=>x*light[c]/shape[c]))),.99);
 const slopes=[Number(state.redSlope)||1,1,Number(state.blueSlope)||1];
 const lum=p.map(v=>v.map((x,c)=>-Math.log10(Math.max(1e-8,x*light[c]/(shape[c]*Math.max(1e-8,exposure))))*(state.engine==='density38'?slopes[c]:1))).map(d=>.2126*d[0]+.7152*d[1]+.0722*d[2]);sorted38(lum);
 const low=at38(lum,.015),high=at38(lum,.985);
 calibration={version:3,baseShape:shape,exposure,light:[...light],lo:low,hi:high,span:Math.max(.08,high-low),balance:[0,0,0],base:film||{kind:'fallback',confidence:0},count:p.length,region:CE.rect(cropRegion),clipped:p.filter(v=>v.some(x=>x>=.995||x<=1/65535)).length/p.length};
 // Preserve the original 3.7 calculation only for the explicit reference mode.
 if(state.engine==='reference'){base=state.manualBase||estimateBase(previewSrc);referenceGains=[1,1,1];legacyAnalyze();legacyLevels=levels;}
 $('baseInfo').textContent=film?((state.useRollBase?'Gemensam rullreferens':manual?'Manuell filmbas':'Automatisk filmkant')+' · linjära källvärden'):'Fallback · filmbas saknas. Uppskattning från motivet; kontrollera färgen.';
 $('levelsInfo').textContent=`${p.length} motivprov · ${calibration.clipped>.005?'klippta källvärden · ':''}linjär analys`;
 analysisCount38++;technicalCache38=null;config38=null;stats38.analysisMs=now38()-start;updateCalibrationUI();saveCurrentFrame();scheduleRender();
};
const calibrationUI38=updateCalibrationUI;
updateCalibrationUI=function(){calibrationUI38();$('engineMode').value=state.engine==='beta3'?'legacy':state.engine||'legacy';$('balanceStrength').disabled=['beta2','density38'].includes(state.engine);if(sharedLight&&sharedLight.encoding===sourceInfo.encoding)$('referenceStatus').textContent='Gemensam ljuskälla aktiv · '+sharedLight.name+' · samma korrektion på motiv och filmbas';};
function configuration38(opts=state){
 const kind=opts.engine==='reference'?'reference':opts.engine==='beta2'?'beta2':opts.engine==='density38'?'density38':'legacy',l=kind==='reference'?legacyLevels:beta3Levels;
 const spans=l?l.hi.map((v,c)=>Math.max(.04,v-l.lo[c])):[1,1,1];
 return {kind,opts:{...opts},noBase:!!opts.noBase,base:base.map(v=>v/255),light:kind==='reference'?[1,1,1]:currentLight(),levels:l,spans,ref:[...spans].sort((a,b)=>a-b)[1],cal:calibration,slopes:[Number(opts.redSlope)||1,1,Number(opts.blueSlope)||1],profile:activeFilmProfile(opts),print:printStyles[rollShared.print]||printStyles.neutral,neutralProfile:rollShared.profile==='generic',neutralPrint:rollShared.print==='neutral',strength:rollShared.strength,referenceEncoding:sourceInfo.encoding};
}
function compiled38(opts){const c=configuration38(opts),key=JSON.stringify(c);if(!config38||config38.key!==key)config38={key,kernel:NSPixelKernel.compile(c)};return config38.kernel;}
technicalPositive=function(p,opts){return compiled38(opts).pixel(p);};
neutralLookup=function(opts,im){if(!im||im.encoding!=='linear'||im.scale!==65535||rollShared.profile!=='generic'||rollShared.print!=='neutral'||opts.saturation!==1||opts.shadows||opts.highlights)return null;const k=compiled38(opts),t=[new Uint16Array(65536),new Uint16Array(65536),new Uint16Array(65536)];for(let i=0;i<65536;i++){const p=k.pixel([i/65535,i/65535,i/65535]);for(let c=0;c<3;c++)t[c][i]=Math.round(p[c]*65535);}return t;};
convertImage=function(image,mode,params){const im=image===previewSrc?workingPreview:working;if(!im)return new ImageData(1,1);const r=NSPixelKernel.render(im,configuration38(params),mode,Math.max(im.width,im.height));const out=new ImageData(r.width,r.height);out.data.set(r.data);return out;};
function showPreview38(r){const c=$('preview');c.width=r.width;c.height=r.height;const out=new ImageData(r.width,r.height);out.data.set(r.data);c.getContext('2d').putImageData(out,0,0);lastPreview38=r;drawHistogram38(r.bins);drawCrop();}
function drawHistogram38(bins){const canvas=$('histogram'),cx=canvas?.getContext('2d');if(!cx||typeof cx.clearRect!=='function')return;const w=canvas.width,h=canvas.height;cx.clearRect(0,0,w,h);const a=Array.from(bins).sort((a,b)=>a-b),max=Math.max(1,a[Math.floor(a.length*.99)]);cx.fillStyle=globalThis.getComputedStyle?.(document.body).getPropertyValue('--ns-muted').trim()||'#9fb1b5';for(let i=0;i<256;i++){const v=Math.min(1,bins[i]/max);cx.fillRect(i*w/256,h-v*(h-4),Math.ceil(w/256),v*(h-4));}$('histogramInfo').textContent=display==='negative'?'Negativ · luminans':display==='split'?'Jämförelse · luminans':'Positiv · luminans';}
function ensureWorker38(){if(previewWorker38||typeof Worker==='undefined')return;try{previewWorker38=new Worker('./preview-worker.js');previewWorker38.onmessage=({data:r})=>{workerBusy38=false;stats38.lastRenderMs=r.renderMs||0;if(r.id===request38&&!r.error)showPreview38(r);else stats38.stale++;if(r.error){previewWorker38.terminate();previewWorker38=null;workerDisabled38=true;render();return;}if(queued38){const next=queued38;queued38=null;sendPreview38(next);}};previewWorker38.onerror=()=>{previewWorker38.terminate();previewWorker38=null;workerBusy38=false;queued38=null;workerDisabled38=true;render();};}catch{workerDisabled38=true;}}
let workerVersion38=-1,workerDisabled38=false;
function sendPreview38(job){if(workerBusy38){queued38=job;return;}workerBusy38=true;previewWorker38.postMessage(job);}
render=function(limit=1400){if(!workingPreview)return;const t=now38(),id=++request38;stats38.renders++;const c=configuration38();if(!workerDisabled38)ensureWorker38();if(previewWorker38){if(workerVersion38!==sourceVersion38){const data=workingPreview.data.slice();previewWorker38.postMessage({type:'source',image:{...workingPreview,data}},[data.buffer]);workerVersion38=sourceVersion38;}sendPreview38({id,config:c,mode:display,limit:typeof limit==='number'?limit:1400});}else showPreview38(NSPixelKernel.render(workingPreview,c,display,typeof limit==='number'?limit:1400));stats38.lastDispatchMs=now38()-t;if(!previewWorker38)stats38.lastRenderMs=stats38.lastDispatchMs;};
let dragTimer38=null,previewTick38=null;
scheduleRender=function(immediate=false){if(!workingPreview)return;++request38;clearTimeout(dragTimer38);if(immediate){clearTimeout(previewTick38);previewTick38=null;render();return;}if(!previewTick38)previewTick38=setTimeout(()=>{previewTick38=null;render(700);},40);dragTimer38=setTimeout(()=>render(1400),180);};
const finish38=finishImport;
finishImport=function(message){sourceVersion38++;lastPreview38=null;config38=null;technicalCache38=null;finish38(message);};
$('engineMode').onchange=e=>{state.engine=e.target.value;analyzeLevels();render();persist();};
for(const id of ['redSlope','blueSlope'])$(id).addEventListener('change',()=>{analyzeLevels();render();});
function technicalTables38(config){
 const complete=config.neutralProfile&&config.neutralPrint&&config.opts.saturation===1&&!config.opts.shadows&&!config.opts.highlights;
 const key=JSON.stringify({kind:config.kind,levels:config.levels,base:config.base,light:config.light,noBase:config.noBase,cal:config.cal,slopes:config.slopes,auto:config.opts.autoLevels,balance:config.opts.balanceStrength,final:complete?config:null});
 if(!technicalCache38||technicalCache38.key!==key){const k=NSPixelKernel.compile(config),t=complete?NSPixelKernel.completeTables(config,k).map(a=>Uint16Array.from(a,v=>Math.round(v*65535))):NSPixelKernel.tables(k);technicalCache38={key,value:t,complete};}
 return technicalCache38.value;
}
// TIFF chunking keeps the UI responsive. The table is technical-only: profiles,
// saturation, shadows and highlights all retain the exact shared final pixel path.
exportTiff=async function(){if(!exportReady())return;exportBusy=true;$('exportTiff').disabled=true;const im=working,opts={...state},c=configuration38(opts),g=CE.exportGeometry(im,{...cropRegion},opts.cropExport,opts.rotation);try{if(g.width*g.height*6>=4294960000)throw Error('Bilden är för stor för klassisk TIFF.');const parts=[tiffHeader(g.width,g.height)],prepared=NSPixelKernel.prepare(im,c);for(let y=0;y<g.height;y+=16){const rows=Math.min(16,g.height-y),out=NSPixelKernel.exportRows(im,c,g,y,rows,null,false,prepared);if(new Uint8Array(new Uint16Array([1]).buffer)[0]===1)parts.push(out);else{const bytes=new Uint8Array(out.length*2),dv=new DataView(bytes.buffer);for(let i=0;i<out.length;i++)dv.setUint16(i*2,out[i],true);parts.push(bytes);}if(y%64===0){setStatus(`TIFF ${Math.round(100*(y+rows)/g.height)} %`);await new Promise(r=>setTimeout(r,0));}}downloadBlob(new Blob(parts,{type:'image/tiff'}),'filmlabb-positive-16bit.tif');setStatus(`TIFF 16 bit · ${g.width}×${g.height} · inbäddad sRGB-profil`);}catch(e){setStatus('Exportfel: '+e.message);}finally{exportBusy=false;$('exportTiff').disabled=false;}};
$('exportTiff').onclick=()=>exportTiff();
const clear38=$('clearQueue').onclick;
$('clearQueue').onclick=()=>{++request38;queued38=null;lastPreview38=null;technicalCache38=null;config38=null;clearTimeout(previewTick38);clearTimeout(dragTimer38);if(previewWorker38){previewWorker38.terminate();previewWorker38=null;}workerBusy38=false;workerVersion38=-1;clear38();};
// Small diagnostics surface, no source pixels or files exposed.
globalThis.FILMLABB_PERFORMANCE={snapshot:()=>({...stats38,analyses:analysisCount38,worker:!!previewWorker38})};
makeExportCanvas=function(){const im=working,c=configuration38(),g=CE.exportGeometry(im,{...cropRegion},state.cropExport,state.rotation),canvas=document.createElement('canvas');canvas.width=g.width;canvas.height=g.height;const cx=canvas.getContext('2d',{colorSpace:'srgb'}),out=cx.createImageData(g.width,g.height),table=im.encoding==='linear'&&im.scale===65535&&(im.normalization||1)===1&&c.kind!=='reference'?technicalTables38(c):null,complete=!!(table&&technicalCache38?.complete);for(let y=0;y<g.height;y+=32){const rows=Math.min(32,g.height-y),samples=NSPixelKernel.exportRows(im,c,g,y,rows,table,complete);for(let i=0;i<samples.length;i+=3){const j=(y*g.width+i/3)*4;out.data[j]=Math.round(samples[i]/257);out.data[j+1]=Math.round(samples[i+1]/257);out.data[j+2]=Math.round(samples[i+2]/257);out.data[j+3]=255;}}cx.putImageData(out,0,0);return canvas;};
const choose38=chooseFrame;
chooseFrame=async function(i,opts){if(i<0||i>=roll.length||rollLoading||exportBusy)return;++request38;queued38=null;return choose38(i,opts);};

// Batch must use the active shared color pipeline, not the captured legacy writer.
exportFrameTiff=async function(i){await chooseFrame(i,{force:true});if(!working)throw Error('Bilden kunde inte läsas');return exportTiff();};
