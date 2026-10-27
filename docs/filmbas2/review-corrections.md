# Komplettering av PR #33

Den nu bifogade `FILMLABB_Filmbas2_Forstudie.md` har lästs. Särskilt E3–E4
(slutprov från original, avstående), E7 (provbudget/dragrespons) och F2
(referensintegritet, normalisering och rullprov) ligger till grund för korrigeringarna.
Förstudien fanns inte i den ursprungliga leveransen; detta är en komplettering av
samma PR och samma fem motorer.

## Identifierade brister och riktade korrigeringar

1. **Felaktiga slutdiagnoser.** Grovceller screenades med stratifierade prov, men
   slutkandidaten samplades med en annan metod och fick hårdkodad nollklippning
   och noll låg signal. Median/spridning räckte inte för att upptäcka sällsynta
   klippta pixlar. `measure` och nya `measureRegions` använder nu samma
   `sourceSample`/`summarize`: kanalvis klippning är unionen av rå integer-mättnad
   och klippning efter linjärisering/normalisering, räknad per verkligt prov.
   Låg signal, median, MAD och robust 5–95-procentspridning räknas på samma
   sammanlagda källprov. Slutvalet mäts om med en tätare provbudget. Kandidaternas
   `sampleLimit` anger vilket provurval deras faktiska diagnostik kommer från.
   Inga kanalextremer från olika ytor sammanfogas.

2. **Smala kanter föll mellan grovceller.** Det snabba 24×24-rutnätet behålls.
   Om det saknar ett starkt homogent kantfynd undersöks högst 32 lokala
   tvärsnitt kring filmrutans kanter och åtta glesa hela tvärsnitt för mellanrutor.
   Lokal upplösning begränsas till 256 och helsektioner till 2048 källpositioner.
   Smala rungränser förfinas i originalpixlar. Högst 384 små områdesprov och
   192 kvarvarande områden tillåts; analysen lämnar tillbaka kontrollen mellan
   sektioner/grupper. Inga extra helbildsbuffertar skapas.
   Artificiella avsnitt av jämna motivgradienter avvisas genom kontroll av
   verkliga skarpa gränser. Blandade ytor kan provas i fyra kortare delavsnitt
   för att skilja film från perforeringar. Endast angränsande, icke överlappande
   regioner med överensstämmande RGB kombineras; deras mellanliggande hållare eller
   perforering fylls aldrig i med en bounding box. Förfinade fynd får alltid
   **kontrollera**, även när provstatistiken är bra. Detektorn godkänner inga
   referenser; en användaråtgärd krävs som tidigare.

3. **För mycket arbete per pekarhändelse.** Tidigare utfördes full statistik och
   112×112 källuppslag i luppen för varje pointermove. Nu uppdateras markeringens
   geometri direkt, medan statistik/lupp samordnas till nästa animation frame med
   de senaste koordinaterna. Liveprovet har 512-provsbudget och markeras uttryckligen
   som preliminärt; det kan inte godkännas. Pointerup hanterar även en sista position
   utan föregående pointermove, avbryter väntande arbete och gör den slutliga robusta
   2048-provsberäkningen på rätt källrektangel. Pointercancel återställer föregående
   område; avslut/källbyte avbryter väntande återkoppling.
   Luppen läser 14×14 källpixlar en gång och expanderar dem 8× i en återanvänd liten
   RGBA-buffert; samma källpixelposition återanvänder resultatet. Cacheägaren släpps
   när verktyget stängs så att tidigare stora bilder inte hålls kvar.

4. **Pausad låsning blockerade explicit ny kalibrering.** UI:t tillät godkännande
   när en gammal referens var inkompatibel, men acceptkontrollen tittade ändå på
   den lagrade gamla låsningen. Nu används bara aktuell kompatibel referens som
   föregående aktiv kalibrering. En gammal inkompatibel referens ersätts fortfarande
   enbart vid uttryckligt godkännande; en osäker mätning lämnar den oförändrad.
   Rullreferens och individuell override lagras separat.

5. **ICC-normalisering var bara indirekt spårbar i avrundad etikett.** TIFF-importen
   behåller nu exakt redan applicerad gemensam normalisering i `sourceInfo`, och
   CaptureContext jämför den numeriskt i stället för att förlita sig på etikettens
   tre decimaler. Pixelmatematiken ändras inte och normaliseringen appliceras inte
   en andra gång. En tidigare referens med annan normaliseringskontext pausas;
   den migreras inte tyst till en annan absolut skala.

Footer, teman, layout, kompositions-/rotationsverktyg och motorernas äldre
kompatibilitetsvägar har inte ändrats i kompletteringen.

## Regressionstäckning

