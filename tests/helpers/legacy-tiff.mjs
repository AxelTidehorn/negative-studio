// Historical minimal header used only to construct the 8-bit TIFF import fixture.
export function makeTiffHeader(width,height,pixelOffset){
 const tags=[
  [256,4,1,width],[257,4,1,height],[258,3,3,0],[259,3,1,1],[262,3,1,2],[273,4,1,pixelOffset],[277,3,1,3],[278,4,1,height],[279,4,1,width*height*6],[284,3,1,1],[339,3,1,1]
 ];
 const size=8+2+tags.length*12+4+6,ab=new ArrayBuffer(size),v=new DataView(ab);v.setUint8(0,73);v.setUint8(1,73);v.setUint16(2,42,true);v.setUint32(4,8,true);v.setUint16(8,tags.length,true);
 for(let i=0;i<tags.length;i++){const [tag,type,count,value]=tags[i],p=10+i*12;v.setUint16(p,tag,true);v.setUint16(p+2,type,true);v.setUint32(p+4,count,true);v.setUint32(p+8,tag===258?size-6:value,true)}
 const bits=size-6;v.setUint16(bits,16,true);v.setUint16(bits+2,16,true);v.setUint16(bits+4,16,true);return ab;
}
