"""Index and small native-crop packs for the four-way review. No rendering.
python3 tools/v2-presentation-index.py PRIVATE_OUTPUT PREVIOUS_REVIEW
"""
from pathlib import Path
import sys,json,hashlib,zipfile,subprocess
from PIL import Image
p=Path(sys.argv[1]).resolve();previous=Path(sys.argv[2]).resolve();root=p/'FILMLABB_V2_PRESENTATION_REVIEW'
if p.is_relative_to(Path(__file__).resolve().parent.parent):raise ValueError('Keep private output outside repo')
cases=['00','01','02','03','04','05','06','08','09','10','11'];records=[json.loads((p/f'{c}_record.json').read_text()) for c in cases]
sha=lambda file:hashlib.sha256(file.read_bytes()).hexdigest()
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();freeze=json.loads((p/'freeze.json').read_text());rows=[]
for c,r in zip(cases,records):
 old=json.loads((previous/'transport'/c/'transport-manifest.json').read_text());new=json.loads((p/'transport'/c/'transport-manifest.json').read_text());rows.append({'imageID':c,'sourceSHA256':r['raw']['sha256'],'split':'development' if c in freeze['presentation']['development'] else 'control','variants':r['presentationMeasurements'],'regions':r['matchedRegions'],'archives':[old['archive'],new['archive']],'settings':r['settings'],'source':r['source'],'base':r['base'],'calibration':r['calibration'],'analysisArea':r['analysisArea'],'exposure':{label:r['variants'][label]['exposure'] for label in 'ABCD'}})
