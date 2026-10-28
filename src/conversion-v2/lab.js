/* Standalone local owner. No project controller, app state, persistence or queue. */
(function(){
'use strict';
const V=NSConversionV2,R=NSV2Render,O=NSV2Output,$=id=>document.getElementById(id);
let im,s,ctx,base,previous,proposal,k,intent,legacy,locked,negativeImage,busy=false,selected=0;
const status=t=>$('status').textContent=t;
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
async function task(fn){if(busy)return;busy=true;$('file').disabled=true;$('session').disabled=true;$('controls').disabled=true;$('view').disabled=true;try{await fn();}catch(e){status(e.message);}finally{busy=false;$('file').disabled=false;$('session').disabled=false;$('controls').disabled=!im;$('view').disabled=!k;}}
function crop(){const r={};for(const key of ['x','y','w','h'])r[key]=Number($(key).value);if(Object.values(r).some(v=>!Number.isFinite(v))||r.x<0||r.y<0||r.w<=0||r.h<=0||r.x+r.w>1.000001||r.y+r.h>1.000001)throw Error('INVALID_CROP');return r;}
function geo(limit=Infinity){return O.geometry(im,crop(),Number($('rotation').value),limit);}
const sampleB=(x,y)=>O.pixel(im,k,intent,x,y);
const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const sampleA=(x,y)=>legacy.pixel(V.read(im,(y*im.width+x)*3)).map(decode);
function snapshotA(){const region={x:0,y:0,w:1,h:1},response=NSColorCalibration.estimate(im,region,{base:base.rgb,light:[1,1,1],domain:'linear-rec2020'}),beta4=NSColorCalibration.analyze(im,region,response),opts={...NSProjectSettings.imageDefaults(),shadow:0,highlight:1,editVersion:1};const config=V.freeze(V.clone({kind:'calibrated4',opts,workingSpace:'rec2020',cal:{beta4},profile:{type:'color'},print:{},neutralProfile:true,neutralPrint:true,strength:0}));legacy=NSPixelKernel.compile(config);return config;}
let legacyConfig;
function technical(){k=V.compile(s,base,V.prior,ctx);if(!intent)intent=R.analyze(im,k);legacyConfig=snapshotA();}
async function show(){if(!k)throw Error('ACCEPT_BASE_FIRST');status('Renderar samma utsnitt…');const g=geo(1000);for(const [id,sample]of [['a',sampleA],['b',sampleB]]){const cv=await O.canvas(im,g,sample),dest=$(id);dest.width=cv.width;dest.height=cv.height;dest.getContext('2d').drawImage(cv,0,0);cv.width=cv.height=0;}$('recipe').textContent=JSON.stringify({conversionVersion:2,source:s,base:{id:base.id,origin:base.origin,rgb:base.rgb},calibration:k.calibration,render:intent,legacySnapshot:legacyConfig,analysis:'Full källa; crop/rotation ändrar inte analys. Basbyte behåller ton tills explicit återanalys.'},null,2);status('A/B klart · '+g.width+'×'+g.height+' · '+base.status+' · respons '+k.calibration.id);}
async function negative(){const g=O.geometry(im,undefined,0,1000),cv=await O.canvas(im,g,(x,y)=>R.display(V.read(im,(y*im.width+x)*3))),dest=$('negative');dest.width=cv.width;dest.height=cv.height;dest.getContext('2d').drawImage(cv,0,0);negativeImage=dest.getContext('2d').getImageData(0,0,dest.width,dest.height);cv.width=cv.height=0;}
async function load(file){
 im=null;s=null;base=null;previous=null;proposal=null;k=null;intent=null;legacy=null;$('measurement').textContent='';for(const id of ['a','b','negative']){$(id).width=1;$(id).height=1;}
 status('Avkodar full källa…');let raw,recipe,wb=null,format,verification='decoder',camera=null;
 const revision=crypto.randomUUID();
 if(/\.tiff?$/i.test(file.name)){if(!$('tiffConfirmed').checked)throw Error('TIFF_DOMAIN_CONFIRMATION_REQUIRED');raw=await NSTiff.decode(await file.arrayBuffer());if(raw.icc)throw Error('TIFF_ICC_NOT_VERIFIED: exportera TIFF utan profil med dokumenterat linjärt Rec.2020-recept');raw={...raw,data:Float32Array.from(raw.data,v=>v/65535),scale:1,colorSpace:'rec2020'};recipe={decoder:'filmlabb-tiff',version:'1',options:null};format='TIFF';verification='user-verified-recipe';}
 else{const options={...NSRawInput.options('wide'),useAutoWb:false,noInterpolation:false,halfSize:false,userQual:3,useCameraMatrix:3,highlight:0,threshold:0};const result=await NSRawDecoder.decode(file,'wide',{options});raw=result.im;recipe={decoder:result.provenance.decoder,version:result.provenance.version,options};wb=result.meta?.color_data?.cam_mul||null;camera=result.meta?.camera_model||null;format=result.provenance.format.toUpperCase();}
 im={width:raw.width,height:raw.height,data:raw.data,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020'};s=V.source(im,{format,revision,recipe,bitDepth:raw.bits||16,verification});ctx=V.capture({session:$('session').value.trim(),recipe:{...recipe,camera,compatibilityGuard:wb&&camera?null:revision},whiteBalance:wb});await negative();status('Källa laddad · rita filmbas direkt på negativet eller sök kandidater.');
}
$('file').onchange=()=>task(()=>load($('file').files[0]));
function presentProposal(m){proposal=m;$('measurement').textContent=JSON.stringify(m);status('Prov '+m.status+' · kontrollera att ytan är oexponerad film.');}
$('detect').onclick=()=>task(async()=>presentProposal(await NSV2Base.detect(im,s)));
$('accept').onclick=()=>task(async()=>{if(!proposal)throw Error('MEASURE_BASE_FIRST');previous=base;base=V.accept(proposal,s,ctx);technical();await show();});
$('prior').onclick=()=>task(async()=>{previous=base;base=V.assumed([1,1,1],s,ctx);technical();await show();});
$('undo').onclick=()=>task(async()=>{if(!previous)throw Error('NO_PREVIOUS_BASE');[base,previous]=[previous,base];technical();await show();});
$('lock').onclick=()=>task(async()=>{if(!base||base.origin!=='measured')throw Error('MEASURED_BASE_REQUIRED');locked=base;status('Uppmätt sessionsreferens låst i minnet.');});
$('reuse').onclick=()=>task(async()=>{if(!locked||!V.compatible(locked.capture,ctx))throw Error('LOCKED_BASE_INCOMPATIBLE_OR_CAPTURE_METADATA_MISSING');previous=base;base=locked;technical();await show();});
$('tone').onclick=()=>task(async()=>{if(!k)throw Error('ACCEPT_BASE_FIRST');intent=R.analyze(im,k);await show();});
$('run').onclick=$('show').onclick=()=>task(show);
$('toggle').onclick=()=>{selected=1-selected;$('aFigure').hidden=selected===1;$('bFigure').hidden=selected===0;$('pair').style.gridTemplateColumns='1fr';};
$('both').onclick=()=>{$('aFigure').hidden=$('bFigure').hidden=false;$('pair').style.gridTemplateColumns='';};
for(const [id,isTiff,isA]of [['jpeg',false,false],['tiff',true,false],['legacyJpeg',false,true],['legacyTiff',true,true]])$(id).onclick=()=>task(async()=>{status('Exporterar full upplösning…');const g=geo(),sample=isA?sampleA:sampleB;let blob;if(isTiff)blob=await O.tiff(im,g,sample);else{const cv=await O.canvas(im,g,sample);try{blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.95));if(!blob)throw Error('JPEG_CANVAS_LIMIT_OR_MEMORY');}finally{cv.width=cv.height=0;}}download(blob,(isA?'filmlabb-A':'filmlabb-v2')+(isTiff?'.tif':'.jpg'));status('Export klar · '+g.width+'×'+g.height+' · sRGB');});
$('diagnostic').onclick=()=>task(async()=>download(new Blob([JSON.stringify(NSV2Diagnostics.diagnostic(im,k,intent),null,2)],{type:'application/json'}),'filmlabb-v2-diagnostic.json'));
$('diff').onclick=()=>task(async()=>{$('diffResult').textContent=JSON.stringify(NSV2Diagnostics.compare(JSON.parse(await $('reportA').files[0].text()),JSON.parse(await $('reportB').files[0].text())),null,2);});
let start;
function point(e){const r=$('negative').getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};}
function loupe(p){const cv=$('loupe'),cx=cv.getContext('2d'),sx=Math.min(im.width-1,Math.floor(p.x*im.width)),sy=Math.min(im.height-1,Math.floor(p.y*im.height)),out=cx.createImageData(24,24);for(let y=0;y<24;y++)for(let x=0;x<24;x++){const u=Math.max(0,Math.min(im.width-1,sx+x-12)),v=Math.max(0,Math.min(im.height-1,sy+y-12)),q=R.display(V.read(im,(v*im.width+u)*3));for(let c=0;c<3;c++)out.data[(y*24+x)*4+c]=Math.round(R.encode(q[c])*255);out.data[(y*24+x)*4+3]=255;}const tmp=document.createElement('canvas');tmp.width=tmp.height=24;tmp.getContext('2d').putImageData(out,0,0);cx.imageSmoothingEnabled=false;cx.drawImage(tmp,0,0,192,192);}
$('negative').onpointerdown=e=>{if(!im||busy)return;start=point(e);if(negativeImage)$('negative').getContext('2d').putImageData(negativeImage,0,0);$('negative').setPointerCapture(e.pointerId);loupe(start);};
$('negative').onpointermove=e=>{if(start&&im&&!busy)loupe(point(e));};
$('negative').onpointercancel=()=>start=null;
$('negative').onpointerup=e=>{if(!start||busy)return;const end=point(e),r={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.max(1/im.width,Math.abs(start.x-end.x)),h:Math.max(1/im.height,Math.abs(start.y-end.y))};start=null;presentProposal(NSV2Base.measure(im,s,[r]));const cx=$('negative').getContext('2d');cx.strokeStyle='#00ff90';cx.strokeRect(r.x*$('negative').width,r.y*$('negative').height,r.w*$('negative').width,r.h*$('negative').height);};
// Test hook takes already verified linear data; no production project state.
globalThis.NSV2Lab={load,async useSource(image,descriptor,capture){im=image;s=descriptor;ctx=capture;V.validateSource(s,im);await negative();$('controls').disabled=false;},getSnapshot:()=>({source:s,base,calibration:k?.calibration,intent,legacy:legacyConfig})};
})();
