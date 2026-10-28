# FILMLABB 2.0: lokal CPU-prototyp (fas I)

Utgångspunkt: main `17b01d463e3a785998b9644d16973c9fbb6634e9`.
Primärt underlag: hela `FILMLABB_2_0_arkitekturstudie.md`, särskilt 5–9 och 12–14.
Kodnära kontroll: wide RAW ger Rec.2020 Float32; `NSColorEngine.pixel` klipper
källvärden och används därför inte av v2:s pixelkärna. Filmbas 2:s statistik
återanvänds med injicerad oklippt källprovtagning. Standardresponsens
motivbaserade offset/span behålls enbart i A-vägen.
Neo main `324c2daefada7d8d8c783719f62bf7f27320349a` kontrollerades mot
`rawFileLoader.librawDecodeSettings` och `expiredRescue.analyzeExpiredFilm`.
Ingen Neo-kod eller ny decoderbinär importeras.

## Öppna lokalt

```sh
npm ci
npm run build
python3 -m http.server 8000 --directory site --bind 0.0.0.0
```

Edge: `http://localhost:8000/v2.html`. iPad: `http://<datorns LAN-adress>:8000/v2.html`.
RAW fungerar via befintlig LibRaw-worker; kör helst via HTTPS på iPad. HTTP på
LAN är en tillfällig testväg utan offlinegaranti. Sidan har inga nätanrop för bilder,
analys eller diagnostik. Öppna inte HTML direkt med file://.
Vanliga FILMLABB ligger kvar på `/index.html`; v2 är ingen sjätte motor.

## Kod och matematik

- `src/conversion-v2/core.js`: SourceDescriptor v1, CaptureContext v1,
  BaseReference v1, CalibrationV2 v2; immutabla tekniska parametrar och ren kärna.
- `base.js`: återanvänd median, MAD, spridning och källregioner; ramfri
  kandidatgenerering i sex remsbredder på fyra sidor, åtta block per sida.
- `render.js`: RenderIntentV1, separat explicit analys med högst ±1 EV;
  luminansbaserad Reinhardkurva `P * 2^e / (1 + 2^e Y)`.
- `output.js`: konvertering före box-area-reduktion, gemensam geometri för A/B,
  linjär sRGB-gamutkompression och mjuk peak-skuldra, sRGB-transfer sist.
- `diagnostics.js`: whitelist-schema och diff; `lab.js`: isolerad webbsidesägare.
- `src/export/tiff-header.js`: befintlig RGB16/ICC-header extraherad för återanvändning
  av både historisk export och v2. TIFF-pixelberäkningen i v2 är helt separat.

`T=J/B`, `d=-log10(max(epsilon,T))`, `v=(d-1)/0.65`,
`ell=Mv+a`, `P=0.18*10^ell`. Identitetsmatris, noll referensoffset och samma
respons i alla kanaler. **1 och 0,65 är provisoriska priorer**, inga uppmätta
filmegenskaper. Epsilon=1e-8 relativ transmission är numerisk prior, inte en
uppmätt brusgräns. T>1 behålls. Negativ/ogiltig signal, golv, källa >=1,
densitet utanför [-2,6] och log-positivbegränsning [-20,20] flaggas separat.
Begränsningen skyddar numeriken; ingen återvinning av klippt information utlovas.
Basvärden utanför [1e-12,1e6] och icke-monotona affine responser avvisas.

Teknisk positiv Rec.2020 har headroom. Tonsteget skalar med gemensam luminans,
inte tre kanalkurvor. Gamutkompression sker enbart vid output. Kreativa reglage
är identitet. Geometri (rektangel och 90°-rotationer) kommer efter konvertering.
Ingen omanalys sker när crop/rotation ändras; zoom/visningsstorlek äger ingen
teknisk parameter. Fri rotation och Editing 2.0 är inte anslutna i labbet.

## Import och kompatibilitet

