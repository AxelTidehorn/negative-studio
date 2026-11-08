/* Independent PNG reader for export verification (Node zlib, all PNG filters).
   Production never depends on this helper or a canvas decoder's 8-bit view. */
import assert from 'node:assert/strict';import {inflateSync} from 'node:zlib';
export function decodePng(input){
 const bytes=Buffer.from(input);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');let at=8,header,ended=false,srgb=false;const compressed=[];
 while(at<bytes.length){const n=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+n);assert.ok(at+n+12<=bytes.length);
  let crc=-1;for(const byte of bytes.subarray(at+4,at+8+n)){crc^=byte;for(let k=0;k<8;k++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}assert.equal((crc^-1)>>>0,bytes.readUInt32BE(at+8+n),'CRC '+type);
  if(type==='IHDR'){assert.equal(at,8);header={width:data.readUInt32BE(0),height:data.readUInt32BE(4),bits:data[8],type:data[9]};assert.equal(data[12],0);}
  if(type==='sRGB'||type==='iCCP')srgb=true;if(type==='IDAT')compressed.push(data);at+=n+12;if(type==='IEND'){ended=true;break;}
 }assert.ok(ended);assert.equal(at,bytes.length);assert.ok(header&&[8,16].includes(header.bits)&&[2,6].includes(header.type));
 const {width,height,bits,type}=header,channels=type===2?3:4,bpp=channels*bits/8,stride=width*bpp,raw=inflateSync(Buffer.concat(compressed));assert.equal(raw.length,(stride+1)*height);
 const scan=Buffer.alloc(stride*height),paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];assert.ok(filter<=4);for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=bpp?scan[i-bpp]:0,b=y?scan[i-stride]:0,c=y&&x>=bpp?scan[i-stride-bpp]:0,v=raw[y*(stride+1)+1+x];scan[i]=v+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0);}}
 const rgb=bits===16?new Uint16Array(width*height*3):new Uint8Array(width*height*3);for(let i=0;i<width*height;i++)for(let k=0;k<channels;k++){const j=(i*channels+k)*bits/8,value=bits===16?scan.readUInt16BE(j):scan[j];if(k===3)assert.equal(value,bits===16?65535:255);else rgb[i*3+k]=value;}
 return {...header,srgb,data:rgb};
}
