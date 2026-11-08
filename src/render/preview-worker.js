importScripts('./raw-input.js','./profile-catalog.js','./profile-engine.js','./color-parameters.js','./editing-engine.js','./conversion3.js','./v2-core.js','./v2-render.js','./v2-fast.js','./v2-platform.js','./render-core.js');
let source=null;
self.onmessage=({data:m})=>{try{
 if(m.type==='source'){source=m.image;NSPixelKernel.clearV2Positive();return;}if(!source)throw Error('Missing preview source');
 if(m.type==='v2-seed'){if(m.cacheKey===NSPixelKernel.v2PreviewKey(source,m.config))NSPixelKernel.installV2Positive(source,m.config,m.data);return;}
 const before=NSPixelKernel.v2PreviewMetrics().conversions,start=performance.now();
 if(m.type==='v2-positive'){
  const image=NSPixelKernel.v2PositiveImage(source,m.config),reconstructionMs=performance.now()-start,copyStart=performance.now(),data=image.data.slice();
  self.postMessage({type:'v2-positive',id:m.id,key:m.key,image:{...image,data},reconstructionMs,copyMs:performance.now()-copyStart,reconstructions:NSPixelKernel.v2PreviewMetrics().conversions-before},[data.buffer]);return;
 }
 const r=NSPixelKernel.render(source,m.config,m.mode,m.limit);
 if(m.mode==='split'){
  const positive=NSPixelKernel.render(source,m.config,'positive',m.limit);
  r.positive=positive.data;r.negative=NSPixelKernel.render(source,m.config,'negative',m.limit).data;
  // Comparison reports the edited positive, independent of the split boundary.
  r.bins=positive.bins;r.histogram=positive.histogram;
 }
 const transfer=[r.data.buffer,r.bins.buffer,r.histogram.red.buffer,r.histogram.green.buffer,r.histogram.blue.buffer];
 if(m.mode==='split')transfer.push(r.positive.buffer,r.negative.buffer);
 self.postMessage({id:m.id,renderMs:performance.now()-start,reconstructions:NSPixelKernel.v2PreviewMetrics().conversions-before,v2Cache:NSPixelKernel.v2PreviewMetrics(),...r},transfer);
}catch(e){self.postMessage({id:m.id,error:e.message});}};
