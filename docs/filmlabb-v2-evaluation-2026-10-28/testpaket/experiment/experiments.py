import json,pathlib,sys,math
import numpy as np
from PIL import Image,ImageCms
root=pathlib.Path(__file__).resolve().parent.parent; out=root/'results'
M=np.array([[1.6604910021084345,-.5876411387885495,-.0728498633198848],[-.1245504745215907,1.13289989712596,-.0083494226043694],[-.0181507633549052,-.1005788980080074,1.1187296613629127]])
M=M.astype(np.float32);W=np.array([.2627,.678,.0593],dtype=np.float32); WS=np.array([.2126,.7152,.0722],dtype=np.float32);icc=ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
def encode(a):return np.where(a<=.0031308,12.92*a,1.055*np.maximum(a,0)**(1/2.4)-.055)
def display(p):
 q=p@M.T;y=np.maximum(0,q@WS);mi=q.min(-1);sat=np.where(mi<0,y/np.maximum(1e-30,y-mi),1);q=np.maximum(0,y[...,None]+(q-y[...,None])*sat[...,None]);peak=q.max(-1);target=np.where(peak<=.8,peak,.8+.2*(-np.expm1(-np.maximum(0,peak-.8)/.2)));return q*(target/np.maximum(peak,1e-30))[...,None]
def positive(j,b,slopes):return .18*np.power(10,np.clip((-np.maximum(-8,np.log10(np.maximum(j,1e-30)/b))-1)*slopes,-20,20))
def tone(p,e):return p*e/(1+(p@W)*e)[...,None]
def metrics(p):
 y=p@WS;return {'Y_percentiles':np.percentile(y,[.1,1,5,10,50,90,95,99,99.9]).tolist(),'rgb_medians':np.median(p.reshape(-1,3),axis=0).tolist(),'rgb_high_fraction':(p>=.999).mean((0,1)).tolist(),'rgb_low_fraction':(p<=1/65535).mean((0,1)).tolist(),'Y_high_fraction':float((y>=.999).mean()),'Y_low_fraction':float((y<.005).mean()),'shadow_separation_p10_p1':float(np.percentile(y,10)-np.percentile(y,1)),'highlight_separation_p99_p90':float(np.percentile(y,99)-np.percentile(y,90))}
def resize_linear(p,w,h):return np.stack([np.asarray(Image.fromarray(p[...,c].astype('float32')).resize((w,h),Image.Resampling.BOX)) for c in range(3)],-1)
def save(p,prefix,name,shape):
 w,h=shape;q=resize_linear(p,w,h);Image.fromarray(np.uint8(np.round(np.clip(encode(q),0,1)*255))).save(out/f'{prefix}_{name}.png',icc_profile=icc);return metrics(q)
def parameters(p):
 y=p@W;q=np.percentile(y,[1,10,50,60,75,95,99]);dr=q[-1]/max(q[2],1e-12);target=.12 if dr>40 else .25;e_mid=target/max(q[3],1e-12);e_hi=3/max(q[-1],1e-12);e=e_mid/math.sqrt(1+(e_mid/e_hi)**2);return {'percentiles':q.tolist(),'dynamic_ratio99_50':dr,'q60_target':target,'mid_EV':math.log2(e_mid),'highlight_EV':math.log2(e_hi),'EV':math.log2(e),'linear_gain':e,'night_heuristic':bool(dr>40)}
