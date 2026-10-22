/* Routing policy only. LibRaw validates the file contents and camera/compression. */
(function(root){
'use strict';
const formats=Object.freeze({raf:'raw',dng:'raw',arw:'raw',jpg:'browser',jpeg:'browser',png:'browser',webp:'browser',tif:'tiff',tiff:'tiff',nef:'raw',cr2:'raw',cr3:'raw',rw2:'raw'});
const extension=file=>String(typeof file==='string'?file:file?.name||'').split('.').pop().toLowerCase();
const kind=file=>formats[extension(file)]||'unsupported';
const isRaw=file=>kind(file)==='raw';
const experimental=file=>['nef','cr2','cr3','rw2'].includes(extension(file));
const supported=file=>['raw','browser','tiff'].includes(kind(file));
const accept=Object.keys(formats).filter(k=>formats[k]!=='planned').map(k=>'.'+k).join(',');
function error(file){return kind(file)==='planned'?`${extension(file).toUpperCase()} är ännu inte aktiverat i FILMLABB. Använd DNG eller okomprimerad RGB-TIFF tills formatet har verifierats.`:`Filformatet för ${typeof file==='string'?file:file?.name||'filen'} stöds inte. Välj JPEG, PNG, WebP, TIFF, RAF, DNG eller Sony ARW.`;}
root.NSFileFormats=Object.freeze({formats,extension,kind,isRaw,supported,accept,error,experimental});
})(globalThis);
