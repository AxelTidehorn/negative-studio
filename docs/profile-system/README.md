# FILMLABB 3.0: en aktiv presentationskedja

Bas: main `023b208f5e8a4fa772718b49b79a9cf0883e4fd6`, inklusive mergad
PR #89. D återanvänds; dess exponering, kontrast 0, rekonstruktion och tonrecept
ändras inte. Work-underlagets uppgift att #89 är öppen är historisk.

## Kontrakt och ordning

Teknisk negativkonvertering → befintlig positiv balans/ton/gamut/finish →
**kodad sRGB/D65 float** → fotografisk profil eller neutral monokrom presentation
→ Editing 2.0 → gemensam geometrisk sampling → JPEG/PNG8/PNG16/TIFF16.

`profile-engine.js` äger en ren operator, `profile-catalog.js` de aktiva data,
`profile-controller.js` den befintliga kortytans väljare. `engine-selector.js`
äger det flyttade motorvalet. Ingen profil analyserar källan eller ändrar bas,
kalibrering eller V2:s RenderIntent. Profilbyte återanvänder positivcachen;
slutrendering/export nycklas på look och monokrom presentation.

Katalogen genereras med `node tools/generate-profile-catalog.mjs` från den
bifogade Work-JSON:ens **start**-värden. `--check` kontrolleras i test. En explicit
aktiveringslista innehåller Gold 200, Ektar 100, Fujifilm Pro 400H och Kodak
Portra 400. Alla fyra är fotografiska
**prototyper**, inte uppmätta emulsionssimulationer. Forskningsposter aktiveras
inte automatiskt. Katalogens presentation/kategori/operator/revision skiljer
filmkaraktärer från framtida kreativa uttryck och monokrom presentation.

Färgoperatorn följer Work §3: OKLab/OKLCH, monotont PCHIP i perceptuellt L,
periodisk halvcosinusinterpolering över h, kromatik över h och L, neutrala/
hudliknande färgregioner, toningsvektorer och linjär sRGB-neutralaxelprojektion.
Den blandas **en gång i kodad sRGB**, före Editing 2.0. Neutral och styrka 0
returnerar ingången exakt. Hudskydd är en fast färgregion, inte ansiktsdetektering.

CPU återanvänder Editing 2.0:s befintliga matriser, PCHIP, transfer och gamut.
GPU använder samma matriser och CPU-kompilerade PCHIP-koefficienter i befintligt
WebGL2-pass. Native shader-sin/cos kunde förstärka ett litet riktningsfel vid en
mörk gamutgräns. GLSL roterar därför ursprungligt a,b direkt; nollrotation är
exakt och små vinklar beräknas med en serie vars restled ligger under float32-
precision. Det ändrar inte Work-parametrar eller den matematiska operatorn.
Ingen LUT, ny GPU-pass eller fullstor mellanbild införs.

## Svartvitt

`monochrome` är separat från kreativ profil och teknisk källa. Neutral svartvit
beräknar **linjär positiv sRGB-luminans** `Y=.2126R+.7152G+.0722B`, kodar Y och
replikerar gråvärdet före Editing 2.0 i monoläge. Ingen separat kreativ kurva,
rå-RGB-medelvärdesbildning, gamma-kodad kanalviktning eller dubbel monokromisering.
Filmbasnormalisering och negativrekonstruktion görs först i respektive motor.

Det tidigare BW-profilvalet kunde även koppla bort delar av Standards tekniska
kromatikhantering och påverka gamma-kodade kanalblandningar. Den kopplingen är
borttagen. All färginformation behålls till det definierade positiva stadiet;
monokrom presentation ändrar sedan inte dess linjära luminans utöver slutlig
kvantisering. Manualfärg i monoläge neutraliseras enligt Editing 2.0:s kontrakt.
Detta är ett avsiktligt byte av den gamla BW-estetiken, inte en kalibrerad ny
svartvit filmrespons. Tekniska färg-Neutral-resultat ska däremot vara oförändrade.

Framtida BW-data ska använda samma katalogmetadata (`id`, `presentation`,
`category`, `operator`, `revision`) men en separat monooperator. Tonkurva,
svart-/skugg-/högdagerparametrar, positiv-linjär färg-till-grått-mix och toning
kan då lagras som versionsmärkta parametrar. Korn hör till en separat framtida
operator. Inga påhittade HP5/Tri-X/FP4-poster eller sådana spektrala löften finns
kvar i körkatalogen. Denna PR implementerar bara neutral monokrom presentation.

