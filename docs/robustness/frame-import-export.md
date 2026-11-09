# Filmruta, import och export – verifieringsrapport

Bas: main 3a672b0, med mergade #93 och #94. Ingen profildefinition,
LibRaw-demosaicing eller matematisk V2/D-färg-/tonmodell ändras.

## A. Filmruta och analys

`CE.detectFrame` är i appen alias till `NSColorAnalysis.detect`, inte bara den
äldre projektionen i image-model.js. Ingång är den linjära arbetsförhandsvisningen
(högst 1400 px; V2 behåller Rec.2020). Tidigare gjordes ytterligare nedskalning
till 240 px. Två ljusa orange filmbasband måste hittas per axel. Den andra axeln
kunde ärvas från en osäker projektion, men resultatet fick konfidens .68, över
V2:s .67-gräns för tillåten automatisk analys. Bandgräns och mörk separator
identifierades inte separat; tunna remsor och lutning saknade eget stöd.

Den nya detektorn söker fyra oberoende innergränser på en högst 480 px bild.
41 tvärgående spår per sida, robust linjeanpassning och minst 29 överensstämmande
spår avvisar lokala ljusa föremål. Den yttre första filmbasremsan och en tunn
mörk separator skiljs från motivet. Säkerhetsmarginalen är en provpixel plus
observerad passningsosäkerhet, inte en fast beskärningsprocent. Lutande gränser
ger en inskriven axelparallell rektangel; exportrotation ändras aldrig.
Alla fyra kanter krävs för hög konfidens (.82, en heuristik, inte uppmätt
sannolikhet). Partiella/osäkra gränser ligger under V2:s befintliga .67-gräns.
Utan evidens används ingen generell procentbeskärning. Äldre projektion kan
fortfarande ge en osäker vägledning i resultatets proposal-fält när orange
filmbas saknas. Delvis identifierade/osäkra rutor används inte automatiskt som
film-/kompositionsruta: hela bilden behålls tills gränserna är betrodda eller
användaren väljer manuellt. Därmed kan en ensam falsk intern kant inte klippa
bort motiv genom kompositionsverktygets förval.

Appens `cropRegion` är filmrutan för analys, medan kompositionsbeskärningen
ligger separat i bildens geometri. `v2Area()` lämnar filmrutan till V2:s
RenderIntent. Källankrat provgaller (högst 24 000) begränsas till rektangeln;
masken tar därutöver bort ogiltiga/loggolvsprov och kantanslutna bas-/hållar-/
clear-regioner. En innesluten eller okänd filmbas är därför inte garanterat
bortmaskerad. Kvarvarande prov påverkar exponeringspercentiler, D-tonplacering,
luminansknutar och neutrala färgankare. Bas utan accepterad mätning kan dessutom
skattas utanför filmrutan via `findBase`; dess cache nycklas på region. En
accepterad Filmbas 2-mätning ersätts däremot inte av automatisk regionändring.

Manuell filmruteändring anropar `cropChanged → analyzeLevels → preparePlatformV2`.
Analysnyckeln innehåller regionen: ny analys skapas, medan kalibreringens och
V2/D:s matematik behålls. Låsta/manuellt sparade rutor skrivs inte över vid import.
En ny osäker inre procentregion införs inte: den skulle kunna utesluta riktiga
motivdelar utan evidens. V2:s befintliga osäkerhetsläge ger identitetsbalans och
0-EV-fallback tills användaren bekräftar området. Synlig komposition ändras inte.

`tests/frame-boundaries.mjs`: syntetiska tunna/asymmetriska kanter, hållare,
separator, måttlig ljusgradient och roterade negativ. Samma motiv med ändrad
utsida och samma bas/prior ger exakt samma V2-exponering, färgbalans och mask. En avsiktligt felaktig
övre remsa ändrar tonplaceringen cirka 0,18 EV. Det är ett mätresultat på denna
syntetiska bild, inte en uppmätt reproduktion av användarens cyan-/blåstick.
Manuell ändring och lås provas genom appens verkliga controllerfunktioner.

Användarens konkreta originalbild med den övre filmremsan saknas. Den måste
verifieras senare; inga syntetiska prover anges som verkliga negativ. Nästan
ogenomskinlig bas, motiv som liknar klar film, kraftig lutning/perspektiv och
mycket stora marginaler kan ge osäker detektion. Bekräftelse/manuellt val behövs
då fortfarande. Inget generellt löfte om semantisk motivdetektion görs.

## B. Importåterhämtning och bildägande

