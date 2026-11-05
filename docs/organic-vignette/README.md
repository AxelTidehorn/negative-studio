# Organic Vignette

Bakgrundskorrigering från main `207b048` (#69). **Endast arbetsytans bakgrund i mörk Classic ändras.** Kortens material, bildkö (redan halvtransparent), opak bildvisare, layout och all app-/bildbehandlingskod behålls.

## SVG och rendering

Det befintliga `--ui-workspace-material` ersätts med en liten statisk SVG som data-URL i samma CSS-fil. Ingen separat hämtning, DOM-overlay, canvas, timer, dependency eller bygg-/CI-ändring. SVG:n följer med befintlig CSS och offline-cache.

Referensens sex Bézier-former, färgstopp, opaciteter, 340×220-koordinater, filterregion och Gaussian blur 23 behålls. `preserveAspectRatio="none"` och bakgrundsstorlek 100%×100% skalar båda axlarna med arbetsytan så att alla fyra ytterkanter förblir synliga även i stående läge. Bakgrunden flyttar sig inte med kortens scroll.

**Renderingsdetalj:** filtret använder explicit `color-interpolation-filters="sRGB"`. Standardens linearRGB-läge gav tydliga bandliknande konturer i Chromium och även vid provad rasterexport. Med sRGB blir övergångarna mjuka och referensens mörkbruna färger bevaras. Rastertestet kontrollerar faktiska SVG-pixlar vid 340×220: största steg mellan angränsande RGB-kanalvärden är högst 3/255, jämfört med kraftigare språng i den avfärdade första renderingen.

Ingen framträdande banding sågs i den korrigerade renderingen. Dithering har därför inte lagts till. Blur i sig är ingen garanti mot banding på andra skärmar. En statisk rastervariant provades men behövdes inte efter korrigeringen av filterinterpoleringen.

## Visuell kontroll

[Omaskerad, faktiskt renderad bakgrund](background.png) visar formerna även där appens opaka bildvisare täcker dem.

| Kontroll | Bedömning i Chromium |
|---|---|
| Mittzon och ytterkanter | Mörkt chokladbrun mitt, markant mörkare svartbruna ytterområden; ingen neutralgrå zon i bakgrunden |
| Organiska former | Asymmetriska och överlappande, olika mellanskuggor och djupare kanter |
| Övergångar och banding | Mjuka efter sRGB-korrigeringen, inga tydliga konturer eller ljusfläckar |
| Kort och bildkö | Variation anas bakom befintligt glas och neutral halvtransparent kö; materialen är oförändrade |
| Fokus och inramning | Fotografiet dominerar; ingen ny sidopanelyta eller ram |

## Före / efter

Samma viewport, källa, zoom, automatiska filmruta, korttillstånd och synliga bildkö. Fotografisk UI-referens: NASA:s publika porträtt av Eileen Collins, via [scikit-image astronaut](https://scikit-image.org/docs/stable/api/skimage.data.html#skimage.data.astronaut) ([PNG-källa](https://raw.githubusercontent.com/scikit-image/scikit-image/v0.22.0/skimage/data/astronaut.png)). Positiv PNG visas i appens **Negativ/källvisning** för att visa fotografiet utan en ny negativkonvertering. Detta är UI-jämförelser, inte verifiering av fotografisk konverteringskvalitet. Inga privata bilder.

| Tillstånd | Före | Efter |
|---|---|---|
| Desktop, stängda kort och bildkö | [Före](before/desktop-closed.png) | [Efter](after/desktop-closed.png) |
| Desktop, Bildjusteringar och bildkö | [Före](before/desktop.png) | [Efter](after/desktop.png) |
| Kreativa profiler | [Före](before/creative-open.png) | [Efter](after/creative-open.png) |
| iPad liggande | [Före](before/ipad-landscape.png) | [Efter](after/ipad-landscape.png) |
| iPad stående | [Före](before/ipad-portrait.png) | [Efter](after/ipad-portrait.png) |
| Ljust Classic | [Före](before/desktop-light.png) | [Efter](after/desktop-light.png) |

Befintlig capture-helper har två valfria miljövariabler för reproducerbara fotografiska jämförelser: `FILMLABB_CAPTURE_IMAGE=/sökväg/astronaut.png FILMLABB_CAPTURE_SOURCE_VIEW=1 node tools/capture-ui-21.mjs after docs/organic-vignette`. Appens import och visning ändras inte.

## Verifiering och begränsningar

Befintligt Amber-test utökas med SVG-avkodning, färger, mjukhet i faktiska pixlar och mörkare hörn. Det behåller kontroller av material, bildkö, thumbnails, scrollning, tolv tema/lägeskombinationer, reducerad transparens och oförändrat bild-/analystillstånd.

Layoutmåtten före/efter är identiska. Ett 330×630-utsnitt av fotografiets preview-pixlar är exakt identiskt. Ljust tema ger byteidentiska skärmbilder för desktop, surfplatta i båda riktningar och mobil (desktopbilden sparas här).

[Interaktionskontroll](interaction-smoke.json) jämför växelvis föregående och ny bakgrund med scroll, zoom/panorering, reglage och GPU-preview. Medianintervall var 16,6 ms före och 16,6–16,7 ms efter; P95 var 18,3–19,3 ms före och 18,7–21,1 ms efter. Två 120-frame-körningar per bakgrund. Den är en kort headless Chromium/SwiftShader-kontroll med syntetisk DNG, inte ett prestandalöfte för RAF eller fysisk iPad.

Kör `npm run test:full` och `npm run build`; slutresultaten redovisas i PR:n. WebKit hämtades men kunde inte starta: systembibliotek saknas (`libgtk-4`, `libgraphene`, `libharfbuzz-icu`, `libmanette`, `libhyphen`, `libGLESv2`). Safari/WebKit och fysisk iPad/Windows Edge är därför inte verifierade.
