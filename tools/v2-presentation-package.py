"""Package C/D TIFFs and reuse the exact PR #89 A/B TIFFs in memory.
Only the existing common TIFF/PNG readers are used. Never decode/re-render A/B.
"""
from pathlib import Path
import sys,json,zipfile,hashlib,importlib.util
import numpy as np
from PIL import Image,ImageDraw
spec=importlib.util.spec_from_file_location('common',Path(__file__).with_name('v2-tone-review-package.py'));common=importlib.util.module_from_spec(spec);spec.loader.exec_module(common)
p=Path(sys.argv[1]);case=sys.argv[2];root=p/'FILMLABB_V2_PRESENTATION_REVIEW';archive=p/f'FILMLABB_V2_PRESENTATION_REVIEW_image{case}.zip'
if p.resolve().is_relative_to(Path(__file__).resolve().parent.parent):raise ValueError('Keep private output outside repository')
if len(sys.argv)>3 and sys.argv[3]=='stage':
 label=sys.argv[4];assert label in ['C','D'];file=p/f'{case}_{label}.tiff'
 with zipfile.ZipFile(archive,'w' if label=='C' else 'a',zipfile.ZIP_DEFLATED,compresslevel=6) as z:z.write(file,f'FILMLABB_V2_PRESENTATION_REVIEW/full-resolution/image{case}_{label}.tiff')
 file.unlink();print('STAGED',case,label,flush=True);sys.exit()
