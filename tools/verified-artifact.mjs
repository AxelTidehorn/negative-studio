/* Bind a complete successful suite to immutable site bytes. Deploy needs only
   Node built-ins and this checkout; it never installs, renders or rebuilds. */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {contentIdentity} from './build-identity.mjs';
import {levels} from '../tests/suites.mjs';
export function completeSuite(report){
 const selected=levels[report?.level],actual=report?.tests;
 const expected=selected?[...selected.node,'stability-build.mjs',...selected.browser].map(f=>'tests/'+f):[];
 if(!['full','extended'].includes(report?.level)||report.engine!=='all'||report.failures!==0||!Array.isArray(actual)||actual.length!==expected.length||actual.some(t=>t.status!==0)||new Set(actual.map(t=>t.file)).size!==expected.length||expected.some(f=>!actual.some(t=>t.file===f)))throw Error('A complete successful full or extended suite is required');
}
export function verify(root,expected,{release=false}={}){
 const record=JSON.parse(fs.readFileSync(path.join(root,'.cache/publication/verification.json'))),info=JSON.parse(fs.readFileSync(path.join(root,'site/build-info.json')));
 completeSuite(record.report);
 const tested=record.report.artifact;
 if(!/^[a-f0-9]{40}$/.test(expected||'')||record.schema!=='filmlabb.verified-build'||record.version!==1||!tested||tested.sourceCommit!==expected||info.sourceCommit!==expected||info.version!==tested.version||info.dirty!==false||tested.sha256!==contentIdentity(path.join(root,'site')))throw Error('Tested artifact identity or bytes do not match');
 if(release&&(info.sourceBranch!=='main'||!/^[0-9]+\.[0-9]+\.[0-9]+-beta\.[0-9]+$/.test(info.version)))throw Error('Only a clean main release can be published');
 return {commit:info.sourceCommit,version:info.version,groups:record.report.tests.length,sha256:tested.sha256};
}
export function currentMain({event,ref,commit,main}){
 return ['push','workflow_dispatch'].includes(event)&&ref==='refs/heads/main'&&/^[a-f0-9]{40}$/.test(commit||'')&&commit===main;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,root='.']=process.argv.slice(2),expected=process.env.GITHUB_SHA;
 if(mode==='seal'){
  const level=root==='.'?'full':root;
  const report=JSON.parse(fs.readFileSync('.cache/test-'+level+'.json'));completeSuite(report);
  if(report.level!==level)throw Error('Verification level mismatch');
  const {inputHash}=await import('./build-artifact.mjs');
  if(report.build?.input!==inputHash())throw Error('Build inputs changed after verification');
  fs.mkdirSync('.cache/publication',{recursive:true});fs.writeFileSync('.cache/publication/verification.json',JSON.stringify({schema:'filmlabb.verified-build',version:1,report},null,2)+'\n');
  console.log(verify('.',expected||report.artifact?.sourceCommit));
 }else if(mode==='verify')console.log(verify(root,expected,{release:process.argv.includes('--release')}));
 else if(mode==='current'){
  if(!/^[a-f0-9]{40}$/.test(root))throw Error('Cannot read current main; publication blocked');
  const publish=currentMain({event:process.env.GITHUB_EVENT_NAME,ref:process.env.GITHUB_REF,commit:expected,main:root});
  if(!publish)console.error('Obsolete or non-main event; publication skipped.');
  console.log('publish='+publish);
 }
 else throw Error('Expected seal, verify or current');
}
