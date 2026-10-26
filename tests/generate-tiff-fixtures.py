from PIL import Image, TiffImagePlugin
from pathlib import Path
import json,random
out=Path('tests/fixtures/tiff');out.mkdir(parents=True,exist_ok=True)
rng=random.Random(56321);w,h=65,47
pixels=[tuple(rng.randrange(256) for _ in range(3)) for i in range(w*h)]
im=Image.new('RGB',(w,h));im.putdata(pixels)
manifest=[]
for codec in ['raw','tiff_lzw','tiff_adobe_deflate','packbits']:
 for orientation in range(1,9):
  name=f'rgb-{codec}-o{orientation}.tif';info=TiffImagePlugin.ImageFileDirectory_v2();info[274]=orientation
  im.save(out/name,compression=codec,tiffinfo=info)
  # Independent reference: Pillow applies TIFF orientation on loading.
  with Image.open(out/name) as expected:
   expected.load();manifest.append(dict(name=name,width=expected.width,height=expected.height,pixels=[v*257 for p in expected.getdata() for v in p]))
# 16 bit grayscale exercises word decoding, including big endian and compression.
values=[rng.randrange(65536) for _ in range(w*h)]
for endian in ['little','big']:
 gray=Image.frombytes('I;16' if endian=='little' else 'I;16B',(w,h),b''.join(v.to_bytes(2,endian) for v in values))
 for codec in ['raw','tiff_lzw','tiff_adobe_deflate','packbits']:
  name=f'gray16-{endian}-{codec}.tif';gray.save(out/name,compression=codec)
  manifest.append(dict(name=name,width=w,height=h,pixels=[v for p in values for v in [p,p,p]]))
(out/'expected.json').write_text(json.dumps(manifest))
print('Generated',len(manifest),'independent Pillow/libtiff fixtures')
import ctypes as c,ctypes.util,json
from pathlib import Path
p=Path('tests/fixtures/tiff');manifest=json.loads((p/'expected.json').read_text())
t=c.CDLL(ctypes.util.find_library('tiff'));t.TIFFOpen.argtypes=[c.c_char_p,c.c_char_p];t.TIFFOpen.restype=c.c_void_p
t.TIFFSetField.argtypes=[c.c_void_p,c.c_uint32];t.TIFFSetField.restype=c.c_int
t.TIFFWriteScanline.argtypes=[c.c_void_p,c.c_void_p,c.c_uint32,c.c_uint16];t.TIFFWriteScanline.restype=c.c_int
t.TIFFWriteEncodedTile.argtypes=[c.c_void_p,c.c_uint32,c.c_void_p,c.c_ssize_t];t.TIFFWriteEncodedTile.restype=c.c_ssize_t
t.TIFFClose.argtypes=[c.c_void_p]
w,h=35,27
value=lambda x,y,ch:(x*9851+y*12347+ch*28789)%65536
for tiled in [False,True]:
 for planar in [1,2]:
  for compression in [1,5,8,32773]:
   for bits in [8,16]:
    name=f'rgb{bits}-tile{int(tiled)}-planar{planar}-c{compression}.tif';f=t.TIFFOpen(str(p/name).encode(),b'w')
    def field(tag,val):assert t.TIFFSetField(f,tag,c.c_uint32(val))
    for tag,val in [(256,w),(257,h),(258,bits),(259,compression),(262,2),(277,3),(284,planar),(339,1)]:field(tag,val)
    if compression in [5,8]:field(317,2)
    if tiled:field(322,16);field(323,16)
    else:field(278,7)
    planes=range(3) if planar==2 else [0];ctype=c.c_uint16 if bits==16 else c.c_uint8
    for plane in planes:
     channels=[plane] if planar==2 else range(3)
     if tiled:
      for ty in range(2):
       for tx in range(3):
        vals=[(value(tx*16+x,ty*16+y,ch) if bits==16 else value(tx*16+x,ty*16+y,ch)%256) for y in range(16) for x in range(16) for ch in channels];a=(ctype*len(vals))(*vals)
        assert t.TIFFWriteEncodedTile(f,plane*6+ty*3+tx,a,c.sizeof(a))>=0
     else:
      for y in range(h):
       vals=[(value(x,y,ch) if bits==16 else value(x,y,ch)%256) for x in range(w) for ch in channels];a=(ctype*len(vals))(*vals);assert t.TIFFWriteScanline(f,a,y,plane)>=0
    t.TIFFClose(f)
    manifest.append(dict(name=name,width=w,height=h,pixels=[value(x,y,ch) if bits==16 else (value(x,y,ch)%256)*257 for y in range(h) for x in range(w) for ch in range(3)]))
(p/'expected.json').write_text(json.dumps(manifest));print(len(manifest),'TIFF fixtures')
