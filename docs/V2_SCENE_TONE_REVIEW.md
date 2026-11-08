# Scenmedveten tonplacering – fryst fotografisk A/B

Baseline är main `6e3d763cfdaad958fac7baf4d8acda3cb5e9733b` efter #88.
**Produktionsbeteendet behålls.** Kandidaten ger ljusare snö men inte en
konsekvent fotografisk vinst över kontrollmaterialet. Ingen ny motor, inget
fotografiskt läge, ingen projektmigration eller förändring av sparade recept.

## Vad som faktiskt prövades

Nuvarande bas-zero-rekonstruktion, densitetsmatris, neutralankare, Fotografisk 2
med `photographic-finish-1`, Editing 2.0 och utmatningsgamut behålls exakt.
P60 placeras mot 0,8 med mjukt P99-skydd vid 16. Reinhard och den befintliga
fotografiska kontrastfunktionen bestämmer hur detta blir synlig luminans.
Det finns ingen separat automatisk svart-/vitpunktssträckning i detta steg.
Färgbalansen bevarar teknisk luminans; gamut/presentation kan däremot ändra
synlig kroma när exponeringen flyttar färger till ljusare delar av kurvan.

#58:s P95-vitreferens gjorde snön ljusare men mörkade köket och bussen.
Bradford och ett senare gamutknä löste inte tonproblemet. Dessa experiment
återinförs inte. Snöns tidigare högdagerskydd var bara 0,003897 EV; en större
högdagergräns kan därför inte ensam lösa dess mörka mellanregister.

Den enda kandidaten, `scene-distribution-1`, använder spridningen i log-luminans:

- `L = log2(P60/P10)`, `H = log2(P90/P60)`, `R = L + H`.
- `s(a,b,x)` är kontinuerlig smoothstep mellan 0 och 1.
- Stöd för koncentration upptill:
  `(1-s(.5,1.25,H)) * s(.5,1.5,L) * (1-s(4,6,R))`.
- Motsvarande stöd nedtill byter L/H. Exponeringsbias är högst +1 EV
  respektive −0,5 EV, med mjuka övergångar och ingen motivklassning.
- Bias multiplicerar det befintliga P60-målet med `2^bias`; samma mjuka
  P99-skydd och numeriska EV-gräns används därefter. Ingen lokal korrektion.

En bred övre population med mörkare svans stöder därmed en försiktig ljusare
placering; motsatsen stöder en mörkare. Histogramformen kan **inte** avgöra
om en koncentrerad population är snö, en ljus fasad eller ett mörkt motiv.
Detta är osäker statistisk inferens, inte uppmätt scenexponering.

Otrygg filmruta, för få giltiga prov och ogiltig statistik respekterar den
befintliga fallbacken. Om bara de tillagda fördelningsmåtten är ogiltiga
behålls baseline. Alla beslut, begärd/applicerad EV och begränsningar lagras
i bildpaketets mätningar. Ingen parameter har anpassats per fotografi.

## Fryst jämförelse och faktisk export

Alla elva unika RAF finns lokalt och kontrolleras mot arkivets SHA256;
06/07 är samma original. De tidigare källcacherna används först för
utveckling och kontroll. 04/05/09 används för utveckling, övriga åtta för
kontroll efter parameterfrysning. Samtliga motiv är historiskt sedda;
detta är inte ett nytt oberoende film-/kameramaterial.

`tools/v2-tone-review.mjs` kräver en uttrycklig git-baseline och verifierar
alla produktionsägare under `src/`, manifest och HTML byte för byte mot den.
Före är den verkliga frysta produktionskoden, inte en ombyggd approximation.
Varje RAW avkodas en gång med huvudplattformens befintliga låsta LibRaw-recept
(linjär Rec.2020, kamera-WB, ingen automatisk motiv-WB). Ny analys kontrolleras
mot den sparade inom 1e-12; obetydliga Node/Chromium-flyttalsavvikelser tillåts.
Båda utdata använder exakt samma källa, bas, kalibrering, område och färgrecept.

Verktyget ändrar endast ett fryst intents globala EV i sin egen browserflik.
Huvudplattformens befintliga TIFF-exportknapp, pixelkärna, remssampling och
ICC-ägare skriver båda filerna. Det finns ingen alternativ exportkodare.
Neutrala manuella reglage, neutral profil/print, rotation 0 och ingen
exportbeskärning används. TIFF-filerna omfattar hela originalets 6032×4032
pixlar inklusive filmkant; ingen preview förstoras. Jämförelsearken använder
samma arkiverade filmutsnitt och identisk Lanczos-reduktion på båda halvor.

