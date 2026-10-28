(function(root){
'use strict';
const V=root.NSConversionV2,M=root.NSFilmBaseMeasurement;
function samplePixel(im,x,y){const p=V.read(im,(y*im.width+x)*3);return {p,clipped:p.map(v=>v>=.999),dark:p.map(v=>!Number.isFinite(v)||v<=1e-6)};}
function measure(im,s,regions,kind='manual-region'){V.validateSource(s,im);const m=M.measureRegions(im,regions,{limit:8192,kind,samplePixel});return {...m,domain:'linear-rec2020',sourceRevision:s.revision};}
// Multiscale peripheral strips. Deliberate abstention: RGB/homogeneity alone cannot
// establish unexposed film, so candidates always require visual confirmation.
async function detect(im,s){const candidates=[];for(const width of [1,2,4,8,16,32]){if(width>Math.min(im.width,im.height)/8)continue;const wx=width/im.width,wy=width/im.height;
 for(const side of ['left','right','top','bottom'])for(let block=0;block<8;block++){const vertical=side==='left'||side==='right',r=vertical?{x:side==='left'?0:1-wx,y:block/8,w:wx,h:1/8}:{x:block/8,y:side==='top'?0:1-wy,w:1/8,h:wy},m=measure(im,s,[r],'auto-region');
 if(m.status!=='missing'&&m.clipped.every(v=>v<.001)&&m.dark.every(v=>v<.005)&&m.spread.every(v=>v<.06))candidates.push({...m,side,width});
 }await new Promise(r=>setTimeout(r,0));}
 const groups=[];for(const c of candidates){let g=groups.find(g=>c.measured.every((v,k)=>Math.abs(v-g[0].measured[k])/Math.max(v,g[0].measured[k])<.03));if(!g)groups.push(g=[]);g.push(c);}
 const ranked=groups.filter(g=>g.length>=2).sort((a,b)=>new Set(b.map(c=>c.side)).size-new Set(a.map(c=>c.side)).size||Math.min(...b[0].measured)-Math.min(...a[0].measured));
 if(!ranked.length)return {status:'missing',reasons:['NO_SUPPORTED_PERIPHERAL_REGION'],candidates:[]};
 const g=ranked[0],regions=g.slice(0,16).map(m=>m.region),m=measure(im,s,regions,'auto-region');return {...m,status:m.status==='missing'?'missing':'review',reasons:['VISUAL_FILM_CONFIRMATION_REQUIRED','HOLDER_PERFORATION_SUBJECT_AMBIGUITY'],candidates:ranked.slice(0,6).map(g=>({rgb:g[0].measured,regions:g.map(c=>c.region),sides:[...new Set(g.map(c=>c.side))]}))};
}
root.NSV2Base={measure,detect};
})(globalThis);
