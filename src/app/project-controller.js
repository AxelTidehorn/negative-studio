'use strict';
let projectReadSequence=0;
const projectBusy=()=>rollLoading||exportBusy||rollingExport;
// Keep historical file tags when every vibrance value is zero. A new feature
// tag makes older builds reject nonzero lyster, including mixed-engine rolls.
const projectFormatForFrames=frames=>frames.some(f=>f.settings.engine==='v2'||f.settings.v2Recipe||f.settings.rawSourceRecipeV2)?NSV2Platform.PROJECT_FORMAT:frames.some(f=>NSConversion3.is(f.settings.engine))?NSConversion3.PROJECT_FORMAT:frames.some(f=>f.settings.editVersion===2)?NSEditing2.PROJECT_FORMAT:NSGeometry.FORMAT;
function prepareVibranceProject(data){
 const modern=data?.format===NSEditing2.VIBRANCE_PROJECT_FORMAT;
 if((modern&&data.vibranceVersion!==1)||(!modern&&data?.vibranceVersion!==undefined))throw Error('Unsupported vibrance project version.');
 if(!Array.isArray(data?.frames))return data; // Existing project validators own the general structure.
 for(const f of data.frames){const v=f?.settings?.vibrance;if(v!==undefined&&(!Number.isFinite(v)||v< -100||v>100))throw Error('Invalid vibrance setting.');if(v&&!modern)throw Error('Vibrance requires its versioned project format.');}
 return modern?{...data,format:projectFormatForFrames(data.frames)}:data;
}
// Project JSON stores adjustment metadata, never RAF bytes. User must re-import same files on next session.
$('saveSettings').onclick=()=>{saveCurrentFrame();downloadBlob(new Blob([JSON.stringify({format:roll.some(f=>f.settings.vibrance)?NSEditing2.VIBRANCE_PROJECT_FORMAT:projectFormatForFrames(roll),vibranceVersion:roll.some(f=>f.settings.vibrance)?1:undefined,v2SchemaVersion:1,conversionSchemaVersion:1,geometryVersion:NSGeometry.VERSION,roll:{cropExportToFrame:rollShared.cropExportToFrame},sourceCalibrationVersion:39,filmBaseVersion:2,sharedBase2:typeof sharedBase2!=='undefined'?sharedBase2:null,sharedLight,creativeProfileVersion:rollShared.profileVersion,flatField:typeof sharedFlatField!=='undefined'&&NSFlatField.valid(sharedFlatField)?sharedFlatField:null,profile:rollShared.profile,print:rollShared.print,strength:rollShared.strength,exportNaming:{prefix:$('exportName').value,digits:$('exportDigits').value},sharedResponse4:typeof sharedResponse4!=='undefined'&&CC4.valid(sharedResponse4)?sharedResponse4:null,frames:roll.map(f=>({filename:f.file.name,settings:f.settings,base:f.base,levels:f.levels,crop:f.crop,geometry:geometryForFrame(f,f.settings,f.crop),sourceMetadata:f.sourceMetadata||null}))},null,2)],{type:'application/json'}),'filmlabb-rullprojekt.json')};
$('settingsFile').onchange=async e=>{
 const read=++projectReadSequence,queue=roll,file=e.target.files?.[0];
 try{
 if(!file)return;
 if(projectBusy())throw Error('Vänta tills inläsning eller export är klar innan du öppnar ett projekt.');
 const text=await file.text();
 if(read!==projectReadSequence)return;
 if(queue!==roll)throw Error('Projektimporten avbröts eftersom bildkön ändrades.');
 if(projectBusy())throw Error('Vänta tills inläsning eller export är klar innan du öppnar ett projekt.');
 const parsed=prepareVibranceProject(JSON.parse(text));
 NSV2Platform.validateProject(parsed);
 NSFilmBaseReference.validateProject(parsed);
 NSConversion3.validateProject(parsed);
 if(parsed.format===NSV2Platform.PROJECT_FORMAT||parsed.format===NSConversion3.PROJECT_FORMAT)parsed.format=NSGeometry.FORMAT;
 // Earlier Beta 6 builds reject the new file tag instead of silently ignoring Editing 2.0.
 if(parsed.format===NSEditing2.PROJECT_FORMAT)parsed.format=NSGeometry.FORMAT;
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
 rollShared.cropExportToFrame=shared;rollShared.profileVersion=data.creativeProfileVersion===1?1:data.creativeProfileVersion===2?2:data.format==='negative-studio-roll-v08'?2:1;if(data.exportNaming){$('exportName').value=String(data.exportNaming.prefix||'');$('exportDigits').value=String(data.exportNaming.digits||3);syncExportNaming();}if(typeof sharedFlatField!=='undefined')sharedFlatField=data.flatField||null;rollShared.profile=filmProfiles[data.profile]?data.profile:'generic';$('filmProfile').value=rollShared.profile;rollShared.print=printStyles[data.print]?data.print:'neutral';$('printStyle').value=rollShared.print;rollShared.strength=Number.isFinite(Number(data.strength))?clamp(Number(data.strength),0,1):.7;$('profileStrength').value=Math.round(rollShared.strength*100);$('profileStrengthValue').textContent=Math.round(rollShared.strength*100)+' %';refreshProfileInfo();
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


