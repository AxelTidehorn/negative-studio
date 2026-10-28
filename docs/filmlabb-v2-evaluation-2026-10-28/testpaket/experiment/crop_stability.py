import pathlib,json,numpy as np
from experiments import positive,parameters
out=pathlib.Path(__file__).resolve().parent.parent/'results';rows=[]
for n in [0,1,2,3,4,5,6,8,9,10,11]:
 d=json.loads((out/f'{n:02d}_decode.json').read_text());a=json.loads((out/f'{n:02d}_analysis.json').read_text());raw=np.memmap(out/f'{n:02d}_source.f32',dtype='<f4',mode='r',shape=(4032,6032,3));c=d['reference']['exportCrop'];records=[]
 for inset in [0,.02,.05]:
  xs=np.minimum(6031,((c['x']+c['w']*(inset+(np.arange(200)+.5)/200*(1-2*inset)))*6032).astype(int));ys=np.minimum(4031,((c['y']+c['h']*(inset+(np.arange(200)+.5)/200*(1-2*inset)))*4032).astype(int));j=np.array(raw[ys[:,None],xs[None,:]]);p=positive(j,np.array(a['base']['rgb']),np.ones(3)/.65);pr=parameters(p);records.append({'inset_fraction_each_side':inset,'requested_E1_EV':pr['EV'],'p99_50_ratio':pr['dynamic_ratio99_50']})
 rows.append({'index':n,'method':'200x200 deterministic source grid; original linear pixels, same base, response and frozen tone formula','variants':records,'max_change_EV':max(r['requested_E1_EV'] for r in records)-min(r['requested_E1_EV'] for r in records)})
json.dump(rows,open(out/'crop_stability.json','w'),indent=2);print('max EV range',max(r['max_change_EV'] for r in rows))
