import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {fingerprint,inputHash} from '../tools/build-artifact.mjs';
import {completeSuite,verify,currentMain} from '../tools/verified-artifact.mjs';
import {contentIdentity} from '../tools/build-identity.mjs';import {levels,manualTests} from './suites.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'filmlabb-build-check-'));try{
 const file=path.join(dir,'asset.js');fs.writeFileSync(file,'const a=1;');const first=fingerprint([dir]),stat=fs.statSync(file);fs.writeFileSync(file,'const a=2;');fs.utimesSync(file,stat.atime,stat.mtime);assert.notEqual(fingerprint([dir]),first,'same-size/same-mtime source edits must invalidate');fs.writeFileSync(file,'const a=1;');assert.equal(fingerprint([dir]),first);fs.renameSync(file,path.join(dir,'other.js'));assert.notEqual(fingerprint([dir]),first,'renames must invalidate');assert.notEqual(fingerprint([dir]),fingerprint([path.join(dir,'missing')]));
 assert.match(inputHash(),/^[a-f0-9]{64}$/);const pkg=JSON.parse(fs.readFileSync('package.json'));for(const name of ['test:fast','test:full','test:extended'])assert.ok(pkg.scripts[name]);
 console.log('PASS content-based build identity rejects preserved timestamps/size, rename/removal and verifies installed build inputs; explicit test levels');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

{


const root=fs.mkdtempSync(path.join(os.tmpdir(),'filmlabb-publish-')),commit='a'.repeat(40),info={sourceCommit:commit,sourceBranch:'main',version:'2.0.0-beta.99',dirty:false};
const site=path.join(root,'site'),record=path.join(root,'.cache/publication/verification.json');fs.mkdirSync(site);fs.mkdirSync(path.dirname(record),{recursive:true});
const report={level:'full',engine:'all',failures:0,tests:[...levels.full.node,'stability-build.mjs',...levels.full.browser].map(f=>({file:'tests/'+f,status:0}))};
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
 const extended={...report,level:'extended',tests:[...levels.extended.node,'stability-build.mjs',...levels.extended.browser].map(f=>({file:'tests/'+f,status:0}))};assert.doesNotThrow(()=>completeSuite(extended));
 for(const event of ['push','workflow_dispatch'])assert.equal(currentMain({event,ref:'refs/heads/main',commit,main:commit}),true);
 for(const input of [{event:'pull_request',ref:'refs/heads/main',main:commit},{event:'workflow_dispatch',ref:'refs/heads/feature',main:commit},{event:'push',ref:'refs/heads/main',main:'b'.repeat(40)},{event:'push',ref:'refs/heads/main',main:''}])assert.equal(currentMain({...input,commit}),false);
 console.log('PASS complete full-suite attestation, portable artifact bytes/commit, tamper rejection, release identity, PR/manual/stale-main publication guards');
}finally{fs.rmSync(root,{recursive:true,force:true});}

}

{
// Architectural invariants of the workflow, in addition to actionlint validation.

const workflow=fs.readFileSync('.github/workflows/build.yml','utf8'),[build,deploy]=workflow.split('\n  deploy:\n');
assert.ok(deploy);assert.equal(fs.existsSync('.github/workflows/pages.yml'),false,'no second production build/test workflow');
assert.match(workflow,/options: \[fast, full, extended\]/);assert.match(build,/REQUESTED_LEVEL: \$\{\{ inputs.level \|\| 'full' \}\}/);assert.match(workflow,/npm run test:\$\{\{ steps\.scope\.outputs\.level \}\}/);assert.doesNotMatch(workflow,/npm run build|continue-on-error|always\(|if:\s*failure\(/);
assert.match(build,/fetch-depth: 0/);assert.match(build,/cache: npm/);assert.match(build,/npm ci/);assert.match(build,/cancel-in-progress: true/);assert.doesNotMatch(build,/pages: write|id-token: write/);
assert.ok(build.indexOf('npm run test:${{ steps.scope.outputs.level }}')<build.indexOf('node tools/verified-artifact.mjs seal'));
assert.ok(build.indexOf('node tools/verified-artifact.mjs seal')<build.indexOf('actions/upload-artifact@'));
assert.match(deploy,/needs: build/);assert.match(deploy,/github.ref == 'refs\/heads\/main'/);assert.match(deploy,/github.event_name == 'push' \|\| github.event_name == 'workflow_dispatch' && inputs.level != 'fast'/);
assert.match(deploy,/group: pages\n\s+cancel-in-progress: false/);assert.doesNotMatch(deploy,/npm ci|setup-node|test:full|npm run build/);
assert.equal((workflow.match(/ref: \$\{\{ github.sha \}\}/g)||[]).length,2,'both checkouts use the exact event commit');
assert.match(deploy,/actions\/download-artifact@v4/);assert.match(deploy,/path: verified\/site\//);
const actions=['actions/download-artifact@','node tools/verified-artifact.mjs verify verified --release','actions/upload-pages-artifact@','git ls-remote origin refs/heads/main','node tools/verified-artifact.mjs current','actions/deploy-pages@'];
for(let i=1;i<actions.length;i++)assert.ok(deploy.indexOf(actions[i])>deploy.indexOf(actions[i-1]),actions[i]+' ordering');
assert.match(deploy,/if: steps.current.outputs.publish == 'true'\n\s+id: deployment\n\s+uses: actions\/deploy-pages/);
console.log('PASS scope-aware verification, sealed immutable artifact, minimal deploy permissions, pinned commit, serialized/latest-main-only publication and safe manual/PR conditions');

}

// Registry completeness: current tests cannot silently disappear from execution.
const registered=[...levels.extended.node,...levels.extended.browser,'stability-build.mjs',...manualTests];
assert.equal(new Set(registered).size,registered.length);
for(const file of registered)assert.ok(fs.existsSync('tests/'+file),file);
for(const file of fs.readdirSync('tests').filter(n=>n.endsWith('.mjs')&&n!=='suites.mjs'))assert.ok(registered.includes(file),'Unregistered test '+file);
for(const level of ['fast','full'])for(const file of [...levels[level].node,...levels[level].browser])assert.ok(registered.includes(file));
assert.throws(()=>completeSuite({level:'fast',engine:'all',failures:0,tests:[]}));
