# FILMLABB 1.1 Beta 5 — enklare arbetsyta och bakgrundsexport

## Arbetsytan

Standardvyn börjar med histogram, följt av exponering, kontrast, vitbalans, mättnad, skuggor och högdagrar. Neutralpipett, kreativ profil, profilstyrka och positiv återgivning följer därefter.

**Avancerade inställningar** är stängd från början. Där finns motorval, RAW-import, gamma och djupare tonkontroller, kalibrering, referensbilder, belysningskorrigering, exportstorlek, batch och projekt. Valet att ha sektionen öppen sparas separat på enheten och ändrar inte bildens eller projektets inställningar. När sektionen stängs återgår panelen till toppen. Aktiva avancerade lägen sammanfattas även i den enkla vyn.

Filmrutans status och bekräftelse ligger vid bilden. Ytterligare filmruteval finns under **Justera filmruta**. Profilens beskrivning ligger under avancerat, så att de dagliga reglagen får mer plats.

## JPEG i bakgrunden

När webbläsaren stöder det utförs färgberäkning och JPEG-kodning i en separat worker med OffscreenCanvas. Bara en liten remsa källpixlar skickas åt gången, högst 768 KiB även för Float32. Hela originalets pixelbuffer kopieras eller överförs inte till workern; originalet kan fortsatt användas av appen.

Exporten visar förlopp, bildmått och en avbrytknapp. Den använder en ögonblicksbild av färginställningar, beskärning och rotation från starten. Reglagen kan fortfarande användas under exporten, men ändringarna gäller nästa export. Inläsning och andra exporter är låsta tills jobbet är avslutat.

**Avbryt** stoppar workern även när JPEG-kodningen pågår. Ingen fil hämtas för det avbrutna jobbet. En ny export kan startas efteråt. JPEG-batch använder samma exportväg och avbrytning; en avbruten batch hämtar ingen partiell ZIP. Om batchen håller på att avkoda nästa RAW behöver den inläsningen bli klar innan batchen avslutas. Den tidigare aktiva bilden återställs.

Om workers eller OffscreenCanvas inte kan användas finns ett reservläge på huvudtråden som bearbetar mindre remsor och lämnar tid åt gränssnittet. Även reservläget går att avbryta; webbläsarens redan påbörjade inbyggda kodning kan fortsätta internt, men dess resultat kasseras. Om bakgrundskodaren returnerar PNG i stället för JPEG provas huvudtrådens JPEG-kodare. Filtyp och JPEG-signatur kontrolleras innan någon fil hämtas.

Storleksgränser och automatiska reservstorlekar följer Beta 4: normalt upp till 40 MP, 24 MP vid mindre än 4 GB rapporterat enhetsminne, alternativt högst 12 MP. Vid kodnings-/minnesfel provas mindre storlekar. Reservläget och slutlig JPEG-kodning använder fortfarande minne för exportytan; detta är ingen garanti för alla stora bilder på alla enheter.

TIFF-exporten behåller den befintliga färg- och exportvägen. Den nya bakgrundskodningen och avbrytknappen gäller JPEG och JPEG-ZIP.

## Verifiering

- Befintlig testsvit för färg, RAW, analys, TIFF och export passerar.
- 48 extra kombinationer verifierar identiska färgvärden för remsor och direkt export: linjär/sRGB, 8/16 bit och float, beskärning, fyra rotationer och belysningskorrigering.
- Riktiga Chromium-exporter ger identiska JPEG-bytes i worker och reservläge, även med Rec.2020, kreativa färg-/svartvitprofiler och belysningskorrigering.
- Webbläsartester kontrollerar låsta exportinställningar, avbrytning under kodning, omstart, utebliven fil/ZIP efter avbrytning, workerfel, fel filtyp, mobil layout och sparad avancerad vy.
- Befintliga GPU/CPU-tester passerar; grafiktester körs med SwiftShader och är inte prestandamätningar på fysisk GPU. Edge på din dator och Safari på iPad behöver fortfarande verklig användarverifiering.

Resultat: `docs/workflow-browser-results.json` och `docs/gpu-browser-results.json`.

## Installation

Samma rootinstallation som tidigare: packa upp och ersätt/lägg till filerna i GitHub-repots root. Ta med de nya filerna `compact-ui.js`, `export-plan.js`, `export-controller.js` och `export-worker.js`. Befintligt workflow behöver inte ändras om det redan kör `npm test` och `npm run build`.

```sh
npm ci
npm test
npm run build
```

Hela `site/` publiceras via HTTPS. Testsviten återställer TIFF-fixturerna automatiskt, även när endast rootfiler har laddats upp. Ladda om appen efter publicering för att hämta den nya versionen.

Valfria Chromium-tester kräver en separat Playwright-installation:

```sh
FILMLABB_CHROMIUM_BIN=/path/to/chromium npm run test:workflow
FILMLABB_CHROMIUM_BIN=/path/to/chromium npm run test:gpu
```

`FILMLABB_PLAYWRIGHT_MODULE` och `FILMLABB_CHROMIUM_ARGS` kan anges för egen webbläsarmiljö. Själva appen får inga nya paketberoenden. Tidigare experimentella RAW-format och färglägen har samma begränsningar som i Beta 4.
