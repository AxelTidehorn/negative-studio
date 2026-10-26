/* Export-only presentation sampling. Color conversion stays in NSPixelKernel.
   S edges -> pixel centers -> per-neighbor color -> linear-display interpolation.
   No preview hooks, full-size intermediate images, or source ownership changes. */
(function(root){
'use strict';
const STRIPE_BYTES=2097152;
const clamp=v=>Math.max(0,Math.min(1,v));
const decode=v=>{v=clamp(v);return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const encode=v=>{v=clamp(v);return v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;};
function plan(im,value,shared,analysisFrame){
 const model=NSGeometry.resolve(value,{width:im.width,height:im.height},analysisFrame);
 const options={cropExportToFrame:shared,analysisFrame},p=NSGeometry.compositionTransform(im.width,im.height,model,options);
 const bounds=NSGeometry.pixelBounds(im.width,im.height,shared?analysisFrame:null);
 const old=model.legacyCrop&&!model.legacyCrop.edited&&model.legacyCrop.analysisFrame;
 const b=old?NSGeometry.pixelBounds(im.width,im.height,old):bounds;
 const contained=b.x0>=bounds.x0&&b.y0>=bounds.y0&&b.x1<=bounds.x1&&b.y1<=bounds.y1;
 if(model.rotation.fineDegrees===0&&(model.compositionCrop===null||(old&&contained))){
  return NSColorEngine.exportGeometry(im,old||analysisFrame,!!old||shared,model.rotation.quarterTurns*90);
 }
 // Serializable, copied snapshot; the worker derives the identical transform.
 return {width:p.output.width,height:p.output.height,presentation:true,bounds,
  spec:{model,shared,analysisFrame:analysisFrame?{...analysisFrame}:null},
  point(x,y,target){return p.inverse({x:(x+.5)/target.width,y:(y+.5)/target.height});}};
}
function restore(im,spec,region,crop,rotation){return spec?plan(im,spec.model,spec.shared,spec.analysisFrame):NSColorEngine.exportGeometry(im,region,crop,rotation);}
function neighbors(g,target,x,y){
 const s=g.point(x,y,target),b=g.bounds;
 // Clamp to the allowed source *centers*, not to the whole original. This
 // replicates the edge and prevents holder/film-border leakage at a cropped edge.
 const u=Math.max(b.x0,Math.min(b.x1-1,s.x-.5)),v=Math.max(b.y0,Math.min(b.y1-1,s.y-.5));
 const x0=Math.floor(u),y0=Math.floor(v),x1=Math.min(b.x1-1,x0+1),y1=Math.min(b.y1-1,y0+1),fx=u-x0,fy=v-y0;
 return [[x0,y0,(1-fx)*(1-fy)],[x1,y0,fx*(1-fy)],[x0,y1,(1-fx)*fy],[x1,y1,fx*fy]];
}
function rows(im,g,target,remaining,pixels=65536){
 if(!g.presentation)return NSExportPlan.rows(target.width,remaining,pixels);
 // Four raw RGB triples plus RGBA/16-bit RGB output. One row is the minimum;
 // supported JPEG side limits keep even a Float64 row within this budget.
 const bytes=12*im.data.BYTES_PER_ELEMENT+6;
 return Math.min(remaining,32,Math.max(1,Math.floor(Math.min(pixels,Math.floor(STRIPE_BYTES/bytes))/target.width)));
}
function pack(im,g,target,y,count){
 if(!g.presentation)return NSExportPlan.pack(im,g,target,y,count);
 const data=new im.data.constructor(target.width*count*12);
 for(let dy=0;dy<count;dy++)for(let x=0;x<target.width;x++){
  const ns=neighbors(g,target,x,y+dy),base=(dy*target.width+x)*12;
  for(let n=0;n<4;n++){const j=(ns[n][1]*im.width+ns[n][0])*im.channels;for(let k=0;k<3;k++)data[base+n*3+k]=im.data[j+k];}
 }
 return data;
}
function pixel(im,prepared,g,target,x,y,packedIndex){
 if(!g.presentation){
  const [sx,sy]=NSExportPlan.at(g,target,x,y);
  return prepared.pixel(packedIndex===undefined?(sy*im.width+sx)*im.channels:packedIndex*3,sx,sy);
 }
 const ns=neighbors(g,target,x,y),sum=[0,0,0];
 for(let n=0;n<4;n++){
  const [sx,sy,weight]=ns[n];if(weight===0)continue;
  const i=packedIndex===undefined?(sy*im.width+sx)*im.channels:packedIndex*12+n*3;
  const p=prepared.pixel(i,sx,sy);
  for(let k=0;k<3;k++)sum[k]+=decode(p[k])*weight;
 }
 return sum.map(encode);
}
function rgba(im,prepared,g,target,y,count,packed=false,out=new Uint8ClampedArray(target.width*count*4)){
 for(let dy=0;dy<count;dy++)for(let x=0;x<target.width;x++){
  const n=dy*target.width+x,p=pixel(im,prepared,g,target,x,y+dy,packed?n:undefined);
  for(let k=0;k<3;k++)out[n*4+k]=Math.round(p[k]*255);out[n*4+3]=255;
 }
 return out;
}
function tiff(im,config,g,y,count,prepared){
 // Preserve exact integer permutation, lookup order and quantization for legacy.
 if(!g.presentation)return NSPixelKernel.exportRows(im,config,g,y,count,null,false,prepared);
 const out=new Uint16Array(g.width*count*3);
 for(let dy=0;dy<count;dy++)for(let x=0;x<g.width;x++){
  const p=pixel(im,prepared,g,g,x,y+dy),i=(dy*g.width+x)*3;
  for(let k=0;k<3;k++)out[i+k]=Math.round(p[k]*65535);
 }
 return out;
}
root.NSPresentation=Object.freeze({STRIPE_BYTES,plan,restore,neighbors,rows,pack,pixel,rgba,tiff});
})(globalThis);
