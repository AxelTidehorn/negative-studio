# Beta 6 steg 2: exportens presentationsgeometri

För den färdiga UI-/previewintegrationen, se [BETA6_COMPLETE.md](BETA6_COMPLETE.md).
Tidigare fasgränser nedan beskriver respektive implementationssteg.


Bas: main `77ea9f2`, inklusive stabilisering PR #16, geometrigrund PR #17 och
[förstudien](FILMLABB_1.1_Beta6_Teknisk_forstudie.md), särskilt 6.1–6.5.
Datamodell och migrering följer [steg 1](BETA6_GEOMETRY.md). Detta dokument
ersätter steg 1:s vilande **export**gräns; preview och UI förblir oförändrade.

## Arkitektur och samplingskontrakt

`presentation-sampler.js` är gemensam, DOM-fri exportkod. Den konsumerar
`NSGeometry.compositionTransform`, dess invers och heltalsdomän. Ingen andra
rotationsmatris definieras i exportkoden. `exportGeometrySnapshot` kopierar den
aktuella bildens modell, faktiska källstorlek, analysram och gemensamma köval
innan första asynkrona yield. Färgkonfigurationens befintliga snapshot bevaras.
Senare ändrad önskad geometri påverkar inte ett startat jobb.

För ny geometri gäller följande ordning:

1. Utpixelns centrum mappas proportionellt genom utbildens rektangel till S.
   JPEG i reducerad storlek använder också denna kontinuerliga mappning.
2. S-kanterna omvandlas till samplingsindex med `u=sx−0,5`, `v=sy−0,5`.
   Index klampas till den tillåtna domänens första/sista **pixelcentrum**.
   Bilineära grannar/vikter beräknas i ordningen övre vänster, övre höger,
   nedre vänster, nedre höger. Nollvikter hoppas över.
3. Varje rå RGB-granne färgbehandlas av oförändrad `NSPixelKernel.prepare().pixel`.
   Grannens absoluta originalkoordinater skickas alltid med, även i worker,
   så spatial flat-field inte använder packad stripes koordinater.
4. Färdigbehandlade sRGB-värden avkodas till linjärt visningsljus, viktas och
   summeras, sedan sRGB-kodas resultatet. Det är inte interpolation av
   rånegativet eller av 8-bitarskvantiserade grannar. Färgkedjans formler ändras inte.
5. TIFF avrundar direkt till 16 bitar, JPEG-canvas till 8 bitar. TIFF behåller
   sRGB-profil, header och endianhantering; JPEG behåller befintlig kodning.

Domänen är hela källan eller analysramens befintliga CE.bounds-heltal när
`cropExportToFrame` är true. Önskad komposition förblir separat och begränsas
endast till en effektiv exportrektangel. Auto-utsnittet använder modellens
bestämda sidförhållande och centrerade hörnbegränsning, inte en allmän sökning
efter största area. Ingen hållar-/filmbaspixel utanför begränsningen blandas in.
Enpixelsdomäner använder kantreplikering. Ingen svart/transparent triangel skapas.

## Bakåtkompatibilitet

Noll finvinkel med null komposition använder fortfarande `CE.exportGeometry`
och den gamla direkta pixelpermutationen. Detsamma gäller orörda migrerade
legacy-utsnitt som ryms i den giltiga domänen. CE-geometri, direkta
16-bitarsloopen, prepare-tabeller, avrundning och JPEG:s gamla nearest-nedskalning
är oförändrade. Äldre format och blandade crop-inställningar behåller sitt
exakta utsnitt och sina pixlar. Den frysta legacy-ramen följer inte senare
analysramsändringar.

Redigerad komposition eller finrotation använder den nya samplern. Om en senare
gemensam begränsning skär en legacy-komposition måste även den begränsas enligt
geometrimodellen. Det är en uttrycklig ny geometriförändring. Projektformatets
geometriversion förblir 1: fälten och deras dokumenterade koordinatbetydelse är
oförändrade; steg 2 aktiverar exporttolkningen av steg 1:s interna metadata.

## Exportvägar och bounded minne

- Aktiv TIFF i `calibration-state.js` anropar den gemensamma TIFF-samplern.
  Legacy delegerar direkt till oförändrad `NSPixelKernel.exportRows`.
- JPEG-controller använder samma plan och RGBA-sampler i main-reservläget.
- JPEG-worker får en serialiserbar geometrisnapshot. Ny geometri packar fyra
  obehandlade RGB-tripletter i originalets datatyp per utpixel; worker härleder
  samma originalkoordinater och vikter och kör samma sampler. Gamla jobb
  behåller en triplett per utpixel. Metadata beskriver datatypen redan vid
  init så prepare-tabeller och bytebudget stämmer före första stripe.
- `makeSafeJpegExportCanvas` och den fortfarande anropbara `makeExportCanvas`
  använder också gemensam geometri/sampling. Den senare behåller sin gamla
  16→8-bitarskonvertering i legacygrenen.
- Batch TIFF och JPEG-ZIP går genom ovanstående aktiva ägare. Namngivning,
  felrapportering, progress, avbrytning, urvalsåterställning och fem-bildersgräns
  behålls från PR #16. Tidigare ersatta inline-exportörer är inte nya aktiva vägar.

