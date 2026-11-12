import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {completeSuite,verify,currentMain} from '../tools/verified-artifact.mjs';
import {contentIdentity} from '../tools/build-identity.mjs';import {nodeSuites,browserTests,styleNodeTests,styleBrowserTests} from './suites.mjs';
import {isStyleOnly} from '../tools/verification-scope.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'filmlabb-publish-')),commit='a'.repeat(40),info={sourceCommit:commit,sourceBranch:'main',version:'2.0.0-beta.99',dirty:false};
const site=path.join(root,'site'),record=path.join(root,'.cache/publication/verification.json');fs.mkdirSync(site);fs.mkdirSync(path.dirname(record),{recursive:true});
const report={level:'full',engine:'all',failures:0,tests:[...Object.values(nodeSuites).flat(),'stability-build.mjs',...browserTests].map(f=>({file:'tests/'+f,status:0}))};
function write(){fs.writeFileSync(path.join(site,'build-info.json'),JSON.stringify(info));fs.writeFileSync(record,JSON.stringify({schema:'filmlabb.verified-build',version:1,report:{...report,artifact:{sourceCommit:commit,version:info.version,sha256:contentIdentity(site)}}}));}
try{
 fs.writeFileSync(path.join(site,'index.html'),'verified shell');write();
 assert.equal(verify(root,commit,{release:true}).version,info.version);
 assert.throws(()=>verify(root,'b'.repeat(40)),/identity/);
 for(const edit of [r=>r.level='fast',r=>r.engine='v2',r=>r.failures=1,r=>r.tests[0].status=1,r=>r.tests.pop(),r=>r.tests.push(r.tests[0]),r=>r.tests[1]=r.tests[0]]){const r=structuredClone(report);edit(r);assert.throws(()=>completeSuite(r),/complete successful/);}
 // Catch a silent omission of any GPU/export/compatibility/browser check.
 for(const file of ['tests/v2-gpu-browser.mjs','tests/frame-review-browser.mjs','tests/profile-system-browser.mjs']){const r=structuredClone(report);r.tests=r.tests.filter(t=>t.file!==file);assert.throws(()=>completeSuite(r));}
 fs.writeFileSync(path.join(site,'index.html'),'unverified mutation');assert.throws(()=>verify(root,commit),/bytes/);write();
 fs.writeFileSync(path.join(site,'extra.js'),'added after tests');assert.throws(()=>verify(root,commit),/bytes/);fs.unlinkSync(path.join(site,'extra.js'));assert.equal(verify(root,commit).commit,commit);
 for(const edit of [()=>info.dirty=true,()=>{info.dirty=false;info.sourceBranch='feature';},()=>{info.sourceBranch='main';info.version='2.0.0-beta.99.dev.gaaaaaaaaaaaa';}]){edit();write();assert.throws(()=>verify(root,commit,{release:true}));}
 // A bounded CSS-only verification can be sealed; never accept source, test or CI edits.
 const styleReport={level:'style',engine:'all',failures:0,changedPaths:['src/ui/application.css'],tests:[...styleNodeTests,...styleBrowserTests].map(f=>({file:'tests/'+f,status:0}))};
 assert.doesNotThrow(()=>completeSuite(styleReport));
 for(const paths of [[],['src/ui/application.css','src/ui/app.js'],['tests/ui-21-browser.mjs'],['.github/workflows/build.yml'],['app.css'],['src/ui/application.css','index.html']])assert.equal(isStyleOnly(paths),false);
 for(const paths of [['src/ui/application.css'],['src/ui/application.css','src/ui/ui-refinement.css']])assert.equal(isStyleOnly(paths),true);
 for(const edit of [r=>r.changedPaths.push('src/ui/app.js'),r=>r.changedPaths=[],r=>r.tests.pop(),r=>r.tests[0].status=1,r=>r.level='full']){
  const r=structuredClone(styleReport);edit(r);assert.throws(()=>completeSuite(r),/complete successful/);
 }
 for(const event of ['push','workflow_dispatch'])assert.equal(currentMain({event,ref:'refs/heads/main',commit,main:commit}),true);
 for(const input of [{event:'pull_request',ref:'refs/heads/main',main:commit},{event:'workflow_dispatch',ref:'refs/heads/feature',main:commit},{event:'push',ref:'refs/heads/main',main:'b'.repeat(40)},{event:'push',ref:'refs/heads/main',main:''}])assert.equal(currentMain({...input,commit}),false);
 console.log('PASS complete full-suite attestation, portable artifact bytes/commit, tamper rejection, release identity, PR/manual/stale-main publication guards');
}finally{fs.rmSync(root,{recursive:true,force:true});}
