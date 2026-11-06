import json,pathlib,io,html,math
from PIL import Image,ImageDraw
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor,white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
root=pathlib.Path(__file__).resolve().parent.parent;out=root/'results';assets=root/'report_assets';dest=root/'deliverables';manifest=json.loads((dest/'manifest.json').read_text());rows=json.loads((out/'summary.json').read_text());by={r['index']:r for r in rows}
pdfmetrics.registerFont(TTFont('D','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'));pdfmetrics.registerFont(TTFont('DB','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
W,H=841.89,595.28;c=canvas.Canvas(str(dest/'FILMLABB_2_Bildrapport.pdf'),pagesize=(W,H));c.setTitle('FILMLABB 2.0 - riktiga negativ, faktiska resultat');c.setAuthor('FILMLABB praktiskt testlabb');page=0
def text(t,x,y,w=760,size=10,color='#24313C',bold=False,leading=None):
 style=ParagraphStyle('p',fontName='DB' if bold else 'D',fontSize=size,leading=leading or size*1.45,textColor=HexColor(color));p=Paragraph(t,style);ww,hh=p.wrap(w,1000);p.drawOn(c,x,y-hh);return y-hh
def start(title,sub=''):
 global page;page+=1;c.setFillColor(HexColor('#F6F6F4'));c.rect(0,0,W,H,fill=1,stroke=0);text('FILMLABB / PRAKTISKT TESTLABB',34,H-20,size=8,color='#47616C',bold=True);text(title,34,H-49,size=23,bold=True);text(sub,34,H-85,size=9,color='#596B72');c.setStrokeColor(HexColor('#C8D2D3'));c.line(34,30,W-34,30);text('28 OKTOBER 2026  /  RAF-ORIGINAL  /  INGEN PRODUKTIONSÄNDRING',34,23,size=7,color='#596B72');c.setFont('D',8);c.drawRightString(W-34,15,str(page))
def end():c.showPage()
def image(p,x,y,w,h):
 im=Image.open(p).convert('RGB');scale=min(w/im.width,h/im.height);ww=im.width*scale;hh=im.height*scale;b=io.BytesIO();im.save(b,format='JPEG',quality=95,subsampling=0);b.seek(0);from reportlab.lib.utils import ImageReader;c.drawImage(ImageReader(b),x+(w-ww)/2,y+(h-hh)/2,width=ww,height=hh)
def box(t,x,y,w,h,color='#E7ECEB'):
 c.setFillColor(HexColor(color));c.roundRect(x,y,w,h,7,fill=1,stroke=0);text(t,x+14,y+h-12,w-28,10)
def table(headers,data,x,y,widths,rowh=25,size=8):
 c.setFillColor(HexColor('#21333F'));c.rect(x,y-rowh,sum(widths),rowh,fill=1,stroke=0)
 xx=x
 for h,w in zip(headers,widths):text(h,xx+7,y-6,w-12,size,'#FFFFFF',True);xx+=w
 y-=rowh
 for i,row in enumerate(data):
  c.setFillColor(HexColor('#E8ECEA' if i%2==0 else '#F6F6F4'));c.rect(x,y-rowh,sum(widths),rowh,fill=1,stroke=0);xx=x
  for v,w in zip(row,widths):text(html.escape(str(v)),xx+7,y-6,w-12,size);xx+=w
  y-=rowh
 return y

start('Fungerande motor. Ännu inte bättre fotografier.','11 unika negativ • verklig FILMLABB-kedja • oförändrad V2 • fristående experiment')
text('Mörkret är verifierat. Färgproblemet är separat.',36,460,750,20,bold=True)
text('Tio av elva bilder begär mer exponering än V2 tillåter. Med mätt filmbas begär motorn +0,39 till +3,49 EV men begränsar tio bilder till +1 EV. En testad tonmodell lyfter mellanregistret, även på reserverade valideringsbilder.',36,420,740,12)
box('<b>12 RAF-filer / 11 innehåll</b><br/>Alla original avkodade. Två namnlikadana filer är byteidentiska. Två unika bilder reserverades för validering.',36,265,365,100)
box('<b>Riktig A, verifierad export</b><br/>Huvudappens faktiska TIFF-export och testharnessens A är byteidentiska på kontrollbilden. Inget Standard-snapshot ersätter A.',420,265,385,100)
text('Implementera först: robust automatisk positiv tonplacering.',36,235,745,16,bold=True)
text('Gör detta med filmruteankrad statistik, mjukt högdagerskydd och ny tonanalys när basen ändras. Färgjusteringarna i rapporten visar delvinster men klarar inte en generell produktionsgate. Befintliga FILMLABB ger ofta ljusare och mer trovärdig färgbalans, men kan vara urvattnad.',36,199,745,11)
text('Rapporten visar faktiska bildresultat. Teknisk_analys.md innehåller full kedja, hypoteser, orsaker, begränsningar och tre avgränsade Codex-uppdrag. Testpaketet innehåller recept, kod, diagnoser och mätvärden.',36,100,745,9);end()

start('Hela materialet - inte bara sju filer','Ny listning vid start och slutkontroll. Exakta ID och SHA-256 finns även i maskinläsbart manifest.')
data=[]
for f in manifest['files']:data.append([f"{f['index']:02d}",f['title'],f['id'],f"{f['actual_size']:,}".replace(',',' '),f['role']])
table(['Nr','Filnamn','Unikt Google Drive-ID','Byte','Roll'],data,34,470,[32,110,282,110,100],26,7.5)
text('Gemensamt: Fujifilm X-T2, 6032 × 4032 utpixlar, ISO 200, f/8, 80 mm enligt metadata. Slutartider 1/8-1/3 s. RAW-metadata och native svart-/vitnivå finns per fil i manifestet.',36,112,750,9)
text('06 och 07 har samma SHA-256 och testas som ett bildinnehåll. Filmtyp och fysisk rulle är inte verifierade. Skanningstid, filnummer och likartad mask är inte tillräckligt bevis.',36,73,750,9);end()

# Annotated contact sheet from actual decoded negative previews.
sheet=Image.new('RGB',(1200,300*3),'#151B20');dr=ImageDraw.Draw(sheet)
for i,n in enumerate([0,1,2,3,4,5,6,8,9,10,11]):
 im=Image.open(out/f'{n:02d}_raw_negative.png').convert('RGB');a=json.loads((out/f'{n:02d}_analysis.json').read_text());d=ImageDraw.Draw(im);r=a['measurement']['region'];d.rectangle((r['x']*im.width,r['y']*im.height,(r['x']+r['w'])*im.width,(r['y']+r['h'])*im.height),outline='#34FF87',width=4);im.thumbnail((300,260));sheet.paste(im,((i%4)*300,(i//4)*300+23));dr.text(((i%4)*300+6,(i//4)*300+5),f'{n:02d} '+manifest['files'][n]['title'],fill='white')
sheet.save(assets/'contact_actual_measured.jpg',quality=94)
start('Kontaktkarta: avkodade RAW-negativ','Grönt markerar slutlig manuellt uppmätt filmkant. Originalens orientering bevarad i denna karta.');image(assets/'contact_actual_measured.jpg',55,64,730,410);end()

start('Exponering och luminans - verkliga mätvärden','Y50: median i linjär display-sRGB. Högre median är inte i sig ett fotografiskt kvalitetsbevis.')
data=[]
for r in rows:data.append([f"{r['index']:02d}",r['role'],f"{r['requested_EV']:+.2f}",f"{r['applied_EV']:+.2f}",f"{r['E1_EV']:+.2f}",f"{r['B_Y50']:.3f}",f"{r['E3_Y50']:.3f}"])
table(['Nr','Testroll','V2 begär EV','V2 får EV','E1 får EV','B Y50','E3 Y50'],data,34,470,[36,105,115,110,110,95,95],25,8)
text('Median över bildmedianerna: B ≈ 0,0466; experiment E3 ≈ 0,1586. E3 = robust E1-ton + samma frysta positiva färggain för alla bilder. B mäts från faktiska JS-exportpixlar; experimentets mätning använder den verifierade numeriska porten.',36,127,748,9)
text('05 skyddas av högdagervillkoret: önskad E1-midplacering +3,45 EV blir +2,67 EV. Den blir därför mörkare än övriga i median. 08 har osäker, delvis klippt bas och bedöms separat.',36,78,748,9);end()

start('Vad diagnostiken faktiskt förklarar','Orsaker separeras från alternativa förklaringar och från vad materialet inte kan identifiera.')
items=[('1 / Mörker','P = 0,18 × 10^((D-1)/0,65). Prioren ger låg absolut nivå. En hård +1 EV-gräns lämnar därför för lite exponering. Luminans-Reinhard komprimerar vidare och kan inte återställa nekad EV.'),('2 / Blått finns före ton','Med mätt bas har 00:s tekniska kanalmedianer ungefär R 0,025 / G 0,037 / B 0,056. EV och gemensam luminanston ändrar inte dessa kanalrelationer. Basdivision ensam ger alltså inte naturlig färg.'),('3 / Basen är mätt, kvaliteten osäker','Automatisk V2-basdetektion avstår på alla 11. Manuella medianer är numeriskt giltiga men ofta variationsflaggade; 08 har också röd klippning. Hållarregioner underkändes och sparades som negativa kontroller.'),('4 / Ingen generell gammaförklaring påvisad','Explicit linjär import, gain 1 och Rec.2020 är spårbara. Native/WASM-kontroll ger i huvudsak samma data. Interna negativa matrisvärden/pre-output-klippning är däremot inte åtkomliga bakom Uint16-gränsen.'),('5 / Verifierad statusdefekt','Vid basbyte kan worker återanvända gammal intent/baseId. Detta måste rättas, men förklarar inte mörker och blått vid den första importen.')]
y=466
for title,body in items:y=text(title,36,y,745,11,bold=True)-5;y=text(body,36,y,745,9.5)-15
end()

notes={
0:'A ger en ljus, något urvattnad fasad. B är tydligt blå och mörk. E1 visar att mer EV lyfter motivet utan att ta bort blått. E3 minskar blådominansen men fasad/skylt är fortfarande inte säkert neutral. Ingen uppmätt vitreferens finns.',
1:'Den gula bussen blir mycket mörk i B. E1 återger betydligt mer skugg- och frontdetalj. E3 dämpar blådominans men förskjuter himmel/bakgrund mot rosa/lila. A ger en enklare, ljusare färgbalans. Himlens verkliga färg är inte verifierad.',
2:'Bilen och fasaden har kvar kraftigt cyan/grönt även efter E3. En global färggain från andra motiv löser inte detta. A har också viss färgdominans men är fotografiskt mer användbar här. Motivet motbevisar en universell E3-gain.',
3:'Vattnet och promenaden förblir kraftigt blå/lila. E1 ger läsbarare skuggor; E3 ger ingen övertygande naturlig balans. Viss källklippning och film-/hållarkant finns i ramen. Färgfelet kan inte förklaras enbart med låg exponering.',
4:'Ansiktet i B är för mörkt och kallt. E1 gör hudton och ögon läsbara. E3 värmer motivet men ger rosa/lila grundton och flatare karaktär. Den slutliga basregionen ligger i synlig nederkant; den första hållarregionen är underkänd.',
5:'Fönstermotljus kräver en avvägning. E1:s högdagervillkor begränsar exponeringen jämfört med en ren medianlösning. B/E1 har stark blå färg utanför fönstret; E3 skiftar snarare mot lila än säker naturlighet. A är mer balanserad. Kanalhöga blå värden kvarstår.',
6:'B har nästan oläsbara skuggor. E1 ger den största EV-ökningen i testet (+4,50 EV) och återför ansiktena till synlig nivå. E3 värmer men ger rosa/magenta överlagring. Ljushetsvinsten är tydlig, färgvinsten begränsad. Detta är ingen nattbild.',
8:'Starkt färgdominerat nöjesfält. A är ljus/grön, B är blå. E1/E3 ändrar inte det grundläggande färgproblemet. Vald filmkant har cirka 2,4 % klippta röda prover, och hela RAW-källan cirka 0,88 % röda klippta pixlar. Resultatet kan inte användas som exakt responskalibrering.',
9:'OBEROENDE VALIDERING. Snö och ljusa byggnader är urvattnade i A, men mycket blå i B. E1 höjer ljusheten; E3 gör snön lila/blå och för grå för en övertygande snöåtergivning. Bättre median-Y bevisar alltså inte bättre fotografi. Kameravitbalansen skiljer sig från övriga filer.',
10:'OBEROENDE VALIDERING. E1 återför hudtonerna från för mörka nivåer men behåller blått i hud, hår och blus. E3 reducerar blått och hjälper ansiktena något, men blusen är fortfarande blå och motivet har en lila slöja. A är klart närmare en naturlig helhet, trots ljusa högdagrar.',
11:'B:s skjorta, vägg och hud är kalla. E1 återger mer mellanregister och separation. E3 ger varmare hud/vägg men också en magentaton och blå skjorta. A ger den mest omedelbart användbara bilden här. Global neutralisering får inte ersätta hänsyn till rummets varma ljus.'}
for n in [0,1,2,3,4,5,6,8,9,10,11]:
 r=by[n];f=manifest['files'][n];start(f"{n:02d} / {f['subject']}",f"{f['title']}  •  {'OBEROENDE VALIDERING' if n in [9,10] else 'UTVECKLING'}  •  samma filmruta, skala och orientering")
 for k,(label,name) in enumerate([('A / verkliga FILMLABB','A'),('B / oförändrad V2-auto','B_auto'),('E3 / ton + fryst färgexperiment','E3_frozen')]):
  x=34+k*260;text(label,x,470,250,9,bold=True);image(assets/f'{n:02d}_{name}.jpg',x,185,250,270)
 text(notes[n],36,165,745,10)
 text(f"V2 begär {r['requested_EV']:+.2f} EV / får {r['applied_EV']:+.2f} EV. E1: {r['E1_EV']:+.2f} EV. Y50 B {r['B_Y50']:.3f} → E3 {r['E3_Y50']:.3f}. Bas: manuellt mätt; kvalitet {f['base_quality']}.",36,82,745,8.5)
 end()

start('V2:s tre lägen - samma oförändrade motor','04 / exponerings- och färgproblemet syns i olika steg. Teknisk visning har normal output-gamutgräns, men ingen auto-ton.')
for k,(name,label) in enumerate([('A','A / ordinarie app'),('B_technical','Teknisk / ingen auto-ton'),('B_fixed','Fast neutral visning / 0 EV'),('B_auto','Automatisk ton / +1 EV')]):
 x=30+k*198;text(label,x,466,190,8,bold=True);image(assets/f'04_{name}.jpg',x,205,190,245)
text('De tre B-bilderna kommer direkt från oförändrade v2-moduler. Fullupplösta RGB16/sRGB-TIFF finns för 00, 04, 09 och 10 i alla tre lägen. Den rena tekniska linjära positiven före outputtransfer sparas separat i reducerad NPZ och enskilda källprover; den får inte visas som sRGB utan en uttrycklig vy.',36,170,745,11)
text('Fast 0 EV-visning och automatisk ton kan se nästan lika mörka ut när den tekniska prioren placerar huvuddelen av signalen lågt. Det är en tonplaceringsfråga. Samma båda steg lämnar positiva kanalrelationer oförändrade före display.',36,92,745,10);end()

start('Kanalrespons mot positiv färg - valideringsbilder','Samma frysta parametrar från 00/01/02/06. Ingen efterhandsanpassning till 09 eller 10.')
image(assets/'response_validation.jpg',35,145,770,315)
text('E2: monoton kanalmodell med begränsade lutningar och statistiska referensförskjutningar. E3: oförändrad respons, fryst positiv färggain efter E1-ton. Båda kan minska blådominans men lämnar lila/blå färgfel i snö och blus. Parametrarna kan inte identifieras som filmrespons utan uppmätta neutralsteg.',36,125,745,10)
text('Slutsats: ingen generell kanalresponsfit eller universell gray-world-gain bör implementeras utifrån detta material. Ljushetsförbättring och färgnoggrannhet måste ha separata godkännandekriterier.',36,69,745,9);end()

start('Neo: körd kod, tydligt avgränsad referens','Original SilverCore-adapter, tre original. INTE Neo-appens kompletta standardexport eller ett objektivt facit.')
for k,n in enumerate([0,4,9]):
 x=34+k*260;text(f'{n:02d} / Neo SilverCore core-only',x,467,250,9,bold=True);image(assets/f'{n:02d}_Neo_core.jpg',x,205,250,245)
text('Native LibRaw 0.22.1, full storlek, camera/auto WB, sRGB-primärer och LibRaw-gamma [0,45;4,5]. Filmbasen mäts i denna egen ingångsdomän. Original convertColorWithSilverCore körs med explicit standardrecept; appens senare expired-film rescue/adjustments körs inte.',36,173,745,10)
text('Detta kan reproducera en kontrollerad SilverCore-konvertering. Det kan inte styrka hur Neos fulla automatiska app skulle exportera bilderna. Resultaten används därför som separat referens, inte som färgfacit eller poängsättning av V2 mot Neo.',36,107,745,10);end()

start('Tre utvecklingsuppdrag - ett förstaval','Rangordnat efter verifierad bildmässig nytta. Ingen stor arkitekturombyggnad behövs för nästa steg.')
y=463
for title,body in [('1 / Automatisk positiv tonplacering','Inför filmruteankrad robust luminansstatistik och mjukt högdagervillkor. Räkna om intent vid bas-/kalibreringsbyte. Render/worker/fast/diagnostics berörs. Godkänn på både utveckling och reserverad validering; lägg till riktiga natt-/lågtonsmotiv före release. Risk: överljus snö/natt och brus.'),('2 / Positiv färg med evidens och fallback','Separat versionsmärkt, begränsad färgkorrektion efter inversion. Använd flera neutralankare/uttrycklig rullreferens och identity när stödet är svagt. Skicka inte detta tests konstanta gain som universell default. Risk: neutraliserat varmt ljus och magenta/cyan-regressioner.'),('3 / Inre filmkantsdetektion','Sök också kring filmrutan innanför hållaren; kräv samstämmighet och håll numerik/quality åtskilda. De underkända hållarregionerna måste förbli negativa kontroller. Risk: motiv, perforation eller klippt film väljs som bas.')]:
 y=text(title,36,y,745,13,bold=True)-7;y=text(body,36,y,745,10)-20
box('<b>Implementera bara uppdrag 1 först.</b><br/>10/11 begränsade bilder och ljushetsvinsten på båda valideringsbilderna ger det starkaste orsakssambandet. Det gör fortsatt färgutvärdering meningsfull. Tonförbättringen ensam innebär inte att V2 är redo att ersätta befintliga FILMLABB.',36,55,768,90)
end();c.save();print('PDF pages',page)
