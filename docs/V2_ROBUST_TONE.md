# V2: robust tonplacering och aktuell analys

> Etapp 1:s aktuella färgbalans, automatiska analysfilmruta och nya RAF-verifiering beskrivs i [V2_STAGE1_IMAGE_QUALITY.md](V2_STAGE1_IMAGE_QUALITY.md). Resultat och begränsningar nedan avser den tidigare versionen när annat inte anges.

Arbetsgren `feat/v2-robust-tone`, baserad på senaste V2 i öppna PR #36:
`da3fe84a0fef0bb139602ca4ad998ede24e10538`. PR #36 och dokumentations-PR #37
var båda öppna och inte mergade när arbetet började. Ingen motorkod hämtades från
rapportgrenen. [Teknisk analys i PR #37](https://github.com/AxelTidehorn/negative-studio/blob/docs/filmlabb-v2-evaluation-2026-10-28/docs/filmlabb-v2-evaluation-2026-10-28/Teknisk_analys.md)
lästes tillsammans med testkod, arkivdata och hela PDF-rapportens text.

Ändringen gäller bara V2:s tonanalys/invalidation och nödvändig diagnostik/
områdesbekräftelse. Densitetskärna, filmrespons, färgkorrigering, filmbasdetektor,
RAW-recept, äldre projekt och vanliga motorer ändras inte. `fast.js` behöver
ingen ny pixelmatematik: dess befintliga gemensamma exponeringsgain används.
`technical` och `fixed` har oförändrad pixelberäkning. Inget publiceras till
produktion eller befintlig V2-preview från denna gren.

## Aktuell analys vid accept, reuse och undo

Tidigare körde `worker.parameters()` bara analys om intent saknades. Ny bas
kunde därför få gammalt baseId, gammal median och gammal exponeringsplacering.
Nu jämförs en exakt privat signatur av källdeskriptor/revision, numerisk bas, uppmätt/prior-ursprung och
domän, hela kalibreringen, analysområde/status, maskläge och analysversion.
En offentlig fingerprint i diagnostiken är endast en identifierare; den används
inte för korrekthetsbeslut. Signaturen innehåller inga bildpixlar och exporteras
inte med potentiell receptmetadata.

Ändrad bas i accept/reuse/undo skapar aktuell analys innan ny preview/export.
Källbyte återställer intent, signatur, mask och analysområde. Kalibrerings-
identitet/revision/parametrar och analysområdesbyte ingår i invalidationen.
Kreativ crop, rotation, zoom, visningsstorlek och B-visningsläge ingår inte.

Identiska RGB-basvärden med samma uppmätt/prior-ursprung ger ingen ny tonmätning trots nytt BaseReference-id:
metadata binds till den aktiva basens id, medan analysresultatet återanvänds.
Samma område/maskläge och samma källa/kalibrering återanvänder också resultatet.
`performance.toneAnalysisCount` gör detta testbart. UI:s explicita uppdatering
räknar inte om identiska indata och bevarar då även previewcache samt legacy-analys. En basändring fryser fortfarande filmresponsen,
men fryser **inte längre en felaktig tonanalys**.

## Filmruta och fallback

Analysområdet är en separat källförankrad rektangel. Under **Avancerat**:

1. Ställ det gemensamma utsnittet så att hela fotografiska filmrutan ingår och
   hållare, perforering, filmbas och angränsande rutor lämnas utanför.
2. Kontrollera med **Visa utsnitt** och klicka **Bekräfta aktuellt utsnitt som analysfilmruta**. I fotografiskt läge
   är den riktiga A-exportens filmruta det initiala gemensamma utsnittet;
   kontrollera det visuellt före bekräftelse.
3. Därefter kan du beskära, zooma och rotera fritt utan ny exponeringsanalys.
   Bara ny uttrycklig områdesbekräftelse flyttar analysrutan. Basbyte analyserar
   om inom samma sparade ruta.

Ingen ny detektor införs och befintlig automatisk A-crop upphöjs inte till en
säker filmruteidentifiering. **Utan användarbekräftad analysfilmruta är gain 1,
alltså 0 EV-fallback.** Detta är ett avsiktligt synligt beteende: förbättrad
robust autoexponering aktiveras efter områdesbekräftelsen. Fallback och
bekräftelsebehov visas även utanför den expanderade diagnostiken.

Befintlig kant-/hållarmask och signalflaggor används inom rektangeln utan ändrad
filmbasdetektion. Högst 24 000 originalprov används. Prov utanför området,
invalid/loggolv och i content-läget klippta/heuristiskt exkluderade prov räknas
separat. Minst 16 giltiga prov och 5 % giltig andel inom området krävs.
Masken är fortfarande heuristisk; en felaktigt bekräftad ruta kan ge fel ton.
**Hela analysområdet** är ett explicit motexperiment med bibehållen områdesgräns.

Fallback-orsaker: obekräftat/ogiltigt område, otillräckliga giltiga prov, ogiltiga/
omkastade/icke-positiva percentiler och exponeringsförslag utanför den numeriska
gain-envelope nedan. Ingen fallback återanvänder föregående bilds eller basens
exponering. Område, status, provräknare och skäl följer med diagnostiken.

## Fryst experimentrecept

`robust-p60-highlight-1`, parametrar frysta i
[measurements/v2-robust-tone-freeze.json](measurements/v2-robust-tone-freeze.json)
före bildbedömning av 09/10:

```
target = 0.25
highlightCeiling = 3
e_mid = target / P60(Y)
e_hi = highlightCeiling / P99(Y)
e = e_mid / sqrt(1 + (e_mid/e_hi)^2)
EV = log2(e)
```

Y är linjär Rec.2020-luminans hos den tekniska positiven. Percentiler använder
befintlig deterministisk floor-order-statistik. Formeln beräknas i logdomän utan
kvadrering av ett möjligt enormt gainförhållande. Begärd EV kommer från e_mid;
applicerad EV inkluderar mjukt P99-skydd. P99-gain är ett mjukt villkor, inte
oberoende kanalbegränsning eller garanti mot klippta RGB-värden.
Reinhard och outputtransform är oförändrade. P60-målet gäller före Reinhard,
inte slutlig median-Y.

+1 EV-klippet är borttaget. Ett brett **±16 EV giltighetsintervall** används
som guard mot extrema gainförslag och amplifiering av felaktiga områden/
signaler; utanför det används uttrycklig 0 EV-fallback, ingen hård klampning
till en fotografisk look. Gain 2^16 motsvarar hela 16-bitars inmatningens
kodvärdesomfång. Detta är en konservativ implementationsgräns, inte bevis för
ett fysikaliskt giltigt gain eller en universellt validerad bildpolicy.

Target 0,25 och högdagernivå 3 är **experimentvärden**, inte färdigvaliderade
universella defaults. Rapportens target 0,12 vid P99/P50>40 aktiveras inte:
grenen var oprövad och skulle inte vara nattigenkänning. Ingen E3_frozen,
gray-world eller ny kanalrespons införs. Inga parametrar justerades efter 09/10.

## Diagnostik

`filmlabb.local-diagnostic` behåller schema version 1 med methodVersion 3.
`render` och `tonePlacement` anger receptversion, P50/P60/P99, target,
önskad EV, P99-gränsens EV, mjukt beräknad EV, applicerad EV,
högdagerreduktion, fallback, källförankrat område/status och analysfingerprint.
Aktuell provstatistik särredovisas. Vid fallback är högdagerreduktionen inte
märkt som ett applicerat ingrepp. Saknade/ogiltiga tal blir null.

Den läsbara tabellen och sammanfattningen visar samma värden. Median före/
efter exponering och ton finns kvar. Äldre `remainingTo18PercentEV` är endast
en namngiven medianreferens; det är inte det nya P60-målet. Source/filmbas/
kalibrering och signal-/klippningsmått behåller sina separata ansvar. Ingen ny
pixel-/EXIF-/GPS-/serienummer-/sökvägsdata läggs i diagnostiken.

## Faktisk åtkomst och återanvänd bildverifiering

Den anslutna Google Drive-integrationen användes för [den angivna privata mappen](https://drive.google.com/drive/folders/1SYBzKzfLnPt9vIM5Fan3tb3YvGkrTBuB), inte anonym publik åtkomst. Mappen kunde listas och
alla fem ZIP-filer plus PDF hämtades. ZIP-filerna packades upp tillsammans:
**exakt 399 unika filer**. GitHub-mappen i PR #37 kontrollerades som ett
ofullständigt utdrag, inte ett körbart fullpaket. Bilder/privata originaldata
har inte lagts i detta publika repository.

Arkivet innehåller sparade A/B/E1-bilder, statistik, reducerad teknisk positiv
NPZ och 80×80 ursprungliga linjära källpixelprover per bild. Det innehåller inte
RAF eller fulla linjära negativa bildbuffertar. Ingen ny RAW-avkodning eller
hela den tidigare utvärderingen kördes.

Tre kontroller gjordes med det befintliga materialet:

1. Nya JS-formeln på arkivets **ursprungliga fullbildspercentiler** reproducerar
   E1:s EV för alla elva bilder inom 1e-12. Target 0,25 gäller samtliga.
2. Nya kärnan/analysen/rendern kördes på varje bilds **80×80 originalpixelgrid**.
   Den tekniska positiven matchar sparade kärnvärden inom 1e-12. Ny och gammal
   intent renderades på samma prov; detta är en faktisk kodkontroll, men gles
   sampling utan spatial filtrering/full upplösning.
3. Sparade A/B-auto/E1_robust-bilder bedömdes för porträtt 04/06, kök 05 och
   reserverade 09/10. E1 är en redan exporterad experimentbild med samma
   formel, inte en påhittad ny fullupplöst export från denna gren.

Faktiska nya CPU-renderingar på **samma 80×80 källprov**:

| Bild | Gammal EV | Ny EV | Median linjär display-Y före → efter |
|---|---:|---:|---:|
| 04, porträtt | +1,00 | +3,486 | 0,03293 → 0,16022 |
| 05, kök/fönster | +1,00 | +2,564 | 0,03275 → 0,09098 |
| 06, soffporträtt | +1,00 | +4,225 | 0,01841 → 0,14925 |
| 09, snö/validering | +1,00 | +1,962 | 0,08767 → 0,15770 |
| 10, utomhuspar/validering | +1,00 | +3,430 | 0,03675 → 0,17052 |

Porträttens ansikten, kläder och soffans skuggor blir mer synliga. Cyan/blått
kvarstår tydligt; förbättrad luminans är inte förbättrad färgkalibrering.
Bild 09 förblir starkt blå och ger inget färg-/snöfacit. 10 blir ljusare men
färgbalansen förblir felaktig. Parametrarna var frysta före denna bildgranskning;
ingen efterjustering gjordes. 09/10 är återanvända reserverade bilder från en
publicerad utvärdering, inte ett nytt tidigare osynligt oberoende dataset.

I sparad fullupplöst statistik för kök 05 är begäran **+3,45465 EV** och
mjukt applicerat **+2,66523 EV**, alltså **0,78942 EV** högdagerreduktion.
Arkivets linjära display-P99 är 0,4300 för robust E1 mot 0,4968 för ren
medianplacering (E1_median). Mjuk begränsning skyddar alltså i jämförelse med
obegränsad placering. Den gamla B-auto är mörkare: P99 0,3333.
Luminansens P99–P90-separation är 0,19292 före och 0,15466 efter E1.
Blå högvärdesandel **ökar från 0,228 % till 2,873 %** i arkivets E1.
Det är en redovisad regression, inte ett klippningsfritt färdigt resultat.

Den nya area-/maskanalysen på 80×80-grid skiljer sig från arkivets fulla
percentiler med upp till **0,27731 EV** (06). Vid explicit analysrute-inset
0/2/5 % är största EV-spännvidden **0,21017 EV** (05), jämfört med rapportens
separata 200×200-originalgridtest på högst 0,160 EV. Metoderna är olika och
siffrorna bevisar inte förbättrad beskärningskänslighet. Däremot är kreativ
crop/rotation/zoom numeriskt invariant när analysrutan väl är sparad.

Fullständiga maskinläsbara mått finns i
[measurements/v2-robust-tone-replay.json](measurements/v2-robust-tone-replay.json).
Reproduktion, utan att ändra arkivets bilder eller köra RAW-utvärderingen:

```
node tools/validate-v2-tone-archive.mjs /path/to/testpaket report.json
# Valfri lokal 80x80 PPM-export av aktuella källprov, håll bilderna privata:
node tools/validate-v2-tone-archive.mjs /path/to/testpaket report.json /private/point-previews
```

## Automatiska tester och återstående kontroll

- `conversion-v2-tone.mjs`: mjuk formel/P99-villkor, exponering över +1 EV,
  statistiska/områdes-/gain-fallbacks, semantiska nycklar, kalibreringsrevision,
  oförändrad kreativ geometri, ±12 EV pixeloracle, tre lägen och area/RGB16.
- `conversion-v2-tone-browser.mjs`: riktig worker accept/reuse/undo, identiska
  basvärden utan ommätning, aktuellt baseId, områdesbyte, crop-invarians,
  faktisk TIFF mot CPU-intent samt synlig fallback/bekräftelse.
- Befintliga tester för densitet, respons, automatdetektor, teknisk/fixed,
  privat metadata, originalappens fotografiska A, workers/cache/cancel,
  JPEG/TIFF/ICC, produktionsmotorer och äldre projekt körs fortsatt.
- Full regression: **86/86 testgrupper passerade**, 882,83 s. Build passerar. Sista diagnostik-/fallback-textförtydliganden och null-hantering verifierades dessutom med riktade numeriska och browserkörningar.

Återstår: ny fullupplöst RAF→browser→export-kontroll av **denna gren** på
samma bilders faktiska källbuffertar och bekräftade filmrutor, fysisk iPad Safari/
Windows Edge samt kontroll av fönster-/kanalhögdagrar och brus på originalnivå.
De sparade glesa proven/NPZ kan inte ersätta fulla negativ för den kontrollen.
Ingen ny nattverifiering påstås: **nattserie saknas**. Targets, gain-envelope och
områdespolicy behöver bredare validering före generell release.
