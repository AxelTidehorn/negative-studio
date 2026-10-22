import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const src=fs.existsSync('node_modules/libraw-wasm/dist')?'node_modules/libraw-wasm/dist':'vendor/libraw/dist';
if(!fs.existsSync(src))throw Error('LibRaw dist saknas: npm install måste först köras');
// The vendored fallback lives outside the generated deployment directory.
fs.rmSync('site',{recursive:true,force:true});
const files=fs.readdirSync(src);console.log('LibRaw-filer:',files);
fs.mkdirSync('site/libraw/dist',{recursive:true});
for(const file of files){if(fs.statSync(path.join(src,file)).isFile())fs.copyFileSync(path.join(src,file),path.join('site/libraw/dist',file));}
fs.copyFileSync('index.html','site/index.html');
fs.copyFileSync('mobile-layout.css','site/mobile-layout.css');
fs.copyFileSync('ui-refinement.css','site/ui-refinement.css');
if(!fs.existsSync('site/libraw/dist/index.js'))throw Error('Paketet saknar dist/index.js');
console.log('Klart: publicera hela site-mappen via HTTPS, och cachea lokalt för offlinebruk.');

fs.copyFileSync('manifest.webmanifest','site/manifest.webmanifest');
fs.copyFileSync('sw.js','site/sw.js');
fs.copyFileSync('cache-worker.js','site/cache-worker.js');

fs.copyFileSync('demo-negative.png','site/demo-negative.png');

for(const f of ['compact-ui.js','export-plan.js','export-worker.js','export-controller.js','flat-field.js','next-workflow.js','gpu-renderer.js','gpu-preview.js','tiff-codec.js','creative-profiles.js','source-analysis.js','slider-response.js','file-formats.js','raw-decoder.js','image-model.js','color-management.js','srgb-profile.js','frame-controller.js','calibration-state.js','beta39.js','beta4.js','color-calibration.js','raw-input.js','color-analysis.js','render-core.js','preview-worker.js','i18n.js','workspace-layout.js'])fs.copyFileSync(f,'site/'+f);

for(const f of ['filmlabb-logo.png','icon-192.png','icon-512.png'])fs.copyFileSync(f,'site/'+f);

// Include the worker implementation and every deployed asset, with stable ordering.
const hash=crypto.createHash('sha256'),assets=['./'];
function fingerprint(dir){for(const name of fs.readdirSync(dir).sort()){
 const file=path.join(dir,name);if(fs.statSync(file).isDirectory())fingerprint(file);
 else{if(/\.(html|css|js|wasm|png|webmanifest)$/.test(file))assets.push('./'+path.relative('site',file).split(path.sep).join('/'));hash.update(path.relative('site',file));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}
}}
fingerprint('site');
const cacheName='filmlabb-stability-'+hash.digest('hex').slice(0,24);
const worker=fs.readFileSync('cache-worker.js','utf8').replace(/const CACHE='[^']+';/,`const CACHE='${cacheName}';`).replace(/const ASSETS=\[[^;]+;/,`const ASSETS=${JSON.stringify(assets)};`);
fs.writeFileSync('site/cache-worker.js',worker);
console.log('Offline cache:',cacheName);
