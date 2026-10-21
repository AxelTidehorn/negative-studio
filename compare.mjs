/* Aligned numeric RGB comparison. Descriptors: {width,height,channels:3,scale,
   encoding:'linear-srgb'|'srgb',data:[...]} or dataPath + dtype:u8/u16le/f32le.
   This measures change, not photographic quality. */
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
export function compare(a,b){
 for(const key of ['width','height','encoding'])if(a[key]!==b[key])throw Error('Mismatched '+key+'; no implicit resize or color transform');
 if(!['linear-srgb','srgb'].includes(a.encoding))throw Error('Explicit RGB encoding required');
 const count=a.width*a.height;if(!Number.isSafeInteger(count)||count<1)throw Error('Invalid dimensions');
 for(const im of [a,b])if(im.channels!==3||!(im.scale>0)||im.data.length!==count*3)throw Error('Complete RGB and positive scale required');
 const stats=[0,1,2].map(()=>({sumA:0,sumB:0,mae:0,mse:0,max:0,clipA:0,clipB:0,histogramA:Array(256).fill(0),histogramB:Array(256).fill(0)}));
 for(let i=0;i<count*3;i++){
  const x=a.data[i]/a.scale,y=b.data[i]/b.scale;if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>1||y>1)throw Error('Samples must be finite and normalized to [0,1]');
  const d=Math.abs(x-y),s=stats[i%3];s.sumA+=x;s.sumB+=y;s.mae+=d;s.mse+=d*d;s.max=Math.max(s.max,d);if(x===0||x===1)s.clipA++;if(y===0||y===1)s.clipB++;s.histogramA[Math.round(x*255)]++;s.histogramB[Math.round(y*255)]++;
 }
 return {pixels:count,encoding:a.encoding,channels:stats.map(s=>({meanA:s.sumA/count,meanB:s.sumB/count,mae:s.mae/count,rmse:Math.sqrt(s.mse/count),max:s.max,clippedFractionA:s.clipA/count,clippedFractionB:s.clipB/count,histogramA:s.histogramA,histogramB:s.histogramB})),interpretation:'A difference is not evidence of better color. No verified color reference supplied; Delta E not computed.'};
}
export function loadDescriptor(filename){const im=JSON.parse(fs.readFileSync(filename));if(im.dataPath){const b=fs.readFileSync(path.resolve(path.dirname(filename),im.dataPath)),size={u8:1,u16le:2,f32le:4}[im.dtype];if(!size||b.length%size)throw Error('Invalid binary data');im.data=Array.from({length:b.length/size},(_,i)=>size===1?b[i]:im.dtype==='u16le'?b.readUInt16LE(i*2):b.readFloatLE(i*4));}return im;}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const [a,b,out]=process.argv.slice(2);if(!out)throw Error('Usage: node compare.mjs A.json B.json result.json');fs.writeFileSync(out,JSON.stringify(compare(loadDescriptor(a),loadDescriptor(b)),null,2));}
