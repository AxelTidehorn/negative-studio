/* Optional actual RAF workflow verification. RAW originals stay outside git.
   Usage: node tools/check-frame-review-real.mjs RAW_DIRECTORY OUTPUT_DIRECTORY
   Add --all to cover all RAFs in the directory (default: 8983 and 9235).
   FILMLABB_TEST_WEBKIT=1 selects Linux WebKit; this is not physical iPad Safari. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import zlib from 'node:zlib';import assert from 'node:assert/strict';
import {ensureBuild} from './build-artifact.mjs';import {browserHarness} from '../tests/helpers/browser.mjs';
const [directory,output]=process.argv.slice(2);if(!directory||!output)throw Error('Specify RAW directory and output directory.');
const files=fs.readdirSync(directory).filter(n=>/\.RAF$/i.test(n)&&(process.argv.includes('--all')||['_DSF8983.RAF','_DSF9235.RAF'].includes(n))).sort();assert.ok(files.length);fs.mkdirSync(output,{recursive:true});ensureBuild();const h=await browserHarness();let alternate;
try{if(process.env.FILMLABB_TEST_WEBKIT){const {webkit}=await import('playwright');alternate=await webkit.launch({headless:true});}const p=await(alternate||h.browser).newPage({viewport:{width:1280,height:900},locale:'sv-SE',serviceWorkers:'block'}),rows=[],errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(240000);
 for(const name of files){await p.goto(h.url);await p.locator('#imageFile').setInputFiles(path.join(directory,name));await p.waitForFunction(()=>working&&!rollLoading&&FILMLABB_IMPORT.snapshot().usableMs!==undefined);await p.waitForTimeout(200);
  const before=await p.evaluate(async()=>{const im=CE.preview(workingPreview,480),hash=await crypto.subtle.digest('SHA-256',im.data.buffer);return {dimensions:[working.width,working.height],previewSHA256:Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join(''),selection:state.frameSelection,detection:{confidence:state.frameDetection.confidence,reason:state.frameDetection.reason,analysisSafe:state.frameDetection.analysisSafe},region:cropRegion,mode:FILMLABB_GEOMETRY.mode(),area:v2Area(),sourceVersion:sourceVersion38,import:FILMLABB_IMPORT.snapshot()};});
  assert.deepEqual(before.dimensions,[6032,4032]);assert.equal(before.selection.status,before.detection.analysisSafe?'automatic':'pending');assert.equal(before.mode,before.detection.analysisSafe?null:'frame');assert.equal(before.area.status,before.detection.analysisSafe?'confirmed':'unconfirmed');
  const fixture='tests/fixtures/frame-real/dsf'+name.match(/\d+/)[0]+'.f32.gz';if(fs.existsSync(fixture)){before.sameBoundedSourceAsPR96=before.previewSHA256===crypto.createHash('sha256').update(zlib.gunzipSync(fs.readFileSync(fixture))).digest('hex');assert.ok(before.sameBoundedSourceAsPR96);}
  await p.screenshot({path:path.join(output,name+'-before.jpg'),type:'jpeg',quality:85});
  if(before.selection.status==='pending')await p.locator('#frameReviewConfirm').click();
  assert.equal(await p.evaluate(()=>state.cropConfirmed&&FILMLABB_GEOMETRY.mode()===null),true);assert.equal(await p.evaluate(()=>sourceVersion38),before.sourceVersion);
  const after=await p.evaluate(()=>({selection:state.frameSelection,area:v2Area(),base:state.v2Recipe.base.origin,analysis:state.v2Recipe.intent.analysis}));await p.waitForTimeout(200);await p.screenshot({path:path.join(output,name+'-after.jpg'),type:'jpeg',quality:85});rows.push({filename:name,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,name))).digest('hex'),before,after});console.log(name,before.selection.status,before.detection.reason,before.sameBoundedSourceAsPR96??'no bounded fixture');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({kind:'actual RAF import and UI workflow; screenshots are previews, not full-resolution exports',browser:await p.evaluate(()=>navigator.userAgent),physicalIPad:false,rows},null,2));
}finally{await alternate?.close();await h.close();}
