import assert from 'node:assert/strict';
import {harness} from './helpers/app-harness.mjs';
const h=harness(),M=h.context.NSFilmBaseMeasurement,R=h.context.NSFilmBaseReference;
function image({base=[.8,.5,.25],holder=false,clipped=false,texture=false}={}){const width=240,height=192,data=new Float32Array(width*height*3);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const edge=x<30||x>=210||y<24||y>=168;const t=edge?1:.1+.55*(x+y)/(width+height);for(let c=0;c<3;c++)data[(y*width+x)*3+c]=clipped?1:holder?.001:base[c]*t+(texture&&edge?((x+y)%2)*.16:0);}return {width,height,data,channels:3,encoding:'linear',scale:1};}
const frame={x:.14,y:.14,w:.72,h:.72};
for(const base of [[.8,.5,.25],[.3,.65,.5],[.6,.6,.6]]){const im=image({base}),m=M.detect(im,frame);assert.ok(m.measured);assert.equal(m.status,base[0]===base[1]?'review':'safe');for(let c=0;c<3;c++)assert.ok(Math.abs(m.measured[c]-base[c])<1e-6);assert.ok(m.regions.length>=2);}
for(const opts of [{holder:true},{clipped:true},{texture:true}])assert.equal(M.detect(image(opts),frame).status,'missing');
const im=image(),region={x:.01,y:.02,w:.08,h:.07},m=M.measure(im,region);assert.equal(m.status,'safe');assert.ok(m.samples>=16);assert.equal(M.measure(image({clipped:true}),region).status,'missing');assert.equal(M.measure(image({texture:true}),region).status,'missing');assert.equal(M.measure(im,{x:0,y:0,w:1/240,h:1/192}).status,'missing');
console.log('PASS source-region medians/MAD/spread, nonorange masks, neutral review, clipping/low signal/texture abstention');
h.set('working',im);h.set('cropRegion',frame);h.run(`render=()=>{};scheduleRender=()=>{};workingPreview=working;src=new ImageData(working.width,working.height);previewSrc=src;sourceInfo={encoding:'linear',colorSpace:'srgb',domain:'fixture'};state={...defaultState(),filmBaseVersion:2,cropConfirmed:true};roll=[{file:{name:'a.tif'},settings:{...state},geometry:NSGeometry.create(),crop:{...cropRegion}}];activeFrame=0;analyzeLevels();`);
h.set('measurement',m);h.run('setProposal2(measurement)');const before=h.run('JSON.stringify({base,calibration})');assert.equal(h.run('state.acceptedCalibration2'),undefined);assert.equal(h.run('JSON.stringify({base,calibration})'),before);
h.run('acceptBase2()');assert.ok(h.run('state.acceptedCalibration2'));assert.equal(h.run('state.acceptedCalibration2.baseLocked'),true);const accepted=h.run('JSON.stringify(state.acceptedCalibration2)');
for(const id of ['log39','calibrated4','curve3','density3','matrix3']){
 h.run(`state.engine='${id}';analyzeLevels();`);const snapshot=h.run('configuration38()');
 h.run('cropRegion={x:.25,y:.3,w:.5,h:.4};analyzeLevels();');assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),accepted);
 const next=h.run('configuration38()');assert.deepEqual(next.base,snapshot.base);
 if(id==='log39')assert.deepEqual(next.cal.log39,snapshot.cal.log39);
 if(id==='calibrated4')assert.deepEqual(next.cal.beta4.response,snapshot.cal.beta4.response);
 if(id.endsWith('3')&&id!=='log39')assert.deepEqual(next.conversion3,snapshot.conversion3);
 const K=h.context.NSPixelKernel,prepared=K.prepare(im,next),pixel=K.compile(next).pixel([.3,.2,.1]);assert.ok(pixel.every(Number.isFinite));assert.deepEqual(Array.from(prepared.pixel(0)),Array.from(K.compile(next).pixel(Array.from(im.data.subarray(0,3)))));
 h.run('cropRegion={x:.14,y:.14,w:.72,h:.72};');
}
h.run(`state.engine='curve3';analyzeLevels();globalThis.frozen=configuration38();state.acceptedCalibration2.adapters.conversions.curve3.reference.base[0]=.123;`);assert.notEqual(h.run('frozen.conversion3.reference.base[0]'),.123);
h.run(`state.acceptedCalibration2=JSON.parse(${JSON.stringify(accepted)});`);
h.set('measurement',M.measure(image({base:[.7,.4,.2]}),region));h.run('setProposal2(measurement);acceptBase2()');assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),accepted);
await h.run('Promise.all([detectBase2(),detectBase2()])');assert.equal(h.run('proposal2.revision'),h.run('revision2'));assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),accepted);
const pending=h.run('detectBase2()');h.run('cancelProposal2()');await pending;assert.equal(h.run('proposal2'),null);
h.run(`$('base2Session').onchange({target:{value:'other-session'}})`);assert.equal(h.run('accepted2()'),null);assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),accepted);
h.run(`state.captureSession2=null;analyzeLevels();downloadBlob=b=>globalThis.projectBlob=b;$('saveSettings').onclick();`);const project=JSON.parse(await h.context.projectBlob.text());assert.ok(project.frames[0].settings.acceptedCalibration2);R.validateProject(project);assert.throws(()=>R.validateProject({...project,sharedBase2:{version:2}}));
h.run(`readFile=async()=>{hires=working;src=new ImageData(working.width,working.height);finishImport('fixture');};`);await h.elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify(project)}],value:'x'}});assert.equal(h.run('JSON.stringify(state.acceptedCalibration2)'),accepted);
console.log('PASS proposal/accept/lock, five adapters invariant under ROI, export copy, latest request/cancel guards, incompatible session, persisted reference round-trip');
// Full compatibility includes gain, WB, normalization, light and explicit session.
const ctx=R.context(im,{encoding:'linear',domain:'fixture',gain:.5,whiteBalance:[2,1,1.5]}, {captureSession2:'roll-a'},[1,1,1],null);
for(const field of ['encoding','domain','decoder','normalization','gain','whiteBalance','light','flatField','session']){const other=structuredClone(ctx);other[field]=field==='normalization'?2:field==='whiteBalance'?[1,1,1]:'changed';assert.equal(R.compatible(ctx,other),false,field);}
const saturated={width:8,height:8,channels:3,scale:65535,normalization:2,encoding:'linear',data:new Uint16Array(8*8*3).fill(65535)};assert.equal(M.measure(saturated,{x:0,y:0,w:1,h:1}).status,'missing');
const pendingSource=h.run('detectBase2()');h.set('working',image({base:[.7,.6,.3]}));h.run('proposal2=null');await pendingSource;assert.equal(h.run('proposal2'),null);
console.log('PASS gain/WB/normalization/light/flat-field/session compatibility, pre-normalization integer clipping, replaced-source race guard');
