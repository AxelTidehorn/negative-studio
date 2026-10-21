# FILMLABB 1.1 Beta 3.1

Beta 3 med korrigerad manuell filmruta. Samma kreativa profiler, färgformler och RAW-import som Beta 3. Endast rutans geometri, pekarhantering och koordinatlagring korrigeras. Se docs/MANUELL_FILMRUTA_BETA3_1.md.

Ladda upp hela ZIP-innehållet i befintlig GitHub-root och bevara .github/workflows. Kör npm ci, npm test och npm run build; publicera site/ som tidigare. Workflowfilen saknades i underlaget och har inte ersatts. Beroenden och låsfil är oförändrade.

Nya huvudmoduler heter frame-controller.js, image-model.js och workspace-layout.js. De gamla beta3.js, color-engine.js och workspace.js används inte längre; de kan tas bort ur repo efter uppdatering. Test-/byggkommandon fungerar via package.json och tidigare kommandofiler. Ingen färgmotor har lagts till.

Cachen har nytt versionsnamn. Öppna om appen efter uppdatering och kontrollera 1.1 Beta 3.1 i sidfoten.

Manuell ruta gäller tills Hitta filmruta eller Hela bilden väljs. En låst ruta måste först låsas upp. Avmarkerad exportbeskärning behåller hela bilden. Fysisk iPad/Safari-testning återstår.
