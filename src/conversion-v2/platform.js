/* Main-platform contract. Reuses core/render/fast; owns no image buffers. */
(function(root){
'use strict';
const V=root.NSConversionV2,R=root.NSV2Render,PROJECT_FORMAT='negative-studio-roll-v2',ALGORITHM=1;
const decoderOptions=()=>({...root.NSRawInput.options('wide'),useAutoWb:false,noInterpolation:false,halfSize:false,userQual:3,useCameraMatrix:3,highlight:0,threshold:0});
// Decoder identity belongs to the image source, independently of its converter.
const usesLockedSource=settings=>settings?.engine==='v2'||settings?.rawSourceRecipeV2===1&&settings.rawMode4==='wide';
const signature=x=>JSON.stringify(x),fingerprint=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;return h.toString(16);};
function read(im,i,x,y){const n=i/(im.channels||3),sx=x??n%im.width,sy=y??Math.floor(n/im.width),scale=(im.scale||1)*(im.normalization||1);return [0,1,2].map(c=>im.data[i+c]/scale*(im.flatField?root.NSFlatField.gain(im.flatField,sx,sy,im.width,im.height,c):1));}
function validSource(im){return !!im&&im.data instanceof Float32Array&&im.channels===3&&im.colorSpace==='rec2020'&&im.encoding==='linear'&&(im.scale||1)===1&&(im.normalization||1)===1;}
// Same point coordinates as the core's bounded analysis, including flat-field.
function pointImage(im,cols,rows){const data=new Float32Array(cols*rows*3);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const sx=Math.min(im.width-1,Math.floor((x+.5)*im.width/cols)),sy=Math.min(im.height-1,Math.floor((y+.5)*im.height/rows));data.set(read(im,(sy*im.width+sx)*3), (y*cols+x)*3);}return {width:cols,height:rows,data,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'};}
function preview(im,limit=1400){const s=Math.min(1,limit/Math.max(im.width,im.height));return pointImage(im,Math.max(1,Math.round(im.width*s)),Math.max(1,Math.round(im.height*s)));}
function region(im,cx=.5,cy=.5,size=320){const width=Math.min(size,im.width),height=Math.min(size,im.height),clamp=(v,hi)=>Math.max(0,Math.min(hi,v)),x0=clamp(Math.round(cx*im.width-width/2),im.width-width),y0=clamp(Math.round(cy*im.height-height/2),im.height-height),data=new Float32Array(width*height*3);for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set(read(im,((y0+y)*im.width+x0+x)*3),(y*width+x)*3);return {width,height,data,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',x0,y0};}
function prepare(im,{sourceKey,recipe,capture,measurement,area,previous}={}){
 if(!validSource(im))throw Error('V2_SOURCE_DOMAIN');
 const source=V.source({...im,flatField:null},{revision:'v2-'+fingerprint(sourceKey),format:recipe?.format||'TIFF',bitDepth:im.bits||16,recipe:{decoder:recipe?.decoder||'verified-linear-tiff',version:recipe?.version||null,options:recipe?.options||null},verification:recipe?.decoder?'decoder':'user-declared'});
 const ctx=V.capture(V.clone(capture)),m=measurement&&measurement.measured?.every(v=>Number.isFinite(v)&&v>0)?{...measurement,sourceRevision:source.revision}:null;
 let base=m?V.accept({...m,status:'review',origin:m.kind?.startsWith('manual')?'manual':'auto'},source,ctx):V.assumed([1,1,1],source,ctx);
 if(m?.acceptance==='automatic-platform')base={...base,source:'automatic-platform',acceptance:'automatic-platform'};
 if(m?.preview)base={...base,status:'proposal-preview',acceptance:'preview-only'};
 const calibration=previous?.calibration||V.prior;
 const k=V.compile(source,base,calibration),analysisSignature=R.analysisKey(k,{analysisArea:area});
 if(previous?.analysisSignature===analysisSignature){base={...base,id:previous.base.id};return V.freeze({...previous,source,base,intent:{...previous.intent,baseId:base.id,analysis:{...previous.intent.analysis,baseId:base.id}}});}
 const cols=Math.min(160,im.width),rows=Math.min(im.height,Math.max(1,Math.floor(24000/cols))),samples=im.flatField?pointImage(im,cols,rows):im;
 const intent=R.analyze(samples,k,{analysisArea:area});
 return V.freeze({schema:'FILMLABB.V2Recipe',version:1,algorithmVersion:ALGORITHM,source,base,calibration,intent,analysisSignature});
}
function validate(r){
 if(r?.schema!=='FILMLABB.V2Recipe'||r.version!==1||r.algorithmVersion!==ALGORITHM)throw Error('V2_RECIPE_VERSION');
 V.compile(r.source,r.base,r.calibration);R.toneOnly([.18,.18,.18],r.intent);R.prepareBalance(r.intent);
 if(r.intent.sourceRevision!==r.source.revision||r.intent.baseId!==r.base.id||r.intent.calibrationId!==r.calibration.id||!r.intent.analysis?.area||typeof r.analysisSignature!=='string')throw Error('V2_RECIPE_INCONSISTENT');
 return r;
}
function validateProject(p){
 const modern=p.format===PROJECT_FORMAT;
 if(modern&&(p.v2SchemaVersion!==1||p.conversionSchemaVersion!==1))throw Error('V2_PROJECT_VERSION');
 for(const f of p.frames||[]){const s=f.settings||{};if(s.rawSourceRecipeV2!==undefined&&(s.rawSourceRecipeV2!==1||s.rawMode4!=='wide'))throw Error('V2_SOURCE_RECIPE_VERSION');if(s.engine==='v2'||s.v2Recipe||s.rawSourceRecipeV2){if(!modern)throw Error('V2_PROJECT_FORMAT');if(s.v2Recipe)validate(s.v2Recipe);if(s.engine==='v2'&&(s.conversionVersion!==2||s.editVersion!==2))throw Error('V2_PROJECT_SETTINGS');}}
}
function diagnostic(im,config){
 const r=validate(config.v2),report=root.NSV2Diagnostics.diagnostic(im,V.compile(r.source,r.base,r.calibration),r.intent,{samplePixel:read,comparison:'main-platform'}),kernel=root.NSPixelKernel.compile(config),channels=[[],[],[]],luma=[];
 const step=Math.max(1,Math.ceil(im.width*im.height/24000)),decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
 for(let n=0;n<im.width*im.height;n+=step){const q=kernel.pixel(read(im,n*3)).map(decode);for(let c=0;c<3;c++)channels[c].push(q[c]);luma.push(.2126*q[0]+.7152*q[1]+.0722*q[2]);}
 const Q=[.01,.05,.5,.95,.99],percentiles=a=>{a.sort((x,y)=>x-y);return Q.map(q=>a[Math.floor((a.length-1)*q)]??null);};
 report.run.mainPlatform=true;report.run.algorithmVersion=r.algorithmVersion;
 report.creative={status:'measured',value:{kind:'Editing2',version:root.NSEditing2.version(config.opts.editVersion),options:root.NSEditing2.options(config.opts),profile:config.profile,profileStrength:config.strength,print:config.print}};
 report.statistics.platformOutput={status:'estimated',methodVersion:'main-v2-output-1',value:{domain:'linear-srgb',basis:'Full-source bounded point samples after V2, creative profile/print and Editing 2.0; before geometric filtering',samples:luma.length,quantiles:Q,channels:channels.map(percentiles),luminance:percentiles(luma)}};
 report.output.value.scope='V2 automatic positive before platform creative edits; platformOutput describes the final edited pixels';
 report.output.value.filter='Main-platform projection sampling; bounded source-point preview; conversion before geometric filtering';
 if(im.flatField)report.capture.flatField={status:'measured',value:{id:im.flatField.id,appliedOnce:true},methodVersion:'main-source-read-1'};
 return report;
}
root.NSV2Platform={PROJECT_FORMAT,ALGORITHM,decoderOptions,usesLockedSource,signature,fingerprint,read,validSource,preview,region,prepare,validate,validateProject,diagnostic};
})(globalThis);
