# FILMLABB 1.1 Beta 6 – Teknisk förstudie

**Status:** beslutsunderlag, ingen implementation.  
**Granskad bas:** `main`, commit `2773bb996069ee43cc789fdcea4273876ef7643a`.  
**Källkontroll:** GitHubs branchmetadata och PR #16 bekräftar att denna commit är merge av stabiliseringsuppdateringen. Rapporten gäller denna låsta revision, även om main senare flyttas.

## 1. Slutsats och avgränsning

**Rekommendation:** behåll filmrutan som källförankrat analysområde. Inför en separat kompositionsrektangel i bildens roterade presentationsplan, en individuell rotationsmodell och ett gemensamt geometribibliotek. Applicera kompositionsgeometrin efter befintlig färgbehandling. Återanvänd färgmotorn och gör inga roterade kopior av hela originalbilden.

Det behövs ingen fullständig omskrivning. De största ändringarna ligger i geometri, exportens sampling/stripeprotokoll, overlay och projektserialisering. Att enbart lägga till en fri vinkel till dagens CSS-rotation är däremot otillräckligt: exporten stöder bara kvartvarv och använder heltalsindex.

Tre kontrakt ska styra implementationen:

1. **Komposition ändrar aldrig analysen.** Beskärning, upprätning, kvartvarv och rutnät får inte ändra filmbas, kanalrespons, gemensamt tonomfång eller analysens provurval.
2. **En geometribeskrivning för alla utdata.** GPU, CPU, JPEG-worker, JPEG-reservläge och TIFF använder samma utsnittsdefinition, inversa koordinattransformation och kantpolicy.
3. **Gamla projekt behåller återgivningen.** Nya geometrifält får inte ändra äldre motorval, RAW-import, analysupplösning, profiler eller befintliga kvartvarvsutsnitt.

### Evidensnivåer

- **Verifierat kodfaktum:** direkt läst i den låsta revisionen. Referenser anges nedan.
- **Verifierat testutfall:** endast sådant som faktiskt körts i denna förstudie redovisas som nytt testresultat i avsnitt 8.
- **Rekommendation:** föreslagen Beta 6-design, ännu inte implementerad eller prestandavaliderad.
- **Antagande/begränsning:** fysisk iPad, Apple Pencil och Edge har inte verifierats här. Exakt resamplingskvalitet och prestandabudget behöver mätas vid implementation.

## 2. Nuvarande implementation

Alla länkar pekar på den granskade committen. Funktionsnamnen avser aktiv kod där inget annat anges.

| Område | Fil och funktion | Verifierat beteende |
|---|---|---|
| Tillstånd, kö och projekt | [index.html](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/index.html), `defaultState`, `saveCurrentFrame`, `importRoll`, `saveSettings.onclick`, `settingsFile.onchange` | `cropRegion` är separat global rektangel. Den lagras som `frames[].crop`; `rotation` och `cropExport` ligger i bildens `settings`. |
| Geometri och källpixlar | [image-model.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/image-model.js), `rect`, `bounds`, `pixel`, `sample`, `preview`, `findBase`, `exportGeometry` | Filmruta normaliserad till oroterad källa. Exportens koordinatfunktion gäller kvartvarv. |
| Filmruteverktyg | [frame-controller.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/frame-controller.js), `finishImport`, `chooseFrame`, `cropChanged`, `frameView`, `imagePoint`, `drawCrop`, `finishCropDrag` | Import bygger käll- och previewobjekt, detekterar vid behov. SVG-sidor dras i samma CSS-transform som bilden. |
| Aktiv detektering | [color-analysis.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/color-analysis.js), `detect`; [beta39.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/beta39.js), tilldelning av `NSColorEngine.detectFrame` | Söker omslutande ljusa orange filmband; faller tillbaka på kantprojektion. Returnerar axelparallell rektangel, metod och confidence. |
| Grundanalys och TIFF | [calibration-state.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/calibration-state.js), `analyzeLevels`, `configuration38`, `exportTiff` | Prov inom filmrutan, bas från kant/manuell referens/fallback, nivåer och densitetsstatistik. Aktiv TIFF-export skriver 16-raders block och propagaterar fel. |
| Standardmotor | [beta4.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/beta4.js), `response4`, omslutna `analyzeLevels`, `configuration38`; [color-calibration.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/color-calibration.js), `estimate`, `analyze`, `fitNeutral` | Sparad kanalrespons separeras från gemensam tonanalys. Båda använder filmrutan när de beräknas. |
| Analysupplösning | [source-analysis.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/source-analysis.js), omsluten `analyzeLevels` | Standardmotor med `analysisSampling:'source'` analyserar originalets begränsade provurval, genom att tillfälligt låta `workingPreview` referera till `working`. Äldre projekt kan behålla previewanalys. |
| Aktiv CPU-kärna | [render-core.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/render-core.js), `compile`, `render`, `prepare`, `exportRows` | Gemensam färgbehandling; heltalsuppslag för export där möjligt. `render` samlar histogram över renderad bild, inte specifikt filmrutan. |
| Preview/schemaläggning | [slider-response.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/slider-response.js), `render`, `sendPreview38`, `displayPreviewResult` | Köar previewarbete, återanvänder källa och förkastar föråldrade resultat. |
| GPU | [gpu-renderer.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/gpu-renderer.js), `create`, `upload`, `draw`, `validate`; [gpu-preview.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/gpu-preview.js), `syncView`, `drawGpu`, `scheduleHistogram` | WebGL2/RGB32F, `texelFetch` och nearest-sampling. Rotation via kopierad CSS-transform; GPU-canvas tar inga pekhändelser. Histogram beräknas separat på CPU/worker efter fördröjning. |
| JPEG | [export-controller.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/export-controller.js), `geometry`, `jpegBytes`, `workerAttempt`, `mainAttempt`; [export-plan.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/export-plan.js), `size`, `at`, `pack`; [export-worker.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/export-worker.js) | Jobbsnapshot; begränsade stripes; fallback och storleksbudget. `pack` skickar en rå RGB-triplett per utpixel. Worker behöver källkoordinater även för spatial flat-field. |
| Lupp och flat-field | [next-workflow.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/next-workflow.js), `workingSource`, `drawDetailNext`, klickhanterare | Flat-field är spatialt knuten till originalet. Originaldetalj visas före rotation och använder `imagePoint` vid platsval. |
| Bygge/cache | [build-root.mjs](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/build-root.mjs), [cache-worker.js](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/cache-worker.js) | Kopierar explicit moduluppsättning, genererar assetlista och innehållshash. Nya moduler måste inkluderas i bygget. |

