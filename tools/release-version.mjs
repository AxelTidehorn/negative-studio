/* Immutable mainline ordinal: one beta per first-parent commit after anchor.
   No mutable counters/tags, write tokens, generated commits or release PRs. */
import {execFileSync} from 'node:child_process';
export function versionFor({base,count,commit,branch,dirty}){
 if(!/^\d+\.\d+\.\d+-beta\.0$/.test(base)||!Number.isSafeInteger(count)||count<0)throw Error('Invalid release policy/history');
 const prefix=base.replace(/0$/,String(count));
 return branch==='main'&&!dirty?prefix:prefix+'.dev.g'+(commit?.slice(0,12)||'unknown')+(dirty?'.dirty':'');
}
export function releaseVersion(pkg,identity){
 if(!pkg.release?.mainlineAnchor)return pkg.version;
 let count;
 try{count=Number(execFileSync('git',['rev-list','--first-parent','--count',pkg.release.mainlineAnchor+'..'+identity.sourceCommit],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim());
 execFileSync('git',['merge-base','--is-ancestor',pkg.release.mainlineAnchor,identity.sourceCommit],{stdio:'ignore'});
 }catch{if(identity.sourceBranch==='main')throw Error('Release history unavailable: checkout main with fetch-depth: 0');count=0;}
 return versionFor({base:pkg.version,count,commit:identity.sourceCommit,branch:identity.sourceBranch,dirty:identity.dirty!==false});
}
