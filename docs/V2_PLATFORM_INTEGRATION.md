# V2 i huvudplattformen

## Inventering och avgränsning

Utgångspunkt är main `a2fa2d8`, squash-mergen av PR #39. Där finns redan V2
från #36, robust ton/invalidation från #38 och #39:s begränsade färgbalans,
worker, export och fotografiska resultat. Allt återanvänds. Versionspresentationen
från den öppna PR #40 ingår också, kompletterad med automatisk betanumrering;
#40 behöver inte mergas separat.

`core.js`, `render.js`, `fast.js`, `base.js`, filmrespons, P60/P99-parametrar,
högdagerskydd och färgbalansalgoritm är oförändrade. `v2.html` behålls som
referenslabb. Standard är fortfarande standard. Alla fem tidigare motorer och
gamla projekt behålls.

## Kopplingar

| Ansvar | Implementation |
|---|---|
| Motorval | Befintlig `engineMode`: Original, Standard, Curve, Density, Matrix och **V2 · experimentell** |
| Källdomän | Befintlig RAW-owner/LibRaw med exakt labbrecept; linjär Rec.2020 Float32 |
| Filmruta | Befintlig autodetektering, fyra manuella kanter, bekräftelse/låsning och källkoordinater |
| Filmbas | Befintligt Filmbas 2, originalprovtagning, median/MAD, förslag/accept/ångra och kompatibla rullreferenser |
| Recept | `conversion-v2/platform.js`: källkontrakt, ren bas, befintlig fryst respons och separat ton-/färgintent |
| Bindning | `platform-controller.js`: ansluter befintliga käll-, analys-, bas- och köägare |
| Pixlar | `NSPixelKernel` anropar samma V2-fastkärna som labbet; ingen legacy-inversion i V2 |
| Redigering | Befintliga kreativa profiler/kopiestilar följda av Editing 2.0 |
| Preview | Befintlig CPU/worker, scheduler och geometri; V2 väljer bort GPU |
| Export | Befintlig exportcontroller, workers/reserv, stripes, RGB16/ICC, JPEG och batch |
| Projekt | Bildspecifikt V2-recept; rullgemensamma inställningar behåller befintliga ägare |
| Diagnostik | Befintlig knapp under Avancerat, V2-diagnostik och separat slutlig redigerad utdatastatistik |

## Domäner och minne

Skyddad RAW-import har linjär sRGB och gemensam gain 0,5. V2 behöver linjär
Rec.2020 Float32, gain 1, camera-WB utan motivbaserad auto-WB och labbets låsta
decoderalternativ. Första V2-valet avkodar därför samma original igen via
**samma importpipeline**, med uttryckligt statusmeddelande. Gamla sRGB-bastripletter
kopieras inte. Domänen `raw-wide-v2-1` skiljer receptet från tidigare wide-lägen;
inkompatibel bas/ljus/flat-field pausas. Ljuskällereferens blir ingen extra dold
gain. Kompatibel flat-field tillämpas en gång vid källäsning, bas och tonanalys.

Standard/Curve/Density/Matrix kan sedan använda kvarvarande wide-källa utan ny
avkodning. Det låsta decoderreceptet sparas bildspecifikt (`rawSourceRecipeV2: 1`) även när en äldre motor använder samma wide-källa, så omladdning/batch inte byter decoder eller pausar dess kompatibla bas. Original behöver sRGB och omavkodar uttryckligen med bildens tidigare protected/reference-recept. Inaktiva köbilder
behåller filer/recept, inte fulla pixelbuffertar. Gamla fullkällereferenser släpps
före omavkodning; ingen parallell sRGB+Rec.2020-cache införs. Byte av köbild
använder ordinarie importägare igen.

TIFF accepteras i V2 vid uttryckligt val **Verifierad linjär Rec.2020**, utan
motstridig ICC. Detta är användarens domändeklaration, ingen automatisk
verifiering av bildhistoriken. Okänd TIFF/JPEG blir inte tyst linjär.
TIFF-avkodaren stöder sina tidigare RGB8/16-format; Float32-TIFF-import har
inte lagts till. LibRaw-binären ändras inte; ej exponerade RAW-mätvärden saknas.

