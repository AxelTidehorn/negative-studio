/* Allocation-free CPU path. core.js/render.js remain the Float64 oracle.
   Output arguments belong to the caller; no source or recipe is modified. */
(function(root){
'use strict';
const V=root.NSConversionV2,R=root.NSV2Render;
const clamp=x=>Math.max(0,Math.min(1,x));
function display(r,g,b,out,legacy=false){
 const qr=1.6604910021084345*r-.5876411387885495*g-.0728498633198848*b;
 const qg=-.1245504745215907*r+1.13289989712596*g-.0083494226043694*b;
 const qb=-.0181507633549052*r-.1005788980080074*g+1.1187296613629127*b;
 const y=Math.max(0,.2126*qr+.7152*qg+.0722*qb),min=Math.min(qr,qg,qb),s=min<0?y/Math.max(legacy?1e-12:1e-30,y-min):1;
 r=Math.max(0,y+(qr-y)*s);g=Math.max(0,y+(qg-y)*s);b=Math.max(0,y+(qb-y)*s);
 const peak=Math.max(r,g,b),distance=(peak-.8)/.2;
 const target=peak<=.8?peak:.8+.2*(-Math.expm1(-(legacy?Math.min(100,distance):distance)));
 if(peak>0){r=r*target/peak;g=g*target/peak;b=b*target/peak;}
 out[0]=r;out[1]=g;out[2]=b;return out;
}
function compile(k,intent,{viewMode='auto'}={}){
 if(!['auto','technical','fixed'].includes(viewMode))throw Error('VIEW_MODE_INVALID');
 V.validateCalibration(k.calibration);R.render([0,0,0],intent);const color=viewMode==='auto'?R.prepareBalance(intent):null;
 const c=k.calibration,lb=k.base.rgb.map(Math.log10),lf=c.epsilon.map(Math.log10),s=c.responses.map(r=>r.slope),d0=c.responses.map(r=>r.referenceDensity),m=c.matrix,a=c.offset,e=viewMode==='fixed'?1:2**intent.exposure;
 function density(j,i){return -Math.max(lf[i],Number.isFinite(j)&&j>0?Math.log10(j)-lb[i]:-Infinity);}
 function technical(r,g,b,out){
  const v0=(density(r,0)-d0[0])*s[0],v1=(density(g,1)-d0[1])*s[1],v2=(density(b,2)-d0[2])*s[2];
  out[0]=.18*10**Math.max(-20,Math.min(20,((a[0]+m[0][0]*v0)+m[0][1]*v1)+m[0][2]*v2));
  out[1]=.18*10**Math.max(-20,Math.min(20,((a[1]+m[1][0]*v0)+m[1][1]*v1)+m[1][2]*v2));
  out[2]=.18*10**Math.max(-20,Math.min(20,((a[2]+m[2][0]*v0)+m[2][1]*v1)+m[2][2]*v2));return out;
 }
 function pixel(r,g,b,out){technical(r,g,b,out);r=out[0];g=out[1];b=out[2];if(color){const y=.2627*r+.678*g+.0593*b;if(y>1e-30){const band=y<color.knots[1]?0:1;let t=Math.max(0,Math.min(1,(y-color.knots[band])/(color.knots[band+1]-color.knots[band])));t=t*t*(3-2*t);r*=color.gains[band][0]+t*(color.gains[band+1][0]-color.gains[band][0]);g*=color.gains[band][1]+t*(color.gains[band+1][1]-color.gains[band][1]);b*=color.gains[band][2]+t*(color.gains[band+1][2]-color.gains[band][2]);const norm=y/(.2627*r+.678*g+.0593*b);r*=norm;g*=norm;b*=norm;}}const y=(.2627*r+.678*g+.0593*b)*e,scale=e/(1+y);return display(r*scale,g*scale,b*scale,out);}
 function technicalDisplay(r,g,b,out){technical(r,g,b,out);return display(out[0],out[1],out[2],out);}
 return {pixel:viewMode==='technical'?technicalDisplay:pixel,technical};
}
// Exact neutral Standard preset used by this lab. No general legacy edits are
// silently approximated; the unchanged NSPixelKernel is used as its test oracle.
function compileLegacy(c){
 const o=c.opts;
 if(c.kind!=='calibrated4'||c.workingSpace!=='rec2020'||!c.neutralProfile||!c.neutralPrint||c.profile.type!=='color'||o.colorMode4!=='legacy'||o.toneMode4!=='smooth'||o.editVersion!==1||!o.autoLevels||o.exposure||o.temperature||o.tint||o.gamma!==1||o.contrast!==1||o.saturation!==1||o.shadow!==0||o.highlight!==1||o.shadows||o.highlights)throw Error('UNSUPPORTED_LEGACY_FAST_PRESET');
 const a=c.cal.beta4,r=a.response,low=root.NSPixelKernel.lowSignal4(c),factor=a.light.map((v,i)=>v/a.base[i]);
 function pixel(jr,jg,jb,out){
  const p0=(-Math.log10(Math.max(1/65535,jr)*factor[0])-r.offset[0])/r.span[0],p1=(-Math.log10(Math.max(1/65535,jg)*factor[1])-r.offset[1])/r.span[1],p2=(-Math.log10(Math.max(1/65535,jb)*factor[2])-r.offset[2])/r.span[2];
  let red=Math.max(0,(p0-a.lo)/a.span),green=Math.max(0,(p1-a.lo)/a.span),blue=Math.max(0,(p2-a.lo)/a.span);
  if(p0>low.start[0]||p1>low.start[1]||p2>low.start[2]){
   const t=clamp(Math.max((p0-low.start[0])*low.invRange[0],(p1-low.start[1])*low.invRange[1],(p2-low.start[2])*low.invRange[2]));
   if(t>0){const neutral=.2627*red+.678*green+.0593*blue,w=low.strength*t*t*(3-2*t);red+=w*(neutral-red);green+=w*(neutral-green);blue+=w*(neutral-blue);}
  }
  const y=.2627*red+.678*green+.0593*blue;if(y>1e-12){red=red*y/y;green=green*y/y;blue=blue*y/y;}
  display(red,green,blue,out,true);for(let i=0;i<3;i++)out[i]=clamp(out[i]);return out;
 }
 return {pixel};
}
root.NSV2Fast={compile,compileLegacy,display};
})(globalThis);
