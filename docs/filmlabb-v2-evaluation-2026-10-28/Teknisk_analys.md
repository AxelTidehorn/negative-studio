# FILMLABB 2.0 - praktisk utvärdering

28 oktober 2026. Riktiga RAF-original från Fotolab. Inga original har ändrats och ingen produktionskod, PR eller merge har skapats.

## Beslut

V2 är en körbar och reproducerbar densitetsmotor, men slår ännu inte befintliga FILMLABB som automatisk fotografisk konverterare. Två separata problem är verifierade: otillräcklig automatisk tonplacering och kvarvarande färgfel efter mätt filmbas. Att höja exponeringen tar inte bort blåsticket. En fryst positiv färgjustering hjälper vissa motiv men är inte en generell kalibrering.

Implementera först en bättre automatisk positiv tonplacering på ett verifierat filmruteområde, med mjuk högdagerbegränsning och korrekt invalidation av tonanalysen. Behåll färgändringarna som experiment tills de klarar en bredare fotografisk gate.

## Omfattning och källor

Drive-mappen listades om vid start och igen under slutkontrollen: 12 RAF-filer, 11 unika innehåll. De två `_DSF9239.RAF` har olika Drive-ID men samma SHA-256. Alla 12 packades upp med native LibRaw; alla 11 unika avkodades dessutom av FILMLABBs riktiga libraw-wasm. Alla har 6032 x 4032 utpixlar, Fujifilm X-T2, ISO 200, f/8 och metadata 80 mm. Tiderna i RAF beskriver digitaliseringen; de bevisar inte när filmfotografiet togs eller vilken rulle som användes.

Full filinventering med exakta byteantal, SHA-256, RAW-metadata, basregion och motiv finns i `manifest.json` och `inventory.csv`. Ingen filmtyp eller fysisk rullidentitet är verifierad. Alla bilder visar fotografiska färgnegativ; bedömningen bygger på bildinnehåll, färger och filmkant, inte på filnamn. Exakt emulsionsidentitet är okänd.

Källversioner:

