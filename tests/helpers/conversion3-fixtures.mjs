export function negative({width=96,height=64,scene='mixed',gain=1,base=[.74,.43,.24],power=[.75,1,1.25],Type=Float32Array}={}){
 const data=new Type(width*height*3);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const t=x/(width-1),v=y/(height-1),p=scene==='neutral'?[t,t,t]:scene==='dominant'?[.1+.8*t,.25+.06*v,.6+.15*t]:[.02+.96*t,.02+.96*v,.02+.96*(.7*t+.3*v)];
  for(let k=0;k<3;k++)data[(y*width+x)*3+k]=Math.max(0,Math.min(1,base[k]*10**(-power[k]*p[k])*gain));
 }
 return {width,height,channels:3,encoding:'linear',colorSpace:'srgb',scale:1,data};
}
export const region={x:0,y:0,w:1,h:1};
