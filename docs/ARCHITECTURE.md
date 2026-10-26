# Aktuell arkitektur

FILMLABB är en statisk webbapp. `npm ci`, `npm test` och `npm run build` räcker
för Node-verifiering och en publicerbar `site/`. Servera `site/`, inte källroten.
`build-root.mjs` är den gemensamma byggingången även för GitHub Pages.

## Källor och start

`app-manifest.mjs` anger **en** mappning från publika filnamn till källfiler samt
klassiska scripts i faktisk startordning. HTML, byggsteg och DOM-testharness
kontrolleras mot samma katalog. Inga moduler laddas beroende på sitt betanamn.
Publika filnamn behålls för workers och versionssammanhållen offline-cache.

| Katalog | Ansvar |
|---|---|
| `src/app/` | Inställningsstandarder, session/UI-start, kö, projekt och källarbetsflöde |
| `src/import/` | Filpolicy, LibRaw-adapter, TIFF/ICC och avkodade källor |
| `src/image/` | Normaliserade pixelåtkomster och flat-field |
| `src/calibration/` | Filmruta, gemensam analys, jämförelse-/standardrespons, pipetter |
| `src/color/` | Färgkonfiguration, cache, delade parametrar och CPU-färgkärna |
| `src/editing/` | Versionshanterade kreativa profiler, profil- och kopieinställningar |
| `src/render/` | Begränsad CPU-worker, scheduler, GPU-backend och cachad presentation |
| `src/geometry/` | Transformationer, komposition och geometrikontroller |
| `src/export/` | TIFF, JPEG-worker/reserv, exportplan, sampling, batch/ZIP och filnamn |
| `src/ui/`, `src/platform/` | Layout, språk, CSS och service worker |
| `tests/`, `tools/` | Direkt läsbara tester/fixtures respektive manuella utvecklingsverktyg |

`index.html` innehåller dokumentet och explicit scriptordning. CSS och
applikationslogik ligger i källfiler. Klassiska scripts delar ännu vissa
sessionsbindningar; detta är inte ett nytt ES-modul- eller komponentramverk.

## Den faktiska bildkedjan

**Import → filmruteanalys → negativkonvertering → kreativ redigering → presentation → export**

1. Import ger `working`: dimensioner, RGB-data, kanaler, skala, kodning,
   normalisering/arbetsrymd och eventuell flat-field. Endast aktiv källa avkodas.
   `workingPreview` är en begränsad visningskälla, inte auktoritet för ny analys.
2. `source-analysis.js` äger `analyzeLevels` och kör namngivna steg i ordning:
   `analyzeSharedLevels`, `analyzeComparisonLevels`, `analyzeStandardLevels`.
   Standard och nya konverteringsmotorer med `analysisSampling: 'source'` samplar originalet. Äldre
   projekt behåller sin analysdomän. Preview-bindningen återställs även vid fel.
3. `color/configuration.js` bygger en färgkonfiguration och äger den tekniska
   tabellcachen. Den läser sparad respons, filmbas, ljuskälla, tonintervall och
   bildreglage. Den skapar inte en ny analys vid en normal reglageändring.
4. `NSPixelKernel` i `render-core.js` utför teknisk konvertering och därefter
   befintlig ton-/profilbehandling. Dessa är logiskt skilda steg i samma
   pixelanrop, utan extra fullstora mellanbilder. Kreativa profiler eller reglage
   matar inte tillbaka till filmbas-/responsanalysen.
5. Geometri och kompositionsbeskärning ändrar presentationsmodellen, inte
   analysområdet eller kalibreringen. Preview återanvänder sin färgcache.
6. Export fryser konfiguration och geometri. `NSPresentation` mappar utpixlar
   till originalet, konverterar källgrannarna och interpolerar färdiga färgvärden
   i linjärt visningsljus. Äldre kvartvarv använder den exakta direkta vägen.

Färgkärnan innehåller Standard (`calibrated4`), Original (`log39`), Curve (`curve3`),
Density (`density3`), Matrix (`matrix3`) och nödvändiga äldre projektalgoritmer.
`conversion3.js` äger de tre nya modellernas matematik/GLSL och validering;
`conversion3-controller.js` förbereder och cachar små modeller efter befintliga
analyssteg, med egna referenser från Original och utan Standard-responsdata. De mergade färgexperimenten och deras
A/B-val behåller samma beteende. Refaktoreringen ändrar inga färgformler.
`settings.editVersion` väljer Original (1, även saknat värde) eller
Redigering 2.0 (2, standard för nya bilder), oberoende av konverteringsmotorn. `editing-engine.js` fryser
originalets positiva bas med neutrala redigeringsreglage och applicerar en gemensam
monoton luminanskurva, OKLab-mättnad och mjuk gamutbegränsning. Neutral 2.0 returnerar
basen exakt. CPU/workers och samma GPU-pass använder delade kurvkoefficienter och
matriser. Inga ytterligare fullstora bildbuffertar eller GPU-pass tillkommer.
Den gamla redigeringsväljaren är dold; tidigare projekt behåller sin version.
Se [redigering](EDITING2.md) och [konverteringsexperiment](CONVERSION_3_EXPERIMENT.md).

## CPU, GPU och resurser

