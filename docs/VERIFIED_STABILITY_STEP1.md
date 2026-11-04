# Verifierade fel och teknisk stabilitet, steg 1

Utgångspunkt: `main` vid `58c70d6f51eddcc9e741d01fc14630750c39f909`.
Ingen ändring av V2:s respons, densitetsmatris, färgbalans, tonkurva eller
algoritmversion. Inga ändringar av äldre motorers pixelberäkningar.

## Filmbas 2 och V2

**Bekräftat fel:** V2:s automatiska bascache tog hänsyn till källobjekt och
filmruta, men inte till om automatisk användning fortfarande var tillåten.

Reproduktion i huvudplattformen:

1. Importera ett negativ med mätbar filmkant i verifierad linjär Rec.2020.
2. Välj V2 utan aktiverad Filmbas 2. Den äldre kantmätningen får användas
   automatiskt och märks `automatic-platform`.
3. Välj **Aktivera Filmbas 2**. Den befintliga detektorn skapar ett förslag,
   men användaren har ännu inte godkänt det.
4. På ursprunglig main fortsätter V2 använda den tidigare automatbasen även
   vid nya `configuration38()`-anrop. `CE.findBase()` returnerar samtidigt
   `null`, precis som Filmbas 2 avser. Cacheträffen kringgår alltså spärren.

Korrigering: V2 läser automatcachen endast när Filmbas 2 är inaktiv.
Aktivering via automatisk sökning och ersättning av en förhandsvisad kandidat uppdaterar omedelbart
V2:s analys/rendering. En ny sökning utan ändrad aktiv referens kräver ingen
sådan uppdatering. Befintlig Filmbas 2-detektor, förslag, acceptans och
kompatibilitetskontroll återanvänds; ingen ny detektor införs.

**Avfärdad misstanke:** `CE.findBase() === null` betyder inte att en giltig,
godkänd bas tappas. V2 använder kompatibel godkänd bild-/rullreferens före
automatvägen. Utan godkännande används märkt `origin: prior`,
`status: uncalibrated`, RGB `[1,1,1]`. Ett nytt förslag får användas vid
uttrycklig förhandsvisning, men lagras inte som godkänt förrän användaren
godkänner. Inkompatibel källa/session pausar referensen avsiktligt.

### Bildpåverkan

Korrigeringen ändrar V2-bilden **i intervallet efter aktivering av Filmbas 2
och före godkännande**, om en gammal automatbas annars skulle ha använts.
Det är en korrigerad referenspolicy, inte ny färgmatematik. Även återlästa
recept med denna felaktiga kombination omfattas av samma policy.

Reproducerbar RGB16-fixtur, ordinarie import/worker-preview, neutral redigering.
Tabellen visar ett positivt sRGB-prov från linjär källsignal `[0.2,0.1,0.05]`:

| Tillstånd | Aktiv linjär filmbas | Positiv sRGB |
|---|---|---|
| Ursprunglig main efter aktivering: felaktig cache | `[0.80000001,0.50000763,0.25000381]` | `[0.83611898,0.85005510,0.63509486]` |
| Korrigerad, ännu inte godkänd | `[1,1,1]`, antagen | `[0.63253483,0.87296639,0.80331906]` |
| Korrigerad, samma uppmätta bas godkänd | `[0.80000001,0.50000763,0.25000381]` | Exakt samma prov som första raden |

Godkänd bas och oförändrat recept ger oförändrade bildvärden.
Ingen fotografisk kvalitetsförbättring påstås.

## Tillstånd, analys och bildrecept

Utöver cachefelet ovan har ingen felaktig V2-respons eller främmande bilds
recept reproducerats i de kontrollerade flödena. Riktade tester verifierar:

- Upprepade `configuration38()`/analysanrop med samma värden bevarar intent
  och V2:s analysräknare. Kreativ redigering, rotation och motorbyte inom
  samma källdomän kräver ingen ny V2-analys.
- Basförhandsvisning/avbryt, automatisk acceptans, manuellt basbyte och ångra.
  Basbyte ändrar intent men behåller teknisk respons; ångra återställer
  basvärden och exponering.
