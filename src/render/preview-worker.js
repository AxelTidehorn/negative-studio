importScripts('./raw-input.js','./creative-profiles.js','./color-parameters.js','./editing-engine.js','./conversion3.js','./v2-core.js','./v2-render.js','./v2-fast.js','./v2-platform.js','./render-core.js');
let source=null;
self.onmessage=({data:m})=>{try{
 if(m.type==='source'){source=m.image;return;}if(!source)throw Error('Missing preview source');
 const start=performance.now(),r=NSPixelKernel.render(source,m.config,m.mode,m.limit);
 if(m.mode==='split'){
  const positive=NSPixelKernel.render(source,m.config,'positive',m.limit);
  r.positive=positive.data;r.negative=NSPixelKernel.render(source,m.config,'negative',m.limit).data;
  // Comparison reports the edited positive, independent of the split boundary.
  r.bins=positive.bins;r.histogram=positive.histogram;
 }
 const transfer=[r.data.buffer,r.bins.buffer,r.histogram.red.buffer,r.histogram.green.buffer,r.histogram.blue.buffer];
 if(m.mode==='split')transfer.push(r.positive.buffer,r.negative.buffer);
 self.postMessage({id:m.id,renderMs:performance.now()-start,...r},transfer);
}catch(e){self.postMessage({id:m.id,error:e.message});}};
