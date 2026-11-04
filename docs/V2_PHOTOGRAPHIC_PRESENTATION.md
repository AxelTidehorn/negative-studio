# V2: fotografisk återgivning för nya bilder

Utgångspunkt: main `1d06fe8`. Ingen ändring av RAW, filmbas, rekonstruktion,
exponeringsanalys, neutralankare, Editing 2.0 eller motorväljare.

## Ändringen

Nya V2-recept i huvudplattformen använde tidigare Neutral/Reinhard, trots att
Fotografisk 2 redan fanns i renderaren. De använder nu denna befintliga
tonkurva och dess befintliga försiktigare färgbalans. Det ger tydligare
mellanregister och bevarar mer av rumsljusets värme. Ingen ny tonkurva,
vitbalansanalys, motor eller valbart läge har införts.

Efter befintlig gamutbehandling tillkommer en liten finish i linjär sRGB:

- Upp till 10 % större kroma för måttligt färgade mellanregister; effekten
  avtar för nästan neutrala, mycket mättade, mörka och ljusa pixlar.
- Upp till 18 % lägre kroma i ljusa, svagt färgade områden för att inte
  förstärka färgfel i exempelvis vita textilier och fönster.
- Kroma skalas runt oförändrad luminans. Gråaxel och kanalernas ordning
  bevaras; förstärkningen begränsas mjukt av återstående RGB-headroom.

Ingen generell temperaturförskjutning, gray-world, motivregel eller individuell
bildparameter används. Finishen kan inte avgöra om en dominant färg är rätt.
Den befintliga Fotografisk 2-balansen, inte en gul/röd kanalvinst, står för
skillnaden i upplevd värme. Samma skalära finish används i referens- och
snabbrenderaren för preview och export.

## Sparade projekt och aktiv version

Nya automatiska huvudplattformsrecept får `intent.tone =
luminance-photographic-2` och `intent.output = photographic-finish-1`.
Utmatningsrevisionen sparas i befintligt recept och ingår i analyssignaturen.
Den är skild från den oförändrade rekonstruktionsversionen 3.

Sparade Neutral-, Fotografisk 1- och Fotografisk 2-recept med
`luminance-gamut-2` behåller sitt bildresultat, även efter basbyte/omanalys.
Algoritm 1/2 är oförändrade. Ingen automatisk projektmigrering sker.
Huvudplattformens tidigare validator avvisar den nya utmatningsrevisionen med
`OUTPUT_RECIPE_INVALID`; den tolkar den inte som ett äldre recept.

För att prova PR-bygget: importera en bild som **ny bild** och välj V2 i vanliga
motorväljaren. Befintliga projekt visar avsiktligt den gamla återgivningen.
Det befintliga diagnostikreceptet och konsoluttrycket
`FILMLABB_V2.snapshot().recipe.intent` visar aktiv `tone` och `output`.
Footerns commitidentifiering visar vilket appbygge som används.
Referenslabbets och analys-API:ets explicita historiska val behålls.

## Fyra verkliga före/efter-par

[Kontaktkarta, före till vänster och efter till höger](https://drive.google.com/file/d/1BkFymZ6SIPfJ-JxX085CEnNd4Mpa7Mi2/view).
[PNG-par, originalpixelutsnitt och jämförelseparametrar (ZIP)](https://drive.google.com/file/d/1TDAK9J7li9y07GurcfXADbIt178yc0R4/view).
Bilderna ligger i den befintliga privata Drive-mappen, inte i Git.

| Motiv | Visuell observation och begränsning |
| --- | --- |
| 00, fasad/dagsljus/grönska | Mer separation i fasad och grönt, mindre grönaktig presentation. Fasadens färg blir varmare. |
| 05, kök/porträtt/fönster | Varmare rumsljus och hud, rikare textilfärger. Fönstrets blå/lila restfel är inte löst. |
| 06, soffporträtt/blå kläder | Tydligare ansikte och textilseparation; djupare skuggor är en möjlig nackdel. |
| 09, snö | Mer kontrast, kall karaktär kvar. Bilden blir något mörkare; förbättrad snöexponering påstås inte. |

Jämförelsen utgår från verklig tidigare **automatisk Neutral**, inte från ett
redan valt Fotografisk 2. En stor del av skillnaden kommer alltså från att
koppla in befintlig fotografisk återgivning. Varje par har exakt samma linjära
Rec.2020-källa, bas, kalibrering, analysområde, exponerings-EV och crop; endast
presentationen skiljer. Källornas SHA-256 matchar de tillgängliga RAF-originalen.
Tidigare källcacher återanvändes: 900-pixels översikter med källpunktsampling
samt ursprungliga 512 × 512-pixelutsnitt. Detta är inte en ny fullständig
RAF-utvärdering eller en fullupplöst kvalitetsbedömning.

Svagt blå/lila högdagrar har kontrollerats visuellt i dessa fyra fall men
färgkorrekthet är inte bevisad utan färgreferens. En enkel fast färgtröskel i
512-utsnitten ger lila pixelantal 125→256, 82→80, 228→250 och 662→590;
det är inte semantiska felantal. Därför påstås ingen generell minskning av
lilastick. Inga parametrar ändrades mellan motiven eller efter denna bedömning.

## Verifiering

- Riktade tester täcker gråaxel, luminans, kanalordning, headroom, begränsad
  kroma, snabbrenderarparitet och gamla recept efter återläsning/basbyte.
- 120 befintliga RGB8/RGB16-exportreferenser är oförändrade. Testerna väljer
  uttryckligen historisk utmatningsrevision; referensfilerna har inte skrivits om.
- Browsertestet kontrollerar den nya standarden via ordinarie appflöde samt
  återläsning av projekt med äldre algoritmer, inklusive tidigare version 3.
- `npm run test:full`: 109/109 testgrupper passerade, inklusive byggkontroll,
  browserflöden, JPEG/TIFF, Editing 2.0, projekt och äldre motorers regressioner.
- Den tidigare validatorn från main `1d06fe8` har också körts separat:
  historiskt recept accepteras och den nya utmatningsrevisionen avvisas.
- Fysisk iPad Safari och Windows Edge har inte verifierats i denna miljö.
