# FILMLABB Beta 6 – steg 1: geometri och projekt

Utgångspunkt: main 2773bb9, inklusive mergad PR #16. Den omnämnda förstudien
FILMLABB_1.1_Beta6_Teknisk_forstudie.md finns inte i repositoryt. Modellen nedan
utgår därför från uppdragets krav, inte från en antagen rapport.

## Data och ansvar

Filmrutan är fortsatt `frame.crop` / aktiv `cropRegion`: normaliserade koordinater
i den oförändrade källbilden. Befintlig detektering, kantdragning, låsning,
färgkalibrering och tonanalys använder samma data och kod som tidigare.

Varje bild får ett separat fält:

```js
frame.geometry = {
  version: 1,
  rotation: { quarterTurns: 0, fineDegrees: 0 },
  compositionCrop: null,
  cropExportToFrameOverride: null
};
rollShared.cropExportToFrame = false;
```

`quarterTurns` är heltal 0–3; `fineDegrees` är ett ändligt tal inom ±45 grader.
Kompositionen är `null` eller en positiv normaliserad rektangel `{x,y,w,h}`.
Den lagras utanför färginställningarna. `setCompositionCrop(index, rect)` ändrar
bara denna bilds modell; den anropar inte analys, render eller färgpersistens.

Kompositionskoordinaterna avser den automatiskt giltiga, upprätade arbetsytan,
inte boundingboxens tomma hörn. Hela den giltiga ytan representeras av `null`.
En delrektangel inom denna yta kan därför alltid mappas tillbaka in i källdomänen.
`compositionTransform` kombinerar giltigt utsnitt och frivillig komposition.

Gemensamt beskärningsval: `null` som individuellt undantag betyder ärv köns val;
`true`/`false` bevarar ett individuellt äldre val. Den interna funktionen
`setQueueCropExportToFrame(bool)` gör ett uttryckligt gemensamt val och tar bort
undantagen utan att ändra bildens filmruta, rotation eller komposition. Nya
importerade bilder ärver köns val. Befintlig kryssruta fortsätter att fungera
individuellt; ingen ny köfunktion visas i gränssnittet i detta steg.

## Koordinater och säkert utsnitt

`geometry.js` är ett rent bibliotek utan DOM-, färg- eller GPU-beroenden.
Transformationsfunktionerna tar källdomänens bredd/höjd i pixlar. Punkter är
normaliserade pixelkanter, x åt höger, y nedåt. Pixelcentrum är `(i+0.5)/storlek`.
Positiv vinkel roterar medurs. Rotation sker kring domänens centrum.

`transform` mappar från källdomänen till den roterade axelparallella boundingboxen;
`forward` och `inverse` är varandras inverser. Kvartvarv har exakta 0/±1-matriser.
`compositionTransform` mappar mellan källdomän och den färdiga kompositionsytan.
Flyttalsavrundning hanteras med numeriska toleranser, inte genom pixelavrundning.

För vinkel θ och källdomän W × H är boundingboxen:

```
B_w = |cos θ| W + |sin θ| H
B_h = |sin θ| W + |cos θ| H
```

`autoValidCrop` väljer största **centrerade** rektangel med ett bestämt
sidförhållande a. Standard är källdomänens sidförhållande efter kvartvarvet.
Med höjd h och bredd a·h gäller:

```
h = min(W / (a |cos θ| + |sin θ|),
        H / (a |sin θ| + |cos θ|))
```

Detta är inte ett påstående om största möjliga area vid valfritt sidförhållande.
Alla fyra hörn kontrolleras genom inversmappning med `isValidCrop`. Kompositionen
mappas sedan inom denna giltiga rektangel, så att inga tomma hörn tillkommer.

Vid senare inkoppling måste en gemensam adapter välja källdomän: hela bilden eller
filmrutans befintliga heltalspixelgränser. Analysrektangeln förblir i originalets
koordinater. Biblioteket gör inte detta domänval, ändrar inte filmrutan och
avrundar inte exportstorlekar. Det ersätter ingen produktionsgeometri i steg 1.

## Projekt och atomär geometrivalidering

Nya projekt har format `negative-studio-roll-beta6`, `geometryVersion: 1`,
`cropExportToFrame` på kön samt `geometry` på varje bild. Befintliga metadata,
RAW-val, profiler, kalibreringsdata, exportnamn och filmrutor följer med.
Tidigare stödda `negative-studio-roll-v08` och `negative-studio-roll-beta3`
importeras fortsatt med samma färg-/RAW-migrering som i main.