- FILMLABB main: `17b01d463e3a785998b9644d16973c9fbb6634e9`.
- PR #36 / utvecklingsgren: `da3fe84a0fef0bb139602ca4ad998ede24e10538`.
- NegativeConverter: `324c2daefada7d8d8c783719f62bf7f27320349a`.
- [Produktion](https://axeltidehorn.github.io/negative-studio/), identifierad i README och Pages-workflow och hämtad via HTTPS.
- [V2-testlabb](https://axeltidehorn.github.io/negative-studio-v2-preview/v2.html), vars driftsatta metadata anger samma da3fe84-commit som testet.
- [PR #36](https://github.com/AxelTidehorn/negative-studio/pull/36).
- Arkitekturstudien lästes från main; Neo kördes därefter från den faktiska angivna koden.

Aktiva produktionsskript hämtades separat och hashades. `raw-input`, `render-core`, `color-calibration`, `color-analysis`, `color-configuration`, `project-settings`, `source-import` och `source-analysis` är byteidentiska med grenens byggda motsvarigheter. Skillnaderna i raw-decoder, film-base-measurement och TIFF-writer granskades: extra explicit options-ingång, injicerbar sampling/exporterad summarize och extraherad identisk TIFF-header; ordinarie A-anrop använder befintliga defaults. Detta verifierar relevanta beräkningsvägar, inte varje UI-fil i produktionen.

## Urval och oberoende validering

Alla 11 unika bilder konverterades. Parametrar för de statistiska färg-/responsförsöken frystes från 00, 01, 02 och 06. Övriga utvecklingsbilder är 03, 04, 05, 08 och 11. 09 (snöscen) och 10 (utomhuspar) reserverades för validering. Inga parametrar ändrades efter fotografisk granskning av dessa två. Första basregioner som träffade hållaren underkändes genom kontroll i avkodad negativbild och rättades innan den slutliga parameterfrysningen. De sparade `rejected_roi`-diagnoserna är negativa kontroller, inte giltiga filmbasmätningar.

Urvalet innehåller flera hudtonsmotiv, dagsljus, fönsterljus, färgdominerade motiv, snö, starka högdagrar och mörka skuggor. En nöjesfältsbild innehåller starka färger/ljuskällor. En säker nattserie saknas; frånvaron av natt-till-dag-regression är därför inte bevisad. Det mörka snönegativet är inte en nattbild.

## A - verkliga FILMLABB

`FILMLABB_REFERENCE.load` anropar verkliga `importRoll`, som aktiverar ordinarie import, bild-/filmruteanalys, bas, kalibrering, profil och inställningar. Inget neutralt Standard-snapshot används som fotografiskt A.

Faktisk kedja för dessa RAF: libraw-wasm 1.6.0 -> 16-bitars linjär Rec.2020 med kameravitbalans, gamma [1,1], noAutoBright -> `NSRawInput.convert('protected')`: fast Rec.2020-till-linjär-sRGB-matris och gemensam gain 0,5, avrundning/klippning i Uint16 -> automatisk filmruta/bas -> `NSColorCalibration.estimate/analyze` -> calibrated4:s per-kanaliga densitetskoordinater och gemensamma tonrange -> verklig render-core/Editing 2.0 med faktiskt generic-/neutralrecept -> sRGB-transfer och TIFF RGB16 med sRGB ICC.

Den verkliga appens TIFF-exportfunktion kördes också separat på 00, med endast nedladdningsmottagaren ersatt av en lokal filskrivare. Dess resultat och testharnessens A-TIFF har exakt samma SHA-256: `1d747efaab02b423db4a884de02a1042b1b19f22ae6d78f8b166cc48edde397f`. Därmed är pixelvägen verifierad genom faktisk export, inte bara kodläsning.

A:s bas är appens faktiska automatiska bas, inte V2:s manuella bas. A och B använder samma original och samma exporterade källrektangel, men inte identiska ingångsvärden/färgrymder. A:s fixed gain och matris/klippning får inte beskrivas som en isolerad motorskillnad. Alla faktiska recept finns per bild i `*_decode.json`.

## B - oförändrad V2

V2 avkodades med exakt worker-recept: outputBps=16, outputColor=8, useCameraWb=true, useAutoWb=false, noAutoBright=true, gamm=[1,1,0,0,0,0], bright=1, noInterpolation=false, halfSize=false, userQual=3, useCameraMatrix=3, highlight=0, threshold=0. Float32 = Uint16/65535, linjär Rec.2020, gain 1. userQual=3 är en begäran; faktiskt internt X-Trans-interpolationsval är inte instrumenterat och kallas därför inte verifierat AHD.

Den oförändrade JS-kärnan och fast/render/output-modulerna användes direkt för B-exporterna. Tre lägen sparades: `technical` (ingen automatisk ton, men normal display/gamutgräns), `fixed` (Reinhard, 0 EV) och `auto` (befintlig intent). Tekniska linjära positiva värden före display/ton finns dessutom i NPZ och i enskilda källpixelprover. NPZ är en reducerad, linjärt medelvärdesbild av den tekniska positiven, inte ett fullupplöst negativ eller en sRGB-bild. Övriga previews filtreras efter konvertering.

För varje kanal:

`T = J/B`, `D = -log10(max(T,1e-8))`, `P = 0.18 * 10^((D-1)/0.65)` med kodens övriga gränser och giltighetsflaggor.

Responsen är en prior, inte en uppmätt filmrespons. Det gemensamma referensvärdet D=1 påverkar global skala. Med samma lutning i alla kanaler påverkar det inte P_B/P_R. Exponering och den gemensamma luminanstonkurvan ändrar inte heller positiva kanalrelationer före display. Enbart en EV-ändring kan alltså inte avlägsna ett blåstick som redan finns i den tekniska positiven.

### RAW/färghantering

En oberoende native LibRaw 0.22.1-körning med motsvarande explicit linjärt Rec.2020-recept gav samma storlek och medianförhållande native/WASM ungefär 1 i alla kanaler. P99 av absolut pixelavvikelse och största avvikelse finns i `decode_crosscheck.json`. Sällsynta avvikelser finns, och körningar med olika trådantal gav något olika extremavvikelser. Det bevisar inte identisk intern demosaikering, men motsäger ett generellt extra gamma- eller skalningsfel i 00. Ingen motsvarande ramp genom alla kameror är körd.

WASM levererar redan Uint16 och kan därför inte visa negativa kamera-till-arbetsrymd-värden eller all klippning före denna gräns. De observerade källvärdena är icke-negativa; det är inte ett bevis att intern färgmatris aldrig gav negativa värden. Källklippning rapporteras per kanal. 08 har 214273 röda klippta källpixlar över hela källan, cirka 0,88 %, och 2,4 % röda klippta prover i vald basregion. 03 och 09 har också viss kanalvis klippning. Lokaliseringen/filmkanten måste skiljas från klippning i motivet.

Utgången konverterar Rec.2020 -> linjär sRGB, gör neutralaxelbaserad gamutkompression, en peak shoulder och sRGB-transfer. TIFF innehåller verklig sRGB ICC och 16 bit per kanal. Därför är en ljushets-/färgändring vid display inte automatiskt en densitetsdefekt. Tekniska och displaydata hålls isär.

### Filmbas

V2:s automatiska perifera detektor gav `missing` för samtliga 11 unika filer. I dessa fotografier ligger relevant filmkant ofta innanför hållare/ytterkant. Detektorn avstår alltså från att föreslå bas även när en användbar inre filmkant syns. Detta är en begränsning i detektionsområdet, inte bevis för att medianfunktionen är fel.

Basen i huvudtestet är mätt i manuellt utpekad synlig filmkant i faktisk linjär RAW, inte [1,1,1]. Per region sparas median, MAD, P95-P05/median, klippning, antal giltiga/ogiltiga prov och separat kvalitetsstatus. Alla accepterade regioners numerik är giltig. De flesta har variationsvarning, särskilt blå kanal; 08 har dessutom klippningsvarning och dess bas är osäker. Mätning med en varning får inte kallas säker kalibrering.

De underkända hållarregionerna på 04/06 gav basnivåer omkring 0,005 och exponeringsbehov över +10 EV. Efter rätt mätning blir begäran cirka +2,53 respektive +3,49 EV. Detta är ett verkligt exempel på att fel region kan dominera all efterföljande diagnostik. 05 och 11 korrigerades också; den initiala 08-regionen innehöll blandat område. Dessa körningar får inte användas som belägg för motorns normala bildkvalitet.

Små regionförskjutningar och statistiken för deras mätningar sparas i analys-JSON. Basförändringen ger kanalvis `Delta log10 P = log10(B2/B1)/0.65`. Känsligheten är förutsägbar, men provvariation och fel områdestyp är olika problem.

### Mörker och ton

I huvudtestet begär befintlig source-content-analys +0,39 till +3,49 EV; tio av elva bilder begränsas till +1 EV. Det tidigare syntetiska +4,1 EV är inte ett resultat för dessa filer. Medianen för 00:s tekniska luminans i den sparade analysmasken är 0,03589. Begäran är +2,326 EV och applicerat +1. Efterföljande `P*e/(1+Y*e)` komprimerar signalen vidare; den kan inte skapa den exponering som begränsningen nekade.

Masken är källankrad och heuristisk. Den tar bort vissa kantanslutna bas-/hållar-/klara områden men känner inte motiv eller filmruta. Intilliggande filmrutor kan därför fortfarande ingå. Skillnad mellan full källanalys och filmruteanalys är dokumenterad; den är inte ett fel i logaritmen.

Verifierad koddefekt: `worker.parameters()` analyserar bara när `!intent`. Accept/reuse/undo av en ny bas återanvänder annars gammal intent och gammalt baseId tills explicit tone-körning görs. Ett +10 %-basekänslighetstest på samma 00-källa ändrar korrekt omräknad begäran från +2,326 till +2,129 EV, medan den gamla intenten fortfarande anger ursprunglig bas. Båda klipps här till +1, så testet visar inte en faktisk EV-ändring i just detta slutresultat. Felet finns men förklarar inte den första importens mörker eller blåstick.

## Experiment - alla med oförändrad kontroll

### 1. Exponering och ton

Kontroll: oförändrad B-auto med mätt bas. E1_median: borttagen hård EV-gräns, median före ton placeras vid 0,18. E1_robust: motivets tekniska P60 placeras kring 0,25 med mjuk P99-begränsning:

`e_mid = target / P60(Y)`, `e_hi = 3 / P99(Y)`, `e = e_mid / sqrt(1+(e_mid/e_hi)^2)`.

Samma Reinhard och display som kontrollen används. En fördefinierad lägre target 0,12 aktiveras om P99/P50 > 40; den grenen är inte validerad av detta material. Det är en grov dynamikheuristik, inte nattigenkänning. Testet gör alltså mer än att bara öka max EV: ramar in motivstatistiken, använder en högdagerbegränsning och skiljer exponeringsval från färg.

Köksbilden 05 är ett viktigt exempel: P60-modellen skulle begära +3,45 EV, men mjuk högdagerbegränsning ger +2,67 EV. Fönstret hålls tillbaka och motivets median blir lägre än i de andra bilderna. Det är en kontrollerad kompromiss, inte ett misslyckat försök att tvinga alla medianer till exakt samma nivå.

Cropstabilitet testades på ursprunglig ram samt 2 % och 5 % inset per sida med deterministiskt 200x200-källrutnät. Största EV-spännvidd i detta inset-test är 0,160 EV. Resultat finns per bild; kraftigt ändrade motivandelar kan ändra den robusta exponeringen. Detta är en känslighetsmätning, inte bevis för invarians mot all beskärning.

### 2. Kanalrespons

Gemensam gamma 0,55 och 0,80 jämfördes med prioren 0,65, med omräknad E1-ton för att skilja skalförändring från färg. Dessutom testades en fryst monoton per-kanalsmodell från fyra utvecklingsbilders medianer och P90-P10-densitetsspann. Lutningsmultiplikatorerna begränsades till [0,8,1,2] och blev ungefär [1,2; 1,037; 0,807]. Kanalvisa referensförskjutningar blev [-0,1083; 0,0221; 0,0863] densitetsenheter.

Detta är en statistisk normaliseringshypotes. Utan neutralsteg/kalibreringsmål kan materialets motivfördelning inte skiljas entydigt från filmens kanalrespons. Modellen är därför inte identifierad filmfysik. Den förbättrar vissa färgbalanser men ger också gröna/magenta variationer. Ingen generell kanalresponsändring rekommenderas från detta test.

### 3. Positiv färgkorrigering

E3_color testar en liten bildvis gray-world-justering, maximalt 0,2 EV per kanal före gemensam luminansnormalisering. E3_frozen använder samma oförändrade respons som B och E1_robust, följt av en fryst Rec.2020-positiv gain [1,271686; 0,937798; 0,718589], lärd från enbart 00/01/02/06. Detta motsvarar cirka [+0,347; -0,093; -0,477] EV. Samma korrigering används på alla bilder, så den kan inte anpassas i efterhand till valideringsmotivet.

E3_frozen är den visade experimentversionen. Den reducerar blådominansen i fasad och flera porträtt, men lämnar kraftigt cyan/blått i exempelvis bil-/vattenmotiven och kan ge rosa/lila skiftning. För snö och färgat ljus är automatisk neutralitet ingen kvalitetsgaranti. En konstant utvecklingsset-gain är inte en kandidat för generell produktionsdefault.

### 4. Gemensam bas mellan bilder

Ingen fysisk filmrulle är verifierad. Ett uttryckligen hypotetiskt skanningsgruppstest gjordes på 01/04/06/11: samma kameravitbalans/recept, närliggande metadata och likartad basform. Gemensam median R/G och B/G användes medan varje bild behöll sin G-nivå och individuella tonplacering. Största beräknade kanaländring är 0,0334 EV, cirka 2,3 procent i linjär gain; detaljer finns i `shared_base.json` och E4-kontrollerna. Detta visar hur gemensam kalibrering kan frikopplas från individuell exponering. Det bevisar varken rulltillhörighet eller bättre fotografisk konsistens inom en verklig rulle. Ingen automatisk sammanläggning rekommenderas.

## Neo-referensen och dess gräns

Tre original (00, 04, 09) kördes genom oförändrade `convertColorWithSilverCore` i exakt ovanstående NegativeConverter-commit, med explicit standardrecept och manuellt uppmätt filmbas i dess egen ingångsdomän. Native rawpy 0.27.1/LibRaw 0.22.1 avkodar full storlek, camera/auto WB true, sRGB-primärer, 16 bit, noAutoBright=false och gamma [0,45;4,5]. V2:s linjära Rec.2020-pixlar matas alltså inte felaktigt in som Neo-kodvärden.

Detta är en korrekt reproducerbar **SilverCore-referens med avgränsad konfigurering**, inte Neo-appens kompletta nybildsdefault. Efterföljande expired-film rescue och övrig main-app adjustmentkedja körs inte. Även Neos bundlade WASM ersätts av native LibRaw med dokumenterade options. Exakt likhet med en Neo-app-export kan därför inte hävdas. Referensen visas separat, vägs inte som ett objektivt facit och används inte för Delta E eller påstående att V2 vinner/förlorar mot full Neo. En fullständig Neo-standardjämförelse återstår.

## Kvantitativa resultat och fotografisk tolkning

`summary.csv`, `summary.json` och per-bild-JSON innehåller luminanspercentiler, kanalmedianer, låg-/högvärdesandelar samt separation mellan P1/P10 och P90/P99. Luminansmåtten avser linjär display-sRGB; de är inte medel av gammakodade JPEG-tal. B-statistiken använder det verifierade matematiska referensreceptet med samma källpixlar; publicerade B-bilder kommer direkt från oförändrade JS-moduler. Float32-porten kontrolleras mot 6400 individuella JS-källprover per bild, inklusive loggolv. Resterande små skillnader vid reducering mellan browserns exakta boxintegration och PIL BOX deklareras; inga pixelperfekta preview-differenser används som fotografiskt kvalitetsmått.

Medianen över bilder av bildmedian-Y är cirka 0,0466 för B-auto och 0,1586 för E3_frozen. Det bevisar ljushetsförändring, inte optimal exponering. Valideringsbild 09 går ungefär 0,0878 -> 0,1576; 10 går 0,0368 -> 0,1671. Den snöiga bildens högdagrar förblir relativt gråa i experimentet, och utomhusparets färgbalans är fortfarande problematisk. Mer exponering är alltså inte liktydigt med färdig fotografisk rendering.

Hårda RGB-högvärden i enstaka border-/defektpixlar finns även efter outputshouldern. 05 har omkring en procent blåa höga displayvärden i den reducerade E3-versionen; därför påstås inte att försöket saknar kanalvis klippning. Höjdpunktsseparation i luminans och RGB-klippning redovisas separat. Fullupplösta bilder kan ha andra enskilda maxima än reducerade previews.

Inga verifierade färgkort eller uppmätta neutrala reflektanser finns. Delta E mot A eller SilverCore skulle därför inte vara ett färgnoggrannhetsmått och används inte. Identifierbara skyltar/snö/ljusa kläder används för försiktig fotografisk bedömning, inte som spektralt verifierade neutralmål. Bedömningar av hudton, naturlighet och karaktär är delvis subjektiva. A är ofta ljusare och bättre färgbalanserad, men kan vara urvattnad och ha alltför ljusa högdagrar.

## Problemens klassificering

| Problem | Observation och stöd | Klass och kvarvarande alternativ |
|---|---|---|
| Mörker | 10/11 når +1-gränsen; E1 lyfter mellanregister på utveckling och validering | Brist i automatisk positivåtergivning. Priorens D=1 påverkar absolut skala; motivstatistik/crop medverkar. |
| Blå/cyan färg | Finns redan i positiva kanalrelationer med mätt bas; kvarstår efter EV-ändring | Otillräcklig färg-/responskalibrering och positiv färgåtergivning. Rec.2020-kanalblandning och filmrespons kan inte isoleras med materialet. |
| Extrem EV över +10 | Kopplas till underkänd hållarregion; försvinner vid korrekt mätområde | Otillräcklig basidentifiering/testregion, inte normalt motorbeteende. |
| Auto-bas missing | 11/11, trots synlig inre filmkant | Detektorbegränsning och brist i automatisering. |
| Gammal intent efter basbyte | Gammalt baseId/median återanvänds av worker | Verifierad koddefekt, men inte orsak till första körningens fel. |
| Källklippning | Verkliga Uint16-klippta kanaler och basvarning på 08 | Begränsning i källmaterial/avkodningsgräns; kan inte återställas genom tonkurva. |
| Rullrespons, färgprecision, natt | Inga verifierade rull-ID, neutralsteg eller säker nattserie | Begränsning i testmaterialet; inte etablerade produktionslösningar. |

## Högst tre utvecklingsuppdrag, rangordnade

### 1. Automatisk positiv tonplacering med högdagerskydd

Problem: merparten av bilderna förblir för mörka trots giltig bas. Verifierad orsak är hård +1 EV-gräns tillsammans med priorens absoluta skala och full-källstatistik. Inför filmruteankrad robust luminansanalys, ett mjukt högdagervillkor och separat dokumenterad önskad/applicerad exponering. E1 är en konkret startpunkt, inte slutlig universell default. Ogiltigförklara intent vid bas-/kalibreringsbyte; ge den egen revisionsnyckel. Berör `src/conversion-v2/render.js`, `worker.js`, `fast.js` och `diagnostics.js` samt tester.

Förväntad effekt: synliga och separerade mellan-/skuggtoner, särskilt buss och soffporträtt. Risker: överljus snö, ljusare nattkänsla, brus och återgivning av avsiktlig lågton. Godkännande: pixeloracle för samtliga lägen; inga gamla baseId i aktiv intent; utvecklings- och valideringsbilderna får fotografisk granskning sida vid sida; fönstret 05 skyddas bättre än med ren obegränsad median-EV; högvärdesandel/separation får inte försämras obemärkt. Lägg till riktiga natt-/lågtonsbilder före generell release. V2 får inte beskrivas som färdigt naturlig bara för att median-Y når ett mål.

### 2. Separat positiv färgkorrigering med evidens och avstående

Problem: gemensam respons plus mätt orange mask ger ändå cyan/blått; ton löser det inte. Hypotes: ett litet, fryst eller evidensstyrt färgsteg i positiva domänen kan förbättra användbarheten utan att låtsas vara filmfysik. Inför ett versionsmärkt gain-/litet matrissteg med identity-fallback, separat från densitetsrespons. Utgå inte från global gray-world per bild. Neutralankare i flera ljushetsband eller uttryckligen vald rullreferens behövs; visa confidence och begränsa ingrepp. Berör `render.js`, `fast.js`, kalibrerings-/intentkontrakt och diagnostik.

Förväntad effekt: mindre blått i fasad/hud/ljusa kläder. Risker: magenta i vatten/bil, neutraliserat varmt ljus, ändrad filmkaraktär, skillnader mellan rullar. Godkännande: frysta parametrar före validering, både kök/soffa och färgdominerade motiv måste passera; snö får inte bli godtycklig färgreferens; jämför även identity; ingen global gain från detta test skeppas som universell preset. Uppmätta neutralsteg krävs om steget kallas kalibrering.

### 3. Filmkantsdetektion innanför hållaren och tydlig mätkvalitet

Problem: nuvarande detektor söker i originalets yttersta remsor och missar synlig filmkant i alla 11. Testa begränsade ringar kring detekterad filmruta, med samstämmighet mellan flera remsor, separat hållar-/perforationskontroll och riktig abstention. Behåll numerisk mätning separat från kvalitet; låt inte ett säkerhetstal ersätta RGB/MAD/klippningsdiagnos. Berör `base.js`, `film-base-measurement.js`, worker/lab och diagnostik.

Förväntad effekt: färre manuella markeringar och färre katastrofala hållarbaser. Risker: motiv eller skuggad filmband väljs som bas, klippt bas godkänns, falsk rullgruppering. Godkännande: de sparade underkända regionerna får inte klassas som säker film; rimliga förslag ska lokaliseras till synlig filmkant i detta material; osäkra/klippta prover måste förbli explicit osäkra. Ingen automatisk gruppering efter filnamn eller skanningstid.

## Rekommenderad nästa implementation

Gör uppdrag 1 först. Det har det tydligaste kausala stödet och störst verifierad generell effekt: tio av elva bilder begränsas, och valideringsbildernas ljushet förbättras med oförändrad densitetsrespons. Det kräver ingen större arkitekturombyggnad och ingen påstått identifierad filmrespons. Det gör också nästa färgtest lättare att bedöma på rimligt exponerade positiva bilder. Uppdraget är inte ett löfte att enbart tonplacering gör V2 bättre än A; färgåtergivningen är fortfarande den stora kvarvarande fotografiska grinden.
