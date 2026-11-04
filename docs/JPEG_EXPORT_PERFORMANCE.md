# JPEG-export: riktad optimering, steg 4

Bas: main `575f9b64af26cd8a2577c07e15c84f367bb8e1ba`, inklusive #52.
Senaste exportändringen före detta arbete var stabilitetsrättningen i #46;
#51/#52 ändrade inte JPEG-kedjan. Ingen publicering eller merge görs här.

## Flaskhals och korrigering

Den faktiska `jpegBytes()`-kedjan mättes i Chromium, med dess vanliga worker,
canvas och JPEG-kodare. V2 Fotografisk 2 på 6032×4032 (24,321 MP) tog före
ändringen median 16,556 s. Pixelrenderingen stod för 15,899 s, cirka 96 %.
Paketering tog 0,121 s och slutlig kodning 0,092 s. Det är främst arbetet före
JPEG-kodningen som förklarar det långsamma procentförloppet i denna miljö.

En separat CPU-profil på 3,84 MP pekade ut V2-adaptern i `render-core.js`.
Den använde `Array.from(Float64Array, encode)` för att skapa tre kodade
RGB-värden **för varje pixel**, med iterator och callback. Ungefär 998 ms av
den profilerade körningen låg som självtid i den adaptern. Profilering ökar
själv körtiden; detta är lokalisering av arbete, inte ett normalt exporttal.

Korrigeringen läser de tre scratchvärdena direkt och anropar **samma**
`NSV2Render.encode()` i samma RGB-ordning. Samma trevärdesarray returneras.
Det ändrar ingen matematisk operation, precision, parameter eller avrundning.
Den befintliga gemensamma adaptern används även av CPU-preview/TIFF; dessa
behåller sina resultat. Inga exportägare, workers eller renderingsmodeller
dupliceras. Ingen LUT, pool, GPU-väg eller ny dependency införs.

## Mätning

`tools/benchmark-jpeg.mjs` kör huvudplattformens riktiga export, inte en separat
pixel-loop eller falsk JPEG-kodare. Instrumentering injiceras endast av verktyget
i testwebbläsaren/workern och följer inte med den publicerade applikationen.
Service workers blockeras för att undvika gamla kodkopior. Samma valbara
`--ref` överlagrar de fem berörda export-/renderingsfilerna från Git så att
baslinjen kan återköras utan att arbetsgrenen skrivs över.

Fullständiga mätningar, individuella upprepningar, kodfingeravtryck och
kontrollserier: [jpeg-export-performance.json](measurements/jpeg-export-performance.json).

Miljö: Linux, Node 24.22.1, Chromium 155.0.8059.79 headless. Exakt CPU/OS finns
i mätfilen. Ingen CPU-throttling. En uppvärmningskörning per kombination följs
av tre uppmätta exporter. Exportkvalitet **0,94**, sRGB, neutrala Editing 2.0-
reglage och profiler. V2 avser algoritm 3/Fotografisk 2. V2 och Standard får
identiska linjära Rec.2020 Float32-källpixlar. Import/analys görs före klockstart;
geometri/recept, export, Blob-läsning och signaturkontroll ingår i totaltiden.
Avkodningskontrollen med `createImageBitmap()` sker efter mätningen.

### Fullstor källa och export

Proceduralt varierat negativ 6032×4032; vanlig geometri utan beskärning/rotation.
Tider i sekunder, median [min–max] av tre körningar.

| Motor/backend | Före | Efter | Kortare tid | MP/s före → efter |
|---|---:|---:|---:|---:|
| V2 worker | 16,556 [16,234–16,792] | 8,379 [8,359–8,471] | 49,4 % | 1,47 → 2,90 |
| V2 reserv | 29,448 [28,954–29,463] | 20,616 [20,564–20,635] | 30,0 % | 0,83 → 1,18 |
| Standard worker | 9,084 [8,717–9,545] | 9,228 [8,517–9,391] | −1,6 % | 2,68 → 2,64 |
| Standard reserv | 17,005 [16,965–17,035] | 17,585 [17,452–17,777] | −3,4 % | 1,43 → 1,38 |

Standard är kontroll och dess pixelkod är oförändrad. De små negativa talen
redovisas, inte avrundas till en förbättring. De ger inte belägg för en
Standard-optimering. Skillnader mellan maskiner och körordning begränsar
slutsatser om så små förändringar; även den riktiga RAF-serien används som
kontroll. V2:s stora förbättring gäller den mätta plattformen.

Den initiala −3,4 %-avvikelsen i Standards reservläge följdes upp med en
separat serie i omvänd körordning (kandidat först, baslinje sedan), tre
upprepningar plus uppvärmning: **17,822 → 17,772 s** (+0,3 %), med överlappande
intervall. Ingen konsekvent Standard-regression eller förbättring har alltså
verifierats. Båda serierna behålls i underlaget.

