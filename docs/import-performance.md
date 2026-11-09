# Importlatens: kartläggning, mätning och optimering

Bas: main `22b6418`, efter mergade #90–#92. Profilparametrar, negativmotorer,
D-tonmodell och PNG16-kodning ändras inte.

## Verklig kedja

Filval → `importRoll` → `chooseFrame` → `readFile` → LibRaw/WASM
→ fullupplöst RGB16 → befintlig RAW-input-transform → `hires/working`
→ teknisk preview → filmbas/scenanalys → V2-recept → positiv rendering
→ GPU-/canvaspresentation. Originalets fullupplösta data finns kvar för export.

Tidigare skapade `raw-decoder.js` en vendor-worker per jobb, läste filen
på huvudtråden och tog emot RGB16. `raw-input.js` körde sedan
`Float32Array.from(..., callback)` och en separat klippräkningsloop på
huvudtråden. På den testade RAF-filen kostade transformeringen 5,5–8,1 s
och höll gränssnittet blockerat. Ny RAW-avkodning gjordes även vid omladdning
av samma aktiva File.

V2:s analys använder redan begränsade provmängder. GPU-preview laddar upp
den nedskalade tekniska previewn, inte hela RAW-bilden. Dessa steg var små
jämfört med LibRaw och Float32-konverteringen och har inte byggts om.
Befintliga tekniska analysversioner, provkoordinater och positiva cache behålls.

## Ändring

- En appägd, tunn RAW-worker använder **samma LibRaw 1.6.0 och samma låsta
  avkodningsalternativ**. Filinläsning, RGB16-hämtning och samma RAW-input-
  transform sker i workern. Resultatbufferten överförs en gång till huvudtråden.
- En direkt loop skapar Float32 och räknar klippning i samma genomgång.
  Division och Float32-avrundning är identiska. Inget half-size, ändrat
  demosaic, vitbalans-, exponerings- eller färgrymdsval.
- En enda aktiv File/recept-cache delar den redan använda källbufferten.
  Filnamn/storlek räcker inte för cacheträff. Referensbilder optimerar inte
  in i cachen; ny huvudkälla ersätter posten före avkodning. Rensa kö frigör
  posten. Byte A→B→A kan fortfarande kräva ny avkodning; ingen stor inaktiv LRU.
- Workern termineras efter varje jobb och vid avbrytning. Mätningen visade
  att initiering är omkring 0,05–0,15 s, medan RAW-bearbetningen tar cirka
  21–22 s. Att behålla det stora WASM-heapet för att spara denna lilla del
  bedömdes inte motiverat i denna etapp.
- Bounded RAF-JPEG-extraktion återanvänds: högst 4 MB kodad JPEG accepteras
  för tidig visning, bitmapen begärs i 640 px bredd och stängs efter användning.
  Intern JPEG-dekoderminnesåtgång kan inte garanteras av resize-alternativet.
  Cachen kringgås inte för en preliminär bild: inget extra JPEG-jobb startas
  när samma aktiva RAW redan är tillgänglig.
- Kamerabilden visas i ett separat DOM-canvas med texten **Kameraförhandsvisning
  · preliminär · inte FILMLABB-resultat**. Den använder aldrig `src`,
  `hires`, `working`, analys, histogram, geometri eller export. Saknad,
  för stor eller trasig JPEG stoppar inte RAW. Den riktiga bilden ersätter
  proofen automatiskt. Kamerabilden är inte användarens beskurna/roterade
  FILMLABB-resultat; slutlig geometri bevaras av ordinarie ägare.
- Avbryt-knapp och generationskontroller före alla asynkrona källskrivningar.
  Snabbt fil-/köbyte avbryter föregående jobb. Varken sen framgång, sent fel,
  gammal JPEG eller ett gammalt finally-block får skriva över det nya jobbet.
  Kötumnaglar startas inte efter ett avbrutet initialt jobb.

En separat snabb RAW-avkodning skulle konkurrera med fullavkodningen och
kräva ytterligare kvalitet-/domänval. Den införs inte: den billiga inbäddade
kamerabilden ger tidig återkoppling utan en andra konverteringsmotor.

