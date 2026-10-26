# FILMLABB 1.1 Beta 5 — UI fix 8

Riktad uppdatering från Workspace v7.

- Exportens förloppspanel positioneras fast i viewporten ovanför sidans innehåll och kan alltid nås under export.
- Filmutsknittets befintliga justeringsram visas direkt efter bildinläsning, utan att panelen behöver öppnas. En bekräftelse döljer ramen. Filmrutealternativ förblir i den infällbara delen av högerpanelen.
- Aktiv bild i arbetskön markeras med tydlig ram och bakgrund i båda färglägena.
- Service-worker-cache har fått nytt versionsnamn.

Bildmotor, exportgeometri och filformatshantering är inte ändrade. Visuell webbläsarkontroll är inte genomförd. Fullständig testsvit har inte slutförts i denna miljö.

För GitHub-root: packa upp ZIP i repository-roten; befintlig `npm install && npm run build` används för att skapa site-mappen med LibRaw. Om byggberoenden saknas måste de installeras i byggmiljön.
