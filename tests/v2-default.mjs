/* Fresh workflows and historical deserialization deliberately use two factories. */
import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync('src/app/settings.js','utf8'),context);
const s=context.NSProjectSettings;
assert.equal(s.newImageDefaults().engine,'v2');assert.equal(s.newImageDefaults().conversionVersion,2);assert.equal(s.newImageDefaults().editVersion,2);
assert.equal(s.newImageDefaults({v2Compatible:false}).engine,'calibrated4');
assert.equal(s.newImageDefaults({engine:'calibrated4'}).engine,'calibrated4','explicit developer Standard reference is independent of default');
assert.throws(()=>s.newImageDefaults({engine:'v2',v2Compatible:false}));
assert.equal(s.imageDefaults().engine,'calibrated4','missing engine in historical projects retains #66 fallback');
for(const engine of ['log39','calibrated4','v2','curve3','density3','matrix3'])assert.equal(({...s.imageDefaults(),engine}).engine,engine);
assert.equal(({...s.imageDefaults(),...{exposure:.4}}).engine,'calibrated4');
const a=s.newImageDefaults(),b=s.newImageDefaults();a.exposure=1;assert.equal(b.exposure,0);
console.log('PASS fresh V2 defaults, eligible-source gate, unchanged historical fallback and independent image settings');
