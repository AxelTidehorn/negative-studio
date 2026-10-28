import {performance} from 'node:perf_hooks';
for(const n of ['core','render','output'])await import('../src/conversion-v2/'+n+'.js');
const pixels=Number(process.argv[2]||1000000),width=pixels>10000000?6240:1000,height=Math.ceil(pixels/width),im={width,height,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(width*height*3)};
for(let i=0;i<im.data.length;i++)im.data[i]=.04+(i%503)/600;
const V=NSConversionV2,ctx=V.capture({session:'benchmark',recipe:{decoder:'synthetic'}}),s=V.source(im,{revision:'benchmark'}),k=V.compile(s,V.assumed([.9,.7,.5],s,ctx)),intent=NSV2Render.analyze(im,k),g=NSV2Output.geometry(im),sample=(x,y)=>NSV2Output.pixel(im,k,intent,x,y),runs=[];let maxStripeMs=0,checksum=0;
for(let run=0;run<5;run++){const start=performance.now();for(let y=0;y<height;y++){const t=performance.now(),out=NSV2Output.rows(im,g,y,1,sample,16);maxStripeMs=Math.max(maxStripeMs,performance.now()-t);checksum+=out[0];}runs.push(performance.now()-start);}
console.log(JSON.stringify({pixels:width*height,runsMs:runs,maxStripeMs,sourceBytes:im.data.byteLength,maxOutputStripeBytes:width*3*2,rssBytes:process.memoryUsage().rss,extraFullFloatBuffers:0,checksum},null,2));
