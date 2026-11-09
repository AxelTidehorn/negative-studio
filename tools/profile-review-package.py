"""Package real shared-kernel outputs; never adjust pixels or expose photographs in Git.
python tools/profile-review-package.py PRIVATE_OUTPUT IMAGE_ID
"""
import sys,json,struct,hashlib,zlib,zipfile
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
root=Path(sys.argv[1]).resolve();
if root.is_relative_to(Path(__file__).resolve().parent.parent):raise ValueError('Keep private photographic output outside repository')
case=sys.argv[2];record=root/'measurements'/f'{case}.json';m=json.loads(record.read_text());details=root/'detail-crops';details.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def tiff(p):
 b=p.read_bytes();end='<' if b[:2]==b'II' else '>';off=struct.unpack_from(end+'I',b,4)[0];n=struct.unpack_from(end+'H',b,off)[0];tags={}
 for i in range(n):
  tag,t,count,value=struct.unpack_from(end+'HHII',b,off+2+12*i);tags[tag]=(t,count,value,off+2+12*i+8)
 def values(tag):
  t,n,v,a=tags[tag];size={3:2,4:4}[t];return struct.unpack_from(end+('H' if t==3 else 'I')*n,b,v if n*size>4 else a)
 w,h=values(256)[0],values(257)[0];assert values(258)==(16,16,16) and values(339)==(1,1,1)
 icc=b[tags[34675][2]:tags[34675][2]+tags[34675][1]];return np.frombuffer(b,dtype=end+'u2',offset=values(273)[0],count=w*h*3).reshape(h,w,3),icc
def png16(a):
 h,w,_=a.shape
 def chunk(t,b):return struct.pack('>I',len(b))+t+b+struct.pack('>I',zlib.crc32(t+b)&0xffffffff)
 raw=b''.join(b'\0'+np.asarray(row,dtype='>u2').tobytes() for row in a)
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,16,2,0,0,0))+chunk(b'sRGB',b'\0')+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
def stats(a):
 h,w,_=a.shape;q=a[::max(1,h//150),::max(1,w//160)].astype(float)/65535;lin=np.where(q<=.04045,q/12.92,((q+.055)/1.055)**2.4);y=lin@np.array([.2126,.7152,.0722]);return {'quantiles':[.01,.1,.5,.6,.9,.95,.99],'linearY':np.quantile(y,[.01,.1,.5,.6,.9,.95,.99]).tolist(),'encodedChromaMedian':float(np.median(q.max(2)-q.min(2))),'pixels':h*w,'anyCode65535':int((a==65535).any(2).sum()),'anyCode0':int((a==0).any(2).sum()),'non8BitSamples':int((a%257!=0).sum()),'percentileBasis':'bounded point grid of actual RGB16 export; endpoint counts and low-bit count use every native sample'}
files=[];summary={}
for v in m['variants']:
 files.append(root/v['overview'])
 if 'TIFF' not in v:continue
 p=root/v['TIFF']['file'];a,icc=tiff(p);assert sha(p.read_bytes())==v['TIFF']['sha256'];assert list(a.shape[:2][::-1])==m['technical']['dimensions'];assert len(icc)==588
 v['TIFF']['bits']=16;v['TIFF']['iccSHA256']=sha(icc);v['statistics']=stats(a)
 if v['monochrome']:assert np.array_equal(a[:,:,0],a[:,:,1]) and np.array_equal(a[:,:,1],a[:,:,2])
 h,w,_=a.shape;c=m['filmCrop'];x,y=int(c['x']*w),int(c['y']*h);cw,ch=round(c['w']*w),round(c['h']*h);v['filmStatistics']=stats(a[y:y+ch,x:x+cw]);v['details']=[]
 for i,r in enumerate(m['details']):
  x,y,wc,hc=(int(r[k]) for k in ['x','y','width','height']);roi=a[y:y+hc,x:x+wc];b=png16(roi);f=details/f'image{case}_region{i}_{v["name"]}.png';f.write_bytes(b);files.append(f);v['details'].append({'file':str(f.relative_to(root)),'sourceRegion':{'x':x,'y':y,'width':wc,'height':hc},'scale':1,'bits':16,'sha256':sha(b),'statistics':stats(roi)})
 files.append(p);summary[v['name']]=v['filmStatistics'];del a
m['neutralByteIdenticalToMain']=next(v for v in m['variants'] if v['name']=='neutral')['TIFF']['sha256']==m['beforeNeutralSHA256'];assert m['neutralByteIdenticalToMain'];m['reviewNote']='Photographic prototypes from unchanged Work start values. No real B&W negative identified. Native full TIFF: Neutral/Gold70/Ektar70/mono; 35/100 overviews are direct source-point preview samples, never upscaled full exports.'
record.write_text(json.dumps(m,indent=2)+'\n');files.append(record)
# Uniform contact-sheet geometry; identical reduction for every rendered PNG.
images=[Image.open(root/v['overview']).convert('RGB') for v in m['variants']];width=320;height=round(images[0].height*width/images[0].width);sheet=Image.new('RGB',((width+8)*len(images),height+52),(30,30,30));draw=ImageDraw.Draw(sheet)
for i,(im,v) in enumerate(zip(images,m['variants'])):
 sheet.paste(im.resize((width,height),Image.Resampling.LANCZOS),(i*(width+8),48));draw.text((i*(width+8)+4,8),case+' '+v['name'],fill='white');draw.text((i*(width+8)+4,24),'D / locked source and intent',fill='white')
contact=root/'overview'/f'image{case}_contact.png';sheet.save(contact);files.append(contact)
archive=root/f'FILMLABB_3_PROFILE_REVIEW_image{case}.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=3) as z:
 for p in files:z.write(p,'FILMLABB_3_PROFILE_REVIEW/'+str(p.relative_to(root)))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
result={'id':case,'archive':archive.name,'bytes':archive.stat().st_size,'sha256':sha(archive.read_bytes()),'neutralByteIdenticalToMain':True,'nativeVariants':list(summary),'filmStatistics':summary}
(root/'measurements'/f'{case}_package.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
# Only redundant generated native files are removed after ZIP CRC verification.
for v in m['variants']:
 if 'TIFF' in v:(root/v['TIFF']['file']).unlink()
