> **Arkivrapport.** Beskriver den angivna historiska implementationen. Motorval, projektmigreringar, labb och kommandon kan ha tagits bort. Aktuell produkt: [README](../README.md), [arkitektur](ARCHITECTURE.md) och [konsolidering](consolidation/README.md).

# Technical Cleanup & Bugfix, omgång 2

Bas: senaste main `4ed520b`, inklusive mergad V2-integration (#41).
Tidigare refaktorering (#24), underhåll (#25) och UI-fixar (#30–#34) granskades
innan ändringarna valdes. Detta är en avgränsad korrigering av ägarskap,
felrapportering och kontrolltillstånd, utan ny arkitektur eller nya beroenden.

## Nio konkreta förbättringar

| Problem som verifierades | Korrigering och regressionsskydd |
| --- | --- |
| En äldre projektläsning kunde skriva över ett nyare projekt, en ersatt bildkö eller inställningar under inläsning/export. Gamla läsfel kunde också skriva över aktuell status. | Projektägaren kontrollerar request-ID, köidentitet och busy-tillstånd före mutation. Endast aktuell läsning får tömma filväljaren eller visa status. Avbruten filväljare är en no-op. Bildimportens uttryckliga resultat bevarar verkliga importfel efter projektåterställning. `cleanup-project.mjs` reproducerar nio fel på basen och täcker tio fall efter korrigeringen. |
| Parallella ljuskällereferenser kunde avslutas i fel ordning; en rensad referens kunde återuppstå. | Senaste request äger resultat och filväljare. Rensning invaliderar väntande jobb; föråldrade fel ignoreras och export förhindrar sen mutation. Explicit rensning frigör filväljaren så samma fil kan väljas igen. `cleanup-source-browser.mjs` pausar och återupptar verkliga controllergränser. |
| Status kunde säga att ljusreferensen var aktiv trots att dess källdomän var inkompatibel och beräkningen använde identitetsvinster. | Gains och båda statusägarna använder samma befintliga kompatibilitetspredikat. Historiska domänundantag och numeriska vinster ändras inte. |
| RAW-/TIFF-import skapade en Canvas och en 2D-context enbart för att allokera ImageData. | Direkt ImageData-allokering tar bort en temporär canvas per import. Samma dimensioner, källsampling och RGBA-byte verifieras; ingen generell hastighets- eller minnespeakvinst påstås. |
| Misslyckad återställning efter TIFF/JPEG-batch kunde rapporteras som framgång. En kastande JPEG-återställning kunde ge en ohanterad rejection. | Gemensam kontroll verifierar aktiv bild och tillgänglig källa efter återställning. Resultatet skiljer exporterade filer från återställningsfel, och batchlåsen frigörs. `stability-export.mjs` täcker både resolved/null och kastade fel, med bevarade exporter/räknare. |
| V2 beskrevs som ”Äldre projekt” i det vanliga motorvalets förklaring. | Korrekt V2-förklaring på alla fem språk; experimentmärkningen behålls. |
| Kvartsvarvsknapparna var aktiva utan en tillgänglig bild. | Samma befintliga busy-/tomkontroll används för samtliga rotationskontroller. |
| Histogrammet behöll föregående bild efter tömd kö eller misslyckad import. | Tom källa ger tomt histogram och lokaliserat ”Ingen bild”. Temabyte återupplivar inte gamla staplar. En blockerad kö-rensning bevarar däremot den aktiva bilden. |
| Två interna tillståndsfält saknade användare. | `referenceAvailable` och det aldrig fyllda `frame.preview` tas bort, tillsammans med den felaktiga kommentaren om att RAW inte avkodas vid bildval. Referensvinster, projektfält och faktisk aktiv källdata behålls. |

V2-/rotations-/histogramfallen finns i `cleanup-ui-browser.mjs`. Testet kör
verklig syntetisk DNG-import och V2 i Chromium, fem språk och desktop-/iPad-/
mobilstorlekar (1440×900, 820×1180 och 390×844), med kontroll av dokumentets
footer och avsaknad av horisontellt överflöde. Detta är inte fysisk iPad Safari
eller Windows Edge.

## Kontrollerad städning

Manifest, workers, projektserialisering, dynamiska bindningar och tester
kontrollerades före borttagning. `referenceAvailable` hade bara en deklaration
och två skrivningar. `frame.preview` saknade både producent och konsument;
testet som verifierar avsaknad av avkodade köbuffertar fungerar även utan fältet.

`referenceGains`, `makeExportCanvas`, `makeSafeJpegExportCanvas` och de äldre
exportingångarna behålls: de har kompatibilitets-/harness-/referensanvändare.
En misstänkt CPU-worker-läcka vid rensning visade sig redan vara åtgärdad i
ett aktivt tidigare hooklager; ingen ny duplicerad rensning infördes.

## Verifiering

Felen reproducerades innan korrigeringarna, inklusive styrd ordning på
asynkrona avslut. De nya testerna är registrerade i den vanliga fullsviten.

```sh
npm ci --no-audit --no-fund
node tests/cleanup-project.mjs
node tests/stability-export.mjs
npm run build
node tests/cleanup-source-browser.mjs
node tests/cleanup-ui-browser.mjs
npm run test:integration
npm run test:full
```

Integrationsnivån passerade 6/6 grupper. Riktade tester för historiska
projektscheman, 192 frysta färgkonfigurationer, RAW-kedjan, källanalys,
V2:s källdomäner, i18n och det tidigare underhållet passerade. Fullsviten
omfattar nu 96 grupper (62 Node, ett build-/cachetest och 33 browsergrupper).
Slutresultat och CI-länk redovisas i PR-beskrivningen; maskinrapporten skrivs
till den ignorerade `.cache/test-full.json`.

Färgkärnor, V2-algoritmer, shaders, RAW-decoderrecept, bildmodell,
geometrimatematik, exportsampling och ICC-/TIFF-skrivare är oförändrade jämfört
med basen. Inga numeriska facit eller pixeltoleranser har ändrats. Oförändrade
pixelresultat kontrolleras med de befintliga regressionerna; ingen ny
fotografisk bildkvalitetsförbättring påstås.

## Prioriterade separata uppföljningar

1. Fysisk iPad Safari/Windows Edge: stora RAW, minnestryck och avbrott under import/export. Automatiska viewporttester ersätter inte detta.
2. Verifiera flerfingerspanorering och pointer-ägarskap separat. Den äldre panoreringshanteraren saknar pointer-ID-kontroll; inget verifierat touchfel påstås här.
3. Konsolidera navigeringens kvarvarande hooklager i ett separat uppdrag med samma regressioner. De dynamiska fångsterna har aktiva användare och ska inte avvecklas genom statisk sökning ensam.
