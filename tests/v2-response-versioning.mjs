import assert from 'node:assert/strict';
for(const f of ['import/raw-input','image/flat-field','image/image-model','conversion-v2/core','conversion-v2/render','conversion-v2/fast','conversion-v2/platform'])await import('../src/'+f+'.js');
const V=NSConversionV2,P=NSV2Platform,R=NSV2Render,width=64,height=48,rgb=[.8,.4,.2],im={width,height,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data:new Float32Array(width*height*3)};
for(let y=0;y<height;y++)for(let x=0;x<width;x++)im.data.set(rgb.map((v,c)=>v*10**-(.2+1.3*x/width+c*.05)),(y*width+x)*3);
const input={sourceKey:'version-fixture',recipe:{decoder:'fixture',version:'1',options:{}},capture:{session:'test',recipe:{decoder:'fixture'}},measurement:{measured:rgb,kind:'manual-region',status:'review'},area:{region:{x:0,y:0,w:1,h:1},status:'confirmed'}};
assert.equal(V.prior.id,'rec2020-common-prior-1');assert.equal(V.prior.version,2);
assert.equal(V.latestPrior.version,3);assert.notEqual(V.latestPrior.id,V.prior.id);
const legacy=P.prepare(im,{...input,calibration:V.prior}),saved=JSON.parse(JSON.stringify(legacy)),current=P.prepare(im,input);
assert.equal(legacy.algorithmVersion,1);assert.equal(current.algorithmVersion,2);
assert.equal(legacy.intent.analysisVersion,'robust-p60-highlight-1');assert.equal(current.intent.analysisVersion,'robust-p60-highlight-2');
P.validate(saved);P.validate(current);
const restored=P.prepare(im,{...input,previous:saved});assert.deepEqual(restored,saved,'opening an existing recipe keeps all frozen parameters and intent');
const oldKernel=V.compile(saved.source,saved.base,saved.calibration),roundTrip=V.compile(restored.source,restored.base,restored.calibration);
for(let i=0;i<im.data.length;i+=39){const j=Array.from(im.data.subarray(i,i+3)),a=oldKernel.pixel(j),b=roundTrip.pixel(j);
 assert.deepEqual(a,b);for(let c=0;c<3;c++)assert.ok(Math.abs(a.positive[c]-.18*10**((-Math.log10(j[c]/rgb[c])-1)/.65))<1e-12);
 assert.deepEqual(R.view(a.positive,saved.intent),R.view(b.positive,restored.intent));
}
for(const previous of [saved,JSON.parse(JSON.stringify(current))]){
 const changed=P.prepare(im,{...input,previous,measurement:{...input.measurement,measured:rgb.map(v=>v*1.05)}});
 assert.deepEqual(changed.calibration,previous.calibration);assert.equal(changed.algorithmVersion,previous.algorithmVersion);assert.notEqual(changed.intent.id,previous.intent.id);
}
const explicit=P.prepare(im,{...input,previous:current,calibration:V.prior});assert.equal(explicit.algorithmVersion,1);assert.deepEqual(explicit.calibration,V.prior);assert.equal(explicit.intent.analysisVersion,'robust-p60-highlight-1');
assert.throws(()=>P.validate({...saved,algorithmVersion:2}),/INCONSISTENT/);assert.throws(()=>P.validate({...current,algorithmVersion:1}),/INCONSISTENT/);
assert.throws(()=>P.validate({...current,algorithmVersion:99}),/VERSION/);
const project={format:P.PROJECT_FORMAT,v2SchemaVersion:1,conversionSchemaVersion:1,frames:[saved,current].map(v2Recipe=>({settings:{engine:'v2',conversionVersion:2,editVersion:2,v2Recipe}}))};P.validateProject(JSON.parse(JSON.stringify(project)));
console.log('PASS fresh CalibrationV3/algorithm2, exact legacy recipe/pixels/tonal model, frozen response across base edits, explicit old comparison and mixed-version project validation');
