import assert from 'node:assert/strict';
import {harness} from './helpers/app-harness.mjs';
const h=harness(),M=h.context.NSFilmBaseMeasurement;
function source(base=[.8,.5,.25],exposure=1,normalization=1){const width=120,height=96,data=new Float32Array(width*height*3);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const t=x<15||x>=105||y<12||y>=84?1:.15+.6*(x+y)/(width+height);data.set(base.map(v=>v*t*exposure),(y*width+x)*3);}return {width,height,data,channels:3,scale:1,encoding:'linear',normalization};}
const region={x:.01,y:.2,w:.08,h:.5};
h.set('images2',{'a.tif':source(),'b.tif':source([.72,.43,.21])});
h.run(`render=()=>{};scheduleRender=()=>{};readFile=async file=>{hires=images2[file.name];sourceInfo={encoding:'linear',domain:'roll-fixture',label:'Linear fixture',gain:1,whiteBalance:[1,1,1]};src=new ImageData(hires.width,hires.height);finishImport('roll fixture');};roll=['a.tif','b.tif'].map(name=>({file:{name},settings:{...defaultState(),filmBaseVersion:2,captureSession2:'roll-session'},geometry:NSGeometry.create(),crop:{x:.15,y:.15,w:.7,h:.7}}));activeFrame=-1;`);
await h.run('chooseFrame(0)');h.set('region2',region);h.run('setProposal2(FM2.measure(working,region2));acceptBase2();');assert.ok(h.run('accepted2()'));
h.run(`$('shareBase').onclick()`);const shared=h.run('JSON.stringify(sharedBase2)');
await h.run('chooseFrame(1)');h.run(`$('useRollBase').onchange({target:{checked:true}})`);assert.equal(h.run('JSON.stringify(accepted2())'),shared);
// Explicit per-image override must neither unlock nor mutate the roll record.
h.run(`$('useRollBase').onchange({target:{checked:false}});setProposal2(FM2.measure(working,region2));acceptBase2();`);
const override=h.run('JSON.stringify(state.acceptedCalibration2)');assert.ok(h.run('state.acceptedCalibration2'));assert.equal(h.run('state.useRollBase2'),false);assert.equal(h.run('JSON.stringify(sharedBase2)'),shared);assert.notEqual(h.run('state.acceptedCalibration2.id'),JSON.parse(shared).id);
await h.run('chooseFrame(0)');assert.equal(h.run('JSON.stringify(accepted2())'),shared);
await h.run('chooseFrame(1)');assert.equal(h.run('JSON.stringify(accepted2())'),override);
// Exercise the real controller lookup and checkbox, not only compatible(a,b).
for(const field of ['gain','whiteBalance','domain']){
 h.run('globalThis.infoBefore2=FB2.clone(sourceInfo)');h.set('changedField2',field);
 h.run(`sourceInfo[changedField2]=changedField2==='gain'?2:changedField2==='whiteBalance'?[2,1,1]:'different-import';analyzeLevels();`);
 assert.equal(h.run('accepted2()'),null,field);assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),override);assert.equal(h.run('response4()'),null);
 h.run(`$('useRollBase').onchange({target:{checked:true}})`);assert.equal(h.run('state.useRollBase2'),false);assert.equal(h.run('JSON.stringify(sharedBase2)'),shared);
 h.run('sourceInfo=infoBefore2;analyzeLevels()');assert.equal(h.run('JSON.stringify(accepted2())'),override);
}
// Known common exposure cancels only after explicit source normalization. A
// different normalization context is paused until the new reference is accepted.
const outputsBefore={};for(const engine of ['log39','calibrated4','curve3','density3','matrix3']){h.set('engine2',engine);outputsBefore[engine]=h.run('state.engine=engine2;analyzeLevels();NSPixelKernel.compile(configuration38()).pixel(CE.pixel(working,70,40))');}
const normalized=source([.72,.43,.21],2,2);h.set('newSource2',normalized);
h.run(`hires=newSource2;working=workingSource();workingPreview=CE.preview(working);analyzeLevels();`);
assert.equal(h.run('accepted2()'),null);assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),override);
const measured=h.run('FM2.measure(working,region2)');for(let c=0;c<3;c++)assert.ok(Math.abs(measured.measured[c]-JSON.parse(override).measurement.measured[c])<1e-6);
h.run('setProposal2(FM2.measure(working,region2));acceptBase2()');assert.equal(h.run('accepted2().context.normalization'),2,'An incompatible stored lock must not prevent explicit calibration in the new context');assert.equal(h.run('JSON.stringify(sharedBase2)'),shared);
for(const engine of Object.keys(outputsBefore)){h.set('engine2',engine);const after=h.run('state.engine=engine2;analyzeLevels();NSPixelKernel.compile(configuration38()).pixel(CE.pixel(working,70,40))');for(let c=0;c<3;c++)assert.ok(Math.abs(after[c]-outputsBefore[engine][c])<1e-6,engine+' exposure-normalized pixel');}
h.run('state.acceptedCalibration2.baseLocked=false');
const replacement=h.run('JSON.stringify(state.acceptedCalibration2)');assert.notEqual(replacement,override);
h.run('working.data.fill(1);working.normalization=1;analyzeLevels()');assert.equal(h.run('accepted2()'),null);assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),replacement);
h.run('working.normalization=2;working.data.fill(2);analyzeLevels()');
await h.run('detectBase2()');assert.equal(h.run('proposal2.measurement.status'),'missing');assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),replacement);assert.equal(h.run('JSON.stringify(sharedBase2)'),shared);
h.run('acceptBase2()');assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),replacement);
// Both independently accepted frame references and the shared roll survive save.
h.run(`downloadBlob=b=>globalThis.savedRoll2=b;$('saveSettings').onclick()`);const project=JSON.parse(await h.context.savedRoll2.text());assert.equal(JSON.stringify(project.sharedBase2),shared);assert.equal(JSON.stringify(project.frames[1].settings.acceptedCalibration2),replacement);assert.equal(project.frames[1].settings.useRollBase2,false);assert.equal(project.frames[0].settings.useRollBase2,true);
h.context.NSFilmBaseReference.validateProject(project);
console.log('PASS real two-frame roll selection, private override, capture gain/WB/domain pauses, exposure normalization and explicit replacement, uncertain reanalysis retains both records, mixed project serialization');