V2-preview är en **begränsad punktproxy**, högst 1400 på längsta sidan, från
ursprunglig linjär källa. Ett positivt Float32-cacheplan, högst två miljoner
pixlar, återanvänds vid redigering. Inget fullupplöst positivt plan tillkommer.
Full källa kräver 12 byte/pixel (cirka 292 MB för 6032×4032), plus decoder,
negativproxy, positivpreview och befintliga exportbuffertar. Preview-workern
får den begränsade källan, inte hela RAW-bufferten. Export använder originalet
och ordinarie stripe-/bytebudget. Detta beskriver buffertägarskap, inte uppmätt
fysisk iPad-peak.

## Kalibrering och invalidation

V2 tar kompatibel accepterad/manuell bas i samma domän. Före accept kan ett
förslag visas, märkt preview-only. Utan explicit bas används befintliga
`CE.findBase` bara när dess konservativa kantkontroll lyckas; annars antagen
`[1,1,1]`, tydligt märkt prior/saknad bas. Samma automatknapp och regionverktyg
används. Legacy-responsadaptrar kopieras inte till V2-basen.

Manuell V2-mätning använder labbets gemensamt giltiga RGB-population och
befintlig median/MAD. Kvalitetsvarningar är rådgivande; numeriskt ogiltiga prov
kan inte godkännas. Huvudplattformens lagrade basgräns högst 1 per kanal
kvarstår; extrem flat-field-korrigerad bas över 1 kan avvisas av basvalideringen.

Analysidentiteten omfattar källa, faktiska basvärden, kalibrering och teknisk
analysruta/status. Källrevisionen är ett opakt fingeravtryck av filidentitet,
decoderrecept/capturekontext, inte ett kryptografiskt filbevis. Identiska värden
återanvänder sparat intent. Accept/reuse/ångra och teknisk ruta uppdaterar
analys vid behov. Obekräftad ruta ger befintlig fallback. Kreativ crop, rotation,
zoom, tema och redigering ändrar inte bas, respons eller ton-/färgmodell.

## Preview och export

V2 använder CPU/worker. **Ingen V2-GPU-shader har implementerats**; CPU/GPU-
överensstämmelse för V2 påstås inte. Äldre GPU-motorer ändras inte. Befintlig
scheduler avbryter gamla jobb vid motorbyte; källa/recept/redigering ingår i
renderidentiteten.

Geometrin filtrerar redan positiva previewpixlar. Punktproxyn kan ge aliasing;
den är inte labbets exakta fullkälleintegrerande kvalitetspreview. Export tar
alltid originalet och huvudplattformens befintliga geometrifilter, aldrig en
uppskalad proxy. Samma frysta recept används, men filtrering, skärmkvantisering
och JPEG-kompression kan skilja preview/export och labbets boxfilter. Detta är
den främsta kvarstående previewbegränsningen.

Neutral profil/kopiestil och neutral Editing 2.0 lämnar V2:s positiva grundbild
oförändrad. Fabrikens svart-/vitpunkt och kreativa profil kan vara icke-neutrala.
Gamla Standard-respons-/kanallutningsreglage och RAW-läge inaktiveras för V2.
De vanliga fotografiska redigeringsreglagen fungerar efter automatiken.

JPEG följer befintlig sRGB-kodare och storleksreserv; Canvas garanterar ingen
inbäddad JPEG-ICC. TIFF är RGB16 med befintlig sRGB ICC och fulla exportmått.
Batch, rotation, kompositionscrop, filmrutecrop, avbrott och fel använder samma
ägare som äldre motorer.

## Projekt och versioner

Aktivt eller vilande V2-recept ger projektformat `negative-studio-roll-v2`,
`v2SchemaVersion: 1`, `conversionSchemaVersion: 1`. Motor-ID, algoritmversion,
source/base/calibration/intent, Editing-version och befintliga bild-/rulldata
sparas. Okända versioner/inkonsistenta recept avvisas före mutation. Äldre
appar avvisar den nya taggen. Projekt utan V2 behåller sina gamla format.
Appversion/automatisk main-betanumrering beskrivs i [VERSIONS.md](VERSIONS.md).

