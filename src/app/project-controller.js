/* Current project metadata only. Original image bytes are re-imported. */
'use strict';
let projectReadSequence=0;
const projectBusy=()=>rollLoading||exportBusy||rollingExport;
function projectSnapshot(){
 saveCurrentFrame();
 return {format:NSProjectSettings.FORMAT,v2SchemaVersion:1,conversionSchemaVersion:1,geometryVersion:NSGeometry.VERSION,
 roll:{cropExportToFrame:rollShared.cropExportToFrame},filmBaseVersion:2,sharedBase2,sharedBase,sharedLight,flatField:NSFlatField.valid(sharedFlatField)?sharedFlatField:null,
 look:{...rollShared.look},monochrome:rollShared.monochrome,exportNaming:{prefix:$('exportName').value,digits:$('exportDigits').value},sharedResponse4:CC4.valid(sharedResponse4)?sharedResponse4:null,
 frames:roll.map(f=>({filename:f.file.name,settings:f.settings,geometry:geometryForFrame(f,f.settings),sourceMetadata:f.sourceMetadata||null}))};
}
function validateProject(data){
 if(data?.format!==NSProjectSettings.FORMAT)throw Error('Projektformatet stöds inte. Importera originalbilderna och skapa ett nytt projekt.');
 if(data.geometryVersion!==NSGeometry.VERSION||!Array.isArray(data.frames)||typeof data.roll?.cropExportToFrame!=='boolean')throw Error('Ogiltigt projekt.');
 NSProfiles.validate(data.look,data.monochrome);NSV2Platform.validateProject(data);NSFilmBaseReference.validateProject(data);
 const names=new Set();
 for(const f of data.frames){
  if(typeof f.filename!=='string'||names.has(f.filename)||roll.filter(q=>q.file.name===f.filename).length>1)throw Error('Tvetydigt filnamn.');names.add(f.filename);
  const s=f.settings;if(!s||!['v2','calibrated4'].includes(s.engine)||s.editVersion!==2||!['protected','wide'].includes(s.rawMode4)||!['smooth','reference'].includes(s.toneMode4)||!['legacy','original','robust'].includes(s.colorMode4))throw Error('Ogiltiga bildinställningar.');
  if(['frameSelection','frameDetection','cropConfirmed','cropConfidence','cropMethod','cropLocked','cropExport'].some(k=>k in s)||['base','levels','crop'].some(k=>k in f))throw Error('Föråldrade bildfält.');
  if(s.frame!==null&&!NSFrameSelection.valid(s.frame))throw Error('Ogiltig filmruta.');
  if(!Number.isFinite(s.vibrance)||s.vibrance< -100||s.vibrance>100)throw Error('Ogiltig lyster.');
  const g=NSGeometry.validate(f.geometry);if(g.rotation.quarterTurns!==NSGeometry.quarterRotation(s.rotation||0).quarterTurns)throw Error('Motstridig rotation.');
  if(s.response4&&!CC4.valid(s.response4))throw Error('Ogiltig färgrespons.');
 }
 if(data.flatField&&!NSFlatField.valid(data.flatField))throw Error('Ogiltig belysningsreferens.');
 if(data.sharedLight&&(!Array.isArray(data.sharedLight.gains)||data.sharedLight.gains.length!==3||!data.sharedLight.gains.every(v=>Number.isFinite(v)&&v>0&&v<100)))throw Error('Ogiltig ljusreferens.');
 if(data.sharedResponse4&&!CC4.valid(data.sharedResponse4))throw Error('Ogiltig rullrespons.');
 return data;
}
$('saveSettings').onclick=()=>downloadBlob(new Blob([JSON.stringify(projectSnapshot(),null,2)],{type:'application/json'}),'filmlabb-rullprojekt.json');
$('settingsFile').onchange=async e=>{
 const read=++projectReadSequence,queue=roll,file=e.target.files?.[0];
 try{
  if(!file)return;if(projectBusy())throw Error('Vänta tills inläsning eller export är klar.');
  const text=await file.text();if(read!==projectReadSequence)return;
  if(queue!==roll)throw Error('Projektimporten avbröts eftersom bildkön ändrades.');
  if(projectBusy())throw Error('Vänta tills inläsning eller export är klar.');
  const data=validateProject(JSON.parse(text));
  // Validation is complete before any live image or queue state changes.
  sharedBase2=data.sharedBase2||null;sharedBase=data.sharedBase||null;sharedLight=data.sharedLight||null;sharedFlatField=data.flatField||null;sharedResponse4=data.sharedResponse4||null;
  Object.assign(rollShared,{cropExportToFrame:data.roll.cropExportToFrame,look:{...data.look},monochrome:data.monochrome});
  if(data.exportNaming){$('exportName').value=String(data.exportNaming.prefix||'');$('exportDigits').value=String(data.exportNaming.digits||3);syncExportNaming();}
  refreshProfileInfo();let count=0;
  for(const saved of data.frames){const found=roll.find(f=>f.file.name===saved.filename);if(found){found.settings=NSProjectSettings.clone(saved.settings);found.geometry=NSGeometry.validate(saved.geometry);found.sourceMetadata=saved.sourceMetadata||null;count++;}}
  activeFrame=-1;const loaded=await chooseFrame(0,{force:true});
  if(read===projectReadSequence&&queue===roll&&loaded!==false)setStatus(`${count} bilder matchades med rullprojektet. Originalfiler måste importeras separat.`);
 }catch(err){if(read===projectReadSequence)setStatus('Projektimport: '+err.message);}finally{if(read===projectReadSequence)e.target.value='';}
};
