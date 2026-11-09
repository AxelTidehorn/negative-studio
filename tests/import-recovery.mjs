import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness();h.context.crypto=globalThis.crypto;h.context.requestAnimationFrame=fn=>queueMicrotask(fn);h.run('render=()=>{};scheduleRender=()=>{};');
const setup=`
const source={width:12,height:10,channels:3,data:new Uint16Array(360).fill(16000),scale:65535,encoding:'linear'};
working=source;workingPreview=CE.preview(source);src=new ImageData(12,10);previewSrc=src;sourceInfo={encoding:'linear',label:'fixture'};state={...defaultState(),cropConfirmed:true};cropRegion={x:.1,y:.1,w:.8,h:.8};analyzeLevels();
roll=[{file:{name:'a.png'},geometry:NSGeometry.create(),settings:{...state},crop:{...cropRegion},base:[...base],levels:JSON.parse(JSON.stringify(levels)),selected:true},{file:{name:'b.png'},geometry:NSGeometry.create(),settings:{...state,exposure:1.25},crop:{x:.2,y:.2,w:.6,h:.6},base:[11,22,33],levels:{lo:[.1,.2,.3],hi:[.7,.8,.9]},selected:true}];activeFrame=0;
globalThis.savedB=JSON.stringify(roll[1]);globalThis.failOnce=true;
readFile=async()=>{if(failOnce){failOnce=false;working=source;roll[activeFrame].thumb='partial-positive';roll[activeFrame].thumbPositive=true;base=[1,2,3];levels={lo:[0,0,0],hi:[1,1,1]};saveCurrentFrame();throw Error('controlled failure after partial import');}hires=source;src=new ImageData(12,10);finishImport('fixture');};
`;h.run(setup);
assert.equal(await h.run('chooseFrame(1)'),false);assert.equal(h.run('activeFrame'),-1);assert.equal(h.run('working'),null);assert.deepEqual(JSON.parse(h.run('JSON.stringify(roll[1])')),JSON.parse(h.run('savedB')));
h.run('base=[7,8,9];levels={bad:true};saveCurrentFrame();');assert.deepEqual(JSON.parse(h.run('JSON.stringify(roll[1])')),JSON.parse(h.run('savedB')));
assert.equal(await h.run('chooseFrame(1)'),true);assert.equal(h.run('activeFrame'),1);assert.equal(h.run('state.exposure'),1.25);assert.ok(h.run('base.every(v=>v!==7&&v!==8&&v!==9)'));
// The successful conversion is independent of the failed/partially saved job.
const clean=harness();clean.context.crypto=globalThis.crypto;clean.context.requestAnimationFrame=fn=>queueMicrotask(fn);clean.run('render=()=>{};scheduleRender=()=>{};');
clean.run(setup);clean.run('failOnce=false;');assert.equal(await clean.run('chooseFrame(1)'),true);assert.deepEqual(JSON.parse(h.run('JSON.stringify({base,levels,calibration})')),JSON.parse(clean.run('JSON.stringify({base,levels,calibration})')));const actual=h.run('JSON.stringify({base,levels,calibration})');h.run('state={...roll[1].settings};working=null;workingPreview=null;activeFrame=-1;');assert.equal(await h.run('chooseFrame(1)'),true);assert.equal(h.run('JSON.stringify({base,levels,calibration})'),actual);
console.log('PASS failed partial import restores image record, cannot save stale base/levels, same-frame click retries and repeated import produces identical analysis');

h.run('state.exposure=2.5;failOnce=true;');assert.equal(await h.run('chooseFrame(1,{force:true})'),false);assert.equal(h.run('roll[1].settings.exposure'),2.5);assert.equal(await h.run('chooseFrame(1)'),true);assert.equal(h.run('state.exposure'),2.5);console.log('PASS failed forced reload retains the latest unsaved image settings');
