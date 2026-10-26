/* Shared technical analysis and CPU-preview lifecycle. Algorithms retain their project versions. */
'use strict';
let analysisCount38=0;
function sorted38(a){return a.sort((a,b)=>a-b);}
function at38(a,q){return a[Math.floor(q*(a.length-1))]||0;}
// Scene statistics always use normalized linear samples inside the selected frame.
updateBase=function(){if(!workingPreview)return;};
function analyzeSharedLevels(){
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
 if(state.engine==='reference'){base=state.manualBase||estimateBase(previewSrc);referenceGains=[1,1,1];analyzeLegacyReference();legacyLevels=levels;}
 $('baseInfo').textContent=film?((state.useRollBase?'Gemensam rullreferens':manual?'Manuell filmbas':'Automatisk filmkant')+' · linjära källvärden'):'Fallback · filmbas saknas. Uppskattning från motivet; kontrollera färgen.';
 $('levelsInfo').textContent=`${p.length} motivprov · ${calibration.clipped>.005?'klippta källvärden · ':''}linjär analys`;
 analysisCount38++;technicalCache38=null;config38=null;stats38.analysisMs=now38()-start;updateCalibrationUI();saveCurrentFrame();scheduleRender();
};
const calibrationUI38=updateCalibrationUI;
updateCalibrationUI=function(){calibrationUI38();$('engineMode').value=state.engine==='beta3'?'legacy':state.engine||'legacy';$('balanceStrength').disabled=['beta2','density38'].includes(state.engine);if(sharedLight&&sharedLight.encoding===sourceInfo.encoding)$('referenceStatus').textContent='Gemensam ljuskälla aktiv · '+sharedLight.name+' · samma korrektion på motiv och filmbas';};
const finish38=finishImport;
finishImport=function(message){sourceVersion38++;lastPreview38=null;config38=null;technicalCache38=null;finish38(message);};
$('engineMode').onchange=e=>{state.engine=e.target.value;analyzeLevels();render();persist();};
for(const id of ['redSlope','blueSlope'])$(id).addEventListener('change',()=>{analyzeLevels();render();});
const clear38=$('clearQueue').onclick;
$('clearQueue').onclick=()=>{++request38;queued38=null;lastPreview38=null;technicalCache38=null;config38=null;clearTimeout(previewTick38);clearTimeout(dragTimer38);if(previewWorker38){previewWorker38.terminate();previewWorker38=null;}workerBusy38=false;workerVersion38=-1;clear38();};
// Small diagnostics surface, no source pixels or files exposed.
globalThis.FILMLABB_PERFORMANCE={snapshot:()=>({...stats38,analyses:analysisCount38,worker:!!previewWorker38})};
const choose38=chooseFrame;
chooseFrame=async function(i,opts){if(i<0||i>=roll.length||rollLoading||exportBusy)return;++request38;queued38=null;return choose38(i,opts);};

// Batch must use the active shared color pipeline, not the captured legacy writer.
exportFrameTiff=async function(i){await chooseFrame(i,{force:true});if(!working)throw Error('Bilden kunde inte läsas');return exportTiff();};
