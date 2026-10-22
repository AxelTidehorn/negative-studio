import assert from 'node:assert/strict';
import '../geometry.js';import '../image-model.js';
const G=NSGeometry,C=NSColorEngine,near=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
let cases=0;
for(const [width,height] of [[6000,4000],[4000,6000],[8,8],[1,1],[1,9000]])for(let quarterTurns=0;quarterTurns<4;quarterTurns++)for(const fineDegrees of [-45,-31,-.001,0,.001,19,45]){
 const r={quarterTurns,fineDegrees},t=G.transform(width,height,r);
 for(const p of [{x:0,y:0},{x:1,y:1},{x:.5,y:.5},{x:.123,y:.987},{x:-.1,y:1.2}]){
  const q=t.inverse(t.forward(p));near(q.x,p.x);near(q.y,p.y);
 }
 for(const aspect of [undefined,1,3/2,2/3]){
  const crop=G.autoValidCrop(width,height,r,aspect);assert.equal(G.isValidCrop(width,height,r,crop),true);
  near(crop.x+crop.w/2,.5);near(crop.y+crop.h/2,.5);
  const a=aspect??(quarterTurns%2?height/width:width/height);near(crop.w*t.bounds.width/(crop.h*t.bounds.height),a);
  // A larger centered rectangle of the same aspect must leave the source.
  const w=crop.w*1.0001,h=crop.h*1.0001;
  if(w<=1&&h<=1)assert.equal(G.isValidCrop(width,height,r,{x:(1-w)/2,y:(1-h)/2,w,h}),false);
 }
 for(const compositionCrop of [null,{x:.2,y:.1,w:.5,h:.6}]){
  const output=G.compositionTransform(width,height,{...G.create(),rotation:r,compositionCrop});
  assert.equal(G.isValidCrop(width,height,r,output.region),true);
  for(const p of [{x:0,y:0},{x:1,y:1},{x:.37,y:.61}]){const q=output.forward(output.inverse(p)),tolerance=Math.max(1e-10,8*Number.EPSILON*Math.max(t.bounds.width/output.bounds.width,t.bounds.height/output.bounds.height));near(q.x,p.x,tolerance);near(q.y,p.y,tolerance);}
 }
 if(fineDegrees===0)assert.deepEqual(G.autoValidCrop(width,height,r),{x:0,y:0,w:1,h:1});
 cases++;
}
assert.equal(G.isValidCrop(6000,4000,{quarterTurns:0,fineDegrees:10},{x:0,y:0,w:1,h:1}),false);
console.log('PASS',cases,'rotation/aspect cases: invertible normalized pixel-edge/source/composition coordinates, centered maximal fixed-aspect crop, no empty corners');
const expected=[[0,1,2,3,4,5],[3,0,4,1,5,2],[5,4,3,2,1,0],[2,5,1,4,0,3]];
for(let q=0;q<4;q++){
 const r={quarterTurns:q,fineDegrees:0},t=G.transform(3,2,r),g=C.exportGeometry({width:3,height:2},null,false,q*90),actual=[];
 for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){
  const p=t.inverse({x:(x+.5)/g.width,y:(y+.5)/g.height}),[sx,sy]=g.at(x,y);
  assert.equal(Math.floor(p.x*3),sx);assert.equal(Math.floor(p.y*2),sy);actual.push(sy*3+sx);
 }
 assert.deepEqual(actual,expected[q]);
}
const cropped=[[6,7,8,11,12,13],[11,6,12,7,13,8],[13,12,11,8,7,6],[8,13,7,12,6,11]];
for(let q=0;q<4;q++){
 const g=C.exportGeometry({width:5,height:4},{x:.2,y:.25,w:.6,h:.5},true,q*90),actual=[];
 for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){const [sx,sy]=g.at(x,y);actual.push(sy*5+sx);}
 assert.deepEqual(actual,cropped[q]);
}
console.log('PASS independent exact source-pixel fixtures for 0/90/180/270°, full image and film-frame crop');
for(const bad of [{x:0,y:0,w:0,h:1},{x:0,y:0,w:1.1,h:1},{x:-.1,y:0,w:.5,h:1},{x:NaN,y:0,w:1,h:1},{x:0,y:0,w:Infinity,h:1},[]])assert.throws(()=>G.rect(bad));
for(const bad of [NaN,Infinity,1,89.9,'90'])assert.throws(()=>G.fromLegacy(bad));
for(const bad of [{quarterTurns:4,fineDegrees:0},{quarterTurns:0,fineDegrees:46},{quarterTurns:0,fineDegrees:NaN}])assert.throws(()=>G.rotation(bad));
assert.throws(()=>G.transform(0,1,G.fromLegacy()));assert.throws(()=>G.autoValidCrop(5,4,G.fromLegacy(),0));
assert.throws(()=>G.validate({...G.create(),version:2}));assert.throws(()=>G.validate({...G.create(),cropExportToFrameOverride:0}));
console.log('PASS strict finite/nondegenerate geometry, dimension, rotation and schema validation');
