import assert from 'node:assert/strict';import {harness} from './helpers/app-harness.mjs';import {negative,region} from './helpers/conversion3-fixtures.mjs';
const h=harness();h.set('working',negative({width:48,height:32}));h.set('cropRegion',region);
h.run(`render=()=>{};scheduleRender=()=>{};workingPreview=working;src=new ImageData(working.width,working.height);previewSrc=src;sourceInfo={encoding:'linear',colorSpace:'srgb',domain:'fixture'};state={...defaultState(),cropConfirmed:true};roll=[{file:{name:'a.tif'},settings:{...state},geometry:NSGeometry.create(),crop:{...cropRegion}}];activeFrame=0;`);
let baseline;
for(const id of ['log39','calibrated4','density3','curve3','matrix3']){
 h.run(`state.engine='${id}';analyzeLevels();`);const c=h.run('configuration38()'),im=h.run('working'),K=h.context.NSPixelKernel;
 assert.equal(c.kind,id);assert.equal(c.opts.editVersion,2);if(id.endsWith('3')&&id!=='log39')assert.ok(h.context.NSConversion3.valid(c.conversion3));
 const prepared=K.prepare(im,c),g=h.context.NSPresentation.plan(im,h.context.NSGeometry.create(90),false,null),out=h.context.NSPresentation.tiff(im,c,g,0,g.height,prepared);
 assert.equal(out.length,im.width*im.height*3);for(let y=0;y<im.height;y+=7)for(let x=0;x<im.width;x+=7){const i=(y*im.width+x)*3,p=K.compile(c).pixel(Array.from(im.data.subarray(i,i+3)));assert.deepEqual(Array.from(prepared.pixel(i)),Array.from(p));}
 // Integer source preparation, sRGB decoding and spatial correction use original coordinates.
 for(const encoding of ['linear','srgb'])for(const flat of [false,true]){
  const width=9,height=7,scale=65535,source={width,height,channels:3,scale,encoding,data:Uint16Array.from({length:width*height*3},(_,i)=>Math.round(scale*(encoding==='srgb'?h.context.NSColorEngine.encode(.02+(i%71)/100):.02+(i%71)/100)))};
  if(flat)source.flatField={size:2,gains:Array.from({length:12},(_,i)=>1+i*.01)};
  const prepared=K.prepare(source,c),kernel=K.compile(c);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*3,expected=kernel.pixel(h.context.NSColorEngine.pixel(source,x,y));assert.deepEqual(Array.from(prepared.pixel(i,x,y)),Array.from(expected));}
 }
 const snapshot=h.run('JSON.stringify({cropRegion,geometry:roll[0].geometry,exposure:state.exposure,profile:rollShared.profile})');if(!baseline)baseline=snapshot;else assert.equal(snapshot,baseline);
}
const counts=h.run('conversionAnalysisCount3');h.run(`state.engine='curve3';analyzeLevels();state.exposure=.5;configuration38();state.contrast=1.2;configuration38();`);assert.equal(h.run('conversionAnalysisCount3'),counts);
// New-format projects reject unsupported IDs/versions before geometry or app state mutation.
const C=h.context.NSConversion3;assert.throws(()=>C.validateProject({format:C.PROJECT_FORMAT,conversionSchemaVersion:99,frames:[]}),/Unsupported/);assert.throws(()=>C.validateProject({format:'negative-studio-roll-beta6',frames:[{settings:{engine:'curve3',conversionVersion:1}}]}),/versioned/);
h.run(`downloadBlob=b=>globalThis.projectBlob=b;$('saveSettings').onclick();`);const project=JSON.parse(await h.context.projectBlob.text());assert.equal(project.format,C.PROJECT_FORMAT);assert.equal(project.frames[0].settings.engine,'curve3');assert.equal(project.frames[0].settings.conversionVersion,1);assert.equal(project.frames[0].settings.editVersion,2);
console.log('PASS five real app calibrations/configurations, exact prepared pixels, rotated TIFF rows, independent editing, cache reuse, geometry/slider retention and conversion project version boundary');

const legacy=structuredClone(project);legacy.format=h.context.NSGeometry.FORMAT;legacy.frames[0].settings.engine='log39';delete legacy.frames[0].settings.editVersion;delete legacy.frames[0].settings.conversionVersion;
h.set('legacyImage',h.run('working'));h.run(`readFile=async()=>{hires=legacyImage;src=new ImageData(legacyImage.width,legacyImage.height);previewSrc=src;finishImport('legacy fixture');};`);
await h.elements.get('settingsFile').onchange({target:{files:[{text:async()=>JSON.stringify(legacy)}],value:'x'}});assert.equal(h.run('state.editVersion'),1);assert.equal(h.run('state.engine'),'log39');
h.run(`state.exposure=1;$('reset').onclick();`);assert.equal(h.run('state.editVersion'),1);
await h.run(`importRoll([{name:'new.png',type:'image/png'}])`);assert.equal(h.run('state.editVersion'),2);
console.log('PASS linear/sRGB integer and spatial source pixels, legacy projects without editing/version fields, legacy reset and genuinely new image defaults');
