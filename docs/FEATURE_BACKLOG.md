# FILMLABB – funktionsbacklog

**Levande checklista för funktioner, förbättringar, verifiering och framtidsidéer.**

Senast genomgången: 2026-11-12. Ursprungligen sammanställd: 2026-11-06. Detta är en planeringslista, **inte** ett löfte om att en funktion fungerar perfekt eller att en idé är beslutad för nästa release.

## Så används listan

- `[x]` = **implementerat och belagt i aktuell dokumentation/kod**. Det innebär inte nödvändigtvis fotografiskt eller fysisk-enhetsmässigt godkänd kvalitet.
- `[ ]` = **återstående arbete, verifiering eller beslut**.
- Märk varje ny/avslutad punkt med relevant PR, test eller rapport. Bocka inte av en verifieringspunkt bara för att en kodändring har mergats.
- Behåll större experiment separata från produktionsfunktioner. Markera inte en idé som klar bara för att en prototyp finns.
- Prioriteter: **P0** blockerar tillförlitlig beta; **P1** viktigt arbetsflöde; **P2** värdefull vidareutveckling; **Framtid** kräver separat prioriteringsbeslut.
- Statusen nedan utgår från [README](../README.md), [arkitekturen](ARCHITECTURE.md) och våra beslut. Öppna punkter är **inte** verifierade som saknade: undersök befintlig implementation före varje ny PR.

## Nyligen implementerat (efter 6 november)

Status här avser **kod och dokumenterade tester**, inte godkänd fotografisk kvalitet eller kontroll på fysisk iPad/Windows Edge.

