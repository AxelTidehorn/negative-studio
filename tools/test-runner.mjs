import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import os from 'node:os';import {spawn} from 'node:child_process';import {performance} from 'node:perf_hooks';
import {nodeSuites,browserTests} from '../tests/suites.mjs';import {browserExecutable} from '../tests/helpers/browser-runtime.mjs';
import {ensureBuild} from './build-artifact.mjs';
const level=process.argv[2]||'fast';if(!['fast','integration','full','browser'].includes(level))throw Error('Unknown test level: '+level);
const engineIndex=process.argv.indexOf('--engine'),engine=engineIndex<0?'all':process.argv[engineIndex+1];if(!['all','curve3','density3','matrix3','log39','calibrated4'].includes(engine))throw Error('Unknown engine: '+engine);
const start=performance.now(),rows=[],env={...process.env,FILMLABB_TEST_ENGINE:engine},report={level,engine,node:process.version,jobs:level==='full'?Math.min(2,os.availableParallelism()):1,tests:rows};let failures=0;
fs.mkdirSync('.cache',{recursive:true});
function run(file){return new Promise(resolve=>{const began=performance.now(),log=fs.openSync('.cache/'+file.replaceAll('/','_')+'.log','w'),child=spawn(process.execPath,[file],{env,stdio:['ignore',log,log]});let error;child.on('error',e=>error=e.message);child.on('close',code=>{fs.closeSync(log);const row={file,ms:performance.now()-began,status:code,error};rows.push(row);if(code!==0){failures++;console.error('FAIL',file,fs.readFileSync('.cache/'+file.replaceAll('/','_')+'.log','utf8'));}else console.log('PASS',file,Math.round(row.ms)+'ms');resolve();});});}
async function pool(files,jobs){let next=0;await Promise.all(Array.from({length:jobs},async()=>{while(next<files.length)await run(files[next++]);}));}
const fast=['ui-controls.mjs','conversion3-numeric.mjs','conversion3-reference.mjs','conversion3-neutral.mjs','test-infrastructure.mjs','ui-i18n.mjs'];
const integration=['ui-controls.mjs','conversion3-numeric.mjs','conversion3-reference.mjs','conversion3-neutral.mjs','conversion3-integration.mjs'];
const files=level==='full'?Object.values(nodeSuites).flat():level==='browser'?[]:level==='fast'?fast:integration;
await pool(files.map(f=>'tests/'+f),level==='full'?report.jobs:1);
if(failures){console.error('Fast/Node checks failed; browser/build not started.');}else if(level!=='fast'){
 if(level==='full')await run('tests/stability-build.mjs');
 if(!failures){report.build=ensureBuild();const {chromium}=await import(process.env.FILMLABB_PLAYWRIGHT_MODULE||'playwright');let browserServer,server;
 try{
  browserServer=await chromium.launchServer({headless:true,executablePath:browserExecutable(),args:['--no-sandbox','--enable-unsafe-swiftshader']});env.FILMLABB_BROWSER_WS=browserServer.wsEndpoint();report.browserProcesses=1;
  const root=path.resolve('site'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png'};
  server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));env.FILMLABB_SITE_URL='http://127.0.0.1:'+server.address().port+'/';
  const selected=level==='integration'?['conversion3-browser.mjs']:browserTests;
  for(const file of selected)await run('tests/'+file);
 }catch(e){failures++;report.error=e.message;console.error(e);}finally{if(browserServer)await browserServer.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
 }
}
report.ms=performance.now()-start;report.failures=failures;fs.writeFileSync('.cache/test-'+level+'.json',JSON.stringify(report,null,2));console.log(`${rows.length-failures}/${rows.length} groups passed; ${level}: ${(report.ms/1000).toFixed(2)}s`);if(failures)process.exitCode=1;
