/* Frozen 5580f93 conversion kernel; facit is independent of the new dispatch. */
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import '../src/import/raw-input.js';import '../src/image/image-model.js';import '../src/calibration/color-analysis.js';import '../src/calibration/color-calibration.js';import '../src/editing/creative-profiles.js';import '../src/color/parameters.js';import '../src/editing/editing-engine.js';import '../src/color/conversion3.js';import '../src/color/render-core.js';
import {negative,region} from './helpers/conversion3-fixtures.mjs';
const original={NSCreativeProfiles,NSColorParameters,NSEditing2,NSRawInput,NSColorEngine};vm.createContext(original);vm.runInContext(fs.readFileSync('tests/fixtures/render-core-before-conversion3.js','utf8'),original);
const profileContext={NSCreativeProfiles};vm.createContext(profileContext);vm.runInContext(fs.readFileSync('src/editing/profile-settings.js','utf8').split('function syncEngineSelector')[0]+';globalThis.profiles=filmProfiles;globalThis.prints=printStyles;',profileContext);
const im=negative({width:48,height:32}),response=NSColorCalibration.estimate(im,region,{base:[.74,.43,.24],light:[1,1,1],domain:'frozen'}),cal={log39:NSColorAnalysis.analyze(im,region),beta4:NSColorCalibration.analyze(im,region,response,{base:response.base,light:[1,1,1]})};
const opts={autoLevels:true,noBase:false,exposure:0,contrast:1,temperature:0,tint:0,saturation:1,shadow:.015,highlight:.99,gamma:1,shadows:0,highlights:0,toneMode4:'smooth',colorMode4:'legacy',editVersion:1};
const samples=[[0,0,0],[1/65535,2/65535,4/65535],[.0003,.0002,.0004],[.02,.05,.01],[.2,.13,.1],[.8,.5,.3],[1,1,1]];let cases=0;
for(const kind of ['log39','calibrated4'])for(const variant of ['legacy','original','robust'])for(const version of [1,2])for(const id of ['generic','gold','hp5'])for(const edit of [false,true]){
 const c={kind,opts:{...opts,colorMode4:variant,editVersion:version,...(edit?{exposure:.7,contrast:1.2,shadows:30,highlights:20,temperature:15,tint:-6,saturation:1.2}:{})},workingSpace:'srgb',base:[.74,.43,.24],light:[1,1,1],noBase:false,cal,profile:NSCreativeProfiles.resolve(profileContext.profiles,id,2),print:profileContext.prints.soft,neutralProfile:id==='generic',neutralPrint:false,strength:.7};
 const a=NSPixelKernel.compile(c),b=original.NSPixelKernel.compile(c);for(const p of samples){assert.deepEqual(Array.from(a.pixel(p)),Array.from(b.pixel(p)));assert.deepEqual(p.map((v,k)=>a.technical(v,k)),p.map((v,k)=>b.technical(v,k)));}cases++;
}
console.log('PASS',cases,'frozen Original/Standard/variant/editing/profile configurations: exact technical coordinates and final pixels at extrema, midtones and low transmission');