### 2.1 Koordinater och analysberoenden

`cropRegion={x,y,w,h}` använder 0–1 över den oroterade avkodade bildens bredd/höjd, med origo uppe till vänster. `CE.bounds` avrundar inre gränser med ceil/floor och garanterar minst en pixel. Koordinaterna är alltså inte CSS-pixlar och inte koordinater i den roterade bildens bounding box.

Filmrutans geometri påverkar:

- `CE.sample` och flera generationer av nivå-/densitetsanalys.
- `CE.findBase`: smal zon **utanför** rektangeln, med kontroll mot motivprover innanför. Analysområdet är därför inte en mask som bara tillåter källåtkomst innanför rutan.
- Beta 3.9:s kanalstatistik, Beta 4:s uppskattade kanalrespons och gemensamma tonomfång.
- Begränsning av neutrala provpunkter i både `beta39.js` och `beta4.js`.
- Exportgränser när `state.cropExport` är aktiv.

`cropChanged` uppdaterar bas/analys och begär rendering. Under själva filmrutedraget uppdateras främst overlay/tillstånd; `finishCropDrag` gör analysen när gesten slutar. Pointer cancel/lost capture behåller dagens senast valda koordinater.

**Viktig nyans:** i Standardmotorn behålls giltig sparad `response4`. En ändrad filmruta behöver därför inte ändra kanalkurvorna, men `CC4.analyze` räknar fortfarande om gemensamma toner. När giltig respons saknas kan även kanalkurvorna uppskattas från det nya området. Därför kan dagens kreativa användning av filmrutan ändra bildens återgivning.

### 2.2 Visning och export sammanfaller ännu inte generellt

`frameView` räknar fit från rotationsvinkelns bounding box; `imagePoint` inverterar fit, zoom, panorering och rotation. Formlerna använder sin/cos och är i sig användbara även för andra vinklar än kvartvarv.

Men `CE.exportGeometry` gör en diskret koordinatpermutation för 0/90/180/270. En godtycklig vinkel skulle ge fel dimensioner och fel sampling. `NSExportPlan.at`, `pack`, `render-core.exportRows` och reservexporter antar heltalspixlar.

`cropExport` ändrar i dag exporten, inte huvudpreviewns bilddata. Preview visar hela källbilden med en filmruteoverlay. Histogrammet kommer från previewrenderingen, inklusive ytor utanför filmrutan. Detta ska inte blandas ihop med teknisk tonanalys.

### 2.3 Aktiv kod kontra historiska kopior

`index.html` laddar `frame-controller.js`, `calibration-state.js` och `render-core.js`. De liknande rotfilerna `beta3.js`, `beta38.js` och `pixel-kernel.js` finns kvar som historisk/kompatibilitetskod men är inte produktionssidans motsvarande aktiva implementationer. Även `index.html` innehåller tidigare funktioner som ersätts senare under laddningen.

Implementation måste följa faktisk scriptordning och workerimporter. En ändring enbart i `pixel-kernel.js` skulle missa den aktiva färgkärnan. Undvik ytterligare lager av sena monkey patches när ett begränsat anrop kan ändras i den aktiva ägaren.

## 3. Arkitekturalternativ

| Alternativ | Upplägg | Fördelar | Nackdelar/risk | Bedömning |
|---|---|---|---|---|
| A. Separat presentationsgeometri efter färg | Befintlig filmruta och analys lämnas i källplanet. Komposition och rotation får eget tillstånd och gemensam invers transform. Preview använder begränsad färdig färgbild; export beräknar bara behövda källgrannar. | Minsta ingrepp i analysen, inga nya fullstora originalkopior, god återanvändning av GPU och färgcache. | Kräver nytt geometri-/samplingkontrakt och uppdaterat JPEG-protokoll. | **Rekommenderas.** |
| B. Förtransformerad virtuell källa | Rotera/resampla negativet först; kör befintlig analys och renderkedja på den transformerade bilden, med separat mask för analys. | Befintliga renderfunktioner kan få en vanlig rektangulär bild som indata. | Resampling före icke-linjär inversion kan ändra färger. Flat-field och provpunkter kräver återprojektion. Stora mellanbilder och risk att analysen läcker till komposition. | Tekniskt möjligt men sämre passform för Beta 6. |
| C. Enbart CSS/SVG plus separat canvas-export | Behåll preview med CSS-rotation/klippning; implementera fri export med canvas drawImage. | Snabb att demonstrera, liten UI-ändring. | Webbläsarens filter/avrundning blir separat geometri, TIFF riskerar 8-bitarsmellanled, kan inte ge ett gemensamt numeriskt kontrakt. | Räcker inte för slutlösningen. CSS får användas för layout, inte som geometrins sanningskälla. |