En ny stripe begränsas till högst 32 rader och **2 MiB** för fyra råa RGB-grannar
plus konservativt sex outputbyte per utpixel. Beräkningen tar hänsyn till
källans BYTES_PER_ELEMENT och en snävare pixelbudget i main-reservläget. En
16 384 pixlar bred JPEG-rad ryms även med Float64. Extremt bred TIFF kräver minst
en rad, som kan överskrida budgeten; TIFF har samma klassiska 4 GB-gräns som
förut. TIFF packar inga grannar och skapar inte någon rå stripe-kopia.

Endast en indata-stripe skickas åt gången. Källa överförs aldrig och det skapas
ingen fullstor färdig float-/RGB-mellanbild. Befintlig JPEG-canvas/encoder och
TIFF:s slutliga Blob-delar behöver fortfarande minne för resultatbilden; 2 MiB
är en arbets-/transportbudget, inte ett löfte om hela exportens toppminne.
Förberäknade tekniska färgtabeller återanvänds mellan alla grannar och stripes.
Ingen kvalitetsminskning eller generell downscaling-filterändring görs.

## Prestandamätning

Kör `node tools/benchmark-presentation.mjs` (eller `--full` för alla rader).
Mätning med Node 24.19 i denna miljö, tre repetitioner, median, syntetisk 16-bitars
linjär källa och befintlig Standard-färgkedja:

| Källa | Finvinkel | ms per MP utdata | Samplade utpixlar |
| --- | ---: | ---: | ---: |
| 24 MP | 0° direkt | 233 | 192 000 |
| 24 MP | 2° | 1 344 | 199 640 |
| 24 MP | 15° | 1 472 | 146 190 |
| 40 MP | 0° direkt | 279 | 256 000 |
| 40 MP | 2° | 1 423 | 257 754 |
| 40 MP | 15° | 1 443 | 208 656 |

Detta är **begränsade rader spridda över verkligt allokerade 24/40 MP-källor**,
inte tider för kompletta filer eller fysisk iPad. Encoder, nedladdning och
workertransport ingår inte. Källbufferterna är 144/240 MB; största allokerade
outputstripe i mätningen var 192 kB. Prepare tog cirka 17/22 ms. Fri sampling
kostade ungefär 5–6 gånger mer per utpixel än direktvägen i detta prov: fyra
färgberäkningar plus explicit linjärisering/interpolation. Utsnittet blir också
mindre efter rotation. Inga generella hastighetsgarantier dras från denna mätning.

## Verifiering och fasgräns

`test/presentation-sampling.mjs` använder ett separat skalärt facit, syntetiska
färgfält och 576 kombinationer av kvartvarv, ±0,1/2/15°, källkodning, datatyp,
flat-field och filmrutebegränsning. Det verifierar även stripeövergångar,
JPEG-nedskalning, interpolation efter färg, enpixelskanter och gamla bitexakta
16-bitarsutdata. `test/presentation-worker.mjs` kör verklig worker-kod med en
kontrollerad canvas och jämför pre-encode-bufferter i 42 kombinationer samt
felaktig stripe, aktiv TIFF och båda reservcanvasvägarna.

Chromium-provet i `test/beta6-browser.mjs` kontrollerar native JPEG-worker mot
tvingad main-fallback, TIFF-geometri, avbrytning, blandad JPEG-ZIP och oförändrad
kalibrering samt CPU/GPU-preview. Steg 1:s tidigare testantagande att intern
komposition inte används av **export** är avsiktligt uppdaterat; dess
analysoberoende och projektkompatibilitet är kvar.

Ingen ny UI-kontroll, previewmatris eller GPU-resurs införs. Finrotation och
komposition kan sättas via interna projekt-/modellfält men erbjuds inte som
användarverktyg. Steg 3 måste koppla preview, pipetter, lupp och interaktion till
samma modell innan rotationsverktyget exponeras. Befintlig nearest-aliasing i
gamla nedskalningsvägar kvarstår. Fysisk iPad Safari och installerad Edge måste
fortfarande verifieras för minne, lång export och nedladdningsbeteende.

### Slutresultat i utvecklingsmiljön

- `npm ci`: godkänd installation.
- `npm test`: **31/31 grupper godkända** (inklusive båda nya Node-grupperna).
- `FILMLABB_CHROMIUM_BIN=/usr/bin/chromium npm run test:browser`:
  **6/6 grupper godkända**, inklusive befintliga GPU-, mobil- och cacheprov.
- `npm run build` och `npm run test:build`: godkända; ny modul finns i byggd
  shell/precache och versionshashen uppdateras när innehållet ändras.
- Sista riktade worker-/app-provet kompletterar fullsviten med ändrad geometri
  under pågående TIFF, exakt äldre JPEG-RGBA och partiellt batchfel från en
  färgbehandlad granne. Dessa tillägg är också godkända.

Inga kända nya testfel. Känd aliasing (#8) rapporteras fortfarande som befintlig
begränsning, inte som ett nytt fel eller en filterändring. Automatiska Chromium-
resultat är inte en verifiering av fysisk iPad eller Microsoft Edge.
