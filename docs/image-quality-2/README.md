# FILMLABB Bildkvalitet 2.0

Bas: `c0541bd`, senaste main efter #33 och #34, kontrollerad 2026-10-27. En PR, ingen automatisk merge. Ingen RAF från användarens jämförelse finns tillgänglig. Resultaten nedan gäller kodanalys och syntetiska bilder, inte verifierat naturligare fotografiska färger.

## Bekräftad rotorsak till liten filmbaseffekt

Standard, `color-calibration.js::estimate`, beräknar `offset_c = lo_c + log10(B_c/L_c)`. Pixelsteget beräknar `D_c = -log10(max(eps,I_c)*L_c/B_c)`. Därmed blir

`(D_c-offset_c)/span_c = (-log10(max(eps,I_c))-lo_c)/span_c`.

Bas och ljus tar ut varandra exakt när samma B/L används för att uppskatta offset och rendera, med oförändrad källbuffert och analysruta. Detta är en arkitekturbegränsning hos motivuppskattningen, inte bevis för att det manuella provet tappas bort. Källklippning före detta steg är oåterkallelig. Ändrad gain, normalisering, annan analys eller en tidigare fryst offset bryter förutsättningarna. Basens färg är inte en uppmätt spektral filmrespons.

Filmbas 2 mäter den linjära källan, visar median/MAD/spridning, klippning och låg signal, och sparar uttryckligen godkända prov. Referensen och responsen låses separat, normalt båda vid godkännande. `accepted2()` kräver kompatibel avkodning, domän, normalisering, gain, WB-metadata, ljus, flat-field och session. `explicitBase4()` använder det godkända provet. Standard återanvänder accepterad respons när den är låst; separat gemensamt tonomfång analyseras om från motivet. Tidigare låst respons kan alltså avsiktligt påverka ett nytt basprov. Äldre manuell/rullkalibrering finns kvar.

Original använder separata rådensitetspercentiler vid automatiska nivåer. Curve, Density och Matrix delar samma koordinat `(-log10(I)-lo)/span` när automatiska nivåer är på. Deras lagrade bas används då inte i koordinaten. Vid avstängda automatiska nivåer används bas/ljus i densitetskvoten. Filmbas 2 fryser adapterparametrarna för dessa motorer; deras låsta adapter har ingen separat motivtonanalys motsvarande Standards.

## Numeriska experiment

Kör `node tests/image-quality-experiments.mjs --write`. Fulla reproducerbara värden: [experiments.json](experiments.json). Samma linjära källpixel `[0.17,0.09,0.05]`; bas `[0.8,0.5,0.25]` respektive `[0.7,0.55,0.3]`:

| Isolerat experiment | Slutlig sRGB, flyttal |
| --- | --- |
| Ursprunglig bas/respons | 0.676074, 0.750544, 0.713951 |
| Ny bas, fryst respons och ton | 0.639709, 0.772470, 0.757679 |
| Ny bas, nyuppskattad respons/ton | 0.676074, 0.750544, 0.713951 |
| Samma bas, röd responsspann ändrad 10 % (känslighetstest) | 0.653287, 0.757122, 0.720234 |
| Ny analysruta, samma låsta tekniska respons, ny gemensam ton | 0.444439, 0.624453, 0.542482 |

Nyuppskattning med ändrad bas ger skillnad under 1e-12 för samtliga fem motorer i detta automatiska test. Ändrad analysruta i sista raden ändrar inte de tekniska pixelkoordinaterna; ljushet/tonfördelning ändras. Neutral, hudtonsliknande, röd/blå dominant, varm/kall, tät och tunn syntetisk transmission ingår. Dessa enkla spektralt oidentifierade signaler ersätter inte porträtt eller riktiga filmskanningar.

## Faktisk bildkedja

