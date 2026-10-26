/* Small, source-versioned calibration cache. Never owns decoded image buffers.
   Each model uses log39 statistics, never Standard's beta4 response. */
'use strict';
let conversionCache3=null,conversionAnalysisCount3=0;
function ensureConversion3Calibration(){
 if(!workingPreview||!calibration?.log39)throw Error('Conversion calibration is not ready.');
 const key=JSON.stringify([sourceVersion38,cropRegion,calibration.log39,base,currentLight(),state.noBase,sourceInfo.domain,sourceInfo.colorSpace]);
 if(!conversionCache3||conversionCache3.key!==key){
  const model=NSConversion3.analyze(workingPreview,cropRegion,{comparison:calibration.log39,base:base.map(v=>v/255),light:currentLight(),noBase:!!state.noBase,domain:sourceInfo.domain||sourceInfo.encoding||'unknown'});
  model.revision=key;conversionCache3={key,model};conversionAnalysisCount3++;
 }
 return conversionCache3.model;
}
function analyzeConversion3Levels(){calibration.conversion3=ensureConversion3Calibration();config38=null;technicalCache38=null;controls4();}

// Conversion-specific controls reuse the existing small calibration section.
const controlsBefore3=controls4;
controls4=function(...args){const result=controlsBefore3(...args);if(typeof document.querySelectorAll!=='function')return result;
 const standard=state.engine==='calibrated4';
 for(const id of ['colorMode4','toneMode4','neutralPair4','resetResponse4','saveResponse4']){const el=$(id);el.hidden=!standard;const label=document.querySelector('label[for="'+id+'"]');if(label)label.hidden=!standard;}
 const shared=$('useResponse4').closest('label');if(shared)shared.hidden=!standard;
 if(working&&NSConversion3.is(state.engine)){const model=calibration?.conversion3,text=state.engine==='curve3'?(model?.curve.kind==='identity'?'Curve · identitetsreserv, otillräckligt tonomfång':'Curve · konservativ automatisk respons'):state.engine==='density3'?'Density · gemensam tonpresentation':model?.matrix.kind==='identity'?'Matrix · identitetsreserv, ingen säker transform':'Matrix · begränsad statistisk transform';if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source($('calibrationStatus4'),text);else $('calibrationStatus4').textContent=text;}
 return result;
};
