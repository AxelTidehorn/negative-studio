# FILMLABB 1.1 Beta 4 — utvecklingsprototyp

Denna uppdatering bygger vidare på GPU-versionen 3.6.1. Standardimporten och den befintliga kalibrerade färgmotorn finns kvar. Nya färg- och belysningsmetoder är experimentella; detta är ingen färgmetriskt validerad release.

## Nytt

- **Nikon NEF, Canon CR2/CR3 och Panasonic RW2** går genom samma LibRaw-adapter som RAF/DNG/ARW. Kameramodell och komprimering avgör det faktiska stödet. Misslyckade importer lämnar export avstängd. Bara RAF har valfri inbäddad JPEG som reserv.
- **Originaldetalj, 100/200 %:** en separat detaljvy läser en 320×320-region ur den avkodade källan. Vid 100 % motsvarar en källpixel en CSS-pixel, oberoende av skärmens pixeltäthet. Flytta med pilar eller klick i huvudbilden. Detaljen visas före rotation och ändrar inte filmruta eller analys. GPU används när det går, annars CPU.
- **Större JPEG:** originalstorlek är standard, med gräns 40 MP och 16384 pixlar per sida; 24 MP om enheten rapporterar mindre än 4 GB minne. Vid kodningsfel provas 12, 6 och 3 MP. Ett separat val behåller det tidigare 12 MP-läget. Exporten kontrollerar att webbläsaren verkligen returnerar JPEG. Bearbetningen lämnar tid åt gränssnittet mellan remsorna; den kör ännu på huvudtråden.
- **Större JPEG/PNG-import:** den tidigare generella gränsen 3500 pixlar är ersatt av samma gränser 40/24 MP och 16384 pixlar. Bilder över gränserna skalas ned vid import, vilket visas i statusen. För dessa bilder visar detaljvyn den bearbetningskälla som finns kvar, inte den ursprungliga filens fulla upplösning.
- **RAW-import: Experiment · Rec.2020 i flyttal:** behåller LibRaws tre Rec.2020-kanaler i Float32 fram till efter negativinversion och gemensam tonberäkning. Positivet konverteras därefter till sRGB med enkel kompression mot neutral för negativa sRGB-kanaler. Förhandsvisning, JPEG och TIFF använder samma beräkning. Kräver Standardmotorn. Det är en ny tolkning att jämföra med standardimporten, inte ett löfte om bättre färg. Källklippning i avkodaren går inte att återskapa. Flyttalskällan använder dubbelt så mycket minne som RGB16.
- **Jämn belysning, experiment:** läs en bild av ljuskällan utan film under Ljuskälla och bildanalys. En liten 17×17-karta korrigerar rumsliga variationer i linjära kanalvärden. Varje kanal normaliseras med sin egen median så att referensens övergripande färg inte neutraliseras. Förhandsvisning, analys, detaljvy och export får samma karta. Aktivering nollställer berörd källkalibrering. Kartan sparas i projektet; referensfotot sparas inte.

## Belysningsreferens

Samma kamera, utsnitt, orientering, objektiv, bländare, fokus, vitbalans och ljuskälla behövs. Appen kontrollerar färgdomän, kameramodell för RAW och avkodade bildmått; den kan inte kontrollera att hela uppställningen är identisk. Använd väl exponerat jämnt ljus utan film eller motiv. Mörka, starkt klippta eller extremt ojämna referenser avvisas. Korrigeringen är ett experiment och ska inte användas för att ta bort verkliga variationer i motivet. Andra bilder måste ha korrigeringen uttryckligen aktiverad i sina inställningar.

## Bygg och tester

```sh
npm ci
npm test
npm run build
```

Publicera hela `site/` via HTTPS. Den inbäddade testsviten återställer även TIFF-fixturerna vid `npm test`; den separata fixturkatalogen behöver inte laddas upp till GitHub.

Valfria webbläsartester kräver Playwright och Chromium:

```sh
FILMLABB_CHROMIUM_BIN=/path/to/chromium npm run test:gpu
FILMLABB_CHROMIUM_BIN=/path/to/chromium npm run test:next
```

`FILMLABB_PLAYWRIGHT_MODULE` kan peka på en separat Playwright-installation. `FILMLABB_CHROMIUM_ARGS` kan innehålla en JSON-lista med startargument. `FILMLABB_RAW_FIXTURES` aktiverar verkliga RAW-importtester med filerna D50.nef, EOS-5D.cr2, EOS-R.cr3, DMC-GF1.rw2 och DMC-GM1.rw2. RAW-filerna ingår inte i paketet; källor och kontrollsummor finns i `docs/raw-sample-provenance.json`.

Resultat och begränsningar dokumenteras i `docs/next-browser-results.json` och `docs/gpu-browser-results.json`. Webbläsaren i testmiljön använder SwiftShader, så testerna mäter korrekthet och reservvägar. De bevisar inte prestanda eller stabilitet i Edge med fysisk integrerad grafik eller Safari på iPad.
