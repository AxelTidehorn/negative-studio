import {readSource,sourcePath} from './helpers/source.mjs';
import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const build=()=>execFileSync(process.execPath,['build-root.mjs'],{stdio:'pipe'});
fs.mkdirSync('site',{recursive:true});fs.writeFileSync('site/stale-test-sentinel.js','obsolete');
build();assert.ok(!fs.existsSync('site/stale-test-sentinel.js'));assert.equal(readSource('site/index.html','utf8'),readSource('index.html','utf8'));
const cache=()=>readSource('site/cache-worker.js','utf8');const initial=cache();build();assert.equal(cache(),initial,'identical build has stable cache ID');
const assets=JSON.parse(initial.match(/const ASSETS=(\[[^;]+);/)[1]);
for(const f of ['frame-controller.js','calibration-state.js','i18n.js','index.html','libraw/dist/libraw.wasm'])assert.ok(assets.includes('./'+f));
for(const name of assets){if(name==='./')continue;assert.ok(fs.existsSync('site/'+name.slice(2)),name);}
// Test the hasher with a changed source, always restoring it, including on failure.
const source=readSource('ui-refinement.css');
try{fs.appendFileSync(sourcePath('ui-refinement.css'),'\n/* build hash test */\n');build();assert.notEqual(cache().match(/const CACHE='([^']+)/)[1],initial.match(/const CACHE='([^']+)/)[1]);}
finally{fs.writeFileSync(sourcePath('ui-refinement.css'),source);build();}
console.log('PASS clean output, generated complete precache manifest, reproducible version, asset change invalidates cache, built HTML parity');
