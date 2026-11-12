/* Source/presentation geometry.
   Pure source/presentation geometry. No color processing or resampling. */
(function(root){
'use strict';
const VERSION=2,EPS=1e-10;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
function fail(message){throw Error('Ogiltig geometri: '+message);}
function rect(v){
 if(!object(v)||!['x','y','w','h'].every(k=>finite(v[k]))||v.x<0||v.y<0||v.w<=0||v.h<=0||v.x+v.w>1+1e-12||v.y+v.h>1+1e-12)fail('ogiltig normaliserad analysram.');
 return {x:v.x,y:v.y,w:v.w,h:v.h};
}
function composition(v){
 if(!object(v)||!['cx','cy','w','h'].every(k=>finite(v[k]))||Math.abs(v.cx)>2||Math.abs(v.cy)>2||v.w<=0||v.h<=0||v.w>4||v.h>4)fail('ogiltig komposition i rotationsplanet.');
 return {cx:v.cx,cy:v.cy,w:v.w,h:v.h};
}
function sourceSize(v){
 if(!object(v)||!Number.isSafeInteger(v.width)||!Number.isSafeInteger(v.height)||v.width<1||v.height<1||v.width>1000000||v.height>1000000||v.width*v.height>1000000000)fail('orimlig källstorlek.');
 return {width:v.width,height:v.height};
}
function rotation(v){
 if(!object(v)||!Number.isInteger(v.quarterTurns)||v.quarterTurns<0||v.quarterTurns>3||!finite(v.fineDegrees)||Math.abs(v.fineDegrees)>45)fail('rotationen måste ha 0–3 kvartvarv och finvinkel inom ±45°.');
 return {quarterTurns:v.quarterTurns,fineDegrees:v.fineDegrees};
}
function quarterRotation(degrees=0){
 if(!Number.isSafeInteger(degrees)||degrees%90!==0)fail('rotation måste vara ett helt kvartvarv.');
 return {quarterTurns:((degrees/90)%4+4)%4,fineDegrees:0};
}
function create(degrees=0){return {version:VERSION,rotation:quarterRotation(degrees),compositionCrop:null,sourceSize:null};}
function validate(v){
 if(!object(v)||v.version!==VERSION||'cropExportToFrameOverride' in v)fail('okänd geometriversion eller äldre utkastmodell.');
 const g={version:VERSION,rotation:rotation(v.rotation),compositionCrop:v.compositionCrop===null?null:composition(v.compositionCrop),sourceSize:v.sourceSize===null?null:sourceSize(v.sourceSize)};
 return g;
}
function transform(width,height,value){
 sourceSize({width,height});const r=rotation(value),a=(r.quarterTurns*90+r.fineDegrees)*Math.PI/180;
 const c=r.fineDegrees===0?[1,0,-1,0][r.quarterTurns]:Math.cos(a),s=r.fineDegrees===0?[0,1,0,-1][r.quarterTurns]:Math.sin(a);
 function point(p){if(!object(p)||!finite(p.x)||!finite(p.y))fail('ogiltig koordinat.');}
 function forward(p){point(p);const x=p.x-width/2,y=p.y-height/2;return {x:c*x-s*y,y:s*x+c*y};}
 function inverse(p){point(p);return {x:width/2+c*p.x+s*p.y,y:height/2-s*p.x+c*p.y};}
 return {forward,inverse,cos:c,sin:s,bounds:{width:Math.abs(c)*width+Math.abs(s)*height,height:Math.abs(s)*width+Math.abs(c)*height}};
}
// Same integer edge convention as CE.bounds, used only for presentation plans.
function pixelBounds(width,height,frame){
 sourceSize({width,height});if(frame==null)return {x0:0,y0:0,x1:width,y1:height};const r=rect(frame);
 const x0=Math.min(width-1,Math.ceil(r.x*width)),y0=Math.min(height-1,Math.ceil(r.y*height));
 return {x0,y0,x1:Math.min(width,Math.max(x0+1,Math.floor((r.x+r.w)*width))),y1:Math.min(height,Math.max(y0+1,Math.floor((r.y+r.h)*height)))};
}
function resolve(value,size){
 const g=validate(value);g.sourceSize=sourceSize(size);

 return g;
}
function withQuarterTurns(value,degrees){
 const g=value==null?create(degrees):validate(value),q=quarterRotation(degrees).quarterTurns,delta=(q-g.rotation.quarterTurns+4)%4;
 if(g.compositionCrop&&delta){
  const c=[1,0,-1,0][delta],s=[0,1,0,-1][delta],p=g.compositionCrop;
  g.compositionCrop={cx:c*p.cx-s*p.cy,cy:s*p.cx+c*p.cy,w:delta%2?p.h:p.w,h:delta%2?p.w:p.h};
 }
 g.rotation.quarterTurns=q;return g;
}
function withComposition(value,crop){const g=validate(value);g.compositionCrop=crop===null?null:composition(crop);return g;}
function domain(width,height,options={}){return pixelBounds(width,height,options.cropExportToFrame?options.analysisFrame:null);}
function isValidCrop(width,height,r,crop,options={}){
 const v=composition(crop),L=Math.max(width,height),t=transform(width,height,r),b=domain(width,height,options);
 return [-1,1].every(x=>[-1,1].every(y=>{const p=t.inverse({x:(v.cx+x*v.w/2)*L,y:(v.cy+y*v.h/2)*L});return p.x>=b.x0-EPS&&p.x<=b.x1+EPS&&p.y>=b.y0-EPS&&p.y<=b.y1+EPS;}));
}
function validPolygon(width,height,r,options={}){
 const t=transform(width,height,r),b=domain(width,height,options);
 return [[b.x0,b.y0],[b.x1,b.y0],[b.x1,b.y1],[b.x0,b.y1]].map(([x,y])=>t.forward({x,y}));
}
function autoValidCrop(width,height,r,aspect,options={}){
 const t=transform(width,height,r),b=domain(width,height,options),w=b.x1-b.x0,h=b.y1-b.y0,L=Math.max(width,height);
 const a=aspect===undefined?(r.quarterTurns%2?h/w:w/h):aspect;if(!finite(a)||a<=0||a>1000000||a<1e-6)fail('ogiltigt sidförhållande.');
 const outH=Math.min(w/(a*Math.abs(t.cos)+Math.abs(t.sin)),h/(a*Math.abs(t.sin)+Math.abs(t.cos))),center=t.forward({x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2});
 return {cx:center.x/L,cy:center.y/L,w:a*outH/L,h:outH/L};
}
function effectiveComposition(width,height,value,options={}){
 const g=validate(value);if(g.compositionCrop===null)return {crop:autoValidCrop(width,height,g.rotation,undefined,options),limited:false};
 const desired=g.compositionCrop,t=transform(width,height,g.rotation),b=domain(width,height,options),L=Math.max(width,height);
 let w=desired.w*L,h=desired.h*L;
 const scale=Math.min(1,(b.x1-b.x0)/(Math.abs(t.cos)*w+Math.abs(t.sin)*h),(b.y1-b.y0)/(Math.abs(t.sin)*w+Math.abs(t.cos)*h));w*=scale;h*=scale;
 const hx=(Math.abs(t.cos)*w+Math.abs(t.sin)*h)/2,hy=(Math.abs(t.sin)*w+Math.abs(t.cos)*h)/2;
 const p=t.inverse({x:desired.cx*L,y:desired.cy*L}),clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const center=t.forward({x:clamp(p.x,b.x0+hx,b.x1-hx),y:clamp(p.y,b.y0+hy,b.y1-hy)});
 const crop={cx:center.x/L,cy:center.y/L,w:w/L,h:h/L};
 return {crop,limited:['cx','cy','w','h'].some(k=>Math.abs(crop[k]-desired[k])>EPS)};
}
function compositionTransform(width,height,value,options={}){
 const g=validate(value);
 const t=transform(width,height,g.rotation),e=effectiveComposition(width,height,g,options),L=Math.max(width,height);
 let area={left:(e.crop.cx-e.crop.w/2)*L,top:(e.crop.cy-e.crop.h/2)*L,width:e.crop.w*L,height:e.crop.h*L};
 let output={width:Math.max(1,Math.floor(area.width)),height:Math.max(1,Math.floor(area.height))};
 // Exact quarter-turn plan. Never round-trip integer sizes via normalized floats.
 const valid=domain(width,height,options);
 if(g.rotation.fineDegrees===0&&g.compositionCrop===null){
  const b=valid,p=t.forward({x:(b.x0+b.x1)/2,y:(b.y0+b.y1)/2});
  const w=g.rotation.quarterTurns%2?b.y1-b.y0:b.x1-b.x0,h=g.rotation.quarterTurns%2?b.x1-b.x0:b.y1-b.y0;
  area={left:p.x-w/2,top:p.y-h/2,width:w,height:h};output={width:w,height:h};
 }

 return {area,output,limited:e.limited,
  forward(p){const q=t.forward(p);return {x:(q.x-area.left)/area.width,y:(q.y-area.top)/area.height};},
  inverse(p){return t.inverse({x:area.left+p.x*area.width,y:area.top+p.y*area.height});},
  sample(x,y){return t.inverse({x:area.left+(x+.5)*area.width/output.width,y:area.top+(y+.5)*area.height/output.height});}
 };
}
// Full rotated source context for technical-frame/composition editing only.
// Final preview/export still use compositionTransform, without empty corners.
function contextTransform(width,height,value){
 const g=validate(value),t=transform(width,height,g.rotation),area={left:-t.bounds.width/2,top:-t.bounds.height/2,width:t.bounds.width,height:t.bounds.height};
 return {area,output:{width:Math.max(1,Math.floor(area.width)),height:Math.max(1,Math.floor(area.height))},
  inverse(p){return t.inverse({x:area.left+p.x*area.width,y:area.top+p.y*area.height});},
  forward(p){const q=t.forward(p);return {x:(q.x-area.left)/area.width,y:(q.y-area.top)/area.height};}};
}
function viewTransform(width,height,value,view,options={}){
 if(!object(view)||!['width','height','zoom','panX','panY'].every(k=>finite(view[k]))||view.width<=0||view.height<=0||view.zoom<=0)fail('ogiltig visningsmatris.');
 const p=compositionTransform(width,height,value,options),scale=Math.min(view.width/p.area.width,view.height/p.area.height)*view.zoom;
 const ox=view.width/2+view.panX,oy=view.height/2+view.panY;
 return {forward(s){const q=p.forward(s);return {x:ox+(q.x-.5)*p.area.width*scale,y:oy+(q.y-.5)*p.area.height*scale};},inverse(v){return p.inverse({x:.5+(v.x-ox)/(p.area.width*scale),y:.5+(v.y-oy)/(p.area.height*scale)});}};
}
root.NSGeometry=Object.freeze({VERSION,rect,composition,sourceSize,rotation,quarterRotation,create,validate,transform,pixelBounds,resolve,withQuarterTurns,withComposition,isValidCrop,validPolygon,autoValidCrop,effectiveComposition,compositionTransform,contextTransform,viewTransform});
})(globalThis);