## Tidmätning

`FILMLABB_IMPORT.snapshot()` använder performance.now och skiljer filval,
worker-init, läsning, RAW-open, metadata, imageData, RGB-konvertering,
preview, filmbas/frame/V2-analys, render-submit, canvaspresentation,
första preliminära bild, första tekniska bild och käll-/editorberedskap.
GPU-uppladdning/rekonstruktion återanvänder befintliga GPU-mått.

**LibRaws publika imageData kombinerar bearbetning, RGB-allokering och
hämtning.** Det går inte att separera dem korrekt utan att instrumentera
bibliotekets interna kod. Före-mätningen inkluderar WASM-init i open; efter
har init en egen worker-span. Dessa skillnader är märkta, inte fördelade
på påhittade delvärden. Spans kan överlappa/nestas och får inte summeras.

Mätningen gäller offentlig Fujifilm X-T20, komprimerad RAF från raw.pixls.us,
25 017 216 byte, dekodad till 6032×4028. Detta är en teknisk RAW-fixture,
inte ett kalibrerat negativ. Samma V2-recept, Neutral, exponering och
neutrala Editing-inställningar inom före/efter. Linux/Chromium headless,
1440×900 och auto/GPU i molnmiljön. Ingen fysisk GPU-/iPad-budget hävdas.

Tider startar vid webbläsarens filvalshändelse, **inte** före Playwrights
filöverföring. Första tekniska paint mäts med två requestAnimationFrame efter
verkligt rendererresultat; det är en observerad paintmöjlighet, inte fysisk
skärmlatens. Fullt användbar i tabellen kräver både teknisk bild och färdig
import. Första kallkörning hålls isär från upprepad filväljare och återval av
samma File. OS-filcache är inte tömd.

| Fall | Första bild före | Första bild efter | Användbar teknisk bild före / efter |
| --- | --- | --- | --- |
| Cold page/module | 32,772 s | 0,206 s kamera | 32,772 / 24,841 s |
| Upprepat filval, två prov | 32,129 / 31,926 s | 0,350 / 0,252 s kamera | 32,129 / 31,926 → 24,888 / 24,280 s |
| Återval av samma aktiva File | 29,025 s | 3,192 s teknisk | 29,025 / 3,192 s |

Medianen över de tre fulla nya avkodningarna minskar från 32,129 till
24,841 s, cirka **23 %**. Detta förbättrar den riktiga importen och inte bara
den preliminära bilden. LibRaw imageData ligger fortfarande runt 21–22 s
och är den största kvarvarande flaskhalsen.

| Steg | Före, median tre nya importjobb | Efter, median tre nya importjobb |
| --- | --- | --- |
| Filens arrayBuffer | 1763,5 ms på huvudtråden | 64,8 ms i workern |
| WASM-init | ingår i open | 91,3 ms |
| RAW-open | 73,2 ms inklusive init/IPC | 44,3 ms |
| imageData, bearbetning + RGB16-hämtning | 21 419 ms inklusive IPC | 21 520,4 ms i workern |
| RGB16→Float32 + klippräknare | 7932,7 ms på huvudtråden | 179,8 ms i workern |

Preview/frame/V2-analys ligger typiskt kring 0,15 / 0,02 / 0,1–0,2 s.
Initial GPU-validering/kompilering och slutlig presentation har större
cold-start-kostnad; submit-tider är inte GPU-exekveringstider. Fullständiga
fält följer med reproduktionsverktygets JSON när mätningen körs.

Med RAF-extraktionen avstängd i mätverktyget gav tre fulla importjobb
24,192 / 24,839 / 26,017 s, median 24,839 s. Med kamerabilden var medianen
24,841 s. Ingen praktiskt stor extra kostnad påvisades i dessa få prov;
det är inte ett statistiskt löfte för andra enheter eller JPEG-storlekar.
Avstängningen undertrycker även efterföljande RAF-kötumnaglar i harnesset.

CPU-prov på syntetisk 6 MP DNG gav teknisk paint 3,133 / 3,591 s och återval
1,834 s. Det är en annan fil/backend och **ingen CPU-före/efter-vinst** härleds.

## Minnesredovisning

