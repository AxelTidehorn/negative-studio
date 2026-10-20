# Beta 2 — verifiering och acceptans

Status: **implementerat testbygge; färgacceptans ej godkänd**.

## Kontroller som passerat

- Befintliga smoke-kontroller: appsyntax, tema-initiering, DNG-filväg, profilreglage, rotation och feedbacklänk.
- 14 numeriska motorkontroller: ROI-isolering; ny statistik vid ändrad filmruta; exponeringsstabilitet vid −1/0/+0,4 EV utan klippning; motsvarande sRGB-/linjär källa; bevarad motivfärg utan gråvärldsbalans; avvisad neutral extern ljuskälla och svart ram; explicit fallback; samma korrigering av filmbas och motiv med ljuskällereferens; förhands-/fullsamples inom Float32-precision; rotation och exportbeskärning; ICC-sRGB-rundtur; avvisad felaktig ICC; detektionsgränser.
- 13 kontroller i appens DOM-testmiljö: full initiering, Beta 1 som standard, profilbyte utan ändrad kalibrering, samma färg vid profil 0 %, förhands-/exportberäkning inom ett 16-bitarssteg, separata filmrutor per köbild, 8-/16-bitars TIFF-läsning, inbäddad export-ICC, tema/rotation utan kalibreringsändring, återställning som behåller tekniska referenser, exportspärr vid osäker filmruta, crop/rotation i export och tömning av kön.
- Faktisk LibRaw/WASM-avkodning av den syntetiska CFA-DNG-filen: 64×48, 16-bitars RGB. Detta bevisar inte kompatibilitet med de fem riktiga DNG-exemplen.
- Faktisk LibRaw/WASM-avkodning av `_DSF8434.RAF` och `_DSF9237.RAF`: båda 6032×4032, 16-bitars RGB. Två olika motiv, inte ett exponeringspar. Även den separata inledande avkodningen av `_DSF8434.RAF` passerade.
- Tillgänglig `raw0006.tiff`: 10000×6801, 16-bitars okomprimerad RGB, utan ICC. Läsning och nerskalad analys passerade; källbufferten återanvändes utan en andra fullstor samplebuffert.
- Bygge med befintlig LibRaw 1.6.0. Slutligt bygge passerade efter sista kodändringen. Distributionen innehåller matchande källfiler, Beta 2-cache och inga dubbla HTML-id:n.

## Visuella fynd

De första RAW-jämförelserna visade att ett godkänt numeriskt test inte betyder bättre färg:

- `_DSF8434.RAF`: den nya motorn visade ett tydligt cyan-/blåstick jämfört med Beta 1. Automatiken föreslog även en för snäv höjd på filmrutan. En manuellt korrigerad filmruta löste inte hela färgfelet.
- `_DSF9237.RAF`: ett automatiskt basprov gav först kraftig gul ton. En skärpt basvalidering avvisade detta och fallback gav ett betydligt rimligare resultat, men det räcker inte för generell acceptans.
- Övre percentilen i motivet kontrolleras nu i alla kanaler innan automatisk filmkant används. Kantdetektorn får inte själv godkänna ett förslag i detta bygge; användarens bekräftelse krävs.
- Ingen fast varm eller magenta-kompensation lades in för att dölja blåsticket.

Beta 1 är därför kvar som standard. Beta 2 kan väljas per bild för fortsatt jämförelse. Någon generell förbättring av färgåtergivningen på den överenskomna testuppsättningen påstås inte.

## Återstår för acceptans

1. De två avsedda UltraMax-RAF av samma negativ med olika exponeringar måste identifieras och jämföras. De tillgängliga två verifierade RAF-filerna är olika motiv.
2. De fem tidigare använda verkliga DNG-negativen har inte kunnat återfinnas i detta projektunderlag. NLP:s länkade DSLR-arkiv innehöll RAF, inte dessa DNG. Inget påstående om godkänt fem-DNG-test görs.
3. Samma neutrala/manuellt uppmätta filmbas och samma filmruta ska användas i kontrollerade jämförelser. Undersök filmbasval, RAW-vitbalans/matris och färgämnenas relativa densitetskurvor innan en ny färgbalansmodell godkänns.
4. Visuella tester på hud, grå/vita ytor, skuggor, himmel och grönska måste godkännas mot Beta 1 med Neutral/0 %.
5. Safari/iPad: dra alla fyra sidor efter zoom/rotation, pipettens koordinater, temakontrast, köbyte, JPEG-/TIFF-nedladdning, batch och offlinecache. DOM-testet simulerar inte layout eller verkliga pekhändelser.
6. JPEG-kodning och färgvisning ska verifieras i riktig webbläsare. Testmiljön kontrollerar beräkningsvägen och exportgeometrin; TIFF-samples och ICC kontrolleras binärt.
7. Minnesbeteende hos stora RAW/TIFF på iPad. Parallella stora filtester avbröts när testmiljön tappade processen; de slutförda resultaten ovan behålls, inga senare RAW-filer räknas som passerade.

## Beslut

Ingen ny motor ersätter Beta 1 förrän jämförelsen visar tydligt färre oönskade färgstick och bättre konsekvens på den överenskomna uppsättningen. Denna distribution är avsedd att göra den jämförelsen konkret och reproducerbar.
