import assert from 'node:assert/strict';
for(const f of ['import/raw-input','image/flat-field','image/image-model','editing/profile-catalog','editing/profile-engine','color/parameters','editing/editing-engine','conversion-v2/core','conversion-v2/render','conversion-v2/fast','conversion-v2/platform','color/render-core'])await import('../src/'+f+'.js');
const P=NSV2Platform,K=NSPixelKernel,rgb=[.8,.4,.2],im={width:31,height:19,channels:3,scale:1,normalization:1,encoding:'linear',colorSpace:'rec2020',previewRevision:1,data:new Float32Array(31*19*3)};
for(let n=0;n<im.width*im.height;n++)for(let c=0;c<3;c++)im.data[n*3+c]=rgb[c]*10**(-(.15+1.5*(n%31)/31+.05*c));
const recipe=P.prepare(im,{sourceKey:'cache-fixture',recipe:{decoder:'fixture',version:'1'},capture:{session:'fixture',recipe:{decoder:'fixture'}},measurement:{measured:rgb,kind:'manual-region',status:'review'},area:{region:{x:0,y:0,w:1,h:1},status:'confirmed'}}),config={kind:'v2',v2:recipe,opts:{...NSEditing2.neutral,editVersion:2},profile:{type:'color'},print:{contrast:1,shoulder:0},neutralProfile:true,neutralPrint:true,strength:0};
const positive=K.v2PositiveImage(im,config),fast=NSV2Fast.compile(NSConversionV2.compile(recipe.source,recipe.base,recipe.calibration),recipe.intent),out=new Float64Array(3);
assert.ok(positive.data instanceof Float32Array);assert.equal(positive.encoding,'srgb');assert.equal(positive.colorSpace,'srgb');assert.equal(positive.scale,1);
for(let n=0;n<im.width*im.height;n++){const p=P.read(im,n*3);fast.pixel(...p,out);for(let c=0;c<3;c++)assert.equal(positive.data[n*3+c],Math.fround(NSV2Render.encode(out[c])));}
const before=K.v2PreviewMetrics().conversions;
for(const changes of [{opts:{...config.opts,exposure:1,vibrance:60}},{look:{id:'film.kodak-gold-200',strength:.7}},{monochrome:true},{v2:{...recipe,intent:{...recipe.intent,id:'metadata-only'},base:{...recipe.base,id:'metadata-only'}}}])assert.equal(K.v2PositiveImage(im,{...config,...changes}).data,positive.data);
assert.equal(K.v2PreviewMetrics().conversions,before);
const mutate=[c=>c.v2.base.rgb[0]*=1.01,c=>c.v2.source.revision='changed',c=>c.v2.calibration.offset[0]+=.01,c=>c.v2.intent.exposure+=.1,c=>c.v2.intent.output={version:2},c=>c.v2.intent.colorCorrection={...c.v2.intent.colorCorrection,version:999},c=>c.v2.intent.photographic={version:1}];
for(const fn of mutate){const c=structuredClone(config);fn(c);assert.notEqual(K.v2PreviewKey(im,c),K.v2PreviewKey(im,config));assert.equal(K.cachedV2Positive(im,c),null);}
for(const change of [{previewRevision:2},{normalization:2},{flatField:{size:1,gains:[1.01,1,1]}},{encoding:'srgb'},{colorSpace:'srgb'}])assert.equal(K.cachedV2Positive({...im,...change},config),null);
const key=K.v2PreviewKey(im,config);im.previewRevision++;assert.notEqual(K.v2PreviewKey(im,config),key);assert.equal(K.cachedV2Positive(im,config),null);im.previewRevision--;
const copy=positive.data.slice();K.clearV2Positive();assert.equal(K.cachedV2Positive(im,config),null);K.installV2Positive(im,config,copy);assert.equal(K.v2PositiveImage(im,config).data,copy);assert.equal(K.v2PreviewMetrics().conversions,before);
assert.throws(()=>K.installV2Positive(im,config,new Uint8Array(copy.length)),/INVALID/);assert.throws(()=>K.v2PositiveImage({...im,width:2000001,height:1},config),/LIMIT/);
console.log('PASS Float32 encoded-sRGB cache matches existing CPU math exactly; edits/profiles/print reuse, full recipe/source invalidation, revision updates, transfer adoption and bounded allocation');