## Verifiering

```sh
npm ci --no-audit --no-fund
node tests/v2-platform-numeric.mjs
node tests/release-version.mjs
node tests/v2-platform-browser.mjs
node tests/v2-platform-source-browser.mjs
npm run test:full
npm run build
```

- Pixelkärnan jämförs med oförändrad V2-referens för samma källa/bas/recept,
  headroom och neutrala/ändrade Editing 2.0. Riktat maxfel: `1,6653e-16`.
- RGB16-preview/export jämförs inom ett kodsteg. Basbyte invalidierar intent
  utan att ändra respons. Kreativa ändringar återanvänder positivcache.
- Chromium importerar två syntetiska CFA-DNG via verklig LibRaw/WASM, väljer
  V2 i huvudfönstret, mäter bas/justerar ruta, accept/basbyte/ångra, redigerar/
  roterar, återanvänder källa vid Standard-byte, exporterar JPEG/RGB16/ICC,
  blandad batch, avbryter, återställer projekt och avvisar framtida recept
  atomiskt. Original kräver ny sRGB-avkodning.
- Versionstester använder verkliga Git-merges/omkörningar/dev-ID och testar
  footer/worker samt reproducerbart cachebygge. Äldre facit ändras inte.

En avgränsad kontroll av tidigare porträtt-RAF 04 gav 6032×4032 linjär
Rec.2020 (291 852 288 källbyte), identisk ton-/färganalys mot oförändrad kärna
och max pixelavvikelse `4,3021e-16` över 192 originalprov med identiskt recept.
Vanliga TIFF-knappen skapade 3719×3678 RGB16, 588 byte sRGB ICC,
82 071 644 filbyte. Se [mätvärden](measurements/v2-platform-integration.json).
Fullsvitens slutresultat antecknas efter avslutad körning. Tidigare fotografisk utvärdering körs inte om. Blå/cyan färg,
vissa högdagrar och generell filmrespons är fortsatt öppna kvalitetsfrågor.
Ingen ny fotografisk förbättring påstås. Nattserie saknas. Fysisk iPad Safari/
Windows Edge, stora blandade RAF-batcher, minnestryck och subjektiv respons
kräver fortsatt manuell kontroll.

## Användarprotokoll

1. Öppna byggd huvudplattform via HTTPS/utvecklingsserver. Kontrollera version
   och SHA i sidfootern. PR-koden publiceras inte i produktion före merge.
2. Importera RAF som vanligt. Kontrollera filmrutan, justera fyra kanter och
   bekräfta/lås den tekniska rutan med befintliga verktyg.
3. Välj **V2 · experimentell**. Vänta på uttrycklig låst Rec.2020-avkodning.
   Kontrollera V2/CPU och bas-/analysstatus i kalibreringsinformationen.
4. Använd Filmbas 2:s automatdetektering eller vanliga rektangel över filmkant,
   läs varningar och godkänn. En bas mätt före domänbytet måste mätas om.
5. Växla Standard/Curve/Density/Matrix och tillbaka utan ny import. Wide-källa
   och kompatibel bas kan återanvändas. Original kräver sRGB-omavkodning. För
   neutral teknisk jämförelse välj neutral profil/kopiestil och neutrala Editing
   2.0-värden; fabriksinställningar är inte automatiskt neutrala.
6. Prova vanliga redigeringsreglage, kompositionscrop och rotation. Teknisk
   bas/respons/analys ska behållas vid kreativa ändringar.
7. Exportera JPEG/RGB16-TIFF med samma utsnitt. Prova filmrutecrop/blandad kö.
   Spara rullprojekt, öppna samma filer och återläs projektet; V2-recept och
   motorval ska återställas per bild.
8. Exportera diagnostik under Avancerat. Ändra/godkänn bas och exportera igen:
   responsen ska behållas, densitet/aktuell tonanalys följa basen. Ångra
   återställer basen. Kreativ crop/rotation ska inte ändra intent. Inga pixlar,
   filnamn eller privata sökvägar ingår.

Labbet behövs fortfarande för technical/fixed och detaljerad stegvis A/B-
diagnostik, men inte för vanlig V2-konvertering eller export.
