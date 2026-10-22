/* Pure export geometry and bounded stripe transport. No DOM or source transfer. */
(function(root){
'use strict';
function budgets(mode,memory){return mode==='safe'?[12000000,6000000,3000000]:[Number(memory)<4?24000000:40000000,12000000,6000000,3000000];}
function size(g,budget){
 if(!Number.isSafeInteger(g.width*g.height)||g.width<1||g.height<1)throw Error('Ogiltig exportstorlek.');
 const side=budget>12000000?16384:8192,f=Math.min(1,side/g.width,side/g.height,Math.sqrt(budget/(g.width*g.height)));
 return {width:Math.max(1,Math.floor(g.width*f)),height:Math.max(1,Math.floor(g.height*f))};
}
function rows(width,remaining,pixels=65536){return Math.min(remaining,32,Math.max(1,Math.floor(pixels/width)));}
function at(g,target,x,y){return g.at(Math.min(g.width-1,Math.floor((x+.5)*g.width/target.width)),Math.min(g.height-1,Math.floor((y+.5)*g.height/target.height)));}
function metadata(im){return {width:im.width,height:im.height,channels:3,scale:im.scale||1,encoding:im.encoding,normalization:im.normalization||1,colorSpace:im.colorSpace||'srgb',flatField:im.flatField||null};}
function pack(im,g,target,y,rows){
 const data=new im.data.constructor(target.width*rows*3);
 for(let dy=0;dy<rows;dy++)for(let x=0;x<target.width;x++){const [sx,sy]=at(g,target,x,y+dy),j=(sy*im.width+sx)*im.channels,i=(dy*target.width+x)*3;data[i]=im.data[j];data[i+1]=im.data[j+1];data[i+2]=im.data[j+2];}
 return data;
}
root.NSExportPlan={budgets,size,rows,at,metadata,pack};
})(globalThis);