Återanvänder `NSRawDecoder.decode` och wide-adaptern. V2 begär uttryckligen
16-bit Rec.2020, linjär gamma, bright=1, camera WB, auto WB av, auto bright av,
full interpolation/upplösning, userQual=3, camera matrix=3, highlight=0 och
threshold=0. Vanliga importens defaults är oförändrade. Receptet exporteras.
Begärd demosaik är dokumenterad; faktisk kameraspecifik LibRaw-algoritm, intern
black/skala, råklippning före API-utdata och verklig sensorprecision är inte
fullständigt exponerade. Kamerans sparade WB kan ha valts automatiskt vid
fotograferingen; v2 gör ingen egen motiv-WB. WB låses via varje fils recept och
kompatibilitetskontroll; ändrad capture-WB kräver ny referens.

TIFF använder befintlig codec (8/16 bit); kräver användarverifierat linjärt
Rec.2020-negativ utan tidigare bas/WB/tonnormalisering. ICC-TIFF avvisas i detta
första labb, eftersom codecens normalväg annars kan ändra domänen till sRGB.
En verifierad extern TIFF är ett uttryckligt källantagande, aldrig en uppmätt
transferfunktion. JPEG och okänd TIFF går inte in som kalibrerbara negativ.
Flat-field och separat ljusgain stöds inte i labbet; ingen dubbel gain appliceras.

Sessionsreferenser lever bara i minnet. Samma sessionnamn, decoderrecept,
kameramodell och tillgänglig WB krävs för återanvändning mellan RAW-bilder.
Saknas WB/kameradomän låses kompatibiliteten till samma källrevision: gissa inte.
Detta betyder att rullåteranvändning inte fungerar för alla decodermetadata eller
TIFF. Manuell mätning av en annan bild kan låsas och återanvändas där kontraktet
är kompatibelt. Ingen referens sparas som measured om den kom från priorknappen.

Labbet laddar inte projektkontroller och skriver inte localStorage, gamla
projekt eller deras kalibreringar. V2-recept har conversionVersion=2 och egna
scheman; historisk conversionVersion=1/saknad dispatch ändras inte. Ett framtida
migrationsgränssnitt måste skapa en separat kopia. Labbets recept försvinner
vid omladdning; diagnostik är inte ett återimporterbart projektformat.

## Exakt bildprotokoll

1. Öppna `/v2.html`, ange ett capture-sessionnamn och välj porträttets RAF.
   Vänta på ”Källa laddad”. Ingen JPEG-reserv används om RAW-avkodning misslyckas.
2. Rita ett litet rektangulärt område över **verklig oexponerad film** direkt på
   negativet. Under drag visas en 8× negativlupp. RGB/MAD/spridning och clipping
   visas efter släpp. Rita om för att flytta/ändra provet; separat hörnredigering
   från huvudappens Filmbas 2 finns inte i denna avgränsade vy.
3. Acceptera prov. Båda vägarna får exakt samma linjära bas-RGB. A skapar ett nytt
   isolerat Standardrecept från hela samma källa, med neutrala kreativa reglage,
   generisk profil, neutral print, shadow=0/highlight=1. Det är ett reproducerbart
   nytt Standard-snapshot, **inte ett laddat historiskt porträttprojekt**.
4. Använd sida vid sida eller Växla A/B. Gemensamma x/y/bredd/höjd är normaliserade
   källkoordinater; 90°-rotation gäller båda. Förhandsvisning max 1000 px, samma
   box-area-filter. Inga kreativa reglage finns i labbet.
5. Exportera A JPEG/TIFF och V2 JPEG/TIFF med samma utsnitt. Export sker i utsnittets
   fulla pixelmått. JPEG är canvas sRGB 8 bit (webbläsarens kodare; inbäddad ICC
   garanteras inte). TIFF är faktisk RGB16 med inbäddad sRGB-profil. TIFF ligger
   inte på en uppskalad 8-bitpreview. Mycket stora JPEG kan nå canvasgränsen.
6. Exportera diagnostik före basbyte. Rita ett annat basprov, acceptera och exportera
   igen. Respons-id/kurvor och tonexponering ska vara samma; densiteter ändras.
   Skillnaden är log10(Bny/Bgammal) per kanal. Ångra bas återställer föregående
   bas-id. ”Analysera positiv ton” är en **separat explicit** operation; använd den
   inte mitt i basens invarianskontroll. A återskapas vid explicit basacceptans
   enligt Standardens motivuppskattning; geometri ändrar inget A-snapshot.
