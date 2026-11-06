# Reproducera FILMLABB-testet

Detta är fristående testkod. Den ändrar inte FILMLABBs produktionsfiler och skickar inga PR:er. Alla Drive-original behandlas som read-only. Testresultat skrivs till en separat lokal `results`-mapp.

## Innehåll

- `manifest.json`: 12 filer, Drive-ID, exakta byteantal, SHA-256, metadata, basregioner och beräkningsversioner. 06/07 är samma innehåll; 07 konverteras inte separat.
- `summary.csv` och `results/summary.json`: samlade slutresultat. Y-värden är linjär display-sRGB, inte gammakodade medelvärden.
- `results/*_decode.json`: verkliga A-inställningar/RAW-recept och V2-avkodning.
- `results/*_analysis.json`: manuellt mätt slutlig bas, kvalitet, faktisk JS-intent, mask, 6400 pixelprover och regionkänslighet.
- `results/*_rejected_roi_analysis.json`: underkända basregioner. Använd inte dessa som huvudtest eller som faktisk filmkalibrering.
- `results/*_metrics.json`: kontroller, E1/E2/E3 och tekniska mått.
- `results/*_official_B_statistics.json`: mått från de oförändrade JS-modulernas verkliga RGB16-previewexport.
- `results/frozen_parameters.json`: slutliga frysta parametrar. Fit: 00/01/02/06. Validering: 09/10. Övriga är kompletterande utvecklingsbilder.
- `results/*_technical_linear_rec2020.npz`: reducerad teknisk positiv före ton/display, inklusive källans loggolvsbeteende. Den har headroom och ska INTE öppnas som sRGB-JPEG. Ogiltiga/lågsignalpixlar kan ge extrema tekniska värden; se flaggor/prover.
- PNG: jämförbara exporter/försök med samma source crop. A/B/E3 och övriga varianter finns för alla unika bilder. B:s 16-bitars previewvärden sparas även som `.rgb16`, interleaved little-endian RGB16 med sRGB-transfer; dimensioner i analys-JSON.
- `report_assets`: orienterade JPEG-jämförelser och kontaktkartor för snabb läsning. JPEG är endast visning; PNG/RGB16/TIFF behålls separat.
- `results/shared_base.json` och E4-bilder: uttryckligen hypotetisk skanningsgrupp, ingen verifierad filmrulle.
- `results/*_neo_recipe.json`, `*_neo_settings.json`, `*_Neo_core.png`: original NegativeConverter SilverCore, explicit core-only-referens. Inte full Neo-appstandard.
- `results/export_manifest.json`: hash, dimensioner, bitdjup och ICC för fullupplösta TIFF-filer i det separata exportarkivet.

## Miljö

Node 24.22.1; Playwright enligt FILMLABBs package-lock. Browser: Chromium 153.0.8010.0 i detta test. Python-paket är versionslåsta i `experiment/requirements.txt`. Native RAW-kontroll/Neo-indata: rawpy 0.27.1, LibRaw 0.22.1. FILMLABBs verkliga huvudavkodning är libraw-wasm 1.6.0.

## Förbered källor och original

Arbeta i en ny testkatalog. Hämta repositoryt till `source` och NegativeConverter till `neo`. Använd exakt dessa commits:

```bash
git clone https://github.com/AxelTidehorn/negative-studio.git source
git -C source checkout da3fe84a0fef0bb139602ca4ad998ede24e10538
npm ci --prefix source
npm --prefix source run build
git clone https://github.com/lexluthor0304/NegativeConverter.git neo
git -C neo checkout 324c2daefada7d8d8c783719f62bf7f27320349a
python -m pip install -r experiment/requirements.txt
```

Originalen ingår inte i arkivet. Hämta dem från de auktoritativa Drive-ID:na i manifestet och placera kopior som `originals/<DRIVE_ID>.RAF`. Behåll båda ID:na för namnlikadana filer. Kontrollera byteantal/SHA-256 före beräkning; `experiment/check_originals.py` gör detta utan att ändra filerna.

Installera eller välj lokal Chromium/Chrome och sätt `FILMLABB_CHROMIUM_BIN` till dess absoluta binärsökväg. Testmiljön behövde alternativ Chromium-distribution eftersom den vanliga Playwright-nedladdningen misslyckades; detta påverkar inte konverteringsmatematiken. Webservern i testharnessen binds endast till 127.0.0.1.

## Körning

```bash
python experiment/check_originals.py
python experiment/inventory.py
node experiment/run.mjs
python experiment/batch.py analyze 0,1,2,3,4,5,6,8,9,10,11
python experiment/freeze.py
python experiment/batch.py experiment 0,1,2,3,4,5,6,8,9,10,11
python experiment/crop_stability.py
python experiment/shared_base.py
node experiment/stale_intent.mjs
node experiment/verify_actual_export.mjs
node experiment/full_exports.mjs 0,4,9,10
```

`run.mjs` hoppar över original där `_decode.json` redan finns. För en full omkörning ska befintliga resultat först läggas i en separat arkivkatalog, så att ingen tidigare körning skrivs över av misstag. Analysskriptet använder slutliga, visuellt kontrollerade filmkantsregioner - inte de underkända första regionerna. För numerisk paritet är transmissionens loggolv 1e-8 avgörande; porten använder samma golv som JS-kärnan.

För Neo-core-referensen, kör 00, 04 och 09 var för sig:

```bash
OMP_NUM_THREADS=4 python experiment/neo_decode.py 0
node experiment/neo_core.mjs 0
```

Byt index för nästa original. Detta kör de faktiska adaptermodulerna i den låsta Neo-committen, men inte appens senare rescue/adjustmentsteg. Källfärgrymd/gamma/WB skiljer från V2 enligt recipe-JSON.

Rapport och sammanställning:

```bash
python experiment/summarize.py
python experiment/assets.py
python experiment/report.py
```

`assets.py` använder små faktiska negativa orienteringspreviews. De återfås från RAF/linjär källa med inventerings- och previewstegen; arkivet innehåller redan dessa små previews. `inventory.py` packar upp alla 12 original, hashkontrollerar och extraherar kamerans inbäddade JPEG enbart för kontaktkarta. Ingen inbäddad JPEG används som ersättning för konverteringsdata.

## Exporternas upplösning och orientering

Fullupplöst A-TIFF finns för alla 11. För 00/04/09/10 finns dessutom fullupplöst B-technical, B-fixed, B-auto och E3. Samtliga är RGB16 med sRGB ICC; technical-TIFF är en uttrycklig visning av teknisk positiv, inte linjär Rec.2020-lagring. Originalets apporientering bevaras i TIFF. I rapporten roteras sidliggande bilder 90 grader medurs för alla motorer, utan annan geometri eller kreativ ändring. Normaliserade crop-koordinater och rotationsbeslut finns i manifestet.

Bilderna har nära kvadratiska filmrutor och bör inte sträckas till 3:2. Samma faktiska A-exportcrop används för motsvarande B och experiment. Automatisk A-crop kan inkludera en tunn film-/hållarkant. E1:s beskärningskänslighet är mätt separat; det finns ingen garanti för godtycklig cropinvarians.

## Viktiga tolkningsgränser

En ökad luminansmedian är inte ett mått på bättre fotografi. Ingen färgkort-/spektralreferens finns, så Delta E mot A/Neo är inte ett noggrannhetsmått. Filmtyper/rullar är okända. Snöbilden är ingen nattbild. Den frysta E3-gainen är en kontrollerad hypotes och klarar inte alla motiv. Läs den tekniska analysens regressionsbeskrivning innan någon produktionsändring görs.
