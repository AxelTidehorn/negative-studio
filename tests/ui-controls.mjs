/* Regression for the real data-unit <-> 0..1000 UI binding, including asymmetric ranges. */
import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';import {negative,region} from './helpers/conversion3-fixtures.mjs';
const h=harness();h.context.Event=Event;h.set('working',negative({width:24,height:16}));h.set('cropRegion',region);
h.run(`render=()=>{};scheduleRender=()=>{};workingPreview=working;src=new ImageData(working.width,working.height);previewSrc=src;sourceInfo={encoding:'linear',colorSpace:'srgb',domain:'ui-fixture'};state={...defaultState(),cropConfirmed:true};roll=[{file:{name:'ui.tif'},settings:{...state},geometry:NSGeometry.create(),crop:{...cropRegion}}];activeFrame=0;`);
for(const version of [1,2]){
 h.run(`state.editVersion=${version};state.exposure=1;state.contrast=.6;state.shadow=.08;$('reset').onclick();`);
 for(const [id,,,,,neutral] of h.run('controls')){
  assert.equal(h.run(`state.${id}`),neutral,id+' reset data value');assert.ok(Math.abs(Number(h.elements.get(id).value)-500)<1e-8,id+' neutral thumb must use UI units');
  assert.equal(Number.parseFloat(h.elements.get(id+'Value').textContent),neutral,id+' label must retain the step precision');
 }
 assert.equal(h.run('state.editVersion'),version);assert.equal(h.run('roll[0].settings.editVersion'),version);
}
for(const [id,,min,max,step,neutral] of h.run('controls')){
 for(const [value,position]of [[min,0],[neutral,500],[max,1000]]){
  h.set('state.'+id,value);h.run(`setSliderPosition('${id}')`);assert.ok(Math.abs(Number(h.elements.get(id).value)-position)<1e-8,id+' endpoint/default mapping');
  const actual=h.run(`sliderFromUI(${position},${min},${max},${step},${neutral})`);assert.ok(Math.abs(actual-value)<1e-12,id+' inverse mapping');
 }
 h.run(`restoreSliderDefault($('${id}'),'${id}')`);assert.ok(Math.abs(Number(h.elements.get(id).value)-500)<1e-8);assert.equal(h.run(`roll[0].settings.${id}`),neutral);
}
console.log('PASS global/individual reset: data, thumb and displayed precision; asymmetric endpoints/inverses, saved queue settings and both editing versions');