7. Öppna `_DSF8951.RAF`, acceptera bas och spara diagnostik. Testa tre crops och
   rotationer. Samma källpixel före sampling och alla tekniska/tonparametrar ska
   vara oförändrade. Jämför överlappande utsnitt vid samma skala. Labbet ändrar
   inte legacy-appens tekniska filmruta; det historiska tre-ramstestet måste
   fortfarande göras separat i huvudappen.
8. Exportera JSON via Diagnostik. Jämför två rapporter i sidans nedersta sektion
   eller `node tools/compare-v2-diagnostics.mjs A.json B.json`. Inga pixlar,
   originalnamn, filvägar, EXIF, GPS eller serienummer exporteras.
9. Saknas kant: prova kompatibel låst sessionsreferens. Annars välj uttryckligen
   ”Okalibrerat: prior [1,1,1]”; resultat och rapport märks prior/uncalibrated.

## Tester, prestanda och återstående validering

`node tests/conversion-v2.mjs`: basderivata, gemensam gain, oförändrad respons,
oberoende analytiskt positivorakel, geometri/receptinvarians, loggolv,
ogiltighet, monotonicitet, tolv märkta syntetiska detektorvarianter och faktisk
RGB16-TIFF/ICC med förväntade pixelvärden. Float64-tolerans 1e-10/1e-12 i
modelltester, 1e-6 generell tolerans. Ingen GPU-port i fas I.

`node tests/conversion-v2-browser.mjs`: Chromium med touch-viewport 820×1180,
faktisk A/B-rendering, crop/rotation med identiska snapshots, JPEG-signatur,
TIFF-/JSON-nedladdning och verklig LibRaw/WASM-import av syntetisk CFA-DNG.
Det är inte ett Fuji X-Trans- eller verkligt iPad-test.

`node tools/benchmark-v2.mjs [pixelantal]`: fem körningar av RGB16-stripes,
process-RSS, källstorlek och maximal stripe-tid. En enda Float32-källa; ingen
full positiv Float32-kopia. TIFF har en-rads arbetsstripes men Blob-delarna
behålls till nedladdning (cirka 6 byte/outputpixel). JPEG kräver fullt canvas
(cirka 4 byte/outputpixel plus kodarminne). Decode/WASM kan dominera toppminnet.
26 MP-källa är cirka 312 MB; detta är **inte** en iPad-minnesgaranti.

Detektorn accepterar **aldrig automatiskt** i denna prototyp: även stödda
kantgrupper ger review och kräver visuell bekräftelse. Den söker perifera
regioner, inte alla inre filmkorridorer; smala kanter kan missas. Det lilla
syntetiska paketet visar abstention, inte en uppmätt generell detektionsgrad.
Ingen uppmätt responskalibrering, spline-respons, full rescue, avancerad färgfit,
projektmigration eller persistenta rullprofiler ingår. Enbart affine tekniska
responskurvor accepteras nu; separata parametrar/id för framtida uppmätta
responser är förberedda.

**Kvar som manuell gate:** porträtt-RAF, `_DSF8951.RAF`, blandad rulle, verkliga
märkta baskanter och jämförbar Neo-export; fysisk iPad Safari och Windows Edge;
26 MP decode/export, peak memory, profil i mottagande program, visuella hudtoner,
clipping och detaljåtergivning. Färgåtergivningen är inte fotografiskt godkänd.

Lokalt CPU-mätresultat (1 MP syntetiskt, fem repetitioner, samtidigt som
regressionssviten kördes): 3,46 / 2,36 / 2,60 / 4,09 / 2,74 sekunder,
12 MB källa, 6 kB outputstripe, cirka 73 MB process-RSS. Längsta uppmätta
stripe var 142 ms. Målet om inga block över 100 ms är alltså **inte uppnått**
i denna miljömätning, trots en-rads bearbetning; GC/schemaläggning ingår.
Full 26 MP och relativ exporttid mot legacy är ännu inte benchmarkade.
