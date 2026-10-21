# Small controllable CFA DNG; no external packages. Regenerates the import fixture.
import struct
from pathlib import Path
w,h=64,48
tags=[];extra=bytearray()
def entry(tag,kind,values):
 if kind in (1,2,7): data=values if isinstance(values,bytes) else bytes(values);count=len(data)
 elif kind==3:data=struct.pack('<'+'H'*len(values),*values);count=len(values)
 elif kind==4:data=struct.pack('<'+'I'*len(values),*values);count=len(values)
 elif kind==10:data=b''.join(struct.pack('<ii',a,b) for a,b in values);count=len(values)
 tags.append([tag,kind,count,data])
entry(254,4,[0]);entry(256,4,[w]);entry(257,4,[h]);entry(258,3,[16]);entry(259,3,[1]);entry(262,3,[32803]);entry(271,2,b'Negative Studio\0');entry(272,2,b'Synthetic CFA\0');entry(273,4,[0]);entry(277,3,[1]);entry(278,4,[h]);entry(279,4,[w*h*2]);entry(284,3,[1]);entry(33421,3,[2,2]);entry(33422,1,[0,1,1,2]);entry(50706,1,[1,4,0,0]);entry(50707,1,[1,1,0,0]);entry(50708,2,b'Negative Studio Synthetic CFA\0');entry(50714,3,[0]);entry(50717,4,[65535]);entry(50721,10,[(1,1),(0,1),(0,1),(0,1),(1,1),(0,1),(0,1),(0,1),(1,1)]);entry(50728,10,[(1,1),(1,1),(1,1)]);entry(50778,3,[21]);
tags.sort();start=8+2+len(tags)*12+4
entries=[]
for tag,kind,count,data in tags:
 if len(data)>4:
  offset=start+len(extra);field=struct.pack('<I',offset);extra+=data
  if len(extra)%2:extra+=b'\0'
 else:field=data.ljust(4,b'\0')
 entries.append([tag,kind,count,field])
pix=start+len(extra)
for e in entries:
 if e[0]==273:e[3]=struct.pack('<I',pix)
header=b'II'+struct.pack('<HIH',42,8,len(entries))+b''.join(struct.pack('<HHI',tag,kind,count)+field for tag,kind,count,field in entries)+b'\0'*4+extra
samples=[]
for y in range(h):
 for x in range(w):samples.append(int(3000+20000*(x/w)+10000*(y/h)))
p=Path(__file__).parent/'fixtures'/'synthetic-negative.dng';p.write_bytes(header+struct.pack('<'+'H'*len(samples),*samples));print(p)