manifest={'schema':'filmlabb.v2-presentation-review','version':1,'baseline':'6e3d763cfdaad958fac7baf4d8acda3cb5e9733b','exposureCandidateCommit':'912430a762f28c7b7e316cdc71056f35c87dbba1','implementationCommit':head,'model':freeze['presentation'],'productionChanged':False,'variants':{'A':'Frozen production Photographic 2 + finish 1','B':'PR89 scene exposure, old shoulder','C':'B EV, matched-shoulder-1, contrastEV=.5','D':'B EV, matched-shoulder-1, contrastEV=0'},'images':rows,'limitations':['Historically seen photos; development 09/05/11, parameters frozen before controls','No calibrated scene exposure/color ground truth or night/low-key series','Same inherited output gamut/photographic finish in all variants, neutral means tone only','Greater upper-register contrast trades against extreme-tail separation and remaining headroom','16-bit code separation is not newly recovered sensor information','Experiments are not serialized production recipes; no UI/default/project change']}
(root/'comparison-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'measurements/per-image.json').write_text(json.dumps(records,indent=2)+'\n')
contact=Image.new('RGB',(1800,len(cases)*520),'#202020')
for i,c in enumerate(cases):
 im=Image.open(root/'overview/individual-comparisons'/f'image{c}.png');im.thumbnail((1800,510),Image.Resampling.LANCZOS);contact.paste(im,(0,i*520))
contact.save(root/'overview/contact-sheet.png')
summary='# Four-way tone presentation review\n\nSame source/area/base/calibration/manual edits; B/C/D have IDENTICAL EV. A/B TIFFs are byte-for-byte PR89 originals. All files have native 6032×4032 RGB16 data and the same ICC.\n\n|Image|Variant|EV|Y50|P99−P90|P10−P01|Headroom at P99|Max channel endpoint fraction|\n|---|---|---:|---:|---:|---:|---:|---:|\n'
for c,r in zip(cases,records):
 for label,m in r['presentationMeasurements'].items():summary+=f"|{c}|{label}|{r['variants'][label]['exposure']:.4f}|{m['luminance'][3]:.4f}|{m['highlightSeparationP99P90']:.5f}|{m['shadowSeparationP10P01']:.5f}|{m['headroomAtP99']:.4f}|{max(m['highChannelFraction']):.6f}|\n"
summary+='\nC: narrow shoulder-only candidate, better ordinary highlights, more compression in the extreme tail. D: same model with lower midtone contrast, more open shadows/headroom, softer appearance. No automatic promotion. Quantized channel endpoints can increase; inspect native crops. Numbers do not establish photographic quality or calibrated colors.\n'
(root/'measurements/summary.md').write_text(summary)
assemble='''from pathlib import Path
import argparse,json,hashlib,zipfile,io,shutil
p=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('images',nargs='*');parser.add_argument('--verify-only',action='store_true');parser.add_argument('--parts-dir',default=str(p.parent));args=parser.parse_args()
manifest=json.loads((p/'comparison-manifest.json').read_text());parts=Path(args.parts_dir)
for image in manifest['images']:
 c=image['imageID']
 if args.images and c not in args.images:continue
 for archive in image['archives']:
  names=list(parts.glob('volume-*.json'));metadata=next((json.loads(f.read_text()) for f in names if json.loads(f.read_text()).get('archive')==archive['archive']),None)
  if metadata is None:raise RuntimeError('Missing transport metadata for '+archive['archive'])
  full=io.BytesIO()
  for part in metadata['parts']:
   data=(parts/part['name']).read_bytes()
   assert hashlib.sha256(data).hexdigest()==part['sha256'],part['name'];full.write(data)
  assert hashlib.sha256(full.getbuffer()).hexdigest()==archive['sha256']
  with zipfile.ZipFile(full) as z:
   assert z.testzip() is None
   for info in z.infolist():
    if not info.filename.endswith('.tiff'):continue
    filename=Path(info.filename).name
    if filename.endswith('_before.tiff'):label='A'
    elif filename.endswith('_after.tiff'):label='B'
    elif filename.endswith('_C.tiff'):label='C'
    elif filename.endswith('_D.tiff'):label='D'
    else:raise RuntimeError('Unexpected TIFF name')
    expected=image['variants'][label]['TIFF'];dest=p/expected['file'];h=hashlib.sha256()
    if not args.verify_only:dest.parent.mkdir(parents=True,exist_ok=True);out=dest.open('wb')
    with z.open(info) as source:
     for block in iter(lambda:source.read(1048576),b''):
      h.update(block)
      if not args.verify_only:out.write(block)
    if not args.verify_only:out.close()
    assert h.hexdigest()==expected['sha256'],dest
    print('Verified',c,label,expected['dimensions'])
'''
(root/'assemble-review.py').write_text(assemble)
(root/'README.md').write_text('''# FILMLABB V2 — four-way tone presentation review

A = actual production 6e3d763. B = exact frozen PR89 exposure candidate 912430a.
C = B exposure, matched shoulder, photographic contrast. D = B exposure, same
shoulder, zero extra photographic contrast. No production change or new UI.
All four preserve the same reconstruction, color balance/gamut/finish and
neutral creative edits. No independent image adjustment in the sheets.

1. Extract this overview ZIP and the native-crop ZIPs into ONE directory.
2. For full TIFFs download the old A/B and new C/D transport parts for the
   selected image from DOWNLOADS.md. Extract these ordinary ZIPs in that same
   directory; part files and volume-*.json sit beside this review directory.
3. Run: python3 FILMLABB_V2_PRESENTATION_REVIEW/assemble-review.py 09
   This verifies SHA256, reuses PR89 TIFFs without changing a byte and writes
   image09_A.tiff through image09_D.tiff to full-resolution/. Omit 09 to do
   all images after downloading ALL volumes. --verify-only checks without
   writing TIFFs. No external Python packages are required for assembly.

The old restore-review.py included with transport ZIPs is not needed. Use the
assembly script from this overview pack to map both artifact families.
TIFFs have the WHOLE native 6032×4032 source including film edge, no scaling.
Overview uses the same film crop and Lanczos reduction in each column. All
native PNGs are RGB16 at the exact manifest coordinates, no rescaling,
sharpening or noise reduction. Light/dark tile selection is A-only and fixed;
archived portrait/problem regions are retained. No skin detector is implied.
All crops and source hashes are documented. No original RAW files included.

Review both gains and regressions. Brighter snow is not proof of a general
scene-exposure model. Greater upper-register separation can reduce extreme
highlight margin or increase quantized channel endpoints. D is deliberately
less contrasty; no claim of calibrated neutral color or night validation.
Private photographs — do not publish or redistribute publicly.
''')
files=[f for f in root.rglob('*') if f.is_file() and 'detail-crops' not in f.parts and 'full-resolution' not in f.parts]
archive=p/'FILMLABB_V2_PRESENTATION_REVIEW_overview.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in files:z.write(f,'FILMLABB_V2_PRESENTATION_REVIEW/'+str(f.relative_to(root)))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None
assert archive.stat().st_size<100*1024*1024
for i,group in enumerate([cases[:4],cases[4:8],cases[8:]],1):
 file=p/f'FILMLABB_V2_PRESENTATION_REVIEW_details{i}.zip'
 with zipfile.ZipFile(file,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for c in group:
   for f in sorted((root/'detail-crops').glob(f'image{c}_*.png')):z.write(f,'FILMLABB_V2_PRESENTATION_REVIEW/detail-crops/'+f.name)
 with zipfile.ZipFile(file) as z:assert z.testzip() is None
 assert file.stat().st_size<100*1024*1024
 print(file.name,file.stat().st_size,sha(file))
print(archive.name,archive.stat().st_size,sha(archive))
