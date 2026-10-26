# Beta 6 – kvalitetskorrigering och arbetsflöde

Bas: main `51f9d77`, inklusive PR #16–19. Ingen redigeringsmotor 2.0, ny
färgmodell, brusreducering, oskärpa eller automatisk desaturering införs.

## Rapporterade blåvioletta RAF-prickar: status och evidensgräns

**Orsaken till de rapporterade prickarna är ännu inte fastställd. Denna PR gör
inte anspråk på att ha åtgärdat dem.** `_DSF8951.RAF` och `_DSF8983.RAF` bifogades,
men båda avvisades av arbetsmiljöns överföringsverktyg eftersom varje fil är
större än 32 MiB. Ingen av dessa originalbilder har kunnat avkodas, beskäras eller
jämföras här. Delade, förlustfria arkivdelar kan senare återskapa exakt samma
original; ett nedskalat JPEG-prov kan inte ersätta RAW-undersökningen.

Den bifogade `FILMLABB_Redigeringsmotor_2_0_Forstudie.md` har lästs som
hypotesunderlag, inte som instruktion att bygga den föreslagna motorn. Dess
kodbas är samma main, `51f9d77`. Relevanta hypoteser är tidig RAW-/ICC-klippning,
låg transmission före logaritm, respons/tonnormalisering, mättnads-/profilklippning
samt olika precision och sampling. Föreslagna 2.0-tonkurvor, OKLab/gamut mapping,
lokala filter och nya reglage implementeras inte.

### Utförd jämförelse

