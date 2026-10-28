/* Actual HTTPS checks after deploy; failure is a failed workflow, not a success URL. */
import {execFileSync} from 'node:child_process';
const url=new URL(process.env.FILMLABB_PREVIEW_URL||'https://axeltidehorn.github.io/negative-studio-v2-preview/');
if(url.protocol!=='https:'||url.origin!=='https://axeltidehorn.github.io'||url.pathname!=='/negative-studio-v2-preview/')throw Error('Unexpected preview deployment URL');
const expected=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
async function get(file){const response=await fetch(new URL(file,url),{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(file+': HTTP '+response.status);return response;}
const metadata=await (await get('preview-deployment.json?verify='+Date.now())).json();
if(metadata.sourceCommit!==expected||metadata.offlineCache!==false)throw Error('Deployed source revision does not match checkout');
const html=await (await get('v2.html')).text(),scripts=[...html.matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m=>m[1]);
if(!scripts.length)throw Error('No v2 scripts found');
for(const file of [...scripts,'libraw/dist/index.js','libraw/dist/worker.js','libraw/dist/libraw.js']){const r=await get(file);if(!(r.headers.get('content-type')||'').includes('javascript'))throw Error('Wrong JavaScript content type: '+file);await r.arrayBuffer();}
const wasm=await get('libraw/dist/libraw.wasm');
if(!(wasm.headers.get('content-type')||'').includes('application/wasm'))throw Error('Wrong WASM content type');
const bytes=new Uint8Array(await wasm.arrayBuffer());if(bytes[0]!==0||bytes[1]!==97||bytes[2]!==115||bytes[3]!==109)throw Error('Invalid WASM response');
for(const file of ['register-offline.js','cache-worker.js'])if(!/Isolated v2 preview/.test(await (await get(file)).text()))throw Error('Offline isolation missing: '+file);
console.log(JSON.stringify({verified:true,sourceCommit:expected,url:new URL('v2.html',url).href,scripts:scripts.length,wasmBytes:bytes.length}));