| Steg och ägare | Fakta och parameterursprung |
| --- | --- |
| RAW: `raw-decoder.js`, `raw-input.js` | LibRaw WASM 1.6.0, outputBps 16, useCameraWb true, noAutoBright true, gamm [1,1,0,0,0,0], bright 1. Skyddat standardläge avkodar Rec.2020 (outputColor 8), transformerar med fast D65-matris till linjär sRGB, gemensam 1/2-gain, klipper negativa/utanför representerbart område till uint16. Wide behåller linjär Rec.2020 som float. Reference använder outputColor 1. Inga egna kanalvisa normaliseringsgain. Demosaikval och exakta applicerade kameragain sätts inte/exponeras inte av adaptern. LibRaws interna kameramatriser är inte uppmätta filmprofiler. |
| TIFF: `tiff-codec.js`, `color-management.js`, `frame-controller.js` | ICC RGB matris/TRC avkodas en gång, D50 PCS adapteras till D65 och linjär sRGB. En gemensam 99.9-percentilskala begränsar representerbara positiva värden. Skalan används i omvandlingen av bufferten; den är också metadata i sourceInfo, inte en andra skalning av working. LUT/CMYK stöds inte. Utan ICC används användarens linjär/sRGB-antagande. |
| JPEG/webbläsarbild: `source-controller.js` | Webbläsarens sRGB-väg, 8-bitars källa. sRGB avkodas till linjär källa innan modern analys. Inbäddad RAF-JPEG är uttryckligt reservläge, inte RAW. |
| Källa: `frame-controller.js`, `source-workflow.js`, `image-model.js` | working behåller originalupplösning. Flat-field korrigerar spatial ojämn belysning före analys och rendering; ljuskällereferens är separat diagonal färgreferens. Ny preview använder versionsstyrd linjär areanedskalning till högst 1400 px långsida. Äldre projekt utan previewSampling behåller nearest. |
| Analys: `source-analysis.js`, `analysis-controller.js`, `color-analysis.js` | Standard/Curve/Density/Matrix analyserar originalkälla i nya projekt, upp till 24 000 prov. Original har historisk previewanalys. Motivets kanalpercentiler och densitetsspann är uppskattningar, ingen känd neutral eller hudreferens. Teknisk filmruta styr analys; kreativ komposition, zoom och lupp gör det inte. |
| Standard: `color-calibration.js`, `standard-controller.js` | Uppmätt bas eller motivreserv; sparad/gemensam/accepterad respons prioriteras. Annars skattas separata kanaloffset/spann. Två kända neutrala ytor kan mäta relativ kanalrespons. Gemensamma luminanspercentiler 1.5/98.5 ger separat automatisk ton. Låg-signal-färgbegränsning och gemensam högdagerskuldra är befintliga, inte nya här. |
| Övriga motorer: `conversion3.js`, `render-core.js` | Original: historisk separat kanalnormalisering. Curve: begränsad PCHIP-prior. Density: gemensam densitetston och gamutbegränsning. Matrix: starkt regulariserad, liten motivskattad kromatransform, identitetsreserv vid osäkert underlag. De tre sistnämnda använder konverteringsmodell v1. |
| Kreativt: `editing-engine.js`, `creative-profiles.js`, `render-core.js` | Exponering, kontrast, ton, temperatur/tint, mättnad är användarinställningar efter teknisk omvandling. Redigering v2 arbetar i positiv displaylinjär domän via gemensam PCHIP-ton och kromabearbetning. Profiler/positiv återgivning är kreativa och skiljs från uppmätt kalibrering. Dessa värden uppskattas inte automatiskt vid import. |
| Preview: `preview-scheduler.js`, `gpu-renderer.js`, `preview-presentation.js` | Samma parametermodell som CPU/export, GPU för stödda motorer och kontrollerad CPU-reserv. GPU-källtextur har NEAREST, interaktiv lägre upplösning, efter vila högst 1400 px. Geometripresentationen kan interpolera separat. Ingen detaljförlust i källbufferten. Originaldetalj visar original-ROI före rotation vid 100/200 %. |
| Export: `export-controller.js`, `export-worker.js`, `tiff-writer.js`, `presentation-sampler.js` | Full källa, fryst konfiguration, CPU-kärna, randvis worker/reserv. Fullupplöst JPEG och 16-bitars sRGB-kodad TIFF med profil. Kvartsrotation utan finrotation är exakt pixelpermutation; fri geometri använder befintlig bilinjär interpolation av konverterade grannar i displaylinjär domän. Säker nedskalad JPEG behåller befintlig sampling. ZIP/batch återanvänder exportvägarna. Exportmatematiken ändras inte här. |

