/* Fail closed: only changes confined to UI stylesheets may use the short
   verification suite. Everything else, including tests and CI, stays full. */
import {execFileSync} from 'node:child_process';

export function isStyleOnly(paths){
 return paths.length>0 && paths.every(p=>/^src\/ui\/[a-z0-9-]+\.css$/.test(p));
}
export function changedPaths(){
 const output=execFileSync('git',['diff','--name-only','--diff-filter=ACDMRTUXB','HEAD^1','HEAD'],{encoding:'utf8'});
 return output.split('\n').map(s=>s.trim()).filter(Boolean);
}
export function verificationScope(event=process.env.GITHUB_EVENT_NAME){
 const paths=changedPaths();
 return {level:event==='workflow_dispatch'?'full':isStyleOnly(paths)?'style':'full',paths};
}
if(process.argv[1]?.endsWith('verification-scope.mjs')){
 const {level,paths}=verificationScope();
 if(process.argv.includes('--json'))console.log(JSON.stringify({level,paths}));
 else console.log(level);
}