`color/parameters.js` delar exponering, vitbalansvinster, gamma, mättnad och
svart-/vitpunktsparametrar mellan CPU-kärnan och GPU-uniformerna. GLSL-formlerna
är fortfarande explicit motsvarande CPU-formler; inga nya shaderpass införs.
Preview-/export-workers laddar samma parameter- och färgmoduler.

Scheduler behåller liten interaktiv preview, senaste väntande jobb och separat
detaljrendering. GPU återanvänder källtexturen; presentation använder en separat
begränsad färgcache. Context loss har CPU-reserv och återställning. Färg-
reglage och geometri startar inte ny analys eller ny RAW-avkodning.

Identiska färdiga CPU-förfrågningar återanvänder `lastPreview38` och målar om
presentationen utan ny färgberäkning. Källversion, visningsläge, begärd storlek
och färgkonfiguration ingår i nyckeln. Vid bildbyte frigörs föregående GPU-källa
och presentationscache även om nästa import misslyckas; shaderprogrammet behålls.
Aktiva JPEG-vägar återanvänder strimlans ImageData inom samma exportförsök.
Se [underhåll och mätningar](MAINTENANCE.md) för verifiering och begränsningar.

RAF-miniatyrer/JPEG-reserv läser nu bara RAF-header och JPEG-signaturer och
returnerar en Blob-slice; hela RAF-filen kopieras inte en extra gång. JPEG-bytes
och felvillkor är oförändrade och verifierade mot buffertingången.

Kön har högst fem bilder och lagrar filer, inställningar, geometri och små
miniatyrer. Inaktiva bilder får inga fulla avkodade färgbuffertar. Export använder
befintliga stripes/bytebudgetar och ger plats för progress och avbrytning.
TIFF har en skrivarägare. JPEG-worker, huvudtrådsreserv och äldre synkron canvas-
ingång delar färg-/presentationssampling; de bevaras med sina befintliga gränser.
Inga nya bildbuffertar, GPU-texturer eller optimeringssystem har lagts till.

## Tillstånd och projekt

| Omfattning | Data och ägare |
|---|---|
| Global enhetsinställning | Språk, tema, layout, preview-backend och exportnamn i respektive UI-/exportmodul |
| Rullgemensam | `rollShared`: profil/version, profilstyrka, kopiestil och `cropExportToFrame`; delade respons-/ljus-/flat-fieldreferenser har egna validerade poster |
| Bildspecifik | `frame.settings` med färg/RAW-val och sparad respons, `frame.crop` som analysruta, `frame.geometry` som presentation |
| Aktiv session | `state`, aktivt index, `working`, preview och backend-/exportjobb; dessa bildbuffertar serialiseras inte |

`NSProjectSettings` äger standardvärden och djupkopiering. `saveCurrentFrame`
förankrar aktiva inställningar i kön. Geometry-adaptern bevarar äldre individuella
exportbeskärningar utan att göra kreativ beskärning till analysområde.

Projektkontrollern validerar all geometri före mutation. Tidigare stödda format,
RAW-/profilversioner och kalibreringar behålls. Äldre `base`/`levels`-fält och
versionsidentifierare som `response4`, `log39`, `beta4` samt lagringsnycklar är
kompatibilitetsdata och byter inte namn vid kosmetisk städning.

Projekt med nya konverteringsmotorer sparas som `negative-studio-roll-conversion3`
med separat konverteringsschema/version 1. Alla motor-/versionsfält kontrolleras
före mutation. Tidigare appbyggen avvisar den nya taggen.

Projekt med enbart tidigare konverteringsmotorer och 2.0-bilder sparas som `negative-studio-roll-beta6-edit2`; äldre appbyggen
avvisar filtaggen. Projektkontrollern normaliserar den till den oförändrade
geometrimodellen och validerar alla redigeringsversioner före mutation. Original-
projekt behåller sin tidigare filtagg och sitt utseende. Versionsvalet är bildspecifikt.

## Utveckling och verifiering

`tests/suites.mjs` grupperar Node-tester efter ansvar och listar browserfallen.
`tests/helpers/app-harness.mjs` följer produktionsordningen för data/CPU-lagret;
GPU, UI-backends och exportkontrollerns användarflöden testas i riktiga browsers.
`tests/helpers/source.mjs` resolverar publika namn till redigerbara källor.
Historiska färgkärnor i fixtures är oberoende facit och distribueras inte i appen.

- `npm run test:fast`, `test:integration`, `test:full`: riktad numerik, integration respektive komplett regression; se [testinfrastruktur](TESTING.md).
- `npm test`: samtliga Node-grupper sekventiellt; `npm test -- --group color` avgränsar arbete.
- `npm run test:browser`: verifierar byggets innehåll och kör isolerade Playwright-fall med en gemensam Chromium-process.
- `npm run test:build`: ren output, full precache, reproducerbar hash och invalidation.
- `tests/check-real-*.mjs` och relaterade explicita kontroller kräver externa foton;
  dessa ingår inte i automatiska syntetiska tester.

Integrera nya källor i manifestet och bibehåll workerberoenden. Lägg konvertering
under färg/kalibrering och kreativ behandling under editing; låt konfigurationen
vara gränsen. Ändra inte gamla facit för att dölja en regression. Nya UI-funktioner
ska använda befintliga ägare för kö/projekt, analys, rendering och export.

Gränssnittets paneler, semantiska teman och dynamiska språk-API beskrivs i
[UI/UX 2.0](UI_UX_2.md). Dessa enhetsinställningar ingår inte i bild- eller projektdata.
