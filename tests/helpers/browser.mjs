/* Shared static-site/Chromium fixture. Fault-injection and service-worker lifecycle
   suites keep their specialized servers. Never used by the production application. */
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';
export async function browserHarness(){
 const root=path.resolve('site'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png'};
 const server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  const {chromium}=await import(process.env.FILMLABB_PLAYWRIGHT_MODULE||'playwright');
  browser=await chromium.launch({headless:true,executablePath:process.env.FILMLABB_CHROMIUM_BIN||undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 }catch(e){await new Promise(r=>server.close(r));throw e;}
 return {browser,url:'http://127.0.0.1:'+server.address().port+'/',async close(){try{await browser.close();}finally{await new Promise(r=>server.close(r));}}};
}
