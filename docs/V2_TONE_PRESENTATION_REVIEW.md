# V2: tonseparation efter den scenmedvetna exponeringskandidaten

> Historical implementation/measurement record. Reproduction commands referring to removed tools require the [pinned PR #99 checkout](https://github.com/AxelTidehorn/negative-studio/blob/f78a0314480072a723f97ce3f1a5aeffae008353/docs/V2_TONE_PRESENTATION_REVIEW.md). This does not retire the application functionality described here. Current test commands and coverage are in [TESTING](TESTING.md).

Fortsättning i **PR #89**, utan en konkurrerande PR. Produktion: main
`6e3d763cfdaad958fac7baf4d8acda3cb5e9733b`. Fryst A/B-leverans och exponeringskod:
`912430a762f28c7b7e316cdc71056f35c87dbba1`. Produktionsfiler, sparade recept,
rekonstruktion och profiler ändras inte. C och D är experiment, inte nya
permanenta lägen. Exakta modellhashar/recept finns i bildpaketets manifest.

## Exponering är inte en skuldra

B från #89 behålls exakt, inklusive dess P10/P60/P90-inferens och P99-skydd.
A:s 22 tidigare TIFF-exporter för A/B återanvänds byte för byte, med SHA256-
kontroll. Endast C/D renderas på nytt, med samma RAW, decoderrecept, bas,
kalibrering, analysområde, rotation, färgbalans, gamut, finish och neutrala
manuella inställningar. #58:s generella P95-, Bradford- och gamutknäexperiment
återinförs inte. Ingen ny analys eller ompassning av filmresponsen införs.

Låt `y` vara positiv luminans efter B:s exponering. Befintlig Fotografisk 2
bildar `x = y * 2^(a*tanh(log2(y/0.8)))`, där `a=0.5`, och ger `x/(1+x)`.
Med större exponering hamnar fler prov på denna kurvas flackare del. Att bara
höja EV flyttar därför ljusheten utan att behålla samma högdagerseparation.

## En gemensam modell, två presentationsparametrar

`matched-shoulder-1` behåller befintlig kurva under `x=1`. Ovanför knäet
prövas `1 − 8/(x+3)^2`. Den har samma värde (0,5) och första derivata (0,25)
vid knäet. Mellan x=1 och x=2 blandas kurvorna med quintic smoothstep,
`6t^5−15t^4+10t^3`. Övergången är C2-kontinuerlig och monoton.

Skillnaden mellan den nya och gamla skuldran är
`(x−1)^2 / ((x+1)*(x+3)^2) ≥ 0`. Båda är monotona och blandvikten växer,
vilket även bevisar blandningens monotonicitet. Svartpunkten är fortfarande
0, utan ny tå, svartpunktssträckning eller lokala/spatiala korrigeringar.

- **A:** verklig fryst produktions-V2, Fotografisk 2 + finish 1.
- **B:** den exakta exponeringskandidaten från #89, samma gamla kurva.
- **C, fotografisk:** B:s EV och samma kontrastparameter a=0,5, ny skuldra.
- **D, neutral:** B:s EV och samma nya skuldra, a=0. Befintlig färgfinish
  behålls även här för att isolera tonpresentation från färgexperiment.

C och D skiljer sig alltså genom en parameter i samma tonmodell. Ingen ny
mättnads-/vitbalansfunktion ingår. Neutral betyder här neutralare **ton**,
inte påstådd kolorimetrisk neutralitet eller bortkopplad färghantering.

Skuldran flyttar kompression längre ut; den tar inte bort den. Derivatan i
det vanliga övre registret är större, medan den extrema svansen komprimeras
mer. Där kan kvantiserade kanaländpunkter öka. Större separation och större
headroom är olika egenskaper och ska bedömas separat.

## Genomförande och reproducerbarhet

09/05/11 används för utveckling. Parametrarna fryses före 00/01/02/03/04/06/
08/10. Samtliga motiv är historiskt sedda. Ingen kontrollerad lågnyckel-,
natt-, tunn/tät-negativserie eller uppmätt scenexponering finns.

Det befintliga `tools/v2-tone-review.mjs` har ett uttryckligt
`--presentation PREVIOUS_OUTPUT`. I en egen browserflik installerar det
modellen vid den befintliga snabba V2-kärnans tonfaktor, utan ny inversion,
exportkodare eller användargränssnitt. Huvudplattformens vanliga TIFF-ägare
skriver C/D. De globala hookarna är endast ett isolerat experimentverktyg;
de är inte en säker produktionsintegration och laddas aldrig av appen.

A/B läses direkt från de ursprungliga ZIP-arkiven. C/D exporteras i hela
6032×4032, unsigned RGB16 med samma sRGB-ICC. Inga TIFF eller nativeutsnitt
skapas genom förstoring av preview. Översikterna reduceras identiskt från
TIFF, utan autojustering. Gamla diagnostiska regioner återanvänds; dessutom
väljs en ljus och en mörk 256×256-region **en gång på A**, inom filmrutan.
Koordinaterna är identiska i A/B/C/D. Detta är luminansbaserat ROI-urval,
inte motiv- eller hudidentifiering. Porträttens tidigare manuella regioner
behålls för hud-/klädbedömning. Alla native-PNG är RGB16, utan omskalning,
skärpning eller brusreducering.

Granskningspaketet innehåller kontaktkarta, individuella fyrkolumnsark,
matchade utsnitt, fulla recept, mätningar och manifest. De gamla A/B-
arkiven och nya C/D-arkiven länkas tillsammans; A/B laddas inte upp dubbelt.
Medföljande sammansättningsskript återskapar en gemensam katalog med alla
44 TIFF-filer och kontrollerar SHA256. Privata bilder ligger endast i privat
Drive eller utanför repositoryt. Anslutningens 100 MiB-gräns hanteras med
verifierade vanliga ZIP-volymer, som i föregående leverans.

## Bedömning och integrationsbeslut

För snö 09 håller C samma EV och nästan samma median som B men större
P99−P90-separation. D öppnar låga toner och lämnar vanligen mer marginal upptill,
men saknar C:s mellantonskontrast. Det gäller inte köksfönstrets extrema svans. Kontrollbilderna måste avgöra om det ger
en fotografisk vinst; numerisk separation är inte ensam ett kvalitetsbevis.

C är den snävaste kandidaten för fortsatt fotografisk granskning: endast
skuldran byts, låg-/mellantoner under knäet behålls. Den osäkra sceninferensen
från B är fortfarande en separat begränsning. C kan därför inte automatiskt
godkänna B som ny standardexponering. Kvantiserade färgändpunkter och den
extrema svansens separation måste också vägas in. Ingen produktionsändring
föreslås före bildgranskning; D behålls som parameterexperiment.

Om C godkänns: versionsmärk ett fryst tonrecept i befintligt RenderIntent,
lägg den gemensamma funktionen hos renderägaren och motsvarande parametrar i
befintlig GPU-shader. CPU/worker/preview/export ska konsumera samma recept,
och presentationens cacheidentitet ska omfatta det. Historiska ton-ID:n och
pixelreferenser behålls exakt. En okänd ny tonrevision ska avvisas av äldre
klienter, inte tyst återges med gammal kurva. Exponerings-/basanalys ska inte
köras om för enbart en presentationsändring. Inga nya motorval behövs.

## Mätresultat och regressionsbedömning

[Alla faktiska mätningar per motiv och variant](measurements/v2-tone-presentation-review.json).
C/D har **exakt samma EV som B**. Samtliga 44 TIFF-resultat är 6032×4032,
RGB16 och har identisk sRGB-ICC; 22 tidigare A/B-TIFF återanvänds och 22 nya
C/D-TIFF skrivs med befintlig export. 152 native-PNG beskriver samma koordinater.

|Bild|C:s P99−P90 jämfört med B|Bedömning/begränsning|
|---|---:|---|
|00 fasad|+17,6 %|Medianen ändras bara +0,0043; ljusa ytor får fler tonsteg, mindre vitmarginal|
|01 buss|+6,6 %|Liten effekt, oförändrat mellanregister; ingen ny färgkorrigering|
|02 bil/gata|0 %|Osäker rutas fallback kvar; C ändrar inte uppmätt bildinnehåll. D botar inte färgproblemet|
|03 dagsljus|+15,3 %|Bättre övre separation, mindre marginal; befintlig färgkaraktär kvar|
|04 porträtt|+17,9 %|Ljus fasad påverkas, median och lägre toner bevaras|
|05 kök/fönster|+5,0 %|Svagaste nyttan; extrema fönsterhögdagrar får **sämre marginal**, även i D|
|06 soffporträtt|+16,3 %|Försiktig ändring av ljusa partier, oförändrad median; D är mjukare|
|08 grafiskt motiv|+16,8 %|Större separation i ljusa former, men mindre vitmarginal och ärvd färgkompression|
|09 snö|+18,4 %|B:s ljushet bevaras: Y50 0,5895 → 0,5910; separation 0,02624 → 0,03108|
|10 utomhuspar|+17,7 %|Ljus klädsel får mer tonseparation; ingen reparation av äldre färgavvikelser|
|11 inomhusporträtt|+18,2 %|Median 0,5533 → 0,5535; övre tyg-/väggtoner ändras, färgreceptet är samma|

D ger för 09 Y50 0,5450 och P99-marginal 0,2762, jämfört med B:s 0,2340.
Det behåller mycket av uppljusningen mot A (Y50 0,3456) med mindre extra
kontrast. **Det är inte en universell headroomförbättring**: i 05 sjunker
P99-marginalen från B:s 0,0602 till C:s 0,0231 respektive D:s 0,0406.
Det är en konkret regression i den extrema svansen och ett skäl att avstå
från generell produktionsintegration nu.

Kanaländpunkter är här kvantiserade RGB16-värden, inte bevis för sensor-
klippning. I 09 ökar högsta kanalens ändpunktsandel på punktgallret från
0 till cirka 0,10 % för C (D cirka 0,028 %). I 05 är C:s ökning cirka
0,003 procentenheter; övriga uppmätta högsta kanalandelar ändras inte.
Nativeutsnitten och fulla TIFF behövs för att bedöma dessa avvägningar.

Editingprober använder befintlig Editing 2.0 på **verkliga RGB16-utsnitt**
(neutral, ±0,5 EV och kontrast 1,2), på identiska punktgaller. Detta är mätning,
inte dold efterjustering av jämförelsebilderna. Inmatningen är exportkvantiserad,
inte appens fulla Float64-mellanresultat. Största ändpunktsandel efter +0,5 EV
över alla ROI är A 0,81 %, B 3,15 %, C 3,32 %, D 1,59 %. Det stöder D:s
försiktigare återgivning som redigeringsgrund, men ersätter inte per-motiv-
bedömning eller ett facit för färg/hudtoner. Fler RGB16-koder bevaras i många
högdagerutsnitt; det är större digital kodseparation, inte ny sensorinformation.

Rekommendation: **C:s skuldra är bästa snäva fotografiska kandidat**, men
05:s svans och B:s kvarstående osäkra sceninferens blockerar ett generellt
standardbyte. D är en användbar neutral tonprototyp, inte ett beslutat nytt
läge. Inga parametrar ändras efter kontrollmaterialet och ingen femte variant
läggs till för att dölja regressionen. Fotografens granskning återstår.

## Profilinventering inför nästa etapp – inga profiländringar

[Fullständiga faktiska parametrar, inklusive historisk version 1,
aktiv version 2 och print styles](measurements/v2-profile-inventory.json).
Aktiva färgprofiler använder nio tonknutar, sex nyansberoende kromafaktorer,
låg-/högdagertint och i två fall matris. De gamla gamma/mix/sat/toe/shoulder-
fälten ligger kvar i objekt för kompatibilitet men används inte som extra
behandling när Creative v2 är aktiv. De är inte teknisk filmkalibrering.

|Aktuell profil|Karaktär och viktigaste parametrar|Överlapp/inspiration|
|---|---|---|
|Generisk C-41|Identitet, gamma 1, mix 0, sat/curve 1|Neutral jämförelse|
|Roadtrip 400|Kroma 1,05–1,22, djupare låga toner|UltraMax-inspirerad kreativ stil; överlappar Chroma|
|Sundown 200|Varm tint, kroma 0,92–1,18|Gold-inspirerad stil, inte mätt filmrespons|
|Sunday Best 400|Öppna mellantoner, kroma 0,92–0,96|Portra-inspiration; överlappar Softspoken|
|Softspoken 160|Mjukare tonknutar, kroma 0,88–0,93|Portra 160-inspiration; lugnare än Sunday Best|
|Afterhours 800|Tätare skuggor, varm lågdagertint, kroma 0,92–1,05|Portra 800-inspirerad stil, inget korn|
|Chroma 100|Starkare tonkurva, kroma 1,14–1,26|Ektar-inspiration, starkast färgstil|
|Daylight 100|Nästan neutral ton, kroma 0,99–1,05|Pro Image-inspiration, närmast generisk|
|Coolside 400|Grön/cyan-matris, kroma 0,96–1,18|Fuji-inspiration; överlappar Pale Green i temperatur|
|Pale Green 400|Ljusare ton, grön matris, kroma 0,88–0,92|400H-inspiration, lägre kontrast än Coolside|
|Soft Grain|Mono [0,26;0,64;0,10], öppna skuggor|HP5-inspiration, ingen kornsimulering|
|Deep Silver|Mono [0,33;0,57;0,10], djupare svärta|Tri-X-inspiration|
|Fine Tone|Mono [0,28;0,60;0,12], balanserad kurva|FP4-inspiration; tonmässigt nära Silver Light|
|Silver Light|Mono [0,23;0,64;0,13], lugnare höga toner|Delta-inspiration; annan färg→grå-vikt|
|Svartvitt neutral|Neutral monokrom referens|Ingen namngiven filmmatchning|

Print styles: **Neutral** kontrast 1/skuldra 0; **Mjuk** 0,90/0,20;
**Klassisk** 1,10/0. De arbetar efter V2, i display-sRGB, och kan förstärka eller komprimera
samma tonområden som C/D. Ändrad ingående luminans kan även byta profilens
tonintervall, tintens ljushetsvikt och kromans gamutbegränsning. Därför är
samma profil inte oberoende av tonplacering, trots oförändrade parametrar.

Framtida rationalisering: skilj tydligt mätt teknisk respons från kreativa
stilar, behåll generisk och neutral BW som referenser och granska överlappen
Sunday Best/Softspoken, Coolside/Pale Green, Roadtrip/Chroma och Fine Tone/
Silver Light innan några val slås ihop. Inga par är bevisat identiska.
Validera mot kända film-/framkallningsreferenser, stegramp, färgkarta och
hud/naturmotiv med låst capture/WB/bas. Börja med neutral print och jämför
en profil i taget, inklusive flera exponeringar. Använd mätvärden och
fotografgodkända kontaktkartor; tillverkarens kurvdiagram är inte en uppmätt
RGB-emulering. Inga profiler eller print styles ändras här.

## Körning och verifiering

```sh
FILMLABB_REVIEW_PACKAGER="$PWD/tools/v2-presentation-package.py" \
node tools/v2-tone-review.mjs \
  6e3d763cfdaad958fac7baf4d8acda3cb5e9733b \
  /private/testpaket /private/originals \
  /private/color-caches,/private/stage6-caches /private/presentation \
  09,05,11,00,06,08,01,02,03,04,10 --presentation /private/pr89
python3 tools/v2-presentation-index.py /private/presentation /private/pr89
```

Tidigare metadata räcker som cacheingång; original-RAF måste tillföras. A/B-
arkiven från #89 måste finnas tillgängliga. Bildpaketens reproduktionsanvisning
beskriver filnamn, hashar och återställning. Arbetsområdet ligger utanför Git.
Nya C/D-TIFF packas remsvis/sekventiellt och flyttas till privat artefaktlagring
för att undvika flera samtidiga stora RAW-/TIFF-kopior. Inga appberoenden tillkommer.

- Lokal fullsvit: **128/128 grupper**, 712,67 s. Befintliga referensvärden behålls.
- Riktat numeriskt test verifierar monotonicitet, kontinuitet, giltiga/extrema
  signaler, orakel mot befintlig snabb kärna och exakt lågtonsbypass för C.
- Riktad riktig Chromium/GPU-körning verifierar C/D vid −4/0/+4/+10 EV,
  huvudplattformens TIFF-ägare och noll RGB16-kodfel mot samma CPU-kärna.
- Befintliga sparade RAF-punktöversikter 09/00/11/08/06 körs separat genom
  båda kandidaternas CPU/GPU-vägar: högst **en RGB8-kodnivå**. Detta är ingen
  fullupplöst GPU-export eller fysisk iPad-verifiering.
- Pre-gamut multipliceras alla kanaler med samma positiva faktor: kromatiska
  kvoter bevaras. Slutlig kroma kan ändå ändras när den oförändrade gamut-
  och finishbehandlingen får högre/lägre luminans. Det mäts i riktiga TIFF.
- Tonkurvan kan förstärka befintligt korn tillsammans med lokala tonsteg.
  Inget korn skapas, jämnas ut eller skärps. Kodseparation i RGB16 är inte
  ny optisk information och reparerar inte klippta RAW-signaler.
- Projekt, cache, Editing 2.0, övriga motorer och gamla V2-algoritmer omfattas
  av befintlig fullsvit. Experimentets mål/parametrar lagras i gransknings-
  manifest, aldrig som nya tysta projektinställningar.

Slutlig CI för den exakta PR-committen och bildpaketens verifierade privata
nedladdningar redovisas i PR:n. Ingen fysisk iPad Safari eller Windows Edge,
kolorimetrisk färgreferens eller oberoende nattserie har verifierats här.
