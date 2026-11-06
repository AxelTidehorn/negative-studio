import pathlib,zipfile,json,hashlib,sys
root=pathlib.Path(__file__).resolve().parent.parent;dest=root/'deliverables';mode=sys.argv[1]
if mode=='test':
 paths=[root/'inventory.json']
 paths+=sorted(p for p in (root/'experiment').iterdir() if p.suffix in ['.py','.mjs','.txt'])
 paths+=sorted(p for p in (root/'results').iterdir() if p.suffix in ['.json','.npz'] or (p.suffix=='.png' and '_port_' not in p.name))
 paths+=sorted((root/'report_assets').glob('*.jpg'))
 paths+=[dest/n for n in ['manifest.json','inventory.csv','summary.csv','Teknisk_analys.md','README_reproducera.md']]
 name='FILMLABB_2_Testpaket.zip'
else:
 paths=sorted((root/'results').glob('??_A.tif'))+sorted((root/'results').glob('??_full_*.tif'))+[root/'results/export_manifest.json',dest/'manifest.json',dest/'README_reproducera.md']
 name='FILMLABB_2_Fullupplosta_exporter.zip'
with zipfile.ZipFile(dest/name,'w',zipfile.ZIP_DEFLATED,compresslevel=1,allowZip64=True) as z:
 for p in paths:z.write(p,p.relative_to(root))
with zipfile.ZipFile(dest/name) as z:assert len(z.infolist())==len(paths)
print(name,'files',len(paths),'bytes',(dest/name).stat().st_size,flush=True)
