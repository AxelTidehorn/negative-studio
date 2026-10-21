import fs from 'node:fs';import path from 'node:path';
const src=fs.existsSync('node_modules/libraw-wasm/dist')?'node_modules/libraw-wasm/dist':'site/libraw/dist';
if(!fs.existsSync(src))throw Error('LibRaw dist saknas: npm install måste först köras');
const files=fs.readdirSync(src);console.log('LibRaw-filer:',files);
fs.mkdirSync('site/libraw/dist',{recursive:true});
for(const file of files){if(fs.statSync(path.join(src,file)).isFile())if(src!=='site/libraw/dist')fs.copyFileSync(path.join(src,file),path.join('site/libraw/dist',file));}
fs.copyFileSync('index.html','site/index.html');
if(!fs.existsSync('site/libraw/dist/index.js'))throw Error('Paketet saknar dist/index.js');
console.log('Klart: publicera hela site-mappen via HTTPS, och cachea lokalt för offlinebruk.');

fs.copyFileSync('manifest.webmanifest','site/manifest.webmanifest');
fs.copyFileSync('sw.js','site/sw.js');
fs.copyFileSync('cache-worker.js','site/cache-worker.js');

fs.copyFileSync('demo-negative.png','site/demo-negative.png');

for(const f of ['creative-profiles.js','source-analysis.js','slider-response.js','file-formats.js','raw-decoder.js','image-model.js','color-management.js','srgb-profile.js','frame-controller.js','calibration-state.js','beta39.js','beta4.js','color-calibration.js','raw-input.js','color-analysis.js','render-core.js','preview-worker.js','i18n.js','workspace-layout.js'])fs.copyFileSync(f,'site/'+f);

for(const f of ['filmlabb-logo.png','icon-192.png','icon-512.png'])fs.copyFileSync(f,'site/'+f);
