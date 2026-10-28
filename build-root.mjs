import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {assets as sourceAssets,scripts} from './app-manifest.mjs';
import {sourceIdentity,contentIdentity} from './tools/build-identity.mjs';
const src=fs.existsSync('node_modules/libraw-wasm/dist')?'node_modules/libraw-wasm/dist':'vendor/libraw/dist';
if(!fs.existsSync(src))throw Error('LibRaw dist saknas: npm install måste först köras');
// The vendored fallback lives outside the generated deployment directory.
fs.rmSync('site',{recursive:true,force:true});
const files=fs.readdirSync(src);console.log('LibRaw-filer:',files);
fs.mkdirSync('site/libraw/dist',{recursive:true});
for(const file of files){if(fs.statSync(path.join(src,file)).isFile())fs.copyFileSync(path.join(src,file),path.join('site/libraw/dist',file));}
const html=fs.readFileSync('index.html','utf8');
const boot=[...html.matchAll(/<script\b[^>]*src="\.\/([^"]+)"[^>]*>/g)].map(m=>m[1]);
if(JSON.stringify(boot)!==JSON.stringify(scripts.map(a=>a.file)))throw Error('HTML script order differs from app-manifest.mjs');
fs.copyFileSync('index.html','site/index.html');
// Reference page runs the original app unchanged, with private storage before
// bootstrap. Only its offline registration is omitted. Normal index is identical.
const referenceHTML=html.replace('<head>','<head><script src="./v2-reference-isolation.js"></script>')
 .replace(/<script[^>]*src="\.\/register-offline\.js"[^>]*><\/script>/,'')
 .replace('</body>','<script defer src="./v2-reference-bridge.js"></script></body>');
fs.writeFileSync('site/v2-reference.html',referenceHTML);

if(!fs.existsSync('site/libraw/dist/index.js'))throw Error('Paketet saknar dist/index.js');
console.log('Klart: publicera hela site-mappen via HTTPS, och cachea lokalt för offlinebruk.');

fs.copyFileSync('manifest.webmanifest','site/manifest.webmanifest');
for(const [file,source] of Object.entries(sourceAssets))fs.copyFileSync(source,'site/'+file);

for(const f of ['filmlabb-logo.png','icon-192.png','icon-512.png'])fs.copyFileSync(f,'site/'+f);

// Stamp the code being served, not a separately fetched latest-deployment record.
const info={...sourceIdentity(),contentHash:contentIdentity('site')};
fs.writeFileSync('site/build-info.js',fs.readFileSync(sourceAssets['build-info.js'],'utf8').replace('const INFO=null;','const INFO='+JSON.stringify(info)+';'));
fs.writeFileSync('site/build-info.json',JSON.stringify(info,null,2)+'\n');

// Include the worker implementation and every deployed asset, with stable ordering.
const hash=crypto.createHash('sha256'),assets=['./'];
function fingerprint(dir){for(const name of fs.readdirSync(dir).sort()){
 const file=path.join(dir,name);if(fs.statSync(file).isDirectory())fingerprint(file);
 else{if(/\.(html|css|js|wasm|png|webmanifest)$/.test(file))assets.push('./'+path.relative('site',file).split(path.sep).join('/'));hash.update(path.relative('site',file));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}
}}
fingerprint('site');
const cacheName='filmlabb-stability-'+hash.digest('hex').slice(0,24);
const worker=fs.readFileSync(sourceAssets['cache-worker.js'],'utf8').replace(/const CACHE='[^']+';/,`const CACHE='${cacheName}';`).replace(/const ASSETS=\[[^;]+;/,`const ASSETS=${JSON.stringify(assets)};`);
fs.writeFileSync('site/cache-worker.js',worker);
console.log('Offline cache:',cacheName);
