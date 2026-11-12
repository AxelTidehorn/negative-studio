# Applikationsversion och aktiv konvertering

`package.json` anger basen `3.0.0-beta.0`, strategin `first-parent-beta` och main-ankaret `a2fa2d801cbd905bd720777b058aef29bc620403`. `tools/release-version.mjs` räknar första föräldrar efter ankaret och genererar `3.0.0-beta.N` för rena main-byggen. Ankaret flyttas inte vid den här konsolideringen.

Varje nytt main-commit får ett större ordinaltal. Rebase/squash kan påverka stegets storlek, men samma commit/historik ger samma version. Funktionsgrenar får `.dev.g<commit>` och modifierade produktionskällor dessutom `.dirty`. Appens synliga versionsetikett och diagnostik hämtas från samma genererade `build-info.json`/`NSBuildInfo`; versionsnummer handskrivs inte i gränssnittet.

CI hämtar full historik med `fetch-depth: 0`, testar och förseglar exakt de byggda filerna. PR-byggen publiceras inte. Befintlig publiceringsworkflow kontrollerar testat commit, innehållshash och att main fortfarande är aktuell innan en separat main-publicering är möjlig. Detta uppdrag mergear eller deployar inte.

Aktiva konverteringsmotorer är **V2/D** och **Standard** (`calibrated4`). `NSProjectSettings.newImageDefaults()` väljer V2 för kompatibel ny RAW; annars Standard. Bildjustering är Editing 2.0, profiloperatorn är gemensam och aktuellt projektformat är `filmlabb-roll-4`, geometri 2. Äldre motor-/projektval och den fristående V2-labbsidan är borttagna. Se [arkitektur](ARCHITECTURE.md).
