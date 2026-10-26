# Refaktoreringsöversikt

Bas: `main` 9a041ab, inklusive mergade färgförbättringar i #21–#23.
Ingen avsiktlig ändring av funktionalitet, färgmatematik eller bildresultat.

## Genomförda ändringar

- Applikationslogik och CSS har flyttats ur `index.html` till ansvarsfördelade
  `src/`-kataloger. Startordning, byggkällor och testharness delar ett manifest.
  Bygget publicerar samma stabila filnamn och worker-URL:er som tidigare.
- Analysens tre steg körs explicit av en ägare. Tre lager av fångade
  analys-/konfigurationsfunktioner ersätts av namngivna steg och en färgkonfiguration.
- TIFF-skrivaren och synkron exportcanvas har flyttats från analyskontrollern
  till export. Filnamn, nedladdning och ZIP har en gemensam exporthjälpmodul.
- Inställningsstandarder/djupkopiering har en egen ägare. Oanvända parallella
  rullfält och gamla cache-/navigeringsvariabler har tagits bort.
- RAF-miniatyrer/JPEG-reserv undviker extra fullständig filläsning: 100 byte header
  och 4 signaturbyte verifieras, därefter används en oförändrad JPEG-Blob-slice.
- CPU/GPU delar förberedelsen av färgparametrar. Befintliga GLSL-formler,
  tabeller, samplingsordning och kvantisering är kvar.
- Testarkiven `slider-regression-suite.json`/`test-suite.json` och packverktyget
  är ersatta med direkt versionshanterade testkällor och oförändrade fixtures.
  En katalog grupperar sviterna; DOM- och vanliga browserserverhjälpare är samlade.

## Verifierat borttaget

| Kod | Varför |
|---|---|
| Rotfilerna `beta2.js`, `beta3.js`, `beta38.js`, `color-engine.js`, `pixel-kernel.js`, `render-worker.js`, `workspace.js` | Inte laddade av HTML, aktiva workers eller den aktuella testharnessen. Canonical `image-model`/`render-core` och controllers innehåller de algoritmer som stöds. Gamla testsystem som laddade dessa kopior är ersatta av den aktuella svitens motsvarande fall. |
| Äldre inline-preview, RAF-JPEG-navigering, TIFF/JPEG-skrivare och projektimport | Alltid ersatta innan användarhändelser; inga kvarvarande aktiva fångster. |
| Gamla separata profil-/tonutvecklare | Endast anropade av de borttagna föregångarna. Den aktiva kärnans versionerade profiler är kvar. |
| Inaktiv scan-exponeringsstatistik och no-op-wrapper runt `saveCurrentFrame` | Resultaten användes inte av den aktiva kedjan. |
| Testarkiv, gammal harness och packverktyg | Direkt testversionering ersätter extraktionen; inga nya beroenden. |
| Dubbel RAW-fixturekörning i CI | Samma kontroll ingår redan, med fler assertions, i standardens importsvit. |

Äldre releaseanteckningar och den gamla testrapporten har flyttats till
`docs/history/releases/`. De beskriver historiska versioner, inte aktuell arkitektur.

## Medvetet bevarat

Jämförelsemotorn, äldre projektalgoritmer, profilversion 1, referensanalysen för
3.7-projekt och färgexperimentens sparade val är kvar. Ett gammalt filnamn är
inte i sig ett skäl att ta bort en algoritm. Klassiska scriptbindningar och
vissa backend-/geometrihooks behålls för att undvika en samtidig runtimeombyggnad.

JPEG:s reserv-/synkrona ingångar och vendorerad LibRaw behålls. Offlineversionering,
exportavbrott, batchfel, crop-migrering och fem-bildersgränsen bevaras. Ingen generell
nedskalningsfiltrering eller ny brusbehandling har införts.

## Regressionsskydd

Baseline: 35/35 Node-grupper. Ett nytt arkitekturtest jämför 192 konfigurationer
exakt mot färgkärnan vid 9a041ab: motorer, arbetsrymder, profiler, profilversioner,
reglage och A/B-varianter. Det verifierar även start-/workerberoenden, en explicit
analyspassordning, återställning vid fel och isolerade inställningskopior. Ett separat RAF-I/O-test
kontrollerar identiska JPEG-bytes, samma felpolicy och endast 104 lästa
valideringsbyte i stället för full RAF-läsning.

Befintliga numeriska facit har inte ändrats. Två äldre integrationstestassertions
som anropade döda utvecklare har riktats mot aktiva färg-/tonvägar med samma
kontrast-/skuggkrav. Den minimala TIFF-headern som används som importfixture ligger
nu i testhjälpare och ingår inte i produktionsappen.

Slutliga svitresultat och begränsningar redovisas i PR:n. Verkliga fotografier och
fysisk iPad Safari/Edge kräver fortsatt manuell verifiering; syntetiska och
Chromium-baserade tester ersätter inte denna bedömning.
