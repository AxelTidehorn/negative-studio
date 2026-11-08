/* RGB PNG stream encoder. RGB16 comes straight from the shared presentation
   sampler, never from canvas. Only a bounded scanline stripe is materialized. */
(function(root){
'use strict';
const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function chunk(name,data=new Uint8Array(0)){
 const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);
 for(let i=0;i<4;i++)out[i+4]=name.charCodeAt(i);out.set(data,8);
 let crc=-1;for(let i=4;i<out.length-4;i++)crc=table[(crc^out[i])&255]^(crc>>>8);
 v.setUint32(out.length-4,(crc^-1)>>>0);return out;
}
const signature=Uint8Array.of(137,80,78,71,13,10,26,10);
function colorChunks(){
 const gamma=new Uint8Array(4);new DataView(gamma.buffer).setUint32(0,45455);
 return [chunk('sRGB',Uint8Array.of(0)),chunk('gAMA',gamma)];
}
function withSrgb(bytes){
 // Native canvas encoders already output sRGB values. Preserve an existing
 // explicit profile, otherwise declare that domain without changing IDAT.
 if(bytes.length<33||!signature.every((v,i)=>bytes[i]===v))throw Error('Ogiltig PNG-kodning.');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let at=8;
 while(at+12<=bytes.length){const n=v.getUint32(at),name=String.fromCharCode(...bytes.subarray(at+4,at+8));if(at+n+12>bytes.length)throw Error('Ogiltig PNG-kodning.');if(name==='sRGB'||name==='iCCP')return bytes;if(name==='IDAT')break;at+=n+12;}
 const srgb=chunk('sRGB',Uint8Array.of(0)),out=new Uint8Array(bytes.length+srgb.length);out.set(bytes.subarray(0,33));out.set(srgb,33);out.set(bytes.subarray(33),33+srgb.length);return out;
}
function create(width,height,bits=16,{compress=true}={}){
 if(!Number.isSafeInteger(width*height*3)||width<1||height<1||width>0x7fffffff||height>0x7fffffff||![8,16].includes(bits))throw Error('Ogiltig PNG-storlek.');
 const ihdr=new Uint8Array(13),v=new DataView(ihdr.buffer);v.setUint32(0,width);v.setUint32(4,height);ihdr[8]=bits;ihdr[9]=2;
 const parts=[signature,chunk('IHDR',ihdr),...colorChunks()];let rows=0,closed=false,a=1,b=0,writer,drain;
 if(compress&&typeof CompressionStream==='function'){
  const stream=new CompressionStream('deflate');writer=stream.writable.getWriter();const reader=stream.readable.getReader();
  drain=(async()=>{try{while(true){const r=await reader.read();if(r.done)break;if(!closed)parts.push(chunk('IDAT',r.value));}}finally{reader.releaseLock();}})();drain.catch(()=>{});
 }else parts.push(chunk('IDAT',Uint8Array.of(0x78,0x01)));
 async function write(rgb,count){
  if(closed||!Number.isInteger(count)||count<1||rows+count>height||rgb.length!==width*count*3)throw Error('Fel antal PNG-rader.');
  const stride=width*3*(bits/8)+1,data=new Uint8Array(stride*count),dv=new DataView(data.buffer);
  for(let y=0;y<count;y++)for(let x=0;x<width*3;x++){
   const i=y*width*3+x,j=y*stride+1+x*(bits/8);
   if(bits===16)dv.setUint16(j,rgb[i]);else data[j]=rgb[i];
  }
  if(writer)await writer.write(data);
  else{
   for(let at=0;at<data.length;at+=65535){const raw=data.subarray(at,Math.min(data.length,at+65535)),block=new Uint8Array(5+raw.length),w=new DataView(block.buffer);w.setUint16(1,raw.length,true);w.setUint16(3,65535-raw.length,true);block.set(raw,5);parts.push(chunk('IDAT',block));}
   for(let at=0;at<data.length;at+=5552){const end=Math.min(data.length,at+5552);for(let i=at;i<end;i++){a+=data[i];b+=a;}a%=65521;b%=65521;}
  }
  rows+=count;
 }
 async function finish(){
  if(closed||rows!==height)throw Error('Ofullständig PNG-bild.');
  if(writer){await writer.close();await drain;}
  else{const tail=Uint8Array.of(1,0,0,255,255,0,0,0,0);new DataView(tail.buffer).setUint32(5,((b<<16)|a)>>>0);parts.push(chunk('IDAT',tail));}
  parts.push(chunk('IEND'));closed=true;const blob=new Blob(parts,{type:'image/png'});parts.length=0;return blob;
 }
 async function abort(){if(closed)return;closed=true;parts.length=0;if(writer){await writer.abort().catch(()=>{});await drain.catch(()=>{});}}
 return Object.freeze({write,finish,abort});
}
root.NSPng=Object.freeze({create,withSrgb});
})(globalThis);
