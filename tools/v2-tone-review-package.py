"""Lossless packaging of actual TIFF downloads. Requires existing NumPy/Pillow.
No RAW decode or color model. Never rescales detail crops or TIFFs.
python3 tools/v2-tone-review-package.py PRIVATE_OUTPUT CASE
"""
from pathlib import Path
import sys,json,struct,zlib,hashlib,zipfile
import numpy as np
from PIL import Image,ImageDraw
def digest(file):
 h=hashlib.sha256()
 with open(file,'rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def read_tiff(file,record):
 data=file if isinstance(file,bytes) else file.read_bytes();assert data[:4]==b'II*\x00';at=struct.unpack_from('<I',data,4)[0];tags={}
 for i in range(struct.unpack_from('<H',data,at)[0]):
  pos=at+2+i*12;tag,kind,n,value=struct.unpack_from('<HHII',data,pos);size={1:1,2:1,3:2,4:4,7:1}[kind];off=pos+8 if size*n<=4 else value;tags[tag]=(kind,n,data[off:off+size*n])
 def nums(tag):
  kind,n,b=tags[tag];return struct.unpack('<'+{1:'B',3:'H',4:'I'}[kind]*n,b)
 width,height=nums(256)[0],nums(257)[0];assert nums(258)==(16,16,16) and nums(259)==(1,) and nums(262)==(2,) and nums(277)==(3,) and nums(339)==(1,1,1)
 icc=tags[34675][2];assert len(icc)==588
 offsets,counts=nums(273),nums(279);assert len(offsets)==len(counts)==1 and counts[0]==width*height*6
 pixels=np.frombuffer(data,dtype='<u2',offset=offsets[0],count=width*height*3).reshape(height,width,3)
 assert [width,height]==record['dimensions']==[record['exportGeometry']['width'],record['exportGeometry']['height']]
 return pixels,icc

def png16(file,array):
 h,w,c=array.shape;assert c==3
 def chunk(name,b):return struct.pack('>I',len(b))+name+b+struct.pack('>I',zlib.crc32(name+b)&0xffffffff)
 raw=b''.join(b'\0'+r.astype('>u2').tobytes() for r in array)
 file.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,16,2,0,0,0))+chunk(b'sRGB',b'\0')+chunk(b'gAMA',struct.pack('>I',45455))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))

