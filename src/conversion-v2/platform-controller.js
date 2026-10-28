/* Bind existing source/analysis/base/queue owners; no independent editor/export. */
'use strict';
// Device preferences never seed a new image with the last image's recipe.
state.v2Recipe=null;
delete state.rawSourceRecipeV2;
let v2AnalysisCount=0,v2LastSource=null,v2LastKey=null,v2AutomaticCache=null;
function v2Area(){return state.cropConfirmed?{region:{...cropRegion},status:'confirmed'}:{region:{...cropRegion},status:'estimated',method:'application-frame',confidence:Number(state.cropConfidence)||0};}
function preparePlatformV2(){
 if(state.engine!=='v2'||!working)return;
 if(!NSV2Platform.validSource(working))throw Error('V2 kräver verifierad linjär Rec.2020.');
 const file=roll[activeFrame]?.file,ctx=capture2(),saved=accepted2(),proposed=effectiveProposal2()?.measurement,explicit=state.filmBaseVersion===2?saved?.measurement:!state.auto?calibrationBase():null;
 const regionKey=JSON.stringify(cropRegion);
 if(!explicit&&!state.noBase&&(v2AutomaticCache?.source!==working||v2AutomaticCache.regionKey!==regionKey))v2AutomaticCache={source:working,regionKey,measurement:CE.findBase(working,cropRegion)};
 const automatic=!explicit&&!state.noBase?v2AutomaticCache?.measurement:null;
 const measurement=!state.noBase?(proposed?{...proposed,preview:true}:explicit||(automatic?{...automatic,acceptance:'automatic-platform'}:null)):null;
 const sourceKey=JSON.stringify([file?.name,file?.size,file?.lastModified,working.width,working.height,sourceInfo.rawMetadata?.options||sourceInfo.domain,ctx]);
 const key=JSON.stringify([sourceKey,measurement?.measured,measurement?.kind,!!proposed,!!state.noBase,state.v2Recipe?.calibration||NSConversionV2.prior,v2Area()]);
 if(v2LastSource===working&&v2LastKey===key&&state.v2Recipe)return;
 const previous=state.v2Recipe;
 state.v2Recipe=NSV2Platform.prepare(working,{sourceKey,recipe:sourceInfo.rawMetadata,capture:{session:state.captureSession2||'local-session',recipe:{domain:sourceInfo.domain,options:sourceInfo.rawMetadata?.options||null},whiteBalance:sourceInfo.whiteBalance||null,flatField:working.flatField||null},measurement,area:v2Area(),previous});
 if(state.v2Recipe.intent.id!==previous?.intent.id)v2AnalysisCount++;
 v2LastSource=working;v2LastKey=key;config38=null;technicalCache38=null;
}
const configBeforeV2=configuration38;
configuration38=function(opts=state){const c=configBeforeV2(opts);if(opts.engine==='v2'){preparePlatformV2();c.kind='v2';c.workingSpace='rec2020';c.v2=state.v2Recipe;}return c;};
const analyzeBeforeV2=analyzeLevels;
analyzeLevels=function(){const result=analyzeBeforeV2();if(state.engine==='v2'&&working){preparePlatformV2();controls4();saveCurrentFrame();}return result;};
const controlsBeforeV2=controls4;
controls4=function(...args){if(state.engine!=='v2'){for(const id of ['balanceStrength','redSlope','blueSlope'])$(id).disabled=false;$('rawMode4').disabled=rollLoading||exportBusy;}const result=controlsBeforeV2(...args);if(state.engine==='v2'){
 const r=state.v2Recipe;
 $('calibrationStatus4').textContent='V2 · experimentell · CPU · '+(r?(r.base.origin==='prior'?'Filmbas saknas – mät och godkänn filmkant':'Uppmätt filmbas')+' · '+(r.intent.analysis.exposure.fallback?'Ton: fallback':'Ton: aktiv')+' · '+(r.intent.colorCorrection.kind==='identity'?'Färg: avstår':'Färg: aktiv'):'Väntar på linjär källa');
 for(const id of ['rawMode4','balanceStrength','redSlope','blueSlope'])$(id).disabled=true;
 }return result;};