// Actual ICC import already scales the integer pixels. Retain the EXACT applied
// normalization as capture metadata, without scaling those pixels a second time.
h.run(`globalThis.parseBefore2=NSColorManagement.parseICC;globalThis.iccFactor2=5.0001;NSColorManagement.parseICC=()=>({label:'Same ICC name',toLinear:p=>p.map(v=>v*iccFactor2)});`);
const contexts=[];for(const factor of [5.0001,5.0002]){h.set('factor2',factor);contexts.push(h.run(`iccFactor2=factor2;globalThis.iccRaw2={width:8,height:8,bits:16,channels:3,icc:new Uint8Array([1]),data:Uint16Array.from({length:192},(_,i)=>[26214,16384,8192][i%3])};prepareTiff(iccRaw2);hires=iccRaw2;working=workingSource();({context:capture2(),label:sourceInfo.label,pixel:CE.pixel(working,0,0)})`));}
assert.equal(contexts[0].label,contexts[1].label,'Rounded labels cannot establish normalization compatibility');assert.notEqual(contexts[0].context.normalization,contexts[1].context.normalization);assert.equal(h.context.NSFilmBaseReference.compatible(contexts[0].context,contexts[1].context),false);assert.equal(contexts[0].pixel[0],1);h.run('NSColorManagement.parseICC=parseBefore2');
console.log('PASS exact ICC exposure normalization provenance, no double scaling, and five-engine pixel consistency after documented common normalization');
