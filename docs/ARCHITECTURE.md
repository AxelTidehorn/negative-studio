# Aktuell arkitektur

FILMLABB är en statisk webbapp med klassiska scripts och gemensamma sessionsbindningar. `app-manifest.mjs` äger publika filnamn och startordning för byggsteg, HTML och testharness. Servera byggd `site/`. Ingen ny komponent-, motor- eller renderingsarkitektur infördes vid konsolideringen.

## Bildkedja och ägare

| Ägare | Ansvar |
|---|---|
| `app/settings.js`, `engine-controller.js` | Bildstandarder och enda motor-/RAW-väljaren: V2/D eller Standard |
| `import/raw-decoder.js`, `raw-worker.js` | Låst decoderrecept, worker, avbrott, validering och cache för aktiv fil/recept |
| `import/source-controller.js`, `import-lifecycle.js` | RAW/TIFF/browserinläsning, jobbägarskap, status, preliminär RAF-positiv |
| `calibration/frame-detector.js` | Formatoberoende geometriska kandidater och evidens vid två upplösningar |
| `calibration/frame-selection.js`, `frame-controller.js` | Auktoritativ filmruta och användarens bekräftelse/låsning |
| `calibration/source-analysis.js` | Exakt en aktiv motoranalys, från `working` |
| `calibration/color-analysis.js`, `color-calibration.js`, `standard-controller.js` | Standards nödvändiga log-kanalstatistik, beständig respons och gemensamma tonintervall |
| `conversion-v2/platform-controller.js` och `platform.js` | V2-käll-/filmbas-/respons-/intentkontrakt och semantisk analyscache |
| `color/configuration.js`, `render-core.js`, `parameters.js` | Gemensam konfiguration, CPU-kärna, tekniska tabeller och parameterkonstanter |
| `editing/` | Editing 2.0 och en gemensam katalog/operator för samtliga profiler |
| `render/` | GPU-rekonstruktion/presentation, CPU-worker, schemaläggning och histogram |
| `geometry/` | Käll-/rotations-/visningskoordinater och separat kompositionsbeskärning |
| `export/` | Fryst konfiguration/geometri, bounded sampling, codecs, progress, avbrott och batch |
| `app/queue-controller.js`, `project-controller.js` | Köposter respektive aktuellt projektformat |

## Två konverteringsmotorer

`NSProjectSettings.newImageDefaults({v2Compatible})` väljer V2 för kompatibel RAW, annars Standard (`calibrated4`). Basfabriken `imageDefaults()` innehåller gemensamma reglagevärden och Standardvärden; den ersätter inte fabriken för ny bildimport. Endast dessa två motor-ID:n accepteras vid val eller projektinläsning.

V2/D använder oförändrad teknisk densitetsrekonstruktion, filmbasnormalisering, scenanalys och godkänd D-tonmodell. `preparePlatformV2` använder källidentitet, kalibrering, basreferens och analysregion som cachevillkor. Förslag som väntar på bekräftelse ger `unconfirmed` och dokumenterad fallback; det är inte en säker motivanalys. Profiler/redigering kör inte ny teknisk analys eller RAW-avkodning.

Standard behöver både `NSColorAnalysis.analyze` (log-transmissionens kanalpercentiler) och `NSColorCalibration` (kanalrespons samt separat gemensamt luminansintervall). Dessa funktioner har behållits trots historiska versionsnamn. De är funktionella beroenden, inte kvarvarande Original-motorer. Standards aktuella färgvarianter och två högdagermodeller behåller sina formler. V2:s versionerade respons- och återgivningsrecept finns kvar eftersom de ingår i nuvarande V2-kärnans kontrakt; inga separata äldre motorval finns.

Det tidigare analysflödet körde gemensam äldre analys, Original, Standard och Conversion3 även före V2. Nu väljer `source-analysis.js` enbart V2 eller Standard. Ingen konstgjord färgkorrigering eller ändring av matematiken kompenserar för rensningen.

## Filmrutans enda tillstånd

`settings.frame` innehåller:

- `quad` och `analysisQuad`: normaliserade källkoordinater, före visningsrotation.
- `origin`: detector, manual eller full; `status`: pending, automatic eller confirmed; `locked`.
- Källdimensioner och eventuell `detection`: kandidatens ursprungliga evidens, säkerhet och osäkerhetsorsak. Evidens är aldrig användarens godkännande.
- För uttryckligen rektangulära indata kan `rectangle` bevara exakta skalära utsträckningar. Den skapas atomärt med hörnen och valideras mot dem; subtraktion av flyttal får annars ändra ceil/floor vid en pixelgräns. Detta är ett numeriskt geometrikontrakt, inte en separat controllerstyrd ruta.

