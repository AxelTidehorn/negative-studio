/* One export per worker. Only one input stripe is in flight at a time. */
importScripts('./creative-profiles.js','./raw-input.js','./flat-field.js','./image-model.js','./render-core.js','./export-plan.js');
'use strict';
let job=null;
function need(){const j=job;if(j.y<j.target.height)postMessage({type:'need',id:j.id,y:j.y,rows:NSExportPlan.rows(j.target.width,j.target.height-j.y)});}
self.onmessage=async({data:m})=>{
 let stage='init';
 try{
  if(m.type==='start'){
   if(typeof OffscreenCanvas==='undefined'||typeof OffscreenCanvas.prototype.convertToBlob!=='function')throw Error('Bakgrundskodning saknas i webbläsaren.');
   const canvas=new OffscreenCanvas(m.target.width,m.target.height),ctx=canvas.getContext('2d',{colorSpace:'srgb'});if(!ctx)throw Error('Kunde inte skapa exportyta.');
   const im={...m.source,data:new Uint8Array(0)},g=NSColorEngine.exportGeometry(im,m.region,m.crop,m.rotation);
   job={id:m.id,im,g,target:m.target,canvas,ctx,y:0,prepared:NSPixelKernel.prepare(im,m.config)};need();return;
  }
  const j=job;if(!j||m.id!==j.id||m.type!=='stripe')return;stage='pixels';
  if(m.y!==j.y||m.rows!==NSExportPlan.rows(j.target.width,j.target.height-j.y)||m.data.length!==j.target.width*m.rows*3)throw Error('Fel ordning eller storlek på exportdata.');
  j.im.data=m.data;const out=j.ctx.createImageData(j.target.width,m.rows);
  for(let dy=0;dy<m.rows;dy++)for(let x=0;x<j.target.width;x++){
   const [sx,sy]=NSExportPlan.at(j.g,j.target,x,j.y+dy),i=(dy*j.target.width+x)*4,p=j.prepared.pixel((dy*j.target.width+x)*3,sx,sy);
   for(let k=0;k<3;k++)out.data[i+k]=Math.round(p[k]*255);out.data[i+3]=255;
  }
  j.ctx.putImageData(out,0,j.y);j.im.data=new Uint8Array(0);j.y+=m.rows;
  postMessage({type:'progress',id:j.id,done:j.y,total:j.target.height});
  if(j.y<j.target.height){need();return;}
  stage='encode';postMessage({type:'encoding',id:j.id});
  const blob=await j.canvas.convertToBlob({type:'image/jpeg',quality:.94});
  if(!blob||blob.type!=='image/jpeg'||!blob.size){const e=Error('Webbläsaren returnerade ingen JPEG.');if(blob&&blob.type!=='image/jpeg')e.code='mime';throw e;}
  j.canvas.width=j.canvas.height=0;postMessage({type:'done',id:j.id,blob});job=null;
 }catch(e){if(job){job.canvas.width=job.canvas.height=0;job=null;}postMessage({type:'error',id:m.id,error:e.message,stage,code:e.code});}
};
