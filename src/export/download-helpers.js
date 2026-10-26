'use strict';
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
function conversionSample(r,g,b,params,filmBase,scale){return develop([r,g,b],filmBase,params,scale).map(v=>Math.round(v*65535))}
function makeTiffHeader(width,height,pixelOffset){
 const tags=[
  [256,4,1,width],[257,4,1,height],[258,3,3,0],[259,3,1,1],[262,3,1,2],[273,4,1,pixelOffset],[277,3,1,3],[278,4,1,height],[279,4,1,width*height*6],[284,3,1,1],[339,3,1,1]
 ];
 const size=8+2+tags.length*12+4+6,ab=new ArrayBuffer(size),v=new DataView(ab);v.setUint8(0,73);v.setUint8(1,73);v.setUint16(2,42,true);v.setUint32(4,8,true);v.setUint16(8,tags.length,true);
 for(let i=0;i<tags.length;i++){const [tag,type,count,value]=tags[i],p=10+i*12;v.setUint16(p,tag,true);v.setUint16(p+2,type,true);v.setUint32(p+4,count,true);v.setUint32(p+8,tag===258?size-6:value,true)}
 const bits=size-6;v.setUint16(bits,16,true);v.setUint16(bits+2,16,true);v.setUint16(bits+4,16,true);return ab;
}
async function exportTiff(){
 if(!src)return;const sourceW=hires?.width||src.width,sourceH=hires?.height||src.height,rot=((state.rotation||0)%360+360)%360,w=rot%180?sourceH:sourceW,h=rot%180?sourceW:sourceH,headerSize=8+2+11*12+4+6;
 // TIFF classic: no support for files larger than 4 GiB.
 if(w*h*6+headerSize>=4294967295){setStatus('Bilden är för stor för klassisk TIFF.');return}
 $('exportTiff').disabled=true;setStatus(`Skapar 16-bitars TIFF (${w}×${h}). Vänta…`);
 try{const chunks=[makeTiffHeader(w,h,headerSize)],rowsPerChunk=32;
 for(let y0=0;y0<h;y0+=rowsPerChunk){const rows=Math.min(rowsPerChunk,h-y0),ab=new ArrayBuffer(w*rows*6),view=new DataView(ab);
  for(let yy=0;yy<rows;yy++)for(let x=0;x<w;x++){const y=y0+yy,sx=rot===90?y:rot===180?sourceW-1-x:rot===270?sourceW-1-y:x,sy=rot===90?sourceH-1-x:rot===180?sourceH-1-y:rot===270?x:y,idx=(sy*sourceW+sx),sample=hires?(function(){const i=idx*hires.channels;return conversionSample(hires.data[i],hires.data[i+1],hires.data[i+2],state,base,65535)})():(function(){const i=idx*4;return conversionSample(src.data[i],src.data[i+1],src.data[i+2],state,base,255)})();const q=(yy*w+x)*6;view.setUint16(q,sample[0],true);view.setUint16(q+2,sample[1],true);view.setUint16(q+4,sample[2],true)}
  chunks.push(ab);if(y0%256===0){setStatus(`TIFF-export: ${Math.round(100*(y0+rows)/h)} %`);await new Promise(resolve=>setTimeout(resolve,0));}
 }
 downloadBlob(new Blob(chunks,{type:'image/tiff'}),activeFrame>=0?`filmlabb-${String(activeFrame+1).padStart(3,'0')}-16bit.tif`:'filmlabb-positive-16bit.tif');setStatus(`16-bitars TIFF skapad (${w}×${h}). ${hires?'16-bitars källbild':'OBS: ursprungsbilden avkodades till 8 bitar.'}`)
 }catch(e){setStatus('Exportfel: '+e.message)}finally{$('exportTiff').disabled=false}
}
function rotatedCanvas(original,deg){const a=((deg%360)+360)%360;if(!a)return original;const q=document.createElement('canvas');q.width=a%180?original.height:original.width;q.height=a%180?original.width:original.height;const c=q.getContext('2d');c.translate(q.width/2,q.height/2);c.rotate(a*Math.PI/180);c.drawImage(original,-original.width/2,-original.height/2);return q;}
$('exportTiff').onclick=exportTiff;
$('export').onclick=async()=>{if(!src)return;try{const bytes=await jpegBytes();downloadBlob(new Blob([bytes],{type:'image/jpeg'}),'filmlabb-positive.jpg');setStatus('JPEG-export klar.')}catch(err){setStatus('Exportfel: '+err.message)}};
$('saveSettings').onclick=()=>downloadBlob(new Blob([JSON.stringify({format:'negative-studio-v03',state},null,2)],{type:'application/json'}),'filmlabb-settings.json');
$('settingsFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(obj.format!=='negative-studio-v03'||!obj.state)throw Error('Fel format');const next={...defaultState()};for(const [id,,min,max] of controls){const v=Number(obj.state[id]);if(!Number.isFinite(v)||v<min||v>max)throw Error('Ogiltigt värde för '+id);next[id]=v}next.auto=!!obj.state.auto;next.noBase=!!obj.state.noBase;next.autoLevels=obj.state.autoLevels!==false;if(Array.isArray(obj.state.manualBase)&&obj.state.manualBase.length===3&&obj.state.manualBase.every(v=>Number.isInteger(v)&&v>=0&&v<=255))next.manualBase=obj.state.manualBase;state=next;$('auto').checked=state.auto;$('noBase').checked=state.noBase;$('autoLevels').checked=state.autoLevels;for(const [id] of controls)$(id).value=state[id];updateValues();updateBase();analyzeLevels();persist();render();setStatus('Inställningarna importerade.')}catch(err){setStatus('Kunde inte importera inställningarna: '+err.message)}finally{e.target.value=''}};