Äldre `settings.rotation` blir kvartvarv med noll finvinkel. Första bildens äldre
`settings.cropExport` bestämmer köstandard; avvikande bilder får individuella
undantag. Det behåller varje tidigare export, även för blandade val. Vid delvis
matchande projekt får även omatchade köbilder rätt undantag för att deras
befintliga exportval inte ska ändras av den nya köstandarden.

`settings.rotation` och `settings.cropExport` är fortfarande produktionsvägarnas
kompatibilitetsfält. Nya projekt måste vara förenliga med modellens kvartvarv och
effektiva beskärningsval. Finvinkel och komposition är vilande metadata. Vanliga
kvartvarvsändringar uppdaterar modellens kvartvarv och bevarar finvinkeln internt.
Version 1 betyder vilande finrotation: en senare ändring av rendersemantik måste
versionshanteras och migreras uttryckligen, inte antas ha gällt tidigare export.
Main/Beta 5 kan inte läsa det nya formatet; äldre projekt får inte omtolkas som
ett nytt format genom att endast byta formatnamn.

`prepareProject` validerar alla bildposter före tillståndsändringar, även
omatchade filnamn: versioner, ändliga tal, kvartvarv, normaliserade rektanglar,
positiv area och kompatibilitetsfält. Importen förbereder även köbildernas
geometrier innan gemensamma inställningar ändras. Fel lämnar kö, aktiv bild,
färginställningar, kalibrering och exportnamn orörda; endast felstatus/input ändras.
Valideringen garanterar geometriatomik, inte rollback för avkodningsfel efter att
ett giltigt projekt har accepterats. Sådana fel hanteras som tidigare av importen.

## Avgränsning och verifiering

Ingen finrotation, automatisk upprätning, kompositionsbeskärning eller rutnät
aktiveras i UI, preview eller export. Ingen ny resampling, encoder, GPU-kod eller
färgmatematik införs. `NSColorEngine.exportGeometry` och alla exportalgoritmer är
oförändrade. Fem-bildersgränsen kvarstår. Inga nya beroenden.

Nya tester är läsbara i `test/beta6-geometry.mjs`, `test/beta6-project.mjs` och
`test/beta6-browser.mjs`. De körs via befintliga `npm test` respektive
`npm run test:browser`. Testharnessen laddar de nya modulerna i samma ordning som
appen; dess ändring sparas i repositoryts befintliga testpaket.

Nästa steg måste koppla **samma** domänval, inversmappning, interpolering och
pixelkonvention till preview, JPEG-worker, reservexport och TIFF innan finrotation
kan aktiveras. Därefter tillkommer upprätningsalgoritm, UI, tredjedelsrutnät och
bildkvalitets-/prestandavalidering, inklusive fysiska Safari/iPad- och Edge-prov.

## Slutresultat

Verifierad kod: `0fccf88`. Lokal Node 24.19.0; Chromium med SwiftShader.

| Kontroll | Resultat |
| --- | --- |
| npm ci i separat ren checkout | Godkänd, samma låsta beroenden som main |
| npm test | 29/29 grupper godkända, inklusive befintliga kompatibilitetsprov |
| npm run build | Godkänd |
| npm run test:build | Godkänd: rent bygge, komplett cachelista, reproducerbar hash och korrekt invalidering |
| npm run test:browser | 6/6 grupper godkända, inklusive befintliga GPU-, export-, mobil- och cacheprov |
| git status efter test och bygge i ren checkout | Inga ändringar |

Geometriproven täcker 140 kombinationer av bildformat och rotationsparametrar,
ytterligare sidförhållanden och kompositionsinverser. Oberoende pixelmatriser
kontrollerar kvartvarv med/utan filmruta. Native webbläsarprov jämför identiska
TIFF-bytes för åtta kombinationer av kvartvarv/beskärning trots ändrad vilande
finrotation/komposition; JPEG-provet verifierar samma avgränsning. GPU-proven
behåller texturåteranvändning och observerar högst en visningsnivås avvikelse.
Dubbla filnamn behåller tidigare matchning till första köbilden och får inte dela
geometriobjekt. Felaktiga geometriposter ändrar inte projektets övriga tillstånd.

Byggregressionens första underprocessstart nekades med EPERM av den lokala
sandboxen. Omkörning med utökad sandboxbehörighet godkändes; ingen kodändring
behövdes. Fysiska Safari/iPad- och Edge-prov samt externa kamerakorpusar kördes
inte. Main-uppdateringens dokumenterade nedskalningsbegränsning är oförändrad.