Alternativ A behöver inte innebära två fulla färgberäkningar per preview. Cachea en färdigrenderad, begränsad preview och transformera den vid geometriredigering. Originalets färgkedja och analys återanvänds utan omberäkning.

## 4. Föreslagen datamodell och ansvar

Fältnamnen nedan är rekommendationer, inte existerande API.

| Nivå | Fält | Innebörd |
|---|---|---|
| Bild | `analysisFrame` | Befintliga normaliserade `crop`-koordinater. Behåll gärna `cropRegion` som intern kompatibilitetsalias i första steget. |
| Bild | `composition` | `null` för automatiskt maximalt giltigt utsnitt, annars `{cx,cy,w,h}` i roterat plan enligt avsnitt 6. |
| Bild | `orientationTurns` | Heltal 0–3, ersätter kvartvarvsdelen av `state.rotation`. |
| Bild | `straightenDeg` | Ändlig fri vinkel, föreslaget UI-intervall −45° till +45°. Kvartvarv kompletterar till valfri orientering. |
| Rulle/kö | `cropExportToFrame` | Enda auktoritativa booleska exportbegränsningen för hela kön. Nya bilder använder samma värde. |
| Visningspreferens | `showThirds` | På/av, standard av. Sparas som UI-preferens och kan inkluderas i projektets separata `view`-del. |

Behåll färginställningar och kalibrering i befintligt bildtillstånd. Lägg till geometri utan att ändra `sourceCalibrationVersion:39`, kanalresponsversion eller kreativ profilversion. Geometrimigration är inte en ny färgkalibreringsversion.

### 4.1 Uppdateringsregler

| Händelse | Analys | Färgcache/GPU-källa | Geometri/overlay |
|---|---|---|---|
| Ändra filmruta, avsluta drag | Samma nuvarande regler som tidigare | Ny färgrendering när analys ändras | Uppdatera analysram och giltigt exportområde |
| Dra kompositionsram eller upprätning | Ingen | Återanvänd | Uppdatera |
| Kvartvarv | Ingen | Återanvänd | Uppdatera, rotera befintligt utsnitt med bilden |
| Slå rutnät av/på | Ingen | Återanvänd | Endast overlay |
| Ändra rullens exportbegränsning | Ingen | Återanvänd | Nytt giltigt område för samtliga bilder |
| Ny källa/RAW-domän/flat-field | Befintlig invalidering | Befintlig invalidering | Omberäkna med nya källdimensioner |

Nuvarande `configuration38` kopierar hela `state` till `opts`. Om geometrifält fortsätter följa med detta objekt ändras JSON-baserade cachenycklar även vid rent geometriska drag. Skapa därför en begränsad projektion av de befintliga färgfälten för färgcache/workerjobb, eller separera geometrin från `state`. Behåll exakt samma värden och formler för färgbehandlingen.

Separata revisionsnummer för källa, färg och geometri gör att sena workerresultat kan kontrolleras utan att starta om hela kedjan. Ett nytt geometriläge får inte acceptera en gammal geometrirendering bara för att färgkonfigurationen matchar.

## 5. Gränssnitt och arbetsflöde

Behåll histogram och vanliga bildreglage överst i högerspalten. Geometriverktyget placeras kompakt vid bildytan.

1. **Normalvisning:** bilden visar aktuellt slututsnitt. En liten knapp `Beskär / räta upp` öppnar verktyget. Befintliga ±90°-knappar kan ligga kvar intill.
2. **Kompositionsläge:** visa omgivande bild nedtonad och en aktiv ram med hörn/sidor samt dragyta för förflyttning. Ett rotationshandtag ligger utanför ramen. Under bilden visas endast vinkelvärde, återställning, rutnätsknapp och `Klar`/`Avbryt`.
3. **Filmrutejustering:** separat tydligt val `Justera filmruta`. Visa enbart analysramen som aktiv och förklara kort: `Används för färg och toner`. Behåll automatisk detektering, bekräftelse, lås och hela bilden här. Visa hela källbilden, så även filmbas utanför ramen kan mätas.
4. **Rullinställning:** flytta `Beskär exporten till filmrutan` till en gemensam kö-/exportinställning med tillägget `Alla bilder`. Det är en begränsning av exportområdet; individuell kompositionsbeskärning används fortfarande när inställningen är av.

**Rutnät:** två vertikala och två horisontella linjer vid 1/3 och 2/3 av kompositionsramen. Linjerna ska följa det slutliga utsnittet och vara horisontella/vertikala i utbilden, även när negativet vrids. Overlay får inga pixelvärden i analys, histogram eller export. Föreslaget standardläge: av, minns senaste val. Visa nätet i kompositionsläge och låt det döljas tillsammans med verktyget.

**Direkt rotation:** handtaget räknar vinkeldelta med `atan2` runt ett fast rotationscentrum; använd unwrapped delta så drag över ±180° inte hoppar. Numeriskt fält i grader, exempelvis steg 0,1° och inmatning med både svensk decimalcomma och punkt. En enkel horisontell hjälplinje kan användas under drag utan ytterligare panel.

**Inmatning:** återanvänd Pointer Events/pointer capture. Låt en gemensam verktygsrouter prioritera aktiv ram, rotationshandtag, pipett och panorering. Endast ett redigeringsverktyg är aktivt åt gången. Träffytor för touch/Pencil föreslås minst 44 CSS-pixlar, oberoende av zoom; de synliga handtagen kan vara små. Begränsa `touch-action` till relevant bildredigering så panelen fortsatt kan scrollas. Kräver test på fysisk iPad.

