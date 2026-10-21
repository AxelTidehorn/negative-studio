/* Decode wide first, then apply one fixed common gain in linear sRGB.
   Rec.2020 D65 -> XYZ -> sRGB D65 (W3C CSS Color 4 sample matrices).
   No channel-dependent normalization. Fixed 1/2 gain leaves headroom in uint16. */
(function(root){
'use strict';
const matrix=[[1.6604910021084345,-.5876411387885495,-.0728498633198848],[-.1245504745215907,1.13289989712596,-.0083494226043694],[-.0181507633549052,-.1005788980080074,1.1187296613629127]];
function options(mode){return {outputBps:16,outputColor:mode==='protected'?8:1,useCameraWb:true,noAutoBright:true,gamm:[1,1,0,0,0,0],bright:1};}
function convert(im,mode){
 if(mode!=='protected')return {...im,rawMode4:'reference'};
 const d=im.data,clipped=[0,0,0],negative=[0,0,0];
 for(let i=0;i<d.length;i+=3){const r=d[i],g=d[i+1],b=d[i+2];for(let k=0;k<3;k++){if(d[i+k]>=65534)clipped[k]++;const v=(matrix[k][0]*r+matrix[k][1]*g+matrix[k][2]*b)*.5;if(v<0)negative[k]++;d[i+k]=Math.round(Math.max(0,Math.min(65535,v)));}}
 return {...im,rawMode4:'protected',inputDiagnostics4:{clipped,negative,pixels:d.length/3},linearGain4:.5};
}
root.NSRawInput={options,convert,matrix};
})(globalThis);
