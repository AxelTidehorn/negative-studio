import pathlib,zipfile
root=pathlib.Path(__file__).resolve().parent.parent;out=root/'results';dest=root/'deliverables'
groups={f'FILMLABB_2_Export_{n:02d}.zip':[out/f'{n:02d}_A.tif']+sorted(out.glob(f'{n:02d}_full_*.tif')) for n in [0,4,9,10]}
groups['FILMLABB_2_A_ovriga_1.zip']=[out/f'{n:02d}_A.tif' for n in [1,2,3,5]]
groups['FILMLABB_2_A_ovriga_2.zip']=[out/f'{n:02d}_A.tif' for n in [6,8,11]]
groups['FILMLABB_2_V2_RGB16_previews.zip']=sorted(out.glob('??_B_*.rgb16'))
for name,paths in groups.items():
 with zipfile.ZipFile(dest/name,'w',zipfile.ZIP_DEFLATED,compresslevel=1) as z:
  for p in paths+[out/'export_manifest.json',dest/'manifest.json',dest/'README_reproducera.md']:z.write(p,p.relative_to(root))
 print(name,len(paths),(dest/name).stat().st_size,flush=True)
