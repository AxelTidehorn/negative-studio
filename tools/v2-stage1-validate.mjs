/* Optional private-data check. Loopback HTTP only; no remote upload or image commit.
   Usage: node tools/v2-stage1-validate.mjs PACKAGE ORIGINALS OUTPUT [04,05,06,09,10]
   PACKAGE is the extracted 399-file evaluation, ORIGINALS contains ID.RAF files.
   Use ORIGINALS="-" for retained 80x80 source-grid checks only.
   Reuses saved A and manual regions; it does not rerun the old evaluation. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {ensureBuild} from './build-artifact.mjs';import {launchBrowser} from '../tests/helpers/browser-runtime.mjs';
const [packageArg,rawArg,outArg,selected='04,05,06,09,10']=process.argv.slice(2);
if(!packageArg||!rawArg||!outArg)throw Error('Usage: node tools/v2-stage1-validate.mjs PACKAGE ORIGINALS OUTPUT [04,05,06,09,10]');
const pack=path.resolve(packageArg),rawRoot=path.resolve(rawArg),outRoot=path.resolve(outArg),site=path.resolve('site');
if(outRoot===path.resolve('.')||outRoot.startsWith(path.resolve('.')+path.sep))throw Error('Keep private results outside the repository');fs.mkdirSync(outRoot,{recursive:true});
const read=name=>JSON.parse(fs.readFileSync(path.join(pack,'results',name))),inventory=read('inventory.json'),cases=selected.split(',').map(x=>Number(x)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const freezeFile=path.join(outRoot,'parameter-freeze.json');
for(const n of ['core','render'])await import('../src/conversion-v2/'+n+'.js');
if(fs.existsSync(freezeFile)){const frozen=JSON.parse(fs.readFileSync(freezeFile));if(JSON.stringify(frozen.color)!==JSON.stringify(NSV2Render.balanceRecipe)||JSON.stringify(frozen.tone)!==JSON.stringify(NSV2Render.exposureRecipe))throw Error('Parameters changed after freeze');}
else fs.writeFileSync(freezeFile,JSON.stringify({frozenAt:new Date().toISOString(),color:NSV2Render.balanceRecipe,tone:NSV2Render.exposureRecipe,validationCases:['09','10'],rule:'Freeze before viewing new validation outputs; reused prior cases, not unseen dataset'},null,2));
const freezeHash=hash(fs.readFileSync(freezeFile));
function coarseInsetReplay(a){
 const V=NSConversionV2,R=NSV2Render,size=Math.sqrt(a.samples.length),im={width:size,height:size,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:Float32Array.from(a.samples.flatMap(p=>p.j))},k=V.compile(V.source(im,{revision:'retained-grid',format:'SAVED_SOURCE_SAMPLES'}),a.base);
 const variants=[0,.02,.05].map(inset=>{const i=R.analyze(im,k,{analysisArea:{region:{x:inset,y:inset,w:1-2*inset,h:1-2*inset},status:'confirmed'}});return {insetEachSide:inset,EV:i.exposure,colorKind:i.colorCorrection.kind,reason:i.colorCorrection.reason,gains:i.colorCorrection.gains};});
 return {method:'Retained 80x80 source-point grid inside archived export crop; explicit analysis-area changes, not creative crop; no full-resolution sensitivity claim',variants,EVRange:Math.max(...variants.map(v=>v.EV))-Math.min(...variants.map(v=>v.EV))};
}

if(rawArg==='-'){
 const rows=cases.map(n=>({case:String(n).padStart(2,'0'),...coarseInsetReplay(read(String(n).padStart(2,'0')+'_analysis.json'))}));fs.writeFileSync(path.join(outRoot,'coarse-replay.json'),JSON.stringify(rows,null,2));console.log('PASS retained source-grid replay:',rows.length,'cases; no RAW decode');process.exit(0);
}
ensureBuild();
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&u.pathname.startsWith('/save/')){const name=path.basename(u.pathname);if(!/^\d\d_[\w.-]+$/.test(name)){res.writeHead(403).end();return;}const out=fs.createWriteStream(path.join(outRoot,name));req.pipe(out);out.on('finish',()=>res.end('OK'));out.on('error',()=>res.writeHead(500).end());return;}
 const root=u.pathname.startsWith('/raw/')?rawRoot:site,name=u.pathname.startsWith('/raw/')?path.basename(u.pathname):u.pathname==='/'?'v2.html':'.'+u.pathname,file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.html')?'text/html':'application/octet-stream');const stream=fs.createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const browser=await launchBrowser({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const n of cases){
 const prefix=String(n).padStart(2,'0'),item=inventory[n],filename=item.id+'.RAF',bytes=fs.readFileSync(path.join(rawRoot,filename));if(item.sha256&&hash(bytes)!==item.sha256)throw Error('RAF hash mismatch: '+prefix);
 const analysis=read(prefix+'_analysis.json'),decode=read(prefix+'_decode.json'),context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(300000);page.on('pageerror',e=>console.error('PAGE',prefix,e.message));
 await page.goto(url+'/v2.html');for(const name of ['raw-input','raw-decoder','film-base-measurement','v2-base','v2-fast','srgb-profile','tiff-header','tiff-codec'])await page.addScriptTag({url:url+'/'+name+'.js'});
 console.log('START',prefix);
 const result=await page.evaluate(async({prefix,filename,analysis,decode})=>{
  const V=NSConversionV2,R=NSV2Render,O=NSV2Output,F=NSV2Fast,save=async(name,data)=>{const r=await fetch('/save/'+prefix+'_'+name,{method:'POST',body:data});if(!r.ok)throw Error('SAVE_FAILED');};
  const started=performance.now(),file=new File([await(await fetch('/raw/'+filename)).arrayBuffer()],'private.RAF'),options={...NSRawInput.options('wide'),useAutoWb:false,noInterpolation:false,halfSize:false,userQual:3,useCameraMatrix:3,highlight:0,threshold:0},raw=await NSRawDecoder.decode(file,'wide',{options});raw.im.encoding='linear';const im=raw.im,source=V.source(im,{revision:'stage1-'+prefix,recipe:{decoder:'libraw-wasm',version:'1.6.0',options}}),ctx=V.capture({session:'stage1',recipe:source.recipe}),measurement=NSV2Base.measure(im,source,[analysis.measurement.region]),base=V.accept(measurement,source,ctx),k=V.compile(source,base),crop=decode.reference.exportCrop,area={region:crop,status:'estimated',method:'application-frame',confidence:decode.config.opts.cropConfidence},analyzed=R.analyzeWithMask(im,k,{analysisArea:area}),intent=analyzed.intent;
  const decodeMs=performance.now()-started,identity={...intent,colorCorrection:{version:1,kind:'identity'}},old={...identity,exposure:analysis.intent.exposure},g=O.geometry(im,crop,0,1000),variants={old,tone:identity,balanced:intent},metrics={};
  for(const [name,intent]of Object.entries(variants)){
   const f=F.compile(k,intent),pixels=await O.area(im,g,f.pixel),cv=document.createElement('canvas');cv.width=g.width;cv.height=g.height;cv.getContext('2d').putImageData(new ImageData(pixels,g.width,g.height),0,0);await save(name+'.png',await new Promise(r=>cv.toBlob(r,'image/png')));const ys=[];for(let j=0;j<pixels.length;j+=4){const q=Array.from(pixels.subarray(j,j+3),v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);ys.push(q[0]*.2126+q[1]*.7152+q[2]*.0722);}metrics[name]={exposureEV:intent.exposure,outputMedianY:R.quantile(ys,.5)};cv.width=cv.height=0;
  }
  const diagnostic=NSV2Diagnostics.diagnostic(im,k,intent,{mask:analyzed.mask});await save('diagnostic.json',JSON.stringify(diagnostic,null,2));
  // Only case 04 needs another full-size export. The worker is already covered
  // separately; this uses its same scalar pixel and bounded stripe primitives.
  let exports=null;
  if(prefix==='04'){
   const fg=O.geometry(im,crop),f=F.compile(k,intent),parts=[tiffHeader(fg.width,fg.height)],cv=new OffscreenCanvas(fg.width,fg.height),cx=cv.getContext('2d',{colorSpace:'srgb'});let maxError=0;
   for(let y=0;y<fg.height;y+=8){const count=Math.min(8,fg.height-y),t=O.fastRows(im,fg,y,count,f.pixel,16),rgb8=O.fastRows(im,fg,y,count,f.pixel);parts.push(t);cx.putImageData(new ImageData(rgb8,fg.width,count),0,y);}
   const tiff=new Blob(parts,{type:'image/tiff'}),jpeg=await cv.convertToBlob({type:'image/jpeg',quality:.95});await save('full.tif',tiff);await save('full.jpg',jpeg);
   const decoded=NSTiff.decodeSync(await tiff.arrayBuffer());
   for(const [x,y]of [[17,23],[200,400],[Math.floor(fg.width/2),Math.floor(fg.height/2)],[fg.width-3,fg.height-3]]){const [sx,sy]=fg.at(x,y),expected=O.pixel(im,k,intent,sx,sy).map(v=>Math.round(R.encode(v)*65535)),index=(y*fg.width+x)*3;for(let c=0;c<3;c++)maxError=Math.max(maxError,Math.abs(decoded.data[index+c]-expected[c]));}
   if(maxError>1||decoded.bits!==16||decoded.icc.length!==NSSRGBProfile.length||decoded.icc.some((v,i)=>v!==NSSRGBProfile[i]))throw Error('EXPORT_ORACLE_MISMATCH');exports={width:decoded.width,height:decoded.height,tiffBits:decoded.bits,iccBytes:decoded.icc.length,tiffBytes:tiff.size,jpegBytes:jpeg.size,maxRGB16Error:maxError,stripeBytes:fg.width*8*6};cv.width=cv.height=0;
  }
  // Frozen intent: creative geometry cannot change technical or photographic analysis.
  const signature=JSON.stringify(intent),fg=O.geometry(im,{x:.2,y:.2,w:.5,h:.5},90,80);await O.area(im,fg,F.compile(k,intent).pixel);if(JSON.stringify(intent)!==signature)throw Error('GEOMETRY_CHANGED_INTENT');
  return {schema:'filmlabb.stage1-validation',version:1,case:prefix,source:{width:im.width,height:im.height,bytes:im.data.byteLength},baseDifference:base.rgb.map((v,c)=>v-analysis.base.rgb[c]),analysisArea:intent.analysis.area,exposure:intent.analysis.exposure,color:intent.colorCorrection,metrics,exports,decodeAndAnalysisMs:decodeMs,totalMs:performance.now()-started,calibrationId:k.calibration.id};
 },{prefix,filename,analysis,decode});
 result.coarseFrameInsetReplay=coarseInsetReplay(analysis);result.freezeSha256=freezeHash;fs.writeFileSync(path.join(outRoot,prefix+'_validation.json'),JSON.stringify(result,null,2));console.log('DONE',prefix,JSON.stringify({ev:result.exposure.appliedEV,color:result.color.kind,reason:result.color.reason,baseDifference:result.baseDifference,seconds:result.totalMs/1000}));await context.close();
}}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
