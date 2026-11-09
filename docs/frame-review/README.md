# Filmrutehantering 2.0 och reglage på pekskärm

Utgångspunkt: `460177d` på main, efter mergad PR #96. Detektorns algoritm,
V2/D:s färg- och tonmatematik, filmprofilerna, LibRaw-receptet och exportkodningen
är oförändrade.

## Varför användarflödet tappade ett bra förslag

PR #96 returnerar både en försiktig `region` (helbild vid osäkerhet) och en
`proposal`, `quad` och separat inre `analysisQuad`. `finishImport()` och
`cropAuto` valde `region`. Fyrhörningen fanns kvar i `frameDetection`, men
bildverktyget visade den bara efter att användaren öppnat filmrutekortet.
Dessutom sattes `cropConfirmed=true` redan när en manuell kantdragning började.
Det skilde inte mellan att visa/ändra ett förslag och att godkänna analysytan.

Nu lagras den aktuella fyrhörningen och dess godkännande i ett valfritt
`settings.frameSelection`-fält. Det använder samma `normalized-source`-koordinater,
konvexitetskontroll och fyrhörningsrepresentation som detektorn:

| Tillstånd | Bildytan | V2:s automatiska motivanalys |
| --- | --- | --- |
| `automatic` | Säker detektorregion; normal visning | Godkänd analysfyrhörning |
| `pending`, detektorförslag | Befintlig kandidat; justeringsläge öppnas | Avstår tills användaren bekräftar |
| `pending`, ingen kandidat | Helbild som redigerbar start | Avstår tills användaren bekräftar |
| `confirmed` | Användarens godkända fyrhörning | Beräknas om efter bekräftelse |

En ändring gör valet väntande igen. Det kan bekräftas direkt under bilden.
**Välj hela bilden** registrerar ett uttryckligt användarval (`origin: full`),
inte en automatisk säker detektering. **Justera filmruta** öppnar samma verktyg
från den vanliga bildytans kontrollrad. Inga modaler eller nya inställningskort.

`cropRegion` är fortfarande den äldre omslutande rektangeln. Komposition och
export behåller `NSGeometry`. Detta inför inte perspektivkorrigering eller en
andra skärm-/exporttransform. Hörn kan flyttas individuellt; en kant flyttar
sina två hörn vinkelrätt i källans pixelkoordinater. Konvexitet, källans gränser
och en pixels minsta arbetsrektangel begränsar dragningen, aldrig filmformatet.
De osynliga hörnträffytorna är 44 px; markeringarna har 4 px radie. Träffytorna
hålls innanför bildfönstret även när fotografiets hörn ligger nära dess kant.

## Analys, cache och persistens

- `NSFrameSelection.area()` gör väntande eller inaktuell geometri `unconfirmed`.
  Ett gammalt högt konfidensvärde kan därmed inte godkänna en flyttad kandidat.
- Bekräftelse sparar valet och går genom befintliga `updateBase`, `analyzeLevels`
  och rendering. Den tidigare extra V2-bekräftelsewrappen har tagits bort.
- Den automatiska filmbascachens nyckel omfattar analysens status och polygon,
  inte bara dess bounding box. Godkända explicita Filmbas 2-referenser fortsätter
  att hanteras av befintlig ägare.
- Under själva dragningen visas den senast renderade bilden stabilt; regionen
  är redan väntande. Släpp/avbrott/förlorad capture räknar om med väntande status.
  Användarens bekräftelse aktiverar därefter den automatiska analysen.
- Bildkön och projekt sparar det valfria fältet genom sin befintliga kopiering.
  Manuella och låsta val bevaras. Äldre projekt utan fältet behåller godkända
  rektanglar; ett sparat osäkert #96-förslag återanvänds utan ny detektering.
  En analysfyrhörning som exakt motsvarar den äldre rektangeln använder fortsatt
  rektangelns befintliga provtagning, så att migrering inte ändrar randprov.
- Projektvalideringen avvisar felaktiga polygoner och motstridiga godkännanden
  innan kön ändras. Automatisk acceptans måste motsvara säker detektorevidens.
- Att öppna, zooma, rotera, bekräfta eller återvisa ett sparat förslag startar
  ingen extra RAW-avkodning eller detektering. En vanlig bildåterinläsning kan
  fortfarande använda importens befintliga källcache.

## Reglagen: verifierad kodbrist och kvarvarande osäkerhet

Den bifogade inspelningen är 9,7 sekunder. Den visar redigering och navigation
på iPad, men inga pekpunkter eller DOM-händelser. Den bevisar därför inte att
WebKit behåller en viss intern peksekvens efter dubbeltryckning.

