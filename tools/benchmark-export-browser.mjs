/* Actual app TIFF16/PNG16 exports. Synthetic source, no camera/RAW timing claim.
   node tools/benchmark-export-browser.mjs REPO OUTPUT [WIDTH HEIGHT REPEATS]
   Run serially on baseline/candidate, not alongside other benchmarks. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import os from 'node:os';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import {launchBrowser} from '../tests/helpers/browser-runtime.mjs';import {decodePng} from '../tests/helpers/png.mjs';import '../src/import/tiff-codec.js';
const [repoArg,outArg,w='1024',h='768',r='3']=process.argv.slice(2),repo=path.resolve(repoArg),output=path.resolve(outArg),width=+w,height=+h,repeats=+r;
execFileSync(process.execPath,['tools/build-artifact.mjs'],{cwd:repo,stdio:'ignore'});
const root=path.join(repo,'site'),server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+(req.url==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.wasm')?'application/wasm':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await launchBrowser({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']}),report={kind:'actual Chromium application exports from synthetic linear Rec.2020; no RAW decode or 26/40-MP projection',repo,build:JSON.parse(fs.readFileSync(path.join(repo,'site/build-info.json'))),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),node:process.version,cpu:os.cpus()[0].model,platform:[os.platform(),os.release(),os.arch()].join(' '),width,height,repeats,browser:browser.version(),cases:[]};
if(process.argv.includes('--resume')&&fs.existsSync(output))report.cases=JSON.parse(fs.readFileSync(output)).cases;
try{
 const p=await browser.newPage({serviceWorkers:'block',viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/');
 const cdp=await p.context().newCDPSession(p),browserCdp=await browser.newBrowserCDPSession();
 const rss=async()=>{const {processInfo}=await browserCdp.send('SystemInfo.getProcessInfo');return processInfo.reduce((sum,p)=>{try{return sum+Number(fs.readFileSync('/proc/'+p.id+'/status','utf8').match(/^VmRSS:\s+(\d+)/m)[1])*1024;}catch{return sum;}},0);};
 const init=async(W,H)=>p.evaluate(({W,H})=>{
  render=()=>{};scheduleRender=()=>{};const data=new Float32Array(W*H*3),base=[.72,.38,.18];
  for(let i=0;i<W*H;i++){const x=i%W,y=Math.floor(i/W),d=.2+1.3*((x*17+y*31)%103)/102;for(let c=0;c<3;c++)data[i*3+c]=base[c]*10**(-d-(c===0?.03:c===2?.08:0));}
  working={width:W,height:H,channels:3,bits:16,data,scale:1,encoding:'linear',colorSpace:'rec2020'};workingPreview=NSV2Platform.preview(working,320);src=new ImageData(320,240);if(typeof previewSrc!=='undefined')previewSrc=src;sourceInfo={encoding:'linear',colorSpace:'rec2020',label:'synthetic benchmark',domain:'synthetic-benchmark'};state={...defaultState(),engine:'v2',conversionVersion:2,noBase:true,};applyFrameSelection(NSFrameSelection.create(NSFrameSelection.rectangle({x:0,y:0,w:1,h:1}),{status:'confirmed'}));roll=[{file:new File([],'synthetic.dng'),settings:{...state},geometry:NSGeometry.create(),selected:true}];activeFrame=0;rollLoading=false;rollShared.look={id:'film.kodak-gold-200',strength:.7};rollShared.cropExportToFrame=false;analyzeLevels();downloadBlob=b=>globalThis.benchBlob=b;
  const original=globalThis.benchOriginalPresentation??=NSPresentation;NSPresentation={...original,tiff(...args){const began=performance.now(),result=original.tiff(...args);globalThis.benchStripeMax=Math.max(globalThis.benchStripeMax||0,performance.now()-began);return result;}};
 },{W,H});
 for(const [name,format,fine,quarter,crop,large,cancel]of [['tiff-direct','tiff',0,0,false,false,false],['tiff-fine','tiff',2.3,0,false,false,false],['tiff-composed','tiff',-3.4,1,true,false,false],['png16-fine','png16',2.3,0,false,false,false],['tiff-large','tiff',0,0,false,true,false],['cancel-fine','tiff',2.3,0,false,true,true]]){
  const selected=process.argv.find(a=>a.startsWith('--cases='))?.slice(8).split(',');if(selected&&!selected.includes(name)||report.cases.some(c=>c.name===name))continue;const W=large?Math.max(3000,width*2):width,H=large?Math.max(2000,height*2):height;await init(W,H);const runs=[];
  for(let run=0;run<(cancel?2:large?2:repeats);run++){
   await cdp.send('HeapProfiler.collectGarbage');const heapBefore=await cdp.send('Runtime.getHeapUsage'),rssBefore=await rss();let rssPeak=rssBefore;const timer=setInterval(()=>{rss().then(v=>rssPeak=Math.max(v,rssPeak)).catch(()=>{});},50);
   let result;
   try{result=await p.evaluate(async({format,fine,quarter,crop,cancel})=>{
    state.rotation=quarter*90;setQueueCropExportToFrame(crop);applyFrameSelection(NSFrameSelection.create(NSFrameSelection.rectangle(crop?{x:.03,y:.04,w:.93,h:.91}:{x:0,y:0,w:1,h:1}),{status:'confirmed'}));roll[0].geometry=NSGeometry.create(quarter*90);roll[0].geometry.rotation.fineDegrees=fine;if(crop)roll[0].geometry.compositionCrop={cx:.02,cy:-.03,w:.65,h:.48};analyzeLevels();
    benchBlob=null;benchStripeMax=0;const gaps=[];let last=performance.now(),ticks=0,cancelAt=null;const pulse=setInterval(()=>{const now=performance.now();gaps.push(now-last);last=now;ticks++;},10),started=performance.now();let t;
    if(cancel)t=setTimeout(()=>{cancelAt=performance.now();$('cancelExport').click();},50);
    $('exportFormat').value=format;await $('export').onclick();const ms=performance.now()-started;clearInterval(pulse);clearTimeout(t);gaps.push(performance.now()-last);
    return {ms,ticks,maxTimerGapMs:Math.max(...gaps),cancelTimerDelayMs:cancelAt===null?null:cancelAt-started-50,cancelFinishDelayMs:cancel?ms-50:null,downloaded:!!benchBlob,bytes:benchBlob?.size??0,status:$('status').textContent,exportBusy,active:FILMLABB_EXPORT.snapshot().active,sourceBytes:working.data.byteLength,sourceFirst:working.data[0],maxStripeMs:benchStripeMax,metrics:globalThis.FILMLABB_RGB16?.snapshot()||null};
   },{format,fine,quarter,crop,cancel});}finally{clearInterval(timer);}
   result.rssBefore=rssBefore;result.rssPeak=rssPeak;result.heapBefore=heapBefore;result.heapAfter=await cdp.send('Runtime.getHeapUsage');
   assert.equal(result.exportBusy,false);assert.equal(result.active,false);assert.equal(result.downloaded,!cancel);if(cancel)assert.match(result.status,/avbruten|avbröts|cancel/i);
   if(!cancel){const blocks=[];for(let at=0;at<result.bytes;at+=1048576)blocks.push(Buffer.from(await p.evaluate(async at=>{const b=new Uint8Array(await benchBlob.slice(at,at+1048576).arrayBuffer());let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);},at),'base64'));const bytes=Buffer.concat(blocks),im=format==='tiff'?NSTiff.decodeSync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)):decodePng(bytes);assert.equal(im.bits,16);assert.ok(im.data.some(v=>v%257!==0));result.output=[im.width,im.height];result.pixelSHA256=createHash('sha256').update(Buffer.from(im.data.buffer,im.data.byteOffset,im.data.byteLength)).digest('hex');result.colorMetadata=format==='tiff'?!!im.icc:im.srgb;assert.ok(result.colorMetadata);if(runs.length)assert.equal(result.pixelSHA256,runs[0].pixelSHA256);}
   await p.evaluate(()=>benchBlob=null);runs.push(result);console.log(name,run,result.ms.toFixed(1)+'ms',result.maxTimerGapMs.toFixed(1)+'ms timer gap');
  }
  report.cases.push({name,width:W,height:H,runs});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