record=json.loads((p/f'{case}_record.json').read_text());old=Path(record['reusedAB']['archive']);w,h=record['dimensions'];crop=record['filmCrop'];x,y=int(crop['x']*w),int(crop['y']*h);cw,ch=round(crop['w']*w),round(crop['h']*h)
for sub in ['overview/individual-comparisons','detail-crops','measurements']:(root/sub).mkdir(parents=True,exist_ok=True)
images=[];metrics={};files=[];regions=[{**r,'name':'archived'+str(i),'selection':'Previously archived diagnostic source coordinates'} for i,r in enumerate(record['details'])];sampleRGB={}
with zipfile.ZipFile(old) as oldzip,zipfile.ZipFile(archive) as newzip:
 for label in 'ABCD':
  z=oldzip if label in 'AB' else newzip;entry=f'FILMLABB_V2_TONE_REVIEW/full-resolution/image{case}_{"before" if label=="A" else "after"}.tiff' if label in 'AB' else f'FILMLABB_V2_PRESENTATION_REVIEW/full-resolution/image{case}_{label}.tiff';data=z.read(entry);pixels,icc=common.read_tiff(data,record)
  digest=hashlib.sha256(data).hexdigest()
  if label in 'AB':assert digest==record['reusedAB']['variants']['before' if label=='A' else 'after']['TIFF']['sha256']
  film=pixels[y:y+ch,x:x+cw];strideY=max(1,ch//180);strideX=max(1,cw//180);samples=film[::strideY,::strideX].reshape(-1,3);linear=common.srgb_decode(samples.astype(np.float64)/65535);ys=linear@np.array([.2126,.7152,.0722]);quantiles=[.01,.05,.1,.5,.6,.9,.95,.99];yp=np.quantile(ys,quantiles,method='lower').tolist();sampleRGB[label]=linear
  if label=='A':
   # Bright/dark tiles are selected ONCE on A, inside the same frame and away
   # from holder/endpoint pixels. They are not semantic skin detection.
   tiles=[];size=256
   for yy in np.linspace(y+size//2,y+ch-size*1.5,8).astype(int):
    for xx in np.linspace(x+size//2,x+cw-size*1.5,8).astype(int):
     tile=pixels[yy:yy+size:16,xx:xx+size:16];ly=common.srgb_decode(tile.astype(float)/65535)@np.array([.2126,.7152,.0722]);median=float(np.median(ly))
     if median>.005 and np.mean(np.any(tile==0,axis=2))<.01:tiles.append((median,xx,yy))
   tiles.sort();assert len(tiles)>8
   for name,q in [('shadow',.1),('highlight',.9)]:
    _,xx,yy=tiles[int((len(tiles)-1)*q)];regions.append({'x':int(xx),'y':int(yy),'width':size,'height':size,'name':name,'selection':f'A-only {q:.1f} quantile of valid interior tile median luminance, fixed across A/B/C/D'})
  detailMetrics=[]
  for region in regions:
   xx,yy,ww,hh=[region[k] for k in ['x','y','width','height']];a=pixels[yy:yy+hh,xx:xx+ww];assert a.shape==(hh,ww,3);dest=root/'detail-crops'/f'image{case}_{region["name"]}_{label}.png';common.png16(dest,a);files.append(dest)
   l=common.srgb_decode(a[::4,::4].astype(float)/65535)@np.array([.2126,.7152,.0722]);pcts=np.quantile(l,quantiles,method='lower').tolist()
   detailMetrics.append({'region':region,'file':str(dest.relative_to(root)),'sha256':common.digest(dest),'quantiles':quantiles,'luminance':pcts,'highlightSeparationP99P90':pcts[7]-pcts[5],'shadowSeparationP10P01':pcts[2]-pcts[0],'uniqueRGB16Codes':[int(np.unique(a[:,:,i]).size) for i in range(3)],'non8BitSamples':int(np.count_nonzero(a%257))})
  im=Image.fromarray(((film.astype(np.uint32)+128)//257).astype(np.uint8));im.thumbnail((650,650),Image.Resampling.LANCZOS);images.append(im)
  metrics[label]={'TIFF':{'file':f'full-resolution/image{case}_{label}.tiff','sourceEntry':entry,'bytes':len(data),'sha256':digest,'dimensions':[w,h],'bits':16,'iccSHA256':hashlib.sha256(icc).hexdigest(),'reusedFromPR89':label in 'AB'},'quantiles':quantiles,'luminance':yp,'highlightSeparationP99P90':yp[7]-yp[5],'shadowSeparationP10P01':yp[2]-yp[0],'headroomAtP99':1-yp[7],'lowChannelFraction':np.mean(samples==0,axis=0).tolist(),'highChannelFraction':np.mean(samples==65535,axis=0).tolist(),'medianRelativeRGBChroma':float(np.median((linear.max(axis=1)-linear.min(axis=1))/np.maximum(ys,1e-20))),'details':detailMetrics,'basis':'Same source-coordinate point grid in actual native TIFF, not thumbnail. ROI stats on same 4-pixel grid.'}
assert len({m['TIFF']['iccSHA256'] for m in metrics.values()})==1
width=max(i.width for i in images);height=max(i.height for i in images);sheet=Image.new('RGB',(width*4+48,height+54),'#202020');d=ImageDraw.Draw(sheet)
for i,(label,im) in enumerate(zip('ABCD',images)):
 sheet.paste(im,(i*(width+16),54));d.text((i*(width+16)+7,8),case+' '+label+' '+{'A':'production 6e3d763','B':'exposure 912430a','C':'photo shoulder v1','D':'neutral shoulder v1'}[label],fill='white');d.text((i*(width+16)+7,29),'EV '+str(round(record['variants'][label]['exposure'],4)),fill='white')
file=root/'overview/individual-comparisons'/f'image{case}.png';sheet.save(file,icc_profile=icc);files.append(file)
record['presentationMeasurements']=metrics;record['matchedRegions']=regions;record['productionChanged']=False
for label in 'ACD':
 a,b=sampleRGB['B'],sampleRGB[label];ya=a@np.array([.2126,.7152,.0722]);yb=b@np.array([.2126,.7152,.0722]);metrics[label]['deltaToB']={'medianY':float(np.median(yb)-np.median(ya)),'rmsRGB':float(np.sqrt(np.mean((b-a)**2)))}
(p/f'{case}_record.json').write_text(json.dumps(record,indent=2)+'\n');meta=root/'measurements'/f'image{case}.json';meta.write_text(json.dumps(record,indent=2)+'\n');files.append(meta)
# TIFF payload lives only in its per-image transport ZIP; no second full buffer.
# Native PNGs/metadata are included separately in small review packs as well.
with zipfile.ZipFile(archive,'a',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 z.write(meta,'FILMLABB_V2_PRESENTATION_REVIEW/measurements/'+meta.name)
with zipfile.ZipFile(archive) as z:assert z.testzip() is None and len([x for x in z.namelist() if x.endswith('.tiff')])==2
print('PACKED PRESENTATION',case,archive.stat().st_size,common.digest(archive),flush=True)
