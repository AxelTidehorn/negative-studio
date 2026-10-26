/* Exact preview-domain analysis retained for reference-format projects. */
'use strict';
// Automatic base from brightest 3% of negative pixels in the *edge band*.
// This is a heuristic, not film-stock calibrated. In high-key scenes it may be incorrect.
function estimateBase(image){const {data,width:w,height:h}=image;const picks=[];const stride=Math.max(1,Math.floor(Math.sqrt(w*h/18000)));const edge=.12;for(let y=0;y<h;y+=stride){for(let x=0;x<w;x+=stride){if(x>w*edge&&x<w*(1-edge)&&y>h*edge&&y<h*(1-edge))continue;const i=(y*w+x)*4;if(data[i+3]<200)continue;const r=data[i],g=data[i+1],b=data[i+2];picks.push({score:Math.min(r,g,b)+.1*(r+g+b),r,g,b})}}if(picks.length<10)return [235,167,105];picks.sort((a,b)=>b.score-a.score);const n=Math.max(8,Math.round(picks.length*.03));const top=picks.slice(0,n);return [0,1,2].map((k)=>Math.round(top.reduce((sum,v)=>sum+v[['r','g','b'][k]],0)/n))}

function percentile(sorted,q){return sorted[Math.max(0,Math.min(sorted.length-1,Math.floor(q*(sorted.length-1))))]}
// Channelwise photographic density; an absent base is treated as unity and tone/color ranges come from motif statistics.
function untoned(values,filmBase,opts,scale){let out=[];for(let c=0;c<3;c++){let t=Math.max(1/65535,Math.min(1,values[c]/scale*referenceGains[c]));let fb=opts.noBase?1:Math.max(1/65535,filmBase[c]/255);out[c]=Math.max(0,1-t/fb)}return out}
function analyzeLegacyReference(){if(!previewSrc)return;const d=previewSrc.data,arr=[[],[],[]],step=Math.max(1,Math.floor(Math.sqrt(previewSrc.width*previewSrc.height/20000)));for(let y=0;y<previewSrc.height;y+=step)for(let x=0;x<previewSrc.width;x+=step){const cb=cropBounds(previewSrc);if(x<cb.x0||x>=cb.x1||y<cb.y0||y>=cb.y1)continue;const i=(y*previewSrc.width+x)*4;const q=untoned([d[i],d[i+1],d[i+2]],base,state,255);for(let c=0;c<3;c++)arr[c].push(q[c])}for(const a of arr)a.sort((a,b)=>a-b);let lo=arr.map(a=>percentile(a,.015)),hi=arr.map(a=>percentile(a,.985));levels={lo,hi};const spreads=hi.map((h,c)=>h-lo[c]);const weak=spreads.some(x=>x<.045);$('levelsInfo').textContent=(weak?'Varning: låg kanalvariation. ':'')+'Motivnivåer (1,5–98,5 %): '+lo.map((x,c)=>x.toFixed(2)+'–'+hi[c].toFixed(2)).join(' / ');scheduleRender()}







