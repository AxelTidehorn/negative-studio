/* Composition is independent of the technical frame; the queue owns the
   export-to-frame preference. No duplicated per-image compatibility flags. */
'use strict';
function geometryForFrame(frame,settings){
 let g=NSGeometry.withQuarterTurns(frame.geometry||NSGeometry.create(),settings.rotation||0);
 if(frame===roll[activeFrame]&&working)g=NSGeometry.resolve(g,{width:working.width,height:working.height});
 return g;
}
function setCompositionCrop(index,crop){
 if(rollLoading||exportBusy||rollingExport)throw Error('Bilden är upptagen.');
 const f=roll[index];if(!f)throw Error('Bilden saknas.');
 f.geometry=NSGeometry.withComposition(geometryForFrame(f,index===activeFrame?state:f.settings),crop);
}
function setQueueCropExportToFrame(value){
 if(typeof value!=='boolean')throw Error('Beskärningsvalet måste vara booleskt.');
 if(rollLoading||exportBusy||rollingExport)throw Error('Kön är upptagen.');
 rollShared.cropExportToFrame=value;$('cropExport').checked=value;
}
function exportGeometrySnapshot(im,opts=state,region=frameRegion()){
 const model=roll[activeFrame]?geometryForFrame(roll[activeFrame],opts):NSGeometry.create(opts.rotation||0);
 return {region:{...region},crop:rollShared.cropExportToFrame,rotation:opts.rotation,g:NSPresentation.plan(im,model,rollShared.cropExportToFrame,region)};
}
