# Steg 6: vad hindrar ett färdigt V2-fotografi?

Bas: main `1d06fe806b800e9489ff7e3ed878b652825d5697`, inklusive #52–54.
**Ingen produktionskod eller befintlig algoritm ändras.** Tre frysta experiment
har körts på elva tillgängliga RAF och granskats i jämförbara bilder.
Ingen variant har tillräckligt stöd för generell användning.

Störst dokumenterad potential finns i **ljusplaceringen**, men ett nytt
percentilmål räcker inte: samma regel förbättrar snö och försämrar köket.
För kvarstående färgfel är den provisoriska rekonstruktionen och osäkerheten
i neutralreferensen viktigare att validera än en generell mättnadsökning.
Bradford med samma ankare gav ingen övertygande lösning; senare gamutknä gav
mer ljus färg men förstärkte fönstrets lila urval.

## Material, jämförbarhet och begränsningar

Elva unika original finns fortfarande lokalt och deras SHA256 kontrollerades
mot det befintliga manifestet: 00/01/02/03/04/05/06/08/09/10/11. 06/07 är
byteidentiska och räknas en gång. Inga nya negativ har tillkommit. Filmtyp,
ursprunglig filmexponering, neutrala scenreferenser och kolorimetriskt facit
saknas. Materialet innehåller inget verifierat natt-/lågnyckel- eller
kontrollerat tunt/tätt-negativexperiment. Tätare uppmätt densitet är inte
bevis på en viss ursprunglig exponering.

De fem befintliga källcacherna återanvändes. Övriga sex hämtades genom samma
låsta LibRaw/linjära Rec.2020 och manuella basregioner med den befintliga
`v2-response-validate.mjs`, nu med `--cache-only`. Alla sex baser matchar
arkivvärdena exakt. Omräkning av alla elva grider matchar sparad analys inom
**9,99e-16**, inklusive samma mask och statustillstånd. Gränsen 1e-12 i
verktyget tillåter Float64/JIT-avrundning, inte nya recept eller referensvärden.

Diagnostiken använder det befintliga 160×150-källnätet och dess **oförändrade
innehållsmask**. Statistik för hela nätet och behållna prov skiljs åt.
900-pixelsöversikter är identiska källpunktprov för färg/ton, inte fullstor
areaexport och inte underlag för korn/MTF. Nativejämförelser är 512×512
källpixlar utan omskalning. Samma bas, respons, crop och neutral kreativ
redigering används i alla varianter. Endast H1 ändrar exponering.

04/05/09 var utvecklingsfall. Parametrarna frystes före experimentrendering
och ändrades inte efter granskningen. De övriga åtta är kontroller i denna
körning, men samtliga har setts historiskt: **ingen oberoende validering**.
Freeze SHA256: `ed9e8f18222e51bd3fc05edeb46a6efcb54d2bb66b9411526a6148be3ac5faa7`.
Ingen mänsklig fotografacceptans eller kalibrerad displaybedömning har gjorts.

## A. Rekonstruktion: verkliga modellgränser, okänt färgfacit

Kedjan är `J → -log10(J/B) → densityMatrix → expm1-respons → positiv RGB`.
Matrisen är fortfarande en empirisk prior från äldre jämförelser, inte en
uppmätt filmspektral modell. Den kan ge icke-positiv blandad densitet även
när käll-RGB är giltig. Då begränsas responsen till sin nedre positiva gräns.
Detta är en verifierad förlust av differentiering **i modellutdata**, inte
bevis för att alla berörda prov innehåller förlorad sann motivinformation.
Felaktig bas, filmrespons och faktisk svart motivyta kan inte säkert skiljas
åt med dessa okalibrerade fotografier.

| Bild | Behållna prov | Responsbegränsade prov | Andel |
|---|---:|---:|---:|
| 01 buss | 13328 | 2089 | 15,67 % |
| 04 porträtt | 13143 | 606 | 4,61 % |
| 05 kök | 12325 | 260 | 2,11 % |
| 06 soffa | 9883 | 177 | 1,79 % |
| 09 snö | 12516 | 5 | 0,04 % |
| 10 par | 13095 | 0 | 0 % |

Räkningarna avser den heuristiska masken, inte semantisk motivklassning.
Masken utesluter redan ogiltiga/klippta/loggolvsprov: noll sådana flaggor i
de behållna proven är därför inget oberoende bevis på en felfri RAW-källa.
Hela nätets flaggor finns också i mätfilen. Klippning inne i decoder/sensor
är inte exponerad och kan inte uteslutas genom ändpunktsräkning efter decode.

Den lokala relativa responslutningen är
`d log10(Pc) / d qc = slope / (1 - 10^(-slope*qc))` för positiv blandad densitet
`qc`. Den växer nära noll. I 04 är P95 för R/G/B-lutningen cirka
39,39/35,40/14,69; i 09 cirka 2,32/2,26/2,26. Små kanalavvikelser kan alltså
förstärkas olika nära modellens tå. Detta är modellkänslighet, inte uppmätt
sensorbrus eller belägg för en särskild brusalgoritm.

