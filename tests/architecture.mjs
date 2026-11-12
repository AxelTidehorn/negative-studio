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
const h=harness(),S=h.context.NSProjectSettings;
assert.equal(S.newImageDefaults().engine,'v2');assert.equal(S.newImageDefaults({v2Compatible:false}).engine,'calibrated4');
for(const engine of ['log39','curve3','density3','matrix3','beta2','legacy','reference'])assert.throws(()=>S.newImageDefaults({engine}));
assert.equal(html.match(/<select id="engineMode">([\s\S]*?)<\/select>/)[1].match(/<option/g).length,2);
const manifest=JSON.stringify(assets);for(const module of ['conversion3.js','legacy-analysis.js','v2-lab.js','v2-worker.js','editing-controller.js'])assert.ok(!manifest.includes(module));
const a=S.imageDefaults(),b=S.imageDefaults();a.response4={span:[1,2,3]};const copied=S.clone(a);copied.response4.span[0]=99;assert.equal(a.response4.span[0],1);assert.equal(b.response4,null);
assert.deepEqual(Object.keys(S.rollDefaults()).sort(),['cropExportToFrame','look','monochrome']);
console.log('PASS only V2/Standard production graph, current defaults and independent settings');
await import('../tools/consolidation-oracle.mjs');
