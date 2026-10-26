import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {harness} from './helpers/app-harness.mjs';
const h=harness(),G=h.context.NSGeometry,P=h.context.NSPresentation,K=h.context.NSPixelKernel,CE=h.context.NSColorEngine,E=h.context.NSExportPlan;
h.run(`render=()=>{};scheduleRender=()=>{};sourceInfo={encoding:'linear'};state={...defaultState(),cropConfirmed:true};cropRegion={x:0,y:0,w:1,h:1};
working={width:31,height:23,channels:3,scale:65535,encoding:'linear',data:Uint16Array.from({length:31*23*3},(_,i)=>2000+(i*137)%50000)};workingPreview=CE.preview(working);analyzeLevels();`);
const config=h.run('configuration38()');
const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const encode=v=>v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055;
// Independent scalar reference: no production geometry/sampling helpers.
function reference(im,model,shared,frame,target,x,y){
 const W=im.width,H=im.height,L=Math.max(W,H),q=model.rotation.quarterTurns,a=(q*90+model.rotation.fineDegrees)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const b=shared?{x0:Math.min(W-1,Math.ceil(frame.x*W)),y0:Math.min(H-1,Math.ceil(frame.y*H)),x1:Math.min(W,Math.max(Math.min(W-1,Math.ceil(frame.x*W))+1,Math.floor((frame.x+frame.w)*W))),y1:Math.min(H,Math.max(Math.min(H-1,Math.ceil(frame.y*H))+1,Math.floor((frame.y+frame.h)*H)))}:{x0:0,y0:0,x1:W,y1:H};
 const dw=b.x1-b.x0,dh=b.y1-b.y0,aspect=q%2?dh/dw:dw/dh;
 let w,hh,cx,cy;
 if(model.compositionCrop){
  const d=model.compositionCrop,f=Math.min(1,dw/(Math.abs(c)*d.w*L+Math.abs(s)*d.h*L),dh/(Math.abs(s)*d.w*L+Math.abs(c)*d.h*L));w=d.w*L*f;hh=d.h*L*f;
  const hx=(Math.abs(c)*w+Math.abs(s)*hh)/2,hy=(Math.abs(s)*w+Math.abs(c)*hh)/2;
  const sx=Math.max(b.x0+hx,Math.min(b.x1-hx,W/2+c*d.cx*L+s*d.cy*L)),sy=Math.max(b.y0+hy,Math.min(b.y1-hy,H/2-s*d.cx*L+c*d.cy*L));
  cx=c*(sx-W/2)-s*(sy-H/2);cy=s*(sx-W/2)+c*(sy-H/2);
 }else{hh=Math.min(dw/(aspect*Math.abs(c)+Math.abs(s)),dh/(aspect*Math.abs(s)+Math.abs(c)));w=aspect*hh;cx=c*((b.x0+b.x1-W)/2)-s*((b.y0+b.y1-H)/2);cy=s*((b.x0+b.x1-W)/2)+c*((b.y0+b.y1-H)/2);}
 const rx=cx+((x+.5)/target.width-.5)*w,ry=cy+((y+.5)/target.height-.5)*hh;
 const u=Math.max(b.x0,Math.min(b.x1-1,W/2+c*rx+s*ry-.5)),v=Math.max(b.y0,Math.min(b.y1-1,H/2-s*rx+c*ry-.5)),ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;
 const k=K.compile(config),sum=[0,0,0];
 for(const [sx,sy,weight] of [[ix,iy,(1-fx)*(1-fy)],[Math.min(b.x1-1,ix+1),iy,fx*(1-fy)],[ix,Math.min(b.y1-1,iy+1),(1-fx)*fy],[Math.min(b.x1-1,ix+1),Math.min(b.y1-1,iy+1),fx*fy]]){
  const p=k.pixel(CE.pixel(im,sx,sy));p.forEach((v,i)=>sum[i]+=decode(Math.max(0,Math.min(1,v)))*weight);
 }
 return {pixel:sum.map(encode),width:Math.max(1,Math.floor(w)),height:Math.max(1,Math.floor(hh))};
}
let checked=0;
for(const encoding of ['linear','srgb'])for(const scale of [1,255,65535])for(const flat of [false,true])for(const crop of [false,true])for(const q of [0,1,2,3])for(const fine of [-15,-2,-.1,.1,2,15]){
 const Type=scale===1?Float32Array:scale===255?Uint8Array:Uint16Array;
 const im={width:11,height:9,channels:4,scale,encoding,data:Type.from({length:11*9*4},(_,i)=>scale*((i*31+113)%251)/251)};
 if(flat)im.flatField={size:3,gains:Array.from({length:27},(_,i)=>.7+i/35)};
 const frame={x:.09,y:.11,w:.81,h:.77},model=G.create(q*90);model.rotation.fineDegrees=fine;
 if(checked%2)model.compositionCrop={cx:-.12,cy:.04,w:.65,h:.41};
 const g=P.plan(im,model,crop,frame),prepared=K.prepare(im,config),target={width:Math.max(1,g.width-1),height:Math.max(1,g.height-1)};
 assert.equal(g.presentation,true);
 const ref=reference(im,model,crop,frame,g,0,0);assert.equal(g.width,ref.width);assert.equal(g.height,ref.height);
 // Every output at full resolution, and resized JPEG centers, across stripe seams.
 for(const t of [g,target])for(let y=0;y<t.height;y+=2){
  const n=Math.min(2,t.height-y),remote={...E.metadata(im),data:new Type(0)},rp=K.prepare(remote,config);remote.data=P.pack(im,g,t,y,n);
  const rgba=P.rgba(im,prepared,g,t,y,n),packed=P.rgba(remote,rp,g,t,y,n,true);
  assert.deepEqual(packed,rgba);
  for(let dy=0;dy<n;dy++)for(let x=0;x<t.width;x++){
   const expected=reference(im,model,crop,frame,t,x,y+dy).pixel,actual=P.pixel(im,prepared,g,t,x,y+dy);
   for(let k=0;k<3;k++)assert.ok(Math.abs(actual[k]-expected[k])<2e-12,`${encoding}/${scale}/${flat}/${crop}/${q}/${fine}: ${actual[k]} != ${expected[k]}`);
  }
 }
 checked++;
}
console.log('PASS',checked,'free-angle/quarter/encoding/type/flat-field/crop cases match independent scalar reference; packed/main and resized stripe sampling agree');
// Explicit color-order oracle: average black and white *after* nonlinear color.
const im={width:2,height:1,channels:3,data:new Uint8Array([0,0,0,255,255,255]),scale:255,encoding:'linear'};
const g=P.plan(im,{...G.create(),compositionCrop:{cx:0,cy:0,w:.5,h:.5}},false,null);
const nonlinear={pixel(i){const v=(im.data[i]/255)**2;return [v,v,v];}};
assert.ok(Math.abs(P.pixel(im,nonlinear,g,g,0,0)[0]-encode(.5))<1e-12);
const roi={width:5,height:5,channels:3,scale:1,encoding:'linear',data:new Float32Array(75).fill(1)};
for(let y=1;y<4;y++)for(let x=1;x<4;x++)for(let k=0;k<3;k++)roi.data[(y*5+x)*3+k]=.25;
const m=G.create();m.rotation.fineDegrees=15;const rg=P.plan(roi,m,true,{x:.2,y:.2,w:.6,h:.6});
const identity={pixel(i){return Array.from(roi.data.slice(i,i+3));}};
for(let y=0;y<rg.height;y++)for(let x=0;x<rg.width;x++)assert.ok(Math.abs(P.pixel(roi,identity,rg,rg,x,y)[0]-.25)<1e-12);
// Single-pixel domains and all corners remain finite; no forbidden neighbors.
for(const fine of [-15,-.1,.1,15]){const m=G.create();m.rotation.fineDegrees=fine;const g=P.plan(roi,m,true,{x:.4,y:.4,w:.2,h:.2});for(let y=0;y<g.height;y++)for(let x=0;x<g.width;x++){assert.ok(P.pixel(roi,identity,g,g,x,y).every(Number.isFinite));assert.ok(P.neighbors(g,g,x,y).every(([x,y])=>x===2&&y===2));}}
console.log('PASS linear-display interpolation after color, constant field, holder exclusion and one-pixel edge replication');
for(const q of [0,90,180,270])for(const crop of [false,true]){
 const im=h.run('working'),frame={x:.13,y:.11,w:.72,h:.73},g=P.plan(im,G.create(q),crop,frame),old=CE.exportGeometry(im,frame,crop,q);
 assert.equal(g.presentation,undefined);assert.equal(g.width,old.width);assert.equal(g.height,old.height);
 assert.deepEqual(P.tiff(im,config,g,0,g.height,K.prepare(im,config)),K.exportRows(im,config,old,0,old.height,null,false,K.prepare(im,config)));
}
for(const Type of [Uint8Array,Uint16Array,Float32Array,Float64Array]){const im={data:new Type(0)},g={presentation:true},target={width:16384};const rows=P.rows(im,g,target,100);assert.ok(rows*target.width*(12*Type.BYTES_PER_ELEMENT+6)<=P.STRIPE_BYTES);}
console.log('PASS exact legacy 16-bit output at four quarters; four-neighbor stripe byte budget holds through Float64 / 16384px JPEG sides');
