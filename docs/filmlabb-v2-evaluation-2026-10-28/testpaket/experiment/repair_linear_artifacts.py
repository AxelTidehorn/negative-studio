import json,pathlib,numpy as np
from experiments import positive,resize_linear
out=pathlib.Path(__file__).resolve().parent.parent/'results'
for n in [0,1,5,8,9,10,11]:
 d=json.loads((out/f'{n:02d}_decode.json').read_text());a=json.loads((out/f'{n:02d}_analysis.json').read_text());c=d['reference']['exportCrop'];s=d['source'];raw=np.memmap(out/f'{n:02d}_source.f32',dtype='<f4',mode='r',shape=(s['height'],s['width'],3));x=int(c['x']*s['width']);y=int(c['y']*s['height']);w=round(c['w']*s['width']);h=round(c['h']*s['height']);p=positive(raw[y:y+h,x:x+w],np.array(a['base']['rgb'],dtype='float32'),np.ones(3,dtype='float32')/.65);np.savez_compressed(out/f'{n:02d}_technical_linear_rec2020.npz',rgb=resize_linear(p,a['geometry']['width'],a['geometry']['height']),base=a['base']['rgb'],crop=np.array([x,y,w,h]),domain='linear Rec2020; exact prior including transmission floor; no display tone');print(n,flush=True)
