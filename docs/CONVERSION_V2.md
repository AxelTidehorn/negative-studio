# FILMLABB 2.0: A/B-labb med worker och kvalitetspreview

Arbetet ligger i PR #36 på `feat/filmlabb-v2-prototype`. Ingen merge och ingen
ändrad produktionsstandard. Arkitekturunderlaget är
`FILMLABB_2_0_arkitekturstudie.md`. Optimeringen jämförs med prototypen i
`b0f68ed`; referensmatematiken i `core.js` och `render.js` är oförändrad.

**[Öppna den separata testmiljön](https://axeltidehorn.github.io/negative-studio-v2-preview/v2.html)**.
Nya branchcommits publiceras genom befintligt preview-workflow. GitHub kan
fördröja schemakörningar och HTTP-cache. Ladda om sidan efter en ny deployment.
Se [publicering och cacheisolering](V2_PREVIEW_DEPLOYMENT.md).

## Arbetsflöde på iPad eller dator

1. **Ladda negativ.** Välj porträttets RAF eller stödd linjär TIFF. Full RAW
   avkodas i bakgrunden. RAF:s inbäddade JPEG kan visas tidigt, tydligt märkt
   som orienteringsbild. Den används aldrig som källa till konvertering eller
   basmätning. Vänta tills status säger att fullupplöst linjär källa är klar.
2. **Välj filmbas.** Rita en liten rektangel över jämn **oexponerad filmkant,
   utanför fotografiet**. Luppen visar originalets pixlar i 8× förstoring.
   Alternativt välj **Hitta automatiskt** och kontrollera de gröna regionerna:
   de får inte vara hållare, perforering, reflex eller motiv. Ett misslyckat prov
   ersätts aldrig automatiskt med en antagen bas. Rita om för att försöka igen.
   **Godkänn filmbasen och jämför** accepterar mätningen och startar A/B direkt.
3. **Jämför.** A är Nuvarande Standard; B är FILMLABB 2.0. Samma källa, bas,
   utsnitt, pixelmått, skala och boxfilter gäller båda. Växla A/B eller visa
   sida vid sida. Välj gemensam zoom och tryck på en detalj för att centrera
   båda. **Återställ utsnitt** hämtar den redan beräknade helbildsnivån.
   Exportera A och B till JPEG eller TIFF från samma utsnitt.

Filmbasacceptans behåller v2:s fasta respons och redan frysta tonplacering.
Första acceptansen skapar initial tonplacering. Ny bas ändrar densiteten;
**Analysera positiv ton igen** är en separat, uttrycklig operation under
**Avancerat**. Zoom, rotation, crop och A/B-växling analyserar inget på nytt.
Standard får ett isolerat neutralt snapshot när basen accepteras; dess
motivuppskattning är en del av den historiska algoritmen. Ett sparat historiskt
FILMLABB-projekt laddas inte och ändras inte av labbet.

**Ingen användbar filmkant?** Försök med en annan yta eller kompatibel låst
sessionsreferens under Avancerat. Använd endast uttryckligen valt **okalibrerat
experimentläge** som sista utväg. Det antar bas [1,1,1], märks prior/uncalibrated
och visar en permanent varning: färgerna kan vara mycket felaktiga. Det lagras
aldrig som uppmätt filmbas.

Avancerat behåller exakt crop i normaliserade källkoordinater, 90°-rotationer,
aktuella recept, signal-/kvalitetsvärden, explicit tonanalys, sessionslås,
diagnostik-JSON och rapportdiff. Vanliga kreativa reglage är identitet i labbet.

## Bildprotokoll för bas, porträtt och _DSF8951.RAF

- Porträtt: använd samma manuella prov för A/B (labbet delar det automatiskt),
  neutrala reglage, samma utsnitt och fulla exportmått. Bedöm hudton, separation,
  skugg-/högdagerstick och detalj. Varken Neo eller v2-prior är färgfacit.
- Basverkan: exportera diagnostik, acceptera ett annat basprov och exportera igen.
  Respons-id/kurvor och tonexponering ska vara samma; densitetsskillnaden är
  `log10(Bny/Bgammal)` per kanal. Använd **Ångra bas** för föregående bas-id.
  Tryck inte på explicit tonåteranalys mitt i invarianskontrollen.
- `_DSF8951.RAF`: mät bas en gång. Prova tre crops och rotationer och exportera
  diagnostik. Samma källpixel före sampling samt bas-, respons- och tonparametrar
  ska vara oförändrade. Överlappande utsnitt jämförs vid samma pixelstorlek.
  Legacy-appens historiska tre-filmrutetest görs fortfarande separat där.
- Exportera rapporter i Avancerat. Jämför där eller med
  `node tools/compare-v2-diagnostics.mjs A.json B.json`. Diagnostik innehåller
  inte pixlar, privata sökvägar, originalnamn, EXIF, GPS eller serienummer.
- **Avbryt** stoppar preview, detektion eller export vid nästa worker-checkpoint.
  Välj sedan nytt prov/utsnitt eller försök igen. Vid avbruten RAW-import stängs
  ägarworkern och dess decoder; välj filen igen. Vid workerfel återhämtar man
  sig genom ny import. Ingen bild ändras eller försvinner från användarens disk.

## Kodstruktur och oförändrad modell

- `core.js`: SourceDescriptor v1, CaptureContext v1, BaseReference v1 och
  CalibrationV2 v2; ren Float64-referens med signalflaggor.
- `render.js`: separat RenderIntentV1 och referenston/färgrymdsberäkning.
- `fast.js`: allokeringsfri skalär v2-väg och exakt avgränsad neutral
  Standard-adapter. Parametrar kompileras en gång. Legacy-konfigurationer som
  adaptern inte stöder avvisas; andra motorer kopplas inte in i v2.
- `output.js`: oförändrad `rows()`-referens, nya `fastRows()` och radintegrerande `area()`, samma box-
  footprints/rotation, konvertering före filtrering och encoding sist.
- `worker.js`: enda ägare av full källa, RAW-import via befintlig decoder-worker,
  originalbasmätning, teknisk konvertering, analys, previewcache och full export.
- `client.js`: request-id, avbrytning, progress, fel och gate för inaktuella svar.
- `base.js`: befintlig Filmbas 2-statistik, 256 prover för grov lokalisering och
  högst 8192 för slutlig mätning i originalets linjära data. Alla autokandidater
  kräver fortfarande granskning; algoritmen söker periferin i flera remsbredder.
- `lab.js`, `v2.html`, `lab.css`: trestegsflöde och synkroniserad presentation;
  ingen normal projektkontroller eller localStorage-ägare laddas.
- `diagnostics.js`: befintligt whitelist-schema kompletteras vid workerexport
  med faktiskt uppmätta jobbtider, render-/cacheantal och käll-/cachebuffertstorlek.
- Befintlig `src/export/tiff-header.js` och sRGB-profil återanvänds.

`T=J/B`, `d=-log10(max(epsilon,T))`, `v=(d-1)/0.65`,
`ell=Mv+a`, `P=0.18*10^ell`. Samma provisoriska gemensamma prior, identitetsmatris
som default och fryst noll-offset. Ingen ny filmrespons eller dold färgfit.
Epsilon 1e-8 är numerisk prior, inte uppmätt brusgräns. T>1 och därmed negativa
effektiva densiteter bevaras. Ogiltig/låg/klippt signal och extrapolation redovisas
fortfarande av referensvägen i diagnostik. Log-positiv begränsas till [-20,20]
med uttrycklig status. Ingen rekonstruktion av klippt information påstås.

Ton: gemensam exponering högst ±1 EV, monoton luminans-Reinhard:
`P * 2^e / (1 + 2^e Y)`. Därefter oförändrad Rec.2020→linjär sRGB,
neutralaxel-gamutkompression och peak-skuldra. Boxfiltrering sker på dessa
**konverterade linjära positiva** värden; sRGB-transfer/kvantisering sker sist.
Båda motorerna följer samma samplingsordning och geometri.

## Preview, cache och minnesägarskap

Kvalitetspreview är högst 1400 pixlar på längsta sidan, 1200 vid rapporterat
litet enhetsminne. Första exakta previewn måste besöka källpixlarna i området:
`F(mean(I)) != mean(F(I))`. En negativproxy används därför inte som om den vore
exakt positiv. Radintegreringen konverterar varje källpixel en gång per motor
och fördelar dess bidrag mellan boxar med två små linjära radbuffertar;
grannboxar behöver inte göra samma inversion flera gånger. Workern bearbetar rader utan att lagra fullupplösta positiva
Float32-plan. Första helbilden per accepterat recept kan fortfarande ta tid;
den blockerar inte huvudtråden och visar progress.

Två A/B-nivåer cachas i workern med källa, bas-id, fryst ton-id, crop, rotation
och upplösning som identitet. Helbilden hålls kvar och den andra nivån ersätts
av senaste ROI. Cache invalidieras vid basbyte eller explicit tonanalys, aldrig
vid ett rent visningsbyte. A/B-växling skickar **inget renderjobb**. Identisk
geometri är cacheträff; 90°-rotation av samma nivå är pixelpermutation och kräver
ingen ny inversion. Ett nytt ROI konverterar bara ROI:s originalpixlar.

Vid nytt recept visas först en högst 600-pixels positiv punktpreview, tydligt
märkt Snabbvisning med gles källsampling. Båda motorerna väljer samma original-
pixel i varje provpunkt. Detta kan ge aliasing och är inte slutlig kvalitet.
Den cachas eller exporteras aldrig. Därefter räknas korrekt kvalitetspreview.

Vid zoom/crop kan gränssnittet omedelbart skala den cachade färdiga helbilden.
Den är märkt **Snabbvisning**: webbläsarens interpolation i 8-bitars sRGB är en
approximation. Den ersätts av **Kvalitetspreview** från originaldata med exakt
boxfilter. Den approximativa visningen används aldrig som källa för export.

En worker behåller en enda full Float32-källa. Vid vanlig import kommer File/
Blob in och befintlig LibRaw sköter sin egen underworker. Float32-konverteringen
sker i ägarworkern. Testadapter `useSource` transfererar källbufferten en gång;
huvudtrådens buffer blir detached. Hela källan kopieras inte till flera render-
workers eller fram och tillbaka. Endast små preview-/luppbuffertar, metadata,
export-Blob och eventuell JPEG-stripe går ut. Cache har högst två par av RGBA8,
inte fulla positiva Float32-bilder. Max två nivåer om 1400² ger cirka 31 MB
worker-cache; faktiska fotoproportioner ger ofta mindre. Canvas/returer på
huvudtråden tillkommer och kan inte likställas med total process-/enhetspeak.

Worker-loopar lämnar kontroll för progress och cancel ungefär var 12 ms mellan
arbetsstycken. En pågående stripe eller webbläsarens JPEG-kodning kan inte
preempteras mitt i en operation. Request-id och UI-revision förhindrar att ett
föråldrat resultat visas eller laddas ned. Ny import stänger den gamla ägaren.
Cache och state från en gammal källa kan inte skriva in pixlar i den nya.

## Fullupplöst export

TIFF använder originalets aktuella crop/rotation i fulla källpixelmått,
kompilerad pixelväg, åttaraders RGB16-stripes, liten återanvändbar RGB-scratch
och gemensam sRGB ICC-header. JPEG använder worker/OffscreenCanvas där det
stöds. Annars transfereras konverterade åttaraders RGBA-stripes till en canvas
på huvudtråden, som endast ansvarar för sammansättning och JPEG-kodning.
Ingen export är en uppskalad preview. TIFF är riktig RGB16, JPEG 8 bit sRGB.
Canvas-kodaren garanterar inte inbäddad JPEG-ICC.

TIFF Blob-delar behålls till nedladdning, cirka 6 byte/outputpixel. JPEG kräver
fullt outputcanvas och kodarminne. Det behövs fortfarande ungefär 312 MB för
26 MP Float32-källa, plus RAW/WASM under import och exportminne. Ägarbyte gör
inte dessa fysiska kostnader ogjorda. Stora JPEG kan nå canvas-/minnesgränsen;
fel visas och TIFF/mindre utsnitt kan provas. Klassisk TIFF över cirka 4 GB avvisas.

## Före/efter på samma data och maskin

Mätt i samma hanterade Linux/Chromium-miljö, syntetiska data; varierande
samtidig regressionsbelastning förekom. Detta är uppmätt utvecklingsprestanda,
inte ett iPad-/Edge-/RAF-löfte. Referens är PR #36 vid `b0f68ed`. Pixelvägen
jämförs med oförändrade referensfunktioner; inga precisionstricks eller LUT-
approximationer används. Browserprofilen laddar dessutom basdetektorn från
referenscommitten för sin före-mätning.

| Operation | Före | Efter | Underlag |
|---|---:|---:|---|
| RAW-avkodning + Float32, 1024×768 | 1,366 s | 1,398 s | median 5, syntetisk CFA-DNG; samma decoder/recept, ingen utlovad decodevinst |
| Basdetektering, 1 MP | 0,611 s | 0,113 s | samma deterministiska källa, före/efter i en browserkörning |
| A/B-preview inkl. presentation, 1 MP | 10,864 s | 1,176 s | samma crop/filter/recept, en parvis körning |
| TIFF-export, 1 MP | 5,758 s | 0,590 s | full RGB16, samma källa; inklusive browser-/nedladdningsväg efter |
| CPU-konvertering + RGB16-rader, 1 MP | 1,694 s | 0,365 s | median 5; cirka 4,6× |
| CPU-konvertering + RGB16-rader, 26,002 MP | 54,374 s | 10,198 s | median 5; **cirka 5,3×** |
| Process-RSS efter 26 MP-körning | 454,8 MB | 362,6 MB | Node-process efter samma 5-passbenchmark; inte enhetspeak eller full export |
| Källa / maximal RGB16-stripe, 26 MP | 312,0 MB / 37,4 kB | samma | byteLength respektive stripe-allokering, uppmätt |
| Extra fulla positiva Float32-plan | 0 | 0 | implementationsägarskap, inte fysisk peakmätning |

En tidigare browserkörning med lägre konkurrerande belastning mätte A/B
11,782→1,121 s och TIFF 6,262→0,851 s. Skillnaden illustrerar schemaläggnings-
känsligheten; en ensam browserkörning ska inte tolkas som en stabil p95.

Separat fasprofil, 300 000 pixlar (en körning, ej summerbar med tabellen ovan):

| Fas | Referens | Skalär |
|---|---:|---:|
| Teknisk inversion | 585 ms | 59 ms |
| Positiv ton | 87 ms | 11 ms |
| Färgrymd/gamut/skuldra | 236 ms | 16 ms |
| Komplett RGB16-väg | 1085 ms | 156 ms |

Node PerformanceObserver observerade 197→7 GC-händelser och 94,8→1,6 ms GC-tid
under den kompletta 300k-pixelkörningen. Det är observerade runtime-händelser,
inte ett exakt antal pixelallokeringar. V2-/Standard-fastvägen skapar inga
RGB-arrayer eller flaggobjekt per pixel; diagnostikreferensen behåller dem för
begriplig verifiering. Buffertar skapas per stripe eller preview, inte pixel.

Reproduktion:

```sh
node tools/benchmark-v2.mjs 26000000
node tools/benchmark-v2.mjs 26000000 --fast
node tools/profile-v2-browser.mjs
node tools/profile-v2-raw.mjs
node --expose-gc tools/profile-v2-stages.mjs
```

## Tester och kvarvarande gränser

- `tests/conversion-v2.mjs`: tidigare basderivata, gain, monotonitet, maskfri
  geometri, signalstatus, tolv detektorvarianter, RGB16/ICC och diagnostik.
- `tests/conversion-v2-fast.mjs`: skalär v2/Standard mot oförändrad CPU-referens,
  vanliga och extrema signaler, NaN/Infinity/noll/negativt, tre baser och tre
  exponeringar, negativa densiteter, fyra rotationer och fractional crop/area.
  Uppmätt max relativt fel `4,44e-16`; accepterad teknisk tolerans 1e-12 och
  högst ett kvantiseringssteg i 8/16-bitars geometri-/filterjämförelser.
- `tests/conversion-v2-worker-browser.mjs`: 1,57 MP, transfer/detachment,
  touchmarkering/lupp, automatisk jämförelse, 30 A/B-växlingar utan jobb,
  zoom/cache/rotation och pixelkontroll, invarianta recept, avbruten export
  utan sen nedladdning, avbruten render, återhämtning och ersatt källrevision.
- `tests/conversion-v2-browser.mjs`: verklig LibRaw/WASM DNG-import och
  JPEG/TIFF/JSON-export i iPad-lik touch-viewport.
- `tests/v2-preview.mjs`: preview-sökväg, workerberoenden och skydd av vanlig
  FILMLABB:s service-worker/cache; ingen ändrad publiceringskonfiguration.

Worker-browsertestkörningarna observerade som mest 79–287 ms mellan
huvudtrådens timer-callbacks, beroende på körning och samtidig belastning. Sampling, Canvas-upload, GC och OS-schemaläggning
kan fortfarande ge pauser; ett hårt <100 ms-golv eller p95 på fysisk iPad är
**inte verifierat**. Första exakta preview efter nytt bas-/tonrecept måste
fortfarande läsa källan. RAW-binärens throughput är oförändrad. Ingen uppmätt
fotografisk färgförbättring påstås.

**Manuell gate:** porträtt-RAF, `_DSF8951.RAF`, blandad rulle, verkliga märkta
filmkanter, fysisk iPad Safari och Windows Edge; 26 MP import/export med
verklig kamerafil, browserpeak/minnestryck, JPEG-fallback på Safari, subjektiv
respons, hudtoner, klippning och detalj. Fri rotation, uppmätt spline-/färgfit,
full rescue, kreativ redigering och projektmigration ingår fortfarande inte.

Slutlig befintlig regressionssvit: **81/81 testgrupper passerade**, 807,72 s.
Efter avslutad fullkörning verifierades de sista preview-/detektorförbättringarna
med de numeriska v2-testerna samt separata worker-, import/export- och
preview-publiceringsbrowserregressioner. Ingen gammal motor ändrades under
den sista verifieringen. Build passerar. Mätdata finns i
[measurements/v2-lab-performance.json](measurements/v2-lab-performance.json).
