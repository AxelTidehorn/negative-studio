'use strict';
let analysisCount38=0;
globalThis.FILMLABB_PERFORMANCE={snapshot:()=>({...stats38,analyses:analysisCount38,worker:!!previewWorker38})};
exportFrameTiff=async function(i){await chooseFrame(i,{force:true});if(!working)throw Error('Bilden kunde inte läsas');return exportTiff();};

/* Exactly one engine analysis per request, always from the authoritative source.
   Profiles, image adjustments and presentation never re-run this function. */
analyzeLevels=function(){
 if(!working)return;
 const start=now38();
 if(state.engine==='v2'){
  preparePlatformV2();
  const b=state.v2Recipe.base;
  calibration={base:b.origin==='measured'?{kind:'measured',measured:[...b.rgb]}:{kind:'fallback',confidence:0},region:{...frameRegion()}};
 }else if(state.engine==='calibrated4'){
  const measured=calibrationBase()||(!state.noBase&&state.filmBaseVersion!==2?CE.findBase(working,frameRegion()):null);
  calibration={base:measured||{kind:'fallback',confidence:0},region:{...frameRegion()}};
  analyzeStandardLevels(working);
 }else throw Error('UNSUPPORTED_CONVERSION_ENGINE');
 analysisCount38++;config38=null;stats38.analysisMs=now38()-start;
 updateCalibrationUI();globalThis.FILMLABB_BASE2?.refresh();saveCurrentFrame();scheduleRender();
};
