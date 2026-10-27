/* Metadata/statistics diff, with no network or application state. */
import fs from 'node:fs';import {pathToFileURL} from 'node:url';
export function compare(a,b){
 for(const r of [a,b])if(r?.schema!=='filmlabb-image-diagnostics'||r.schemaVersion!==1)throw Error('Unsupported diagnostic schema/version');
 const changes=[];
 function visit(a,b,path){if(Object.is(a,b))return;if(a!==null&&b!==null&&typeof a==='object'&&typeof b==='object'){for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort())visit(a[key],b[key],path?path+'.'+key:key);}else changes.push({path,before:a??null,after:b??null,...(typeof a==='number'&&typeof b==='number'?{delta:b-a}:{})});}
 visit(a,b,'');return changes;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const [a,b]=process.argv.slice(2);if(!a||!b)throw Error('Usage: node tools/compare-diagnostics.mjs before.json after.json');for(const p of [a,b])if(fs.statSync(p).size>200000)throw Error('Report exceeds 200 kB');const changes=compare(JSON.parse(fs.readFileSync(a)),JSON.parse(fs.readFileSync(b)));console.log(JSON.stringify({schemaVersion:1,changed:changes.length,changes},null,2));}catch(e){console.error(e.message);process.exitCode=1;}
}
