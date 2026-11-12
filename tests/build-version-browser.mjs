import assert from 'node:assert/strict';import fs from 'node:fs';
import {ensureBuild} from '../tools/build-artifact.mjs';import {browserHarness} from './helpers/browser.mjs';
ensureBuild();const expected=JSON.parse(fs.readFileSync('site/build-info.json')),h=await browserHarness();
try{const page=await h.browser.newPage({serviceWorkers:'block',viewport:{width:820,height:1180}});await page.goto(h.url);await page.waitForFunction(()=>document.querySelector('[data-build-label]').textContent.includes(NSBuildInfo.version));assert.match(await page.locator('[data-build-label]').textContent(),new RegExp(expected.sourceCommit.slice(0,7)));assert.deepEqual(await page.evaluate(()=>NSBuildInfo),expected);
 await page.locator('#imageFile').setInputFiles('tests/fixtures/synthetic-negative.dng');await page.waitForFunction(()=>working&&!rollLoading);
 const report=await page.evaluate(()=>FILMLABB_DIAGNOSTICS.report());assert.deepEqual(report.build.value,expected);assert.equal(report.build.status,'measured');assert.equal(report.run.mainPlatform,true);
 assert.equal(fs.existsSync('site/v2.html'),false);assert.equal(fs.existsSync('site/v2-worker.js'),false);
 console.log('PASS visible main build/revision and active V2 diagnostic identity; retired lab/worker absent');
}finally{await h.close();}