Ingen identitetsmatris- eller ny filmprofil provas igen: tidigare resultat
finns redan i #51. 10 har kvarstående färgproblem trots noll begränsade prov;
golvet förklarar alltså inte hela färgproblemet. Mer korrekt färgrespons
kräver mätta neutral-/färgreferenser, inte en godtycklig ny matris.

## B. Exponering/ton: P60 saknar scenens avsedda ljusnivå

P60 placeras mot 0,8 med mjukt P99-skydd 16. Fotografisk 1/2 delar tonkurva.
Samma relativt jämna positiva fördelning kan representera snö eller en mörk
scen; dess percentiler identifierar inte motivets avsedda ljushet.
09:s högdagerskydd reducerar bara **0,003897 EV**. Mörk snö är därför ingen
stor säkerhetsspärr. P60-valet och tonkurvan ger den nivån.

**H1 `stage6-white-p95-1`:** byt exponeringsankare till P95 med target 3,
återanvänd samma mjuka P99-skydd och numeriska/områdeskontroller. Begränsa
skillnaden till ±1 EV mot baslinjen. Rekonstruktion, färgbalans, ton och
gamut hålls fasta. Det är en explicit vitreferenshypotes, inte motivigenkänning.

| Bild | H1 ΔEV | Median Y Fotografisk 2 → H1 | Visuell bedömning |
|---|---:|---:|---|
| 00 fasad | +1,000 | 0,383 → 0,627 | Onödigt ljus/platt fasad |
| 01 buss | −0,562 | 0,320 → 0,222 | Mörkare buss och skuggor |
| 04 porträtt | +0,609 | 0,345 → 0,496 | Ansiktet mer läsbart; ljus bakgrund mer dominant |
| 05 kök | −0,547 | 0,229 → 0,162 | Försämrat mörkt ansikte; fönstret styr |
| 06 soffa | +0,292 | 0,332 → 0,401 | Något ljusare ansikten; ljusa kläder mer dominanta |
| 09 snö | +1,000 | 0,357 → 0,604 | Tydligt ljusare snö, men mjukare högdagerintryck |
| 10 par | +0,165 | 0,360 → 0,400 | Liten ljushetsvinst, färgproblemet kvar |
| 11 porträtt | +0,953 | 0,387 → 0,621 | Ljusare/plattare rum och ansikte; preferensfråga |

Y avser samma behållna prov i linjär sRGB efter output, inte hela PNG-bildens
median. 02 behåller osäker confidence 0,65 och 0 EV-fallback; alla tre
experimentens bilder är byteidentiska med Foto 2 där. Den är inte ett
verifierat lågnyckelmotiv. 08 får +0,722 EV och ett ljusare grafiskt motiv.

H1 visar störst fotografisk potential men förkastas som generell regel.
Den mörkar ned just det bakbelysta ansikte som ska vara lätt att få rätt.
Att lilaurvalet i 05 minskar med H1 är dessutom påverkat av den fasta
ljushetströskeln när bilden mörkas; det är inte en verifierad färgreparation.

## C. Färgpresentation: ankare, anpassning och gamut

Tonsteget skalar alla kanaler gemensamt. Största ändringen av R/G eller B/G
genom enbart ton är cirka **7,11e-15 EV** på det behållna materialet. Relativ
linjär RGB-kromatik försvinner alltså inte där. Absolut OKLab-kroma kan ändras
när ljusheten ändras; det är inte samma sak som förlorad färgseparation.

Foto 2:s positiva balans bevarar luminans men ändrar kulör. Neutralankaret
är en uppskattning; återkommande färg är inte bevis på grå yta. 08 faller
till historisk bandbalans och 02 till identitet. Ingen ny neutraldetektor görs.

**H2 `stage6-bradford-anchor-1`:** använd samma kvalificerade terminalgain,
men utför anpassningen i Bradford-konkoordinater via Rec.2020/XYZ. Inversen
av de redan begränsade gainsen definierar en partiell källvitpunkt; ingen
starkare korrigering eller nytt ankare införs. Samma pixel-luminans återställs.
Utan terminalankare behålls Foto 2 exakt; 08:s bild är byteidentisk.

H2 ger normalt små skillnader (P95 kulörändring högst cirka 1,42° i prov med
OKLab-kroma över 0,015 både före och efter). 05:s lilaurval går från **118 till 113** i samma
nativefönster: ingen övertygande visuell lösning. 10:s hud/ljusa kläder och
09:s snö får ingen stor förbättring. Negativa anpassade Rec.2020-komponenter
tillkommer, t.ex. 435/13143 prov i 04; samma outputgamut hanterar dem.
Det är ingen dold klippning, men extra gamutbelastning utan tydlig vinst.
Bradford kan inte rätta ett felaktigt ankare eller felaktig teknisk filmrespons.

**H3 `stage6-gamut095-1`:** flytta endast det befintliga luminansbevarande
gamutknäet från 0,8 till 0,95. Det behåller mer kromatik i ljusa färger utan
global saturation. Referensformen med 0,8 testas mot befintligt outputorakel.

