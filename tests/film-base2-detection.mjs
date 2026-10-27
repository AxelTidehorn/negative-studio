import assert from 'node:assert/strict';
import {harness} from './helpers/app-harness.mjs';
const h=harness(),M=h.context.NSFilmBaseMeasurement;
// Every aggregate statistic is independently checked against a fully enumerated
// union: raw saturation and normalized clipping may occur at DIFFERENT pixels.
const width=80,height=64,scale=65535,data=new Uint16Array(width*height*3).fill(22000);
const im={width,height,channels:3,scale,normalization:.5,data,encoding:'linear'};
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*3;if(x>=40&&y%8===0)data[i]=65535;if(x>=40&&y%8===1)data[i]=33000;if(x>=40&&y%8===2)data[i+1]=0;}
const regions=[{x:0,y:0,w:.5,h:1},{x:.5,y:0,w:.5,h:1}],combined=M.measureRegions(im,regions,{limit:width*height});
const ps=[];for(let y=0;y<height;y++)for(let x=0;x<width;x++)ps.push(h.context.NSColorEngine.pixel(im,x,y));
assert.equal(combined.clipped[0],.125);assert.equal(combined.dark[1],.0625);assert.equal(combined.status,'missing');
for(let c=0;c<3;c++){const s=ps.map(p=>p[c]).sort((a,b)=>a-b),at=q=>s[Math.floor(q*(s.length-1))],median=at(.5);assert.equal(combined.measured[c],median);assert.equal(combined.spread[c],(at(.95)-at(.05))/median);}
assert.equal(M.measure(im,regions[0]).status,'safe');assert.ok(combined.reasons.includes('Kanalvis klippning'));assert.ok(combined.reasons.includes('Låg signal'));
console.log('PASS aggregate union measures real channel clipping, low signal and robust spread, including raw/normalized clipping at distinct pixels');

function negative({rebate=3,perforations=false,holder=.001,gap=false}={}){
 const width=768,height=512,data=new Float32Array(width*height*3),base=[.8,.5,.25],frame={x:96/width,y:64/height,w:576/width,h:384/height};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const inside=x>=96&&x<672&&y>=64&&y<448;
  const border=!gap&&x>=96-rebate&&x<672+rebate&&y>=64-rebate&&y<448+rebate&&!inside;
  const between=gap&&x>=383&&x<383+rebate&&y>=64&&y<448;
  const hole=perforations&&border&&((x<96||x>=672)?y%32<8:x%32<8);
  const p=hole?[1,1,1]:border||between?base:inside?base.map(v=>v*(.12+.5*(x+y)/(width+height))):[holder,holder,holder];data.set(p,(y*width+x)*3);
 }return {im:{width,height,channels:3,encoding:'linear',scale:1,data},frame,base};
}
for(const opts of [{rebate:2},{rebate:3},{rebate:6,perforations:true},{rebate:3,holder:.6},{rebate:3,gap:true}]){
 const {im,frame,base}=negative(opts),result=M.detect(im,frame);
 assert.ok(result.measured,JSON.stringify({opts,status:result.status,reasons:result.reasons,candidates:result.candidates?.map(c=>({m:c.measured,status:c.status,refined:c.refined}))}));
 assert.equal(result.status,'review',JSON.stringify(opts));assert.ok(result.refined);
 for(let c=0;c<3;c++)assert.ok(Math.abs(result.measured[c]-base[c])<1e-6,JSON.stringify({opts,measured:result.measured}));
 const check=M.measureRegions(im,result.regions);assert.deepEqual(result.clipped,check.clipped);assert.deepEqual(result.dark,check.dark);assert.deepEqual(result.spread,check.spread);assert.ok(result.clipped.every(x=>x===0));
 console.log('PASS narrow source rebate / gap',JSON.stringify(opts));
}
// A sparse coarse screening must not hide contamination in final higher-density
// source sampling. At least one diagnostic candidate records actual bad samples.
const mixed=negative({rebate:40});for(let y=24;y<488;y++)for(let x=56;x<712;x++){if(x>=96&&x<672&&y>=64&&y<448)continue;if((x*17+y*31)%43===0)mixed.im.data[(y*768+x)*3]=1;}
const result=M.detect(mixed.im,mixed.frame);
for(const c of result.candidates||[]){const actual=M.measureRegions(mixed.im,c.regions,{limit:c.sampleLimit});assert.deepEqual(c.clipped,actual.clipped);assert.deepEqual(c.dark,actual.dark);assert.deepEqual(c.spread,actual.spread);}
assert.notEqual(result.status,'safe');
assert.ok(result.candidates.some(c=>c.clipped.some(v=>v>0)), 'Final re-sampling must expose clipped samples missed by coarse cell screening');
h.context.setTimeout=setTimeout;let ticks=0;const timer=setInterval(()=>ticks++,0);try{await M.detectAsync(mixed.im,mixed.frame);assert.ok(ticks>1,'Refinement must yield to input between sections');}finally{clearInterval(timer);}
console.log('PASS sparse contaminated coarse cells cannot fabricate zero final diagnostics; refinement yields to input');

const low=negative({rebate:40});for(let y=24;y<488;y++)for(let x=56;x<712;x++){if(x>=96&&x<672&&y>=64&&y<448)continue;if((x*17+y*31)%43===0)low.im.data[(y*768+x)*3+2]=0;}
const darkResult=M.detect(low.im,low.frame);assert.notEqual(darkResult.status,'safe');assert.ok(darkResult.candidates.some(c=>c.dark[2]>0),'Final re-sampling must expose low-signal pixels missed by coarse screening');
console.log('PASS low-signal contamination survives aggregation diagnostics and blocks safe classification');
