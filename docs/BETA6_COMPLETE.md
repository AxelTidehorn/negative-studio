# FILMLABB 1.1 Beta 6 – färdig användarintegration

Bas: main `335b707` (PR #16–18). Detta steg kopplar den befintliga geometrin
och exporten till användarverktyg och preview. Det ersätter tidigare dokumentens
fasgräns där fri geometri ännu inte fick visas i UI/preview.

## Användning

- Öppna **Rotation & komposition** i justeringspanelen. Finrotation kan ändras
  med reglage, tangentbord eller numeriskt fält inom ±45°. De befintliga
  kvartvarvsknapparna ger övriga orienteringar. **Nollställ rotation** återställer
  både kvartvarv och finvinkel.
- **Räta upp med linje**: dra längs en horisontell eller lodrät linje. Bilden
  rätas upp till närmaste axel. Escape avbryter verktyget.
- **Kompositionsbeskärning / Justera utsnitt** visar hela den roterade källan
  som sammanhang. Dra utsnittet eller ett hörn, med mus eller pekskärm.
  **Klar** visar exakt den färdiga exportytan. **Hela bildytan** tar bort enbart
  kompositionen; rotation och analysram lämnas kvar.
- **Filmruta** är ett separat kompakt verktyg. Orange sidor redigerar den
  tekniska analysramen, även när bilden är roterad. Låsning, explicit automatisk
  detektering och bekräftelse finns kvar. Sparad manuell ram går före automatisk
  detektering vid omläsning och bildbyte. Att ändra filmrutan kan som tidigare
  ändra analys/toner; komposition och rotation gör det inte.
- **Hela kön: beskär till filmrutan** gäller alla bilder, inklusive nya bilder.
  Nya sessioner börjar med detta påslaget, för hela den detekterade exponerade
  ytan och utan kreativ komposition. Osäker detektering har kvar sin synliga
  bekräftelse. Importerade projekt återställer sitt uttryckliga/migrerade val.
- **Tredjedelsrutnät** följer den effektiva kompositionen. Det är en lokal
  visningspreferens, fungerar i båda teman och kommer aldrig med i export.

## Prioritet och koordinater

1. Källan avkodas och metadataorienteras av befintlig import. Ingen extra EXIF-
   eller RAW-rotation läggs ovanpå den redan orienterade källan.
2. Filmrutan ligger i oförändrade S-koordinater och är negativanalysens område.
   Kövalet avgör om den också begränsar den giltiga presentationsdomänen.
3. Kvartvarv och finvinkel skapar samma R-plan som i PR #17–18.
4. Önskad frivillig komposition begränsas till ett giltigt effektivt utsnitt
   inom domänen. Utan komposition används modellens centrerade utsnitt med
   dokumenterat fast sidförhållande. Tomma hörn exporteras inte.

Preview och export anropar `NSGeometry.compositionTransform`; pekaren använder
samma invers, sedan originalets normalisering för pipetter och lupp. All
rotationsmatematik ligger kvar i geometribiblioteket. `contextTransform` är ett
litet tillägg för hela roterade källans redigeringsvy. Denna vy kan visa mörka
hörn **under redigering**; Klar och export använder alltid den giltiga slutytan.

Gamla projekt, blandade gamla crop-val och exakta kvartvarv använder fortsatt
PR #17–18:s migration och direkta exportväg. Migrerade individuella beskärningar
visas som kompositioner, inte som dolda booleska undantag. Att stänga av kögränsen
raderar därför inte befintliga individuella kompositioner.

## Preview och livscykel

`preview-presentation.js` ger ett litet WebGL2-geometripass och en skalär
CPU-motsvarighet. `geometry-ui.js` äger verktyg, pekarens capture/loss, cache-
livscykel, overlay och kopplingen till befintliga controllers.

Den befintliga GPU-färgrenderaren är oförändrad. Direkt efter en färgrendering
kopieras den begränsade färdiga canvasen till en RGBA8-textur i geometripasset.
Det kräver ingen fullstor källkopia eller readPixels. CPU-worker-resultat laddas
på motsvarande sätt. En geometriändring kör endast geometripasset, inte analys,
färgshader eller källuppladdning. Högst 1400 pixlar på längsta previewsidan;
CPU utan WebGL använder 240 under drag och 480 efter vila. Ingen preview arbetar
på exportens fulla upplösning.

Interpolation av den färdiga previewbilden sker i linjärt visningsljus, med
samma pixelcentrum- och kantpolicy som exporten. Begränsad, kvantiserad preview
är inte pixelidentisk med originalexport: RGBA8-cache och befintlig nearest-
reduktion av originalet kan ge skillnader på högfrekventa motiv. Exporten
fortsätter färgbehandla varje originalgranne före interpolation i 16-/8-bitarsvägen.
Färgformler, analysalgoritmer och exportalgoritmer ändras inte här.

Jämförläget cachar positiv och negativ rendering separat och lägger
splitgränsen i **utbildens** koordinater. Det följer därmed inte en roterad
källkolumn. De två begränsade texturerna behövs endast i detta visningsläge;
ingen ny negativanalys utförs. Histogrammet behåller sitt tidigare provområde.

CPU-resultat behåller tidigare request-/source-guard. Ett accepterat färgresultat
presenteras med den **senaste** geometrin. Bildbyte döljer gammal presentation
och avbryter verktyg/capture. Töm kö frigör textur- och CPU-cache samt reducerar
canvasbufferter. Förlorad geometri-WebGL växlar till begränsad CPU-rendering och
kan återställas. Verktygen låses tillsammans med befintliga exportkontroller och
återaktiveras vid lyckad export, fel eller avbrott.

Projektformatet är fortsatt `negative-studio-roll-beta6`, geometri version 1.
Fälten och deras betydelse är oförändrade. Både gamla format, RAW-inställningar,
profiler och kalibreringsdata behåller sina befintliga kompatibilitetsregler.

## Tester och avgränsningar

Ny `test/preview-geometry.mjs` verifierar 72 CPU-cache-/exportkombinationer,
neutral bitexakthet samt full-context-transformens invers. Ny genomgående
`test/beta6-complete-browser.mjs` täcker verktyg med mus och faktisk emulerad
touch/pointer capture, positiv/negativ vinkel, 56 GPU/CPU-samplingsfall,
komposition, oberoende analys, manuella ramar, projekt, köval/nya bilder,
EXIF, TIFF/JPEG, rutnätets exportoberoende, teman och WebGL-reservläge.
Befintliga RAW-/TIFF-, färg-, batch-/ZIP-, avbrotts- och cacheprov körs också.

Det tidigare flat-field-browserprovet kunde läsa gammal working-bild medan
projektfilens asynkrona läsning ännu väntade. Det väntar nu uttryckligen på
slutförd projektimport och giltig kalibrering, inte på en redan sann gammal
bildpredikat. Inget test av färgmatematik har lättats.

Det finns ingen TypeScript-konfiguration i repositoryt. JavaScript-syntax,
Node-regressioner, produktionsbygge och browser-sviten är relevanta kontroller.
Fysisk iPad och installerad Microsoft Edge återstår för verklig hårdvaru-,
minnes- och nedladdningsverifiering. Chromium-touch är ingen fysisk iPad-mätning.

### Manuell verifiering före release

- Edge och fysisk iPad: importera JPEG med EXIF, 16-bitars TIFF och en stödd RAW.
- Ändra orange filmruta med finger/mus, byt bild och ladda om projektet.
- Dra finrotation, skriv negativ vinkel, prova kvartvarv, upprätning och nollställ.
- Flytta/ändra komposition vid zoom, växla teman och visa/dölj rutnät.
- Prova pipetter och originaldetalj efter rotation; kontrollera platsen i källan.
- Slå av/på köbegränsningen och importera en ny kö; återställ äldre blandat projekt.
- Jämför previewyta och TIFF/JPEG; prova JPEG-ZIP, TIFF-batch och avbrott.
- Kontrollera lång RAW/TIFF-export, minne, orienteringsbyte, touch cancel och
  offlineuppdatering. Fem-bildersgränsen ska bestå.

### Verifierat resultat

- Baslinjens 31 Node-grupper passerade. Efter implementationen passerade samma
  fullsvit och det nya 72-fallsprovet separat; slutlig ren-checkout-körning
  inkluderar det som grupp 32.
- Webbläsarsvit: **7/7 grupper godkända**, inklusive GPU/CPU, exportreservlägen,
  avbrott, RAW/TIFF-regressioner, batch/ZIP och offlineversionering.
- Produktionsbygge och byggtester passerade. Nya JS-/CSS-resurser ingår i
  bygglistan och det innehållshashade precache-manifestet.
- `node --check` för tillagda/ändrade kontrollmoduler: godkänd syntaxkontroll.
- 24 geometriändringar i Chromium/SwiftShader: cirka **3,2 ms median och
  25,3 ms p95** i geometripassets JavaScript-inskickning, noll nya analyser,
  färgrenderingar eller källuppladdningar. Detta är inte total GPU-tid eller
  hårdvaruprestanda på Edge/iPad. Exportens tidigare uppmätta merkostnad vid
  fri rotation påverkas inte; den direkta legacy-exporten är fortsatt kvar.

Känd gammal downscaling-aliasing (#8) kvarstår. Det finns inga nya kända
funktionella testfel; återstående manuell enhetsverifiering listas ovan.
