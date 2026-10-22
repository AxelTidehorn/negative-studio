/* TIFF 6 RGB/gray decoder. Pixel samples stay unsigned 16-bit, never canvas-decoded.
   LZW uses TIFF early-change codes; Predictor 2 is undone per sample, not byte. */
(function(root){
'use strict';
const fail=m=>{throw Error(m);};
function header(buffer){
 const v=new DataView(buffer),size=v.byteLength;
 const check=(p,n)=>{if(!Number.isSafeInteger(p)||!Number.isSafeInteger(n)||p<0||n<0||p+n>size)fail('TIFF-data utanför filen');};
 check(0,8);const mark=v.getUint16(0),le=mark===0x4949;
 if(!le&&mark!==0x4d4d)fail('Ogiltig TIFF-byteordning');
 const u16=p=>{check(p,2);return v.getUint16(p,le);},u32=p=>{check(p,4);return v.getUint32(p,le);};
 if(u16(2)!==42)fail('BigTIFF stöds inte');
 // Select the largest full-resolution page, skipping reduced previews/masks.
 let at=u32(4),best=null;const seen=new Set(),sizes={1:1,2:1,3:2,4:4,7:1};
 while(at){
  if(seen.has(at)||seen.size>=64)fail('Ogiltig TIFF-sidkedja');seen.add(at);
  const n=u16(at),tags={};check(at+2,n*12+4);
  for(let i=0;i<n;i++){
   const p=at+2+i*12,t=u16(p),type=u16(p+2),count=u32(p+4),unit=sizes[type];
   if(!unit||![254,256,257,258,259,262,273,274,277,278,279,284,317,322,323,324,325,338,339,34675].includes(t))continue;
   if(!count||count>4000000)fail('Ogiltigt TIFF-fält');
   const off=count*unit<=4?p+8:u32(p+8);check(off,count*unit);
   tags[t]=type===1||type===7?new Uint8Array(buffer,off,count):Array.from({length:count},(_,j)=>type===3?u16(off+j*unit):u32(off+j*unit));
  }
  const area=(tags[256]?.[0]||0)*(tags[257]?.[0]||0);
  if(!(tags[254]?.[0]&5)&&area>(best?.area||0))best={tags,area};
  at=u32(at+2+n*12);
 }
 if(!best)fail('Ingen bildsida i TIFF-filen');
 const t=best.tags,one=(k,d)=>t[k]?.[0]??d,w=one(256),h=one(257),channels=one(277,1),bits=t[258]||[8],photo=one(262),compression=one(259,1),planar=one(284,1),orientation=one(274,1),predictor=one(317,1);
 if(!w||!h||w*h>100000000)fail('TIFF-gränsen är 100 megapixel');
 if(![0,1,2].includes(photo))fail('TIFF kräver RGB eller gråskala; CMYK/palett stöds inte');
 if(channels<(photo===2?3:1)||channels>4||![1,2].includes(planar))fail('TIFF-kanalformatet stöds inte');
 if(bits.some(b=>b!==bits[0])||![8,16].includes(bits[0])||(t[339]||[1]).some(x=>x!==1))fail('TIFF kräver 8/16 bitars osignerade heltal');
 if(![1,5,8,32946,32773].includes(compression))fail('TIFF-komprimering '+compression+' stöds inte (välj LZW, ZIP eller okomprimerad)');
 if(![1,2].includes(predictor)||orientation<1||orientation>8)fail('TIFF-predictor/orientering stöds inte');
 // Associated alpha would require unpremultiplication in the source color domain.
 if(t[338]?.[0]===1)fail('TIFF med premultiplicerad alfa stöds inte; spara utan alfa');
 const tiled=!!t[324],bw=tiled?one(322):w,bh=tiled?one(323):Math.min(h,one(278,h)),offsets=t[tiled?324:273],counts=t[tiled?325:279];
 if(!bw||!bh||bw*bh>100000000)fail('Ogiltig TIFF-blockstorlek');
 const nx=Math.ceil(w/bw),ny=Math.ceil(h/bh),blocks=nx*ny;
 if(!offsets||!counts||offsets.length!==blocks*(planar===2?channels:1)||counts.length!==offsets.length)fail('Felaktiga TIFF-strips/tiles');
 for(let i=0;i<offsets.length;i++)check(offsets[i],counts[i]);
 return {buffer,tiled,w,h,channels,bits:bits[0],photo,compression,planar,orientation,predictor,bw,bh,nx,ny,blocks,offsets,counts,le,icc:t[34675]?Uint8Array.from(t[34675]):null};
}
function unpack(bytes,length,compression){
 if(compression===1){if(bytes.length<length)fail('Ofullständiga TIFF-pixeldata');return bytes.subarray(0,length);}
 const out=new Uint8Array(length);let pos=0;
 if(compression===32773){
  for(let i=0;i<bytes.length&&pos<length;){const n=(bytes[i++]<<24)>>24;
   if(n>=0){const count=n+1;if(i+count>bytes.length||pos+count>length)fail('Skadad PackBits');out.set(bytes.subarray(i,i+count),pos);pos+=count;i+=count;}
   else if(n!==-128){const count=1-n;if(i>=bytes.length||pos+count>length)fail('Skadad PackBits');out.fill(bytes[i++],pos,pos+count);pos+=count;}
  }
 }else if(compression===5){
  const prefix=new Uint16Array(4096),suffix=new Uint8Array(4096),stack=new Uint8Array(4096);let bit=0,width=9,next=258,old=-1,first=0;
  while(bit+width<=bytes.length*8){let code=0;for(let b=0;b<width;b++,bit++)code=(code<<1)|((bytes[bit>>3]>>(7-(bit&7)))&1);
   if(code===256){width=9;next=258;old=-1;continue;}if(code===257)break;
   const current=code;let n=0;
   if(code===next&&old>=0){stack[n++]=first;code=old;}else if(code>=next)fail('Skadad TIFF-LZW-kod');
   while(code>=256){if(n>=4095)fail('Skadad TIFF-LZW-tabell');stack[n++]=suffix[code];code=prefix[code];}
   first=code;stack[n++]=first;if(pos+n>length)fail('För mycket TIFF-LZW-data');
   while(n)out[pos++]=stack[--n];
   if(old>=0&&next<4096){prefix[next]=old;suffix[next++]=first;if(next===(1<<width)-1&&width<12)width++;}old=current;
  }
 }else fail('ZIP-TIFF kräver asynkron avkodning');
 if(pos!==length)fail('Ofullständiga komprimerade TIFF-data');return out;
}
// Reuse a contiguous native-endian source instead of duplicating a large scan.
function direct(m){
 if(m.compression!==1||m.tiled||m.bits!==16||!m.le||m.orientation!==1||m.predictor!==1||m.planar!==1||m.photo!==2||m.channels!==3||m.offsets[0]%2||new Uint8Array(new Uint16Array([1]).buffer)[0]!==1)return null;
 for(let k=0;k<m.offsets.length;k++)if(m.counts[k]!==length(m,k)||(k&&m.offsets[k]!==m.offsets[k-1]+m.counts[k-1]))return null;
 return finish(m,new Uint16Array(m.buffer,m.offsets[0],m.w*m.h*3));
}
function allocate(m){return new Uint16Array(m.w*m.h*3);}
function place(m,out,k,bytes){
 const local=k%m.blocks,x0=(local%m.nx)*m.bw,y0=Math.floor(local/m.nx)*m.bh,tiled=!!m.tiled,
 rows=tiled?m.bh:Math.min(m.bh,m.h-y0),nc=m.planar===2?1:m.channels,plane=Math.floor(k/m.blocks),bpc=m.bits/8,
 view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),mask=m.bits===16?65535:255,previous=new Uint16Array(nc);
 for(let y=0;y<rows;y++){
  previous.fill(0);
  for(let x=0;x<m.bw;x++)for(let c=0;c<nc;c++){
   const i=((y*m.bw+x)*nc+c)*bpc;let value=bpc===2?view.getUint16(i,m.le):bytes[i];
   if(m.predictor===2)value=(value+previous[c])&mask;previous[c]=value;
   if(x0+x>=m.w||y0+y>=m.h)continue;
   const channel=m.planar===2?plane:c;if(channel>=(m.photo===2?3:1))continue;
   value*=bpc===1?257:1;if(m.photo===0)value=65535-value;
   const dest=((y0+y)*m.w+x0+x)*3;if(m.photo===2)out[dest+channel]=value;else out.fill(value,dest,dest+3);
  }
 }
}
function finish(m,data){
 const o=m.orientation,w=o>=5?m.h:m.w,h=o>=5?m.w:m.h;
 if(o!==1){const rotated=new Uint16Array(data.length);for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
  const dx=o===2||o===3?m.w-1-x:o===5||o===8?y:o===6||o===7?m.h-1-y:x,
  dy=o===3||o===4?m.h-1-y:o===5||o===6?x:o===7||o===8?m.w-1-x:y,
  a=(y*m.w+x)*3,b=(dy*w+dx)*3;rotated[b]=data[a];rotated[b+1]=data[a+1];rotated[b+2]=data[a+2];
 }data=rotated;}
 return {width:w,height:h,channels:3,bits:m.bits,data,icc:m.icc};
}
function length(m,k){return m.bw*(m.tiled?m.bh:Math.min(m.bh,m.h-Math.floor((k%m.blocks)/m.nx)*m.bh))*(m.planar===2?1:m.channels)*m.bits/8;}
function decodeSync(buffer){const m=header(buffer),reused=direct(m);if(reused)return reused;const out=allocate(m);for(let k=0;k<m.offsets.length;k++)place(m,out,k,unpack(new Uint8Array(buffer,m.offsets[k],m.counts[k]),length(m,k),m.compression));return finish(m,out);}
async function decode(buffer){
 const m=header(buffer),reused=direct(m);if(reused)return reused;const out=allocate(m);let yielded=performance.now();
 for(let k=0;k<m.offsets.length;k++){
  const bytes=new Uint8Array(buffer,m.offsets[k],m.counts[k]),expected=length(m,k);let decoded;
  if(m.compression===8||m.compression===32946){
   if(typeof DecompressionStream==='undefined')fail('Webbläsaren saknar ZIP-avkodning; spara TIFF som LZW eller okomprimerad');
   const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();decoded=new Uint8Array(expected);let offset=0;
   try{while(true){const {done,value}=await reader.read();if(done)break;if(offset+value.length>expected)fail('För mycket ZIP-TIFF-data');decoded.set(value,offset);offset+=value.length;}if(offset!==expected)fail('Ofullständiga ZIP-TIFF-data');}finally{await reader.cancel();}
  }else decoded=unpack(bytes,expected,m.compression);
  place(m,out,k,decoded);if(performance.now()-yielded>16){await new Promise(r=>setTimeout(r,0));yielded=performance.now();}
 }
 return finish(m,out);
}
root.NSTiff={decode,decodeSync};
})(globalThis);
