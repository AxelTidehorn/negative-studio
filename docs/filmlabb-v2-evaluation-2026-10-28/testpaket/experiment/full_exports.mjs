import fs from 'node:fs';for(const f of ['srgb-profile','tiff-header','v2-core','v2-render','v2-output','v2-fast'])await import('../source/site/'+f+'.js');
for(const n of process.argv[2].split(',').map(Number)){
 const p=String(n).padStart(2,'0'),d=JSON.parse(fs.readFileSync('results/'+p+'_decode.json')),a=JSON.parse(fs.readFileSync('results/'+p+'_analysis.json')),m=JSON.parse(fs.readFileSync('results/'+p+'_metrics.json')),frozen=JSON.parse(fs.readFileSync('results/frozen_parameters.json')),s=d.source,b=fs.readFileSync('results/'+p+'_source.f32'),im={width:s.width,height:s.height,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(b.buffer,b.byteOffset,b.byteLength/4)},k=NSConversionV2.compile(s,a.base),g=NSV2Output.geometry(im,d.reference.exportCrop);
 for(const mode of ['technical','fixed','auto','E3_frozen']){
  const fast=NSV2Fast.compile(k,a.intent,{viewMode:mode==='E3_frozen'?'auto':mode});let sample=fast.pixel;
  if(mode==='E3_frozen'){const e=2**m.experiments.tone.EV,gain=frozen.positive_gain;sample=(r,g,b,out)=>{fast.technical(r,g,b,out);const scale=e/(1+(.2627*out[0]+.678*out[1]+.0593*out[2])*e);return NSV2Fast.display(out[0]*scale*gain[0],out[1]*scale*gain[1],out[2]*scale*gain[2],out);};}
  const fd=fs.openSync('results/'+p+'_full_'+mode+'.tif','w');fs.writeSync(fd,new Uint8Array(tiffHeader(g.width,g.height)));for(let y=0;y<g.height;y+=8){const rows=NSV2Output.fastRows(im,g,y,Math.min(8,g.height-y),sample,16);fs.writeSync(fd,new Uint8Array(rows.buffer,rows.byteOffset,rows.byteLength));}fs.closeSync(fd);console.log(p,mode,g.width,g.height);
 }
}
