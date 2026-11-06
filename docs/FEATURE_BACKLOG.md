# FILMLABB – funktionsbacklog

**Levande checklista för funktioner, förbättringar, verifiering och framtidsidéer.**

Senast sammanställd: 2026-11-06. Detta är en planeringslista, **inte** ett löfte om att en funktion fungerar perfekt eller att en idé är beslutad för nästa release.

## Så används listan

- `[x]` = **implementerat och belagt i aktuell dokumentation/kod**. Det innebär inte nödvändigtvis fotografiskt eller fysisk-enhetsmässigt godkänd kvalitet.
- `[ ]` = **återstående arbete, verifiering eller beslut**.
- Märk varje ny/avslutad punkt med relevant PR, test eller rapport. Bocka inte av en verifieringspunkt bara för att en kodändring har mergats.
- Behåll större experiment separata från produktionsfunktioner. Markera inte en idé som klar bara för att en prototyp finns.
- Prioriteter: **P0** blockerar tillförlitlig beta; **P1** viktigt arbetsflöde; **P2** värdefull vidareutveckling; **Framtid** kräver separat prioriteringsbeslut.
- Statusen nedan utgår från [README](../README.md), [arkitekturen](ARCHITECTURE.md) och våra beslut. Öppna punkter är **inte** verifierade som saknade: undersök befintlig implementation före varje ny PR.

## 0. Amber Glass, UX och stabilitet

