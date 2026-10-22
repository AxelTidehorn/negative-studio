importScripts('./raw-input.js','./creative-profiles.js','./render-core.js');
let source=null;
self.onmessage=({data:m})=>{try{if(m.type==='source'){source=m.image;return;}if(!source)throw Error('Missing preview source');const start=performance.now();const r=NSPixelKernel.render(source,m.config,m.mode,m.limit);self.postMessage({id:m.id,renderMs:performance.now()-start,...r},[r.data.buffer,r.bins.buffer]);}catch(e){self.postMessage({id:m.id,error:e.message});}};
