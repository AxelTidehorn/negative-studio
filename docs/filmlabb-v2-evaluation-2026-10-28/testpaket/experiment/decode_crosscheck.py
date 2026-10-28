import rawpy,numpy as np,json,pathlib
root=pathlib.Path(__file__).resolve().parent.parent;inv=json.loads((root/'inventory.json').read_text());n=0
with rawpy.imread(str(root/'originals'/(inv[n]['id']+'.RAF'))) as raw:
 native=raw.postprocess(use_camera_wb=True,use_auto_wb=False,output_color=rawpy.ColorSpace.Rec2020,output_bps=16,no_auto_bright=True,gamma=(1,1),half_size=False,demosaic_algorithm=rawpy.DemosaicAlgorithm.AHD,highlight_mode=rawpy.HighlightMode.Clip)
reference=np.memmap(root/'results/00_source.f32',dtype='<f4',mode='r',shape=native.shape);a=np.asarray(reference[::17,::17],dtype='float64');b=native[::17,::17]/65535;delta=b-a;valid=(a>.01)&(a<.95)
r={'native':'rawpy '+rawpy.__version__,'LibRaw':rawpy.libraw_version,'requested_recipe':'linear Rec2020, camera WB, no auto WB, noAutoBright, AHD requested, full size, highlight clip','native_size':list(native.shape),'wasm_size':list(reference.shape),'max_absolute_error':float(abs(delta).max()),'p99_absolute_error':float(np.percentile(abs(delta),99)),'median_ratio_native_wasm':np.nanmedian(np.where(valid,b/np.maximum(a,1e-30),np.nan),axis=(0,1)).tolist(),'rmse':float(np.sqrt(np.mean(delta**2))),'note':'Independent native decoder crosscheck; does not instrument pre-output clipping or prove actual X-Trans interpolation method'}
json.dump(r,open(root/'results/decode_crosscheck.json','w'),indent=2);print(r)