100 %-utsnitt tas direkt ur exporterade RGB16-pixlar vid tidigare sparade
källkoordinater (en eller två 512×512-regioner per motiv). De skrivs som RGB16-PNG utan
omskalning, skärpning eller brusreducering. Koordinater och hashvärden finns i
`comparison-manifest.json` och `measurements/imageNN.json`. Kvantitativa
utdatamått tas på samma dokumenterade punktgaller i TIFF-filerna, inte från
kontaktkartans miniatyrer. Detta är ingen färg- eller exponeringsreferens.

## Bedömning och beslut

Snön 09 blir ljusare, men högdagerseparationen minskar. 00:s ljusa fasad är
en rimlig kandidat för den ljusare placeringen och 06 förändras försiktigt.
08 och inomhusporträttet 11 visar risken med att tolka en koncentrerad övre
population som önskad högnyckel: resultatet blir ljusare men kan upplevas
blekare och mindre färgrikt. 04/05 samt flera andra kontrollmotiv behålls.
Oförändrade bilder räknas inte som förbättringar. Se PR:ns faktiska TIFF-/PNG-
paket och mätningar för per-bild-resultaten; fotografens bedömning återstår.

Kandidaten promoveras därför inte. Fler percentiler räcker inte som belägg
för en generell scenmodell. Nästa motiverade steg är en spårbar, fotografgodkänd
exponerings-/rullreferens och en kontrollerad hög-/lågnyckelserie innan en
sådan prior får ändra nya projekts automatiska resultat. Ingen fjärde variant
eller särskild snöregel byggs i detta arbete.

## Uppmätt utfall

Alla elva TIFF-par har verifierats: 22 RGB16-filer, 6032×4032, identisk
sRGB-ICC och 32 nativeutsnitt. Sex par är byteidentiska (01/02/03/04/05/10).
09 får +0,9884 EV; synlig linjär Y50 ökar från 0,3456 till 0,5895, medan
P99−P90 minskar från 0,04414 till 0,02624. 00/06/08/11 får respektive
+0,9445/+0,1880/+0,5216/+0,6562 EV. Detta är mätvärden, inte ett färgfacit.
[Alla mått per bild](measurements/v2-scene-tone-review.json).

Lokal `npm run test:full`: **126/126 grupper**, 806,86 s, Node 24/Chromium.
GitHub CI-resultatet för den slutliga committen redovisas i PR:n.

## Reproduktion och leverans

```sh
FILMLABB_REVIEW_PACKAGER="$PWD/tools/v2-tone-review-package.py" \
node tools/v2-tone-review.mjs \
  6e3d763cfdaad958fac7baf4d8acda3cb5e9733b \
  /private/testpaket /private/originals \
  /private/color-caches,/private/stage6-caches \
  /private/review 04,05,09,00,01,02,03,06,08,10,11
python3 tools/v2-tone-review-delivery.py /private/review index
```

Befintlig Chromium/LibRaw/browserharness och installerad NumPy/Pillow används.
Inga nya appberoenden. Det privata utdataområdet måste ligga utanför repot.
Körningen kan återupptas från färdiga metadata; ändrad baseline/modell avvisas.

Kompletta per-motiv-ZIP innehåller två TIFF, två eller fyra native-PNG, jämförelseark och
fulla recept. Översikts-ZIP innehåller kontaktkarta, individuella ark, alla
utsnitt, manifest och mätningar. Drive-anslutningens verifierade uppladdnings-
gräns är 100 MiB. Större TIFF-paket transporteras därför i vanliga ZIP-filer
under gränsen; packa upp samtliga delar i samma katalog och kör medföljande
`python3 restore-review.py`. Skriptet verifierar alla SHA256, återställer det
ursprungliga ZIP-arkivet och packar upp det. Det kräver inga extra bibliotek.
De osplittrade arkiven finns också kvar i arbetsmiljön. PR:n länkar endast
verifierade privata Drive-filer; inga fotografier eller RAW sparas i Git.

Riktat test: `node tests/v2-scene-tone-review.mjs` (kontinuitet, giltiga/extrema
värden, fallback, skalsymmetri inom numerisk giltighet, fryst intent och
CPU-orakel; technical/fixed oförändrade). Fullsviten verifierar befintliga
projekt, cacheinvalidering, GPU/CPU, export, geometri och övriga motorer.
Paketverktygen verifierar ZIP-integritet, transportrekonstruktion, TIFF-taggar,
äkta 16-bitarsdata, identisk ICC och fulla bilddimensioner.

Ingen kontrollerad natt-/lågnyckel- eller tunn/tät-negativserie finns. Ingen
kolorimetrisk färgkorrekthet eller fysisk iPad Safari/Windows Edge-verifiering
påstås. Den befintliga färgkaraktären repareras inte av en EV-ändring.
Ingen merge eller deployment ingår.
