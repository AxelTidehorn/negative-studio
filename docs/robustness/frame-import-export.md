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
fortfarande ge en osäker vägledning när orange filmbas saknas.

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
utsida ger exakt samma V2-exponering, färgbalans och mask. En avsiktligt felaktig
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
activeFrame blir -1, arbetsbuffertar/analys rensas och tomt bildläge kan inte
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
