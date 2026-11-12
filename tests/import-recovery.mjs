import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';
const h=harness();h.context.crypto=globalThis.crypto;h.context.requestAnimationFrame=fn=>queueMicrotask(fn);h.run('render=()=>{};scheduleRender=()=>{};');
const setup=`
const source={width:12,height:10,channels:3,data:new Uint16Array(360).fill(16000),scale:65535,encoding:'linear'};
working=source;workingPreview=CE.preview(source);src=new ImageData(12,10);sourceInfo={encoding:'linear',label:'fixture'};state={...defaultState(),frame:NSFrameSelection.rectangular({x:.1,y:.1,w:.8,h:.8},{status:NSFrameSelection.status.confirmed})};analyzeLevels();
roll=[{file:{name:'a.png'},geometry:NSGeometry.create(),settings:{...state},selected:true},{file:{name:'b.png'},geometry:NSGeometry.create(),settings:{...state,exposure:1.25},selected:true}];activeFrame=0;
globalThis.savedB=JSON.stringify(roll[1]);globalThis.failOnce=true;
readFile=async()=>{if(failOnce){failOnce=false;working=source;roll[activeFrame].thumb='partial-positive';roll[activeFrame].thumbPositive=true;state.exposure=-1;calibration={bad:true};saveCurrentFrame();throw Error('controlled failure after partial import');}hires=source;src=new ImageData(12,10);finishImport('fixture');};
`;h.run(setup);
assert.equal(await h.run('chooseFrame(1)'),false);assert.equal(h.run('activeFrame'),1);assert.equal(h.run('working'),null);assert.deepEqual(JSON.parse(h.run('JSON.stringify(roll[1])')),JSON.parse(h.run('savedB')));
h.run('calibration={bad:true};saveCurrentFrame();');assert.deepEqual(JSON.parse(h.run('JSON.stringify(roll[1])')),JSON.parse(h.run('savedB')));
assert.equal(await h.run('chooseFrame(1)'),true);assert.equal(h.run('activeFrame'),1);assert.equal(h.run('state.exposure'),1.25);assert.equal(h.run("calibration.bad"),undefined);
// The successful conversion is independent of the failed/partially saved job.
const clean=harness();clean.context.crypto=globalThis.crypto;clean.context.requestAnimationFrame=fn=>queueMicrotask(fn);clean.run('render=()=>{};scheduleRender=()=>{};');
clean.run(setup);clean.run('failOnce=false;');assert.equal(await clean.run('chooseFrame(1)'),true);assert.deepEqual(JSON.parse(h.run('JSON.stringify({calibration})')),JSON.parse(clean.run('JSON.stringify({calibration})')));const actual=h.run('JSON.stringify({calibration})');h.run('state={...roll[1].settings};working=null;workingPreview=null;activeFrame=-1;');assert.equal(await h.run('chooseFrame(1)'),true);assert.equal(h.run('JSON.stringify({calibration})'),actual);
console.log('PASS failed partial import restores image record, cannot save stale base/levels, same-frame click retries and repeated import produces identical analysis');

h.run('state.exposure=2.5;failOnce=true;');assert.equal(await h.run('chooseFrame(1,{force:true})'),false);assert.equal(h.run('roll[1].settings.exposure'),2.5);assert.equal(await h.run('chooseFrame(1)'),true);assert.equal(h.run('state.exposure'),2.5);console.log('PASS failed forced reload retains the latest unsaved image settings');
