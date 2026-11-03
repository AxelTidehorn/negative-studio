# V2: teknisk färgrekonstruktion, algoritm 2

Utgångspunkt: main `8d62760` efter #39, #41 och #42. Robust P60/P99,
begränsad positiv färgbalans och integrationen i huvudplattformen finns redan.
Historiska E3-/gray-world-experiment är inte nya standardinställningar.
Denna ändring gäller V2:s provisoriska respons och dess positiva tonplacering.
Standard, Original, Curve, Density och Matrix ändras inte.

## Pixelmodell

Densiteten är fortfarande `D = -log10(max(epsilon, J/B))`, i låst linjär
Rec.2020, utan klippning av transmission över ett. Källa, bas, RAW-recept och
filmbasdetektor är oförändrade. Den gamla affina prioren ger cirka 0,0052
linjärt positivt redan vid D=0; i tunna negativ minskar det separationen från
svart. Samma kanallutning förstärker dessutom de olika densitetskanalernas
färgfel före automatisk positiv färgbalans.

Den nya frysta prioren heter `rec2020-base-zero-prior-2`:

```
q = densityMatrix * D
P_c = 0.18 * expm1(ln(10) * slope_c * q_c)
             / expm1(ln(10) * slope_c * referenceDensity_c)
```

Kanalblandningen sker alltså i effektiv densitet före den icke-linjära
inversen. Det är inte en konstant blågain eller motivbaserad vitbalans.
Responsen motsvarar en enkel invers tåmodell `D ∝ log(1 + E/E0)`:
filmbasen ger svart, referensdensiteten 18 % före eventuell logfärgmatris.
Sluttningen är fortsatt `1/0.65`, referensdensiteten 1. Den befintliga
logfärgmatrisen och offset är identitet respektive noll. De nya koefficienterna
finns centralt i `core.js`; inget bild-ID eller motivval läses av pixelkärnan.

Matrisen är en **empirisk, provisorisk rekonstruktionsprior**, inte en uppmätt
färgämnesmatris. Den har regulariserats mot logkanalkvoter i tre sparade
FILMLABB-A-resultat (04/05/06), utan intercept eller per-bildmatris. A har annan
RAW-domän, egna analyser och redigering: den är en fotografisk referens, inget
kolorimetriskt facit. Materialet kan inte identifiera en universell filmprofil.

`logExpm1` använder stabila grenar nära noll och för höga densiteter. Negativ
rekonstruerad exponering och över-/underflöde begränsas uttryckligen till den
befintliga logpositiva säkerhetsgränsen [-20,20] och markeras `bounded`.
Uppmätt densitet och signalflaggor behålls. En underflödande normaliserings-
konstant avvisas vid kalibreringsvalidering. Ingen brusreducering eller
skärpning införs; ökad separation kan göra befintligt korn synligare.

## Separat positiv tonplacering

Den befintliga P60/P99-formeln, tekniska analysrutan, masken, fallback,
Reinhardkurvan och gamutgränsen återanvänds. Den nya priorens större omfång
kräver annan placering: `robust-p60-highlight-2` använder target 0,8 och
highlightCeiling 16. Den gamla gränsen 3 gjorde köksbilden onödigt mörk med
den nya responsen. P60=0,8 motsvarar linjär 0,444 efter Reinhard; P99=16
motsvarar 0,941 före outputskuldran. Skyddet är fortsatt mjukt och gemensamt.
Detta är fotografiska hypoteser valda på utvecklingsbilderna, inga universella
exponeringskonstanter. Osäker ruta/otillräcklig statistik ger samma uttryckliga
0 EV-fallback. Befintlig `neutral-anchor-bands-1` är oförändrad.

## Versioner och jämförelse

- Nya V2-bilder använder `FILMLABB.V2Recipe.algorithmVersion=2` och
  `CalibrationV2.version=3`. Diagnostikens metodversion är 6 och redovisar
  densitetsmatris, respons, tonrecept och aktivt analysresultat.
- Sparade recept behåller sin kompletta kalibrering och intent. Algoritm 1,
  CalibrationV2 version 2, `rec2020-common-prior-1` och tonrecept 1 ändras inte.
  Basaccept, återanvändning och ångra byter aldrig respons automatiskt.
- Projektformat och äldre motorer behålls. Tidigare appversion avvisar
  algoritm 2 före projektmutation. Applikationsversion/SHA i footern genereras
  av befintligt versionssystem, separat från algoritmversionen.
- Kärnans `V.prior` och implicit `V.compile(...)` förblir historisk referens.
  Plattformen och labbet väljer `V.latestPrior` endast för nya recept.
