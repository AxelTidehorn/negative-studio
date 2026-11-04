import assert from 'node:assert/strict';
import path from 'node:path';
import {browserHarness} from './helpers/browser.mjs';

const {browser,url,close}=await browserHarness();
try{
 const page=await browser.newPage({serviceWorkers:'block',locale:'sv-SE'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.locator('#imageFile').setInputFiles(path.resolve('demo-negative.png'));
 await page.waitForFunction(()=>working&&!rollLoading);
 const report=await page.evaluate(()=>{
  const select=$('engineMode'),choices=()=>Array.from(select.options,o=>o.value);
  const expected=['log39','calibrated4','v2'];
  const initial=choices();
  const legacy={};
  for(const engine of ['curve3','density3','matrix3']){
   state.engine=engine;
   updateCalibrationUI();
   legacy[engine]={selected:select.value,choices:choices(),description:$('methodDescription3').textContent};
  }
  state.engine='calibrated4';updateCalibrationUI();
  const restored=choices(),selected=select.value;
  select.value='log39';select.dispatchEvent(new Event('change',{bubbles:true}));
  const changed={engine:state.engine,selected:select.value,choices:choices()};
  return {expected,initial,legacy,restored,selected,changed};
 });
 assert.deepEqual(report.initial,report.expected,'new sessions only offer Original, Standard, V2');
 for(const [id,row] of Object.entries(report.legacy)){
  assert.equal(row.selected,id,'historical project selection '+id);
  assert.deepEqual(row.choices.filter(x=>x!==id),report.expected,'only active legacy engine is available');
  assert.match(row.description,/Äldre projektmotor/,'historical engine must be identified');
 }
 assert.deepEqual(report.restored,report.expected,'legacy choices disappear after returning to Standard');
 assert.equal(report.selected,'calibrated4');
 assert.equal(report.changed.engine,'log39');
 assert.equal(report.changed.selected,'log39');
 assert.deepEqual(report.changed.choices,report.expected);
 assert.deepEqual(errors,[]);
 console.log('PASS only three regular engine choices; historical Curve/Density/Matrix state stays selectable when loaded, then disappears without modifying the saved engine');
}finally{await close();}
