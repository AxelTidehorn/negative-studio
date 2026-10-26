# FILMLABB 1.1 Beta 2

Avgränsad RAW-utökning från 1.1 Beta 1 compact workspace. Ingen ny färgmotor och ingen layoutändring.

- Sony ARW aktiverat i kö, import, ljusreferens och RAW-lägesbyte samt äldre projektmigrering. Verifieringsnivån är beskriven i docs/VERIFIERINGSRAPPORT.md.
- Gemensamt formatregister och gemensam validering/avkodningsadapter. Framtida NEF/CR2/CR3/RW2 ger ett tydligt besked om ännu ej aktiverat stöd.
- Relevanta kamerainställningar, WB-/färgmatriser och avkodningsalternativ följer källan och exporteras som projektmetadata. TIFF/JPEG får fortsatt sRGB; kamerans EXIF kopieras inte till bildexporten.
- Felaktig RAW ska inte kunna lämna en gammal källa tillgänglig för export. RAF-reserven läser filens bytes på nytt efter workeröverföring och är fortfarande ett uttryckligt 8-bitars reservläge. Sony får ingen förtäckt JPEG-reserv.
- Gamla projektformat och lagringsnycklar behålls. Originalfiler ingår inte i projekt-JSON och måste återimporteras.
- Nya format-/adapter-/projekt-/feltester, numerisk jämförelse och dokumenterad testmetodik. Färgmotorfiler verifieras mot Beta 1-hashar.

## Installera i befintlig GitHub-root
Lägg ZIP-innehållet i samma repository-root som nuvarande index.html/package.json. Behåll befintlig .github/workflows-konfiguration. Körningen är fortsatt npm ci → npm test → npm run build och den publicerade katalogen är site/. Viktiga nya root-filer är file-formats.js, raw-decoder.js och compare.mjs; test-suite.json måste också uppdateras. Katalogerna docs/, tests/ och tools/ är källkod/dokumentation. Ingen publicering har gjorts av denna leverans.

Den bifogade Beta 1-ZIP:en saknade själva Actions-filen; därför har dess exakta innehåll inte kunnat verifieras. docs/pages-workflow.example.yml är en valfri återställningsmall och aktiveras inte automatiskt.

## Kända gränser
En verifierad Sony-fil bevisar inte alla Sony-modeller/komprimeringar. Verkliga Sony-negativ och fysisk Edge/Chrome/Safari/iPad-verifiering återstår. Befintlig kameraberoende färgdomän kan inte upptäcka att samma kameramodell använts med annan ljuskälla eller WB. Projektmatchning sker fortsatt på filnamn. Granskning av filmkanter och förslag till separata ROI finns i rapporterna; detta beteende är inte ändrat.
