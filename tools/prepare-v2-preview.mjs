/* Post-build packaging only. Never changes application source or production site. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function preparePreview(directory,commit){
 if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid source commit');
 for(const file of ['v2.html','v2-core.js','v2-lab.js','raw-decoder.js','libraw/dist/index.js','libraw/dist/worker.js','libraw/dist/libraw.wasm'])if(!fs.statSync(path.join(directory,file)).isFile())throw Error('Preview resource missing: '+file);
 // CacheStorage is shared by all projects on axeltidehorn.github.io. The normal
 // worker deletes all filmlabb-* caches on activation and rewrites navigations.
 // This separate test deployment deliberately uses network/HTTP caching only.
 fs.writeFileSync(path.join(directory,'register-offline.js'),'/* Isolated v2 preview: no offline worker is registered. */\n');
 fs.writeFileSync(path.join(directory,'cache-worker.js'),'/* Isolated v2 preview: no CacheStorage access or fetch interception. */\n');
 fs.writeFileSync(path.join(directory,'.nojekyll'),'');
 const metadata={schema:'filmlabb.v2-preview-deployment',version:1,sourceRepository:'AxelTidehorn/negative-studio',sourceBranch:'feat/filmlabb-v2-prototype',sourceCommit:commit,offlineCache:false};
 fs.writeFileSync(path.join(directory,'preview-deployment.json'),JSON.stringify(metadata,null,2)+'\n');
 return metadata;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 console.log(JSON.stringify(preparePreview('site',commit)));
}