`Avbryt` ska återställa kompositionsgestens/redigeringssessionens snapshot; `Klar` committar den individuella geometrin. För filmrutan kan befintligt cancel-beteende behållas för kompatibilitet, men ska inte råka styra det nya verktyget. Tangentbord: fokusbara handtag/fält, pilar för förflyttning, Escape för avbryt och Enter för klar. Pipetter och lupp använder alltid invers mappning till originalet och avvisar tomma ytor.

**Histogram i Beta 6:** rekommendationen är att behålla dagens beräkningsområde och beteende och märka det tydligare som hela bildens previewhistogram. Kompositionsändringar ska inte starta histogramjobb. Ett utsnittsanpassat histogram är möjligt men skulle bredda uppdraget och kräva en separat visningsmask i båda histogramvägarna. Det behövs inte för att separera analys och beskärning.

## 6. Koordinat- och transformationsmodell

### 6.1 Plan och rotationsordning

- **S:** avkodad, oroterad källa med bredd W och höjd H. Pixelkanter går från 0 till W/H; pixelcentrum är `(i+0,5,j+0,5)`.
- **N:** befintliga normaliserade analyskoordinater; `s=(W·nx,H·ny)`.
- **R:** roterat presentationsplan i källpixelmått, centrerat kring källans mitt. Ingen omräkning via CSS eller reducerad previewstorlek.
- **O:** slututsnittets utpixelplan.
- **V:** bildytans CSS-koordinater med separat fit, zoom och panorering.

Total vinkel `θ=90°·orientationTurns+straightenDeg`. Med y nedåt definieras positiv vinkel som medurs, i linje med befintlig rotation.

`r = R(θ) · (s − (W/2,H/2))`, där `R=[[cosθ,−sinθ],[sinθ,cosθ]]`.

**Rotera först i geometrimodellen, välj därefter en axelparallell kompositionsrektangel i R.** Då kan horisonten rätas upp medan beskärningsramen förblir rak på skärmen. Utdata skapas genom invers mappning; det görs ingen verklig fullbildsrotation som mellansteg.

### 6.2 Lagring av komposition

Lagra centrum och storlek i R dividerade med en gemensam skala `L=max(W,H)`. Det undviker dimensionsbyte när bilden kvartsvänds och gör lagringen oberoende av previewupplösning. Centrumvärden kan vara negativa eftersom R:s origo ligger i mitten. Storlekar ska vara positiva och ändliga. Detta är avsiktligt ett annat schema än `CE.rect` och får inte klampas med den funktionen.

Ändrat kvartvarv transformerar befintligt centrum och byter w/h när så krävs; samma motivdel följer bilden. Fri upprätning behåller ramcentrum i presentationsplanet och anpassar storleken om en kant annars hamnar utanför giltiga bilddata. Återställ komposition sätter `composition:null`; återställ upprätning sätter endast `straightenDeg:0`.

### 6.3 Invers mappning och avrundning

För kompositionsrektangel med kanter `(left,top,width,height)` i R och utstorlek `(Wo,Ho)`:

`r(x,y) = (left+(x+0,5)·width/Wo, top+(y+0,5)·height/Ho)`

`s(x,y) = R(−θ)·r(x,y) + (W/2,H/2)`

Samplingsindex för interpolation är `u=sx−0,5`, `v=sy−0,5`. Beräkna grannar med floor och bilineära vikter. Tillåt inte att y-flip i WebGL, devicePixelRatio eller canvasens origin skapar en separat definition av x/y.

För nya fria vinklar föreslås en deterministisk storleksregel: `Wo=max(1,floor(width))`, `Ho=max(1,floor(height))`, följd av befintlig JPEG-budget för eventuell minskning. Den verkliga rektangeln och pixelcentermappningen behålls även när dimensionerna avrundas. För gamla projekt och exakta kvartvarv utan ny komposition ska en explicit legacyväg återanvända `CE.bounds/exportGeometry`, så deras pixlar och dimensioner förblir oförändrade.

`V` byggs från samma R-plan och en visningsmatris. Pekpunkter inverteras genom hela matrisen till S. SVG för analysramen får sina fyra källhörn projicerade till V; kompositionsramen ligger i R och projiceras till V. Ramarnas handtag ska därför inte ärva samma rotation blint som i dagens `drawCrop`.

### 6.4 Bildkanter och exportpolicy

När rullens exportbegränsning är av är giltigt område hela källrektangeln. När den är på är området filmrutan från `CE.bounds`. Transformera områdets fyra hörn till R; resultatet är en konvex polygon.

- Tillåt bara slututsnitt vars fyra hörn ligger i den giltiga polygonen. För konvexa polygoner räcker hörnkontrollen för rektangeln.
- Utan manuell komposition (`null`) välj största inskrivna rektangel med det giltiga områdets ursprungliga sidförhållande efter kvartvarv. Sök deterministiskt kring områdets centrum, exempelvis med binär sökning av skala och hörnkontroll. Detta är **inte** ett anspråk på största möjliga area över alla sidförhållanden.
- Vid fri vinkel minskas utsnittet så att tomma trianglar försvinner. I redigeringsläget kan ytor utan bild visas som arbetsytans bakgrund, men de ingår inte i export eller analys.
- Bilineära grannar utanför den tillåtna rektangelns pixelcentrum klampas till närmaste giltiga kantpixel. Klampning ska inte få dra in hållare eller filmbas utanför exportbegränsningen. Gör både den geometriska hörnkontrollen och samplingskontrollen; de har olika uppgifter.
- Ändrad filmruta eller gemensam exportbegränsning kan göra sparad komposition ogiltig. Behåll användarens önskade rektangel separat och beräkna en deterministiskt begränsad effektiv rektangel; visa `Utsnittet begränsas av filmrutan`. Export och preview använder samma effektiva rektangel.