1. `2773bb9` (stabiliserad Fix 11/PR #16) jämfördes med `51f9d77` och denna PR.
   `raw-input.js`, `raw-decoder.js`, `render-core.js`, `image-model.js`,
   `color-calibration.js`, `color-analysis.js`, `color-management.js`,
   `creative-profiles.js`, `flat-field.js`, `source-analysis.js`, `beta4.js`
   och `gpu-renderer.js` är oförändrade. Paket och låsfil anger samma LibRaw/WASM
   1.6.0. Beta 6:s ändringar har främst kopplat geometri, transport och preview.
   Detta bevisar inte att en äldre, ännu ospecificerad revision såg likadan ut.
2. Repositoryts **syntetiska 64×48 DNG** avkodades med faktisk LibRaw/WASM i
   `reference`, `protected` och `wide`, med samma optioner. Nuvarande och
   historisk konverterare samt pixelkärna jämfördes med identisk kalibrering och
   inställningar. Samtliga källvärden matchade jämförelseversionen (inte de andra RAW-lägena); 768 jämnt fördelade prov per läge
   gav **maximal färgdifferens 0**, inga icke-ändliga resultat och inga klippta
   eller negativa omvandlingsvärden i just denna fixtur.
3. Ett oberoende syntetiskt matrisfacit verifierar att protected-läget kan kapa
   negativa sRGB-kanaler till noll före densitetsberäkningen. RGB läses korrekt
   före skrivning till den befintliga bufferten; provet visar inget kanalordnings-
   eller aliaseringsfel i in-place-konverteringen.
4. Syntetiska prov verifierar logaritmens golv vid 1/65535 och att samma lilla
   transmissionsstörning får större densitetseffekt nära noll än vid högre
   transmission. Detta är en uppmätt mekanism, **inte en identifiering av
   användarens prickar** eller belägg för att ett klippningsställe ska tas bort.
5. Presentationssamplerns linjära displayinterpolation ger ändliga värden inom
   grannarnas kanalgränser även vid dessa låga transmissionsvärden. Den kan
   sprida/visa befintliga färgutslag men provet visar ingen interpolationsöversläng.
   Befintliga CPU/GPU-, JPEG/TIFF- och RAW-regressioner körs också.

| Stadium | Slutsats från tillgängliga belägg | Kvar att mäta på RAF |
| --- | --- | --- |
| LibRaw/demosaik | Samma version och optioner, faktisk DNG-avkodning verifierad | X-Trans/kameradata, WB, mönster kring misstänkta pixlar; DNG är inte RAF |
| RAW-normalisering | Samma gemensamma gain och matris; negativkapning kan reproduceras syntetiskt | Om misstänkta pixlar har klippta/nära-noll kanaler och var detta uppstår |
| Densitet/respons | Samma kärna; småfel kan förstärkas vid låg transmission | Samma sparade/uppskattade kalibrering och analysram på båda versionerna |
| Profil/mättnad | Befintliga clamps kända från kod/förstudie, inga ändringar här | Neutral profil mot användarens verkliga inställningar |
| GPU/CPU | Befintliga precision/paritetsprov och ny neutral kopieringskontroll passerar | Samma original-ROI i båda backends före geometri/JPEG |
| Geometri/JPEG | Neutral export behåller direktvägen; interpolation överskjuter inte i riktat prov | Originalpixlar, finvinkel och JPEG före/efter kvantisering i rapporterat område |
| Filmkorn/brus | Ingen klassificering görs utan original/ROI | Jämför rumsligt mönster i demosaikad transmission och positiv, helst även råsensorreferens |

En LibRaw-RGB-kanal på 65535 är inte ensam bevis för sensorklippning: även
vitbalans/färgomvandling kan ha påverkat den. Att all aktiv kärnkod är identisk
utesluter inte olika inställningar, responsdata, profiler, analysramar eller
RAW-lägen. Fix 11 används som dokumenterad jämförelsebas, inte som verifierat
felfri version för just dessa RAF.

### Reproducerbar fortsatt undersökning

Efter `npm ci` och `npm test` (som packar upp testharnessen), med Git-historiken
inklusive jämförelsecommit tillgänglig:

```sh
FILMLABB_SAMPLE_LIMIT=100000 node tools/inspect-raw-artifacts.mjs /path/_DSF8951.RAF /path/_DSF8983.RAF > /tmp/raf-diagnostic.json
```

Verktyget ändrar aldrig originalen. Det rapporterar input-SHA, kodhashar,
dekoder/läge, faktisk källkonverteringsdifferens, analysram/kalibrering,
begränsat provurval, noll/låga kanaler och maximal färgdifferens. Dess enkla
blå/violett-kandidatmått är uttryckligen en sökhjälp, inte en artefakt-/brusdetektor.
`FILMLABB_BASELINE` kan ange en annan commit med samma calibrated4-kontrakt.
En verkligt äldre annan motor kräver jämförbara parametrar och separat tolkning.

Nästa steg när originalen är åtkomliga: fastställ ett misstänkt original-ROI och
en faktiskt fungerande äldre version, lås alla inställningar, jämför avkodad
transmission → matris/klippning → densitet/respons → profil → CPU/GPU → sampling
→ JPEG/TIFF. Behövs en större färg-/gamutmodell ska den föreslås separat, inte
döljas i denna arbetsflödes-PR.

## Verifierad korrigering: onödig neutral preview-omsampling

Ett separat fel reproducerades på main, utan RAF eller färgantaganden:

- Källa 900×600, 0°, null komposition, exportens filmrutebegränsning av.
- Färgrenderaren begränsad till 240×160, motsvarande lågupplöst interaktiv preview.
- Presentationspasset skapade ändå 900×600 och körde ny bilinjär färginterpolation.

Nu begränsas presentationsupplösningen även av den faktiska färgcachen.
Samma fall ger **240×160 → 240×160**. Neutrala helbilds-/kvartvarvsvägar kopierar
cachens kodade pixlar direkt i GPU/CPU, utan extra sRGB-avkodning/interpolation/
återkodning. Ett oberoende färgat schackmönster ger **maximal byteavvikelse 0**
för alla fyra kvartvarv. Fri rotation/komposition behåller den befintliga
linjära displayinterpolationen. Detta är inte oskärpa, brusreducering eller en
ny färgmodell, och ska inte tolkas som en bevisad lösning på RAF-prickarna.

Exportens algoritmer, originalupplösning och direkta 16-/8-bitarsvägar ändras inte.
CSS-storlek, källkoordinater, analys och kompositionsgeometri är också oförändrade;
preview kan bara inte uppfinna högre rasterupplösning än sin cache.

## Arbetsflöde

Sidopanelen visar nu i ordning:

1. **Filmruta · analysområde**, kompakt och tillgänglig före redigeringen.
2. Histogram, grundreglage och kreativ profil.
3. Frivillig **Rotation & komposition**, hopfälld från början.
4. Avancerade tekniska inställningar.

Arbetsstationslayouten med separat bildyta och sidopanel behålls. Status för
filmrutan finns i den tidiga sektionen. Kövalets hjälptext förklarar att synliga
filmkanter kan behållas utan att ingå i färganalysen. Befintlig detektering vid
import och uppdaterad analys efter manuell filmruteändring är oförändrade.

Nya bilder börjar med 0° kvartvarv/finrotation och null komposition; inget
upprätningskommando körs automatiskt. Att rotera aktiverar ingen komposition.
Att återställa rotation raderar ingen komposition. Att spara/återläsa projekt
respekterar tidigare uttryckliga val och migrerade äldre projekt. Köbegränsning
är fortsatt en egen sparad bool som ärvs av nya bilder; analysområdet påverkas
inte av att exporten behåller filmkanter.

## Verifiering

Riktade nya prov: `test/color-boundary-investigation.mjs`,
`test/quality-workflow-browser.mjs`, utökad `test/preview-geometry.mjs`.
Befintliga ordningsprov har uppdaterats till filmruta före histogram, utan att
lätta pixel-/färgtoleranser. Verktyget har körts på den syntetiska DNG-fixturen;
original-RAF är ännu inte lästa på grund av överföringsgränsen.

Fysisk iPad och installerad Edge kan inte ersättas av Chromium-emulering.
Kontrollera där filmrutedrag, färgreglagens känsla, bildbyte, återöppnat projekt,
behållna filmkanter, frivillig geometri och lång JPEG/TIFF/batch-export.


### Slutresultat

- `npm ci`: godkänd installation.
- `npm test`: **33/33 Node-grupper godkända**.
- `FILMLABB_CHROMIUM_BIN=/usr/bin/chromium npm run test:browser`:
  **8/8 browsergrupper godkända**.
- `npm run build` och `npm run test:build`: godkända.
- `node --check` för ändrade JS-moduler och diagnosverktyg: godkänt.
- Faktisk LibRaw/WASM på syntetisk DNG, tre lägen, historisk/current:
  källdifferenser 0, maximal färgdifferens 0, inga icke-ändliga resultat.

Inga nya automatiska testfel. Den rapporterade RAF-artefakten är fortfarande
oreproducerad i denna miljö, och klassificering som filmkorn/brus/programartefakt
kan inte göras från dessa syntetiska prov. Känd gammal downscaling-aliasing (#8)
och behov av verklig iPad/Edge-verifiering kvarstår.
