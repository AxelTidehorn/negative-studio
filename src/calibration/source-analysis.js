/* New images analyze bounded samples of the source, independent of preview size.
   Older projects keep their prior preview analysis; pixel conversion is unchanged. */
'use strict';
const analyzeBeforeSource=analyzeLevels;
analyzeLevels=function(){
 if(state.engine!=='calibrated4'||state.analysisSampling!=='source'||!working)return analyzeBeforeSource();
 const preview=workingPreview;
 try{workingPreview=working;return analyzeBeforeSource();}
 finally{workingPreview=preview;}
};
