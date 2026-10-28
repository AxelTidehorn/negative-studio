(function(root){
'use strict';
const V=root.NSConversionV2,R=root.NSV2Render;
function geometry(im,crop={x:0,y:0,w:1,h:1},rotation=0,limit=Infinity){const x=Math.floor(crop.x*im.width),y=Math.floor(crop.y*im.height),w=Math.max(1,Math.min(im.width-x,Math.round(crop.w*im.width))),h=Math.max(1,Math.min(im.height-y,Math.round(crop.h*im.height))),turned=rotation%180!==0,scale=Math.min(1,limit/Math.max(w,h)),width=Math.max(1,Math.round((turned?h:w)*scale)),height=Math.max(1,Math.round((turned?w:h)*scale));return {x,y,w,h,rotation,width,height,sourceWidth:turned?h:w,sourceHeight:turned?w:h,at(u,v){return rotation===90?[x+v,y+h-1-u]:rotation===180?[x+w-1-u,y+h-1-v]:rotation===270?[x+w-1-v,y+u]:[x+u,y+v];}};}
function pixel(im,k,intent,x,y,viewMode='auto'){return R.view(k.pixel(V.read(im,(y*im.width+x)*3)).positive,intent,viewMode);}
// Area integrates CONVERTED positive samples; bounded output rows, no float image.
function rows(im,g,y0,count,sample,bits=8){const channels=bits===8?4:3,out=bits===8?new Uint8ClampedArray(g.width*count*4):new Uint16Array(g.width*count*3),dx=g.sourceWidth/g.width,dy=g.sourceHeight/g.height;
 for(let y=0;y<count;y++)for(let x=0;x<g.width;x++){const sum=[0,0,0],left=x*dx,right=(x+1)*dx,top=(y0+y)*dy,bottom=(y0+y+1)*dy;
 for(let sy=Math.floor(top);sy<Math.ceil(bottom);sy++)for(let sx=Math.floor(left);sx<Math.ceil(right);sx++){const weight=(Math.min(right,sx+1)-Math.max(left,sx))*(Math.min(bottom,sy+1)-Math.max(top,sy))/(dx*dy),[u,v]=g.at(Math.min(g.sourceWidth-1,sx),Math.min(g.sourceHeight-1,sy)),p=sample(u,v);for(let c=0;c<3;c++)sum[c]+=p[c]*weight;}
 const i=(y*g.width+x)*channels;for(let c=0;c<3;c++)out[i+c]=Math.round(Math.max(0,Math.min(1,R.encode(sum[c])))*(bits===8?255:65535));if(bits===8)out[i+3]=255;
 }return out;}
async function canvas(im,g,sample){const cv=document.createElement('canvas');cv.width=g.width;cv.height=g.height;const cx=cv.getContext('2d',{colorSpace:'srgb'});for(let y=0;y<g.height;y++){const n=1;cx.putImageData(new ImageData(rows(im,g,y,n,sample),g.width,n),0,y);await new Promise(r=>setTimeout(r,0));}return cv;}
async function tiff(im,g,sample){if(g.width*g.height*6>=4294960000)throw Error('TIFF_TOO_LARGE');const parts=[tiffHeader(g.width,g.height)];for(let y=0;y<g.height;y++){const out=rows(im,g,y,1,sample,16),bytes=new Uint8Array(out.length*2),dv=new DataView(bytes.buffer);for(let i=0;i<out.length;i++)dv.setUint16(i*2,out[i],true);parts.push(bytes);await new Promise(r=>setTimeout(r,0));}return new Blob(parts,{type:'image/tiff'});}
// Same box footprints as rows(), with scalar coordinates and one reusable RGB.
function fastRows(im,g,y0,count,sample,bits=8){
 const channels=bits===8?4:3,out=bits===8?new Uint8ClampedArray(g.width*count*4):new Uint16Array(g.width*count*3),p=new Float64Array(3),dx=g.sourceWidth/g.width,dy=g.sourceHeight/g.height,scale=bits===8?255:65535;
 for(let y=0;y<count;y++)for(let x=0;x<g.width;x++){
  const left=x*dx,right=(x+1)*dx,top=(y0+y)*dy,bottom=(y0+y+1)*dy;let red=0,green=0,blue=0;
  for(let sy=Math.floor(top);sy<Math.ceil(bottom);sy++)for(let sx=Math.floor(left);sx<Math.ceil(right);sx++){
   const u=Math.min(g.sourceWidth-1,sx),v=Math.min(g.sourceHeight-1,sy),sourceX=g.rotation===90?g.x+v:g.rotation===180?g.x+g.w-1-u:g.rotation===270?g.x+g.w-1-v:g.x+u,sourceY=g.rotation===90?g.y+g.h-1-u:g.rotation===180?g.y+g.h-1-v:g.rotation===270?g.y+u:g.y+v;
   const i=(sourceY*im.width+sourceX)*3,weight=(Math.min(right,sx+1)-Math.max(left,sx))*(Math.min(bottom,sy+1)-Math.max(top,sy))/(dx*dy);
   sample(im.data[i],im.data[i+1],im.data[i+2],p,i);red+=p[0]*weight;green+=p[1]*weight;blue+=p[2]*weight;
  }
  const i=(y*g.width+x)*channels;out[i]=Math.round(Math.max(0,Math.min(1,R.encode(red)))*scale);out[i+1]=Math.round(Math.max(0,Math.min(1,R.encode(green)))*scale);out[i+2]=Math.round(Math.max(0,Math.min(1,R.encode(blue)))*scale);if(bits===8)out[i+3]=255;
 }return out;
}
// Source-row integration: each source pixel is converted once per engine,
// even when it straddles several output box footprints. Two linear rows only.
async function area(im,g,sample,bits=8,control={}){
 const channels=bits===8?4:3,out=bits===8?new Uint8ClampedArray(g.width*g.height*4):new Uint16Array(g.width*g.height*3),row=new Float64Array(g.width*3),acc=new Float64Array(row.length),p=new Float64Array(3),dx=g.sourceWidth/g.width,dy=g.sourceHeight/g.height,scale=bits===8?255:65535;let outputY=0;
 function flush(){for(let x=0;x<g.width;x++){const i=(outputY*g.width+x)*channels,j=x*3;out[i]=Math.round(Math.max(0,Math.min(1,R.encode(acc[j])))*scale);out[i+1]=Math.round(Math.max(0,Math.min(1,R.encode(acc[j+1])))*scale);out[i+2]=Math.round(Math.max(0,Math.min(1,R.encode(acc[j+2])))*scale);if(bits===8)out[i+3]=255;}outputY++;acc.fill(0);}
 for(let sy=0;sy<g.sourceHeight;sy++){
  control.check?.();row.fill(0);
  for(let sx=0;sx<g.sourceWidth;sx++){
   const sourceX=g.rotation===90?g.x+sy:g.rotation===180?g.x+g.w-1-sx:g.rotation===270?g.x+g.w-1-sy:g.x+sx,sourceY=g.rotation===90?g.y+g.h-1-sx:g.rotation===180?g.y+g.h-1-sy:g.rotation===270?g.y+sx:g.y+sy,i=(sourceY*im.width+sourceX)*3;
   sample(im.data[i],im.data[i+1],im.data[i+2],p,i);
   const x=Math.min(g.width-1,Math.floor(sx/dx)),j=x*3,edge=(x+1)*dx,left=(Math.min(sx+1,edge)-sx)/dx,right=(sx+1-edge)/dx;
   row[j]+=p[0]*left;row[j+1]+=p[1]*left;row[j+2]+=p[2]*left;
   if(right>0&&x+1<g.width){row[j+3]+=p[0]*right;row[j+4]+=p[1]*right;row[j+5]+=p[2]*right;}
  }
  const edge=(outputY+1)*dy,weight=(Math.min(sy+1,edge)-sy)/dy;for(let i=0;i<acc.length;i++)acc[i]+=row[i]*weight;
  if(sy+1>=edge-1e-9){flush();const remaining=(sy+1-edge)/dy;if(remaining>0&&outputY<g.height)for(let i=0;i<acc.length;i++)acc[i]+=row[i]*remaining;}
  if(control.tick)await control.tick(sy+1,g.sourceHeight);
 }
 return out;
}
root.NSV2Output={geometry,pixel,rows,fastRows,area,canvas,tiff};
})(globalThis);
