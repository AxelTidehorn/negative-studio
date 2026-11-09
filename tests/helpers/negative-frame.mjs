// Synthetic linear Rec.2020 transmission, never described as a photographed RAW.
export function negativeFrame({width=480,height=360,frame={x:.10,y:.11,w:.79,h:.80},angle=0,holder=.025,separator=2,light=.0,weak=false,missing=[]}={}){
 const data=new Float32Array(width*height*3),base=[.72,.38,.18],a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=(frame.x+frame.w/2)*width,cy=(frame.y+frame.h/2)*height,hw=frame.w*width/2,hh=frame.h*height/2;
 const point=(x,y)=>({x:c*(x-cx)+s*(y-cy),y:-s*(x-cx)+c*(y-cy)});
 const inside=(x,y,pad=0)=>{const p=point(x,y);return Math.abs(p.x)<hw-pad&&Math.abs(p.y)<hh-pad;};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=point(x+.5,y+.5),subject=inside(x+.5,y+.5),gain=1+light*(x/width-.5),i=(y*width+x)*3;
  const strip=(!subject&&Math.abs(p.x)<hw+separator&&Math.abs(p.y)<hh+separator),black=x<holder*width||x>(1-holder)*width||y<holder*height||y>(1-holder)*height;
  for(let k=0;k<3;k++){
   const density=.18+1.4*((Math.floor((p.x+hw)/13)*17+Math.floor((p.y+hh)/11)*29+1017)%101)/100+(k===0?.03:k===2?.08:0);
   const absent=missing.includes('top')&&p.y<-hh||missing.includes('bottom')&&p.y>=hh||missing.includes('left')&&p.x<-hw||missing.includes('right')&&p.x>=hw;
   data[i+k]=gain*((subject||absent)?base[k]*(weak?.96:10**(-density)):strip||black?.001:base[k]);
  }
 }
 return {image:{width,height,channels:3,scale:1,encoding:'linear',colorSpace:'rec2020',data},base,frame,inside};
}
