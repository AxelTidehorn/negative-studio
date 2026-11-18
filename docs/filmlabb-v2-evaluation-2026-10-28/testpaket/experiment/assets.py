from PIL import Image,ImageDraw
import json,numpy as np,pathlib
root=pathlib.Path(__file__).resolve().parent.parent;out=root/'results';assets=root/'report_assets';assets.mkdir(exist_ok=True)
rot={0:-90,1:-90,2:-90,3:0,4:-90,5:0,6:-90,8:0,9:0,10:-90,11:-90}
for n in rot:
 target=out/f'{n:02d}_raw_negative.png'
 if not target.exists():
  d=json.loads((out/f'{n:02d}_decode.json').read_text());s=d['source'];p=np.memmap(out/f'{n:02d}_source.f32',dtype='<f4',mode='r',shape=(s['height'],s['width'],3))[::6,::6];p=np.maximum(p,0);p=np.where(p<=.0031308,p*12.92,1.055*p**(1/2.4)-.055);Image.fromarray(np.uint8(np.clip(p,0,1)*255)).save(target)
for n in [0,4,9]:
 p=out/f'{n:02d}_Neo_core.rgba8';r=json.loads((out/f'{n:02d}_neo_recipe.json').read_text());a=np.fromfile(p,dtype='uint8').reshape(r['height'],r['width'],4);im=Image.fromarray(a[:,:,:3]);im.thumbnail((1000,1000));im.save(out/f'{n:02d}_Neo_core.png')
for n in rot:
 for label in ['A','B_auto','B_technical','B_fixed','E1_median','E1_robust','E2_pooled','E2_gamma055','E2_gamma080','E3_color','E3_frozen','prior_base','Neo_core']:
  p=out/f'{n:02d}_{label}.png'
  if p.exists():Image.open(p).rotate(rot[n],expand=True).convert('RGB').save(assets/f'{n:02d}_{label}.jpg',quality=95,subsampling=0)
for group,name in [([0,1,2,3],'dev1'),([4,5,6,8,11],'dev2'),([9,10],'validation')]:
 cv=Image.new('RGB',(1200,330*len(group)),'#181818');draw=ImageDraw.Draw(cv)
 for i,n in enumerate(group):
  for k,label in enumerate(['A','B_auto','E1_robust','E3_frozen']):
   im=Image.open(assets/f'{n:02d}_{label}.jpg');im.thumbnail((300,300));cv.paste(im,(k*300,i*330+25));draw.text((k*300+5,i*330+5),f'{n:02d} {label}',fill='white')
 cv.save(assets/(name+'.jpg'),quality=92)
cv=Image.new('RGB',(1200,600),'#222222')
for i,n in enumerate([9,10]):
 for k,label in enumerate(['B_auto','E1_robust','E2_pooled','E3_frozen']):
  im=Image.open(assets/f'{n:02d}_{label}.jpg');im.thumbnail((300,275));cv.paste(im,(k*300,i*300+25));ImageDraw.Draw(cv).text((k*300+5,i*300+5),f'{n:02d} {label}',fill='white')
cv.save(assets/'response_validation.jpg',quality=94)
