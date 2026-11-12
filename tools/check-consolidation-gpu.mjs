/* Same-browser frozen-main/candidate GPU check. No CPU oracle substitution.
   node tools/check-consolidation-gpu.mjs BEFORE AFTER OUTPUT */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import zlib from 'node:zlib';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const [before,after,output]=process.argv.slice(2);if(!output)throw Error('Specify two built checkouts and output');
const {chromium}=createRequire(path.resolve(after,'package.json'))('playwright');
const reference=JSON.parse(fs.readFileSync(path.join(after,'tests/fixtures/consolidation/oracle.json')));
const images={};for(const space of ['srgb','rec2020'])images[space]={width:67,height:45,data:Array.from({length:67*45*3},(_,i)=>Math.fround(i<36?[0,1/65535,.0001,.001,.01,.18,.5,1,.9999,1e-8,.7,.07][i%12]:.005+((i*673+71)%65536)/65535*.89)),channels:3,encoding:'linear',scale:1,colorSpace:space};
for(const id of ['8983','9235']){const meta=JSON.parse(fs.readFileSync(path.join(after,`tests/fixtures/frame-real/dsf${id}.json`))),b=zlib.gunzipSync(fs.readFileSync(path.join(after,`tests/fixtures/frame-real/dsf${id}.f32.gz`)));images[id]={...meta,data:Array.from(new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)))};}
const browser=await chromium.launch({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']}),results=[];
try{for(const repo of [before,after]){
 const root=path.resolve(repo,'site'),server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const context=await browser.newContext({serviceWorkers:'block'}),p=await context.newPage();p.setDefaultTimeout(240000);
 try{await p.goto('http://127.0.0.1:'+server.address().port+'/');const result=await p.evaluate(async({images,setups})=>{
  for(const im of Object.values(images))im.data=Float32Array.from(im.data);
  const gpu=NSGpuPreview.create(document.createElement('canvas')),gl=gpu.context,extension=gl.getExtension('WEBGL_debug_renderer_info'),renderer=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),rows=[];
  const digest=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength)))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const profiles=['neutral','film.kodak-gold-200','film.kodak-ektar-100','film.fuji-pro-400h','film.kodak-portra-400','creative.backstreet','creative.afterglow','creative.pale-static','creative.redline','mono.neutral'];
  try{for(const [setup,s] of setups.entries())for(const profile of profiles)for(const strength of [0,.35,.7,1])for(const edit of [false,true]){
   const c=structuredClone(s.config),im=images[s.name];c.look={id:profile==='mono.neutral'?'neutral':profile,strength};c.monochrome=profile==='mono.neutral';if(edit)Object.assign(c.opts,{exposure:.35,contrast:1.18,gamma:.9,shadows:21,highlights:-17,temperature:8,tint:-5,saturation:1.2,vibrance:30});
   if(!NSGpuPreview.supports(c))throw Error('Unsupported active GPU configuration');gpu.draw(im,c,'positive',67,setup);
   const actual=gpu.read();if(actual.width!==67||actual.height!==45)throw Error('Unexpected GPU readback size');const row={setup,source:s.name,engine:c.kind,color:c.opts.colorMode4,tone:c.opts.toneMode4,profile,strength,edit,rgba8:await digest(actual.data)};
   if(c.kind==='v2'){const positive=gpu.readPositive();if(!positive?.data)throw Error('Missing Float32 V2 positive');row.positiveFloat32=await digest(positive.data);}rows.push(row);
  }}finally{gpu.destroy();}
  return {build:NSBuildInfo,renderer,rows};
 },{images,setups:reference.setups});results.push(result);console.log(repo,result.rows.length,'GPU cases');}
 finally{await context.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
const mismatches=[];for(let i=0;i<results[0].rows.length;i++){const a=results[0].rows[i],b=results[1].rows[i];if(JSON.stringify(a)!==JSON.stringify(b))mismatches.push({before:a,after:b});}
fs.writeFileSync(output,JSON.stringify({kind:'Same Chromium software-GPU rendering, frozen main vs candidate. 67x45 final RGBA8 readbacks; V2 Float32 technical positives retain bounded source dimensions. Synthetic and bounded actual RAW inputs, not full-resolution exports. Identical frozen pre-consolidation configurations are supplied to both apps.',browser:browser.version(),baselineBuild:results[0].build,candidateBuild:results[1].build,renderer:results.map(r=>r.renderer),cases:results[0].rows.length,mismatches,rows:results[1].rows},null,2)+'\n');assert.equal(mismatches.length,0,'GPU before/after hashes differ');console.log('PASS exact GPU RGBA8 and V2 Float32 positives',results[0].rows.length);
}finally{await browser.close();}
