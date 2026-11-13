# Filmgränser och preliminär importbild

> Historical implementation/measurement record. Reproduction commands referring to removed tools require the [pinned PR #99 checkout](https://github.com/AxelTidehorn/negative-studio/blob/f78a0314480072a723f97ce3f1a5aeffae008353/docs/frame-detection/method.md). This does not retire the application functionality described here. Current test commands and coverage are in [TESTING](../TESTING.md).

Bas: main `0ac89dc` efter #95. Originalet `_DSF9235.RAF` finns i Drive/Fotolab,
50 245 120 byte, SHA256 `ae289e8118ffc91321b19c145c5e815b3562fe4b47fda5c2eae5517439ab0094`.
Det importeras genom appens libraw-wasm/V2-recept. En nedskalad linjär
teknisk preview är ett regressionstestunderlag, inte en fullupplöst RAW-export.

## Granskade metoder och licenser

- [FilmCropper](https://github.com/filmlover-0111/FilmCropper/blob/main/FilmCropper/filmcrop_final_ui_app.py),
  granskad filblob `6ca1570b48baf8fc50612d531d7d6769f63c2955`, MIT, copyright
  filmlover-0111 2026. Faktisk kod: användarvalt Lab-basprov, euklidiskt
  färgavstånd, medianfilter, morfologisk close/open, inverterad mask,
  `findContours`, största giltiga kontur och valbar `minAreaRect`-upprätning.
  Koden begränsar **bildförhållandet till 0,2–6,5**. Detta återanvänds inte.
  Ingen implementation kopieras; FILMLABB använder egna funktioner och ingen
  ny OpenCV-/WASM-dependens. MIT skulle tillåta återanvändning med licenstext.
- [OpenCV shape documentation](https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html):
  komponenter, konturer, konvext hölje och roterad minsta rektangel är generella
  datorseendeprinciper. Vår kombination med gradientriktad Hough-ackumulering,
  linjepassning, korsningshörn och konkurrerande hypoteser är en egen implementation.
- [Negative Lab Pro basics](https://www.negativelabpro.com/guide/basics/): den
  offentliga guiden beskriver separat filmbas-vitbalans och crop/border buffer
  för att utesluta icke-film vid analys. Detta är dokumenterat användarbeteende;
  dess proprietära detektor/färgkod har inte granskats.
- [VueScan Crop](https://www.hamrick.com/vuescan/html/vuesc30.htm#cropbuffer):
  Border utvidgar bilden men ignoreras för färgbalans; Buffer ignorerar inre
  kantpixlar för färgbalans utan att ändra bildens storlek. Det stöder separation
  av export och analys, men säger inte hur VueScans detektor är implementerad.

## Varför #95 inte hittar huvudfallet

Fyra orange sidband krävs. På originalet finns en angränsande bild till vänster,
ett orange band mellan bilderna och en mörk hållare direkt till höger. Bara två
sidor hittas (konfidens 0,30). Säkerhetsläget fungerar men geometrin identifieras
inte. Analysområdet blir då inte automatiskt betrott.

## Isolerat experiment och vald kombination

`frame-detector.js` arbetar på högst 480 px, i normaliserade källkoordinater.
CIELAB beräknas med D65 och rätt XYZ-matris för linjär Rec.2020/sRGB. Homogena
yttre provytor ger flera bakgrundsmodeller utan förvald filmbasnyans. Flera
färgavstånds- och ljushetströsklar, liten morfologisk closing, sammanhängande
komponenter och konvexa höljen ger konturhypoteser.

Kontursegmentering ensam missar originalets sammanhängande bild/hållargräns
och föreslår även byggnadsdetaljer. Därför kompletteras den med riktade
färg-/ljushetsgradienter, Hough-linjer, minstakvadratanpassning och fyra hörn.
Kandidater jämförs med kantstöd, lokala yttre bakgrunder, inre variation och
stöd från flera trösklar/upplösningar. Små inre rektanglar och filmens ytterkant
måste konkurrera med hela fotografiets gränser. Enbart orange färg är aldrig
ett krav. Ingen lista över format, kvot, kvotintervall eller formatpoäng finns.
En minsta provlängd i pixlar är en upplösningsgräns, inte ett bildförhållande.

Fyra tydliga sidor och stabilitet mellan 480/320 px krävs för automatisk tillit.
Tre sidor ger ett markerat osäkert fyrhörningsförslag. Konkurrerande regioner,
upplösningsskillnad och saknade gränser rapporteras separat. Ingen generell
procentbeskärning ersätter evidens. Konfidens är en heuristik, inte en uppmätt
sannolikhet. Ovanlig scenstruktur kan fortfarande ge falska regioner.

`tools/capture-frame-sources.mjs` reproducerar RAW-importen och sparar begränsade
Float32-prov med originalhash, decoderrecept och byggidentitet för jämförelse.
Gamla detektorn fryses endast i `tests/fixtures` för jämförelse.

Hållare → homogen klar film är en yttre filmkant, inte automatiskt en
fotografisk gräns. Kandidatkontrollen söker därför även klar film → tätare
motiv, eller variation i motivet när utsidan är en mörk hållare. Stabila
hypoteser jämförs mellan upplösningarna; bara vinnaren från en upplösning
behöver inte sammanfalla med vinnaren från den andra. Ingen formatkvot används.
Tre starka sidor kräver fortfarande åtminstone svag positionsevidens för den
fjärde: utan sådan evidens går dess läge inte att härleda utan ett formatantagande.

## Fyra separata områden

1. **Fotografiska gränser:** `state.frameDetection.quad`, normaliserade hörn i
   hela den avkodade källans koordinatsystem. Detektorns arbetsbild är högst
   480×321 i RAF-materialet, medan originalen är 6032×4032. Normaliserade
   koordinater förs till befintlig `NSGeometry` för visad rotation/zoom/panorering.
2. **Teknisk analys:** `analysisQuad`, två detektorpixlar innanför de identifierade
   gränserna. Det är en upplösningsbestämd analysmarginal, ingen generell
   procentbeskärning eller ändring av det fotografiska formatet. V2:s befintliga
   källankrade provgaller filtreras av denna konvexa polygon innan dess oförändrade
   exponerings-, färgbalans- och D-tonberäkningar. Rektangulära områden utan
   polygon behåller exakt tidigare kontrakt. Polygonen ingår i analysnyckeln.
3. **Filmbas:** befintlig Filmbas 2 och accepterade manuella referenser äger
   fortfarande kalibreringen. Detektorns Lab-modeller används bara för geometri,
   aldrig som V2-basreferens. Den äldre automatiska `findBase` får fortfarande
   bara användas vid betrott område och söker utanför den omslutande filmrutan.
4. **Komposition/export:** befintlig `NSGeometry` är fortsatt enda modellen för
   visning och export. `cropRegion` omsluter de identifierade hörnen; den är inte
   längre en inskriven rektangel som kapar hörn vid lutning. En rektangulär export
   kan därmed innehålla trianglar av filmkant vid rotation. Ingen perspektivwarp
   eller ny exporttransform införs. Att behålla hela källan/filmkanten ändrar inte
   V2:s analysfyrhörning; detta verifieras också i den riktiga appen.

Manuell ändring tar bort den automatiska hörnposten och analyserar om användarens
rektangel. Manuellt låsta/sparade filmrutor skrivs inte över. Äldre projekt utan
hörnmetadata fungerar som tidigare. Ny metadata är ett versionsmärkt valfritt
inställningsfält, inte ett nytt projektformat. Projektläsningen validerar hörn,
analysområde och koppling till filmrutan före tillståndsändring; fel avvisas
transaktionellt. Äldre appversioner saknar stöd för den nya analysfyrhörningen.

Den synliga automatiska fyrhörningens kanter är även klickytor. En verklig
pekardragning verifierar detta vid lutning; annars kunde klickytan felaktigt
ligga kvar på den omslutande rektangeln. Första manuella dragningen övergår till
det befintliga rektangulära filmruteverktyget. Ett separat manuellt fyrhörnings-
eller perspektivverktyg införs inte.

## Resultat på verkliga bilder

Samtliga elva unika RAF-original i Fotolab har importerats genom appens
verkliga LibRaw/V2-väg. Detektorerna jämförs sedan på samma begränsade linjära
arbetsdata, utan ny RAW-avkodning mellan alternativen. Originalhashar,
dimensioner, miljö, metodalternativ och resultat finns i
[results.json](comparisons/results.json). Kontaktkartan visar gamla förslaget
till vänster och det nya till höger; ett osäkert förslag är inte ett godkänt
analysområde. Blått är manuell referens, orange #95, rött nya hörn och grönt
analysregionen. Färgerna i dessa tekniska negativvisningar är förenklade.

[Kontaktkarta: elva verkliga negativ](comparisons/contact.jpg) ·
[Huvudfallet sida vid sida](comparisons/dsf9235.jpg)

På `_DSF9235.RAF` går konfidensen från 0,30 till 0,84. Mot den manuella
referensen behålls 99,50 % av motivytan; 0,063 % av analysfyrhörningen ligger
utanför referensen. Maximal kantavvikelse är 3,25 detektorpixlar och medelavvikelse
0,95. Referensen är visuellt annoterad på en 720-pixelsbild, med ungefär tre
visningspixlars osäkerhet. Det är inte en exakt fysisk segmenteringsfacit.

De övriga tio referenserna är grova manuella annoteringar, ungefär ±8 pixlar på
480-pixelsbilder; 8951/9231 granskades även i större skala. Fältet
`includedBorderFraction` mäter därför **yta utanför annoteringen**, inte en
bevisad filmbasklassificering. Någon generell frekvens av falskt säkra resultat
på verkliga negativ skattas inte från dessa annoteringar.

Den slutliga metoden accepterar fyra av elva bilder automatiskt: 8951, 9231,
9235 och 9237. Sju lämnas osäkra. #95 accepterade fem, men flera gamla
axelparallella rutor förlorade mer av motivet. Antal accepterade rutor är
alltså inte i sig ett träffsäkerhetsmått. 8434/8948/8983/9243 har skillnader
mellan upplösningar; 9238 konkurrerande regioner; 9229/9239 svagt gränsstöd.
Detta är en fungerande förbättring av huvudfallet, **inte** en färdig universell
detektor. Gränser mot tät/homogen film, angränsande rutor, starkt perspektiv,
reflexer och mycket svaga motivkanter behöver fortsatt praktisk verifiering.

Fullständig import av originalet har dessutom körts separat i Microsoft Edge
157/Linux och Playwright WebKit/WPE/Linux. Båda ger 6032×4032 och exakt samma
Float32-arbetsprov som före-versionen. I appen syns förbättrade neutrala ytor,
hud och blå kläder när rätt område möjliggör ordinarie bas-/ton-/färganalys.
Detta sker utan ändrade manuella reglage eller profilparametrar. Den positiva
bilden förväntas ändras när analysområdet rättas; frysta konverteringsrecept
ska däremot fortsatt ge identiska exportpixlar.

[Före, riktig RAW i Edge](screenshots/before-raw-1280x900.png) ·
[Efter, riktig RAW i Edge](screenshots/after-raw-1280x900.png) ·
[Efter med synlig filmkant i WebKit](screenshots/webkit-raw-with-border-1280x900.png)

## Preliminär RAF-bild

`.picture canvas` träffade även den inbäddade JPEG-bildens canvas. Ordinarie
positionering avgränsas nu till `.picture > canvas`. Preliminärbilden har en
egen behållare med tre rader: avbryt-knapp, innesluten bild och text. En separat
bildbehållare undviker också WebKits avvikande procenthöjd för canvas i en
gridcell. Vanliga bildverktyg, geometriöverlägg och gammal laddningsindikator
döljs medan preliminärbilden visas; normal zoom/rotation/panorering behålls.

Den befintliga inbäddade RAF-JPEG:n avkodas till högst 640 pixlars längsta sida.
Tre små histogram skattar kanalernas ljusa filmnivå, och tre 256-värdeskurvor
gör en ungefärlig positiv inversion. Färgerna kan tydligt avvika från färdig
konvertering; etiketten säger det. Nästan svarta/oläsbara prov behåller
kamerabilden som fallback. Detta är en tillfällig DOM-bild, ingen källa för
V2, histogram, geometri, cache, miniatyr eller export. Ingen extra RAW-avkodning
sker. Bitmapen stängs, och bilden tas bort vid riktig RAW-visning, fel, avbrott
eller byte. JPEG/RAW-koordinatkoppling antas inte och inget JPEG-förslag får
skriva slutlig geometri.

[Före på surfplatteformat](screenshots/before-proof-768x1024.png) ·
[Efter på samma format](screenshots/after-proof-768x1024.png)

## Kostnad och testmiljö

Den nya geometriska analysen kostar mer CPU än #95. I de separata enstaka
Edge-originalkörningarna tog detektorsteget ungefär 44 ms före och 1662 ms efter;
positivapproximationen ungefär 13 ms. I WebKit-exemplet tog motsvarande steg
1763 respektive 46 ms. Den preliminära bilden syntes vid cirka 237 ms i Edge och
792 ms i WebKit. Dessa är enskilda Linux-körningar, inga statistiskt säkerställda
import-/iPad-tidslöften. Total import var cirka 23,9 s före och 27,6 s efter i
Edge-exemplen, 38,1 s i WebKit. Belastning och kallstart varierar; någon
importhastighetsvinst hävdas inte. LibRaw-recept och optimeringar från #93 ändras
inte. Detektorn är begränsad men synkron och kan blockera huvudtråden under sitt
arbete; flytt till worker lämnas utanför denna integration. Sparade bildbyten och
presentation-/profiländringar kör inte om detektorn eller RAW-avkodningen.

Riktade tester kördes i Chromium 156, riktig Microsoft Edge 157/Linux och
WebKit/WPE/Linux med pekstöd, fem viewport/orienteringsfall per webbläsare.
[Browserprotokoll](browser-verification.json) redovisar avgränsningen.
WebKit kördes med officiella utvecklingsbinärer och användarlokala Debian-
bibliotek; ingen iPad eller Windows-maskin fanns. **Fysisk iPad Safari och
Windows Edge återstår.** Plattformarnas minnes-/GPU-gränser kan inte härledas
ur Linux-körningarna.

21 varierade syntetiska format-/rotations-/färg-/perspektivfall kompletterar
originalet. Kvoter från 0,12 till 8 varierar oberoende av rotation. Känt motiv
behålls till minst 97,5 % och analysläckage mäts separat. En ensam kant eller
helt jämn bild får ingen säker ruta; konkurrerande rutor förblir osäkra.
Detta är geometriska regressioner, inte ytterligare verkliga fotografier.

[Smalt stående syntetiskt prov](comparisons/format-0.125.jpg) ·
[Kvadratiskt syntetiskt prov](comparisons/format-1.jpg) ·
[Brett syntetiskt prov](comparisons/format-8.jpg)

Övriga riktade tester verifierar ändrad utsida med identisk V2-analys,
manual-/låsbeteende, källhörn över kvart-/finrotation och zoom/pan, ingen
ny avkodning vid presentationsändring, projektrundtur/atomisk avvisning och
preliminärbildens avbrott/ersättning. Full regression och slutlig CI redovisas
i PR:n. Inga profilparametrar, D-formler, demosaicinginställningar eller
exportoptimeringar ändras. Version följer befintlig first-parent-beta-policy.
Ingen merge eller deployment görs.

## Reproduktion

```sh
# Valfritt REPO pekar på exempelvis en separat main-0ac89dc-worktree.
node tools/capture-frame-sources.mjs /raw /tmp/frame-input /path/to/repo --screenshots
node tools/evaluate-frame-detectors.mjs /tmp/frame-input /tmp/frame-comparisons
node tools/render-frame-comparison.mjs /tmp/frame-comparisons/contact.svg /tmp/contact.jpg
node tests/frame-contours.mjs
node tests/frame-analysis-polygon.mjs
node tests/frame-corners-browser.mjs
node tests/import-proof-layout-browser.mjs
# Med installerad Playwright WebKit och dess systembibliotek:
FILMLABB_TEST_WEBKIT=1 node tests/import-proof-layout-browser.mjs
npm run test:full
```

`tools/frame-detector-harness.html` körs via en lokal HTTP-server från repositoryts
rot. Den visar verkligt regressionsprov, gamla/nya gränser, analysmask, alternativa
hypoteser och osäkerhet, kan skapa godtyckliga syntetiska format och låter användaren
klicka fyra referenshörn och spara annotering. Syntetiska prov och browser-JPEG
märks uttryckligen. Inga nya fullupplösta RAW-exporter påstås.
