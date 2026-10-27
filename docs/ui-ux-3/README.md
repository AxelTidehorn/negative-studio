# UI/UX 3.0

Bas: main 78b77b38881a003d0c2f6627cd458c161abb6bd2 efter integrerad PR #33.
Presentation byggs i `workflow-ui.js` och `workflow-ui.css`, efter befintlig
compact-ui. Befintliga noder flyttas; deras ID:n, controllerägare, inställningar
och serialisering behålls. Ingen konverterings-, RAW- eller exportmatematik ändras.

## Kontrollinventering och kravspårning

| Åtgärd | ID | Tidigare → ny plats | Koppling / kontroll |
|---|---|---|---|
| Behåll | frameSettingsGroup, frameOptions, cropAuto, cropConfirm, cropLock, cropReset, cropVisible, cropExport | Överst i panelen | frame-controller, geometry-ui; teknisk filmruta och gemensamt exportarv |
| Behåll | engineMode, histogram, simpleControls, toneDetails, reset | Högt i bildjusteringar | befintliga fem motorer, histogram, slider/reset; kort ny metodbeskrivning |
| Flytta | rotateLeft, rotateRight, straighten, compositionEdit, thirdsGrid | Hopfälld panel → direkt vid bilden | befintlig geometri, pointerverktyg och exportplan |
| Flytta | geometryTools, fineRotation, rotationDegrees, rotationReset, compositionEnabled, compositionReset, geometryDone, geometryHint | Högerpanel → kontext vid bilden | exakta vinklar och separata återställningar; inga nya geometrihandlers |
| Förenkla | base2Panel, base2Enable, base2Region, baseSummary3 | Avancerat → Filmbas och kalibrering | film-base-controller; samma automatiska/manuella verktyg |
| Förenkla | base2Status, base2Stats, base2Compare, base2Preview, base2Accept, base2Cancel, base2Undo, base2Auto, base2Lock | Permanent knappsamling → Prov och godkännande | öppnas vid mätning/förslag, samma godkännande/låsning |
| Flytta | base2Session, shareBase, useRollBase, clearRollBase, rollBaseStatus | Blandad filmbasvy → Filmrullens referens | befintlig kompatibilitet, explicit delning och override |
| Dölj i avancerat | auto, sample, recalc, noBase, baseInfo | Dubbel normalpresentation → Äldre filmbasverktyg | legacy-controller bevarad, döljs när v2 används |
| Behåll | creativeProfiles, filmProfile, profileStrength, printStyle | Egen sektion | kreativ profil skiljs från uppmätt kalibrering |
| Flytta | neutralPair4, resetResponse4, saveResponse4, useResponse4, base2ResponseLock | Blandat med experiment → Teknisk filmrespons | befintlig responsmodell |
| Flytta | rawMode4 | Kalibrering → RAW-avkodning | visas vid RAW; inställningsvärdet bevaras |
| Behåll/kontext | tiffEncoding | Ljuskälla/analys, visas för oprofilerad TIFF | samma källkodningshandler |
| Behåll | flatFieldFile, useFlatField, clearFlatField, referenceFile, clearReference | separata mätningar i avancerat | ojämn belysning respektive ljuskällans färg |
| Behåll | copyMode, applyRoll, autoLevels, analyzeLevels | avancerat | kökopiering och motivanalys |
| Dölj i diagnostik | colorMode4, toneMode4, previewBackend, sourceStatus, previewBackendStatus, calibrationStatus4, activeSettingsSummary | utspritt → Experiment och diagnostik | sparade experimentvärden ändras inte |
| Behåll | export, exportTiff, batchJpeg, batchTiff, saveSettings, settingsFile | befintliga exportplatser | JPEG/TIFF/ZIP, gamla och nya projekt |
| Behåll | footer, teman, paneldöljning, arbetskö, fokusläge | oförändrat | befintlig layoutmotor och appearance |

