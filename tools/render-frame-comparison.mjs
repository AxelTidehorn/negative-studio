/* Render diagnostic SVGs to compact review JPEGs; numeric tests use Float32.
   node tools/render-frame-comparison.mjs INPUT.svg OUTPUT.jpg */
import fs from 'node:fs';import http from 'node:http';import {launchBrowser} from '../tests/helpers/browser-runtime.mjs';
const [input,output]=process.argv.slice(2);if(!output)throw Error('INPUT.svg OUTPUT.jpg required');
const data=fs.readFileSync(input),server=http.createServer((req,res)=>{res.setHeader('Content-Type','image/svg+xml');res.end(data);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await launchBrowser({headless:true,args:['--no-sandbox']});try{const page=await browser.newPage({viewport:{width:1000,height:900},deviceScaleFactor:1});await page.goto('http://127.0.0.1:'+server.address().port+'/comparison.svg');await page.locator('svg').screenshot({path:output,type:'jpeg',quality:85});}finally{await browser.close();await new Promise(r=>server.close(r));}
