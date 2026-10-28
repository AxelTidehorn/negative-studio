import json, pathlib, hashlib, struct, io
import rawpy, exifread
from PIL import Image,ImageOps,ImageDraw
root=pathlib.Path(__file__).resolve().parent.parent
items=json.loads((root/'inventory.json').read_text()); tiles=[]
for n,f in enumerate(items):
 p=root/'originals'/ (f['id']+'.RAF'); b=p.read_bytes(); f['sha256']=hashlib.sha256(b).hexdigest(); f['actual_size']=len(b)
 with p.open('rb') as h: tags=exifread.process_file(h,details=False)
 f['metadata']={str(k):str(v) for k,v in tags.items() if any(s in k for s in ['Model','Make','DateTime','Exposure','ISO','FNumber','Focal','Orientation','WhiteBalance'])}
 try:
  with rawpy.imread(str(p)) as raw:
   f['dimensions']=[raw.sizes.width,raw.sizes.height];f['black_level']=raw.black_level_per_channel;f['white_level']=raw.white_level; f['camera_wb']=raw.camera_whitebalance;f['rgb_xyz_matrix']=raw.rgb_xyz_matrix.tolist();f['decode']='unpack OK'
  offset,length=struct.unpack('>II',b[84:92]); im=Image.open(io.BytesIO(b[offset:offset+length])); im=ImageOps.exif_transpose(im);im.thumbnail((450,330)); im.save(root/'results'/('%02d_negative.jpg'%n))
  tile=Image.new('RGB',(470,375),'#222222');tile.paste(im,((470-im.width)//2,10));ImageDraw.Draw(tile).text((10,345),f'{n:02d} {f["title"]} {f["id"][:8]}',fill='white');tiles.append(tile)
 except Exception as e:f['decode']=repr(e)
sheet=Image.new('RGB',(470*3,375*4),'#111111')
for n,t in enumerate(tiles):sheet.paste(t,((n%3)*470,(n//3)*375))
sheet.save(root/'results/contact_negative.jpg'); (root/'results/inventory.json').write_text(json.dumps(items,indent=2))
print(json.dumps([{k:f.get(k) for k in ['title','dimensions','decode','actual_size','sha256']} for f in items],indent=2))
