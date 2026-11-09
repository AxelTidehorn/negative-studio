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

// A thumbnail can finish after a new import or clear. It must neither refresh
// that queue nor continue traversing its files on the old import's behalf.
const t=harness();let resolveThumb,refreshes=0;const names=[];
t.run(`chooseFrame=async()=>true;refreshRollUI=()=>{};`);
t.context.makeThumb=async file=>{names.push(file.name);return await new Promise(r=>resolveThumb=r);};
const old=t.run(`importRoll([{name:'old.ARW'},{name:'old2.ARW'}])`);
await new Promise(r=>setImmediate(r));assert.deepEqual(names,['old.ARW']);
t.run(`roll=[{file:{name:'new.ARW'}},{file:{name:'new2.ARW'}}]`);
t.context.refreshRollUI=()=>refreshes++;
resolveThumb('old-thumbnail');await old;
assert.equal(refreshes,0);assert.deepEqual(names,['old.ARW']);
assert.equal(t.run('roll[0].thumb'),undefined);
console.log('PASS late thumbnails do not refresh or traverse a replacement queue');

// Onload failures used to resolve the import promise. Callers need rejection
// so the real selection path can clear the source and report failure.
const b=harness();let revoked=0;
b.context.URL={createObjectURL:()=> 'blob:test',revokeObjectURL:()=>revoked++};
b.context.Image=class{set src(_){this.naturalWidth=1;this.naturalHeight=1;queueMicrotask(()=>this.onload());}};
b.run(`finishImport=()=>{throw Error('synthetic import failure');};`);
await assert.rejects(b.run(`importBrowserImage({name:'broken.png'})`),/synthetic import failure/);
assert.equal(revoked,1);
console.log('PASS browser decode/import failures reject and release their object URL');
