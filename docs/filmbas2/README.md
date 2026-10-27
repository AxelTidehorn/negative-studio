# Filmbas 2

Utgår från `main` a393d4f6627f30eedea12263d2ade62c745300b8 (PR #32).
Kravens nulägesmatris finns i [requirements.md](requirements.md).
De två ursprungliga implementationsbilagorna var identiska. Förstudien har nu bifogats och använts i [kompletteringen av PR #33](review-corrections.md), där korrigeringar, nya tester och prestandamätningar redovisas.

## Användning

Öppna **Filmbas och tekniska nivåer → Filmbas 2** och aktivera uttryckligen.
Äldre projekt behåller sin tidigare motor- och kalibreringssemantik tills aktivering.
Ange en film-/avfotograferingssession före godkännande om referensen ska delas.

Sök automatiskt eller rita ett rektangulärt prov på negativet. Flytta genom att dra
inuti, ändra storlek med hörnen. Den befintliga 7×7-pipetten skapar också ett förslag
i v2. Negativvisning väljs under områdesarbete och föregående visning återställs när
verktyget stängs. Luppen förstorar källpixlar 8×, före positivkonvertering.

Statistiken visar linjär RGB-median, MAD, robust relativ spridning, antal prov,
kanalvis klippning och låg signal. Klippta, mörka, mycket ojämna och små prov går
inte att acceptera. Kontrollera även den visuella provytan: en homogen yta är inte
ensam bevis för oexponerad film.

Förhandsgranska före/efter, avbryt eller acceptera. Godkännande låser bas och respons
separat; båda kan låsas upp. Om responsen hålls låst vid ett nytt basgodkännande
bevaras dess kanaloffset, kanalskalor och form. **Ångra godkännande** återställer
föregående individuella referens/rullval under samma bildsession. Ny mätning rör
inte godkänd referens. Escape avbryter ett aktivt prov-/förhandsgranskningsverktyg.

De befintliga knapparna **Spara som rullens filmbas**, **Använd rullens filmbas**
och **Rensa rullreferens** används även för v2. Delning kräver uttryckligt
sessionsnamn och identisk registrerad capture-kontext; individuell override
skapas genom godkännande på den aktuella bilden. Okänd fysisk ljusändring eller
icke registrerad WB i en TIFF kan inte upptäckas från bildmetadata. Sessionsnamnet
är användarens bekräftelse på sådana lika inställningar.

Export avslutar en tillfällig förslagsförhandsgranskning och tar ett kopierat
kalibreringssnapshot av den godkända beräkningen. Projekt sparar referens,
provregion(er), statistik, ljus, respons, adapters, versions-ID, låsning,
proveniens, kontext, rullreferens och bildens override. Felaktiga v2-poster avvisas
före projektmutation.

## Genomförande och funktion-för-funktion

| Funktion | Leveransstatus | Verifiering |
|---|---|---|
| Filmrutans befintliga fyra sidor/lås/bekräfta/reset | FINNS, bevarad | Befintliga Node-/Chromiumprov |
| Automatisk regional detektor | ÄNDRAD | Syntetiska orange, andra masker, neutralt, hållare, textur, clipping, avstående |
| Automatisk/manuell gemensam statistik | ÄNDRAD | Samma `measure`, källvärden, rå integer-clipping före normalisering |
| Sammanhängande homogena celler och regional överensstämmelse | ÄNDRAD | Grannar i fyra riktningar; kandidatvektor från verkliga celler; avvikande regioner ger kontrollstatus |
| Inre mellanrutekorridor | ÄNDRAD | Konservativt förslag för kontroll; klassas aldrig som säker uppmätt rebate |
| Orange mask | ÄNDRAD | Liten poängprior, inget inträdeskrav |
| Hållare/perforering/damm/textur/blandningar | ÄNDRAD | Klippning, låg signal, robust variation, stratifierade prov och regionkonsensus; ingen semantisk objektdetektor |
| Godtycklig rektangel/flytta/hörnjustera | ÄNDRAD, VERIFIERAD i Chromium | Mus + faktisk touch-protokoll på emulerade storlekar |
| 7×7-pipett | FINNS, v2 granskningssteg tillagt | Samma källdomän; äldre beteende bevarat |
| 8× negativlupp och källstatistik | ÄNDRAD, VERIFIERAD i Chromium | Skärmbilder på fyra storlekar |
| Före/efter, automatisk/manuell jämförelse, avbryt/ångra | ÄNDRAD | UI + Nodeprov; förslag separerat från referens |
| Låst bas/respons, omanalys och async-race | ÄNDRAD | ROI-, sena förslag-, cancellation- och källbytesprov |
| CaptureContext/measurement/proposal/accepted/scene/response | ÄNDRAD | Versionsstyrda metadataposter, inga bildbuffertar i referenser |
| Fem motorer: Original/Standard/Curve/Density/Matrix | ÄNDRAD genom v2 adapters | Original behåller accepterade logkanaler; Standard sparad respons; Curve/Density/Matrix accepterade modeller |
| Filmrespons skild från scenanalys/kreativ färg | ÄNDRAD | `sceneAnalysis2`, accepterade tekniska adapters, befintlig redigering efter konvertering |
| Rullkompatibilitet och individuell override | ÄNDRAD | Importdomän, decoder, färgrymd, WB/gain, normalisering, ljus, flat-field, explicit session |
| Projekt och exportsnapshot | ÄNDRAD | Node och verklig browseråterläsning, TIFF/JPEG för fem motorer |
| Äldre projekt och färgberäkningar | FINNS, bevarade | Befintliga frysta numeriska/regressionstester; ingen automatisk v2-migration |
| Fri rotation/komposition/rutnät, hörn utan tom yta | FINNS, bevarade | Befintliga geometri-/presentationstester |
| Gemensam exportcrop/arv/projekt | FINNS, bevarad | Befintliga kö-/projekt-/browserprov |
| Footer, teman, paneler, fokus, sliders och reset | FINNS, bevarade | Full befintlig UI-svit + v2 layoutkontroller |
| Direktrespons under detektorsökning | ÄNDRAD | Begränsat 24×24 rutnät, stratifierat urval, yield per rad, revisionsvakt; ingen extra helbildsbuffert |

V2-koden finns i `src/calibration/film-base-{reference,measurement,controller}.js`
och `film-base.css`. `project-controller.js` sparar/validerar posterna;
`frame-controller.js` behåller RAW gain/WB-proveniens. `geometry-ui.js` exponerar
befintlig käll-/visningstransform för provverktyget. Manifest och HTML registrerar
bara dessa tillägg; ingen generell layoutomskrivning och ingen sjätte motor.

Leveransen hålls i en sammanhängande PR: referensmodell, användbart provverktyg,
detektor, integration och verifiering kan granskas och testas tillsammans.

## Tester och begränsningar

- `npm test`: **50/50** Node-grupper passerade, inklusive `tests/film-base2.mjs`.
- `npm run test:browser`: **18/18** Chromium-grupper passerade, inklusive `tests/film-base2-browser.mjs`.
- `npm run build` och `npm run test:build`: bygg- och cacheintegritet.
- Browserprov: desktop 1360×950, iPad-storlekar 1024×768 och 768×1024,
  mobil 390×844; skärmbilder i [screenshots](screenshots).
- V2-provet kodar verklig JPEG och 16-bitars TIFF med alla fem motorer.
  Fyra stödda GPU-motorer jämförs med CPU; Original använder befintlig CPU-väg.
  Syntetiskt prov gav högst ett 8-bitars displaystegs skillnad för Matrix,
  noll för Standard/Curve/Density. Det är ingen färgriktighetsmätning.

**EJ VERIFIERAT:** fysisk iPad Safari, verklig Apple Pencil och Windows Edge.
Chromium touch-/viewport-emulering ersätter inte dessa enheter.
**EJ VERIFIERAT:** verklig negativfärgriktighet, regional precision för alla
hållare/filmsorter och detektorlatens på fysisk iPad. Homogen belyst hållare kan
vara svår att skilja från neutral film; neutrala, enkants- och motstridiga fynd
märks därför för kontroll. Mycket smala rebateytor under gridupplösningen kan
kräva manuellt prov. Detektorn är konservativ och kan avstå trots att användaren
ser en användbar filmyta. Ingen sensordomäninversion inför kameramatris har införts.

För verklig jämförelse behövs RAF med registrerad kamera-WB/gain och oskuren
filmkant; 16-bitars linjär TIFF av samma exponering; ICC-taggad TIFF av samma
negativ; C-41 med olika masker och filmtyper, svartvit film, mellanrutor,
perforeringar och hållare; damm/text, snävt beskurna bilder och kanalvis klippta
exponeringar; känd neutral-/färgkarta och en oberoende referenspositiv. Testa samma
film med ändrad ljuskälla/gain och flat-field för att granska kompatibilitetsgränser.
