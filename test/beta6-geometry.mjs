import assert from 'node:assert/strict';import '../geometry.js';import '../image-model.js';
const G=NSGeometry,C=NSColorEngine,near=(a,b,t=1e-6)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
let cases=0;
for(const [W,H] of [[6000,4000],[4000,6000],[8,8],[1,1],[1,9000]])for(let q=0;q<4;q++)for(const fine of [-45,-31,-.001,0,.001,19,45]){
 const r={quarterTurns:q,fineDegrees:fine},g={...G.create(),rotation:r},t=G.transform(W,H,r);
 for(const p of [{x:0,y:0},{x:W,y:H},{x:W*.123,y:H*.987}]){const a=t.inverse(t.forward(p));near(a.x,p.x);near(a.y,p.y);}
 for(const options of [{},{cropExportToFrame:true,analysisFrame:{x:.1,y:.1,w:.6,h:.7}}]){
  for(const aspect of [undefined,1,1.5,2/3]){
   const safe=G.autoValidCrop(W,H,r,aspect,options);assert.equal(G.isValidCrop(W,H,r,safe,options),true);
   const b=G.pixelBounds(W,H,options.cropExportToFrame?options.analysisFrame:null),wantedAspect=aspect??(q%2?(b.y1-b.y0)/(b.x1-b.x0):(b.x1-b.x0)/(b.y1-b.y0));
   near(safe.w/safe.h,wantedAspect);
   assert.equal(G.isValidCrop(W,H,r,{...safe,w:safe.w*1.0001,h:safe.h*1.0001},options),false);
  }
  for(const requested of [null,{cx:-.12,cy:.08,w:.7,h:.4},{cx:1.5,cy:-1,w:2,h:2}]){
   const model=G.withComposition(g,requested),snapshot=JSON.stringify(model),effective=G.effectiveComposition(W,H,model,options);
   assert.equal(G.isValidCrop(W,H,r,effective.crop,options),true);assert.equal(JSON.stringify(model),snapshot);
   const v=G.viewTransform(W,H,model,{width:980,height:620,zoom:2.3,panX:19,panY:-27},options);
   for(const p of [{x:W*.2,y:H*.3},{x:W*.7,y:H*.8}]){const a=v.inverse(v.forward(p));near(a.x,p.x);near(a.y,p.y);}
  }
 }
 cases++;
}
console.log('PASS',cases,'source-pixel S/R/V round trips within 1e-6 px, off-center domains, maximal fixed-aspect crop, requested/effective separation');
// Independent facit: no re-use of either production or new planner to generate expectations.
const full=[[0,1,2,3,4,5],[3,0,4,1,5,2],[5,4,3,2,1,0],[2,5,1,4,0,3]],cropped=[[6,7,8,11,12,13],[11,6,12,7,13,8],[13,12,11,8,7,6],[8,13,7,12,6,11]];
for(const [W,H,frame,expected] of [[3,2,null,full],[5,4,{x:.2,y:.25,w:.6,h:.5},cropped]])for(let q=0;q<4;q++){
 const options={cropExportToFrame:!!frame,analysisFrame:frame},plan=G.compositionTransform(W,H,G.create(q*90),options),old=C.exportGeometry({width:W,height:H},frame,!!frame,q*90),actual=[];
 assert.deepEqual(plan.output,{width:old.width,height:old.height});
 for(let y=0;y<old.height;y++)for(let x=0;x<old.width;x++){const p=plan.sample(x,y),[sx,sy]=old.at(x,y);near(p.x,sx+.5,1e-12);near(p.y,sy+.5,1e-12);actual.push(Math.floor(p.y)*W+Math.floor(p.x));}
 assert.deepEqual(actual,expected[q]);
}
// Analytic 45-degree reference independent of the production transform/inverse.
const diagonal={...G.create(),rotation:{quarterTurns:0,fineDegrees:45},compositionCrop:{cx:0,cy:0,w:.5,h:.25}},reference=G.compositionTransform(8,6,diagonal);
assert.deepEqual(reference.output,{width:4,height:2});
for(let y=0;y<2;y++)for(let x=0;x<4;x++){
 const rx=x+.5-2,ry=y+.5-1,p=reference.sample(x,y);
 near(p.x,4+(rx+ry)*Math.SQRT1_2,1e-12);near(p.y,3+(-rx+ry)*Math.SQRT1_2,1e-12);
}
const point=G.transform(8,6,diagonal.rotation).forward({x:5,y:3});near(point.x,Math.SQRT1_2,1e-12);near(point.y,Math.SQRT1_2,1e-12);
let g={...G.create(),compositionCrop:{cx:-.2,cy:.1,w:.6,h:.3}};
g=G.syncLegacy(g,90);assert.deepEqual(g.compositionCrop,{cx:-.1,cy:-.2,w:.3,h:.6});g=G.syncLegacy(g,360);assert.deepEqual(g.compositionCrop,{cx:-.2,cy:.1,w:.6,h:.3});
const desired=G.withComposition(G.create(),{cx:.2,cy:-.1,w:.8,h:.7}),snapshot=JSON.stringify(desired);G.effectiveComposition(6000,4000,desired,{cropExportToFrame:true,analysisFrame:{x:.1,y:.2,w:.2,h:.3}});assert.equal(JSON.stringify(desired),snapshot);
console.log('PASS exact quarter-turn facit, clockwise center/size rotation, and stable R/L composition when domain/fine angle changes');
for(const bad of [{x:0,y:0,w:0,h:1},{x:-.1,y:0,w:1,h:1},{x:NaN,y:0,w:1,h:1}])assert.throws(()=>G.rect(bad));
for(const bad of [{cx:Infinity,cy:0,w:1,h:1},{cx:0,cy:0,w:0,h:1},{cx:100,cy:0,w:1,h:1},{x:0,y:0,w:1,h:1}])assert.throws(()=>G.composition(bad));
for(const bad of [NaN,Infinity,1,'90'])assert.throws(()=>G.fromLegacy(bad));
assert.throws(()=>G.transform(1000001,1,G.fromLegacy()));assert.throws(()=>G.transform(40000,40000,G.fromLegacy()));
assert.throws(()=>G.rotation({quarterTurns:4,fineDegrees:0}));assert.throws(()=>G.rotation({quarterTurns:0,fineDegrees:46}));
assert.throws(()=>G.validate({...G.create(),cropExportToFrameOverride:null}));
const pending=G.legacyFrame({rotation:90,cropExport:true},null,false);assert.throws(()=>G.compositionTransform(5,4,pending));
const hydrated=G.resolve(pending,{width:5,height:4},{x:.2,y:.25,w:.6,h:.5});assert.deepEqual(G.compositionTransform(5,4,hydrated).output,{width:2,height:3});
assert.throws(()=>G.validate({...hydrated,compositionCrop:{cx:0,cy:0,w:1,h:1}}));
// Previously generic normalized->pixel rounding lost a row when the same global
// constraint was switched on. Keep the exact legacy path while it remains valid.
const thinFrame={x:.13,y:.11,w:.72,h:.73},thin=G.resolve(G.legacyFrame({rotation:90,cropExport:true},thinFrame,false),{width:3,height:22},thinFrame);
assert.deepEqual(G.compositionTransform(3,22,thin,{cropExportToFrame:true,analysisFrame:thinFrame}).output,{width:15,height:1});

console.log('PASS finite/bounded coordinates, source sizes, schema, pending legacy plans and inconsistent legacy snapshots rejected');