#93 skyddar redan sena decoderresultat med sekvens-ID och current-kontroller.
Det görs inte om. Däremot kvarstod två fel: misslyckad `chooseFrame` behöll
activeFrame trots working=null, och `saveCurrentFrame` skrev global bas/nivåer
även utan en färdig bild. Samma bild kunde därför inte väljas igen, och ett
senare sparanrop kunde skriva föregående/halvfärdig analys till fel köpost.

Vid fel återställs nu köpostens ursprungliga bildspecifika fält transaktionellt,
valt bildindex behålls för RAW-återladdning, arbetsbuffertar/analys rensas och tomt bildläge kan inte
sparas. Gemensamma köval och markeringsstatus behålls. Samma bild kan väljas
på nytt; oförändrad bild väljs bara bort om en verklig arbetsbild finns.
`import-recovery.mjs` injicerar fel efter en avsiktlig partiell skrivning och
jämför nästa lyckade analys exakt mot ett separat rent importförlopp.
Browserregressionen klickar samma köbild efter fel och kontrollerar att sena
ersatta/avbrutna jobb fortfarande inte kan påverka nästa bild.

## C. Sammansatt exportsampling

Fryst före-operator finns endast i testfixturen
`presentation-sampler-before-optimization.js`. `benchmark-presentation.mjs`
kör samma bild/config/geometri mot båda och kräver identisk SHA256 över samtliga
RGB16-pixlar. Första avgränsade ändringen tar bort grannlistor, underarrayer och
sum.map per utpixel; beräkningsordningen behålls. 576 geometri-/datatyp-/flat-field-
fall matchar dessutom ett separat skalärt facit.

Node v24.22.1, syntetisk 320×240, Gold P100, tre körningar per fall: direkt
median 1153 ms före / 1142 efter; finrotation 4115 / 3840 ms. Sammansatt kvart+
finrotation 1723 / 1810 ms. Spridning och råa tider sparas i mätfilerna. Enbart
allokeringsändringen ger alltså ingen konsekvent stor vinst. I denna mätning
kostar finrotation cirka 3,6 gånger direktvägen, inte ett generellt sexgångslöfte.
Det motiverar att utvärdera återanvändning av de upp till fyra återkommande
färg-/tonberäkningarna per utpixel.

En jobblokal lat tilecache lagrar nu färdig färgtransform och sRGB-avkodning
före interpolation i Float64. Samma grannordning, multiplikation/addition,
transferfunktion och kvantisering används. Inga Float32-mellanvärden införs.
16×16-tiles skapas bara vid efterfrågan och kastas via LRU vid högst 4 MiB
pixel-/validitetsdata, plus liten Map-metadata. Det är ingen fullstor mellanbild.
Cachen hör till ett compiled/prepared exportjobb och släpps vid avslut/avbrott.
108 profil-/kvart-/finrotations-/cropfall matchar den frysta gamla koden exakt
i RGB16 och RGBA8; separata tester tvingar eviction, ny beräkning och release.
Packade workerstripes använder samma logiska källkoordinater och testas också.

Slutlig Node-mikromätning, 320×240, tre körningar, Gold P100: finrotation
3912 → 1201 ms (3,26×), kombinerad komposition/kvart/finkorrigering
1924 → 532 ms (3,62×). Direkt- och rena kvartsvägar lämnas utan cache och har
ingen visad hastighetsvinst (1055 → 1070 respektive 880 → 929 ms i denna körning).
Råa tider, miljö, indata-/config-/kodhashar och cachetal finns i
`measurements/node-cache.json`; allokeringssteget i `node-allocation.json`.
Ingen extrapolering till 26 eller 40 MP görs.

## D. Responsiv RGB16-export

TIFF16/PNG16 använder nu samma befintliga exportworker som JPEG/PNG8, med
samma färgkärna och presentation-sampler. Endast begränsade, nyallokerade
källstripes skickas; originalbufferten överförs aldrig och det skapas ingen
fullstor arbetskopia. Workergrenen behöver ingen OffscreenCanvas för RGB16.
PNG-kodaren, TIFF-headern, ICC och pixelkvantiseringen återanvänds.

Utan Worker eller vid initieringsfel används huvudtråden: 256 pixlar per
arbetsdel och cirka 20 ms arbetsbudget, även inne i en mycket bred rad.
Bakgrundsprioriterad postTask används där API:t finns, annars timer-yield.
Enbart scheduler.yield prövades och förkastades eftersom timers/automatiserade
avbrott kunde svältas i Chromium. Det är alltså inte en tillräcklig garanti för
responsivitet. Avbrytning kontrolleras före/efter yield, kodning och före
nedladdning. Ett avbrutet workerjobb termineras direkt. Cache, PNG-stream och
busy-/låstillstånd frigörs utan delvis hämtad fil.

