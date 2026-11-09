/* One export per worker. Only one input stripe is in flight at a time. */
importScripts('./profile-catalog.js','./profile-engine.js','./raw-input.js','./flat-field.js','./image-model.js','./color-parameters.js','./editing-engine.js','./conversion3.js','./v2-core.js','./v2-render.js','./v2-fast.js','./v2-platform.js','./render-core.js','./export-plan.js','./geometry.js','./presentation-sampler.js','./srgb-profile.js','./tiff-header.js','./png-encoder.js');
'use strict';
let job=null;
function need(){const j=job;if(j.y<j.target.height)postMessage({type:'need',id:j.id,y:j.y,rows:NSPresentation.rows(j.im,j.g,j.target,j.target.height-j.y)});}
self.onmessage=async({data:m})=>{
 let stage='init';
 try{
  if(m.type==='start'){
   const rgb16=m.format==='tiff'||m.format==='png16';let canvas=null,ctx=null;
   if(!rgb16){if(typeof OffscreenCanvas==='undefined'||typeof OffscreenCanvas.prototype.convertToBlob!=='function')throw Error('Bakgrundskodning saknas i webbläsaren.');canvas=new OffscreenCanvas(m.target.width,m.target.height);ctx=canvas.getContext('2d',{colorSpace:'srgb'});if(!ctx)throw Error('Kunde inte skapa exportyta.');}
   const im={...m.source,data:new (globalThis[m.source.dataType]||Uint8Array)(0)},g=NSPresentation.restore(im,m.presentation,m.region,m.crop,m.rotation);
   if(m.format==='tiff'&&m.target.width*m.target.height*6>=4294960000)throw Error('Bilden är för stor för klassisk TIFF.');
   job={id:m.id,format:m.format,rgb16,mime:m.format==='png16'||m.format==='png8'?'image/png':m.format==='tiff'?'image/tiff':'image/jpeg',im,g,target:m.target,canvas,ctx,y:0,prepared:NSPixelKernel.prepare(im,m.config),parts:rgb16&&m.format==='tiff'?[tiffHeader(g.width,g.height)]:null,png:m.format==='png16'?NSPng.create(g.width,g.height,16):null,metrics:{renderMs:0,maxStripeMs:0,encodeMs:0}};need();return;
  }
  const j=job;if(!j||m.id!==j.id||m.type!=='stripe')return;stage='pixels';
  if(m.y!==j.y||m.rows!==NSPresentation.rows(j.im,j.g,j.target,j.target.height-j.y)||m.data.length!==j.target.width*m.rows*(j.g.presentation?12:3))throw Error('Fel ordning eller storlek på exportdata.');
  j.im.data=m.data;
  const began=performance.now();
  if(j.rgb16){
   const out=NSPresentation.rgb16Packed(j.im,j.prepared,j.g,j.y,m.rows);j.metrics.renderMs+=performance.now()-began;j.metrics.maxStripeMs=Math.max(j.metrics.maxStripeMs,performance.now()-began);const encoding=performance.now();
   if(j.png)await j.png.write(out,m.rows);
   else if(new Uint8Array(new Uint16Array([1]).buffer)[0]===1)j.parts.push(out);
   else{const bytes=new Uint8Array(out.length*2),view=new DataView(bytes.buffer);for(let i=0;i<out.length;i++)view.setUint16(i*2,out[i],true);j.parts.push(bytes);}
   j.metrics.encodeMs+=performance.now()-encoding;
  }else{
   if(!j.out||j.out.height!==m.rows)j.out=j.ctx.createImageData(j.target.width,m.rows);
   NSPresentation.rgba(j.im,j.prepared,j.g,j.target,j.y,m.rows,true,j.out.data);j.ctx.putImageData(j.out,0,j.y);
  }
  j.im.data=new j.im.data.constructor(0);j.y+=m.rows;
  postMessage({type:'progress',id:j.id,done:j.y,total:j.target.height});
  if(j.y<j.target.height){need();return;}
  stage='encode';postMessage({type:'encoding',id:j.id});
  const blob=j.rgb16?(j.png?await j.png.finish():new Blob(j.parts,{type:j.mime})):await j.canvas.convertToBlob({type:j.mime,quality:.94});
  if(!blob||blob.type!==j.mime||!blob.size){const e=Error('Webbläsaren returnerade fel bildformat.');if(blob&&blob.type!==j.mime)e.code='mime';throw e;}
  if(j.canvas)j.canvas.width=j.canvas.height=0;j.metrics.cache=NSPresentation.cacheStats(j.prepared);NSPresentation.release(j.prepared);postMessage({type:'done',id:j.id,blob,metrics:j.metrics});job=null;
 }catch(e){if(job){if(job.canvas)job.canvas.width=job.canvas.height=0;await job.png?.abort();NSPresentation.release(job.prepared);job=null;}postMessage({type:'error',id:m.id,error:e.message,stage,code:e.code});}
};
