# Godkänd D i ordinarie V2

Fotografens val av D i 05/11 är beslutsunderlaget. Det ersätter inte mätningar
eller verifierar automatiskt färgkorrekthet. Produktionsbas: main 6e3d763;
referens-D: PR89 efcf88f, matched-shoulder-1 och scene-distribution-1.

Nya V2-bilder använder `luminance-matched-D-1` med fryst `toneRecipe`:
kontrast 0, knä 1, blendEnd 2, power 2, exponering scene-distribution-1.
Bas, densitetsrespons, neutralankare, gamut och finish är oförändrade.
Gemensam renderanalys äger exponeringsmodellen. CPU-orakel, snabb CPU/worker
samt befintlig GPU äger motsvarande tonberäkning. Ingen ny motor eller UI.

Tidigare recept väljer aldrig D implicit. Deras gamla analysnycklar och
pixelberäkningar behålls, även efter basbyte/omanalys. D ingår i nya nycklar
och följer med vid bas-/områdesinvalidation. Ett ändrat/okänt tonrecept avvisas.
Äldre klienter avvisar det okända ton-ID:t genom den befintliga valideringen
före projektmutation. Projektschema och applikationsversion blandas inte ihop.

## Reproduktion

Elva sparade ursprungliga linjära RAF-punktgaller (24000 per bild) jämförs med
PR89:s faktiska frysta D-recept, med samma källa/bas/respons/område. Integrerad
D och gamla referensfaktorn är identiska i dessa prov: EV-delta 0 och RGB16-
kodfel 0. Dessa elva jämförelser är punktprov. Dessutom har 05 omavkodats från samma
hashverifierade RAF med låst decoderrecept och exporterats genom den ordinarie
TIFF-ägaren med integrerad D. Hela den nya 6032×4032 RGB16-filen är
**byteidentisk** med den godkända PR89 D-filen (145926902 byte, SHA-256
`c49ff4ef9d3b4a7b86523bc43860c28c37d081c9a7d0f3755b638797ba1fcc13`).
Det inkluderar samma ICC och verkliga 16-bitars pixelvärden; ingen uppskalad
preview används. Bevis finns i `measurements/v2-approved-d-native-tiff.json`.
Övriga tidigare 44 TIFF
med bildjämförelser och 152 nativeutsnitt återanvänds från PR89. Deras privata
nedladdningar och hashbevis ligger i PR-beskrivningen.

## Extrema högdagrar 05

Den dokumenterade nackdelen behålls öppet: P99-marginalen A/B 0,0602 blir
0,0406 i D, medan vanliga högdagertoner separeras bättre. D är godkänd visuellt
för porträttet men detta godkänner inte varje extrem fönsterpixel. En kontroll av **alla** RGB16-pixlar i 05 visar 12 pixlar med minst en
kanal på 65535 inom samma filmcrop (13209888 pixlar), lika i A, B och D.
D ger fler sådana kodmättade värden i den fulla källan, huvudsakligen i rött
(144 → 16440), men samtliga tillkommande ligger utanför den sparade filmcropen.
Detta skiljer minskad extrem tonal marginal inne i bilden från ökad kodmättnad
i filmkanten; det bevisar inte bevarad lokal detalj i varje fönsterpixel.
Att ändra asymptot eller skuldra skulle ändra den godkända formen. Ingen ny kurvvariant
läggs därför ovanpå D utan separat konkret verifiering och fotografiskt beslut.

## Grundfärg – separat från tonbeslutet

Tidigare stegdiagnostik från #58 och PR89 återanvänds. Den tekniska
rekonstruktionen och source/decoder är byteoförändrade i denna integration.
Blå/cyan färg i 05/09/10 har observerats redan före slutlig positiv finish;
nyansavvikelser kan inte därför tillskrivas enbart D:s tonkurva. Kamerans
arkiverade WB skiljer dessutom 09 från andra bilder. Det är ingen isolerad
mätning av en felaktig kameravitbalans eller filmprofil.

D applicerar en gemensam positiv luminansfaktor, så pre-gamut färgkvoter
bevaras. Befintlig gamutkompression minskar däremot kroma när mättade färger
flyttas till ljusare nivåer. Det kan förklara blekare ljusa färger, utan att
bevisa att en mindre kompression skulle vara mer korrekt. #58:s senare
gamutknä ökade också problematiska lilaurval i fönstret. Det återinförs inte.

Hud, grå/vita ytor och RGB-separation kan bedömas relativt i de befintliga
nativebilderna, men känd neutral-/färgreferens, filmexponering och spektral
capturekalibrering saknas. Inget säkert generellt tekniskt färgfel med en
verifierad global korrigering har därmed fastställts här. Ingen temperatur,
mättnad, filmmatris eller estetisk Kodak/Fuji-karaktär ändras. **Ingen D+**
promoveras eller fabriceras. En framtida isolerad färgkandidat kräver att dess
orsak skiljs från källans ljus/film och från avsiktlig scenfärg.

Fulla tidigare profilparametrar är fortfarande en separat kreativ inventering,
inte tekniska kalibreringar. Inga profiler eller print styles ändras.

## Regression och reproducerbarhet

`node tools/check-v2-approved-d.mjs RECORD_DIRECTORY OUTPUT_JSON CACHE_DIRECTORY...`
återanvänder PR89:s privata punktgaller och frysta D-recept. Original/cachebilder
läggs inte i GitHub. Referensfaktorn importeras från samma oförändrade
experimentverktyg som skapade de godkända TIFF-filerna.

De riktade testerna omfattar exakt fryst faktor/exponering, kontinuitet och
monotonicitet med Float64-avrundningstolerans, neutralitet, fallback, sparning/
återläsning, historiska recept, explicit byte från D, cache och basbyte.
WebGL2/SwiftShader provas med 200 kombinationer av historiska recept och D,
profiler samt Editing 2.0. Högsta RGB8-avvikelse är 1; högsta positiva Float32-
avvikelse är 0,000004016. Befintlig TIFF-export är byteidentisk mellan valt
CPU- och GPU-previewläge; JPEG är avkodningsbar och worker/fallback samt
stale-job-skydd provas. Detta är Linux Chromium, inte fysisk iPad/Edge.

Ingen ny fotografisk förbättring av färger hävdas. Före/efter-materialet är det
redan granskade A/D-paketet. Inga nya bildparametrar har anpassats efter granskningen.

Slutlig lokal `npm run test:full`: **129/129 grupper**, 635,75 s. Bygg- och
artefaktkontroller ingår. CI-resultat för den pushade revisionsidentiteten länkas
i PR #89; ingen deployment är beställd.