`export-responsive-browser.mjs` jämför riktiga TIFF16/PNG16-exporter mot den
frysta före-samplern, testar breda rader, kvart-/finrotation och komposition,
levande heartbeat samt avbrott efter påbörjad beräkning. En väg tvingar bort
Worker och postTask för att testa timerfallbacken. Det är inte en fysisk
Safari-/iPad-verifiering. CPU/GPU-preview lämnas oförändrad.

TIFF-utmatningen behåller delar → Blob. Färre JS-referenser i en inkrementell
Blobkedja bevisar inte mindre inbyggt minne och kan skapa fler sammanslagningar.
Ingen sådan ändring införs utan en visad fördel. Det färdiga filinnehållet måste
fortfarande lagras. Browsermätningen registrerar JS-heap/backing storage och
sammanlagd process-RSS där Linux/CDP tillåter det; RSS summerar delat minne och
är en grov indikator, inte unik appallokering eller Safari-minnesprofil.
Cachen kan tillföra högst 4 MiB pixeldata plus metadata och en begränsad stripe.
Det görs inget generellt löfte om lägre total minnesanvändning.

## E. Verifierad linjär TIFF

Kvarvarande Float32Array.from i prepareTiff och V2-labbets TIFF-import ersätts
med en gemensam rak normaliseringsloop. Divisionen med 65535 och Float32-
avrundningen är exakt samma; det är ingen färgkonvertering. RAW-loopen från
#93 ändras inte. Alla 65 536 kodvärden jämförs bitexakt, och ICC-avvisning för
användarverifierad Rec.2020 behålls.

Node-mikromätning: 18 miljoner kanaler (6 MP RGB), tre körningar. Före:
2837/2313/1658 ms; efter: 60/41/45 ms. In- och utbuffert är fortsatt 36 respektive
72 MB. Detta mäter endast normalisering, inte TIFF-avkodning, filinläsning,
V2-analys eller tid till synlig bild. Rådata i `tiff-normalization.json`.

## F. Filmremsans miniatyrer

Miniatyrer tas nu från redan renderad positiv CPU-/GPU-preview, högst 160 px,
först när bilden faktiskt har öppnats. Ingen separat RAW-avkodning eller
bakgrundsavkodning av kamerans negativa RAF-JPEG görs för filmremsan. Ännu ej
öppnade bilder har en stabil placeholder; felaktiga bild-URL:er får samma fallback.
Thumbnailkod läser bara visningscanvas och kan inte vara källa för analys/export.
Den första positiva miniatyren behålls under redigering för att undvika återkommande
readbacks. Den följer därför inte varje efterföljande profil-/geometriändring.

Browserregressionen provar faktisk syntetisk DNG, köbyte och trasig thumbnail,
med oförändrad källversion/analys. Formatvägen är gemensam för RAW, browserbilder
och TIFF när en positiv preview finns. Detta är inte verifiering av en fysisk
ARW-kamera eller ett verkligt RAF-negativs fotografiska kvalitet.

Även ett misslyckat framtvingat återladdningsförsök behåller aktuella ännu ej
sparade bildinställningar: snapshot tas efter att den nuvarande bilden sparats.
Felvyn tömmer gammal preview och visar tomläge. Detta har en separat regression.
Sparade filmrutor omtolkas inte automatiskt: ny detektion används vid ny bild
eller uttryckligt Auto-val, medan manuella/låsta och sparade projektval behålls.

## G. Riktiga webbläsarexporter – före/efter

Reproduktion, seriellt, inte parallellt med andra benchmarkar:

```sh
node tools/benchmark-export-browser.mjs /sokvag/till/baseline3a672b0 /tmp/before.json 640 480 3
node tools/benchmark-export-browser.mjs /sokvag/till/kandidat /tmp/after.json 640 480 3
```

Linux/Chromium 156, AMD EPYC 9V74, Node v24.22.1. Verkliga app-exportfunktioner
med V2/D, Gold P70, JPEG/PNG:s vanliga importoberoende exportgeometri och
syntetiska linjära Rec.2020-indata. Det är inte kamera-/RAW-import eller nya
fotografiska nativeexporter. 640×480 har tre körningar, 3000×2000 två.
Före är ren main 3a672b0, efter byggd arbetsversion 0f80b38. Byggidentitet och
råa körningar finns i `measurements/browser-before.json` och `browser-after.json`.
Efter mätningen lades återanvändning av evikterade cachebuffertar till.
Pixelidentiteten verifieras mot samma före-kod, men ingen ytterligare hastighets-
eller total minnesvinst anges utan en egen mätning.