**Begränsning:** dagens axelparallella analysrektangel beskriver inte exakt en snett avfotograferad exponerad filmruta. Fri presentationrotation ändrar inte detta. Beta 6 bör behålla nuvarande representation och låta användaren välja ett konservativt inre analysområde vid sneda negativ. Exakt polygonanalys eller perspektivkorrigering skulle ändra provurval och filmbassökning och bör inte smygas in i denna uppdatering.

### 6.5 Sampling utan förändrad färgmotor

Rekommenderat kontrakt för nya fria vinklar:

1. Läs varje behövd grannpixel på dess **ursprungliga heltalskoordinat**, med befintlig avkodning, normalisering och eventuell flat-field.
2. Kör den befintliga färgkedjan på varje granne utan ändrade formler.
3. Avkoda de färdiga sRGB-värdena till linjärt visningsljus, bilinjärinterpolera och sRGB-koda resultatet igen.
4. Kvantisera till 8 bit för JPEG/preview respektive 16 bit för TIFF.

Motivering: analys och inversion sker på samma källvärden som tidigare; interpolation är uttryckligen ett presentationssteg. Att interpolera rånegativet först och sedan invertera ger generellt andra värden. Spatial flat-field måste utvärderas vid varje grannes originalkoordinat, inte vid utpixelns koordinat.

Kvartvarv och heltalsbeskärning behåller befintlig direktsampling och uppslagstabeller. Resamplingen ändrar av naturliga skäl färdig bild vid fria vinklar, men får inte ändra kalibreringsparametrarna.

**GPU-preview:** cachea befintlig färgrendering i en begränsad offscreen-textur och lägg till ett litet geometripass som utför invers mappning och explicit interpolation. En RGBA8-textur är en rimlig första budget, eftersom preview redan är 8-bitars; dess precisionstapp ska ingå i toleranstester. Använd texelFetch/explicit vikter för definierad interpolation och undvik beroende av flyttalstexturers hårdvarufiltrering. Rena geometridrag ritar bara geometripasset. Färgändringar uppdaterar färgpasset. Extra textur/FBO och context restore måste få korrekt livscykel.

**CPU-preview:** cachea den begränsade färdiga previewbilden och applicera samma geometri/samplingsregel i preview-worker/reservläge. Även jämförelse-/negativläge måste ha definierad sampling; använd en gemensam bildgeometri och lägg splitgränsen i utbildens koordinater.

**Högupplöst export:** använd samma inversa mappning men färgberäkna originalgrannarna per utpixel och stripe. Behåll `prepare` och dess uppslag där möjligt; cachea återkommande grannar lokalt om mätningar motiverar det. Skapa ingen fullstor färdig RGB-flyttalsbild.

**JPEG-worker:** dagens en-triplett-per-utpixel-protokoll räcker inte för interpolation efter färgbehandling. Rekommenderad minsta utökning är att packa upp till fyra råa RGB-grannar i originalets datatyp och skicka vikter/källkoordinater eller en serialiserbar transformplan som gör dem härledbara. Worker kör befintlig färgkedja på varje granne och interpolerar slutvärdena. Flat-field får varje grannes absoluta källkoordinat. Exakta kvartvarv behåller nuvarande kompakta protokoll. Begränsa stripeantalet efter **bytebudget**, så fyra grannar inte fyrdubblar toppminnet. Main-fallback och TIFF anropar motsvarande gemensamma sampler direkt.

