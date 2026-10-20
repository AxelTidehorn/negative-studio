import fs from 'node:fs';import path from 'node:path';
const src='node_modules/libraw-wasm/dist';
if(!fs.existsSync(src))throw Error('LibRaw dist saknas: npm install måste först köras');
const files=fs.readdirSync(src);console.log('LibRaw-filer:',files);
fs.mkdirSync('site/libraw/dist',{recursive:true});
for(const file of files){if(fs.statSync(path.join(src,file)).isFile())fs.copyFileSync(path.join(src,file),path.join('site/libraw/dist',file));}
fs.copyFileSync('index.html','site/index.html');
if(!fs.existsSync('site/libraw/dist/index.js'))throw Error('Paketet saknar dist/index.js');
console.log('Klart: publicera hela site-mappen via HTTPS, och cachea lokalt för offlinebruk.');

fs.copyFileSync('manifest.webmanifest','site/manifest.webmanifest');
fs.copyFileSync('sw.js','site/sw.js');
