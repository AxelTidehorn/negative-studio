/* Called in the PREVIEW repository's scheduled workflow, after source checkout. */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
export const previewURL='https://axeltidehorn.github.io/negative-studio-v2-preview/';
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid checked-out revision');
let publish=process.env.PREVIEW_FORCE==='true';
if(!publish){
 const response=await fetch(new URL('preview-deployment.json?check='+Date.now(),previewURL),{cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(response.status===404)publish=true;
 else if(!response.ok)throw Error('Preview status check failed: HTTP '+response.status);
 else{const previous=await response.json();publish=previous.schema!=='filmlabb.v2-preview-deployment'||previous.version!==1||previous.sourceCommit!==commit;}
}
if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`publish=${publish}\nsource_commit=${commit}\n`);
console.log(JSON.stringify({sourceCommit:commit,publish}));