## Projekt, kö och version

Enda accepterade yttre projektformatet är `filmlabb-roll-3`, med rollgemensamt
`look:{id,strength}` och `monochrome`. Val och tal valideras före mutation,
inklusive ogiltiga/inärvda objekt-ID:n. Gamla dokument avvisas uttryckligen;
ingen migrering, v1/v2-lookdispatch eller print-fallback finns i appen.
Befintliga tekniska V2-, Editing- och geometrivaliderare återanvänds och känner
igen det nya omslaget. V2:s historiska tekniska recept bevaras i det nya omslaget.

Paketversionen är `3.0.0-beta.0`. Befintlig first-parent-policy ger varje merge
ett unikt synligt `3.0.0-beta.N`; utvecklingsbyggen har commit och dirty-status.
Ingen CI-, publicerings- eller räknarlogik ändras. Versionsnummer i footer
beskriver det faktiskt byggda resultatet, inte ett nytt projektschema för V2.

## Faktiskt borttaget

- `src/editing/creative-profiles.js`: Creative v2-definitioner och resolver.
- `src/editing/profile-settings.js`: Creative v1-matriser, BW-profiler, printdata
  och profilversiondispatch. Det orelaterade motorvalet är flyttat, inte raderat.
- `render-core.js`: emulsion, gamla profilmatriser/gamma/sat/tints, BW-specialfall
  och samtliga separata printblock.
- `gpu-renderer.js`/`conversion3.js`: kreativa matris-/ton-/chroma-/mono-/print-
  shaders och deras uniformer. Tekniska konverteringsmatriser är kvar.
- `printStyle`, gamla menyval, relevanta översättningar och DOM-bindningar.
- Gamla kreativa fält och versionsfallback i appens projektformat.
- `beta2-profile-reference.json`, gamla estetiska fall i färg- och exportfixtures;
  `reference37.json` ersätts av rena tekniska indata, inte nygenererade look-facit.

Alla aktiva main/worker/importlistor laddar den nya katalogen/operatorn.
Oförändrade frysta renderer-fixtures används **endast i tester** som oberoende
Neutral/tekniska orakel, med en testadapter som väljer identitet. De är ingen
laddad legacyprofil eller användbar alternativ produktionskedja. ICC-profiler,
RAW-matriser och manuella Editing 2.0-reglage har andra ansvar och är kvar.

## Verifiering och bildpaket

- Work-facit: 184 Gold/Ektar-patch/styrkefall, största kodade sRGB-fel
  `9.124705335761263e-8` mot levererat avrundat oberoende facit.
- 17³ gamutgrid, gråramp, kontinuitet över hue-gränser, strikt neutralitet,
  syntetiskt neutraldensitetsnegativ med ojämn bas, luminansbevarande mono.
- Slutshader på Float32-target: högsta skillnad cirka `7.1e-6`; Work-gräns
  `2e-4`. Riktat 16-falls RGBA8-test gav 0 kodfel. Bredare motor-/editmatris
  behåller befintliga toleranser och rapporterar faktisk högsta avvikelse.
- Faktisk JPEG/PNG8/PNG16/TIFF16, worker och fallback, avbrott, frysta export-
  snapshots, batch, kö, cache och projekt. PNG16/TIFF16 jämförs mot samma kernel
  och har riktiga lågbitar samt sRGB/ICC. Neutral-preencoder-hashar bevaras.
- UI-skärmbilder från Chromium i 1440×900, 1024×768 och 768×1024, Dark/Light,
  med en offentlig syntetisk DNG-fixture. Fem språk kontrolleras.

Privata bilder sparas utanför Git: `FILMLABB_3_PROFILE_REVIEW`. Där finns
05/09/11, 0/35/70/100-prover, fullupplösta TIFF-prover, oförstorade RGB16-utsnitt,
frysta recept/källhashar och mätvärden. Länkar och slutlig CI-status anges i PR:n.
35/100-översikter använder befintliga källpunktgaller; fullupplösta prover finns
för Neutral, Gold70, Ektar70 och mono. Ingen preview uppges vara en nativeexport.

