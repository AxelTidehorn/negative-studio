# FILMLABB 1.1 Beta 3.2

Uppdaterad schemaläggning av förhandsvisningen. Filmrutefixen, profiler, RAW-stöd och färgformler från Beta 3.1 är kvar.

Ladda upp hela ZIP-innehållet i befintlig GitHub-root. Bevara .github/workflows. Kör npm ci, npm test, npm run build och publicera site/ som tidigare. Inga nya beroenden. Den befintliga workflowfilen saknades i underlaget och ersätts inte.

Efter uppdatering: öppna om appen och kontrollera 1.1 Beta 3.2 i sidfoten. Den nya preview-scheduler.js ska finnas med i den publicerade site-mappen. Cacheversionen är uppdaterad.

Snabbare, grövre förhandsvisning under reglage-drag. Detaljerna återkommer efteråt med worker; exporten använder fortsatt originalet. Se docs/PRESTANDA_BETA3_2.md för verifiering och begränsningar. Fysisk Edge/Chrome-testning återstår.