Full RAW-källa är oförändrat 291 562 752 byte Float32, ursprungligt RGB16
145 781 376 byte och teknisk preview 15 708 000 byte. RAW-filbuffert och
RGB16 finns nu i decoder-workern; den stora slutbufferten delas genom transfer.
Inaktiv kö lagrar inte flera nya fullstora källbuffertar.

Tidiga pilotkörningar på samma RAF/settings visade main-JS-heap cirka
1,186 GB före och 0,324 GB efter cold import. Senare prov låg högre på grund
av uppskjuten GC. Dessa är **inte totalminne eller peak**: worker-, WASM- och
GPU-heap ingår inte i performance.memory. Fabriken exponerade inte ett
tillförlitligt heap-byteantal, vilket rapporteras som null. Total process-
minnesförändring är därför inte fastställd. Ingen extra fullstor kopia läggs
till av den aktiva cachen; referensavkodningar lagras inte i den.

## Regression och reproduktion

Lokalt före miljöavbrottet: riktat importbrowsertest godkänt (exakta
vendor-pixlar/metadata, cache/recept, CPU/GPU, original RGB16-export, köbyte,
sen framgång/fel, avbrytning och preliminär RAF). Alla 72 890 688 Float32-
kanalvärden i den verkliga RAF-filen jämfördes mot original vendor-worker:
**0 skillnader**. Float32-källans SHA256:
`55b469ee14257b524d28413e13a9745d4caeb0fc186c01f2a1434a670b9e69e8`.

CI kompletteras med dessa testfall och uttömmande jämförelse av samtliga
uint16-värden mot den gamla Float32Array.from-transformen. Befintliga tester
för alla åtta profiler, Neutral/mono, V2/D, GPU/CPU, kö/projekt och export körs
i samma fullsvit. Ingen PNG16-kodare eller estetisk definition ändras.

```sh
curl -fL 'https://raw.pixls.us/getfile.php/1178/nice/Fujifilm%20-%20X-T20%20-%2014bit%2014bit%20compressed%20(3:2).RAF' -o /tmp/import.raf
# Förväntad SHA256 enligt provbiblioteket:
# a23045101b2912e64f154100d646c228c0d16585d21e95e0d1a006e537f7784c
node tools/benchmark-import.mjs /tmp/import.raf /tmp/after.json auto 3
FILMLABB_IMPORT_PROOF=off node tools/benchmark-import.mjs /tmp/import.raf /tmp/no-proof.json auto 3
node tools/check-import-source.mjs /tmp/import.raf /tmp/parity.json
node tests/import-latency-browser.mjs
npm run test:full
```

För före: skapa en separat worktree på `22b6418`, kopiera endast
`tools/benchmark-import.mjs` dit, installera samma repo-/browserberoenden
och kör samma fil/kommando. Verktyget injicerar mätspans i den gamla adaptern.
Kör före/efter sekventiellt, utan andra tunga jobb. Proof-biblioteket är
raw.pixls.us (sample 1178); fotografiet behöver inte checkas in.

**Miljöavbrott:** den lokala exekveringsmiljön blev offline under slutkontrollerna.
Ändringen återskapades via GitHub-anslutningen från main och de utförda patcharna.
Mätningen i [JSON-sammanfattningen](measurements/import-performance.json)
är återgiven från fångad verktygsutdata; kompletta lokala tracefiler är för
närvarande otillgängliga. Den återställda slutrevisionen regressionstestas
i GitHub CI. En ny timingkörning på själva slutcommitten återstår i återställd
miljö; inga nya prestandatal har hittats på efter avbrottet.

Fysisk iPad Safari och Microsoft Edge kunde inte testas. Edge-binär saknades;
försök att starta Linux-WebKit misslyckades eftersom Playwright-WebKit-
binären saknades. Chromium är inte ersättning för dessa fysiska enheter.

Kvar: LibRaws långa demosaic/imageData, kall GPU-start, andra kameror/enheter,
total processminnesprofilering och eventuell framtida minnesbudgeterad
inaktiv cache. Ingen half-size-kompromiss, ny konverteringsmotor, automatisk
merge eller deployment införs.
