(function(root){
'use strict';
const V=root.NSConversionV2,R=root.NSV2Render;
function geometry(im,crop={x:0,y:0,w:1,h:1},rotation=0,limit=Infinity){const x=Math.floor(crop.x*im.width),y=Math.floor(crop.y*im.height),w=Math.max(1,Math.min(im.width-x,Math.round(crop.w*im.width))),h=Math.max(1,Math.min(im.height-y,Math.round(crop.h*im.height))),turned=rotation%180!==0,scale=Math.min(1,limit/Math.max(w,h)),width=Math.max(1,Math.round((turned?h:w)*scale)),height=Math.max(1,Math.round((turned?w:h)*scale));return {width,height,sourceWidth:turned?h:w,sourceHeight:turned?w:h,at(u,v){return rotation===90?[x+v,y+h-1-u]:rotation===180?[x+w-1-u,y+h-1-v]:rotation===270?[x+w-1-v,y+u]:[x+u,y+v];}};}
function pixel(im,k,intent,x,y){return R.display(R.render(k.pixel(V.read(im,(y*im.width+x)*3)).positive,intent));}
// Area integrates CONVERTED positive samples; bounded output rows, no float image.
function rows(im,g,y0,count,sample,bits=8){const channels=bits===8?4:3,out=bits===8?new Uint8ClampedArray(g.width*count*4):new Uint16Array(g.width*count*3),dx=g.sourceWidth/g.width,dy=g.sourceHeight/g.height;
 for(let y=0;y<count;y++)for(let x=0;x<g.width;x++){const sum=[0,0,0],left=x*dx,right=(x+1)*dx,top=(y0+y)*dy,bottom=(y0+y+1)*dy;
 for(let sy=Math.floor(top);sy<Math.ceil(bottom);sy++)for(let sx=Math.floor(left);sx<Math.ceil(right);sx++){const weight=(Math.min(right,sx+1)-Math.max(left,sx))*(Math.min(bottom,sy+1)-Math.max(top,sy))/(dx*dy),[u,v]=g.at(Math.min(g.sourceWidth-1,sx),Math.min(g.sourceHeight-1,sy)),p=sample(u,v);for(let c=0;c<3;c++)sum[c]+=p[c]*weight;}
 const i=(y*g.width+x)*channels;for(let c=0;c<3;c++)out[i+c]=Math.round(Math.max(0,Math.min(1,R.encode(sum[c])))*(bits===8?255:65535));if(bits===8)out[i+3]=255;
 }return out;}
async function canvas(im,g,sample){const cv=document.createElement('canvas');cv.width=g.width;cv.height=g.height;const cx=cv.getContext('2d',{colorSpace:'srgb'});for(let y=0;y<g.height;y++){const n=1;cx.putImageData(new ImageData(rows(im,g,y,n,sample),g.width,n),0,y);await new Promise(r=>setTimeout(r,0));}return cv;}
async function tiff(im,g,sample){if(g.width*g.height*6>=4294960000)throw Error('TIFF_TOO_LARGE');const parts=[tiffHeader(g.width,g.height)];for(let y=0;y<g.height;y++){const out=rows(im,g,y,1,sample,16),bytes=new Uint8Array(out.length*2),dv=new DataView(bytes.buffer);for(let i=0;i<out.length;i++)dv.setUint16(i*2,out[i],true);parts.push(bytes);await new Promise(r=>setTimeout(r,0));}return new Blob(parts,{type:'image/tiff'});}
root.NSV2Output={geometry,pixel,rows,canvas,tiff};
})(globalThis);