Gamut ändrar redan representerbara prov i bland annat 01 (23,01 %),
05 (5,91 %) och 10 (7,88 %), men nästan inga i 09 (0,04 %). Ett generellt
gamutfel förklarar därför inte mörk snö. H3 ökar median relativ kromatik i
övre tekniska luminansbandet från 0,1568 till 0,1783 i 05 (+13,7 %) och från
0,1058 till 0,1165 i 01 (+10,1 %). Gul buss/blå textil kan upplevas rikare;
det bevisar inte mer korrekta färger. Samtidigt ökar fönstrets lilaurval
**118 → 133**. H3 löser varken ljusplacering eller grundläggande färgstick.

Lilaurvalet är linjär sRGB `Y>0,4, R−G>0,015, B−G>0,015` i det gamla
512×512-fönstret. Foto 1 ger 81. Det är ett diagnostiskt urval, inte ett
semantiskt antal felpixlar eller ett värde att optimera blint mot.

## Prioriterat nästa steg

1. **Ljusplacering med referensstöd, inte P95 som universell vitpunkt.**
   H1 visar stor möjlig vinst i 04/06/09 men tydliga motexempel. Nästa
   avgränsade implementation bör prövas mot fotografgodkända högnyckel-,
   normala, bakbelysta och lågnyckelresultat med spårbar exponerings-/vitreferens.
   Utvärdera exponering och högdagerpresentation tillsammans; gör ingen
   generell EV-bias eller semantisk snöregel av denna studie.
2. **För färg: mät referenser innan ny rekonstruktion eller auto-WB.**
   Film-/capturekompatibel rullreferens är en relevant framtida källa till
   stabil färg, men verifierade rull-/filmidentiteter saknas här. Captureljus,
   filmbas och scenens grå-/färgprov har olika ansvar. Enbart filmbas är
   varken färgfacit eller positiv vitpunkt. Bradford-/gamutbyten löser inte
   den identifierade osäkerheten. Ingen fjärde hypotes/rullalgoritm har testats.
3. Behåll Neutral/Foto 1/Foto 2 och avstå från generell mättnadsökning eller
   senare gamutknä tills riktiga neutrala och färgade referenser visar vinst.

Detta är en prioritering av nästa verifierbara arbete, inte en färdig ny
automatmodell. Inget experiment promoveras till appen och ingen ny motor,
filmprofil eller projektrevision införs.

## Reproduktion, resultat och tester

[Tekniska mätningar per bild och steg](measurements/v2-stage6.json).
Fullständiga privata mått finns med bilderna. Bilder stannar i befintlig
privat Drive-struktur, med oförändrad delning:

- [04/05/09: utvecklingsjämförelse](https://drive.google.com/file/d/1GAOAR8iKXuLpF5HrV2OrrHnZqLKwm4Ex/view).
- [00/01/03/06: kontroller](https://drive.google.com/file/d/1947WrX6wj9Ui-mqOcH8MJ5xta5GXI4pP/view).
- [02/08/10/11: kontroller](https://drive.google.com/file/d/1k2QgAGY_R84vQ2OgdNYdBMyUAtdhMiEs/view).
- [Komplett bildpaket med lossless nativejämförelser, individuella översikter, fulla mått och frysta parametrar](https://drive.google.com/file/d/19o0Ihxe7eV2Xh7q7_EhC9AuWpbsQ__h3/view).

```sh
# Privata kataloger utanför Git; de befintliga 399 filerna behövs.
node tools/v2-response-validate.mjs PACKAGE ORIGINALS PRIVATE_CACHE 00,01,02,03,04,05,06,08,09,10,11 --cache-only
node tools/v2-stage6-experiments.mjs PRIVATE_CACHE PRIVATE_OUTPUT --diagnostic-only
node tools/v2-stage6-experiments.mjs PRIVATE_CACHE PRIVATE_OUTPUT
node tests/v2-stage6-models.mjs
npm run test:full
```

Samma `experiment-freeze.json` avvisar ändrade parametrar/produktionsmatematik
i samma utdatakatalog. Dokumentations-/UI-commits med samma produktionskod
tillåts; modellkodens SHA256 redovisas också i nya resultat. Använd en ny
katalog för en uttryckligt versionerad ny studie.
Verktygen finns inte i appmanifestet och skriver inte projekt eller huvudapp.
Det befintliga RAW-verktygets normala valideringsläge behålls.

Riktade tester kontrollerar parameterfrysning, oförändrade historiska recept,
P95:s gränser/fallback, Bradford-vitpunkt/fallback och gamutens gamla orakel,
luminans och intervall. **120 frysta RGB8/RGB16-fall är oförändrade.** Lokal
fullsvit: **109/109 grupper**, 287,95 s, Node 24.22.1/Chromium. Fysisk iPad
Safari/Windows Edge och nya egna negativ är ännu inte verifierade. Ingen
konkurrentkod, full konkurrentanalys eller trikromatisk implementation ingår.
