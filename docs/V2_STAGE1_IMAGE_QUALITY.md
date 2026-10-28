# V2 etapp 1: automatisk ton och försiktig positiv färgbalans

**Status: bildkvaliteten är förbättrad men de fotografiska acceptanskriterierna är inte generellt uppnådda.** Den tekniska grunden och en körbar förbättring levereras för bildgranskning. Detta är inte en generell produktionsrelease eller färdig filmkalibrering.

## Inventering och utgångspunkt

Kontrollerad `main`: `17b01d463e3a785998b9644d16973c9fbb6634e9`. PR #36 är öppen och innehåller V2-prototypen; PR #38 har squashmergats till dess gren som `768228a3908f82a495b16f68b1b3b1efbddc47cc` men inte till main. Denna sammanhållna PR mot main inkluderar dessa förutsättningar. Den ersätter inte produktionsmotorn och mergas inte automatiskt.

- Original/Standard och Curve/Density/Matrix finns kvar. `src/color/conversion3.js` innehåller bland annat PCHIP-respons, densitetston och regulariserad färgmatris. `configuration.js` fryser den befintliga applikationens recept. CPU och GLSL använder dess befintliga matematik.
- `src/conversion-v2/core.js` är den fristående linjära Rec.2020-kärnan med separat SourceDescriptor, BaseReference och CalibrationV2. Den gemensamma responsprioren är provisorisk. Filmbasdetektor, RAW-import och denna tekniska respons har inte ändrats av etapp 1.
- V2-labbets `render.js` skapar en separat positiv RenderIntent. `fast.js` är dess allokeringsfria CPU-väg. Samma intent och scalar-pixel används i workerpreview och stripe-export. Geometri/boxfilter kommer efter pixelkonverteringen.
- Befintligt `v2.html`, huvudapplikationens isolerade fotografiska A och utvecklarverktygen återanvänds. Ingen ytterligare motor eller applikation införs. Ordinarie GPU-preview, Editing 2.0, projektformat, tvåkolumnslayout, teman och footer ändras inte. V2-labbet använder fortsatt CPU; en full V2-GPU-port ingår inte.
- [PR #37](https://github.com/AxelTidehorn/negative-studio/pull/37), dess `Teknisk_analys.md`, PDF och hela privata 399-filspaketet har lästs. De senaste A/B-resultaten bygger på V2 före robust-tonändringen (PR #36 `da3fe84`), med manuell bas och fryst gemensam respons. A är den verkliga befintliga appens automatiska konvertering; den kan ha annan RAW-domän och bas och är inget färgfacit.

## Orsaker, skilda från efterkorrigeringen

**Mörker:** den fasta tekniska densitetsreferensen D=1 placerar dessa negativs tekniska positiver lågt. Den tidigare begränsningen till +1 EV hindrade den separata tonplaceringen från att kompensera. Detta är inte skäl att motivanpassa filmresponsen. PR #38 tog bort klippet och införde P60-placering med mjukt P99-skydd. Den ändringen återanvänds:

```
e_mid = 0.25 / P60(Y)
e_hi = 3 / P99(Y)
e = e_mid / sqrt(1 + (e_mid/e_hi)^2)
```

Y är teknisk linjär Rec.2020-luminans. Beräkningen sker stabilt i logdomän. ±16 EV är ett numeriskt giltighetsintervall; utanför används synlig 0 EV-fallback, ingen hård fotografisk klampning. Reinhard, outputmatris, gamutkompression och mjuk peak-shoulder behålls. Target och högdagernivå är experimentella hypoteser.

**Blått/cyan:** arkivets källprov och mellanresultat visar färgskillnaden redan i den tekniska positiven, före tonkurva/output. Samma gemensamma respons förstärker densitetsskillnader: 0,1 D ger en positiv kanalkvot `10^(0.1/0.65) ≈ 1.425`. Uppmätt filmbas korrigerar bastransmissionen; den identifierar inte filmens verkliga färgrespons, färgämneskoppling eller belysning. Materialet visar inte att ett decoder-, gamma- eller gainfel orsakar hela färgproblemet. Ingen sådan felorsak påstås vara bevisad.

Blådominansen varierar med ljusheten. Exempelvis har soffporträttets mörka delar betydligt lägre B/G än högdagrarna. En enda global kanalgain riskerar därför nya skuggstick. Ren exponeringsökning löser inte detta och kan synliggöra starkare blå högdagrar. Den nya positiva färgbalansen är en begränsad fotografisk uppskattning, **inte en ersättning för uppmätt teknisk filmrespons**.

## Implementerad färgbalans

`neutral-anchor-bands-1` analyserar samma maximalt 24 000 källförankrade prov som tonplaceringen. Den använder teknisk positiv linjär RGB, utan att ändra källa, filmbas eller kalibrering.

1. Återkommande kluster i log2(R/G), log2(B/G) söks separat i P30–P75 och P70–P97. Endast begränsat kromatiska kandidater övervägs.
2. Minst 32 stödprov och fyra av 16 rumsliga delområden krävs. Minst 15 % av motivet måste skilja sig från klustret. En dominerande enfärgad yta räcker alltså inte. Nästan lika stora, tydligt olika kluster ger avstående.
3. Styrkan begränsas med stöd, rumslig spridning och färgvariation. Måtten är heuristik, inte sannolikheter. Kanalernas gainparametrar begränsas till ±0,6 EV före gemensam luminansnormalisering, med maximal styrka 0,85. Normaliseringen kan ändra den slutliga enskilda kanalgainen; förändringen av kanalernas relativa gain är begränsad till 1,2 EV.
4. Om mellanregister och högdagrar skiljer sig mer än 0,65 EV i någon logkanalkvot används identitet för hela bilden. Saknat stöd i ett band ger identitet i det bandet.
5. Identitet vid P05 och uppskattade gains vid P55/P90 binds ihop med kontinuerlig smoothstep. Varje korrigerad pixel normaliseras tillbaka till sin ursprungliga Rec.2020-luminans. Det är ingen desaturering; färgskillnader mellan pixlar med samma luminans bevaras i logkvoter.

Inget E3_frozen, globalt gray-world, färgmatrisfit, nytt filmrecept, lokalt kontrastfilter eller skärpning införs. Neutralytor kan fortfarande förväxlas med återkommande färgade ytor. Begränsningar och explicit avstående är nödvändiga men bevisar inte korrekt naturlig färg. En stor färgad bakgrund tillsammans med flera mindre färgytor kan fortfarande ge en felaktig neutralpunkt.

`technical` och `fixed` behåller tidigare pixelbeteende och använder ingen ny färgbalans. Utvecklar-API:t kan välja `colorMode:'identity'` för en ren tonkontroll; inget nytt användarreglage införs.

## Automatik, analysidentitet och geometri

Den tidigare robust-tonversionen krävde manuell bekräftelse av analysfilmrutan. Befintliga huvudapplikationens automatfilmruta kan nu återanvändas **som uppskattad**, om dess redan exponerade confidence är minst 0,67. Det skiljer befintliga starkare detektorutfall (bl.a. 0,68/0,78) från osäkrare 0,65; det är ingen kalibrerad sannolikhet och ingen ny filmbasdetektor. Region, metod, confidence och status följer med intent/diagnostik. Ett importerat historiskt A-exportfoto saknar sådan metadata och ger ingen automatisk region.

En manuellt bekräftad analysruta har företräde. När regionen väl har sparats påverkar kreativ crop, rotation, zoom eller visningsstorlek inte analysen. En felaktig automatisk filmruta kan rättas med befintlig **Bekräfta aktuellt utsnitt som analysfilmruta**. Saknad/osäker region ger 0 EV och identisk färg med tydlig fallback, i stället för att acceptera en godtycklig helbild som filmruta.

PR #38:s invalidation gäller fortfarande accept/reuse/undo: källrevision, faktiska bas-RGB, uppmätt/prior-status, hela kalibreringen och analysområdet ingår. Nyckeln omfattar nu även färgreceptversion och colorMode. Oförändrade relevanta värden återanvänder analys/cache; ändrade värden analyseras om. Filmresponsen räknas aldrig om av basbyte. En A-referens som blir klar under pågående export köar områdesuppdatering tills exporten är klar.

## Diagnostik och privata underlag

`filmlabb.local-diagnostic` schema 1, methodVersion 4, innehåller nu `colorBalance` med version, status, gains, luminansknutar, begränsningar, stödstatistik och avståendeskäl. Steget `balanced` skiljs från `positive`, `exposed` och `rendered`. Begärd/applicerad EV, percentiler, P99-reduktion och region/fallback finns kvar. Exporten innehåller inga nya bildpixlar, privata sökvägar eller EXIF-dumpar.

Drive-åtkomst kontrollerades via ansluten integration. Alla fem ZIP-filer packades upp till exakt 399 filer. Där finns inte original-RAF. Även den ursprungliga RAF-mappen kunde nu faktiskt läsas; fem utvalda RAF hämtades och deras SHA256 verifierades mot paketets manifest. Privat bildmaterial och original stannar utanför repositoryt. Sparade A-exporter och resultat återanvänds; hela tidigare utvärderingen har inte körts om.

Parametrarna frystes före de nya resultaten för 09/10: [fryst recept](measurements/v2-stage1-parameter-freeze.json), SHA256 `86c7df6596a8d0a37854f88774df11cb2fe3853f1f02d629be6d65b35be3d019`. Inga ändringar efter valideringsbedömningen. 09/10 är kända reserverade bilder från tidigare rapport, inte ett nytt osynligt oberoende dataset.

## Reproduktion och testprotokoll

```
npm ci
npm run build
npm run test:full
# Valfritt, endast med tillgång till det privata arkivet och originalen:
node tools/v2-stage1-validate.mjs /private/testpaket /private/originals /private/results
# Endast sparade 80x80-källprov, utan original:
node tools/v2-stage1-validate.mjs /private/testpaket - /private/results 00,01,02,03,04,05,06,08,09,10,11
```

Verktyget kräver de fem riktade RAF-filerna namngivna med manifestets ID. Det återanvänder manuella regioner och sparad A-geometri, kontrollerar originalhashar och fryser/kontrollerar recept före validering. Det skapar jämförbara gamla/ton/färgbalanserade PNG, diagnostik och en faktisk fullstor JPEG/TIFF för 04. Resultat måste ligga utanför repositoryt. Kontroll av befintligt sparat A är visuell jämförelse, ingen ny körning av gamla appen.

I befintligt `/v2.html`: öppna RAF, mät och godkänn en oexponerad filmkant med den befintliga rektangeln. Vänta på riktig A. Kontrollera dess uppskattade filmruta, eller bekräfta rätt analysruta under Avancerat. Välj automatisk B-visning. Växla till technical/fixed för att separera teknisk inversion från positiv återgivning. Exportera JPEG/TIFF och diagnostik med befintliga knappar. Ändra filmbas och ångra: intent måste matcha aktuell bas, respons-ID ska vara oförändrat. Kreativ crop/rotation ska behålla intent-ID. För exakt samma råpixlar/bas i A/B används **Teknisk jämförelse**; fotografiskt A behåller sin verkliga automatiska importväg.

Den nya grenen är inte automatiskt publicerad på den äldre prototypgrenens preview. Ingen produktionsdeploy eller merge ingår. Fysisk iPad Safari och Windows Edge måste fortfarande provas.

## Resultat

Fem verkliga RAF avkodades i full upplösning, **6032×4032**. Varje manuell basmätning reproducerades exakt (RGB-differens 0) med samma tidigare valda provregion. Detta verifierar reproducerbarheten, inte att regionen är en fysiskt perfekt filmbas. Ursprungliga kvalitetsvarningar gäller fortfarande. Gamla V2-intent (+1 EV), robust ton utan färg och ny auto renderades på samma nya fulla källa/bas/utsnitt med exakt positiv boxfiltrering till 1000 px. Sparad riktig A bedömdes sida vid sida; A kördes inte om för alla bilder.

| Bild | Begärd EV | Applicerad EV | Median linjär display-Y, gammal → ton → ton+färg | Fotografisk bedömning |
|---|---:|---:|---:|---|
| 04 porträtt | +3,5300 | +3,4985 | 0,03302 → 0,16186 → 0,16187 | Ansikte och fasad blir ljusare; blåsticket minskar, men låg kontrast och återstående stick finns. |
| 05 kök/fönster | +3,3545 | +2,6428 | 0,03269 → 0,09555 → 0,09555 | Mellanregistret synligare. Färg avstår (`BAND_DISAGREEMENT`); fönstret är fortfarande kraftigt blått. |
| 06 soffporträtt | +4,3031 | +4,2370 | 0,01845 → 0,15089 → 0,15085 | Hud/soffa mindre blå och mer synliga; fortfarande dämpad kontrast och ingen färgmässig referensnoggrannhet. |
| 09 snö, validering | +1,9753 | +1,9642 | 0,08786 → 0,15808 → 0,15812 | **Underkänt färgresultat:** snö/himmel fortsatt starkt blå. Begränsad korrigering räcker inte. |
| 10 par utomhus, validering | +3,4764 | +3,4195 | 0,03680 → 0,16953 → 0,16954 | Mindre cyan i ansikten/bakgrund, men klänning och andra ljusa ytor har kvar blå/lila stick. |

Begärd EV för 10 redovisas med full precision i mätfilen. Median-Y avser samma exportcrop efter outputtransform och 8-bitars PNG-kvantisering, inte exponeringsmålet eller en mätning av hudens neutralitet. Nästan identisk Y för ton och färg är avsiktlig: färgsteget bevarar teknisk luminans. Ingen färgkarta eller känd originalscen ger stöd för absoluta Delta-E-/hudtonsanspråk.

I 05 minskar mjukt P99-skydd exponeringen **0,7118 EV** relativt P60-begäran. Display-P99 blir 0,42774 mot gamla 0,33269. P99–P90-separationen minskar från 0,19232 till 0,15451. Andelen blå outputkodvärden ≥250/255 ökar från **2,357 % till 7,491 %**. Detta är en redovisad högdager-/färgregression i denna samma-source jämförelse; tröskeln mäter höga sRGB-kodvärden och bevisar inte teknisk klippning. Den mjuka luminansbegränsningen är ingen garanti mot mättade färghögdagrar.

På sparade 80×80-källprov för alla elva unika bilder, med uttryckligen ändrat analysområde (0/2/5 % inset), är största EV-spännvidden **0,21017 EV** (05), och största ändringen av någon gainparameter **0,22596 EV**. Valet korrigering/identitet är oförändrat för samtliga tre insets. 08, ett färgdominerande motiv, ger `NO_SUPPORTED_NEUTRAL_ANCHOR` vid alla tre. Detta är ett begränsat glesgridtest, ingen fullupplöst områdesrobusthet eller garanti för alla färgdominanser. Kreativ geometri med fryst analys är däremot numeriskt invariant.

En extra riktig browserkörning av **04** använde det befintliga labbets filväljare, verklig isolerad A-import, manuell rektangel, accept och exportknappar. Automatfilmrutan kom från appen som estimated/0,68 och gav samma EV/färgrecept. JPEG, TIFF och JSON laddades ned; rotation bevarade intent. JPEG/TIFF var byteidentiska med valideringsverktygets motsvarande filer:

- **3719×3678**, JPEG 8 bitar, inbäddad sRGB ICC 456 byte; TIFF RGB16, sRGB ICC 588 byte.
- TIFF 82 071 644 byte, JPEG 2 401 247 byte. Fyra TIFF-pixelpunkter mot Float64-oraclet: största RGB16-kodfel 0. Syntetiska workerexporter jämför dessutom alla pixelvärden.
- JPEG är förlustkodad: medianavvikelse 1 kodvärde mot TIFF:s 8-bitarsvisning, PSNR 38,65 dB; ingen bitexakt JPEG-pixelidentitet påstås.
- Den fulla Float32-källan är 291 852 288 byte. Exportstripen är 178 512 byte (8 rader RGB16); ingen ny fullstor positiv Float32-buffert införs. Dessa bufferstorlekar är inte en mätning av maximal process-RSS på iPad. Tider från den parallellt belastade testvärden finns i mätfilen och är inga portabla prestandalöften.

Fulla aggregerade mätningar, färggains/stöd/avstående och regioner: [v2-stage1-validation.json](measurements/v2-stage1-validation.json). Privata före/efter-kontaktkartor, fulla exporter och diagnostik har skapats lokalt; de publiceras inte i det publika repositoryt.

### Automatiska kontroller

- Ny numerisk färgsvit: stöd/rumslig spridning, enfärgad dominans, motstridiga band, osäker filmruta, begränsade gains, luminansbevarande, färgseparation, kontinuitet, extrema signaler och fyra rotationer/area/RGB16. Scalar mot Float64-oracle: största absolutfel **4,44e−16**.
- Ny browsersvit: faktisk worker med aktiv färgbalans, automatisk estimated-ruta, colorMode/bas-invalidation, deterministisk undo, cache vid oförändrade värden, oförändrad fixed och faktisk RGB16-export mot oracle (största kodfel 0).
- Befintligt tonarkivverktyg har låsts till `colorMode:'identity'`, så tidigare E1-tonmätningar inte oavsiktligt börjar mäta färgkorrigering. Alla elva arkivformler och tekniska källprov reproduceras; separata områdes-/invalidationstester passerar.
- Full regression: **87/87 testgrupper passerade**, 1453,37 s, inklusive Editing 2.0, GPU/CPU, projekt/legacy, import, export, filmbas och browserflöden. Den nytillagda färg-browsersviten kördes separat och passerade (den registrerades efter att fullkörningen startat; nästa `test:full` inkluderar 88 grupper). Slutlig `npm ci --cache /tmp/filmlabb-v2-npm-cache --no-audit --no-fund` och `npm run build` passerade också (skrivbar npm-cache behövdes i den hanterade miljön).

Återstår för fotografiskt godkännande: korrekt färg i blandljus/snö/ljusa kläder, bättre ton-/kontrastbedömning på originalnivå, uppmätt färg-/filmrespons, bredare motiv och en dokumenterad exponerings-/samma-rulle-serie. Inga nattbilder har verifierats: sådan testserie saknas. Fysisk iPad Safari och Windows Edge återstår. **Etapp 1 är därför delvis färdig enligt uppdragets fotografiska definition of done.**

## Etapp 2

Behåll den rena densitetskärnan, separata bas-/respons-/renderkontrakt, workerägande, gemensam exportpixel och isolerad riktig A. Konsolidera bara efter bildvalidering: utvärdera uppmätt färgrespons mot den begränsade positiva balansen, en gemensam CPU/GPU-implementation och en uttrycklig projektmigration. Ta då bort inaktuella experiment och dubbla adaptrar med kompatibilitetsplan. De fem gamla motorerna och befintlig UI-/projektintegration avvecklas inte nu.
