import pathlib,json,numpy as np
from PIL import Image
from experiments import tone,display,encode
out=pathlib.Path(__file__).resolve().parent.parent/'results';indices=[1,4,6,11];bases=np.array([json.loads((out/f'{n:02d}_analysis.json').read_text())['base']['rgb'] for n in indices]);shape=bases/bases[:,1,None];common=np.median(shape,0);records=[]
for i,n in enumerate(indices):
 a=json.loads((out/f'{n:02d}_analysis.json').read_text());b=bases[i];new=common*b[1];gain=(new/b)**(1/.65);p=np.load(out/f'{n:02d}_technical_linear_rec2020.npz')['rgb'];ev=a['intent']['exposure'];records.append({'index':n,'measured':b.tolist(),'hypothetical_shared':new.tolist(),'positive_gain':gain.tolist(),'max_abs_chromatic_EV':float(abs(np.log2(gain)).max())})
 for name,pp in [('E4_control',p),('E4_shared',p*gain)]:
  q=display(tone(pp,2**ev));im=Image.fromarray(np.uint8(np.clip(encode(q),0,1)*255));temp=out/f'{n:02d}_{name}.tmp.png';im.save(temp);temp.replace(out/f'{n:02d}_{name}.png')
json.dump({'verified_roll_identity':False,'grouping':'Candidate scan session: matching camera/WB/recipe, timestamps 2018-07-29, similar measured base chromaticity; this does not establish a physical roll','method':'Freeze median base R/G,1,B/G across group; retain each image G normalization and original per-image EV','preview_method':'Same reduced technical-linear buffer for both E4 versions; exploratory only, not full-source final export','common_shape':common.tolist(),'records':records},open(out/'shared_base.json','w'),indent=2)
