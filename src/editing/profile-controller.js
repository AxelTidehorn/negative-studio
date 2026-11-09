/* One catalogue-driven selector, one intensity, no print layer. */
'use strict';
function profileLabel(){return rollShared.monochrome?'Neutral svartvit':rollShared.look.id==='neutral'?'Neutral':NSProfileCatalog.profiles[rollShared.look.id].label;}
function refreshProfileInfo(){
 const mono=rollShared.monochrome,id=rollShared.look.id;
 $('filmProfile').value=mono?'mono.neutral':id;document.body.classList.toggle('bw-active',mono);
 $('filmProfile').title=id==='neutral'?'Neutral presentation.':'Fotografisk prototyp – inte en kalibrerad filmsimulering.';
 const note=document.getElementById('profileDescription'),text=mono||id==='neutral'?'Neutral presentation.':'Fotografisk prototyp – inte en kalibrerad filmsimulering.';if(note){if(globalThis.FILMLABB_I18N?.source)FILMLABB_I18N.source(note,text);else note.textContent=text;}
 const parent=$('profileStrength').parentElement;if(parent)parent.hidden=mono||id==='neutral';
 $('profileStrength').value=Math.round(rollShared.look.strength*100);$('profileStrengthValue').textContent=Math.round(rollShared.look.strength*100)+' %';
}
const profileSelect=$('filmProfile');
function addProfileOption(parent,value,label){const o=document.createElement('option');o.value=value;o.textContent=label;parent.append(o);}
const colorGroup=document.createElement('optgroup');colorGroup.label='Färg';addProfileOption(colorGroup,NSProfileCatalog.neutral.id,NSProfileCatalog.neutral.label);profileSelect.append(colorGroup);
for(const [category,label] of [['film','Färg · Filmkaraktärer · prototyper'],['creative','Färg · Kreativa profiler']]){const entries=Object.values(NSProfileCatalog.profiles).filter(p=>p.category===category);if(!entries.length)continue;const group=document.createElement('optgroup');group.label=label;for(const p of entries)addProfileOption(group,p.id,p.label);profileSelect.append(group);}
const monoGroup=document.createElement('optgroup');monoGroup.label='Svartvitt';addProfileOption(monoGroup,NSProfileCatalog.monochrome.id,NSProfileCatalog.monochrome.label);profileSelect.append(monoGroup);
