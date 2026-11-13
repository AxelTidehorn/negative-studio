# Amber Glass: lugnare bakgrund och lättare bildkö

> Historical implementation/measurement record. Reproduction commands referring to removed tools require the [pinned PR #99 checkout](https://github.com/AxelTidehorn/negative-studio/blob/f78a0314480072a723f97ce3f1a5aeffae008353/docs/amber-vignette/README.md). This does not retire the application functionality described here. Current test commands and coverage are in [TESTING](../TESTING.md).

Visuell korrigering från main `427fd40` (#68). Endast mörk Classic får de ändrade materialen. Ingen app-JavaScript, layout, bildbehandling, import/export, projektkod eller bygg-/publiceringslogik ändras.

- Den befintliga arbetsytegradienten använder nu fyra breda, asymmetriska **mörka** radialfält över en varm neutral mörk mittton. Kopparljusfälten är borttagna. Fälten ligger kvar bakom korten under editor-scroll; inga nya lager, animationer eller bildresurser.
- Samma amberglas i stängda kort och öppna rubriker, med lägre opacitet (20–35 %, tidigare 28–47 %), diskretare kant (`#F0B48133`) och överkantsreflektion (18 %). Befintlig 10px blur och liten skugga behålls.
- Öppna innehåll förblir helt matta och ogenomskinliga (`#171210`). Radie 6px, kompakt padding, kortordning och interaktion behålls.
- Bildkön använder `rgba(24,24,25,.58)` i **bakgrundsfärgen**, inte opacity på panelen. Thumbnail-pixlar, text och markerad bild påverkas därför inte av transparensen. Ingen ny blur eller GPU-pass. Reducerad transparens ger en solid neutral köbakgrund.
- Övriga teman och alla ljusa lägen behåller tidigare material. Fotoytan är fortsatt solid och neutral.

## Verkliga före-/efterbilder

Samma publika demo, viewport, zoom och korttillstånd. Inga privata fotografier. Före är main med första Amber Glass; efter är denna korrigering.

| Tillstånd | Före | Efter |
|---|---|---|
| Desktop, stängda kort och bildkö | [Före](before/desktop-closed.png) | [Efter](after/desktop-closed.png) |
| Desktop, Bildjusteringar och bildkö | [Före](before/desktop.png) | [Efter](after/desktop.png) |
| Kreativa profiler | [Före](before/creative-open.png) | [Efter](after/creative-open.png) |
| iPad liggande | [Före](before/ipad-landscape.png) | [Efter](after/ipad-landscape.png) |
| iPad stående | [Före](before/ipad-portrait.png) | [Efter](after/ipad-portrait.png) |
| Ljust Classic | [Före](before/desktop-light.png) | [Efter](after/desktop-light.png) |

Befintlig `tools/capture-ui-21.mjs` används för båda faserna. Urvalet ovan sparas; skriptet kan även generera övriga befintliga vyer. Layoutmåtten i `before/metrics.json` och `after/metrics.json` är identiska. Ljust Classic gav byteidentiska skärmbilder för desktop, surfplatta i båda riktningar och mobil (desktopbilden sparas här).

## Verifiering

Det utökade befintliga `amber-glass-browser.mjs` verifierar mörka fält, neutral halvtransparent kö, ofiltrerade thumbnails, solid innehållsyta, stillaliggande bakgrund, alla tolv tema/lägeskombinationer, reducerad transparens och oförändrade tillstånd/pixelvärden/analys/GPU-källuppladdningar. Befintliga UI-tester täcker tangentbord, touch, projekt, export och CPU/GPU.

Kör `npm run test:full` och `npm run build`. Slutliga resultat finns i PR-beskrivningen och dess CI-kontroller. Browserkontroller och skärmbilder använder Chromium med touch-emulering och SwiftShader. Fysisk iPad Safari och Windows Edge har inte testats.
