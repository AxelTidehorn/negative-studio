// Independent normalized-polygon raster metrics; no detector score is reused.
const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
export const inside=(q,p)=>q?.length===4&&q.every((a,i)=>cross(a,q[(i+1)%4],p)>=-1e-12);
export const rectangle=r=>[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
function segment(p,a,b,w,h){const dx=(b.x-a.x)*w,dy=(b.y-a.y)*h,px=(p.x-a.x)*w,py=(p.y-a.y)*h,t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy)));return Math.hypot(px-t*dx,py-t*dy);}
export function metrics(q,analysis,reference,w,h){
 let truth=0,retained=0,selected=0,outside=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p={x:(x+.5)/w,y:(y+.5)/h},a=inside(reference,p),b=inside(analysis,p);truth+=a;retained+=a&&inside(q,p);selected+=b;outside+=b&&!a;}
 const distances=[];if(q)for(let i=0;i<4;i++)for(let t=0;t<=32;t++){const a=q[i],b=q[(i+1)%4],p={x:a.x+(b.x-a.x)*t/32,y:a.y+(b.y-a.y)*t/32};distances.push(Math.min(...reference.map((v,j)=>segment(p,v,reference[(j+1)%4],w,h))));}
 return {retainedMotifFraction:retained/Math.max(1,truth),includedBorderFraction:outside/Math.max(1,selected),analysisPixels:selected,maxBoundaryDeviationPixels:distances.length?Math.max(...distances):null,meanBoundaryDeviationPixels:distances.length?distances.reduce((s,v)=>s+v,0)/distances.length:null};
}
