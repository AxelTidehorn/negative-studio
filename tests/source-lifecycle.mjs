/* Reset outgoing owners without painting/uploading the old source again. */
import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness();h.context.crypto=globalThis.crypto;
h.run(`globalThis.paints=0;render=()=>{paints++};scheduleRender=()=>{paints++};
working={width:40,height:32,channels:3,encoding:'linear',colorSpace:'rec2020',scale:1,data:Float32Array.from({length:40*32*3},(_,i)=>[.4,.2,.1][i%3]*(.2+(i%37)/50))};workingPreview=working;sourceInfo={encoding:'linear',colorSpace:'rec2020',domain:'lifecycle',label:'fixture'};
state={...defaultState(),engine:'v2',filmBaseVersion:2,frame:NSFrameSelection.rectangular({x:.1,y:.1,w:.8,h:.8},{status:'confirmed'})};roll=[{file:{name:'source.tif'},settings:{...state},geometry:NSGeometry.create()}];activeFrame=0;analyzeLevels();globalThis.original=NSPixelKernel.compile(configuration38()).pixel([.2,.1,.05]);
setProposal2(FM2.measure(working,{x:0,y:0,w:.2,h:.3}));previewBase2=true;analyzeLevels();`);
assert.equal(h.run('state.v2Recipe.base.status'),'proposal-preview');
h.run(`baseDisplay2='positive';display='negative';lastPreview38={oldSource:working};globalThis.terminations=0;previewWorker38={terminate(){terminations++}};paints=0;resetImageSession();`);
assert.equal(h.run('paints'),0);assert.equal(h.run('terminations'),1);assert.equal(h.run('previewWorker38'),null);assert.equal(h.run('lastPreview38'),null);assert.equal(h.run('display'),'positive');assert.equal(h.run('proposal2'),null);assert.equal(h.run('previewBase2'),false);assert.equal(h.run('state.v2Recipe.base.origin'),'prior');
assert.deepEqual(Array.from(h.run('NSPixelKernel.compile(configuration38()).pixel([.2,.1,.05])')),Array.from(h.run('original')));
console.log('PASS outgoing base preview restored exactly without repaint; source worker/result released and display restored');