På den befintliga privata porträtt-RAF-filen 04 (samma 6032×4032), faktiskt
importerad via ordinarie RAW-väg, gick V2 worker från **16,805 s till 8,909 s**
(47,0 % kortare tid). Standard var 8,397 → 8,452 s (−0,7 %), med överlappande
körintervall. Här kördes kandidaten först och baslinjen därefter, som kontroll
mot den första seriens körordning. Tre exporter plus en uppvärmning per motor.
Samtliga 404 RGBA-remsors SHA256 matchar före/efter i alla uppmätta körningar;
det verifierar de faktiska pixlarna som skrivs till kodarens canvas. Ingen
fullstor kopia behövs för kontrollen. JPEG-filstorlekarna är identiska:
3787068 byte för V2 och 6352517 för Standard. Avkodade dimensioner är korrekta.
Filens tekniska SHA256 finns i mätfilen; privat namn/sökväg och bilddata utelämnas.

Original ingår i pixel-/exportregressionerna. Ingen separat tidsvinst påstås
för Original, eftersom den ändrade adaptern enbart används av V2.

Fri rotation 3° av en 2400×1600-källa ger 2228×1485 (3,309 MP) utdata och
konverterar fyra källgrannar före interpolation. V2 worker: **9,303 → 5,135 s**
(44,8 % kortare tid); Standard: 5,491 → 5,198 s. Tre upprepningar plus
uppvärmning. Detta verifierar vinst även i den verkliga presentationssamplern,
inte bara dess enklare heltalssampling.

### Tidsmoment och deras innebörd

Alla enskilda upprepningar och fält finns i den tekniska mätfilen. Tiderna är
uppmätta med `performance.now()`; meddelandelatenser använder gemensam
`timeOrigin + now`. Inga timers körs i pixel-looparna.

| Moment, V2 worker 24,32 MP | Före, ms | Efter, ms |
|---|---:|---:|
| Geometri/receptbyggare | 0,10 | 0,10 |
| Pixelrecept kompilering | 1,20 | 1,00 |
| Paketering/källsampling | 121,30 | 115,50 |
| Summerad meddelandelatens till worker | 54,70 | 44,72 |
| Summerad meddelandelatens till huvudtråd | 143,60 | 111,82 |
| Konvertering/rendering/RGB8 | 15898,90 | 7773,10 |
| Canvas | 26,70 | 26,80 |
| JPEG-kodning | 92,20 | 92,40 |
| Väntan före paketering | 171,00 | 164,80 |
| Övrigt/residual | 48,93 | 45,04 |

- `recipeGeometryMs`: geometri-/konfigurationsbyggarna. JSON-kloning och
  kontrollerns övriga förberedelser ingår i residualen, inte i pixelrendering.
- `prepareMs`: kompilering av det oföränderliga pixelreceptet.
- `packMs`: paketering, källkoordinater och källsampling på huvudtråden.
- `transferToWorkerMs`/`transferToMainMs`: uppmätt tid från `postMessage` till
  mottagning, inklusive meddelandekö/deserialisering. Detta är inte ren
  hårdvarutransport. Även kontroll-/progressmeddelanden räknas. Summan av
  meddelandelatenser kan överlappa (t.ex. progress följt av ny begäran) och är
  inte en exklusiv del av väggtiden.
- `renderMs`: konvertering, Editing/profiler, geometrisk sampling och RGB8-
  avrundning i `NSPresentation.rgba()`. Vid fri geometri ingår konvertering av
  fyra grannar och linjär interpolation. Geometrikostnaden där är inkluderad,
  inte isolerad med ändrad algoritm.
- `canvasMs`: `createImageData` och `putImageData`.
- `encodingMs`: verklig `convertToBlob` eller `toBlob`, kvalitet 0,94.
- `yieldMs`: väntan före paketering respektive reservlägets nolltimer mellan
  remsorna. `otherMs` är uppmätt total minus ovanstående moment, inklusive
  workerstart, kontroll/UI och JPEG-Blob-läsning, korrigerat nedåt av eventuellt
  överlappande meddelandelatenser. Det är en härledd residual, inte en separat
  uppmätt väntetid. `firstNeedMs` redovisar dessutom tiden till workerns första
  databegäran inklusive uppstart. Medianer för delmoment ska inte summeras
  som om de vore från en enda körning.

404 remsor skickas vid fullstor worker-export: 405 meddelanden till workern,
810 tillbaka och **291852288 byte** pixelpayload totalt. Maximalt en
källremsa om **723840 byte** och en RGBA-remsa om **241280 byte** används åt
gången. Reservläget arbetar i 2016 mindre remsor utan workertransport.
Byteantalet avser de överförda typade pixelbuffertarna; structured-clone-
metadata och webbläsarens protokollframing är inte uppmätta.