`frameRegion()` härleder omslutande rektangel ur posten. `NSFrameSelection.area(frame)` härleder teknisk analysbeskrivning. Separata `cropRegion`, `frameSelection`, `frameDetection`, `cropConfirmed`, `cropConfidence`, `cropMethod` och `cropLocked` finns inte längre som parallella sessions-/projektfält.

En osäker men rimlig kandidat visas direkt redigerbar. Utan kandidat används helbild som obekräftad start. Bekräftelse räknar om analys/rendering och stänger verktyget; återbesök återanvänder beslutet utan omdetektering. Dragningar skapar ett obekräftat manuellt tillstånd. Låsta rutor prioriteras. Ingen förvald formatkvot används.

Godkända filmbasreferenser hör till kalibreringsägaren och har explicit käll-/ljus-/sessionskompatibilitet; de är inte motivpixlar. Den befintliga uttryckliga referenspolicyn behålls: att aktivera förslag utan att godkänna dem får inte återaktivera en gammal automatisk bas.

`frame.geometry` på **köposten** (inte `settings.frame`) äger komposition och fin-/kvartvarvsrotation. `rollShared.cropExportToFrame` är köns enda beskär-till-filmruta-val. Gamla individuella `legacyCrop`-planer och duplicerade köfält `crop`, `base`, `levels` har tagits bort. Kvartvarvsinställningen för visningen samordnas med geometrins rotationsplan av `withQuarterTurns`; dess befintliga centrum-/dimensionsrotation är bevarad.

## Buffertar och cache

`working` läser den aktiva högprecisionskällan; `workingPreview` är en begränsad Float32-preview. RAW och TIFF behöver inte längre ytterligare RGBA-kopior `src`/`previewSrc`. `src` finns endast som ursprungliga browseravkodade 8-bitars data för den importtypen. RAF:s ungefärliga positiva JPEG-preview är separat, tillfällig och får aldrig gå till V2/export.

Decoder-cache är begränsad till aktiv fil och recept; bildbyten har sekvensägarskap och felåterställning. CPU-preview har en aktiv och en senaste väntande uppgift. GPU återanvänder teknisk positiv-cache när endast reglage/profil ändras. Källbyte/fel tömmer relevanta resultat och resurser. Tekniska Float64-tabeller för Standard behålls; gamla fullfärgs-LUT- och referensmotorcachevarianter är borttagna.

Detektorn behåller samma kandidater, scoring, tvåskalekontroll och osäkerhet. Optimeringen flyttar konstanter från pixelloopen, sorterar samma luminanslista en gång, tar bort grann-arrayer i komponentvandring och strömmar maskhypoteser. Färgrymdskonverteringen görs fortfarande separat vid varje upplösning: att återanvända LAB efter annan resampling skulle ändra resultaten.

## Export och projekt

Export fryser färgkonfiguration och geometri. Färg behandlas per källpixel före linjär displayinterpolation och kvantisering. Float64-tilecache, stripebudget, workers, tidsyield, avbrott och codecresultat från tidigare optimeringar är bevarade. Ingen fullupplöst mellanbild tillkommer. Den oanvända äldre `makeExportCanvas`-vägen är borttagen; JPEG/PNG använder befintlig worker med bounded reservväg. TIFF/PNG16 delar befintlig Uint16-sampling.

Aktuellt projekt är `filmlabb-roll-4`, geometri version 2, Editing 2.0. Inställningar/referenser sparas, original återimporteras. Alla poster valideras före mutation. Äldre scheman och motor-/redigeringsmigreringar stöds inte. Hela bildrecept skrivs inte längre till device-localStorage; en ny bild ska börja med nya bildstandarder. Utseende, språk, backend och exportformat har egna nuvarande preferensägare.

## Verifiering och dokumentation

Se [konsolideringsrapporten](consolidation/README.md) för borttagna moduler, numeriska referenser, mätningar och begränsningar. [TESTING.md](TESTING.md) beskriver full CI och plattformsprov.

**Utvecklingsregel:** PR:er som ändrar användarbeteende, standardvärden, arkitektur eller funktioner uppdaterar relevant dokumentation i samma PR. Dokumentationsstatus ingår i granskningen. Regeln kräver inte dokumentationsändringar för varje trivial intern justering.
