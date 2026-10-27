/* Persisted image settings and queue-wide defaults. Session buffers never enter these records. */
(function(root){
'use strict';
const imageDefaults=()=>({editVersion:2,conversionVersion:1,auto:true,exposure:0,contrast:1,temperature:0,tint:0,saturation:1,balanceStrength:.75,shadow:.015,highlight:.99,gamma:1,shadows:0,highlights:0,noBase:false,autoLevels:true,manualBase:null,rotation:0,engine:"calibrated4",analysisSampling:"source",previewSampling:"area-v1",useFlatField:false,jpegSize:"original",rawMode4:"protected",toneMode4:"smooth",colorMode4:"legacy",response4:null,useRollResponse4:false,sourceCalibrationVersion:39,redSlope:1,blueSlope:1,cropConfirmed:false,cropVisible:true,cropLocked:false,cropExport:false,cropMethod:"auto",manualCalibration:null,useRollBase:false,tiffEncoding:"srgb"});
const rollDefaults=()=>({cropExportToFrame:false,profile:'generic',profileVersion:2,print:'neutral',strength:.7});
const clone=value=>JSON.parse(JSON.stringify(value));
root.NSProjectSettings={imageDefaults,rollDefaults,clone};
})(globalThis);
