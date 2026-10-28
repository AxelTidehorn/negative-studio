/* Adapter only: all import, calibration, settings, profiles and export math are
   the actual main application. No hand-built photographic Standard recipe. */
(function(){
'use strict';
if(!window.FILMLABB_REFERENCE_ISOLATED)throw Error('REFERENCE_ISOLATION_REQUIRED');
const clone=x=>JSON.parse(JSON.stringify(x));
window.FILMLABB_REFERENCE={async load(file){
 await importRoll([file]);
 if(!working||rollLoading)throw Error('REFERENCE_IMPORT_FAILED');
 const selection=exportGeometrySnapshot(working),g=selection.g;
 if(g.presentation||selection.rotation)throw Error('REFERENCE_GEOMETRY_UNSUPPORTED');
 const first=g.at(0,0),last=g.at(g.width-1,g.height-1);if(last[0]-first[0]!==g.width-1||last[1]-first[1]!==g.height-1)throw Error('REFERENCE_GEOMETRY_UNSUPPORTED');
 const exportCrop={x:first[0]/working.width,y:first[1]/working.height,w:g.width/working.width,h:g.height/working.height};
 const config=clone(configuration38()),raw=sourceInfo.rawMetadata;
 const summary={kind:'fresh-automatic-application',method:'main-application-importRoll',exportCrop,exportSize:{width:g.width,height:g.height},engine:state.engine,editVersion:state.editVersion,source:{format:NSFileFormats.extension(file).toUpperCase(),width:working.width,height:working.height,encoding:working.encoding,colorSpace:working.colorSpace,scale:working.scale,gain:sourceInfo.gain??null},whiteBalance:Array.isArray(sourceInfo.whiteBalance)&&sourceInfo.whiteBalance.every(Number.isFinite)?sourceInfo.whiteBalance.slice(0,4):null,decoder:raw?{decoder:raw.decoder,version:raw.version,options:raw.options}:null,base:config.cal?.beta4?.base||config.base,analysisRegion:clone(cropRegion),settings:{rawMode:state.rawMode4,shadow:state.shadow,highlight:state.highlight,auto:state.auto,autoLevels:state.autoLevels,previewSampling:state.previewSampling,profile:rollShared.profile,print:rollShared.print},isolation:'memory-storage-no-offline-worker'};
 // The original, already decoded buffer is transferred once to the lab worker.
 return {image:{width:working.width,height:working.height,channels:working.channels,data:working.data,encoding:working.encoding,scale:working.scale,colorSpace:working.colorSpace,normalization:working.normalization||1},config,summary};
}};
})();
