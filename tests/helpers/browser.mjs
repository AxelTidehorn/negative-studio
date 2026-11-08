/* Shared static-site/Chromium fixture. Fault-injection and service-worker lifecycle
   suites keep their specialized servers. Never used by the production application. */
import {launchBrowser} from './browser-runtime.mjs';
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
export async function browserHarness(){
 if(process.env.FILMLABB_SITE_URL){const browser=await launchBrowser();return {browser,url:process.env.FILMLABB_SITE_URL,close:()=>browser.close()};}
 const root=path.resolve('site'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png'};
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await launchBrowser({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 }catch(e){await new Promise(r=>server.close(r));throw e;}
 return {browser,url:'http://127.0.0.1:'+server.address().port+'/',async close(){try{await browser.close();}finally{await new Promise(r=>server.close(r));}}};
}

// Engine selection is an advanced action in UI 2.2. Reveal the existing native
// disclosure only when changing its value; do not alter recipe/data bindings.
export async function selectEngine(page,value){
 await page.waitForFunction(()=>!rollLoading);
 const control=page.locator('#engineMode');
 if(await control.inputValue()===value)return;
 await control.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
 await control.selectOption(value);
 await page.waitForFunction(()=>!rollLoading);
}

export async function openSettings(page){
 const summary=page.locator('#flInfoMenu > summary');
 if(await summary.getAttribute('aria-expanded')!=='true')await summary.click();
 await page.waitForFunction(()=>!document.getElementById('flInfoContent').inert);
}
export async function closeSettings(page){
 if(await page.locator('#flInfoMenu > summary').getAttribute('aria-expanded')==='true')await page.locator('#flInfoMenu > summary').click();
 await page.waitForFunction(()=>!document.getElementById('flInfoMenu').open);
}
export async function selectLanguage(page,language){
 const wasOpen=await page.locator('#flInfoMenu > summary').getAttribute('aria-expanded')==='true';
 await openSettings(page);await page.locator('#languageSelect').selectOption(language);if(!wasOpen)await closeSettings(page);
}
export async function selectAppearance(page,mode){
 const wasOpen=await page.locator('#flInfoMenu > summary').getAttribute('aria-expanded')==='true';
 await openSettings(page);await page.locator('#themeMode').selectOption(mode);if(!wasOpen)await closeSettings(page);
}

export async function selectBackend(page,backend){
 await openSettings(page);await page.locator('#previewBackend').selectOption(backend);await closeSettings(page);
}
