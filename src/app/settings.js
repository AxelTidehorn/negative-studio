/* Persisted image settings and queue-wide defaults. Session buffers never enter these records. */
(function(root){
'use strict';
const imageDefaults=()=>({editVersion:2,conversionVersion:1,auto:true,exposure:0,contrast:1,temperature:0,tint:0,saturation:1,vibrance:0,shadow:.015,highlight:.99,gamma:1,shadows:0,highlights:0,noBase:false,autoLevels:true,rotation:0,engine:"calibrated4",analysisSampling:"source",previewSampling:"area-v1",useFlatField:false,jpegSize:"original",rawMode4:"protected",toneMode4:"smooth",colorMode4:"legacy",response4:null,useRollResponse4:false,frame:null,cropVisible:true,manualCalibration:null,useRollBase:false,tiffEncoding:"srgb"});
// Shared adjustment defaults. Source eligibility selects the fresh-image engine.
const newImageDefaults=({v2Compatible=true,engine=v2Compatible?'v2':'calibrated4'}={})=>{
 if(!['v2','calibrated4'].includes(engine)||engine==='v2'&&!v2Compatible)throw Error('Unsupported fresh-image engine/source');
 return {...imageDefaults(),engine,conversionVersion:engine==='v2'?2:1};
};
const rollDefaults=()=>({cropExportToFrame:false,look:{id:'neutral',strength:.7},monochrome:false});
const clone=value=>JSON.parse(JSON.stringify(value));
root.NSProjectSettings={FORMAT:"filmlabb-roll-4",imageDefaults,newImageDefaults,rollDefaults,clone};
})(globalThis);
