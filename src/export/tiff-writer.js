/* TIFF, PNG16 and synchronous canvas export share prepared presentation sampling. */
'use strict';
// TIFF chunking keeps the UI responsive. The table is technical-only: profiles,
// saturation, shadows and highlights all retain the exact shared final pixel path.
async function exportRgb16(format,control={}){
 if(!exportReady())throw Error('Ingen exportklar bild finns.');
 exportBusy=true;$('export').disabled=true;
 let png;
 try{
  const im=working,opts={...state},c=configuration38(opts),g=exportGeometrySnapshot(im,opts).g;
  control.check?.();
  if(format==='tiff'&&g.width*g.height*6>=4294960000)throw Error('Bilden är för stor för klassisk TIFF.');
  if(format==='png16')png=NSPng.create(g.width,g.height,16);
  const parts=png?[]:[tiffHeader(g.width,g.height)],prepared=NSPixelKernel.prepare(im,c),label=png?'PNG 16-bit':'TIFF';
  for(let y=0;y<g.height;){
   control.check?.();
   const rows=g.presentation?NSPresentation.rows(im,g,g,g.height-y):Math.min(16,g.height-y),out=NSPresentation.tiff(im,c,g,y,rows,prepared);
   if(png)await png.write(out,rows);
   else if(new Uint8Array(new Uint16Array([1]).buffer)[0]===1)parts.push(out);
   else{
    const bytes=new Uint8Array(out.length*2),dv=new DataView(bytes.buffer);
    for(let i=0;i<out.length;i++)dv.setUint16(i*2,out[i],true);
    parts.push(bytes);
   }
   if(g.presentation||y%64===0){setStatus(`${label} ${Math.round(100*(y+rows)/g.height)} %`);await new Promise(r=>setTimeout(r,0));}
   control.progress?.(y+rows,g.height);y+=rows;
  }
  control.check?.();
  const blob=png?await png.finish():new Blob(parts,{type:'image/tiff'});control.check?.();
  downloadBlob(blob,exportName(rollingExport?activeFrame:null,png?'png':'tif',png?'filmlabb-positive-16bit.png':'filmlabb-positive-16bit.tif'));
  setStatus(png?`PNG 16 bit · ${g.width}×${g.height} · sRGB`:`TIFF 16 bit · ${g.width}×${g.height} · inbäddad sRGB-profil`);
 }catch(e){setStatus('Exportfel: '+e.message);throw e;}
 finally{await png?.abort();exportBusy=false;$('export').disabled=false;}
}
exportTiff=control=>exportRgb16('tiff',control);
function exportPng16(control){return exportRgb16('png16',control);}
function makeExportCanvas(){
 const im=working,c=configuration38(),g=exportGeometrySnapshot(im).g,canvas=document.createElement('canvas');canvas.width=g.width;canvas.height=g.height;
 const cx=canvas.getContext('2d',{colorSpace:'srgb'}),prepared=NSPixelKernel.prepare(im,c);
 const table=!g.presentation&&im.encoding==='linear'&&im.scale===65535&&(im.normalization||1)===1&&c.kind!=='reference'?technicalTables38(c):null,complete=!!(table&&technicalCache38?.complete);
 for(let y=0;y<g.height;){
  const rows=NSPresentation.rows(im,g,g,g.height-y),out=cx.createImageData(g.width,rows);
  if(g.presentation)NSPresentation.rgba(im,prepared,g,g,y,rows,false,out.data);
  else{const samples=NSPixelKernel.exportRows(im,c,g,y,rows,table,complete);for(let i=0;i<samples.length;i+=3){const j=i/3*4;out.data[j]=Math.round(samples[i]/257);out.data[j+1]=Math.round(samples[i+1]/257);out.data[j+2]=Math.round(samples[i+2]/257);out.data[j+3]=255;}}
  cx.putImageData(out,0,y);y+=rows;
 }
 return canvas;
};