Alla färdiga bilder avkodas till RGB16 och samtliga pixelhashar, dimensioner,
färgdjup, lågbitar och färgmetadata överensstämmer före/efter. Tid inkluderar
appens färg/sampling, kodning och Blob; avkodning/verifiering och protokolltransport
av resultatet sker efter mätningen. Första och följande körningar redovisas
separat i JSON, utan påstått generellt cold/warm-löfte.

|Prov|Storlek|n|Före median [min–max] ms|Efter median [min–max] ms|Max timeruppehåll före → efter ms|
|---|---|---:|---:|---:|---:|
|tiff-direct|640×480|3|1130 [1121–1148]|1163 [1146–1176]|297 → 28|
|tiff-fine|640×480|3|3898 [3873–4089]|1152 [1102–1161]|626 → 29|
|tiff-composed|640×480|3|1914 [1844–1984]|636 [618–667]|506 → 19|
|png16-fine|640×480|3|3986 [3910–4018]|1200 [1170–1290]|619 → 18|
|tiff-large|3000×2000|2|20659 [20614–20704]|16139 [14528–17749]|1344 → 34|
|cancel-fine|3000×2000|2|1030 [1027–1033]|52 [52–52]|1031 → 16|

Finrotationens TIFF/PNG16 förbättras tydligt, liksom det större direkta provet.
Liten direkt TIFF är cirka 3 % långsammare i denna körning; ingen generell
hastighetsvinst på direktvägen hävdas. Avbrott planeras vid +50 ms: båda
kandidatproven slutar cirka 52 ms från start, jämfört med cirka 1030 ms före.
Inget prov laddar ner en ofullständig fil eller lämnar exporten låst.

Minnet ger inget entydigt generellt vinstpåstående. Exempel: RSS-ökning under
640×480 fin-TIFF är cirka 21–26 MiB före och 37–49 MiB efter (worker/isolate +
cache). På 6 MP direkt är den cirka 73–96 respektive 73–79 MiB. Mätningen
samplar RSS med 50 ms intervall, summerar delat processminne och kan missa korta
toppar; den är inte unik minneskostnad. JS-/backing-storage-tal ligger separat
i JSON. Fysiska iPad/Safari-minnesgränser kan inte härledas ur detta.

## Återstående verifiering

Användarens ursprungliga övre-filmkant-fall och fler verkliga negativ återstår.
Fysisk Windows Edge/iPad Safari har inte körts. Ingen profilparameter, RAW-
demosaicing eller V2/D-formel har ändrats. Inkrementell Blob-output och ytterligare
worker-/komprimeringsoptimering lämnas utanför denna PR. Synlig version följer
befintlig first-parent-beta-policy; ingen manuell räknare eller publicering görs.
Full lokal regression och slutlig CI-status redovisas i PR:n. Ingen automatisk
merge eller deployment.

Även V2-plattformens äldre automatiska findBase-väg kräver nu betrodd filmruta.
Det räcker inte att bara låta balans/exponering avstå: en felvald automatisk
bas kan annars fortfarande ändra själva rekonstruktionen. Accepterade/explicita
filmbasmätningar behålls. App-controller-testet injicerar en automatisk bas och
verifierar att den inte läses vid osäker ruta, men används efter bekräftelse.
Cachen återanvänder evikterade tilebuffertar och nollställer validitetsmasken;
forced-eviction-testet kräver fortsatt exakt överensstämmelse med före-koden.

Återhämtningskontrollerna behåller även full-RAW-knappens väg efter fel.
Samma-bild-gaten kräver en faktisk arbetsbild; indexet får peka ut den misslyckade
bilden utan att gamla bas-/nivåvärden kan sparas till den. Ett asynkront motorbyte
kontrollerar både köpost och importsekvens före rollback och återställer enbart
den ägande bildens inställningar. Ersatt kö/bild kan inte få föregående motors
eller RAW-domäns inställningar från ett sent importresultat.

En fullbreddsruta blottlade också ett befintligt kantfall i kompositionsverktyget:
ett SVG-handtags centrum exakt på visningsytans kant kunde inte träffas. Bara
handtagens skärmcentrum flyttas en CSS-pixel inåt när de ligger exakt på kanten.
Källkoordinater, polygon, dragdelta och exportgeometri ändras inte. Den befintliga
mobile/touch-regressionen för åtkomliga handtag behålls utan svagare krav.

Detektorn ger fortfarande en axelparallell rektangel. Vid lutande negativ kan
den inskrivna rektangeln utesluta motivhörn: i den syntetiska −4°-fixturen
behålls ungefär 82 % av den roterade motivrektangelns area. Detta är en verklig
begränsning; perspektiv-/rotationsföljande filmrutor införs inte i denna PR.
