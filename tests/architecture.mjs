/* Refactor contract: actual boot graph and exact pre-refactor color behavior. */
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {assets,scripts,sourcePath} from '../app-manifest.mjs';
import {harness} from './helpers/app-harness.mjs';
const html=fs.readFileSync('index.html','utf8'),tags=[...html.matchAll(/<script\b([^>]*)src="\.\/([^"]+)"[^>]*>/g)];
assert.deepEqual(tags.map(m=>m[2]),scripts.map(a=>a.file));assert.equal(new Set(scripts.map(a=>a.file)).size,scripts.length);
assert.ok(!/<script>([\s\S]*?)<\/script>/.test(html),'application code must have a source owner');
for(const [file,path] of Object.entries(assets)){assert.ok(fs.existsSync(path),file);assert.ok(path.startsWith('src/'),path);}
for(const name of ['preview-worker.js','export-worker.js','sw.js']){
 const text=fs.readFileSync(sourcePath(name),'utf8'),args=text.match(/importScripts\(([^)]*)\)/)[1];
 for(const [,file] of args.matchAll(/['"]\.\/([^'"]+)['"]/g))assert.ok(assets[file],name+' dependency '+file);
}
for(const asset of scripts)assert.equal(tags.find(m=>m[2]===asset.file)[1].includes('defer'),asset.defer,asset.file);
console.log('PASS HTML/build/harness share explicit startup order; worker dependencies resolved; no inline application logic');
const h=harness({editingVersion:1}),K=h.context.NSPixelKernel;
h.run(`render=()=>{};scheduleRender=()=>{};working={width:48,height:32,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:48*32*3},(_,i)=>1000+(i*137)%55000)};workingPreview=CE.preview(working);src=new ImageData(48,32);previewSrc=src;cropRegion={x:.1,y:.1,w:.8,h:.8};sourceInfo={encoding:'linear'};`);
const old={NSCreativeProfiles:h.context.NSCreativeProfiles,NSRawInput:h.context.NSRawInput,NSColorEngine:h.context.NSColorEngine};vm.createContext(old);vm.runInContext(fs.readFileSync(new URL('./fixtures/render-core-before-refactor.js',import.meta.url),'utf8'),old);
let cases=0;const samples=[[0,0,0],[.002,.001,0],[1/65535,4/65535,64/65535],[.01,.1,.7],[.3,.2,.1],[1,1,1]];
for(const engine of ['legacy','beta2','beta3','density38','reference','log39','calibrated4'])for(const space of (engine==='calibrated4'?['srgb','rec2020']:['srgb'])){
 h.run(`state={...defaultState(),engine:'${engine}',cropConfirmed:true};sourceInfo={encoding:'linear',colorSpace:'${space}'};analyzeLevels();`);
 for(const version of [1,2])for(const profile of ['generic','gold','bw','hp5'])for(const edit of [false,true])for(const variant of (engine==='calibrated4'?['legacy','original','robust']:['legacy'])){
  h.run(`rollShared.profileVersion=${version};rollShared.profile='${profile}';rollShared.strength=.7;`);
  const c=h.run('configuration38()');Object.assign(c.opts,{colorMode4:variant,...(edit?{exposure:.7,gamma:.8,contrast:1.2,saturation:1.3,temperature:20,tint:-8,shadows:24,highlights:-31}:{})});
  const current=K.compile(c),reference=old.NSPixelKernel.compile(c);
  for(const p of samples)assert.deepEqual(Array.from(current.pixel(p)),Array.from(reference.pixel(p)),[engine,space,profile,version,edit,variant].join('/'));cases++;
 }
}
// Analysis boundaries are explicit: exactly one ordered pass, restored on failure.
const stages=[];h.context.stages=stages;
h.run(`analyzeSharedLevels=()=>stages.push('shared');analyzeComparisonLevels=()=>stages.push('comparison');analyzeStandardLevels=()=>stages.push('standard');analyzeLevels();`);
assert.deepEqual(stages,['shared','comparison','standard']);const preview=h.run('workingPreview');
h.run(`analyzeComparisonLevels=()=>{throw Error('stage failure')};`);assert.throws(()=>h.run('analyzeLevels()'),/stage failure/);assert.equal(h.run('workingPreview'),preview);
// Persisted data never aliases mutable settings; no inactive image buffers kept.
const S=h.context.NSProjectSettings,a=S.imageDefaults(),b=S.imageDefaults();a.response4={span:[1,2,3]};const cloned=S.clone(a);cloned.response4.span[0]=99;assert.equal(a.response4.span[0],1);assert.equal(b.response4,null);
assert.deepEqual(Object.keys(S.rollDefaults()).sort(),['cropExportToFrame','print','profile','profileVersion','strength']);
console.log('PASS',cases,'exact pre-refactor engine/profile/variant configurations, explicit analysis order/failure restoration and settings isolation');