Preview och export kan få exakt samma utsnitt och transformation, men reducerad preview kan inte lovas pixelidentisk med fullupplöst export. Befintlig nearest-downscaling har dokumenterad aliasing (#8). Denna förstudie föreslår inte en allmän filterändring för gamla vägar; kvalitetstest för fria vinklar behövs separat och får inte samtidigt ändra analysens provbild.

## 7. Rullprojekt och migrering

### 7.1 Verifierade format

Aktiv export skriver `negative-studio-roll-v08`. Aktiv import accepterar detta och `negative-studio-roll-beta3`. `negative-studio-v03` finns i en tidigare inlinehanterare men ersätts av den aktiva rullprojekthanteraren; det ska inte beskrivas som ett idag stödd importformat utan ytterligare beslut.

Projekt lagrar bland annat `frames[].settings`, `crop`, bas/nivåer och sourceMetadata; toppnivån innehåller profilversion, sourceCalibrationVersion, sharedResponse4, flatField och exportnamn. Bilder matchas på filnamn och originalfiler ingår inte. Lokal persistens ligger under `negative-studio-v03`, och separata UI-preferenser finns i egna nycklar. `sharedBase` och `sharedLight` exporteras inte som egna toppnivåobjekt av dagens aktiva sparare; anta inte att dessa automatiskt roundtrippar.

### 7.2 Rekommenderad formatstrategi

Inför `negative-studio-roll-beta6` med explicit `geometryVersion:1`, `roll.cropExportToFrame` och individuell geometri. Behåll import av båda gamla rullformaten. Ett nytt formatnamn gör att en äldre app avvisar filen i stället för att tyst ignorera ny geometri och exportera fel. Framåtkompatibilitet med äldre appversioner utlovas inte.

Migrera gamla `crop` till analysram utan numerisk omtolkning. Migrera `rotation` 0/90/180/270 till turns och fri vinkel 0. Saknad komposition blir `null`; bevara legacy-exportplanen så gamla heltalsgränser fortsätter gälla. Bevara alla kompatibilitetsregler från PR #16 för RAW-läge, responsvalidering, sampling och profiler.

### 7.3 Blandade gamla exportval

Det går inte att representera både true och false från olika bilder med en enda gemensam bool utan en uttrycklig migration.

Föreslagen regel över projektets samtliga sparade bilder:

- Alla gamla `cropExport=true`: sätt gemensamt true, ingen extra komposition.
- Alla false/saknas: sätt gemensamt false, ingen extra komposition.
- Blandat: sätt gemensamt false. För varje tidigare true-bild skapa en individuell kompositionsrektangel exakt motsvarande dess gamla `CE.bounds`-utsnitt, roterad med gamla kvartvarvet. Märk den internt som migrerad så exakt legacy-sampling används tills geometrin redigeras. Tidigare false-bilder behåller hela bilden.

Visa en kort importnotis: `Äldre individuella exportutsnitt har bevarats som beskärningar.` Dessa migrerade beskärningar följer därefter de nya reglerna och flyttas inte när analysramen ändras. Spara inte gamla per-bildsbooler som fortsatt auktoritet.

Nya bilder använder rullens aktuella bool direkt, inte en gammal kopia i `defaultState`. Dagens `importRoll` ersätter kön; detta kräver inte att Beta 6 bygger en ny funktion för att lägga till filer. Valet kan bevaras när användaren väljer en ny kö och ska återställas från projektets toppnivå när ett projekt öppnas.

Validera hela projektet innan aktivt tillstånd ändras. Avvisa icke-ändliga vinklar, ogiltiga rektanglar och okänd geometriversion; begränsa numeriska storlekar för att undvika orimliga allocationer. En misslyckad import får inte lämna halvt uppdaterad rullinställning. Befintlig filnamnsmatchning är tvetydig vid dubletter: avvisa eller rapportera tvetydiga matchningar i geometriimporten i stället för att tyst lägga utsnitt på första träffen.

Återställning av bildreglage ska bevara båda ramarna, rotationen och rullens gemensamma val. Separata geometriknappar återställer sin respektive funktion. Inkludera frame/rotation/composition i exportens frysta jobbsnapshot; sena UI-/köändringar får inte ändra en pågående export.

## 8. Risker och verifiering

### 8.1 Utfört i denna förstudie

Repositoryt har endast lästs. Valda befintliga tester körs i en separat valideringskopia med oförändrad källkod; testarkivet packas upp där. Inga commits, PR:er eller ändringar i repositoryts spårade filer skapas.

Nya testutfall redovisas i rapportens verifieringsbilaga nedan. Ingen ny Beta 6-funktion är byggd, så dessa tester visar endast relevanta egenskaper hos baslinjen. Ingen full npm-, Chromium-, Safari- eller Edge-svit påstås ha körts här. PR #16:s dokumenterade resultat är historisk evidens, inte nya mätningar från denna förstudie.

### 8.2 Riskanalys

| Risk | Konsekvens | Motåtgärd/acceptans |
|---|---|---|
| Komposition anropar `cropChanged`/analys | Toner eller färg ändras under beskärning | Separata mutatorer. Analysräknare och kalibreringssnapshot exakt oförändrade vid geometri. |
| Cache kopplad till hela state | Onödiga kompilationer, GPU-valideringar och workerjobb | Separera färgnyckel, geometri och källa; testa uppladdnings-/analysräknare. |
| Pixelcentrum, y-flip, kvartvarv skiljer mellan backends | Förskjutning/spegelvändning eller olika utsnitt | Gemensam matris och oberoende facitbilder med hörnmarkörer. |
| JPEG packar interpolerade råvärden medan TIFF interpolerar färdig bild | Formatberoende färger | En fast ordning: läs/korrigera → färg → presentationsinterpolation. |
| Flat-field använder stripe-/utkoordinat | Fel ljus/färg på roterad export | Varje originalgrannes absoluta koordinat i samtliga vägar. |
| Kvartvarv tappar direktvägen | Äldre exportpixlar ändras, sämre fart | Exakt legacygren och bitexakta 16-bitarsregressioner. |
| Fri rotation evaluerar fyra färgpixlar per utpixel | Långsammare export | Bounded stripes, befintliga prepare-tabeller, lokal granncache först efter mätning. Geometripass för preview. |
| Extra GPU-textur/context loss | Minnestryck eller svart bild | En begränsad resursuppsättning, återanvänd och frigör; CPU-fallback/context restore-test. |
| Fallbackens geometri skiljer sig | Fel endast på Safari eller vid workerfel | Tvinga workerfel och GPU-fel i automatiska tester; jämför samma plan/resultat. |
| Blandade projektval tappar utsnitt | Gamla projekt ändrar export | Migration enligt avsnitt 7, även för ej för närvarande matchade projektbilder. |
| Gestkonflikt mellan ram/pipett/panorering | Feljusteringar med touch/Pencil | En aktiv verktygsrouter, pointerId, capture och release/cancel-tester. |
| Ny modul missas av offlinebygget | Blandade versioner eller offlinefel | Lägg till i explicit buildlista; kör cache-/buildregressionerna från PR #16. |

### 8.3 Syntetiska tester utan nya referensnegativ

Följande är föreslagna nya regressioner, inte redan existerande testtäckning.

| Test | Syntetiskt underlag | Konkret krav |
|---|---|---|
| Analysoberoende | Orange kant, olika RGB-/gråfält och starkt off-center motiv | Efter många beskärnings-/rotations-/rutnätsändringar: exakt samma bas, response4, tonparametrar och antal analyser. Filmruteändring ska däremot följa befintlig analyslogik. |
| Geometriskt facit | Asymmetrisk 7×5-bild med unika pixelvärden, hörnfärger, pil och rutnät | Exakt dimension och pixelpermutation vid alla kvartvarv, med/utan crop. För fria vinklar jämför mot separat skalär referens, inte produktionsfunktionens eget `at`. |
| Matrisrundresa | Deterministiska punkter, flera sidförhållanden och vinklar nära 0/±45/90/180 | S→R→V→S inom 1e−6 källpixel i dubbelprecision för teststorlekarna. Previewupplösning/DPR ska inte påverka sparad geometri. |
| Sampling | Konstant färg, färgövergång, impuls, diagonallinje och schackmönster | Konstantfält bevaras; bilineära värden verifieras analytiskt. Inga NaN, hål eller felaktiga sömmar mellan stripes. |
| Kanter | Smal filmruta intill ljus hållare och 1-pixelsområden | Ingen hållarfärg läcker in genom grannsamplingen när exportbegränsningen är på. Tomma trianglar exporteras inte. |
| Flat-field | Känd spatial RGB-gain och syntetiskt negativ | Worker/main/TIFF matchar gemensamt flyttalsfacit, även vid rotation och JPEG-nedskalning. |
| Format/backend | Samma provbild, färginställning och plan | Samma utbredning, orientering och motivmarkörposition i GPU/CPU/JPEG/TIFF. Jämför 8-bitarsbuffer före JPEG-kodning; JPEG-filens pixlar testas med lossy-tolerans. |
| Projekt | Båda gamla rullformaten; alla/på/av/blandade cropExport; nya formatet | Exakt bibehållna gamla utsnitt och färginställningar, ny geometri roundtrippar, nya bilder ärver gemensamt val. Ogiltig JSON/geometri lämnar tillstånd intakt. |
| Interaktion | Syntetiska peksekvenser i Chromium | Drag vid zoom/pan/rotation, capture loss, avbryt, köbyte, exporterande låsning, rutnätets 1/3-positioner och klick till pipett/lupp. |
| Prestanda | 24 MP respektive 40 MP syntetisk källa; 5 bilder i kö | Geometridrag ger noll källuppladdningar och noll analyser efter uppvärmning. Inga fullstora nya mellanbilder. Stripebytebudget håller även med fyra grannar. |

Föreslagna toleranser: gamla kvartvarvs-TIFF ska vara bitexakta; CPU/worker i samma nya samplingväg högst 1 steg i 16-bitars kvantisering mot direktfacit; GPU mot CPU-preview initialt högst 2 steg av 255 på släta syntetiska fält. Kantbilder med reducerad preview måste bedömas separat från fullupplöst export, eftersom upplösning och gamla #8 påverkar dem. Dessa trösklar är mål som ska bekräftas med första implementationen, inte uppmätta garantier.

Prestandakrav bör jämföras med baslinjen på samma enhet: ingen mer än 10 % medianregression i befintliga färgreglagedrag, och mål p95 under 33 ms för geometridrag på mål-iPad. Siffrorna är föreslagna acceptansgränser. SwiftShader verifierar logik, inte fysisk GPU-hastighet. Export av fri rotation förväntas kosta mer; rapportera tid/minne per megapixel och jämför mot fyra grannar som beräkningsmodell i stället för att lova oförändrad exporttid.

### 8.4 Webbläsarfördelning

| Miljö | Automatisk kontroll | Manuell kontroll som kvarstår |
|---|---|---|
| Chromium + Playwright | Geometri, CPU/GPU-paritet, worker/reservläge, projekt, DOM-ordning, touch-emulering, context loss, export/cancel och offlineversioner | Verklig interaktionskänsla och hårdvaruprestanda mäts separat. |
| Edge | Gemensam kärna kan täckas av Chromium. Installerad Edge-kanal kan senare köras som eget Playwrightmål. | Verklig GPU/driver, nedladdningsprompt, flerfils-/ZIP-beteende, skyddspolicy och högupplöst export. Chromium räknas inte automatiskt som Edge-verifiering. |
| iPad Safari/PWA | Playwright WebKit kan vara kompletterande logikkontroll om tillgängligt. | Fysisk iPad: Pencil/finger/mus, träffytor, rullning, avbruten gest, orienteringsbyte, sidopaneler, minne, långa TIFF-exporter, worker/canvas-fallback och offlineuppdatering. WebKit-emulering ersätter inte detta. |

## 9. Stegvis implementationsplan för senare Codex-uppdrag

Varje steg är en avgränsad ändring med egen verifiering. Inget av dem har genomförts i denna förstudie.

1. **Lås baslinjen.** Utgå från granskad merge eller en uttryckligen godkänd senare main. Kör befintlig npm-/build-/browser-svit med tillgängliga beroenden och spara färg-/geometrisnapshots. Dokumentera #8 som känd begränsning. Ändra inga färgformler.
2. **Separera tillstånd och projekt.** Lägg till individuell komposition/rotation och gemensam exportbool. Behåll befintlig analysram. Implementera atomisk validering och migration, inklusive blandade gamla booler. Kontrollera att gamla projekt får samma pixlar/dimensioner innan något nytt UI aktiveras.
3. **Inför rent geometribibliotek.** Exempelvis `image-geometry.js`, utan DOM/WebGL. Funktioner för planbygge, invers mappning, giltig polygon, effektiv rektangel, kvartvarv och serialization. Gemensamt pixelcentrum-/avrundningskontrakt; använd egen skalär testreferens.
4. **Inför gemensam presentationssampler.** Utöka aktiva `render-core.js`/exportplan med fri koordinatsampling efter befintlig färgkedja. Behåll direktvägen för legacy/kvartvarv. Verifiera flat-field, kantsampling och stripegränser på små syntetiska bilder.
5. **Koppla samtliga exportvägar.** TIFF, JPEG-worker, main-fallback och aktiva säkra reservfunktioner i `frame-controller.js`. Nytt bounded grannprotokoll och fryst jobbsnapshot. Behåll progress, avbryt, filnamn, ICC, batchrapportering, storleksbudget och fem-bildersgräns från PR #16.
6. **Koppla preview med återanvändning.** GPU får begränsad färgtextur/geometripass; CPU-worker får motsvarande cache. Färgnyckeln exkluderar geometri. Uppdatera `imagePoint`, lupp, pipetter, splitvisning och late-result checks. Mät resurs- och analysräknare under drag.
7. **Bygg kompakt direktmanipulation.** Separata aktiva lägen för filmruta respektive komposition. Handtag, numerisk vinkel, kvartvarv, återställning, valfritt tredjedelsnät och Klar/Avbryt. Bevara histogram/reglage högst upp. Lägg all pekprioritering i en gemensam ägare och uppdatera svensk/engelsk i18n.
8. **Säkra bygge/offline och enhetstest.** Registrera ny modul i buildmanifestet; packa nya tester med befintligt verktyg där arkivet används. Kör relevanta gamla och nya regressioner, därefter fysisk iPad Safari och Edge. Dokumentera verkliga toleranser och prestanda före versionshöjning/release.

### Beslut att granska före implementation

- Separat kompositionsgeometri efter färg, med oförändrad analysram och färgmotor.
- Rullens bool begränsar exportområdet till filmrutan; individuell komposition gäller oavsett boolens värde.
- Upprätning fyller alltid utsnittet med giltig bilddata; inga exportalternativ för tomma hörn.
- Filmruteanalys förblir axelparallell; exakt sned polygonanalys ingår inte i Beta 6.
- Nytt projektformat, bakåtimport och explicit bevarande av gamla blandade exportval.
- Histogrammet behåller sitt nuvarande område; rutnätet är en ren visningspreferens.

Efter godkännande kan denna rapport användas som Codex-specifikation. Uppdraget bör uttryckligen kräva verifiering av varje aktiv exportväg och förbjuda ändring av färgmatematik eller allmän downscaling som del av geometrifunktionen.

## 10. Källor och vidare kodunderlag

Primärkällan är den låsta revisionens filer i tabellen i avsnitt 2. Relevanta kompletteringar:

- [Mergecommit på main](https://github.com/AxelTidehorn/negative-studio/commit/2773bb996069ee43cc789fdcea4273876ef7643a)
- [PR #16 – mergad stabiliseringsuppdatering](https://github.com/AxelTidehorn/negative-studio/pull/16)
- [STABILITY_UPDATE.md](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/docs/STABILITY_UPDATE.md): aktiva moduler, bevarade begränsningar, körkommandon och tidigare testresultat.
- [verify-preview.mjs](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/verify-preview.mjs): packar upp `slider-regression-suite.json` till ignorerade `tests/` och väljer testgrupper.
- [tools/pack-tests.mjs](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/tools/pack-tests.mjs): sparar teständringar i det befintliga arkivet.
- [test/stability-export.mjs](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/test/stability-export.mjs): TIFF-namn, provvärden, geometri, fel och avbrytning.
- [test/downscale-investigation.mjs](https://github.com/AxelTidehorn/negative-studio/blob/2773bb996069ee43cc789fdcea4273876ef7643a/test/downscale-investigation.mjs): avsiktlig reproduktion av känd aliasing, inte kvalitetsacceptans.

## Bilaga A. Utförd riktad baslinjeverifiering

Samtliga åtta körningar avslutades med exitkod 0: sju funktionella testgrupper och en separat reproduktion av ett känt problem. Körningarna gjordes med oförändrade filer i en separat kopia av granskad revision.

| Befintlig testfil | Observerat resultat |
|---|---|
| `tests/check-project39.mjs` | Äldre motorer roundtrippar; gammal oversionerad RAW-kalibrering pensioneras enligt befintlig regel. |
| `tests/check-project4.mjs` | Individuell/gemensam respons, ton och RAW-läge bevaras; ogiltiga responser förkastas; källdomänregler fungerar. |
| `tests/check-manual-frame.mjs` | 64 kantdrag med fyra rotationer, två zoomnivåer och två panelbredder; offset, pekar-id, cancel/lost capture, 1-pixelsexport, overlaytransform, köretur, projekt, lås och reset passerar. |
| `tests/check-source-analysis.mjs` | Analys invariabel mot previewupplösning och yttre kant med samma fysiska ROI; motsvarande källpixlar vid exportbeskärning bevaras; tillfällig previewreferens återställs även vid fel. |
| `tests/check-export-plan.mjs` | 48 kombinationer av källkodning/dataskala, flat-field och kvartvarv matchar mellan packad workerdata och direktväg; transportbudget kontrolleras. |
| `tests/check-export-snapshot38.mjs` | TIFF behåller fångade inställningar när kalibrering ändras mellan block. |
| `test/stability-export.mjs` | TIFF-namn/provvärden, felpropagering/upplåsning, delvis batchfel, avbrytning, återställning av urval, fem-bildersgräns och ZIP:s UTF-8-flaggor passerar. |
| `test/downscale-investigation.mjs` | Känd #8 reproduceras: alternerande kolumner med medel 0,5 samplas till 1,0. Detta är inte ett godkänt filtreringsresultat. |

`git status --porcelain` och `git diff --exit-code` gav inga repositoryändringar efter granskningen. Ingen Beta 6-kod, commit eller pull request har skapats.