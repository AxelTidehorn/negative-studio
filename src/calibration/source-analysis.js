/* Technical analysis owner. Presentation/editing must not invoke these stages.
   Older projects retain preview analysis; new standard projects sample the source. */
'use strict';
analyzeLevels=function(){
 const preview=workingPreview;
 if((state.engine==='calibrated4'||NSConversion3.is(state.engine))&&state.analysisSampling==='source'&&working)workingPreview=working;
 try{
  analyzeSharedLevels();
  analyzeComparisonLevels();
  analyzeStandardLevels();
  if(NSConversion3.is(state.engine))analyzeConversion3Levels();
 }finally{workingPreview=preview;}
};