Alla fem delar import, källäsning, flat-field, teknisk filmruta, bildjusteringar/profiler, geometri och export. Koordinater, respons och automatisk presentation är motorspecifika. Därför kan liknande grundnormalisering göra att skillnaden mellan motorerna blir mindre än namnen antyder.

## RAW och färghantering: vad som är känt

Kameravitbalans multiplicerar signalen före FILMLABB. Om samma oklippta linjära kanalgain gäller för källa och bas tar den ut sig i deras kvot; klippning, kameramatriser och icke-diagonala färgtransformationer gör resonemanget otillräckligt i allmänhet. En kameramatris och vitbalans för positiv fotografering är inte automatiskt korrekt för invers filmfärg. Skyddad Rec.2020 → sRGB lämnar huvudmarginal genom gemensam gain, men negativa sRGB-värden klipps ändå. Täta negativ kan förlora relativ precision i svaga kanaler. Diagnostiken skiljer decoderCounts (hela LibRaw-resultatet före skyddad transform) från begränsad statistik i nuvarande normaliserade källa.

Bekräftat: ingen andra sRGB-transferfunktion i linjär RAW-vägen; ingen kanalvis egen gainnormalisering efter LibRaw. Okänt: användarens faktiska sensorclipping, WB, decoderresultat och TIFF-framställning. Kontrollerad linjär TIFF och samma RAF måste jämföras i samma domän, gain och ROI. En vanlig kamerarenderad TIFF är inte ett kontrollerat linjärt facit.

Den externa kodjämförelsen och dess källhänvisningar finns i [neo-audit.md](neo-audit.md).

## Kandidater och beslut

1. **Fryst teknisk respons och gemensam motivton:** redan implementerat i Filmbas 2/Standard; återanvänds. Experimenten verifierar både dess stabila koordinater och att tonanalys fortfarande kan ändras. Ingen ny motor.
2. **Gemensamma i stället för separata kanalsluttningar:** kan bevara motivdominanter men kan inte identifiera okänd filmrespons. Syntetiska dominanter visar problemet med att tolka kanalpercentiler som teknisk referens. Införs inte utan uppmätta neutralserier/filmreferenser och riktig jämförelse.
3. **Automatisk gråvärdes-/kanalbalans:** neutralt motivmedel är ingen säker premiss för färgdominerade motiv. Införs inte som ogrundad global korrigering. Neo använder ett särskilt konfidensbaserat positivt AWB-steg; det bevisar inte att samma trösklar är lämpliga i FILMLABB.
4. **Lågpassfiltrerad preview:** syntetiskt schackmönster hade medelavvikelse 0.5 från korrekt 0.5 med nearest; exakt area gav 0. Konstant signal, totalmedelvärde, icke-heltalsskalor och smala dimensioner verifieras. Infört som `previewSampling: area-v1` för nya bilder, explicit `nearest` vid äldre projektimport. Ingen skärpning läggs på. Detta korrigerar aliasing; det återskapar ingen förlorad detalj och bevisar inte att riktiga foton ser bättre ut.