Den tidigare koden hade ingen explicit range-pointer-capture. Den återställde
reglaget när två `touchend` kom inom 350 ms, även efter dragningar, och körde
`preventDefault()` på det andra avslutet. CSS angav samtidigt `touch-action:
pan-x`, vilket reserverade fel skrollriktning för ett horisontellt reglage.

Ändringen behåller det **naturliga HTML-reglaget** och dess befintliga värdemappning:

1. Dubbeltryck kräver två korta, stilla peksekvenser på samma reglage. Dragningar,
   avbrott och interaktion med andra kontroller bryter sekvensen.
2. Inga `touchend`/`pointerup` avbryts. Pekägaren rensas före eventuell release av
   implicit capture, även vid `pointercancel`, `lostpointercapture`, fönsterblur
   och dold sida. Ingen generell `blur()` av reglaget införs. Inaktiverade reglage får
   varken en pekägare eller dubbeltrycksåterställning.
3. `pan-y` tillåter vertikal skrollning. Reglagets naturliga `input`/`change`
   väntar tills en horisontell dragning eller ett avslutat tryck visar avsikt.
   Vid avbruten skrollning återställs bara tumpositionen; bildmodellen har ännu
   inte ändrats. Detta bevarar även sparade värden mellan reglagets steg och
   förhindrar att exempelvis filmruteinset ändrar geometri under skrollning.
   En påbörjad avsiktlig horisontell justering behålls. Ingen egen värdemappning
   ersätter det naturliga reglaget.
4. Mus, tangentbord, fokusmarkering och pennans naturliga reglagefunktion finns
   kvar; ingen separat beräkning av reglagevärden har införts.

Detta tar bort påvisade felmekanismer. Den exakta Safari-mekanismen bakom den
rapporterade låsningen är ännu inte bevisad på en fysisk iPad.

## Reproduktion

```sh
npm run test:full
node tests/frame-selection.mjs
node tests/frame-review-browser.mjs
node tests/range-touch-browser.mjs
FILMLABB_TEST_WEBKIT=1 node tests/frame-review-browser.mjs
FILMLABB_TEST_WEBKIT=1 node tests/range-touch-browser.mjs
node tools/check-frame-review-real.mjs /path/to/originals /tmp/frame-review --all
```

WebKit-kommandona kräver installerad Playwright WebKit och dess systembibliotek.
RAW-kommandot använder riktiga original med ordinarie import och LibRaw; de
stora originalfilerna ingår inte i git. Utan `--all` väljs 8983 och 9235.

De automatiska browserfixturerna är 480×321 linjära Rec.2020-prov från verklig
FILMLABB-import, med kontrollerad avkodare. De är **inte** nya fullupplösta
RAW-körningar. Metadata, källhash och grova manuella annoteringar följer med.
Befintliga detektorprov fortsätter täcka kvadratiska, smala, breda och roterade
format. Browserprovet täcker fem storlekar/orienteringar, hörn vid rotation,
zoom/panorering, bekräftelse, kö, projekt, lås och äldre projekt.

## Begränsningar

- Ingen generell garanti om detektorns träffsäkerhet tillkommer. Även ett
  geometriskt felaktigt osäkert förslag behöver användaren kunna korrigera.
- En godkänd felplacerad ruta kan fortfarande ge fel analys. Ingen matematisk
  kompensation för ett felaktigt användarval har införts.
- Källfyrhörningen styr analysmasken; exportens befintliga komposition använder
  fortfarande sin rektangulära modell och gör ingen projektiv upprätning.
- Linux WebKit är inte fysisk iPad Safari. Playwright har inte ett motsvarande
  inbyggt API för verkliga WebKit-fingerdragningar: avbrottssekvenserna där är
  syntetiska; tryckningar är riktiga browserpekningar. Chromium använder även
  riktiga CDP-touchdragningar för drag–släpp–skroll och dubbeltryck–skroll–kortbyte.
- Fysisk iPad med Safari och Apple Pencil samt Windows Edge återstår att prova.
  Den tillgängliga Edge-körningen avser Linux.

## Resultat från verkliga original

Elva unika Fujifilm X-T2 RAF (6032×4032), ordinarie WASM-avkodare i Chromium
156 på Linux. [Maskinläsbara resultat](raw-results.json) innehåller källhashar,
val, analysområden och importdiagnostik. Sex fall gick vidare automatiskt och
fem öppnade justering med sitt sparade förslag. Alla väntande fall kunde
bekräftas och lämna justeringsläget utan att källversionen ändrades.

