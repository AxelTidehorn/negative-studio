import assert from 'node:assert/strict';
import {harness} from './helpers/app-harness.mjs';

// Replacing an in-flight import cancels its ownership. A deliberately
// non-cancellable decoder must not clear the new queue or its loading flag.
const h=harness();
h.run(`globalThis.decodeGates=new Map();readFile=async file=>{await new Promise(r=>decodeGates.set(file.name,r));};`);
const first=h.run(`importRoll([{name:'first.ARW'}])`);await new Promise(r=>setImmediate(r));
const replacement=h.run(`importRoll([{name:'replacement.ARW'}])`);await new Promise(r=>setImmediate(r));
assert.equal(h.run('roll[0].file.name'),'replacement.ARW');
assert.equal(h.run('rollLoading'),true);
h.run(`decodeGates.get('first.ARW')()`);await first;
assert.equal(h.run('roll[0].file.name'),'replacement.ARW');
assert.equal(h.run('rollLoading'),true,'stale finally must not unlock the current job');
h.run(`decodeGates.get('replacement.ARW')()`);await replacement;
for(const flag of ['exportBusy','rollingExport']){
 h.run(`${flag}=true`);await h.run(`importRoll([{name:'blocked.ARW'}])`);
 assert.equal(h.run('roll[0].file.name'),'replacement.ARW');h.run(`${flag}=false`);
}
h.run('cropDrag={pointerId:1}');await h.run(`importRoll([{name:'blocked.ARW'}])`);
assert.equal(h.run('roll[0].file.name'),'replacement.ARW');h.run('cropDrag=null');
console.log('PASS new import cancels old ownership; stale completion cannot clear new job; export/crop gates remain');

// Queue decoration now reuses a rendered positive canvas, synchronously.
// No unopened file may be read just to make a thumbnail.
const t=harness();let reads=0,refreshes=0;
const files=['old.ARW','old2.ARW'].map(name=>({name,arrayBuffer(){reads++;throw Error('Unexpected thumbnail decode');}}));
t.run('chooseFrame=async()=>true;refreshRollUI=()=>{};');t.set('files',files);await t.run('importRoll(files)');assert.equal(reads,0);
const create=t.context.document.createElement;t.context.document.createElement=tag=>{const el=create(tag);if(tag==='canvas')el.toDataURL=()=> 'data:image/jpeg;base64,positive-fixture';return el;};t.context.refreshRollUI=()=>refreshes++;
t.set('painted',{width:160,height:110});t.run('activeFrame=0;working=null;updateFrameThumb(painted);');assert.equal(t.run('roll[0].thumb'),null);
t.run('working={width:1,height:1};display="negative";updateFrameThumb(painted);');assert.equal(t.run('roll[0].thumb'),null);
t.run('display="positive";updateFrameThumb(painted);');assert.equal(t.run('roll[0].thumbPositive'),true);assert.equal(t.run('roll[1].thumb'),null);assert.equal(refreshes,1);assert.equal(reads,0);
t.run('roll=[{file:{name:"new.ARW"}}];working=null;activeFrame=-1;updateFrameThumb(painted);');assert.equal(t.run('roll[0].thumb'),undefined);assert.equal(refreshes,1);
console.log('PASS positive thumbnails reuse the current ready preview; negative/missing/stale images and unopened files cannot populate a replacement queue');

// Onload failures used to resolve the import promise. Callers need rejection
// so the real selection path can clear the source and report failure.
const b=harness();let revoked=0;
b.context.URL={createObjectURL:()=> 'blob:test',revokeObjectURL:()=>revoked++};
b.context.Image=class{set src(_){this.naturalWidth=1;this.naturalHeight=1;queueMicrotask(()=>this.onload());}};
b.run(`finishImport=()=>{throw Error('synthetic import failure');};`);
await assert.rejects(b.run(`importBrowserImage({name:'broken.png'})`),/synthetic import failure/);
assert.equal(revoked,1);
console.log('PASS browser decode/import failures reject and release their object URL');
