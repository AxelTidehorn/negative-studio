# Standardmotor: separat A/B-experiment

Bas: `main` **b2b7f87**. **Både #21 och #22 är mergade.** Nytt läge ersätter
inte deras resultat automatiskt. RAF-originalen är inte tillgängliga lokalt;
syntetisk förbättring bevisar inte att fotografiernas prickar försvinner.

## Växling och kompatibilitet

Under **Avancerade inställningar → Kalibrering och toner → Standardmotor · A/B-test**:

- **Befintlig standard** (`colorMode4: 'legacy'`): exakt main-resultat inklusive
  #22 och #21 när dess `toneMode4: 'experimental'` faktiskt finns i inställningarna.
- **Ursprunglig standard** (`'original'`): exakt standardkärna före #21/#22,
  verifierad mot **3a24fcd**. Den vanliga mjuka skuldran och reglagen bevaras.
- **Experiment · robust densitet** (`'robust'`): vald kandidat A nedan, utan
  #21-neutralisering och utan #22:s generella nedblandning av låg signalkroma.

En ny inställning, individuellt sparad med bildens övriga inställningar. Saknat
eller okänt värde betyder `legacy`; äldre projekt byter alltså inte återgivning.
Valet följer med JSON-projekt och låses under export. Växling analyserar inte om
filmrutan, byter inte profil och ändrar inte respons, geometri eller reglage.
`reference`-tonåtergivning fungerar i alla tre lägen; det tidigare
`experimental`-högdagerexperimentet används bara i `legacy`. Dess befintliga
UI-handler normaliserar fortfarande ett manuellt val till `smooth`; det nya
A/B-valet använder en egen, testad handler.

## Observation och hypotes

Aktiv CPU/worker/export går via `render-core.js`; GPU via `gpu-renderer.js`.
Jämförelsemotorn **log39** klipper separat normaliserad densitet per kanal före
slutlig tonåtergivning. Standardmotorn behåller signerade responskoordinater och
använder ett gemensamt tonintervall och en RGB-proportionell skuldra.

Derivatan av densiteten är `−1/(ln(10) · transmission · responsSpan)`. Små
kanalskillnader kan därför förstärkas nära noll, även efter att negativa
matristransformerade RAW-kanaler klippts. Ingen NaN-/GPU-precisionsdefekt har
påvisats. Det är en hypotes att detta förklarar de verkliga blåvioletta prickarna,
inte ett konstaterande om demosaik, sensorbrus eller filmkorn.

## A: mjuk behandling av kanalavvikelser

Den separata tekniska responsen, dess LUT och kalibreringen är oförändrade.
Efter gemensamt tonintervall, före exponering/vitbalans:

1. Förberäkna kalibrerade gränser för transmission **64/65535** och **4/65535**,
   med bildens respons, filmbas, ljuskälla och gemensamma tonintervall.
2. För varje kanal används den monotona mjuka funktionen
   `F(x) = x − d + range · (1 − exp(−d/range))`, där `d=max(0,x−start)`.
   Den har derivata 1 före knät och avtagande derivata efter det.
3. Beräkna avvikelser `F(kanal)−F(gemensamNeutral)`. Återcentrera deras viktade
   medel till noll och begränsa längden om någon komponent annars blir negativ.
4. Blanda högst **50 %** mot kandidaten, med smoothstep-styrning från minsta
   källtransmission mellan gränserna ovan. Fortsätt genom befintlig ton/profilkedja.

Neutrala kalibrerade värden behålls, och gemensam viktad intensitet bevaras i
just detta steg. Slutlig visningsluminans och färgriktning kan ändras genom
kanalberoende kompression, vitbalans, gamut och skuldran. Ingen rumslig blandning
sker. Över signaltröskeln är resultatet exakt oförändrat mot originalmotorn.
Svartvitt och log39 påverkas inte. Trösklarna är en **fast experimentell heuristik**,
inte en uppmätt brusmodell. Täta äkta färger kan försvagas; information som
klippts i källan återskapas inte.

## B: lokal krominansoperator – endast utvärderingsprototyp