- `film-base2-detection.mjs`: oberoende fulluppräknad maskreferens för aggregerade
  medianer, spridning, låg signal och rå/normaliserad klippning på olika pixlar;
  bra och dåliga områden blandade; sparse contamination som grovscreeningen
  missar men slutmätningen hittar; 2/3-pixlars rebate, perforerad 6-pixlars
  rebate, grå intilliggande hållare och 3-pixlars mellanruta; alltid kontrollstatus
  för förfinade fynd; verifierad yield till eventloopen.
- `film-base2-roll.mjs`: två riktiga frame-poster genom controller/ns-vägarna,
  rullval och individuell override, oförändrad delad referens, ändrad gain/WB/domän,
  paus och återaktivering, känd gemensam exponering med explicit normalisering,
  nytt uttryckligt godkännande trots inkompatibel gammal låsning, identiska
  normaliserade pixels i fem motorer och bevarad **upplåst** godkänd referens vid
  osäker omanalys. Projekt sparar rull- och individuella poster oberoende.
  Den verkliga `prepareTiff`-vägen prövas också med två normaliseringar som ger
  samma avrundade etikett men måste ge olika kompatibilitetskontext.
- `film-base2-performance-browser.mjs`: 96 pointermove-händelser i åttahändelsers
  burstar, rAF-samordning, sista pointerup-position, slutligt icke-preliminärt
  prov jämfört med direkt källmätning och pixelkontroll av negativluppen.
- Hela befintliga Node- och Chromium-sviterna körs, inklusive gamla projekt,
  fem motorer, CPU/GPU, JPEG/TIFF, geometri, exportcrop/arv, sliders/reset,
  footer, teman, fokus och mobil-/iPad-storlekar. Slutresultat: **50/50 Node-grupper** (`npm test`) och **18/18 Chromium-grupper** (`npm run test:browser`) passerade. `npm run build`, `npm run test:build` och `git diff --check` passerade också.

## Uppmätt dragkostnad

Miljö: Linux Headless Chromium 154 i denna molnmiljö, desktop 1360×950,
syntetisk 3000×2000 linjär Float32-RGB, varm verktygsväg, 12 bildrutor med åtta
händelser vardera. Basmätningens gemensamma statistikfix var redan installerad
vid föremätningen; jämförelsen isolerar den manuella återkopplingsoptimeringen.

| Mått | Före | Efter |
|---|---:|---:|
| Statistikberäkningar / 96 händelser | 96 | 13 (12 live + 1 slutlig) |
| Källuppslag, inklusive provkontroller | 1 364 365 | 11 197 |
| Burst + väntan på bildruta, median | 71,1 ms | 16,7 ms |
| Burst + väntan på bildruta, p95 | 82,9 ms | 18,3 ms |
| Statistikberäkning, median / p95 | 4,6 / 6,9 ms | 1,7 / 5,2 ms |
| Lupp, median / p95 | 2,2 / 3,4 ms | 0,3 / 1,5 ms |

Eftermätningens synkrona dispatchkostnad var 3,1 ms median och 3,8 ms p95 per
åttahändelsersburst. Tiden runt rAF inkluderar bildrutans väntetid och är inte en
ren beräkningstid. Luppens första cachemiss kräver högst 196 källpixlar i stället
för 12 544. Slutlig statistik kan kosta mer än det preliminära liveprovet.
Rårapporter: [före](measurements/drag-before.json), [efter](measurements/drag-after.json).
Detta lilla lokala prov mäter arbetsmängd och dragrespons; det bevisar inte en
allmän p95 för appen, förfiningsdetektorn eller fysisk iPad. Enhetspåverkan,
kall import/RAW-avkodning och minnestryck måste mätas separat på mål-enheterna.

## Kvar att verifiera

- **EJ VERIFIERAT:** fysisk iPad Safari/Apple Pencil och Windows Edge.
- **EJ VERIFIERAT:** detektorns falska fyndfrekvens och färgriktighet på verkliga
  RAF-/TIFF-negativ. Homogen hållare som liknar film kan fortfarande vara tvetydig;
  kandidatkvalitet är en heuristik, inte en sannolikhet eller ett automatiskt godkännande.
- De syntetiska smalkanterna täcker 2–6 pixlar vid 768×512. Det garanterar inte
  fynd av en godtycklig enpixelkant eller en mellanruta mellan alla glesa tvärsnitt.
- Behövs: samma negativ i −1/0/+1 EV utan klippning, dokumenterad kamera-WB/gain,
  RAW-läge och ljus/flat-field; linjär 16-bitars TIFF samt ICC-TIFF från samma
  utveckling; manuellt märkta smala rebate-/mellanruteområden med perforeringar,
  damm, text och olika hållare; C-41 med flera masker och svartvit film; en känd
  neutral-/färgreferens för färgvalidering. Okänd fysisk ljus-/WB-ändring i TIFF
  kan fortfarande inte härledas ur ett sessionsnamn.
