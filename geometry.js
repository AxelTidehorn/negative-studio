/* Beta 6 geometry foundation. Pure data/coordinates only; no rendering or analysis. */
(function(root){
'use strict';
const VERSION=1,FORMAT='negative-studio-roll-beta6',EPS=1e-12;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function fail(message){throw Error('Ogiltig geometri: '+message);}
function finite(v){return typeof v==='number'&&Number.isFinite(v);}
function rect(value){
 if(!object(value)||!['x','y','w','h'].every(k=>finite(value[k])))fail('rektangeln måste innehålla ändliga tal.');
 const {x,y,w,h}=value;
 if(x<0||y<0||w<=0||h<=0||x+w>1+EPS||y+h>1+EPS)fail('rektangeln ligger utanför bilden eller saknar yta.');
 return {x,y,w,h};
}
function rotation(value){
 if(!object(value)||!Number.isInteger(value.quarterTurns)||value.quarterTurns<0||value.quarterTurns>3||!finite(value.fineDegrees)||Math.abs(value.fineDegrees)>45)fail('rotationen måste ha 0–3 kvartvarv och finvinkel inom ±45°.');
 return {quarterTurns:value.quarterTurns,fineDegrees:value.fineDegrees};
}
function fromLegacy(degrees=0){
 if(!Number.isSafeInteger(degrees)||degrees%90!==0)fail('äldre rotation måste vara ett helt kvartvarv.');
 return {quarterTurns:((degrees/90)%4+4)%4,fineDegrees:0};
}
function validate(value){
 if(!object(value)||value.version!==VERSION)fail('okänd geometriversion.');
 const override=value.cropExportToFrameOverride;
 if(override!==null&&typeof override!=='boolean')fail('ogiltigt individuellt beskärningsundantag.');
 return {version:VERSION,rotation:rotation(value.rotation),compositionCrop:value.compositionCrop===null?null:rect(value.compositionCrop),cropExportToFrameOverride:override};
}
function create(degrees=0){return {version:VERSION,rotation:fromLegacy(degrees),compositionCrop:null,cropExportToFrameOverride:null};}
function effectiveCrop(value,shared){
 if(typeof shared!=='boolean')fail('köns beskärningsval måste vara booleskt.');
 const g=validate(value);return g.cropExportToFrameOverride===null?shared:g.cropExportToFrameOverride;
}
function syncLegacy(value,degrees,crop,shared){
 if(typeof crop!=='boolean'||typeof shared!=='boolean')fail('ogiltigt beskärningsval.');
 const g=value==null?create(degrees):validate(value);
 g.rotation.quarterTurns=fromLegacy(degrees).quarterTurns;
 g.cropExportToFrameOverride=crop===shared?null:crop;
 return g;
}
function withComposition(value,crop){const g=validate(value);g.compositionCrop=crop===null?null:rect(crop);return g;}
function transform(width,height,value){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<=0||height<=0||!Number.isSafeInteger(width*height))fail('ogiltig källstorlek.');
 const r=rotation(value),angle=(r.quarterTurns*90+r.fineDegrees)*Math.PI/180;
 // Exact matrices at quarter turns; arbitrary-angle helpers are never used by export.
 const c=r.fineDegrees===0?[1,0,-1,0][r.quarterTurns]:Math.cos(angle),s=r.fineDegrees===0?[0,1,0,-1][r.quarterTurns]:Math.sin(angle);
 const bounds={width:Math.abs(c)*width+Math.abs(s)*height,height:Math.abs(s)*width+Math.abs(c)*height};
 function point(p){if(!object(p)||!finite(p.x)||!finite(p.y))fail('ogiltig koordinat.');return p;}
 // Source-normalized pixel edges -> normalized rotated bounding box; y points down.
 function forward(p){point(p);const x=(p.x-.5)*width,y=(p.y-.5)*height;return {x:.5+(c*x-s*y)/bounds.width,y:.5+(s*x+c*y)/bounds.height};}
 function inverse(p){point(p);const x=(p.x-.5)*bounds.width,y=(p.y-.5)*bounds.height;return {x:.5+(c*x+s*y)/width,y:.5+(-s*x+c*y)/height};}
 return {bounds,forward,inverse,cos:c,sin:s};
}
function isValidCrop(width,height,value,crop){
 const t=transform(width,height,value),r=rect(crop);
 return [r.x,r.x+r.w].every(x=>[r.y,r.y+r.h].every(y=>{const p=t.inverse({x,y});return p.x>=-EPS&&p.y>=-EPS&&p.x<=1+EPS&&p.y<=1+EPS;}));
}
function autoValidCrop(width,height,value,aspect){
 const t=transform(width,height,value),r=rotation(value);
 // Largest CENTERED rectangle at a fixed aspect, defaulting to quarter-turned source.
 const a=aspect===undefined?(r.quarterTurns%2?height/width:width/height):aspect;
 if(!finite(a)||a<=0)fail('ogiltigt sidförhållande.');
 const c=Math.abs(t.cos),s=Math.abs(t.sin),h=Math.min(width/(a*c+s),height/(a*s+c)),w=a*h;
 return {x:Math.max(0,(t.bounds.width-w)/(2*t.bounds.width)),y:Math.max(0,(t.bounds.height-h)/(2*t.bounds.height)),w:Math.min(1,w/t.bounds.width),h:Math.min(1,h/t.bounds.height)};
}
function compositionTransform(width,height,value){
 const g=validate(value),t=transform(width,height,g.rotation),safe=autoValidCrop(width,height,g.rotation);
 // Composition lives INSIDE the automatically valid canvas, not its empty corners.
 const c=g.compositionCrop||{x:0,y:0,w:1,h:1};
 const region={x:safe.x+c.x*safe.w,y:safe.y+c.y*safe.h,w:c.w*safe.w,h:c.h*safe.h};
 return {
  region,bounds:{width:region.w*t.bounds.width,height:region.h*t.bounds.height},
  forward(p){const q=t.forward(p);return {x:(q.x-region.x)/region.w,y:(q.y-region.y)/region.h};},
  inverse(p){if(!object(p)||!finite(p.x)||!finite(p.y))fail('ogiltig koordinat.');return t.inverse({x:region.x+p.x*region.w,y:region.y+p.y*region.h});}
 };
}
function prepareProject(data){
 if(!object(data)||!['negative-studio-roll-v08','negative-studio-roll-beta3',FORMAT].includes(data.format)||!Array.isArray(data.frames))fail('okänt projektformat eller saknad bildlista.');
 const modern=data.format===FORMAT;
 if((modern&&data.geometryVersion!==VERSION)||(!modern&&data.geometryVersion!==undefined))fail('okänd projektgeometriversion.');
 function legacyCrop(f){const v=f.settings?.cropExport??false;if(typeof v!=='boolean')fail('ogiltigt äldre beskärningsval.');return v;}
 const shared=modern?data.cropExportToFrame:(data.frames.length?legacyCrop(data.frames[0]):false);
 if(typeof shared!=='boolean')fail('köns beskärningsval måste vara booleskt.');
 // Stage EVERY frame, including unmatched filenames, before the caller mutates app state.
 const frames=data.frames.map(f=>{
  if(!object(f)||typeof f.filename!=='string'||!object(f.settings))fail('ogiltig bildpost.');
  try{
   const crop=f.crop==null?null:rect(f.crop),coarse=fromLegacy(f.settings.rotation??0);
   const geometry=modern?validate(f.geometry):syncLegacy(null,f.settings.rotation??0,legacyCrop(f),shared);
   if(modern&&(geometry.rotation.quarterTurns!==coarse.quarterTurns||effectiveCrop(geometry,shared)!==legacyCrop(f)))fail('geometrin motsäger exportens kompatibilitetsfält.');
   return {...f,settings:{...f.settings},crop,geometry};
  }catch(e){throw Error(f.filename+': '+e.message);}
 });
 return {...data,geometryVersion:VERSION,cropExportToFrame:shared,frames};
}
root.NSGeometry=Object.freeze({VERSION,FORMAT,rect,rotation,fromLegacy,validate,create,effectiveCrop,syncLegacy,withComposition,transform,isValidCrop,autoValidCrop,compositionTransform,prepareProject});
})(globalThis);
