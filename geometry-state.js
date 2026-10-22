/* Beta 6 internal data adapters. No fine rotation/composition renderer is enabled. */
'use strict';
function geometryForFrame(frame,settings,analysisFrame){
 let g=frame.geometry?NSGeometry.syncLegacy(frame.geometry,settings.rotation??0):NSGeometry.legacyFrame(settings,analysisFrame,rollShared.cropExportToFrame);
 const size=frame===roll[activeFrame]&&working?{width:working.width,height:working.height}:g.sourceSize;
 if(size)g=NSGeometry.resolve(g,size,analysisFrame);
 return g;
}
function reconcileLegacyCrop(index,value){
 if(typeof value!=='boolean')throw Error('Beskärningsvalet måste vara booleskt.');
 const frame=roll[index];if(!frame)return;
 const current=frame.geometry||NSGeometry.create((index===activeFrame?state:frame.settings).rotation??0);
 if(NSGeometry.effectiveCrop(current,rollShared.cropExportToFrame)===value&&frame.geometry)return;
 const shared=rollShared.cropExportToFrame&&!value?false:rollShared.cropExportToFrame;
 const staged=roll.map((f,i)=>{
  const opts=i===activeFrame?state:f.settings,r=i===activeFrame?cropRegion:f.crop;
  let g=geometryForFrame(f,opts,r);
  if(rollShared.cropExportToFrame&&!shared&&i!==index&&!g.legacyCrop)g.legacyCrop={analysisFrame:r?NSGeometry.rect(r):null,edited:g.compositionCrop!==null};
  if(i===index){
   if(value&&!shared&&!g.legacyCrop)g.legacyCrop={analysisFrame:r?NSGeometry.rect(r):null,edited:g.compositionCrop!==null};
   if(!value&&g.legacyCrop){if(!g.legacyCrop.edited)g.compositionCrop=null;g.legacyCrop=null;}
  }
  if(g.sourceSize)g=NSGeometry.resolve(g,g.sourceSize,r);
  return g;
 });
 rollShared.cropExportToFrame=shared;
 roll.forEach((f,i)=>{f.geometry=staged[i];f.settings.cropExport=NSGeometry.effectiveCrop(staged[i],shared);});
 if(activeFrame>=0)state.cropExport=roll[activeFrame].settings.cropExport;
}
function setLegacyCropExport(value){
 if(rollLoading||exportBusy||rollingExport)return;
 reconcileLegacyCrop(activeFrame,value);state.cropExport=value;saveCurrentFrame();
}
function setCompositionCrop(index,crop){
 if(rollLoading||exportBusy||rollingExport)throw Error('Bilden är upptagen.');
 const f=roll[index];if(!f)throw Error('Bilden saknas.');
 const opts=index===activeFrame?state:f.settings,r=index===activeFrame?cropRegion:f.crop;
 // Only geometry changes. Never call saveCurrentFrame, analysis, render or persist.
 f.geometry=NSGeometry.withComposition(geometryForFrame(f,opts,r),crop);
}
function setQueueCropExportToFrame(value){
 if(typeof value!=='boolean')throw Error('Beskärningsvalet måste vara booleskt.');
 if(rollLoading||exportBusy||rollingExport)throw Error('Kön är upptagen.');
 const staged=roll.map((f,i)=>geometryForFrame(f,i===activeFrame?state:f.settings,i===activeFrame?cropRegion:f.crop));
 rollShared.cropExportToFrame=value;
 roll.forEach((f,i)=>{f.geometry=staged[i];f.settings.cropExport=NSGeometry.effectiveCrop(staged[i],value);});
 state.cropExport=activeFrame>=0?roll[activeFrame].settings.cropExport:value;$('cropExport').checked=state.cropExport;
}
// Only chooses inputs for CE's unchanged exact quarter-turn algorithm. New fine
// angles/manual composition remain dormant. Frozen legacy crops preserve old files.
function exportGeometrySnapshot(im,opts=state,region=cropRegion){
 let r={...region},crop=!!opts.cropExport;
 if(roll[activeFrame]){
  reconcileLegacyCrop(activeFrame,crop);
  const g=roll[activeFrame].geometry;
  if(!rollShared.cropExportToFrame&&g?.legacyCrop?.analysisFrame)r={...g.legacyCrop.analysisFrame};
  crop=g?NSGeometry.effectiveCrop(g,rollShared.cropExportToFrame):crop;
 }
 return {region:r,crop,rotation:opts.rotation,g:CE.exportGeometry(im,r,crop,opts.rotation)};
}
