# V2 algoritm 3: neutralare högdagrar

Bas: main `3ebe1d2` efter algoritm 2 (#43). Kandidaten fortsätter samma
utvecklingsspår efter miljöåterstart; inga nya profiler eller en ny teknisk
inversion införs. Det parallella Standard-experimentets lösning används inte.

## Ändringen

Två konkreta felkällor i V2:s positiva återgivning åtgärdas:

- Den gamla högdagerreferensen kan komma från varma ytor inomhus och tillföra
  blått även till fönstrets dagsljus. Algoritm 3 provar en snävare referens från
  P90–P98,5 med högst 0,25 EV logkanalavvikelse. Den gamla referensen behålls
  om underlag saknas eller den nya strider mot mellanregistret.
- En jämn, nästan neutral scen som snö avvisades av kravet på färgvariation.
  Ett begränsat undantag kräver högst 0,30 EV logkanalavvikelse, minst åtta
  rumsliga rutor, 65 % klusterstöd och högst 0,40 EV P95–P05-spridning per
  färgaxel. Övriga stöd-, tvetydighets- och bandkontroller behålls.

Dessutom ersätts automatvyns gemensamma peak-skalning av en mjuk kompression
av kromatiken mot neutralaxeln vid övre sRGB-gränsen. Luminansen bevaras för
representerbara värden; samma faktor används för färgavvikelsens tre kanaler.
Knäet är fortsatt 0,8. Färgriktningen bevaras, medan mättnaden minskar när
färgen inte får plats i ljusa sRGB-högdagrar. Mörka färger under knäet ändras
inte av detta steg. `technical` och `fixed` behåller tidigare outputmodell.

Detta är en fotografisk neutralreferenshypotes och gamutmappning, ingen
mätning av filmens spektrala respons. Ingen tillit beräknas från svag RAW-
signal. Densitet, filmbas, teknisk responsprior, P60/P99-exponering och RAW-
avkodning är identiska med algoritm 2. Inga nya beroenden eller UI-reglage.

## Versioner och integration

Nya V2-recept väljer `algorithmVersion: 3`. Den tekniska kalibreringen behåller
`rec2020-base-zero-prior-2` / version 3. Algoritmversion och kalibreringsversion
är separata. RenderIntent anger algoritm 3, `neutral-anchor-bands-2` och
`luminance-gamut-2`. Sparade algoritm 1/2 behåller sin gamla färgbalans och
output även när basen ändras och analysen körs om. Ingen automatisk migration.
Äldre appar avvisar det nya algoritmnumret innan projektet ändras.

Main-preview, worker och export använder samma referens-/skalärmatematik.
Editing 2.0, övriga motorer, geometri, exportägare och appversionering återanvänds.
Diagnostiken redovisar rätt algoritm, färgrecept och faktiskt använd output.

För jämförelse på samma redan avkodade källa och bas i labbets konsol:
`await NSV2Lab.setAlgorithmVersion(2)` respektive
`await NSV2Lab.setAlgorithmVersion(3)`. Inga nya kontroller krävs i huvudvyn.
För att behålla äldre bilder används deras sparade projekt som vanligt.

## Bilder och verifiering

Befintliga 6032×4032 RAF och det tidigare testpaketet återanvänds. 05/09 användes
för utveckling; parametrarna frystes före kandidatens kontroll av 04/06/10.
Alla bilder har förekommit historiskt och är inget nytt oberoende dataset.
Tre kolumner visar sparad FILMLABB A, V2 algoritm 2 och kandidaten. V2-paret
har identisk källa, bas, analysruta, teknisk kalibrering, exponering och kreativ
neutralinställning. A har annan RAW-domän/egna inställningar och är en
fotografisk referens, inget absolut färgfacit. Bildfilerna hålls utanför Git.
PR:n länkar den privata kontaktkartan. I de faktiska före/efter-bilderna har
05 färre blå/lila fönsterfläckar och 09 neutralare snö. 04/06 behåller sin
användbara svärta och detaljseparation. 10:s vita kläder får mindre färgstick,
men den övergripande återgivningen är fortfarande mjuk och delvis cyan.
Snön förblir mörkare än A; exponeringen har avsiktligt inte justerats.

Alla fem har exakt 0 EV-skillnad och identisk teknisk positiv. Full 04-export
är 3719×3678 RGB16-TIFF med 588 byte sRGB-ICC och 0 kodstegs fel i kontrollerade
referenspunkter. JPEG är också verifierad; privatverktygets JPEG använder
Canvas, medan huvudplattformens JPEG/ICC-väg täcks av browsertesterna.

Mellanliggande försök med enbart neutralundantaget förbättrade snön men inte
fönstret. Att flytta sista interpolationsknuten till P97 höll blåförstärkningen
kvar för länge. Den valda kandidaten behåller knutarna och använder en snävare
högdagerreferens samt luminansbevarande gamutkompression.

Återanvänd bildverktyget:
`node tools/v2-response-validate.mjs PACKAGE ORIGINALS OUTPUT 05,09,04,06,10 --algorithm3 --export04`.
Utdata förblir lokala och parametrar kontrolleras mot en fryst JSON-fil.

Ett riktat numeriskt test täcker gammal output, neutralreferenser, fallback,
luminans/färgriktning, CPU-paritet och RGB16. Befintliga projekt-/browsertester
kontrollerar alla tre algoritmer, import, bas/ångra, redigering, JPEG/TIFF,
blandad batch och avbrott. Körresultat finns i PR:n.

Begränsningar: en svagt färgad, jämn yta kan förväxlas med neutral belysning.
Gamutkompressionen minskar avsiktligt mättnaden i mycket ljusa färger. Detta
återskapar inte klippt källsignal. Fysisk iPad Safari/Windows Edge och nattbilder
är inte verifierade; nya filmtyper och ljusförhållanden behöver fortsatt bildtest.
