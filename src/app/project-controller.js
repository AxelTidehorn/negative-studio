'use strict';
let projectReadSequence=0;
const projectBusy=()=>rollLoading||exportBusy||rollingExport;
// Project JSON stores adjustment metadata, never RAF bytes. User must re-import same files on next session.
$('saveSettings').onclick=()=>{saveCurrentFrame();downloadBlob(new Blob([JSON.stringify({format:NSProfiles.FORMAT,v2SchemaVersion:1,conversionSchemaVersion:1,geometryVersion:NSGeometry.VERSION,roll:{cropExportToFrame:rollShared.cropExportToFrame},sourceCalibrationVersion:39,filmBaseVersion:2,sharedBase2:typeof sharedBase2!=='undefined'?sharedBase2:null,sharedLight,flatField:typeof sharedFlatField!=='undefined'&&NSFlatField.valid(sharedFlatField)?sharedFlatField:null,look:{...rollShared.look},monochrome:rollShared.monochrome,exportNaming:{prefix:$('exportName').value,digits:$('exportDigits').value},sharedResponse4:typeof sharedResponse4!=='undefined'&&CC4.valid(sharedResponse4)?sharedResponse4:null,frames:roll.map(f=>({filename:f.file.name,settings:f.settings,base:f.base,levels:f.levels,crop:f.crop,geometry:geometryForFrame(f,f.settings,f.crop),sourceMetadata:f.sourceMetadata||null}))},null,2)],{type:'application/json'}),'filmlabb-rullprojekt.json')};
$('settingsFile').onchange=async e=>{
 const read=++projectReadSequence,queue=roll,file=e.target.files?.[0];
 try{
 if(!file)return;
 if(projectBusy())throw Error('Vänta tills inläsning eller export är klar innan du öppnar ett projekt.');
 const text=await file.text();
 if(read!==projectReadSequence)return;
 if(queue!==roll)throw Error('Projektimporten avbröts eftersom bildkön ändrades.');
 if(projectBusy())throw Error('Vänta tills inläsning eller export är klar innan du öppnar ett projekt.');
 const parsed=NSProfiles.validateProject(JSON.parse(text));
 NSV2Platform.validateProject(parsed);
 NSFilmBaseReference.validateProject(parsed);
 NSConversion3.validateProject(parsed);
 const data=NSGeometry.prepareProject(parsed,roll.map(f=>({filename:f.file.name,settings:f.settings})));
 for(const f of data.frames)if(f.settings?.editVersion!==undefined&&![1,2].includes(f.settings.editVersion))throw Error('Unsupported editing version.');
 const shared=data.roll.cropExportToFrame,importedGeometry=new Map(data.frames.map(f=>[roll.find(current=>current.file.name===f.filename),f.geometry]));
 const queueGeometry=roll.map(f=>{
  let g=importedGeometry.has(f)?NSGeometry.validate(importedGeometry.get(f)):(f.geometry?NSGeometry.syncLegacy(f.geometry,f.settings.rotation??0):NSGeometry.legacyFrame(f.settings,f.crop,shared));
  if(!importedGeometry.has(f)&&f.settings.cropExport&&!shared&&!g.legacyCrop)g.legacyCrop={analysisFrame:f.crop?NSGeometry.rect(f.crop):null,edited:g.compositionCrop!==null};
  const size=f===roll[activeFrame]&&working?{width:working.width,height:working.height}:f.geometry?.sourceSize;
  if(size)g=NSGeometry.resolve(g,size,importedGeometry.has(f)?data.frames.find(s=>s.filename===f.file.name).crop:f.crop);
  return g;
 });
 if(data.flatField&&!NSFlatField.valid(data.flatField))throw Error('Ogiltig belysningsreferens.');
 if(data.sharedLight&&(!Array.isArray(data.sharedLight.gains)||data.sharedLight.gains.length!==3||!data.sharedLight.gains.every(v=>Number.isFinite(v)&&v>0&&v<100)))throw Error('Ogiltig ljusreferens.');
 // No project preferences or queued frames are changed until every geometry is valid.
 if(typeof sharedBase2!=='undefined')sharedBase2=data.sharedBase2||null;
 sharedLight=data.sharedLight||null;
 rollShared.cropExportToFrame=shared;rollShared.look={...data.look};rollShared.monochrome=data.monochrome;
 if(data.exportNaming){$('exportName').value=String(data.exportNaming.prefix||'');$('exportDigits').value=String(data.exportNaming.digits||3);syncExportNaming();}if(typeof sharedFlatField!=='undefined')sharedFlatField=data.flatField||null;refreshProfileInfo();
 if(typeof sharedResponse4!=='undefined')sharedResponse4=CC4.valid(data.sharedResponse4)?data.sharedResponse4:null;
 // defaultState is the historical baseline: a missing engine in a saved
 // project must never inherit the fresh-workflow V2 default.
 let count=0,retiredRaw=false;for(const saved of data.frames||[]){const found=roll.find(f=>f.file.name===saved.filename);if(found){found.settings={...defaultState(),...saved.settings,editVersion:saved.settings?.editVersion??1,previewSampling:saved.settings?.previewSampling==='area-v1'?'area-v1':'nearest'};
 if(!CC4.valid(found.settings.response4))found.settings.response4=null;
 if(!saved.settings?.rawMode4&&found.settings.engine!=='calibrated4')found.settings.rawMode4='reference';
 if(!saved.settings?.analysisSampling)found.settings.analysisSampling=data.format==='negative-studio-roll-beta3'?'preview':'source';
 if(data.sourceCalibrationVersion!==39&&saved.settings?.sourceCalibrationVersion!==39&&found.settings.manualCalibration?.sourceEncoding==='linear'){
  found.settings.manualCalibration=null;found.settings.manualBase=null;found.settings.useRollBase=false;found.settings.auto=true;retiredRaw=true;
 }
 found.base=saved.base;found.levels=saved.levels;found.crop=saved.crop||null;found.geometry=saved.geometry;found.sourceMetadata=saved.sourceMetadata||null;count++}}
 roll.forEach((f,i)=>{f.geometry=queueGeometry[i];f.settings.cropExport=NSGeometry.effectiveCrop(f.geometry,shared);});activeFrame=-1;const loaded=await chooseFrame(0,{force:true});
 if(read===projectReadSequence&&queue===roll&&loaded!==false)setStatus(`${count} bilder matchades med rullprojektet. Originalfiler måste importeras separat.${data.migratedIndividualCrops?' Äldre individuella exportutsnitt har bevarats som beskärningar.':''}${retiredRaw?' Äldre RAW-kalibrering har nollställts.':''}`)
 }catch(err){if(read===projectReadSequence)setStatus('Projektimport: '+err.message)}finally{if(read===projectReadSequence)e.target.value=''}};