Mätning i Headless Chromium 154: 6 MP → 1400×933 tog cirka 282–689 ms i de första körningarna; extra radbuffer 33 600 byte och previewbuffer 15.7 MB. Syntetisk diagnostik på 540 000 pixlar tog 117–299 ms och blev cirka 14.5 kB. Se [performance.json](performance.json) för aktuell körning. Kör `node tools/measure-quality-browser.mjs --write` för att upprepa mätningen. Samtidiga tester påverkade den andra körningens tid. Importfiltreringen är synkron, sker en gång per import/ombyggnad och kan bli märkbar på svag iPad. Reglagens rendering filtrerar inte om originalet. ICC/flat-field använder den generella läsvägen och kan kosta mer; fysisk enhet måste mätas. Filtrering av transmission före en icke-linjär inversion kan också ge andra finstrukturmedel än nedskalning efter konvertering; verkligt filmkorn måste jämföras i preview och export. GPU:s senare interaktiva nedskalning och säker JPEG:s gamla nedskalning ändras inte; där kvarstår aliasingrisk. Aggressiv skärpning eller nya tonkonstanter saknar stöd och införs inte.

## Lokal diagnostik och användning

Öppna **Inställningar → Experiment och diagnostik → Exportera bilddiagnostik (.json)** efter import. Filen laddas ned lokalt. Inget nätverksanrop ingår. För jämförelse: exportera före och efter en ändring och kör:

```
node tools/compare-diagnostics.mjs fore.json efter.json
```

Verktyget listar ändrade parameter-/statistikfält och numeriska differenser. Det avvisar okänd schemaversion och filer över 200 kB. Det behöver varken bildfilen eller webbläsaren.

[diagnostics-v1.schema.json](diagnostics-v1.schema.json) beskriver JSON-schema v1. [diagnostics.md](diagnostics.md) beskriver fältens betydelse och integritetsgränser. Kända mellanresultat mäts via befintlig CPU-kärna; en saknad separat legacydensitet märks otillgänglig. Inga påhittade sensordata exporteras. Kontrollerade jämförelser arbetar på kopierade små parametrar och begränsade lokala prov; aktiv state, lås, ROI och reglage ändras inte.

## Beskärningspanelen

Verktygen ligger längst ned i mitten av själva bildvisningsytan med 8 px inre avstånd. Dölj/Visa bildverktyg behåller pågående kompositionsoperation och bildinställningar. Valet gäller genom bildbyten i samma öppna session. Tangentbord, synliga namn och alla fem språk finns kvar. Endast den faktiska panelen fångar input; filmrutans och filmbasens precisa verktyg behåller sin separata UI-hantering. Panelen kan täcka en del av bildens nederkant; dölj den för att nå handtag där. Exakt vinkel och befintlig bekräftelse finns kvar i kontextpanelen. Ingen ytterligare UI-ombyggnad.

## Verifiering och kvarvarande risker

Automatiskt: **76/76 grupper passerar** i full befintlig Node/build/Chromium-svit inklusive nya matematik-, diagnostik-, area- och paneltester. Fullständiga gruppresultat och tider: [test-results.json](test-results.json). Slutliga riktade tester kördes också efter text-/statistikpolish. Nya browserflöden använder verklig musdragning, touch-tap, tangentbord och betrodd simulerad pen-pointer genom Chromiums inputprotokoll. Före/efter-bilder på desktop, iPad landskap/porträtt och mobil finns i `screenshots/`. Det är emulering i Chromium, inte fysisk UX-validering.

Ej verifierat: fysisk Safari/iPad, Apple Pencil, Windows Edge; verkliga RAF/TIFF-par från samma negativ, hudtoner, rullstabilitet under verklig belysning och fotografisk skärpa gentemot Neo. Be användaren exportera rapporter från samma RAF med neutral och aktuell kreativ redigering samt manuellt accepterad bas. Nästa bildtest behöver samma framkallning, ROI, RAW-läge och färghanterad visning, gärna gråkil/ColorChecker i positivt motiv och negativreferens. Jämför full export, inte bara olika storlekar av preview.
