/* The only converter/source selector owner. Reuse a locked V2 source in
   Standard; re-decode only when the requested decoder recipe actually changes. */
'use strict';
function syncEngineSelector(){$('engineMode').value=state.engine;}
async function changeEngine(next){
 const previous=state.engine,owner=roll[activeFrame],saved=NSProjectSettings.clone(state);
 if(next===previous)return;
 if(!['v2','calibrated4'].includes(next))throw Error('UNSUPPORTED_CONVERSION_ENGINE');
 if(rollLoading||exportBusy||rollingExport){syncEngineSelector();return;}
 const raw=owner&&NSFileFormats.isRaw(owner.file);
 if(next==='v2'&&working&&!raw&&!NSV2Platform.validSource(working)){syncEngineSelector();setStatus('V2 kräver RAW eller verifierad linjär Rec.2020-TIFF.');return;}
 state.engine=next;state.conversionVersion=next==='v2'?2:1;state.editVersion=2;
 if(next==='v2'&&raw&&(!working||!sourceInfo.v2Decoded)){
  state.rawMode4='wide';state.rawSourceRecipeV2=1;saveCurrentFrame();stopPreviewWork();working=workingPreview=hires=src=calibration=null;
  const pending=chooseFrame(activeFrame,{force:true}),sequence=frameLoadSequence;await pending;
  if(frameLoadSequence!==sequence||roll[activeFrame]!==owner)return;
  if(!working){state=saved;owner.settings=NSProjectSettings.clone(saved);}
 }else if(working){workingPreview=next==='v2'?NSV2Platform.preview(working):CE.preview(working,1400,state.previewSampling);sourceVersion38++;analyzeLevels();render();}
 syncControls();controls4();saveCurrentFrame();persist();
}
$('engineMode').addEventListener('change',e=>{cancelPair4();changeEngine(e.target.value).catch(error=>setStatus(error.message));});
$('rawMode4').addEventListener('change',async e=>{
 if(state.engine==='v2'||rollLoading||exportBusy||rollingExport){e.target.value=state.rawMode4;return;}
 const next=e.target.value;if(!['protected','wide'].includes(next))throw Error('UNSUPPORTED_RAW_MODE');
 const owner=roll[activeFrame],raw=owner&&NSFileFormats.isRaw(owner.file);state.rawMode4=next;delete state.rawSourceRecipeV2;
 state.response4=null;state.useRollResponse4=false;state.manualCalibration=null;state.useRollBase=false;state.auto=true;
 saveCurrentFrame();persist();if(raw)await chooseFrame(activeFrame,{force:true});else controls4();nextControls();
});