def srgb_decode(x):return np.where(x<=.04045,x/12.92,((x+.055)/1.055)**2.4)
def package(p,case):
 record=json.loads((p/(case+'_record.json')).read_text());root=p/'FILMLABB_V2_TONE_REVIEW'
 for name in ['overview/individual-comparisons','full-resolution','detail-crops','measurements']:(root/name).mkdir(parents=True,exist_ok=True)
 variants={};images=[];files=[];crop=record['filmCrop'];w,h=record['dimensions'];x,y=int(crop['x']*w),int(crop['y']*h);cw,ch=round(crop['w']*w),round(crop['h']*h);slice_=np.s_[y:y+ch,x:x+cw]
 for name in ['before','after']:
  file=p/(case+'_'+name+'.tiff');pixels,icc=read_tiff(file,record);target=root/'full-resolution'/('image'+case+'_'+name+'.tiff');file.replace(target);files.append(target)
  film=pixels[slice_];sample=film[::max(1,ch//180),::max(1,cw//180)].reshape(-1,3);linear=srgb_decode(sample.astype(np.float64)/65535);ys=linear@np.array([.2126,.7152,.0722]);q=[.01,.05,.1,.5,.6,.9,.95,.99];yp=np.quantile(ys,q,method='lower').tolist()
  variants[name]={'TIFF':{'file':str(target.relative_to(root)),'bytes':target.stat().st_size,'sha256':digest(target),'dimensions':[w,h],'bitsPerSample':16,'sampleFormat':'unsigned integer','iccSHA256':hashlib.sha256(icc).hexdigest(),'non8BitSamples':int(np.count_nonzero(sample%257))},'quantiles':q,'linearSRGBLuminance':yp,'shadowSeparationP10P01':yp[2]-yp[0],'highlightSeparationP99P90':yp[7]-yp[5],'lowChannelFraction':np.mean(sample==0,axis=0).tolist(),'highChannelFraction':np.mean(sample==65535,axis=0).tolist(),'medianRelativeRGBChroma':float(np.median((linear.max(axis=1)-linear.min(axis=1))/np.maximum(ys,1e-20))),'measurementBasis':'Same source-coordinate grid inside film crop, sampled from actual full-resolution RGB16 export'}
  # The only reduction is for the overview. Same crop/filter/size in both halves.
  image=Image.fromarray(((film.astype(np.uint32)+128)//257).astype(np.uint8));image.thumbnail((720,720),Image.Resampling.LANCZOS);images.append(image)
  for index,region in enumerate(record['details']):
   xx,yy,ww,hh=[region[k] for k in ['x','y','width','height']];detail=pixels[yy:yy+hh,xx:xx+ww];assert detail.shape==(hh,ww,3)
   dest=root/'detail-crops'/('image'+case+'_detail'+str(index)+'_'+name+'.png');png16(dest,detail);files.append(dest)
  # Keep only the sampled RGB16 values for exact equality measurement.
  variants[name]['_samples']=sample.copy()
 assert variants['before']['TIFF']['iccSHA256']==variants['after']['TIFF']['iccSHA256']
 a,b=variants['before'].pop('_samples'),variants['after'].pop('_samples');record['exportMeasurements']=variants;record['sampleMaxRGB16Difference']=int(np.abs(a.astype(np.int32)-b.astype(np.int32)).max());record['sampleChangedFraction']=float(np.mean(np.any(a!=b,axis=1)))
 width=max(i.width for i in images);height=max(i.height for i in images);sheet=Image.new('RGB',(width*2+24,height+54),'#202020');d=ImageDraw.Draw(sheet)
 for i,(label,image) in enumerate(zip(['BEFORE '+record['baseline'][:7], 'AFTER '+record['candidate']],images)):
  sheet.paste(image,(i*(width+24),54));d.text((i*(width+24)+8,8),'Image '+case+' | '+label,fill='white');d.text((i*(width+24)+8,28),'EV '+str(round(record[label.split()[0].lower()]['exposure'],4)),fill='white')
 comparison=root/'overview/individual-comparisons'/('image'+case+'.png');sheet.save(comparison,icc_profile=icc);files.append(comparison)
 # Full recipes are private review metadata, not app/project migrations.
 metadata=root/'measurements'/('image'+case+'.json');metadata.write_text(json.dumps(record,indent=2)+'\n');files.append(metadata);(p/(case+'_record.json')).write_text(json.dumps(record,indent=2)+'\n')
 readme=root/'README.md';readme.write_text('''# FILMLABB V2 tone review

 Experimental `scene-distribution-1`, NOT installed in the production application.
 Actual native-resolution TIFF exports, not enlarged previews. Source orientation,
 zero manual editing, same film base/calibration/color/curve and sRGB ICC in both.
 Overview: identical film crop and Lanczos reduction, no automatic adjustments.
 Detail PNGs: RGB16, exact source coordinates from per-image JSON, no resampling,
 sharpening or denoising. TIFFs retain the WHOLE 6032×4032 source including border;
 this intentionally exposes all source pixels. Do not judge the holder as image.

 Each image ZIP expands into this same directory; unpack all ZIPs together.
 The overview/metadata ZIP adds contact-sheet.png, comparison-manifest.json and
 measurements/summary.md. Original RAW files are not included. See the manifest
 for exact baseline, frozen candidate, development/control split and limitations.
 No controlled low-key/night series or measured color/exposure ground truth.
 Private photographs: do not redistribute publicly. Human review is required.
 ''');files.append(readme)
 archive=p/('FILMLABB_V2_TONE_REVIEW_image'+case+'.zip')
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
  for file in files:z.write(file,'FILMLABB_V2_TONE_REVIEW/'+str(file.relative_to(root)))
 with zipfile.ZipFile(archive) as z:assert z.testzip() is None and len([x for x in z.namelist() if x.endswith('.tiff')])==2
 for file in files:
  if file.suffix=='.tiff':file.unlink() # original bytes remain, verified, in ZIP
 print('PACKED',case,archive.stat().st_size,digest(archive),flush=True)

if __name__=='__main__':package(Path(sys.argv[1]),sys.argv[2])