- [x] RAW-import och preliminär förhandsvisning har förbättrats i [#93](https://github.com/AxelTidehorn/negative-studio/pull/93); verklig enhetsprestanda återstår.
- [x] Kodak Gold 200 och Portra 400 använder Gold P respektive Portra P (profilrevision 2) efter [#94](https://github.com/AxelTidehorn/negative-studio/pull/94); fotografisk slutkalibrering återstår.
- [x] Importåterhämtning, sammansatt RGB16-sampling och responsivare TIFF16/PNG16-export har förbättrats i [#95](https://github.com/AxelTidehorn/negative-studio/pull/95); minne och långa exporter på fysisk enhet återstår.
- [x] Formatoberoende filmhörn, polygonal analysregion och förbättrad preliminär RAW-positiv har införts i [#96](https://github.com/AxelTidehorn/negative-studio/pull/96). Bara fyra av elva verkliga RAF-fall accepterades automatiskt.
- [x] Direkta justeringsförslag för osäkra filmrutor och kodfix för reglagens dubbeltryck/touch har införts i [#97](https://github.com/AxelTidehorn/negative-studio/pull/97); den rapporterade Safari-buggen är **inte verifierad löst på fysisk iPad**.

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
- [ ] **P1** Verifiera på fysisk iPad Safari att dubbeltryck på reglage inte hindrar skrollning/kortbyte eller ändrar värden efteråt. Kandidatfix och regressioner finns i [#97](https://github.com/AxelTidehorn/negative-studio/pull/97).
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
- [ ] **P1** Förbättra felhantering och återhämtning för stora RAW-filer, minnesbrist och saknade ICC-profiler. Återförsök och bildspecifik tillståndsisolering förbättrades i [#95](https://github.com/AxelTidehorn/negative-studio/pull/95); övriga fall återstår.
- [ ] **P2** Utöka och verifiera stöd för kameror, komprimeringar och RAW-/TIFF-varianter med verkliga testfiler.
- [ ] **Framtid** Undersök direktimport från kamera eller lagringsenhet om webbläsar-/plattformsstöd gör det praktiskt.

## 2. Filmruta, geometri och kalibrering

- [x] Automatisk filmrutedetektering med manuell kantkorrigering och låsning.
- [x] Separat tekniskt analysområde och fotografisk komposition.
- [x] Kvartvarvsrotation, finrotation, upprätning, beskärning och tredjedelsrutnät.
- [x] Film-basprov, automatisk kalibrering och möjlighet till rullgemensamma inställningar.
- [ ] **P1** Verifiera automatisk filmrutedetektering mot varierade filmformat, perforeringar, kanter, ljusläckage och svåra avfotningar. [#96](https://github.com/AxelTidehorn/negative-studio/pull/96) tillförde formatoberoende hörndetektering med 11 verkliga RAF-prov (7 osäkra); [#97](https://github.com/AxelTidehorn/negative-studio/pull/97) förbättrade hur osäkra förslag presenteras, inte detektorns träffsäkerhet.
- [ ] **P1** Slutverifiera hörn-/kantkorrigering och analysområdets tydlighet på fysisk touchskärm. Direktjustering och bekräftelse infördes i [#97](https://github.com/AxelTidehorn/negative-studio/pull/97); fysisk iPad-verifiering återstår.
- [ ] **P1** Verifiera att sidmått, analysområde, rotations-/crop-koordinater och export alltid stämmer efter bildbyte och projektåterläsning.
- [ ] **P1** Färdigställ pålitlig rullkalibrering med tydlig skillnad mellan accepterad mätning, kandidat och antagen bas.
- [ ] **P2** Utveckla en reproducerbar fysisk färgreferens och testmetod; pröva eget tryckt kort med kända mål-/ICC-värden innan köp av ColorChecker antas nödvändigt.
- [ ] **P2** Dokumentera standardiserad avfotning av negativ och färgreferens (ljus, vinkel, avstånd, exponering och reproducerbarhet).

## 3. Konverteringsmotor och fotografisk kvalitet

- [x] V2/D som huvudmotor och standard för kompatibel RAW; Standard som reserv. Övriga separata motorer och jämförelselabbet avvecklade (se konsolideringsrapport).
- [x] Editing 2.0 för nya bilder, med äldre redigering bevarad för kompatibla projekt.
- [x] Separata tekniska kalibreringsdata och kreativa redigeringssteg.
- [ ] **P0** Skapa ett reproducerbart bibliotek med verkliga negativ (filmtyp, ljus, exponering, motiv, original-RAW och accepterade referensrenderingar).
- [ ] **P0** Verifiera och förbättra automatisk exponering och tonplacering på V2, särskilt mörka/ljusa och fel­exponerade negativ.
- [ ] **P0** Verifiera och förbättra automatisk neutralisering av färgstick med särskild kontroll av hudtoner och färgseparation.
- [ ] **P0** Gör låsta A/B-jämförelser mellan Standard och V2 med samma källa, filmbas och inställningar; dokumentera förbättring och regression.
- [x] **P1, implementationssteg:** Gemensam profiloperator och filmprototyper finns ([#90](https://github.com/AxelTidehorn/negative-studio/pull/90), [#91](https://github.com/AxelTidehorn/negative-studio/pull/91), [#94](https://github.com/AxelTidehorn/negative-studio/pull/94)). Detta är inte ett fotografiskt godkännande.
- [ ] **P1** Förbättra och fotografiskt verifiera befintliga Gold 200, Portra 400, Ektar 100 och Pro 400H på låsta neutrala positiva källor. Jämför tonkurvor, hud, grönska, skuggor, högdagrar och färgseparation mot dokumenterade fotografiska mål. Granska särskilt Gold P:s rapporterade ökning av helt svarta kanalvärden ([#94](https://github.com/AxelTidehorn/negative-studio/pull/94)).
- [ ] **P1** Verifiera att preview och högupplöst export ger konsekvent ton/färg/geometri mellan CPU-, worker- och GPU-vägar.
- [ ] **P1** Undersök aliasing, interpolering och kvalitet vid nedskalning utan att försämra fotografisk detalj.
- [ ] **P1** Förbättra reglagens upplevda respons och previewlatens under verklig RAW-belastning.
- [ ] **P2** Utvärdera vidare den experimentella bredgamut-/robust-density-kedjan med tydliga acceptanskriterier.

## 4. Redigeringsfunktioner

- [x] Exponering, kontrast, gamma, ändpunkter, högdagrar/skuggor, temperatur, tint och mättnad finns.
- [x] Aktuella filmkaraktärer, fyra kreativa färgprofiler och Neutral svartvit finns i den gemensamma profilkatalogen.
- [x] Positiv/Negativ/Jämför, zoom och originaldetalj finns.
- [ ] **P1** Inventera och besluta hur ångra/gör om ska fungera för både redigering, kalibrering och geometri; implementera och verifiera historik.
- [ ] **P1** Inventera befintliga kortkommandon; komplettera en sammanhängande, dokumenterad tangentbordsuppsättning.
- [ ] **P2** Utred ett redigerbart kurvverktyg (global tonkurva och eventuellt separata RGB-kanaler) inom Editing 2.0; den gamla separata Curve-motorn är borttagen.
- [ ] **P2** Förfina och verifiera de fyra kreativa profilerna Backstreet, Afterglow, Pale Static och Redline ([#92](https://github.com/AxelTidehorn/negative-studio/pull/92)) mot verkliga fotografier. Nya profiler kräver separat behovsprövning.
- [ ] **P2** Förbättra fokusläge, zoom, jämförelse och detaljgranskning utifrån faktiskt arbetsflöde.

## 5. Filmkö, rulle och projekt

- [x] Kö om högst fem bilder; endast aktiv bild avkodas fullt.
- [x] Bildspecifika redigeringar/geometrier och rullgemensamma profil-/exportval.
- [x] Aktuella `filmlabb-roll-4`-projekt kan sparas/återläsas; originalbilder bäddas inte in. Äldre scheman har avvecklats.
- [ ] **P1** Verifiera helflödet för rullgemensam kalibrering och individuella bildkorrigeringar på flera riktiga negativ.
- [ ] **P1** Förbättra kö-/rullupplevelsen inklusive aktiv bild, batchval, ordning och trygg hantering av osparat arbete.
- [ ] **P1** Utred fler än fem köbilder med tydlig minnesbudget och tillförlitlig avkodnings-/frigöringsstrategi; höj inte gränsen utan mätning.
- [ ] **P1** Verifiera aktuella projekts återöppning med saknade original och bildspecifik/gemensam kalibrering på fysisk enhet. Äldre projektmigrering är avsiktligt borttagen.
- [ ] **P2** Utvärdera en smidigare projekt-/rullorganisation och återanvändbara kalibreringsmallar.

## 6. Export och leverans

- [x] JPEG och 16-bitars RGB-TIFF med sRGB-profil.
- [x] Batch för JPEG ZIP och valda TIFF-bilder; progress, avbrott och filnamnshantering.
- [ ] **P0** Verifiera slutlig JPEG-/TIFF-kvalitet och färghantering mot riktiga original i avsedd storlek/upplösning.
- [ ] **P1** Förbättra batchflöde, filnamnsmallar, kollisionshantering och tydliga felmeddelanden.
- [ ] **P1** Verifiera avbrytning, återförsök och minnesfrigöring vid längre export på fysisk iPad och Windows Edge. Worker-/fallbacktester och Chromium-mätningar finns i [#95](https://github.com/AxelTidehorn/negative-studio/pull/95), men ersätter inte dessa enhetstester.
- [x] **Implementerat:** PNG16-export finns och ingår i den optimerade RGB16-exportkedjan ([#95](https://github.com/AxelTidehorn/negative-studio/pull/95)). Fysisk slutverifiering ingår fortsatt i öppna exportpunkter.
- [ ] **Framtid** Utvärdera linjär DNG-export; kräver separat format- och färgkontrakt.
- [ ] **Framtid** Undersök arbetsflöden mot externa bildredigerare eller exportpresets.

## 7. Plattform, prestanda och release

- [x] Lokal bildbehandling; service-worker-baserad offline-cache/PWA-grund finns.
- [x] CPU-reserv och stödd WebGL 2-preview; version/commit visas i appen.
- [ ] **P0** Kör hela import → kalibrering → konvertering → redigering → export med riktiga original på fysisk iPad Safari och Windows Edge.
- [ ] **P1** Profilera minne, GPU/CPU-växling, cachefrigöring och långlivade sessioner; sätt mätbara resursgränser.
- [ ] **P1** Verifiera offlineinstallation, uppdatering, cacheinvalidering och återöppning i faktiska webbläsare.
- [x] Fristående V2-labb och dess dubbla import-/exportkedja borttagna; huvudappen äger hela arbetsflödet.
- [ ] **P1** Sätt tydliga acceptanskriterier för en stabil beta och genomför full regressions- och användarverifiering.
- [ ] **P2** Dokumentera funktioner och kamerastöd som faktiskt är verifierade samt kända begränsningar.
- [ ] **Framtid** Undersök native/installerbara iPad-, Android- och desktopappar först efter att webbflödet är stabilt.
- [ ] **Framtid** Separat generell webbredigerare – eget produktbeslut, inte del av FILMLABB:s kärnbeta.

## Prioriterat arbetsflöde härnäst

1. **Verifiera det nya filmrute-UX:et och reglagens touchhantering på fysisk iPad Safari**; skilj fungerande kod från faktisk enhetsacceptans.
2. **Bygg ett reproducerbart bibliotek med verkliga negativ och referensrenderingar**; gör låsta Standard/V2-jämförelser och prioritera exponering/färgstick.
3. **Förbättra befintliga filmprofiler** på identiska neutrala positiva källor, med särskild uppmärksamhet på Gold P:s skuggor.
4. **Slutför kvarvarande D2-, bildkö- och projektflöden** baserat på verifierade fel.
5. **Slutverifiera bildkvalitet, stora exporter, iPad/Edge, minne och offline** innan beslut om stabil beta.

## Ändringslogg

- **2026-11-12:** Två motorer, en filmrutepost, aktuellt projektformat och uppdaterad dokumentation i samma konsoliderings-PR. Numerisk/prestandaevidens: [rapport](consolidation/README.md).

- **2026-11-06:** Första samlade checklistan. Redan dokumenterad implementation avprickad; otestad kvalitet och nya önskemål lämnade öppna.
- **2026-11-09:** Avstämd mot mergade #90–#97, särskilt #93–#97. Implementerad funktion skiljs från fotografisk/fysisk verifiering; befintliga profiler prioriteras för förbättring och PNG16 är inte längre en framtidsidé.

> **Underhållsregel:** Uppdatera den här filen i samma PR som slutför en backlogpunkt. Lägg till länk till PR/test i punkten eller ändringsloggen. Ändra inte status retroaktivt utan evidens.
