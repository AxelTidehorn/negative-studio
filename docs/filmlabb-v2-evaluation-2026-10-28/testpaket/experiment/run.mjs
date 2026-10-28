import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
import {chromium} from '../source/node_modules/playwright/index.mjs';
const root=path.resolve('.'), inventory=JSON.parse(fs.readFileSync('results/inventory.json'));
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(req.method==='POST'){const name=path.basename(u.pathname),out=fs.createWriteStream(path.join(root,'results',name));req.pipe(out);out.on('finish',()=>res.end('OK'));return;}
 const file=u.pathname.startsWith('/raw/')?path.join(root,'originals',path.basename(u.pathname)):path.join(root,'source/site',u.pathname==='/'?'v2-reference.html':u.pathname);try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.FILMLABB_CHROMIUM_BIN||'/tmp/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--js-flags=--max-old-space-size=4096']});
try{for(let n=0;n<inventory.length;n++){
 if(n===7)continue;if(process.argv[2]&&!process.argv[2].split(',').map(Number).includes(n))continue;const prefix=String(n).padStart(2,'0');if(fs.existsSync('results/'+prefix+'_decode.json'))continue;
 const context=await browser.newContext();const page=await context.newPage();page.on('pageerror',e=>console.log('PAGE',n,e.message));page.setDefaultTimeout(240000);await page.goto(url+'/v2-reference.html');await page.waitForFunction(()=>window.FILMLABB_REFERENCE);
 for(const name of ['v2-core','v2-render','v2-output','v2-base','v2-fast','v2-diagnostics'])await page.addScriptTag({url:url+'/'+name+'.js'});
 console.log('START',n,inventory[n].title);
 const result=await page.evaluate(async({f,prefix})=>{
 const file=new File([await(await fetch('/raw/'+f.id+'.RAF')).arrayBuffer()],f.title);const reference=await FILMLABB_REFERENCE.load(file);window.actualReference=reference;
 const save=async(name,data)=>{const r=await fetch('/save/'+prefix+'_'+name,{method:'POST',body:data});if(!r.ok)throw Error('SAVE_FAILED');};
 const im=reference.image,O=NSV2Output;const prepared=NSPixelKernel.prepare(im,reference.config),decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
 const g=O.geometry(im,reference.summary.exportCrop,0,1000);const out=await O.area(im,g,(r,g,b,p,i)=>{const q=prepared.pixel(i);for(let c=0;c<3;c++)p[c]=decode(q[c]);return p;});
 const cv=document.createElement('canvas');cv.width=g.width;cv.height=g.height;cv.getContext('2d').putImageData(new ImageData(out,g.width,g.height),0,0);await save('A.png',await new Promise(r=>cv.toBlob(r,'image/png')));
 // Actual main-app TIFF pixels, same header and exportRows as its TIFF writer.
 const fg=O.geometry(im,reference.summary.exportCrop),parts=[tiffHeader(fg.width,fg.height)];for(let y=0;y<fg.height;y+=8)parts.push(NSPixelKernel.exportRows(im,reference.config,fg,y,Math.min(8,fg.height-y),null,false,prepared));await save('A.tif',new Blob(parts));
 window.actualReference=null;
 const options={...NSRawInput.options('wide'),useAutoWb:false,noInterpolation:false,halfSize:false,userQual:3,useCameraMatrix:3,highlight:0,threshold:0};const raw=await NSRawDecoder.decode(file,'wide',{options});raw.im.encoding='linear';const source=NSConversionV2.source(raw.im,{revision:f.id,recipe:raw.provenance});
 const proposal=await NSV2Base.detect(raw.im,source);const probes=[];for(let y of [.01,.03,.5,.97,.99])for(let x of [.01,.03,.5,.97,.99]){const i=(Math.floor(y*raw.im.height)*raw.im.width+Math.floor(x*raw.im.width))*3;probes.push({x,y,rgb:Array.from(raw.im.data.slice(i,i+3))});}
 await save('source.f32',new Blob([raw.im.data]));
 return {reference:reference.summary,config:reference.config,source,rawMetadata:raw.meta,provenance:raw.provenance,inputDiagnostics:raw.im.inputDiagnostics4,proposal,probes};
 },{f:inventory[n],prefix});
 fs.writeFileSync('results/'+prefix+'_decode.json',JSON.stringify(result,null,2));console.log('DONE',n,result.source.width,result.source.height,result.proposal.measured);await context.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