### Minne

Mätfilen skiljer uppmätta dimensioner/buffertlängder från **uppskattad**
sammanlagd kostnad. Källbufferten är 291852288 byte; canvasens logiska RGBA-yta
är 97284096 byte. Ingen extra fullstor Float32-källa skapas av exporten.
Remsgränser, antal samtidiga remsor och bufferägande är oförändrade.

Detta är inte uppmätt RSS eller maximal processförbrukning: RAW-fil, LibRaw,
preview/GPU, encoder, Blob och webbläsarens interna ytor/GC tillkommer.
Webbläsarheapen ensam skulle inte mäta dessa kostnader tillförlitligt.

## Avfärdade alternativ

Överlapp/pool, större remsor och ändrad transport införs inte: paketering och
meddelanden dominerade inte workerfallet. `ImageData` återanvänds redan.
Receptet kompileras redan en gång per exportförsök. Ingen fullstor kopia eller
ny RAW-avkodning sker i exporten. Återstående V2-logaritmer/potenser och
färgarbete behålls exakt. Reservlägets cirka 8,25 s timer-/eventloopväntan på
24,32 MP är synlig men ändras inte; större obrutna arbetsblock skulle påverka
avbrott och responsivitet och behövs inte för den verifierade vinsten.

## Pixelkontroll och regressioner

`tests/jpeg-export-pixels.mjs` fryser 120 referensfall från main före ändringen:
Original, Standard, V2 Neutral/Foto 1/Foto 2; neutrala, redigerade och kreativa
färg-/svartvita profiler; beskärning, alla kvartrotationer, fri geometri och
två storlekar. RGB8 **före** JPEG-kodaren och RGB16 för TIFF har identiska
SHA256-värden. Packad workerindata jämförs dessutom byte för byte med direkt
källsampling. Referenserna är syntetiska; inga privata fotografier läggs i Git.

Den befintliga browsersviten kontrollerar verkliga JPEG-signaturer,
avkodbarhet, dimensioner, worker/reserv, batch, avbrott, worker-/encoderfel,
minnes-/storleksfallback, projekt och oföränderligt exportsnapshot. TIFF:s
encoder, profil, kvalitet och bitdjup ändras inte. Progressindikatorn är kvar
och baseras på faktiskt färdigbehandlade rader; ingen snabbare skenprogress.

Verifierat lokalt efter `npm ci --no-audit --no-fund`:

- `node tests/jpeg-export-pixels.mjs`: **120/120** RGB8/RGB16-referenser matchar.
- Benchmarkverktygets röktest med faktisk worker och reserv: samma RGBA-hashar,
  intakt källbuffert och korrekta avkodade JPEG-dimensioner.
- `npm run test:full`: **107/107 testgrupper**, 280,36 s, Node 24.22.1/Chromium.
  Även oförändrad TIFF, profiler, projekt, cache och motorbyten passerar.
- `npm run build` och `git diff --check` passerar.

GitHub Actions kör samma fullsvit på PR:en; dess faktiska resultat länkas i
PR-beskrivningen. Browserresultat avser Chromium, inte fysiska iPad/Edge-test.

## Återkörning och begränsningar

```sh
npm ci
node tools/benchmark-jpeg.mjs --ref 575f9b64af26cd8a2577c07e15c84f367bb8e1ba --output .cache/jpeg-before.json
node tools/benchmark-jpeg.mjs --output .cache/jpeg-after.json
node tools/benchmark-jpeg.mjs --ref 575f9b64af26cd8a2577c07e15c84f367bb8e1ba --geometry presentation --width 2400 --height 1600 --backends worker --output .cache/jpeg-geometry-before.json
node tools/benchmark-jpeg.mjs --geometry presentation --width 2400 --height 1600 --backends worker --output .cache/jpeg-geometry-after.json
```

För egen RAF, lägg till `--raf /privat/sökväg/bild.RAF --backends worker`.
`--hash-pixels` lägger till SHA256 av varje faktisk RGBA-remsa före kodaren,
för separat likhetskontroll. Dessa körningar innehåller även digestkostnad och
ska jämföras med motsvarande instrumentering. Endast begränsade remsbuffertar
kopieras för digest, inte en ny fullstor bild. `--size safe` provar 12 MP-gränsen.
`--profile /tmp/export.cpuprofile --backends main --engines v2` ger en valfri
CPU-profil; profiltider ska inte jämföras som normala benchmarktider.

Fysisk iPad Safari och Windows Edge finns inte i miljön. Hastighetsvinsten
är därför **inte verifierad på dessa enheter**, och Chromiumtal är ingen
utlovad iPad-exporttid. Resultaten gäller befintlig CPU-kedja; nästa
utvecklingssteg påbörjas inte.
