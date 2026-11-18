import pathlib,json,hashlib
root=pathlib.Path(__file__).resolve().parent.parent
manifest=json.loads((root/'deliverables/manifest.json').read_text()) if (root/'deliverables/manifest.json').exists() else json.loads((root/'manifest.json').read_text())
for f in manifest['files']:
 p=root/'originals'/(f['id']+'.RAF');h=hashlib.sha256()
 with p.open('rb') as inp:
  for chunk in iter(lambda:inp.read(1048576),b''):h.update(chunk)
 assert p.stat().st_size==f['actual_size'],f['id']+' size mismatch'
 assert h.hexdigest()==f['sha256'],f['id']+' hash mismatch'
 print(f['index'],f['title'],'OK')
