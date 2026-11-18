import assert from 'node:assert/strict';import '../src/geometry/geometry.js';import '../src/image/image-model.js';
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
g=G.withQuarterTurns(g,90);assert.deepEqual(g.compositionCrop,{cx:-.1,cy:-.2,w:.3,h:.6});g=G.withQuarterTurns(g,360);assert.deepEqual(g.compositionCrop,{cx:-.2,cy:.1,w:.6,h:.3});
const desired=G.withComposition(G.create(),{cx:.2,cy:-.1,w:.8,h:.7}),snapshot=JSON.stringify(desired);G.effectiveComposition(6000,4000,desired,{cropExportToFrame:true,analysisFrame:{x:.1,y:.2,w:.2,h:.3}});assert.equal(JSON.stringify(desired),snapshot);
console.log('PASS exact quarter-turn facit, clockwise center/size rotation, and stable R/L composition when domain/fine angle changes');
for(const bad of [{x:0,y:0,w:0,h:1},{x:-.1,y:0,w:1,h:1},{x:NaN,y:0,w:1,h:1}])assert.throws(()=>G.rect(bad));
for(const bad of [{cx:Infinity,cy:0,w:1,h:1},{cx:0,cy:0,w:0,h:1},{cx:100,cy:0,w:1,h:1},{x:0,y:0,w:1,h:1}])assert.throws(()=>G.composition(bad));
for(const bad of [NaN,Infinity,1,'90'])assert.throws(()=>G.quarterRotation(bad));
assert.throws(()=>G.transform(1000001,1,G.quarterRotation()));assert.throws(()=>G.transform(40000,40000,G.quarterRotation()));
assert.throws(()=>G.rotation({quarterTurns:4,fineDegrees:0}));assert.throws(()=>G.rotation({quarterTurns:0,fineDegrees:46}));
assert.throws(()=>G.validate({...G.create(),cropExportToFrameOverride:null}));
console.log('PASS current geometry validation; obsolete migration plans removed');
{
// Conventional crop dragging: anchored edges never move, boundaries clamp only the blocked motion.
const W=6000,H=4000,L=6000,edges=c=>({l:c.cx-c.w/2,r:c.cx+c.w/2,t:c.cy-c.h/2,b:c.cy+c.h/2}),eq=(a,b,m)=>near(a,b,1e-12),plain=G.create();
const start={cx:0,cy:0,w:.5,h:.3},s=edges(start),drag=(part,dx,dy,g=plain,o={},c=start)=>G.dragComposition(W,H,g,c,part,{x:dx,y:dy},o);
// Unrotated domain in the crop plane: x in [-.5,.5], y in [-1/3,1/3].
let c=edges(drag('2',.1,.05));eq(c.l,s.l);eq(c.t,s.t);eq(c.r,s.r+.1);eq(c.b,s.b+.05);
// Corner beyond the right boundary: right clamps, bottom still follows the pointer, opposite corner fixed.
c=edges(drag('2',5,.02));eq(c.r,.5);eq(c.b,s.b+.02);eq(c.l,s.l);eq(c.t,s.t);
c=edges(drag('0',-5,-5));eq(c.l,-.5);eq(c.t,-1/3);eq(c.r,s.r);eq(c.b,s.b);
// Edges change one dimension only; perpendicular pointer motion is ignored.
for(const [part,dx,dy,key,value] of [['right',.9,.4,'r',.5],['left',-.9,-.2,'l',-.5],['top',.3,-.9,'t',-1/3],['bottom',-.2,.9,'b',1/3]]){
 const e=edges(drag(part,dx,dy));eq(e[key],value);for(const k of ['l','r','t','b'])if(k!==key)eq(e[k],s[k]);
}
// Moving keeps the size and clamps per axis.
c=drag('move',2,.01);eq(c.w,start.w);eq(c.h,start.h);eq(edges(c).r,.5);eq(c.cy,.01);
// Crossing the anchor stops at a minimum size instead of flipping or moving the anchor.
c=edges(drag('right',-5,0));eq(c.l,s.l);eq(c.r-c.l,8/L);c=edges(drag('top',0,5));eq(c.b,s.b);eq(c.b-c.t,8/L);
// Reversing direction: the result depends only on the total delta from drag start.
for(const part of ['0','1','2','3','top','right','bottom','left','move']){
 assert.deepEqual(drag(part,0,0),start);
 for(const [dx,dy] of [[.08,-.03],[-.04,.06]]){const out=drag(part,dx*30,dy*30),back=drag(part,dx,dy);assert.ok(G.isValidCrop(W,H,plain.rotation,out));assert.deepEqual(back,drag(part,dx,dy));}
}
// Rotated and frame-limited domains: every result valid; anchors fixed; sizes kept when moving.
for(const q of [0,1,2,3])for(const fine of [-12,7,31])for(const o of [{},{cropExportToFrame:true,analysisFrame:{x:.1,y:.12,w:.7,h:.75}}]){
 const g={...G.create(),rotation:{quarterTurns:q,fineDegrees:fine}},base=G.autoValidCrop(W,H,g.rotation,1.4,o),c0={...base,w:base.w*.6,h:base.h*.6},e0=edges(c0);
 for(const [dx,dy] of [[.4,0],[0,.4],[-.4,.3],[.05,-.02],[3,3],[-3,1]]){
  for(const part of ['0','1','2','3','top','right','bottom','left','move']){
   const out=drag(part,dx,dy,g,o,c0),e=edges(out);assert.ok(G.isValidCrop(W,H,g.rotation,out,o),JSON.stringify({q,fine,part,dx,dy}));
   assert.equal(G.effectiveComposition(W,H,G.withComposition(g,out),o).limited,false);
   const fixed={'0':['r','b'],'1':['l','b'],'2':['l','t'],'3':['r','t'],top:['l','r','b'],right:['l','t','b'],bottom:['l','r','t'],left:['r','t','b'],move:[]}[part];
   for(const k of fixed)eq(e[k],e0[k]);if(part==='move'){eq(out.w,c0.w);eq(out.h,c0.h);}
   cases++;
  }
 }
 // Closest valid position: no nearby valid corner is nearer the pointer, so a blocked axis slides.
 for(const [dx,dy] of [[3,.02],[.3,.25],[-2,-.1]]){
  const out=edges(drag('2',dx,dy,g,o,c0)),want={x:e0.r+dx,y:e0.b+dy},d0=Math.hypot(out.r-want.x,out.b-want.y);
  for(let k=0;k<16;k++){const x=out.r+1e-4*Math.cos(k*Math.PI/8),y=out.b+1e-4*Math.sin(k*Math.PI/8),trial={cx:(e0.l+x)/2,cy:(e0.t+y)/2,w:x-e0.l,h:y-e0.t};
   if(trial.w>=8/L&&trial.h>=8/L&&G.isValidCrop(W,H,g.rotation,trial,o))assert.ok(Math.hypot(x-want.x,y-want.y)>=d0-1e-12,JSON.stringify({q,fine,dx,dy}));}
 }
}
assert.throws(()=>drag('diagonal',0,0));assert.throws(()=>drag('move',NaN,0));
console.log('PASS composition drag: anchored corners/edges, per-axis clamping, moves keep size, reversal and rotated slide');
}
