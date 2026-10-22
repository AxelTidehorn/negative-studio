/* Internal Beta 6 editing primitives. No UI, preview, analysis or export activation. */
'use strict';
function setCompositionCrop(index,crop){
 if(rollLoading||exportBusy||rollingExport)throw Error('Bilden är upptagen.');
 const frame=roll[index];if(!frame)throw Error('Bilden saknas.');
 const settings=index===activeFrame?state:frame.settings;
 const g=NSGeometry.syncLegacy(frame.geometry,settings.rotation??0,!!settings.cropExport,rollShared.cropExportToFrame);
 // Do not call saveCurrentFrame/analyzeLevels/render: only composition data changes.
 frame.geometry=NSGeometry.withComposition(g,crop);
}
function setQueueCropExportToFrame(value){
 if(typeof value!=='boolean')throw Error('Beskärningsvalet måste vara booleskt.');
 if(rollLoading||exportBusy||rollingExport)throw Error('Kön är upptagen.');
 const staged=roll.map((frame,i)=>{
  const settings=i===activeFrame?state:frame.settings;
  return NSGeometry.syncLegacy(frame.geometry,settings.rotation??0,value,value);
 });
 rollShared.cropExportToFrame=value;
 roll.forEach((frame,i)=>{frame.geometry=staged[i];frame.settings.cropExport=value;});
 state.cropExport=value;$('cropExport').checked=value;
}
