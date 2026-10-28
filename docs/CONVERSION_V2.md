# FILMLABB 2.0: pålitlig A/B-referens och färg-/tondiagnostik

**Uppdatering på denna gren:** automatisk ton använder nu robust P60/P99 och separat bekräftad analysfilmruta. Basbyte invalidierar tonanalysen. Se [ny modell, testresultat och begränsningar](V2_ROBUST_TONE.md). Den befintliga publika testmiljön följer fortfarande grenen i PR #36 tills separat publicering beslutas.

Grundprototypen finns i [PR #36](https://github.com/AxelTidehorn/negative-studio/pull/36)
på `feat/filmlabb-v2-prototype`. Ingen merge, ändring av vanliga motorer eller
migration av gamla projekt. Arkitekturunderlaget är `FILMLABB_2_0_arkitekturstudie.md`.

**[Öppna testlabbet över HTTPS](https://axeltidehorn.github.io/negative-studio-v2-preview/v2.html)**.
Grenen publiceras genom det befintliga separata preview-workflowet; schemat kan
fördröjas av GitHub. Ladda om efter deployment. Se [cacheisolering](V2_PREVIEW_DEPLOYMENT.md).

## Två olika jämförelser

**Verklig automatisk FILMLABB** är standard för fotografisk utvärdering. En
privat iframe kör den byggda huvudapplikationens verkliga `importRoll([file])`,
nya standardinställningar, bas/kalibrering, analyser, profiler och
`configuration38()`/`exportGeometrySnapshot()`. Ingen särskild fotografisk
referensmotor eller handbyggt konfigurationsobjekt efterliknar detta. Dess
faktiska source-buffer och frysta konfiguration överförs till workern; där
används produktionens `NSPixelKernel.prepare` och `exportRows`.

Det motsvarar **en ny import med fabriksinställningar**, inte användarens sparade
projekt eller egna tidigare preferenser. Iframe får privat minnesbaserad
localStorage/sessionStorage före appstart, ingen offline-registrering och ingen
skrivning till ordinarie projekt. Appens auto-exportcrop används som initialt
gemensamt bildområde; därefter kan båda zoomas/beskäras/roteras tillsammans.

A behåller produktionens faktiska källdomän: normalt skyddad linjär sRGB RGB16,
fast gemensam gain 0,5, ordinarie automatiskt recept och egna basvärden.
B använder linjär Rec.2020 Float32, gain 1, explicit låst decoderrecept och
användarens v2-bas. Fotoläget använder samma originalfil men **inte identiska
RAW-pixlar eller gemensam bas**. Domänerna får inte blandas genom att kopiera
samma RGB-bastriplet mellan dem.

**Teknisk jämförelse** behåller det tidigare neutrala Standard-snapshotet:
samma linjära Rec.2020-källa, accepterade bas, utsnitt, neutrala kreativa reglage,
outputprofil och boxfilter som B. A har editVersion 1, shadow 0/highlight 1,
neutral profil och print. Detta är uttryckligen inte huvudappens nya automatiska
konvertering. Huvudappens testade standard har editVersion 2, shadow 0,015 och
highlight 0,99 samt egna analyser och profiler. Dessa skillnader förklarar
varför den tidigare A-bilden inte var en fotografiskt tillförlitlig referens.

Om automatisk A misslyckas används ingen förenklad A i dess ställe. Knappen
**Skapa automatisk A igen** försöker på nytt. Alternativet **Faktisk FILMLABB-export**
tar en riktig RGB16-TIFF med appens inbäddade sRGB-profil. Återställ först till
exportens kända källutsnitt och rotation 0; filen måste matcha det aktuella
utsnittets exakta pixelmått. JPEG, okänd profil och okänd geometri avvisas.
Ursprung märks historiskt eller användardeklarerat automatiskt; det senare
bevisar inte att ett recept verkligen var automatiskt. Importen bevisar filens
pixlar, inte dess fotografiska kvalitet eller metadatahistorik.

## Så testar du porträttet och _DSF8951.RAF

1. Öppna länken, välj RAF och vänta på full linjär B-källa. Den inbäddade JPEG:n
   är bara en orienteringsbild. Fotografisk A förbereds samtidigt efter B-import;
   vänta på **A klar**. På stora filer kan den extra verkliga appimporten ta tid.
2. Rita en liten rektangel över oexponerad orange filmkant, utanför motivet.
   Luppen visar samma plats i originalet. Medianer kommer från originalets
   linjära data. Läs varningarna och klicka **Godkänn filmbasen och jämför**.
3. I fotografiskt läge jämför du mot nya automatiska vanliga FILMLABB, inklusive
   dess standardprofiler. A:s automatiska bas lämnas oförändrad. Exportera A/B
   som TIFF 16 bit eller JPEG från samma utsnitt, utan egna kreativa ändringar.
4. Byt till **Teknisk jämförelse** när båda ska använda **samma manuella bas** och
   identisk källa. Exportera ett nytt par; kalla inte denna A vanlig auto-FILMLABB.
5. Under **Avancerat → V2-bildpunkt** växlar du mellan teknisk positiv utan
   auto-ton, fast neutral visning vid 0 EV och slutlig automatisk ton. Alla tre
   har nödvändig outputtransform och sRGB-transfer; tekniskt läge är ingen
   rå linjär bild direkt på skärmen. Valet påverkar även B-exportens filnamn.
6. Öppna **Diagnostik** och välj **Mät färg och ton genom kedjan**. Tabellen visar
   källsignal, transmission, densitet, log-positiv, teknisk positiv, exponering,
   fast/automatisk ton och output. Transmission/densitet har ingen färgluminans.
   Luminans efter sRGB-transform använder sRGB-vikter. Värden >1 är headroom,
   inte automatiskt förlorad information. RAW-/outputändpunkter visas separat.
7. Exportera diagnostik. Acceptera ett annat basprov och mät igen. Densitet ska
   ändras med `log10(Bny/Bgammal)`; kalibrerings-id och responskurvor ska förbli oförändrade. Tonexponeringen analyseras om när basvärdena ändras; aktiv intent ska ange aktuellt baseId. Välj teknisk visning för att isolera basens matematiska påverkan utan automatisk ton. **Ångra bas** återställer föregående bas-id.
8. Prova tre crops, zoom och rotationer på `_DSF8951.RAF`. Bas, kalibrering,
   analysmask och tonrecept ska förbli oförändrade; jämför överlapp vid lika
   pixelstorlek. Geometri ändrar bara sampling. Återställ utsnitt inom A-exporten
   i fotografiskt läge. Hela originalkällan kan användas i tekniskt läge.
9. Kontrollera **Visa analysmask på negativet** (rött uteslutet). Byt till
   **Hela analysområdet** och klicka separat **Uppdatera positiv tonanalys** för ett
   kontrollerat motexperiment. Områdes-/maskändring och ändrade basvärden uppdaterar mask/ton.
   Bas och teknisk respons ändras aldrig av maskbytet.
10. Exportera en andra rapport. Två mätningar visar parameterdiff i labbet.
    JSON-filer kan även jämföras under Avancerat eller med
    `node tools/compare-v2-diagnostics.mjs A.json B.json`. Inga pixlar, privata
    filnamn/sökvägar, EXIF, GPS eller serienummer följer med diagnostiken.

**Avbryt** stoppar preview/export vid worker-checkpoint och stänger en pågående
referens-iframe. Ny fil ersätter ägaren och källrevisionen. Vid avbruten
RAW-import väljer du filen igen. Sessionsreferenser är minnesbaserade och kräver
kompatibel capture/decoder. Saknad kant ersätts aldrig tyst: sista alternativet
är uttryckligt okalibrerat experimentläge, märkt prior, med antagen bas [1,1,1].

## Manuell filmbas: mätning och beslut separeras

Tidigare ärvde manuella prov automatdetektorns hårda kvalitetsgränser.
Spridning, klippning eller för få prover kunde därför sätta `missing` trots
användbar median. Nu används samma robusta median/MAD-statistik men en
**gemensam spatial RGB-population**: ett prov med en icke-finit/noll/negativ
kanal tas bort från alla tre kanaler. Manuell acceptans blockerar bara när en
numeriskt användbar bas saknas (eller ligger utanför kärnans explicita
numeriska intervall 1e-12–1e6).

Hög spridning, MAD/ojämnhet, låg signal, klippning, få prover och gemensamt
uteslutna ogiltiga RGB-prov visas som rådgivande varningar och sparas.
`source: manual`, `acceptance: user-approved`, numerisk giltighet och
ursprunglig kvalitetsstatus hålls isär. Ett högt kvalitetsbetyg bevisar inte film.
Automatiken behåller sina försiktiga gränser och returnerar review/missing;
användaren måste visuellt kontrollera film/hållare/perforering/motiv.

## Var mörker och färg uppstår: belägg och begränsningar

Den tekniska prioren är oförändrad: `P=0.18*10^((d-1)/0.65)` per kanal.
Den placerar neutralt d=1 vid 18 %, men d=0,2 vid cirka 1,06 %. Den är ett
provisoriskt experiment, ingen uppmätt universell filmprofil. Responsens
referensdensitet och lutning kan därför ge mörk teknisk placering och
förstärkta kanalavvikelser. Det är inte fastställt att detta förklarar varje
symptom i porträttet.

Historiska mätvärden från föregående +1 EV-prototyp, före denna grens robusta tonplacering. Nya resultat finns i V2_ROBUST_TONE.md. Basen i dessa syntetiska fall var
**0,8645 / 0,4041 / 0,2068**:

| Kontroll | Uppmätt resultat | Slutsats inom testfallet |
|---|---|---|
| Neutral transmissionsramp | neutral inom 1e-6, monoton | ingen verifierad kanal-/transferdefekt i denna kedja |
| Blå densitet +0,1 | teknisk B/R = 1,425103 | följer exakt priorens `10^(0.1/0.65)`, ingen dold vitbalans |
| Mörkt motiv d=0,19–0,21 | teknisk median Y=0,0105745 | mörk placering finns redan efter teknisk respons |
| Samma mörka motiv, exponering | begärt +4,089 EV, tillämpat +1 EV; Y=0,0211490 | exponeringsgränsen lämnar 3,089 EV till 18 % |
| Samma motiv, ton | Y=0,0207109; −0,0302 EV från tonkurvan | kurvan ger liten ytterligare mörkning i just detta fall |
| Motiv med kant/hållare | median 0,107237 utan mask, 0,178793 med mask | helkällestatistik påverkar autoexponeringen |
| Samma kantfall | +0,7472 EV hel källa, +0,00970 EV mask | separat motivanalys behövs, ingen ny teknisk kalibrering |

Masken är en **heuristik**, inte motivsegmentering: högst 24 000 originalprov,
edge-connected basnära/dark-holder/clear-pad-regioner, plus invalid/floor och
clipped signal. Den kan både missa en kant och utesluta verklig motivyta.
Maskbild, provandel och räknare går därför att granska. Otillräckliga prover eller obekräftad analysfilmruta ger 0 EV-fallback med uttrycklig orsak. Sparad mask/ton uppdateras efter ändrade basvärden; kreativ crop/zoom/rotation ändrar däremot inte det separat sparade analysområdet.

Stegdiagnostiken skiljer aktuell teknisk median från medianen när tonreceptet
skapades. Den använder aktuell source-grid/mask efter basbyte.
Stegtabellen visar alla originalprov på detta grid; maskens behållna population
används separat för mörker-/exponeringsförklaringen. 18 % är analysprior,
inte bevis för att ett faktiskt motiv ska vara normalgrått.

En konkret **diagnostikdefekt** korrigerades: linjära sRGB-outputvärden vägdes
förut med Rec.2020-luminanskoefficienter. Nu används sRGB:s
0,2126/0,7152/0,0722 efter transformen. Ett färgat regressionsfall verifierar
skillnaden. Detta ändrar inte bildpixlar, WB, inversion eller filmrespons.
Inget observerat porträttstick har dolts med nya gains, gray-world eller ny färgfit.

RAW använder fortsatt befintlig LibRaw/WASM, camera-WB, ingen scene-auto-WB,
linjär gamma och Rec.2020-utdata för B. Decoderrecept, tillgänglig WB och
utgångsklippning redovisas. Black-level, faktiskt intern demosaic och klippning
före LibRaws 16-bitars utdata är **saknade mätvärden**; requested options är
inte bevis för en intern operation. Negativa värden kan redan vara förlorade i
LibRaws UInt16-utdata och kan inte rekonstrueras efteråt. Syntetiska tester
visar inte ett verifierat RAW-/färgdomänfel men frikänner inte avkodning av
en viss RAF. Verkligt porträtt, dess olika steg/diagnostik, andra filmtyper och
`_DSF8951.RAF` krävs för att skilja capture/WB, basval, prior och outputgamut.

## Aktuell verifiering

- Fotografisk referens jämförd mot **verkligt nedladdad TIFF från vanliga index.html**,
  två syntetiska 64×48 CFA-DNG (neutral och färgad). Vanliga appens automatiska
  crop är 60×46; labbet följer den. **0 avvikande RGB16-värden**, skärmpixlar
  inom 1 steg i RGB8. Detta verifierar dessa filer/recept, inte alla RAF/kameror.
- Privat storage testas med andra sparade preferenser och sentinel i föräldern;
  inget läses in eller skrivs över. Historisk faktisk TIFF-import bevarar pixlar
  exakt och märks separat. Ingen ny service worker registreras.
- Manuellt kornigt/repat område accepteras med varningar; alla ogiltiga prov
  avvisas och gemensam RGB-population verifieras. Automatdetektorns tidigare
  negativa fall körs fortsatt. Basbyte behåller teknisk respons.
- Tre B-vyer, neutral/kanalramp, crop/rotationsoberoende, fryst mask/ton och
  aktuell diagnostik efter basbyte verifieras numeriskt och i Chromium.
- Worker/cache/avbrytning, JPEG, fullupplöst RGB16-TIFF/ICC, import, äldre projekt,
  motorer och preview-isolering ingår i regressionerna.
- Föregående prototyp: **84/84 testgrupper passerade**, 957,15 s. Build passerar. Efter fullkörningen passerade riktade sluttester för skalära tre-vy-kärnan, aktuell maskdiagnostik, referensens cancel/återförsök/samtidiga B-export, worker/cache och preview-isolering.

En avslutande isolerad kärnjämförelse på samma 1 MP-data och frysta recept
mätte median **408,61 ms före / 399,12 ms efter** (fem interfolierade pass per
version efter uppvärmning). Checksumma var identisk; skillnaden cirka 2 %
tolkas som mätvariation, inte en ny hastighetsvinst. Fullsviten var avslutad.
Körningar samtidigt med tung browserregression varierade kraftigt och används
inte som bevis för genomströmning. Detta mäter B:s kärna/RGB16-rader, inte
fotografisk A-import eller full applikationspeak.

Tung stegmätning körs **bara på begäran i worker**, aldrig vid crop/zoom.
B:s skalära kärna, stripe-export och två-nivåcache finns kvar; A/B-växling gör
fortfarande inget nytt renderjobb. **Fotografiskt läge kostar mer** än tekniskt:
en extra verklig appimport, separat A-buffer och full legacy-pixelväg.
Första A-referensimporten använder huvudappens befintliga kontrollflöde, med
vissa analyser på huvudtråden. Ett löfte om oförändrad hastighet eller peakminne
på iPad skulle därför vara fel. Importerad faktisk TIFF är alternativet.
Fysisk iPad Safari/Windows Edge och stora verkliga RAF är ännu inte verifierade.

## Kodstruktur och oförändrad modell

- `core.js`: SourceDescriptor v1, CaptureContext v1, BaseReference v1 och
  CalibrationV2 v2; ren Float64-referens med signalflaggor.
- `render.js`: separat RenderIntentV1, källförankrad analysmask och tre positiva visningslägen.
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
- `reference-isolation.js`, `reference-bridge.js`, `reference-client.js`: privat körning av den verkliga huvudapplikationen, överför dess faktiska decoderresultat, konfiguration och exportgeometri.
- `lab.js`, `v2.html`, `lab.css`: två jämförelselägen, tre B-visningar, synkroniserad presentation och expanderbar steganalys. Huvudapplikationen körs bara i en isolerad referens-iframe.
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

Ton: gemensam experimentell P60-exponering med mjuk P99-begränsning, separat bekräftad analysfilmruta och uttrycklig 0 EV-fallback. Se V2_ROBUST_TONE.md för formel, numerisk gain-gräns och giltighet. Monoton luminans-Reinhard:
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
av senaste ROI. Cache invalidieras vid basbyte eller uppdaterad tonanalys, aldrig
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

V2-workern behåller en enda full Float32-källa för B. I **fotografiskt läge** tillkommer den verkliga appens separat avkodade A-källa (vanligen RGB16, cirka 156 MB vid 26 MP). Under referensimporten tillkommer huvudappens decoder, preview och tillfälliga arbetsbuffertar. Referens-iframe tas bort efter att dess buffer överförts. Total fysisk peak på stora RAF och iPad är ännu inte mätt.

 Vid vanlig import kommer File/
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

## Tidigare optimering: före/efter i tekniskt läge

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

Tidigare worker-browsertestkörningar observerade 79–287 ms som största gap;
denna uppdaterings körningar under samtidig fullsvit observerade upp till
708 ms mellan
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

Tidigare prestandamätdata finns i [measurements/v2-lab-performance.json](measurements/v2-lab-performance.json). Se aktuell verifiering ovan för denna uppdatering. De äldre hastighetsvinsterna gäller tekniskt läge, inte det nya fotografiska lägets extra import och fulla produktionsmatematik.
