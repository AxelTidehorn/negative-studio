/* Matrix/TRC ICC RGB profiles; LUT/CMYK profiles fail explicitly. PCS is D50. */
(function(root){
'use strict';
const mul=(m,p)=>m.map(r=>r.reduce((s,v,c)=>s+v*p[c],0));
function parseICC(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),sig=p=>String.fromCharCode(...bytes.slice(p,p+4)),u=p=>v.getUint32(p,false),fixed=p=>v.getInt32(p,false)/65536;
 if(bytes.length<132||sig(36)!=='acsp'||sig(16)!=='RGB '||sig(20)!=='XYZ ')throw Error('ICC-profilen är inte en RGB/XYZ-matrisprofil.');
 const n=u(128),tags={};if(n>1000||132+n*12>bytes.length)throw Error('Ogiltig ICC-tabell.');
 for(let i=0;i<n;i++){const p=132+i*12,o=u(p+4),size=u(p+8);if(o+size>bytes.length)throw Error('ICC-data saknas.');tags[sig(p)]={o,size};}
 function xyz(tag){const t=tags[tag];if(!t||t.size<20||sig(t.o)!=='XYZ ')throw Error('ICC-matris saknas. LUT-profiler stöds inte.');return [fixed(t.o+8),fixed(t.o+12),fixed(t.o+16)];}
 function trc(tag){const t=tags[tag];if(!t)throw Error('ICC-tonkurva saknas.');const o=t.o;
 if(sig(o)==='curv'){const count=u(o+8);if(t.size<12+count*2)throw Error('Ogiltig ICC-tonkurva.');if(!count)return x=>x;if(count===1){const g=v.getUint16(o+12,false)/256;return x=>Math.max(0,x)**g;}return x=>{const f=Math.max(0,Math.min(1,x))*(count-1),a=Math.floor(f),b=Math.min(count-1,a+1);return (v.getUint16(o+12+a*2,false)*(b-f)+v.getUint16(o+12+b*2,false)*(f-a)+(a===b?v.getUint16(o+12+a*2,false):0))/65535;};}
 if(sig(o)!=='para')throw Error('ICC-tonkurvan stöds inte.');const type=v.getUint16(o+8,false),counts=[1,3,4,5,7],count=counts[type];if(!count||t.size<12+count*4)throw Error('ICC-parametrisk tonkurva stöds inte.');const p=Array.from({length:count},(_,i)=>fixed(o+12+i*4)),[g,a,b,c,d,e,f]=p;
 return x=>type===0?Math.max(0,x)**g:type===1?(x>=-b/a?Math.max(0,a*x+b)**g:0):type===2?(x>=-b/a?Math.max(0,a*x+b)**g+c:c):type===3?(x>=d?Math.max(0,a*x+b)**g:c*x):(x>=d?Math.max(0,a*x+b)**g+e:c*x+f);}
 const cols=['rXYZ','gXYZ','bXYZ'].map(xyz),curves=['rTRC','gTRC','bTRC'].map(trc),matrix=[0,1,2].map(r=>cols.map(c=>c[r]));
 const adaptation=[[0.9555525298128189,-0.023052146356539745,0.06325420912961574],[-0.02829892971718467,1.00993313181255,0.021036121009527554],[0.012318111481014082,-0.020517726272689954,1.330428661877435]],rgb=[[3.2404542,-1.5371385,-.4985314],[-.969266,1.8760108,.041556],[.0556434,-.2040259,1.0572252]];
 return {toLinear(p){return mul(rgb,mul(adaptation,mul(matrix,p.map((x,c)=>curves[c](x)))));},label:'ICC RGB matris/TRC → linjär sRGB'};
}
root.NSColorManagement={parseICC};
})(globalThis);
