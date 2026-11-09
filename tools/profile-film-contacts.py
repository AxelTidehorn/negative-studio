"""Contact sheets for profile-film-proofs.mjs; private output only.
python tools/profile-film-contacts.py PRIVATE_PROOFS
Pillow converts to RGB8 only for contact sheets; source RGB16 files stay intact.
"""
import sys,json
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(sys.argv[1]).resolve()
if root.is_relative_to(Path(__file__).resolve().parent.parent): raise ValueError('Keep photographs outside repository')
m=json.loads((root/'manifest.json').read_text())
for source in m['files']:
    variants=source['variants'];w=400;h=round(source['height']*w/source['width']);cellh=h+40
    sheet=Image.new('RGB',(w*4,cellh*4),(28,28,28));draw=ImageDraw.Draw(sheet)
    for i,v in enumerate(variants):
        im=Image.open(root/v['file']).convert('RGB');im.thumbnail((w,h),Image.Resampling.LANCZOS)
        x=(i%4)*w;y=(i//4)*cellh
        sheet.paste(im,(x,y+40));draw.text((x+5,y+5),v['label'],fill='white')
        draw.text((x+5,y+20),'locked Neutral / '+str(source['bits'])+' bit source',fill='white')
    name=Path(source['source']).stem.replace('_neutral','_contact')+'.jpg';sheet.save(root/name,quality=93)
