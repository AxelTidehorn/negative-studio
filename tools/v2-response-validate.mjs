/* Targeted private RAF comparison. No images or RAW data leave localhost.
   node tools/v2-response-validate.mjs PACKAGE ORIGINALS OUTPUT [04,05,06,09,10] [--export04] [--algorithm3]
   PACKAGE: extracted 399-file evaluation; ORIGINALS: inventory-ID.RAF files.
   Saved FILMLABB A is reused separately: its protected-sRGB decoder and creative
   settings differ, so it is a photographic reference, not a colorimetric target.
   This checks only the selected cases; it does not rerun the historical campaign. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import crypto from 'node:crypto';
import {ensureBuild} from './build-artifact.mjs';
import {launchBrowser} from '../tests/helpers/browser-runtime.mjs';
const [packageArg,rawArg,outArg,...args]=process.argv.slice(2);
if(!packageArg||!rawArg||!outArg||args.some(x=>x.startsWith('--')&&!['--export04','--algorithm3'].includes(x)))throw Error('Usage: node tools/v2-response-validate.mjs PACKAGE ORIGINALS OUTPUT [04,05,06,09,10] [--export04] [--algorithm3]');
const algorithm3=args.includes('--algorithm3'),fullExport04=args.includes('--export04'),selected=(args.find(x=>!x.startsWith('--'))||'04,05,06,09,10').split(',');
if(selected.some(x=>!['04','05','06','09','10'].includes(x))||new Set(selected).size!==selected.length)throw Error('Select unique cases from 04, 05, 06, 09, 10');
const repo=fs.realpathSync('.'),site=path.join(repo,'site'),pack=path.resolve(packageArg,'results'),rawRoot=fs.realpathSync(rawArg),outRoot=path.resolve(outArg),read=name=>JSON.parse(fs.readFileSync(path.join(pack,name))),inventory=read('inventory.json'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(outRoot,{recursive:true});const actualOut=fs.realpathSync(outRoot);
if(actualOut===repo||actualOut.startsWith(repo+path.sep))throw Error('Private output must remain outside the repository');
for(const name of ['core','render'])await import('../src/conversion-v2/'+name+'.js');
const candidate={calibration:NSConversionV2.latestPrior,tone:NSV2Render.exposureRecipeFor(NSConversionV2.latestPrior),color:algorithm3?NSV2Render.balanceRecipeFor(3):NSV2Render.balanceRecipe,...(algorithm3?{algorithmVersion:3,output:NSV2Render.outputRecipe}:{})},freezePath=path.join(outRoot,'parameter-freeze.json');
if(!candidate.calibration)throw Error('LATEST_PRIOR_MISSING');
// Freeze before decoding/viewing any selected controls. All cases were used
// historically; withholding them here does not make an unseen validation dataset.
if(!fs.existsSync(freezePath))fs.writeFileSync(freezePath,JSON.stringify({schema:'filmlabb.private-quality-freeze',version:1,frozenAt:new Date().toISOString(),development:algorithm3?['05','09']:['04','05','06'],validation:algorithm3?['04','06','10']:['09','10'],caveat:algorithm3?'04/06/10 were held back from tuning this candidate; all cases historically seen, not an unseen dataset':'09/10 were withheld from parameter tuning in this task; historically seen, not an unseen dataset',...candidate},null,2));
const frozen=JSON.parse(fs.readFileSync(freezePath)),freezeSha256=sha(fs.readFileSync(freezePath));
for(const key of ['calibration','tone','color',...(algorithm3?['algorithmVersion','output']:[])])if(JSON.stringify(frozen[key])!==JSON.stringify(candidate[key]))throw Error('FROZEN_PARAMETERS_CHANGED: '+key);
ensureBuild();
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');
 if(req.method==='POST'&&u.pathname.startsWith('/save/')){const name=path.basename(u.pathname);if(!/^\d\d_[\w.-]+$/.test(name)){res.writeHead(403).end();return;}const out=fs.createWriteStream(path.join(outRoot,name));req.pipe(out);out.on('finish',()=>res.end('OK'));out.on('error',()=>res.writeHead(500).end());return;}
 const root=u.pathname.startsWith('/raw/')?rawRoot:site,name=u.pathname.startsWith('/raw/')?path.basename(u.pathname):u.pathname==='/'?'v2.html':'.'+u.pathname,file=path.resolve(root,name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.html')?'text/html':'application/octet-stream');const stream=fs.createReadStream(file);stream.on('error',()=>res.writeHead(404).end());stream.pipe(res);
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
let browser;
try{browser=await launchBrowser({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});for(const prefix of selected){
 const item=inventory[Number(prefix)];if(typeof item?.id!=='string'||!/^[A-Za-z0-9_-]+$/.test(item.id))throw Error('Inventory ID invalid: '+prefix);
 const filename=item.id+'.RAF',original=fs.readFileSync(path.join(rawRoot,filename));if(item.sha256&&sha(original)!==item.sha256)throw Error('RAF hash mismatch: '+prefix);
 const analysis=read(prefix+'_analysis.json'),decode=read(prefix+'_decode.json'),context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(300000);page.on('pageerror',e=>console.error('PAGE',prefix,e.message));
 await page.goto(url+'/v2.html');for(const name of ['raw-input','raw-decoder','film-base-measurement','v2-base','v2-fast','srgb-profile','tiff-header','tiff-codec'])await page.addScriptTag({url:url+'/'+name+'.js'});
 console.log('START',prefix);
 const result=await page.evaluate(async({prefix,filename,analysis,decode,fullExport04,frozen,algorithm3})=>{
  const V=NSConversionV2,R=NSV2Render,O=NSV2Output,F=NSV2Fast,save=async(name,data)=>{const r=await fetch('/save/'+prefix+'_'+name,{method:'POST',body:data});if(!r.ok)throw Error('SAVE_FAILED');},json=(name,data)=>save(name,JSON.stringify(data,null,2));
  if(frozen&&(JSON.stringify(V.latestPrior)!==JSON.stringify(frozen.calibration)||JSON.stringify(R.exposureRecipeFor(V.latestPrior))!==JSON.stringify(frozen.tone)||JSON.stringify(algorithm3?R.balanceRecipeFor(3):R.balanceRecipe)!==JSON.stringify(frozen.color)||algorithm3&&(frozen.algorithmVersion!==3||JSON.stringify(R.outputRecipe)!==JSON.stringify(frozen.output))))throw Error('FROZEN_PARAMETERS_CHANGED');
  const started=performance.now(),file=new File([await(await fetch('/raw/'+filename)).arrayBuffer()],'private.RAF'),options={...NSRawInput.options('wide'),useAutoWb:false,noInterpolation:false,halfSize:false,userQual:3,useCameraMatrix:3,highlight:0,threshold:0},raw=await NSRawDecoder.decode(file,'wide',{options});raw.im.encoding='linear';const im=raw.im,source=V.source(im,{revision:'quality-'+prefix,recipe:{decoder:'libraw-wasm',version:'1.6.0',options}}),ctx=V.capture({session:'quality-response',recipe:source.recipe}),measurement=NSV2Base.measure(im,source,[analysis.measurement.region]),base=V.accept(measurement,source,ctx),crop=decode.reference.exportCrop,area={region:crop,status:'estimated',method:'application-frame',confidence:decode.config.opts.cropConfidence},g=O.geometry(im,crop,0,1000),decodeMs=performance.now()-started;
  const variants={},metrics={};
   for(const [name,calibration,algorithm]of (algorithm3?[['prior',V.latestPrior,2],['candidate',V.latestPrior,3]]:[['prior',V.prior,null],['candidate',V.latestPrior,null]])){
    const k=V.compile(source,base,calibration),analyzed=R.analyzeWithMask(im,k,{analysisArea:area,...(algorithm?{algorithmVersion:algorithm}:{})}),intent=analyzed.intent;
    variants[name]={k,intent,mask:analyzed.mask};
    if(name==='candidate')variants.candidate_identity={k,intent:{...intent,colorCorrection:{version:1,kind:'identity'}},mask:analyzed.mask};
   }
   for(const [name,{k,intent,mask}]of Object.entries(variants)){
    const f=F.compile(k,intent),pixels=await O.area(im,g,f.pixel,8,{tick:async(y,total)=>{if(y%256===0)await new Promise(r=>setTimeout(r,0));}}),cv=document.createElement('canvas');cv.width=g.width;cv.height=g.height;cv.getContext('2d').putImageData(new ImageData(pixels,g.width,g.height),0,0);await save(name+'.png',await new Promise(r=>cv.toBlob(r,'image/png')));
    const ys=[],channels=[[],[],[]];for(let j=0;j<pixels.length;j+=4){const q=Array.from(pixels.subarray(j,j+3),v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);ys.push(q[0]*.2126+q[1]*.7152+q[2]*.0722);for(let c=0;c<3;c++)channels[c].push(q[c]);}
    const relative={ '04':{x:.42,y:.40,w:.15,h:.15},'05':{x:.18,y:.16,w:.14,h:.14},'06':{x:.29,y:.42,w:.14,h:.13} }[prefix];
    if(relative&&name!=='candidate_identity'){
     const detailCrop={x:crop.x+relative.x*crop.w,y:crop.y+relative.y*crop.h,w:relative.w*crop.w,h:relative.h*crop.h},dg=O.geometry(im,detailCrop),detail=await O.area(im,dg,f.pixel),dc=document.createElement('canvas');dc.width=dg.width;dc.height=dg.height;dc.getContext('2d').putImageData(new ImageData(detail,dg.width,dg.height),0,0);await save(name+'_detail.png',await new Promise(r=>dc.toBlob(r,'image/png')));dc.width=dc.height=0;
    }
    const quantiles=[.01,.05,.5,.6,.95,.99],percentiles=values=>{values.sort((a,b)=>a-b);return quantiles.map(q=>values[Math.floor((values.length-1)*q)]);};
    metrics[name]={...(algorithm3?{algorithmVersion:intent.algorithmVersion||2}:{}),calibrationId:k.calibration.id,calibrationVersion:k.calibration.version,exposure:intent.analysis.exposure,color:intent.colorCorrection,quantiles,outputLuminance:percentiles(ys),outputChannels:channels.map(percentiles)};
    await json(name+'_diagnostic.json',NSV2Diagnostics.diagnostic(im,k,intent,{mask}));cv.width=cv.height=0;
   }
  let exports=null;
  if(fullExport04&&prefix==='04'){
   const {k,intent}=variants.candidate,fg=O.geometry(im,crop),f=F.compile(k,intent),parts=[tiffHeader(fg.width,fg.height)],cv=new OffscreenCanvas(fg.width,fg.height),cx=cv.getContext('2d',{colorSpace:'srgb'});let maxRGB16Error=0;
   for(let y=0;y<fg.height;y+=8){const count=Math.min(8,fg.height-y);parts.push(O.fastRows(im,fg,y,count,f.pixel,16));cx.putImageData(new ImageData(O.fastRows(im,fg,y,count,f.pixel),fg.width,count),0,y);if(y%128===0)await new Promise(r=>setTimeout(r,0));}
   const tiff=new Blob(parts,{type:'image/tiff'}),jpeg=await cv.convertToBlob({type:'image/jpeg',quality:.95});await save('candidate_full.tif',tiff);await save('candidate_full.jpg',jpeg);const decoded=NSTiff.decodeSync(await tiff.arrayBuffer());
   for(const [x,y]of [[17,23],[200,400],[Math.floor(fg.width/2),Math.floor(fg.height/2)],[fg.width-3,fg.height-3]]){const [sx,sy]=fg.at(x,y),expected=O.pixel(im,k,intent,sx,sy).map(v=>Math.round(R.encode(v)*65535)),index=(y*fg.width+x)*3;for(let c=0;c<3;c++)maxRGB16Error=Math.max(maxRGB16Error,Math.abs(decoded.data[index+c]-expected[c]));}
   if(maxRGB16Error>1||decoded.bits!==16||decoded.icc.length!==NSSRGBProfile.length||decoded.icc.some((v,i)=>v!==NSSRGBProfile[i]))throw Error('EXPORT_ORACLE_MISMATCH');exports={width:decoded.width,height:decoded.height,tiffBits:decoded.bits,iccBytes:decoded.icc.length,tiffBytes:tiff.size,jpegBytes:jpeg.size,maxRGB16Error,stripeBytes:fg.width*8*6,jpegScope:'Browser Canvas JPEG from exact V2 scalar path; main export ICC/header is separately exercised by production tests'};cv.width=cv.height=0;
  }
  return {schema:'filmlabb.v2-response-validation',version:1,case:prefix,source:{width:im.width,height:im.height,bytes:im.data.byteLength},baseDifference:base.rgb.map((v,c)=>v-analysis.base.rgb[c]),analysisArea:area,crop,output:{width:g.width,height:g.height},metrics,exports,decodeMs,totalMs:performance.now()-started};
 },{prefix,filename,analysis,decode,fullExport04,frozen,algorithm3});
 result.originalSha256=item.sha256;result.freezeSha256=freezeSha256;fs.writeFileSync(path.join(outRoot,prefix+'_validation.json'),JSON.stringify(result,null,2));
 const savedA=path.join(pack,prefix+'_A.png');if(fs.existsSync(savedA))fs.copyFileSync(savedA,path.join(outRoot,prefix+'_saved_A.png'));
 console.log('DONE',prefix,JSON.stringify({baseDifference:result.baseDifference,seconds:result.totalMs/1000,EV:[result.metrics.prior.exposure.appliedEV,result.metrics.candidate.exposure.appliedEV],exports:result.exports}));await context.close();
}
const figures=selected.map(c=>'<section><h2>Case '+c+'</h2><div>'+[['saved_A','Saved FILMLABB A (different source domain/settings)'],['prior',algorithm3?'Current V2 / algorithm2':'Previous V2 / prior1'],['candidate','Candidate automatic positive'],['candidate_identity','Candidate / identity positive balance']].map(([file,label])=>'<figure><img src="'+c+'_'+file+'.png" alt="'+label+'"><figcaption>'+label+'</figcaption></figure>').join('')+'</div></section>').join('');
fs.writeFileSync(path.join(outRoot,'comparison.html'),'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FILMLABB private V2 comparison</title><style>body{background:#181818;color:#eee;font:16px system-ui;margin:1rem}section div{display:flex;gap:1rem;flex-wrap:wrap}figure{margin:0;flex:1 1 240px;max-width:600px}img{max-width:100%;height:auto}figcaption{margin:.5rem 0}</style><h1>Private V2 comparison</h1><p>Identical linear Rec.2020 source and measured base for the three V2 outputs. Source-area filtering after conversion. Saved A uses different RAW/creative settings and is not a colorimetric target. '+(algorithm3?'Images04/06/10 were held back from tuning this candidate; all cases historically seen.':'Images09/10 were held back for this task but were historically seen.')+' No night series.</p><p>Frozen parameters SHA256: '+freezeSha256+'</p>'+figures);
}finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
