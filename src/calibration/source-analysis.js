/* Technical analysis owner. Presentation/editing must not invoke these stages.
   Older projects retain preview analysis; new standard projects sample the source. */
'use strict';
analyzeLevels=function(){
 const preview=workingPreview;
 if(state.engine==='calibrated4'&&state.analysisSampling==='source'&&working)workingPreview=working;
 try{
  analyzeSharedLevels();
  analyzeComparisonLevels();
  analyzeStandardLevels();
 }finally{workingPreview=preview;}
};
