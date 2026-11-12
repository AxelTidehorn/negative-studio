/* Bind existing source/analysis/base/queue owners; no independent editor/export. */
'use strict';
// Device preferences never seed a new image with the last image's recipe.
state.v2Recipe=null;
delete state.rawSourceRecipeV2;
let v2AnalysisCount=0,v2LastSource=null,v2LastKey=null,v2AutomaticCache=null;
function v2Area(){
 return NSFrameSelection.area(state.frame);
}
function preparePlatformV2(){
 if(state.engine!=='v2'||!working)return;
 if(!NSV2Platform.validSource(working))throw Error('V2 kräver verifierad linjär Rec.2020.');
 const file=roll[activeFrame]?.file,ctx=capture2(),saved=accepted2(),proposed=effectiveProposal2()?.measurement,explicit=state.filmBaseVersion===2?saved?.measurement:!state.auto?calibrationBase():null;
 // Filmbas 2 owns proposal/acceptance. Its findBase guard must also apply to
 // an automatic result cached before Filmbas 2 was activated.
 const regionKey=JSON.stringify(v2Area()),automaticAllowed=state.filmBaseVersion!==2&&!explicit&&!state.noBase&&NSV2Render.trustedArea(v2Area());
 if(automaticAllowed&&(v2AutomaticCache?.source!==working||v2AutomaticCache.regionKey!==regionKey))v2AutomaticCache={source:working,regionKey,measurement:CE.findBase(working,frameRegion())};
 const automatic=automaticAllowed?v2AutomaticCache?.measurement:null;
 const measurement=!state.noBase?(proposed?{...proposed,preview:true}:explicit||(automatic?{...automatic,acceptance:'automatic-platform'}:null)):null;
 const sourceKey=JSON.stringify([file?.name,file?.size,file?.lastModified,working.width,working.height,sourceInfo.rawMetadata?.options||sourceInfo.domain,ctx]);
 const key=JSON.stringify([sourceKey,measurement?.measured,measurement?.kind,!!proposed,!!state.noBase,state.v2Recipe?.algorithmVersion??NSV2Platform.ALGORITHM,state.v2Recipe?.calibration||NSConversionV2.latestPrior||NSConversionV2.prior,v2Area()]);
 if(v2LastSource===working&&v2LastKey===key&&state.v2Recipe)return;
 const previous=state.v2Recipe;
 state.v2Recipe=NSV2Platform.prepare(working,{sourceKey,recipe:sourceInfo.rawMetadata,capture:{session:state.captureSession2||'local-session',recipe:{domain:sourceInfo.domain,options:sourceInfo.rawMetadata?.options||null},whiteBalance:sourceInfo.whiteBalance||null,flatField:working.flatField||null},measurement,area:v2Area(),previous});
 if(state.v2Recipe.intent.id!==previous?.intent.id)v2AnalysisCount++;
 v2LastSource=working;v2LastKey=key;config38=null;
}
// Manual base warnings are advisory in V2, exactly as in its existing lab.
const measureBeforeV2=FM2.measure;
FM2.measure=function(im,region,options={}){if(state.engine!=='v2'||im!==working)return measureBeforeV2(im,region,options);
 const ps=[],m=FM2.measureRegions(im,[region],{...options,kind:options.kind||'manual-region',limit:options.limit||8192,samplePixel(im,x,y){const p=NSV2Platform.read(im,(y*im.width+x)*3);if(p.every(v=>Number.isFinite(v)&&v>0))ps.push({p,clipped:p.map(v=>v>=.999),dark:p.map(v=>v<=1e-6)});return {p,clipped:p.map(v=>v>=.999),dark:p.map(v=>v<=1e-6)};}});
 if(!ps.length)return {...m,status:'missing'};
 const valid=FM2.summarize(im,ps,[region],options.kind||'manual-region');return {...valid,status:valid.status==='missing'?'review':valid.status,numericStatus:'valid',origin:'manual',validSamples:ps.length,invalidSamples:m.samples-ps.length,totalSamples:m.samples,reasons:[...valid.reasons,...(ps.length<m.samples?['Ogiltiga RGB-prov uteslutna gemensamt']:[])]};
};
globalThis.FILMLABB_V2=Object.freeze({setRendering(mode,{version=1}={}){if(!['neutral','photographic'].includes(mode)||state.engine!=='v2')throw Error('V2_RENDERING_INVALID');preparePlatformV2();const r=state.v2Recipe;if(r.algorithmVersion!==3)throw Error('V2_RENDERING_REQUIRES_ALGORITHM3');const {photographic,...plain}=r.intent,neutral={...plain,tone:'luminance-reinhard-1',id:'tone-'+NSConversionV2.uuid()},intent=mode==='photographic'?NSV2Render.photographic(neutral,version):NSConversionV2.freeze(neutral);state.v2Recipe=NSConversionV2.freeze({...r,intent,analysisSignature:''});v2LastSource=null;config38=null;render();saveCurrentFrame();persist();return state.v2Recipe;},snapshot:()=>({recipe:state.v2Recipe,analysisCount:v2AnalysisCount,sourceVersion:sourceVersion38})});
