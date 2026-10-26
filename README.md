# FILMLABB

Negativkonvertering i webbläsaren med lokal RAW/TIFF-import, GPU-preview,
JPEG/TIFF-export och projektfiler. Originalbilder skickas inte till någon server.

```sh
npm ci
npm test
npm run build
npm run test:build
```

Starta den byggda webbappen, exempelvis med:

```sh
python3 -m http.server 8000 --directory site
```

Öppna `http://localhost:8000`. `index.html` är byggingången; redigerbara moduler
finns under `src/`. Byggsteget kopierar dem till stabila publika filnamn i `site/`.
Publicera hela `site/` via HTTPS. Befintliga GitHub Actions bygger och publicerar
till GitHub Pages; ingen bundler eller ny runtime krävs.

Webbläsartester:

```sh
npx playwright install chromium
npm run test:browser
```

`FILMLABB_CHROMIUM_BIN` kan ange en redan installerad Chromium. En del av
Node-sviten kan köras med exempelvis `npm test -- --group color` eller
`npm test -- --group projects`. Alla testkällor och fixtures är direkt
versionshanterade under `tests/`; inget testarkiv packas upp vid körning.

Se [aktuell arkitektur och kompatibilitetsregler](docs/ARCHITECTURE.md) för
ansvarsfördelning, startordning, färgkedja, tillstånd och tester.
[Refaktoreringsöversikten](docs/REFACTORING.md) redovisar vad som flyttats,
tagits bort och medvetet bevarats. Äldre releaseanteckningar finns under
[docs/history/releases](docs/history/releases).

Projekt-JSON innehåller inställningar och metadata, inte originalbilder.
Importera originalen före projektet. Standard, Jämförelse och de motorer/profiler
som behövs för äldre projekt behålls. Förbättringarna i refaktoreringen ändrar
inte färgformler eller exportresultat.