Fysisk iPad Safari/Windows Edge, en tidigare osedd rulle, mätta stock-/färgkort
samt **ett verifierat verkligt svartvitnegativ saknas**. Fotografisk stocktrohet
är inte godkänd av automatiska tester. Högröd/grön/blå föremålsreferens under
kontrollerat ljus och bedömarpanelen i Work-matrisen återstår också. Detta ska
vara synligt i granskningsbeslutet. Fullresolutiv CPU-export med aktiv direktlook
är mer beräkningskrävande än Neutral; ingen LUT-optimering eller fysisk
prestandagrind på iPad/Edge hävdas i PR 1.

### Slutlig lokal körning

`npm run test:full`: **130/130 grupper**, 0 fel, 602,78 s i Node/Chromium på
Linux. Den isolerade befintliga D2-sviten passerade också med alla desktop-/
iPad-/mobilfall, touch och reduced motion. Inga animationskrav ändrades.
Den frysta RAW-diagnostikens tre decoderlägen smoke-testades med offentlig
syntetisk DNG efter att dess historiska jämförelse fått en neutral testadapter.

De tolv faktiska RGB16-TIFF-proverna omfattar 05/09/11 och Neutral/Gold70/
Ektar70/mono, 6032×4032. Samtliga tre Neutral-filer har exakt samma SHA256 som
main/D:s tidigare exporter. Native mono har exakt lika R/G/B-kanaler.

**Fotografisk riskflagga:** Ektar70 på 09 ökar andelen pixlar med minst en kanal
vid 65535 i hela film-ROI från 1 835 till 23 723 av 13 327 104 pixlar, cirka
**+0,164 procentenheter**. Det överskrider Work-gränsen 0,1. Gold70 ger cirka
+0,064. De ärvda detaljutsnitten har inga nya ändpunkter men täcker inte hela
högdagerproblemet. Räkningen avgör inte lokal textur; hela TIFF:n måste granskas.
Parametrarna är inte justerade för att dölja utfallet. Gold värmer framför allt
gula/varma partier; Ektar förstärker bland annat blå textil. Ingen av dem löser
befintliga tekniska cyan/blå färgproblem. Inget påstående om stocktrohet görs.

Privat [granskningsmapp i Drive](https://drive.google.com/drive/folders/1cN96WIPv27XxdYEOrcJWKdmUUFsydFzA):
[översikter och manifest](https://drive.google.com/file/d/1C7jG3QQ1OulsQnbhLM8kV2lz99Ia3bCt/view),
[oförstorade RGB16-detaljer](https://drive.google.com/file/d/18v9CNnz1cMSqu8vWPeUTEyjR1VKO75tf/view).
Fulla TIFF-arkiv finns i 20 transport-ZIP-delar med SHA256-manifest och ett
Python-standardbiblioteksskript för hopsättning. Översikt, detaljer och en
nativevolym har återhämtats från Drive och kontrollerats med SHA256 och ZIP-CRC;
övriga volymers storlek och privata status har verifierats efter uppladdning.
Alla tre färdiga nativearkiv har lokal CRC-/hashkontroll.

Reproduktion: `tools/profile-review.mjs` återanvänder låst decoder, arkiverad
bas/analys och faktisk TIFF-export. `profile-review-overviews.mjs` använder de
redan filmcroppade källpunktgallren direkt, utan andra crop. Paketverktyget
`profile-review-package.py` verifierar RGB16, ICC, utsnitt och ZIP; samma
Pillow/NumPy-miljö som tidigare privat bildpaketering krävs där, inga nya
applikationsberoenden. Fotoutdata måste ligga utanför repositoryt.

### UI från körd applikation

Offentlig syntetisk DNG används här; inga privata foton är incheckade.
Footer visar det ärligt identifierade dirty-utvecklingsbygget före commit.

|Viewport|Amber Dark|Amber Light|
|---|---|---|
|1440×900|[Dark](ui/dark-1440x900.png)|[Light](ui/light-1440x900.png)|
|1024×768 touch|[Dark](ui/dark-1024x768.png)|[Light](ui/light-1024x768.png)|
|768×1024 touch|[Dark](ui/dark-768x1024.png)|[Light](ui/light-768x1024.png)|


## Etapp 2: Pro 400H och Portra 400

Utgår från mergad PR #90, main `e6115f5`. Operatör, renderingsordning, cache,
Editing 2.0 och exportägare är oförändrade. Gold/Ektars definitioner är frysta
med SHA256-regressionstest. Se [etappens rapport](film-stage-2.md) för riktning,
faktiska resultat, reproduktion och fotografiska begränsningar.