- Render-/exportsnapshots behåller sina värden efter senare ändringar.
- Kompatibel låst rullreferens, inkompatibel session, separat källa/intent
  per bild och exakt recept efter bildbyte/projektåterläsning.
- Faktisk CPU-worker-preview motsvarar det aktuella receptets pixlar.

Befintliga tester för misslyckad RAW-omavkodning, historiska V2-projekt,
blandad bildkö, export och avbrott behålls. `chooseFrame` och dess
omslutningar har inte skrivits om.

## RGB16 TIFF

**Bekräftat fel:** tagg 339 (`SampleFormat`) hade typ SHORT, count 1 och
värde 1 för en bild med `SamplesPerPixel = 3`. TIFF 6.0, avsnitt 19,
specificerar ett värde per sample. Vissa läsare accepterar den äldre formen,
vilket förklarar varför befintliga roundtrip-tester inte upptäckte felet.

Headern skriver nu tre SHORT-värden `[1,1,1]` i en separat sexbytesarray.
ICC- och strip-offset flyttas sex byte; RGB16-payload och sRGB-profil är
oförändrade. Den gemensamma headern används av huvudappen och V2-labbet.
Det valfria full-RAF-testet läser strip-offset ur headern i stället för att
anta en bestämd ICC-position.

Verifierat med separat IFD-läsning, synkron/asynkron TIFF-import samt verklig
`exportTiff()` för Original, Standard, Curve, Density, Matrix och V2.
Samtliga sex exporter hade byteidentiska avkodade uint16-pixlar före/efter.
Pillow 13.0.0 öppnade filerna och verifierade dimensioner, SampleFormat och
588-byte ICC; libtiff 4.7.0 avkodade varje uint16-sample exakt. Dessa externa
läsarkontroller kördes lokalt och är inte nya CI-beroenden.

## Publiceringsspärr

**Bekräftat fel:** Pages körde `npm test` (snabbsviten), medan den
oberoende Build-workflowen körde `npm run test:full`. Pages kunde därför
publicera innan den fullständiga sviten passerat, även om Build senare föll.

Pages förbereder nu Chromium på samma sätt som Build och kör hela
`npm run test:full` i samma jobb och checkout som ska publiceras. Ett fel
stoppar senare build-/upload-/deploy-steg genom GitHub Actions vanliga
success-villkor. Därefter behålls befintlig build, kontroll av aktuell main,
serialiserad publicering, versionsgenerering och offline-cache.
Ingen cross-workflow-matchning eller ny releaseprocess införs.

Build-workflowen ändras inte. Den isolerade preview-workflowens mall är
spärrad till preview-repositoryt och kan inte publicera från detta repository;
den separata miljön ändras inte här. PR-grenen publicerar inte produktion.

## Verifiering och begränsningar

De nya regressionstesterna för baspolicyn (Node och vanlig webbläsarimport),
TIFF-taggen och publiceringsspärren har körts mot den oförändrade
utgångsversionen i en separat worktree: samtliga reproducerade respektive fel.
De passerar med korrigeringarna.

Lokal fullständig verifiering: `npm run test:full`, **104/104 testgrupper**,
275,96 sekunder på Node 24.22.1. Detta inkluderar befintliga numeriska
referenser, bygg-/cache-/versionstester, alla webbläsarsviter och nya
regressioner. Det utökade provet för ny sökning under aktiv basförhandsvisning
kördes även separat efter fullkörningen. `npm run build` och `git diff --check`
passerade. GitHub Actions kör samma fullsvit på Node 22 vid PR-verifiering.

Automatiserad webbläsarkontroll använder Linux Chromium. Fysisk iPad Safari,
Windows Edge och externa fotografiska TIFF-program har inte testats här.
Ingen ny fotografisk RAF-utvärdering eller produktionsdeployment genomförs
för detta tekniska uppdrag. En misslyckad Pages-körning har inte provocerats
fram i produktion; spärrens ordning/villkor kontrolleras i regressionstest.