`test/helpers/color-ab-candidates.mjs` implementerar en fullkällebaserad 3×3-
median av två krominanskomponenter efter teknisk konvertering. Grannar väljs
med luminansskillnad <0,025; minst fem krävs. Avvikelse över 0,02–0,10 och låg
transmission styr blandningen. Gemensam intensitet bevaras före tonkedjan.

Den testas på samma fullupplösta syntetiska koordinater och kalibrering som A.
Den är **inte** kopplad till lågupplöst preview eller produktionsrendering.
Den tar bort isolerade prickar bättre, men kan inte skilja en äkta tunn
isolerad färgdetalj från ett fel med samma lokala struktur. Den skulle även
kräva korrekt halo-/grannöverföring i exportstripes och motsvarande provtagning
från originalets grannar i GPU-preview. Dessa export-/renderingsvägar ändras inte
för en kandidat som ännu inte motiveras av bildkvaliteten.

## Samma källvärden, oförändrade parametrar

Kromafel RMS i linjärt visningsljus mot den kända rena syntetiska bilden:

| Testbild | Original | A (vald) | B |
|---|---:|---:|---:|
| Neutral med kanalbrus | 0,016015 | 0,011777 | 0,014001 |
| Svagt blå med kanalbrus | 0,020354 | 0,014403 | 0,016417 |
| Cyan med kanalbrus | 0,020516 | 0,019156 | 0,016366 |
| Isolerade färgprickar | 0,012224 | 0,008572 | 0,005049 |
| Ren tät färgkant | 0 | 0,018672 | 0 |
| Äkta tunn färgdetalj | 0 | 0,005460 | 0,014437 |

Testet låser offset=0, span=4 och varierar transmission/brus med känt motiv.
A minskar kromafelet ca 26–30 % i neutral/svagt blå/prick-fallen och ca 7 % i
cyan-fallet. A ger ett färgskifte på rena täta kanter, men ingen färgblödning från
grannar. B är bäst i prick- och cyan-fallen och bevarar den breda kanten, men
försvagar den äkta tunna detaljen mer. A väljs som försiktigare praktiskt
experiment; ingen av kandidaterna löser alla fall. Full styrka A provades också:
mer brusdämpning, men större bias i cyan och täta färger; därför halverad styrka.

## Tester och kostnad

- **35/35 Node-grupper, 10/10 browsergrupper, produktionsbygge och byggtester
  passerar.** Baseline main: 34/34 Node-grupper. Inga gamla referenser/toleranser ändras.
- Nya historiska referenser är genererade från kärnorna vid 3a24fcd/b2b7f87,
  med 36 konfigurationer av arbetsrymd, profil, tonläge och reglage. De historiska
  kärnorna jämförs exakt i samma Node-version; frysta JSON-värden kontrolleras
  dessutom exakt efter 8/16-bitarskvantisering. Detta undviker en ULP-skillnad
  mellan Node 22 och 24 utan att införa en tolerans eller ändra bildbehandlingen.
- Oberoende skalära A-orakel, neutrala/mättade färger, jämna gradienter,
  gemensam intensitet, låg transmission, klippning och flat-field testas.
- Testerna följer den valda punktsamplingen genom CPU, GPU, faktisk preview-
  och JPEG-worker, huvudtrådsreserv, 16-bitars TIFF och fri exportgeometri.
- CPU-mätning: `node test/color-ab.mjs --benchmark`. Sju uppmätta, växelvisa
  körningar efter två uppvärmningar. B är en småbildsprototyp; dess tid är inte
  en optimerad produktionsimplementation. För 12 065 lågtransmissionspixlar:
  original 53,59 ms, A 99,66 ms, B 158,81 ms (delad Node-miljö, direkt pixelväg).
  Detta är inte en mätning av fysisk GPU, iPad eller fullstor kamerabild.
- Inga nya beroenden, fullstora mellanbilder eller GPU-texturer. A tillför upp
  till sex exponentiella operationer på berörda pixlar; högre signal kringgår dem.
  Befintliga LUT, stripebudget och fem-bildersgräns behålls.

Visuell RAF-bedömning, fysisk iPad Safari/Edge och verklig GPU-tidsmätning återstår.
Ingen automatisk merge eller påstående om eliminerade fotografiska artefakter.
