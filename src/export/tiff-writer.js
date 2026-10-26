/* TIFF and synchronous canvas export share prepared color and presentation sampling. */
'use strict';
function tiffHeader(w,h){const icc=NSSRGBProfile,nt=12,bitsOffset=8+2+nt*12+4,iccOffset=bitsOffset+6,pixelOffset=iccOffset+icc.length+(icc.length%2),ab=new ArrayBuffer(pixelOffset),v=new DataView(ab),tags=[[256,4,1,w],[257,4,1,h],[258,3,3,bitsOffset],[259,3,1,1],[262,3,1,2],[273,4,1,pixelOffset],[277,3,1,3],[278,4,1,h],[279,4,1,w*h*6],[284,3,1,1],[339,3,1,1],[34675,7,icc.length,iccOffset]];v.setUint16(0,0x4949,true);v.setUint16(2,42,true);v.setUint32(4,8,true);v.setUint16(8,nt,true);tags.forEach(([tag,type,n,value],i)=>{const p=10+i*12;v.setUint16(p,tag,true);v.setUint16(p+2,type,true);v.setUint32(p+4,n,true);v.setUint32(p+8,value,true);});for(let i=0;i<3;i++)v.setUint16(bitsOffset+i*2,16,true);new Uint8Array(ab).set(icc,iccOffset);return ab;}
// TIFF chunking keeps the UI responsive. The table is technical-only: profiles,
// saturation, shadows and highlights all retain the exact shared final pixel path.
exportTiff=async function(control={}){
 if(!exportReady())throw Error('Ingen exportklar bild finns.');
 exportBusy=true;$('exportTiff').disabled=true;
 try{
  const im=working,opts={...state},c=configuration38(opts),g=exportGeometrySnapshot(im,opts).g;
  control.check?.();
  if(g.width*g.height*6>=4294960000)throw Error('Bilden är för stor för klassisk TIFF.');
  const parts=[tiffHeader(g.width,g.height)],prepared=NSPixelKernel.prepare(im,c);
  for(let y=0;y<g.height;){
   control.check?.();
   const rows=g.presentation?NSPresentation.rows(im,g,g,g.height-y):Math.min(16,g.height-y),out=NSPresentation.tiff(im,c,g,y,rows,prepared);
   if(new Uint8Array(new Uint16Array([1]).buffer)[0]===1)parts.push(out);
   else{
    const bytes=new Uint8Array(out.length*2),dv=new DataView(bytes.buffer);
    for(let i=0;i<out.length;i++)dv.setUint16(i*2,out[i],true);
    parts.push(bytes);
   }
   if(g.presentation||y%64===0){setStatus(`TIFF ${Math.round(100*(y+rows)/g.height)} %`);await new Promise(r=>setTimeout(r,0));}
   control.progress?.(y+rows,g.height);y+=rows;
  }
  control.check?.();
  downloadBlob(new Blob(parts,{type:'image/tiff'}),exportName(rollingExport?activeFrame:null,'tif','filmlabb-positive-16bit.tif'));
  setStatus(`TIFF 16 bit · ${g.width}×${g.height} · inbäddad sRGB-profil`);
 }catch(e){setStatus('Exportfel: '+e.message);throw e;}
 finally{exportBusy=false;$('exportTiff').disabled=false;}
};
$('exportTiff').onclick=async()=>{try{await exportTiff();}catch(e){setStatus('Exportfel: '+e.message);}};
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

