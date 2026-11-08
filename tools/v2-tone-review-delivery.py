"""Create a compact review index or transport volumes for a private ZIP.
python3 tools/v2-tone-review-delivery.py PRIVATE_OUTPUT index|volumes CASE
"""
from pathlib import Path
import json,sys,hashlib,zipfile
from PIL import Image,ImageDraw
p=Path(sys.argv[1]).resolve();root=p/'FILMLABB_V2_TONE_REVIEW'
if p.is_relative_to(Path(__file__).resolve().parent.parent):raise ValueError('Keep private artifacts outside repository')
def sha(file):
 h=hashlib.sha256()
 with open(file,'rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
if sys.argv[2]=='volumes':
 c=sys.argv[3];archive=p/('FILMLABB_V2_TONE_REVIEW_image'+c+'.zip');stage=p/'transport'/c;stage.mkdir(parents=True,exist_ok=True)
 parts=[];length=90*1024*1024;fullhash=sha(archive)
 join='''from pathlib import Path
import hashlib,json,zipfile
p=Path(__file__).resolve().parent
for meta in sorted(p.glob('volume-image*.json')):
 m=json.loads(meta.read_text());target=p/m['archive'];h=hashlib.sha256()
 with target.open('wb') as out:
  for part in m['parts']:
   data=(p/part['name']).read_bytes()
   assert hashlib.sha256(data).hexdigest()==part['sha256'],part['name']
   h.update(data);out.write(data)
 assert h.hexdigest()==m['sha256'],target
 with zipfile.ZipFile(target) as z:
  assert z.testzip() is None
  z.extractall(p)
 print('Verified and extracted',target.name)
'''
 with archive.open('rb') as f:
  index=0
  while data:=f.read(length):
   index+=1;name=archive.name+f'.{index:03}';dest=stage/(archive.stem+f'_part{index:02}.zip');parts.append({'name':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
   with zipfile.ZipFile(dest,'w',zipfile.ZIP_STORED) as z:z.writestr(name,data)
 meta={'archive':archive.name,'sha256':fullhash,'parts':parts}
 # Repeat small metadata/script in each volume, so any volume explains itself.
 for dest in sorted(stage.glob('*.zip')):
  with zipfile.ZipFile(dest,'a',zipfile.ZIP_STORED) as z:
   z.writestr('volume-image'+c+'.json',json.dumps(meta,indent=2)+'\n');z.writestr('restore-review.py',join)
   z.writestr('RESTORE.txt','Extract all partNN.zip files into ONE directory. Then run python3 restore-review.py. The script verifies every part and original ZIP, extracts the full review directory, and never changes image pixels. Full unsplit archives remain in the original workspace. These transport ZIPs work in Python/ChatGPT; no pip packages are needed for restoration.\n')
  assert dest.stat().st_size<100*1024*1024
 # Check the actual transport bytes reconstruct exactly, without a second file.
 h=hashlib.sha256()
 for index,part in enumerate(parts,1):
  dest=stage/(archive.stem+f'_part{index:02}.zip')
  with zipfile.ZipFile(dest) as z:
   assert z.testzip() is None;data=z.read(part['name']);assert hashlib.sha256(data).hexdigest()==part['sha256'];h.update(data)
 assert h.hexdigest()==fullhash
 (stage/'transport-manifest.json').write_text(json.dumps({'archive':meta,'volumes':[{'file':x.name,'bytes':x.stat().st_size,'sha256':sha(x)} for x in sorted(stage.glob('*.zip'))]},indent=2)+'\n')
 print(stage)
elif sys.argv[2]=='index':
 records=[json.loads(x.read_text()) for x in sorted(p.glob('*_record.json'))];freeze=json.loads((p/'freeze.json').read_text());rows=[]
 cv=Image.new('RGB',(1000,len(records)*400),'#202020');draw=ImageDraw.Draw(cv)
 for i,r in enumerate(records):
  c=r['source']['revision'].split('-')[-1];image=Image.open(root/'overview/individual-comparisons'/('image'+c+'.png'));image.thumbnail((1000,390),Image.Resampling.LANCZOS);cv.paste(image,(0,i*400))
  rows.append({'imageID':c,'split':'development' if c in freeze['development'] else 'control','beforeEV':r['before']['exposure'],'afterEV':r['after']['exposure'],'deltaEV':r['after']['exposure']-r['before']['exposure'],'fallback':r['candidateAnalysis'].get('candidateFallback'),'measurements':r['exportMeasurements'],'metadata':'measurements/image'+c+'.json','sourceSHA256':r['raw']['sha256'],'detailCoordinates':r['details'],'archive':{'file':'FILMLABB_V2_TONE_REVIEW_image'+c+'.zip','sha256':sha(p/('FILMLABB_V2_TONE_REVIEW_image'+c+'.zip'))}})
 cv.save(root/'overview/contact-sheet.png')
 manifest={'schema':'filmlabb.v2-tone-comparison','version':1,'baseline':freeze['baseline'],'candidate':freeze['parameters'],'freeze':freeze,'productionChanged':False,'decision':'Do not promote: snow gets brighter but highlights separate less, and ordinary portraits/facades can look washed out. Human review is required.','geometry':'TIFFs: original full source dimensions, no scaling/rotation/crop. Sheets: same archived film crop and same reduction. Detail PNGs: RGB16, same native source coordinates, no scaling.','limitations':['Historically seen photographs; no independent unseen film/camera validation','No controlled low-key/night or thin/dense-negative series','No measured scene exposure/color ground truth','Human iPad Safari and Windows Edge review pending','Transport ZIPs contain hash-verified parts of the complete native TIFF ZIP; restore-review.py reassembles and extracts without dependencies'],'images':rows}
 (root/'comparison-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(root/'measurements/per-image.json').write_text(json.dumps(records,indent=2)+'\n')
 summary='# Photographic review — scene-distribution-1\n\nProduction unchanged. Only global automatic EV differs. Color/curve/gamut and manual edits are frozen. Exact 16-bit TIFFs and native crops are included in per-image archives.\n\n|Image|Split|Before EV|After EV|Delta|Fallback|\n|---|---|---:|---:|---:|---|\n'
 for r in rows:summary+=f"|{r['imageID']}|{r['split']}|{r['beforeEV']:.4f}|{r['afterEV']:.4f}|{r['deltaEV']:+.4f}|{r['fallback'] or 'none'}|\n"
 summary+='\nSnow 09 is brighter but P99–P90 separation decreases. 00 is a plausible brighter facade; 06 changes subtly. 08 and 11 show why a concentrated upper population is not sufficient evidence for a high-key target. Unchanged pairs are controls, not improvements. No claim of repaired color or verified low-key behavior.\n\nSee comparison-manifest.json for luminance/chroma/clip measurements and exact source hashes/coordinates. Numbers are not photographic ground truth.\n'
 (root/'measurements/summary.md').write_text(summary)
 dest=p/'FILMLABB_V2_TONE_REVIEW_overview.zip'
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for file in root.rglob('*'):
   if file.is_file():z.write(file,'FILMLABB_V2_TONE_REVIEW/'+str(file.relative_to(root)))
 with zipfile.ZipFile(dest) as z:assert z.testzip() is None
 print(dest,dest.stat().st_size,sha(dest))
else:raise ValueError('index or volumes required')