// Manual base warnings are advisory in V2, exactly as in its existing lab.
const measureBeforeV2=FM2.measure;
FM2.measure=function(im,region,options={}){if(state.engine!=='v2'||im!==working)return measureBeforeV2(im,region,options);
 const ps=[],m=FM2.measureRegions(im,[region],{...options,kind:options.kind||'manual-region',limit:options.limit||8192,samplePixel(im,x,y){const p=NSV2Platform.read(im,(y*im.width+x)*3);if(p.every(v=>Number.isFinite(v)&&v>0))ps.push({p,clipped:p.map(v=>v>=.999),dark:p.map(v=>v<=1e-6)});return {p,clipped:p.map(v=>v>=.999),dark:p.map(v=>v<=1e-6)};}});
 if(!ps.length)return {...m,status:'missing'};
 const valid=FM2.summarize(im,ps,[region],options.kind||'manual-region');return {...valid,status:valid.status==='missing'?'review':valid.status,numericStatus:'valid',origin:'manual',validSamples:ps.length,invalidSamples:m.samples-ps.length,totalSamples:m.samples,reasons:[...valid.reasons,...(ps.length<m.samples?['Ogiltiga RGB-prov uteslutna gemensamt']:[])]};
};
const engineBeforeV2=$('engineMode').onchange;
$('engineMode').onchange=async e=>{
 const next=e.target.value,previous=state.engine,previousSettings=NSProjectSettings.clone(state);
 if(next===previous)return;
 if(rollLoading||exportBusy||rollingExport){e.target.value=previous;return;}
 if(next==='v2'){
  const file=roll[activeFrame]?.file,raw=file&&NSFileFormats.isRaw(file);
  if(working&&!raw&&!NSV2Platform.validSource(working)){e.target.value=previous;setStatus('V2 kräver RAW eller verifierad linjär Rec.2020-TIFF.');return;}
  if(raw&&!NSV2Platform.usesLockedSource(state))state.v2LegacyRawMode4=state.rawMode4;
  stopPreviewWork();state.engine='v2';state.conversionVersion=2;state.v2LegacyEditVersion=state.editVersion;state.editVersion=2;
  if(raw&&(!working||!sourceInfo.v2Decoded)){
   state.rawMode4='wide';state.rawSourceRecipeV2=1;saveCurrentFrame();setStatus('V2: samma original avkodas på nytt med låst linjärt Rec.2020-recept.');
   v2LastSource=null;v2AutomaticCache=null;working=workingPreview=hires=src=calibration=null;await chooseFrame(activeFrame,{force:true});
  if(!working)state=previousSettings;
  }else if(working){workingPreview=NSV2Platform.preview(working);sourceVersion38++;analyzeLevels();render();}
 }else if(previous==='v2'||NSV2Platform.usesLockedSource(state)&&['log39','legacy','reference'].includes(next)){
  stopPreviewWork();state.engine=next;state.conversionVersion=1;if(previous==='v2')state.editVersion=state.v2LegacyEditVersion||2;
  if(['log39','legacy','reference'].includes(next)&&roll[activeFrame]&&NSFileFormats.isRaw(roll[activeFrame].file)){
   state.rawMode4=['reference','protected'].includes(state.v2LegacyRawMode4)?state.v2LegacyRawMode4:'protected';delete state.rawSourceRecipeV2;saveCurrentFrame();setStatus('Original: avkodar samma fil i dess linjära sRGB-domän.');v2LastSource=null;v2AutomaticCache=null;working=workingPreview=hires=src=calibration=null;await chooseFrame(activeFrame,{force:true});
   if(!working)state=previousSettings;
  }else if(sourceInfo.colorSpace==='rec2020'&&['log39','legacy','reference'].includes(next)){state=previousSettings;e.target.value=previous;setStatus('Original kräver en sRGB-källa.');return;
  }else{if(working)workingPreview=CE.preview(working,1400,state.previewSampling);sourceVersion38++;analyzeLevels();render();}
 }else return engineBeforeV2(e);
 controls4();syncControls();saveCurrentFrame();persist();
};
const rawBeforePlatformV2=$('rawMode4').onchange;
$('rawMode4').onchange=async e=>{if(state.engine==='v2'||rollLoading||exportBusy||rollingExport){e.target.value=state.rawMode4;return;}delete state.rawSourceRecipeV2;return rawBeforePlatformV2(e);};
const confirmBeforeV2=$('cropConfirm').onclick;
$('cropConfirm').onclick=()=>{confirmBeforeV2();if(state.engine==='v2'){analyzeLevels();render();}};
globalThis.FILMLABB_V2=Object.freeze({snapshot:()=>({recipe:state.v2Recipe,analysisCount:v2AnalysisCount,sourceVersion:sourceVersion38})});

const chooseBeforePlatformV2=chooseFrame;
chooseFrame=async function(index,opts={}){if(!rollLoading&&!exportBusy&&(opts.force||index!==activeFrame)){v2LastSource=null;v2LastKey=null;v2AutomaticCache=null;}const result=await chooseBeforePlatformV2(index,opts);if(state.engine!=='v2'||!working){v2LastSource=null;v2LastKey=null;v2AutomaticCache=null;}return result;};
const clearBeforePlatformV2=$('clearQueue').onclick;$('clearQueue').onclick=()=>{const result=clearBeforePlatformV2();v2LastSource=null;v2LastKey=null;v2AutomaticCache=null;return result;};