def main(n,pooled=[1,1,1]):
 frozen=json.loads((out/'frozen_parameters.json').read_text()) if (out/'frozen_parameters.json').exists() else {'slopes':[1,1,1],'density_offset':[0,0,0],'positive_gain':[1,1,1]}
 pooled=frozen['slopes']
 prefix=f'{n:02d}';d=json.loads((out/f'{prefix}_decode.json').read_text());a=json.loads((out/f'{prefix}_analysis.json').read_text());s=d['source'];raw=np.memmap(out/f'{prefix}_source.f32',dtype='<f4',mode='r',shape=(s['height'],s['width'],3));crop=a['geometry']['crop'];x=int(crop['x']*s['width']);y=int(crop['y']*s['height']);w=round(crop['w']*s['width']);h=round(crop['h']*s['height']);j=np.asarray(raw[y:y+h,x:x+w],dtype='float32');b=np.array(a['base']['rgb'],dtype=np.float32);slopes=np.ones(3,dtype=np.float32)/.65;shape=(a['geometry']['width'],a['geometry']['height']);stats={'split':'validation' if n in [9,10] else 'development','crop':crop,'rotation_display_degrees_clockwise':{0:90,1:90,2:90,3:0,4:90,5:0,6:90,8:0,9:0,10:90,11:90}[n],'base':b.tolist(),'base_region':a['measurement']['region'],'warnings':a['measurement']['reasons'],'control_intent':a['intent'],'versions':{},'experiments':{}}
 # Numerical oracle: exact same physical pixel values from unchanged JS core.
 samples=a['samples'];js=np.array([p['p'] for p in samples]);calc=positive(np.array([p['j'] for p in samples]),b,slopes);stats['oracle_max_relative_error']=float(np.max(abs(calc-js)/np.maximum(js,1e-20)))
 p=positive(j,b,slopes);stats['source_crop_clipped_fraction']=(j>=65534/65535).mean((0,1)).tolist();stats['source_crop_nonpositive_fraction']=(j<=0).mean((0,1)).tolist();stats['frozen_parameters']=frozen;stats['technical_Y_percentiles']=np.percentile(p@W,[1,5,10,50,90,95,99]).tolist();stats['density_percentiles']=np.percentile(-np.log10(np.maximum(j,1e-30)/b),[1,10,50,90,99],axis=(0,1)).tolist()
 np.savez_compressed(out/f'{prefix}_technical_linear_rec2020.npz',rgb=resize_linear(p,*shape),base=b,crop=np.array([x,y,w,h]),domain='linear Rec2020; technical positive, prior response; no display tone')
 for mode in ['technical','fixed','auto']:
  f=out/f'{prefix}_B_{mode}.rgb16'
  if f.exists():
   v=np.fromfile(f,dtype='<u2').reshape(shape[1],shape[0],3)/65535;Image.fromarray(np.uint8(np.round(v*255))).save(out/f'{prefix}_B_{mode}.png',icc_profile=icc)
  q=display(p if mode=='technical' else tone(p,1 if mode=='fixed' else 2**a['intent']['exposure']));stats['versions']['B_'+mode]=save(q,prefix,'port_'+mode,shape)
 # Prior base control isolates missing orange mask cancellation.
 q=positive(j,np.ones(3),slopes);stats['versions']['prior_base']=save(display(tone(q,2)),prefix,'prior_base',shape)
 prm=parameters(p);stats['experiments']['tone']=prm
 variants={'E1_median':display(tone(p,.18/max(np.median(p@W),1e-30))),'E1_robust':display(tone(p,prm['linear_gain']))}
 for name,q in variants.items():stats['versions'][name]=save(q,prefix,name,shape)
 # Frozen pooled slopes: statistic-derived hypotheses, never measured film calibration.
 for label,mult in [('E2_pooled',np.array(pooled)),('E2_gamma055',np.ones(3)*.65/.55),('E2_gamma080',np.ones(3)*.65/.80)]:
  pp=positive(j,b,slopes*mult);
  if label=='E2_pooled':pp*=np.power(10,-np.array(frozen['density_offset'])*slopes*mult)
  pr=parameters(pp);stats['versions'][label]=save(display(tone(pp,pr['linear_gain'])),prefix,label,shape);stats['experiments'][label]={'slope_multiplier':mult.tolist(),'tone':pr}
 # Controlled bounded positive grey-world: test, not an assertion of neutral illumination.
 pp=tone(p,prm['linear_gain']);sp=pp[::8,::8];l=sp@W;valid=(l>.05)&(l<.6);med=np.median(sp[valid],0) if valid.any() else np.ones(3);ev=np.clip(np.mean(np.log2(np.maximum(med,1e-20)))-np.log2(np.maximum(med,1e-20)),-.2,.2);ev-=ev@W;gain=2**ev;stats['experiments']['E3_color']={'gain':gain.tolist(),'EV':ev.tolist(),'assumption':'bounded grey-world, max 0.2 stops before common luminance renormalization; colored light may regress'};stats['versions']['E3_color']=save(display(pp*gain),prefix,'E3_color',shape)
 stats['experiments']['E3_frozen']={'frozen_positive_gain':frozen['positive_gain'],'learned_from':'development only, bounded pooled grey-world hypothesis'};stats['versions']['E3_frozen']=save(display(pp*0+tone(p,prm['linear_gain'])*np.array(frozen['positive_gain'])),prefix,'E3_frozen',shape)
 # Film-base sensitivity: same response, same exposure; only measured base changes.
 sensitivity=[]
 for bm in a['bases']:
  ps=positive(np.array([p['j'] for p in samples]),np.array(bm['measured']),slopes);sensitivity.append({'base':bm['measured'],'relative_change':(np.array(bm['measured'])/b-1).tolist(),'technical_median_RGB':np.median(ps,0).tolist(),'quality':bm['qualityStatus']})
 stats['base_sensitivity']=sensitivity
 (out/f'{prefix}_metrics.json').write_text(json.dumps(stats,indent=2));print(prefix,prm,flush=True)
if __name__=='__main__':main(int(sys.argv[1]),json.loads(sys.argv[2]) if len(sys.argv)>2 else [1,1,1])
