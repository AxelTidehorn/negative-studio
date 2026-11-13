import assert from 'node:assert/strict';
import {harness} from './helpers/app-harness.mjs';

const failures=[];
function setup(){
 const h=harness();
 h.run(`render=()=>{};scheduleRender=()=>{};
 working={width:48,height:32,channels:3,data:Uint16Array.from({length:48*32*3},(_,i)=>3000+(i*73)%42000),scale:65535,encoding:'linear'};
 workingPreview=CE.preview(working);sourceInfo={encoding:'linear',label:'fixture'};src=new ImageData(48,32);
 state={...defaultState(),frame:NSFrameSelection.rectangular({x:.1,y:.1,w:.8,h:.8},{status:NSFrameSelection.status.confirmed})};analyzeLevels();
 roll=[{file:{name:'same.tif'},settings:{...state},geometry:NSGeometry.create(),selected:true}];activeFrame=0;
 chooseFrame=async i=>{if(rollLoading||exportBusy)return;activeFrame=i;state={...roll[i].settings};return true;};
 downloadBlob=b=>globalThis.savedProject=b;`);
 return h;
}
const snapshot=h=>h.run('JSON.stringify({state,roll,rollShared,activeFrame,sourceInfo,sharedLight,sharedBase2})');
async function project(h,exposure){
 h.elements.get('saveSettings').onclick();const p=JSON.parse(await h.context.savedProject.text());
 p.frames[0].settings.exposure=exposure;return p;
}
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function load(h,pending,target={value:'project.json'}){
 target.files=[{text:()=>pending}];return {target,promise:h.elements.get('settingsFile').onchange({target})};
}
async function check(name,run){try{await run();console.log('PASS',name);}catch(e){failures.push(name);console.log('FAIL',name,e.message);}}

await check('latest project selection owns the settings and completion message',async()=>{
 const h=setup(),slow=deferred(),old=await project(h,2),latest=await project(h,.5),first=load(h,slow.promise);
 await load(h,Promise.resolve(JSON.stringify(latest))).promise;
 const expected=snapshot(h),status=h.elements.get('status').textContent;
 slow.resolve(JSON.stringify(old));await first.promise;
 assert.equal(snapshot(h),expected);assert.equal(h.elements.get('status').textContent,status);
});
await check('delayed project cannot mutate a replacement queue with matching filenames',async()=>{
 const h=setup(),slow=deferred(),p=await project(h,2),pending=load(h,slow.promise);
 h.run('roll=roll.map(f=>({...f,settings:{...f.settings,exposure:.7}}));state={...roll[0].settings};');
 const expected=snapshot(h);slow.resolve(JSON.stringify(p));await pending.promise;
 assert.equal(snapshot(h),expected);assert.match(h.elements.get('status').textContent,/bildkön ändrades/);
});
for(const busy of ['rollLoading','exportBusy','rollingExport'])await check('project cannot commit while '+busy,async()=>{
 const h=setup(),slow=deferred(),p=await project(h,2),pending=load(h,slow.promise);h.run(busy+'=true');
 const expected=snapshot(h);slow.resolve(JSON.stringify(p));await pending.promise;
 assert.equal(snapshot(h),expected);assert.match(h.elements.get('status').textContent,/Vänta tills/);
});
await check('obsolete project read errors do not overwrite the current status',async()=>{
 const h=setup(),slow=deferred(),latest=await project(h,.5),first=load(h,slow.promise);
 await load(h,Promise.resolve(JSON.stringify(latest))).promise;const status=h.elements.get('status').textContent;
 slow.reject(Error('obsolete read'));await first.promise;assert.equal(h.elements.get('status').textContent,status);
});
await check('obsolete read does not clear the newer input selection',async()=>{
 const h=setup(),old=deferred(),next=deferred(),p=await project(h,.5),target={value:'old.json'},a=load(h,old.promise,target);
 target.value='next.json';const b=load(h,next.promise,target);old.resolve(JSON.stringify(p));await a.promise;
 const value=target.value;next.resolve(JSON.stringify(p));await b.promise;
 assert.equal(value,'next.json');assert.equal(target.value,'');
});
await check('busy project request does not read or modify a file',async()=>{
 const h=setup();h.run('rollLoading=true');let reads=0;const expected=snapshot(h);
 await h.elements.get('settingsFile').onchange({target:{value:'p.json',files:[{text:async()=>{reads++;return '{}';}}]}});
 assert.equal(reads,0);assert.equal(snapshot(h),expected);
});
await check('cancelled file selection is harmless',async()=>{
 const h=setup();h.elements.get('status').textContent='unchanged';const expected=snapshot(h);
 await h.elements.get('settingsFile').onchange({target:{value:'',files:[]}});
 assert.equal(snapshot(h),expected);assert.equal(h.elements.get('status').textContent,'unchanged');
});
await check('project reload preserves an actual source import error',async()=>{
 const h=setup(),p=await project(h,.5);
 h.run("chooseFrame=async()=>{working=null;setStatus('Importfel: requested decode failed');return false;};");
 await load(h,Promise.resolve(JSON.stringify(p))).promise;
 assert.equal(h.elements.get('status').textContent,'Importfel: requested decode failed');
});
assert.deepEqual(failures,[]);
