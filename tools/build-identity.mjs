import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import crypto from 'node:crypto';
import {releaseVersion} from './release-version.mjs';
function git(args){try{return execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}}
// Build inputs only: generated site/cache files and test screenshots are excluded.
// Keep root assets and the tracked decoder fallback alongside src/ here so a
// locally modified main checkout cannot claim to be a clean release build.
const SOURCE_INPUTS=['src','index.html','package.json','package-lock.json','app-manifest.mjs','build-root.mjs','tools/build-identity.mjs','tools/release-version.mjs','manifest.webmanifest','filmlabb-logo.png','icon-192.png','icon-512.png','LICENSE','THIRD_PARTY_NOTICES.md','legal','vendor/libraw/dist'];
export function sourceIdentity(){
 const pkg=JSON.parse(fs.readFileSync('package.json','utf8')),version=pkg.version;if(!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version||''))throw Error('A release version is required in package.json');
 const sourceCommit=git(['rev-parse','HEAD']),branch=git(['symbolic-ref','--quiet','--short','HEAD']);
 const changes=git(['status','--porcelain','--untracked-files=normal','--',...SOURCE_INPUTS]);
 const identity={schema:'filmlabb.build',schemaVersion:1,sourceCommit,sourceBranch:branch||process.env.GITHUB_HEAD_REF||(sourceCommit===process.env.GITHUB_SHA?process.env.GITHUB_REF_NAME:null),dirty:changes===null?null:changes.length>0};
 return {...identity,version:releaseVersion(pkg,identity)};
}
export function contentIdentity(directory){const hash=crypto.createHash('sha256');function visit(dir){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name);if(fs.statSync(file).isDirectory())visit(file);else{hash.update(path.relative(directory,file));hash.update('\0');hash.update(fs.readFileSync(file));hash.update('\0');}}}visit(directory);return hash.digest('hex');}
