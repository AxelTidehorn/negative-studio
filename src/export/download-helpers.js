'use strict';
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
// Optional naming is independent of per-frame processing settings.
function safeExportPrefix(value){return String(value||'').normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1F]/g,'_').replace(/\s+/g,' ').replace(/[. ]+$/g,'').trim().slice(0,100);}
function exportName(index,extension,legacy){const prefix=safeExportPrefix($('exportName')?.value);if(!prefix)return legacy;return prefix+(index===null?'':'_'+String(index+1).padStart(Number($('exportDigits')?.value)||3,'0'))+'.'+extension;}
function exportZipName(){const prefix=safeExportPrefix($('exportName')?.value);return prefix?prefix+'.zip':'filmlabb-filmrulle.zip';}
function syncExportNaming(){const prefix=safeExportPrefix($('exportName').value);$('exportNamePreview').textContent=prefix?'Exempel: '+exportName(0,'jpg','bild_001.jpg')+' · '+exportName(1,'jpg','bild_002.jpg'):'Standardnamn används: bild_001.jpg, bild_002.jpg …';try{localStorage.setItem('filmlabb-export-name-v1',JSON.stringify({prefix:$('exportName').value,digits:$('exportDigits').value}))}catch{}}
try{const prior=JSON.parse(localStorage.getItem('filmlabb-export-name-v1')||'null');if(prior){$('exportName').value=prior.prefix||'';$('exportDigits').value=String(prior.digits||3);}}catch{}
$('exportName').addEventListener('input',syncExportNaming);$('exportDigits').addEventListener('change',syncExportNaming);syncExportNaming();
// ZIP (store/no compression): no remote libraries, no server. Intended for preview JPEGs.
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(bytes){let c=-1;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^-1)>>>0}
function makeZip(entries){const enc=new TextEncoder(),parts=[],central=[];let off=0;
 for(const [filename,data] of entries){const name=enc.encode(filename),local=new Uint8Array(30+name.length),v=new DataView(local.buffer),crc=crc32(data);
 v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x0800,true);v.setUint16(8,0,true);v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);local.set(name,30);
 const cen=new Uint8Array(46+name.length),c=new DataView(cen.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);cen.set(name,46);central.push(cen);
 parts.push(local,data);off+=local.length+data.length}
 const start=off;for(const x of central){parts.push(x);off+=x.length}const end=new Uint8Array(22),e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,off-start,true);e.setUint32(16,start,true);parts.push(end);return new Blob(parts,{type:'application/zip'})}