- För en kontrollerad jämförelse i labbet med samma avkodade källa och bas,
  kör `await NSV2Lab.setCalibration(NSConversionV2.prior)` respektive
  `await NSV2Lab.setCalibration(NSConversionV2.latestPrior)` i konsolen.
  Inga nya synliga kontroller införs. Ett gammalt projekt uppgraderas inte
  genom att bara växla motor. Testa den nya standarden med en ny bildimport.

Preview, worker och export använder samma kärna/skalärimplementation. Editing
2.0 och kreativ geometri ligger efter konverteringen. V2 är fortsatt CPU;
ingen ny GPU-acceleration påstås. Fullupplöst källbuffert kopieras inte av
rekonstruktionen, och export behåller randvis bearbetning.

## Verifiering

Nya tester: `conversion-v2-reconstruction.mjs`, `v2-response-versioning.mjs`
och `v2-response-versioning-browser.mjs`. De kontrollerar densitets-/gain-
invarianter, oberoende expm1-orakel, explicit signalhantering, oförändrad gammal
V2, frysta recept, omanalys vid basbyte, CPU-/worker-/RGB16-paritet, geometri
och blandade projektversioner. Historiska syntetiska bildtest som konstruerar
signaler med den gamla inversen väljer nu uttryckligen den gamla prioren;
deras bildreferenser och toleranser är oförändrade.

Verkliga 6032×4032 RAF återanvänds från tidigare privat material. Samma sparade
manuella regioner mäts om i originalets linjära data. 04/05/06 används för
justering; parametrarna fryses före denna kandidats kontroll av 09/10.
Kontrollbilderna har förekommit i tidigare utvärderingar och är inte ett nytt,
oberoende material. Före/efter, identitetsbalans och sparad A jämförs; full
utvärderingskampanj körs inte om. Bildfiler och original förblir privata.
Både lokal fullsvit (Node 24/Chromium) och ren GitHub Actions-körning
(Node 22, npm ci, Chromium) passerade **99/99 testgrupper** för pixelkoden.
[CI-körning](https://github.com/AxelTidehorn/negative-studio/actions/runs/41699264695).

Alla fem ommätta baser matchade arkivet exakt. Samtliga fem gamla V2-
förebilder är pixelidentiska med de sparade etapp 1-resultaten. Kandidaten
bedömdes mot dessa och sparad FILMLABB A:

| Bild | Observerad förändring | Median Y, gammal → ny |
| --- | --- | --- |
| 04 porträtt | Tydligare ansikte och jacksvärta, mindre blå/grå slöja | 0,162 → 0,364 |
| 05 kök | Mindre elektriskt blått fönster och rimligare hud; blå/lila små högdagerfläckar kvar | 0,096 → 0,263 |
| 06 soffa | Tydligare svärta/tonseparation och mindre blåstick | 0,151 → 0,306 |
| 09 snö, fryst kontroll | Stort blåstick minskar även utan positiv färgbalans; mörkare än A | 0,158 → 0,375 |
| 10 par, fryst kontroll | Vita kläder blir mindre blå och huden mindre kall; viss cyan och mjuk kontrast kvar | 0,170 → 0,387 |

Y är linjär sRGB-luminans av 1000-pixels areaöversikter efter ton/output och
8-bitars kvantisering, med neutrala kreativa reglage. Det är spårbar statistik,
inte ett mått på naturliga färger. Ingen universell likvärdighet med eller
överlägsenhet mot den tidigare FILMLABB-motorn påstås. Korn och detaljer har
jämförts i originalpixelutsnitt utan uppskalning; den ökade separationen kan
göra befintligt korn mer synligt.

Verklig 04-export: JPEG och **3719×3678 RGB16-TIFF**, 588 byte inbäddad
sRGB-profil i TIFF, 0 kodstegs fel i kontrollerade referenspunkter. Den privata
JPEG-kontrollen använder Canvas; huvudplattformens JPEG/ICC-väg verifieras
separat av browser-/exportsviten. Float32-källan är 291852288 byte;
rekonstruktionen skapar ingen extra fullupplöst floatbild. RGB16-randbufferten
för åtta rader är 178512 byte. Detta är buffertstorlekar, inte uppmätt total
minnespeak. RAW-dekodning och fysisk enhetsprestanda ändras inte/påstås inte
vara verifierade.

Det riktade privata bildtestet kan reproduceras med
`node tools/v2-response-validate.mjs PACKAGE ORIGINALS OUTPUT 04,05,06,09,10`.
Katalogerna anger det befintliga testpaketet, RAF-filerna och en privat
utdatakatalog utanför repositoryt. Inga original laddas upp.

Kvar: filmspecifik färgkalibrering, osäkra extremhögdagrar och bredare
fotografisk generalisering. Fysisk iPad Safari och Windows Edge behöver
kontrolleras; headless Chromium ersätter inte dessa. Nattbildsserie saknas.
