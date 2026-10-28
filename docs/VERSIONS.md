# Version och aktiv konvertering

Appens första nya versionsnummer är **2.0.0-alpha.1**, centralt i `package.json`
(även lockfilens rot). Det ersätter den inaktuella footern ”1.1 Beta 6”. Det är
appens experimentella releaseversion, inte projekt-, kalibrerings- eller motorernas
schemaversion. Gamla projekt ändras inte av detta nummer.

Varje build visar dessutom automatiskt källgren, kort Git-revision och ett
innehållsfingeravtryck. Lokala källändringar markeras uttryckligen. Versionsnummer
höjs vid en avsiktlig release; revision/fingeravtryck skiljer även commits inom
samma release. Builden är reproducerbar och använder ingen klocktid som ändrar
identiteten vid varje ombyggnad.

Identifieringen finns i vanliga sidans footer och direkt under rubriken på
`v2.html`. Den är inbakad i byggd JavaScript, inte hämtad från en potentiellt nyare
serverrapport när gammal appkod är kvar i cache. V2-workern rapporterar sin egen
byggidentitet; olika revisioner/innehåll i sida och worker ger en synlig varning.
`build-info.json` är en separat maskinläsbar kopia. Diagnostikexporten innehåller
workerns byggidentitet med saknad status när sådan information inte finns.

Efter godkänd filmbas visar V2 också vilket **faktiskt intent** som används:

- automatisk ton: recept och aktiv/fallback;
- positiv färgbalans: recept och aktiv/avstår med orsak;
- technical/fixed: automatisk ton och färgbalans används inte i visningen.

”Aktiv” betyder att steget används, inte att bildens färger har godkänts
fotografiskt. Osäker statistik kan ge fallback även i den senaste appversionen.
Version, aktivt recept och bildkvalitet är skilda frågor.

## Publicerade adresser kontrollerade 2026-10-28

- `https://axeltidehorn.github.io/negative-studio/v2.html`: V2-kod från main efter
  PR #39 (`a2fa2d8`). Hämtad `v2-render.js` matchade main byte för byte.
- `https://axeltidehorn.github.io/negative-studio-v2-preview/v2.html`: dess
  deploymentrapport angav `37913216cdfc8f04ee9a7fe104c87aeb3ab17b30` från
  `feat/filmlabb-v2-prototype`. Den kör alltså äldre kod utan PR #39:s färgbalans.

Denna versionsändring byter inte publiceringsgren eller publicerar något.
Identifieringen blir synlig först när en build som innehåller ändringen har
deployats. Ovanstående observationer är en tidpunkt, inte fasta löften om vilka
commits adresserna kommer att köra i framtiden.

## Verifiering

Build och ren `npm ci` passerar. Riktade sviter för arkitektur/startordning,
språkkataloger, testinfrastruktur, UI-reglage, reproducerbar build/cache,
isolerad RAW/WASM-preview och V2:s bas/ton-invalidation passerar.
`build-version-browser.mjs` kontrollerar footer/V2-version, workerns identitet,
verkliga fallback/aktiv/fixed-statusar, diagnostik samt olika/saknade byggversioner.
Konverteringsmatematiken är oförändrad; ingen ny bildkvalitetsvalidering påstås.