Egna SVG-masker med gemensam 24×24-geometri och 1,8 linjetjocklek används för
verktyg och primära import/export-/provåtgärder. Ingen extern ikonfont eller nätverksresurs.
Nya navigationsnamn, metodbeskrivningar, provdiagnoser och kalibreringsåterkoppling har katalogposter för sv/en/fr/es/de. Controlleruppdaterade texter återöversätts i presentationslagret efter bild-/motorbyte.

## Kort arbetsflöde

Importera negativet. Kontrollera **Filmruta** och bekräfta den exponerade ytan.
Välj **Konverteringsmetod** direkt ovanför histogrammet och justera exponering,
kontrast och färg. Vid bilden finns 90° rotation, linjeupprätning, kreativ
kompositionsbeskärning och rutnät. Aktivt geometriverktyg visar exakta vinklar,
separata återställningar och **Klar**.

Om filmbasen behöver korrigeras, välj automatisk analys eller manuellt prov i
**Filmbas och kalibrering**. Granska förslaget före accept. Delning och session
finns i **Filmrullens referens**. Kreativa profiler påverkar återgivningen;
de är ingen uppmätt filmprofil. Tekniska referenser och äldre verktyg finns under
**Avancerad bildbehandling**. Utvecklingsjämförelser finns i **Experiment och diagnostik**.
Exportera med JPEG/TIFF eller spara projekt från befintlig exportsektion.

## Verifiering och begränsningar

Före/efter-skärmbilder sparas i `screenshots` för desktop, iPad landskap,
iPad porträtt och mobil i Chromium. `ui3-viewport-browser.mjs` jämför huvudbildens yta med presentationslagret avstängt och aktiverat. Uppmätt före/efter: desktop 836×777,2, iPad landskap 624×578,4, iPad porträtt 368×800,4 och mobil 364×352,9 CSS-pixlar, oförändrat i varje fall. Verktygsfältet ligger ovanpå bildvisningens chrome i normalläge och döljs vid teknisk filmruta/filmbas. Aktiva kompositions-/upprätningsverktyg har en separat kontextrad.

`ui3-browser.mjs` verifierar primärt metodval,
verktygsaktivering, exakta vinkelkontroller, kompositionshandtag, manuellt
filmbasverktyg, fem språk och semantisk footer. Befintliga numeriska och
projektprov körs oförändrade. Befintliga filmbastester navigerar nu till
rullens expanderbara referens före sessionsinmatning.

Fysisk iPad Safari, Apple Pencil och Windows Edge är EJ VERIFIERADE.
Chromiumemulering innebär inte användargodkänd fysisk ergonomi.
Kända risker: äldre tester som antar tidigare placering behöver följa den nya
navigationen; diagnostik och RAW-inställningar delar samma befintliga selector utan dubbletter.
När diagnostik öppnas flyttas RAW-valet dit; Rec.2020 visas där, eller som redan
sparat aktivt val. Referenslogik och projektinställningar ändras inte.

## Testresultat

`npm test`: 50/50 Node-grupper passerade. Den fulla browserkörningen omfattar
20 grupper, inklusive de två nya UI3-grupperna. Den fulla körningen gav 19/20; återstående UI-stabilitetsprov kördes om godkänt efter den nedan beskrivna positionsassertionen. Samtliga 20 grupper är därmed verifierade, med den riktade omkörningen uttryckligt redovisad. Navigationsassertioner har
uppdaterats där de förutsatte att bildverktygen låg mellan profiler och avancerat;
export-, pixel-, projekt- och interaktionskontrollerna är kvar. Ett äldre mobilprov
krävde `position:static` för bildpanelen. Den nya verktygsraden använder ett relativt
ankare som fortfarande ligger i normalt sidflöde; assertionen ändrades till
`relative`, och provet kördes om med samtliga scroll-/hit-target-/footerkontroller
bevarade och godkända. Bildytan kontrolleras dessutom separat numeriskt i fyra
storlekar. Språk-, preferens- och nya verktygsprov har körts om efter riktade fixar.