- [x] Amber Glass A1 – material, transparens, Smoke Overlay ([#77](https://github.com/AxelTidehorn/negative-studio/pull/77)).
- [x] Amber Glass A2 – organisk bakgrund och lokal kontrast ([#78](https://github.com/AxelTidehorn/negative-studio/pull/78)).
- [x] Amber Glass B – enhetliga kontrollroller och tillstånd ([#79](https://github.com/AxelTidehorn/negative-studio/pull/79)).
- [x] Amber Glass C – optisk materialharmonisering ([#80](https://github.com/AxelTidehorn/negative-studio/pull/80)).
- [x] Amber Glass D – första animationssystemet ([#81](https://github.com/AxelTidehorn/negative-studio/pull/81)); **inte** liktydigt med godkänd rörelsekvalitet.
- [ ] **P1** D2: rätta överlappande/klippt sammanfattningstext i expanderade kort; regressionsprov för alla fem kort.
- [ ] **P1** D2: förfina öppna/stäng-animationer och mät faktisk följsamhet i Edge och WebKit.
- [ ] **P1** D2: animera visa/dölj för filmkö och justeringspanel utan instabil bildskalning.
- [ ] **P1** D2: granska oavsiktlig scrollning, dynamisk Safari-viewport och visuella hopp; identifiera orsak före layoutändring.
- [ ] **P1** Slutlig visuell kontroll på fysisk iPad Safari och Windows Edge, med och utan reducerad transparens/rörelse.
- [ ] **P1** Dokumentera/frys designroller, rörelseprinciper och regressioner när D2 godkänts.
- [ ] **P2** Utvärdera små träffytor i flytande bildverktyg (nu ca 32 px), utan att försämra layouten.
- [ ] **P2** Åtgärda känt pointer-/panoreringsproblem som kan hindra dölj/visa av verktyg vid zoom >1.

## 1. Import, RAW och kompatibilitet

- [x] Lokal import av RAW, JPEG, PNG, WebP samt RGB-/gråskale-TIFF.
- [x] LibRaw/WASM-avkodning i worker och begränsade reservvägar.
- [x] Kamerafilernas format-/policyvägar och separat stöd för RAF-miniatyr/JPEG-fallback.
- [ ] **P0** Verifiera riktiga Fujifilm RAF från relevanta kameror, särskilt tidigare rapporterade blå/lila artefakter; fastställ orsak innan korrigering.
- [ ] **P1** Upprätta faktisk kameramodell-/RAW-kompatibilitetsmatris med testoriginal, formatvariant och verifierat resultat.
- [ ] **P1** Förbättra felhantering och återhämtning för stora RAW-filer, minnesbrist och saknade ICC-profiler.
- [ ] **P2** Utöka och verifiera stöd för kameror, komprimeringar och RAW-/TIFF-varianter med verkliga testfiler.
- [ ] **Framtid** Undersök direktimport från kamera eller lagringsenhet om webbläsar-/plattformsstöd gör det praktiskt.

## 2. Filmruta, geometri och kalibrering

- [x] Automatisk filmrutedetektering med manuell kantkorrigering och låsning.
- [x] Separat tekniskt analysområde och fotografisk komposition.
- [x] Kvartvarvsrotation, finrotation, upprätning, beskärning och tredjedelsrutnät.
- [x] Film-basprov, automatisk kalibrering och möjlighet till rullgemensamma inställningar.
- [ ] **P1** Verifiera automatisk filmrutedetektering mot varierade filmformat, perforeringar, kanter, ljusläckage och svåra avfotningar.
- [ ] **P1** Förbättra interaktiv hörn-/kantkorrigering och analysområdets tydlighet på touchskärm.
- [ ] **P1** Verifiera att sidmått, analysområde, rotations-/crop-koordinater och export alltid stämmer efter bildbyte och projektåterläsning.
- [ ] **P1** Färdigställ pålitlig rullkalibrering med tydlig skillnad mellan accepterad mätning, kandidat och antagen bas.
- [ ] **P2** Utveckla en reproducerbar fysisk färgreferens och testmetod; pröva eget tryckt kort med kända mål-/ICC-värden innan köp av ColorChecker antas nödvändigt.
- [ ] **P2** Dokumentera standardiserad avfotning av negativ och färgreferens (ljus, vinkel, avstånd, exponering och reproducerbarhet).

## 3. Konverteringsmotor och fotografisk kvalitet

- [x] Standard och Original som referenser; Curve, Density, Matrix och experimentell V2 finns i huvudplattformen.
- [x] Editing 2.0 för nya bilder, med äldre redigering bevarad för kompatibla projekt.
- [x] Separata tekniska kalibreringsdata och kreativa redigeringssteg.
- [ ] **P0** Skapa ett reproducerbart bibliotek med verkliga negativ (filmtyp, ljus, exponering, motiv, original-RAW och accepterade referensrenderingar).
- [ ] **P0** Verifiera och förbättra automatisk exponering och tonplacering på V2, särskilt mörka/ljusa och fel­exponerade negativ.
- [ ] **P0** Verifiera och förbättra automatisk neutralisering av färgstick med särskild kontroll av hudtoner och färgseparation.
- [ ] **P0** Gör låsta A/B-jämförelser mellan Standard och V2 med samma källa, filmbas och inställningar; dokumentera förbättring och regression.
- [ ] **P1** Utvärdera filmberoende profiler/responsmodeller först efter mätunderlag och fotografisk verifiering.
- [ ] **P1** Verifiera att preview och högupplöst export ger konsekvent ton/färg/geometri mellan CPU-, worker- och GPU-vägar.
- [ ] **P1** Undersök aliasing, interpolering och kvalitet vid nedskalning utan att försämra fotografisk detalj.
- [ ] **P1** Förbättra reglagens upplevda respons och previewlatens under verklig RAW-belastning.
- [ ] **P2** Utvärdera vidare den experimentella bredgamut-/robust-density-kedjan med tydliga acceptanskriterier.

## 4. Redigeringsfunktioner

- [x] Exponering, kontrast, gamma, ändpunkter, högdagrar/skuggor, temperatur, tint och mättnad finns.
- [x] Kreativa färg-/monokromprofiler och kopiestilar finns.
- [x] Positiv/Negativ/Jämför, zoom och originaldetalj finns.
- [ ] **P1** Inventera och besluta hur ångra/gör om ska fungera för både redigering, kalibrering och geometri; implementera och verifiera historik.
- [ ] **P1** Inventera befintliga kortkommandon; komplettera en sammanhängande, dokumenterad tangentbordsuppsättning.
- [ ] **P2** Utred ett redigerbart kurvverktyg (global tonkurva och eventuellt separata RGB-kanaler) utan att blanda ihop med experimentmotorn ”Curve”.
- [ ] **P2** Utöka kreativa profiler när grundkonverteringen är stabil och profilerna kan verifieras mot riktiga foton.
- [ ] **P2** Förbättra fokusläge, zoom, jämförelse och detaljgranskning utifrån faktiskt arbetsflöde.

## 5. Filmkö, rulle och projekt

- [x] Kö om högst fem bilder; endast aktiv bild avkodas fullt.
- [x] Bildspecifika redigeringar/geometrier och rullgemensamma profil-/exportval.
- [x] Projekt kan sparas/återläsas som JSON med bakåtkompatibilitet; originalbilder bäddas inte in.
- [ ] **P1** Verifiera helflödet för rullgemensam kalibrering och individuella bildkorrigeringar på flera riktiga negativ.
- [ ] **P1** Förbättra kö-/rullupplevelsen inklusive aktiv bild, batchval, ordning och trygg hantering av osparat arbete.
- [ ] **P1** Utred fler än fem köbilder med tydlig minnesbudget och tillförlitlig avkodnings-/frigöringsstrategi; höj inte gränsen utan mätning.
- [ ] **P1** Testa återöppning och migrationsfall för äldre projekt, saknade original och olika motor-/redigeringsversioner.
- [ ] **P2** Utvärdera en smidigare projekt-/rullorganisation och återanvändbara kalibreringsmallar.

## 6. Export och leverans

- [x] JPEG och 16-bitars RGB-TIFF med sRGB-profil.
- [x] Batch för JPEG ZIP och valda TIFF-bilder; progress, avbrott och filnamnshantering.
- [ ] **P0** Verifiera slutlig JPEG-/TIFF-kvalitet och färghantering mot riktiga original i avsedd storlek/upplösning.
- [ ] **P1** Förbättra batchflöde, filnamnsmallar, kollisionshantering och tydliga felmeddelanden.
- [ ] **P1** Verifiera avbrytning, återförsök och minnesfrigöring vid längre export på iPad och Edge.
- [ ] **Framtid** Utvärdera 16-bitars PNG-export om ett konkret behov finns.
- [ ] **Framtid** Utvärdera linjär DNG-export; kräver separat format- och färgkontrakt.
- [ ] **Framtid** Undersök arbetsflöden mot externa bildredigerare eller exportpresets.

## 7. Plattform, prestanda och release

- [x] Lokal bildbehandling; service-worker-baserad offline-cache/PWA-grund finns.
- [x] CPU-reserv och stödd WebGL 2-preview; version/commit visas i appen.
- [ ] **P0** Kör hela import → kalibrering → konvertering → redigering → export med riktiga original på fysisk iPad Safari och Windows Edge.
- [ ] **P1** Profilera minne, GPU/CPU-växling, cachefrigöring och långlivade sessioner; sätt mätbara resursgränser.
- [ ] **P1** Verifiera offlineinstallation, uppdatering, cacheinvalidering och återöppning i faktiska webbläsare.
- [ ] **P1** Utred separat dokumenterat problem med offline-navigation till V2-labbet (se [motiondokumentation](AMBER_GLASS_MOTION.md)).
- [ ] **P1** Sätt tydliga acceptanskriterier för en stabil beta och genomför full regressions- och användarverifiering.
- [ ] **P2** Dokumentera funktioner och kamerastöd som faktiskt är verifierade samt kända begränsningar.
- [ ] **Framtid** Undersök native/installerbara iPad-, Android- och desktopappar först efter att webbflödet är stabilt.
- [ ] **Framtid** Separat generell webbredigerare – eget produktbeslut, inte del av FILMLABB:s kärnbeta.

## Prioriterat arbetsflöde härnäst

1. **Avsluta D2 och visuellt godkänn Amber Glass**; dokumentera designsystemet.
2. **Inventera implementation och testtäckning** för de öppna P0/P1-punkterna innan nya funktioner byggs.
3. **Skapa testmaterial och mätbara fotografiska kvalitetskriterier.**
4. **Verifiera/förbättra Standard och V2**, en reproducerbar brist åt gången.
5. **Färdigställ kö, filmrute-/rullflöden och önskade redigeringsfunktioner** utifrån bevisade behov.
6. **Slutverifiera export, iPad/Edge, prestanda och offline** före beslut om stabil beta.

## Ändringslogg

- **2026-11-06:** Första samlade checklistan. Redan dokumenterad implementation avprickad; otestad kvalitet och nya önskemål lämnade öppna.

> **Underhållsregel:** Uppdatera den här filen i samma PR som slutför en backlogpunkt. Lägg till länk till PR/test i punkten eller ändringsloggen. Ändra inte status retroaktivt utan evidens.
