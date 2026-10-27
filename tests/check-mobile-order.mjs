import {launchBrowser} from './helpers/browser-runtime.mjs';
import {readSource} from './helpers/source.mjs';
/* Optional browser integration. Install Playwright separately, then:
   FILMLABB_CHROMIUM_BIN=/path/to/chromium npm run test:gpu
   Override FILMLABB_PLAYWRIGHT_MODULE / FILMLABB_CHROMIUM_ARGS if needed. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.FILMLABB_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve('site');const mime={'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,p=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');let bytes=readSource(p);const fault=new URL(req.url,'http://localhost').searchParams.get('fault');if(name==='/export-worker.js'&&fault){const prefix=fault==='slow'?"const nativeEncode=OffscreenCanvas.prototype.convertToBlob;OffscreenCanvas.prototype.convertToBlob=async function(...a){await new Promise(r=>setTimeout(r,1000));return nativeEncode.apply(this,a);};\n":"OffscreenCanvas.prototype.convertToBlob=async()=>new Blob(['invalid'],{type:'image/png'});\n";bytes=Buffer.concat([Buffer.from(prefix),bytes]);}res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await launchBrowser({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||undefined,args:process.env.FILMLABB_CHROMIUM_ARGS?JSON.parse(process.env.FILMLABB_CHROMIUM_ARGS):['--no-sandbox','--enable-unsafe-swiftshader']});
const report={environment:'Chromium headless with SwiftShader; synthetic sources and native JPEG encoders',checks:[]};
function check(message){report.checks.push(message);console.log('PASS',message);}
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},locale:'sv-SE'}),errors=[];page.setDefaultTimeout(90000);
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));
 await page.waitForFunction(()=>globalThis.FILMLABB_GPU?.snapshot().backend==='gpu');
 assert.deepEqual(errors,[]);check('Actual app PNG import uses GPU with no page errors');


 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{$('adjustmentPanel').scrollTop=0;window.scrollTo(0,0);});
 const result=await page.evaluate(()=>({order:[$('frameSettingsGroup'),$('histogram'),$('simpleControls'),$('calibration3'),$('creativeProfiles')].map(el=>el.getBoundingClientRect().top),overflow:document.documentElement.scrollWidth>innerWidth+1,advanced:$('advancedSettings').open,engine:$('engineMode').checkVisibility()}));
 assert.ok(result.order.every((v,i,a)=>i===0||v>a[i-1]),JSON.stringify(result));assert.equal(result.overflow,false);assert.equal(result.advanced,false);assert.equal(result.engine,true);assert.deepEqual(errors,[]);await page.screenshot({path:path.resolve('../beta5-mobile-qa.png')});console.log('PASS final mobile film-frame-first order, closed advanced view, no page overflow or errors',result);
 const report={environment:'Chromium; 390px viewport',checks:[]};report.checks.push('Final mobile CSS: film frame before histogram, image controls, profiles and optional geometry, no horizontal page overflow, advanced controls closed');fs.writeFileSync('docs/mobile-browser-results.json',JSON.stringify(report,null,2));
}finally{await browser.close();server.closeAllConnections();server.close();}