| Original | Tillstånd vid import | Detektorns diagnostik |
| --- | --- | --- |
| _DSF8434 | Automatiskt | coherent-quadrilateral |
| _DSF8948 | Väntande förslag | scale-disagreement |
| _DSF8951 | Automatiskt | coherent-quadrilateral |
| _DSF8983 | Väntande förslag | scale-disagreement |
| _DSF9229 | Väntande förslag | weak-boundary-support |
| _DSF9231 | Automatiskt | coherent-quadrilateral |
| _DSF9235 | Automatiskt | coherent-quadrilateral |
| _DSF9237 | Automatiskt | coherent-quadrilateral |
| _DSF9238 | Väntande förslag | competing-regions |
| _DSF9239 | Väntande förslag | weak-boundary-support |
| _DSF9243 | Automatiskt | coherent-quadrilateral |

Detektorn kördes på den ordinarie tekniska previewkedjan. Detta ska inte blandas
ihop med PR #96:s isolerade experiment på 480-pixelsprov; antalet automatiska
acceptanser där kan skilja sig. Algoritmen och trösklarna är inte ändrade här.
För 8983 och 9235 var SHA-256 på den åter skapade 480-pixels tekniska källan
exakt samma som respektive sparade referensprov.

**Viktig begränsning:** verktyget tryckte mekaniskt Bekräfta på de fem väntande
fallen för att prova tillståndsövergången. Det är inte en manuell fotografisk
bedömning eller ett godkännande av deras gränser. I synnerhet konkurrerande
regioner kan fortfarande kräva korrigering. Ingen allmän träffsäkerhet hävdas.

[Kontaktkarta från riktig RAW-import](screenshots/raw-workflow-contact.jpg)
visar 8983 före/efter bekräftelse och 9235 med automatisk acceptans. Det är
skärmbilder av appens preview, inte nya fullupplösta RAW-exporter. Före och efter
8983 har samma källa, profil, exponering och manuella bildjusteringar; den
avsiktliga skillnaden är godkänd analysyta och dess omräkning.

[PR #96 före ändringen](screenshots/pr96-bounded-8983.jpg) och
[lagrad baslinje](baseline-8983.json) visar helbildsfallback, 0,55 och stängt
justeringsläge för det kontrollerade 8983-provet. Detta är en separat körning
med den lilla tekniska fixturen, inte en fullupplöst RAW-före/efter-mätning.

Layoutbilder: [1024×768](screenshots/review-1024x768.jpg),
[390×844](screenshots/review-390x844.jpg),
[844×390](screenshots/review-844x390.jpg). Testerna kontrollerar också att
44-pixels träffytor och knappar ligger inom sina synliga områden.

## Kompletterande webbläsarverifiering

De nya riktade filmrute- och reglagetesterna har passerat i Chromium 156,
Microsoft Edge 157 på Linux och Playwright Linux WebKit (rapporterad Safari
27.2-user-agent). Fem viewportstorlekar ingår i respektive filmrutetest.
Chromium och Edge klarade båda de riktiga touchsekvenserna drag–släpp–vertikal
skroll samt dubbeltryck–skroll–kortbyte, med exakt oförändrat reglagevärde under
skrollningen och ingen kvarvarande pekägare.

Även **riktig RAW-import i Linux WebKit** har körts för 8983 och 9235:
[se resultat](raw-webkit-results.json). 8983 öppnade sitt väntande förslag,
9235 gick vidare automatiskt, båda med samma tekniska källhash som sina
sparade referensprov. Dessa körningar använder ordinarie WASM-avkodning,
inte browserprovets kontrollerade avkodare.

Den separata elva-originalskörningen verifierar flödet i fler motiv. Två
huvudbilder kördes om på implementationens commit `0d953b5`, inklusive den
rättade statusraden efter bekräftelse; deras skärmbilder och rader i rapporten
har uppdaterats. Rapporten är ingen prestandajämförelse.

Befintliga tester för andra bildverktyg accepterar nu uttryckligen sin
demobilds filmruta innan de prövar det normala verktygsfältet. Projektprov som
ändrar filmrutan använder dess bekräftelsekedja i stället för att enbart sätta
en boolesk flagga. Det nya väntande tillståndet provas separat och godkänns
aldrig automatiskt av testharnessen.

Full regression körs via befintlig `npm run test:full` och PR:ens ordinarie CI.
Den omfattar V2/D, Neutral/filmprofiler, GPU/CPU, projekt/kö, importavbrott,
JPEG, PNG8/PNG16, TIFF16, exportavbrott och pixel-/geometriregressioner. Slutlig
status finns på PR:ens CI-kontroller; fysisk iPad-verifiering ingår inte.
