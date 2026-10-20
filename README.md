# Negative Studio 1.0 Beta 2 — Color Engine Update

Testbygge ovanpå Negative Studio 1.0 Beta. **Färgacceptansen är ännu inte uppfylld.** Den gamla motorn är standard och den nya väljs uttryckligen för utvärdering.

## Installera i befintligt GitHub-projekt

1. Packa upp ZIP-filen och kopiera innehållet i `Negative_Studio_v1.0_beta2_source` till projektroten. Ta med alla fyra nya JavaScript-filer och den uppdaterade `build.mjs`.
2. Commit och låt befintlig GitHub Actions bygga/publicera `site/`.
3. Kontrollera att appen visar **v1.0 beta 2**. Prova `?v=100b2` vid gammal cache.

En färdigbyggd `site/` med LibRaw 1.6.0 ingår också och kan publiceras direkt via en statisk HTTPS-server. Ingen publicering av ditt befintliga GitHub-projekt har gjorts från den här miljön.

## Utvärdera uppdateringen

1. Importera upp till fem negativ. RAF/DNG avkodas före analys; det tar längre tid än kamerans JPEG-förhandsbild men ger samma källa i förhandsvisning och export.
2. Kontrollera filmrutans gula rektangel. Dra de fyra sidorna och tryck **Bekräfta filmruta**. Kantdetektorn är konservativ och dess förslag behöver i detta bygge bekräftas. Du kan låsa eller dölja rektangeln. Under Ljuskälla och bildanalys finns även symmetrisk kantmarginal.
3. Välj **Beta 2 · ny densitetsmotor** ovanför profilerna. Välj Neutral och 0 % för att bedöma grundkonverteringen. Byt till Beta 1 för jämförelse med samma filmruta.
4. Använd filmbaspipetten på en oexponerad filmkant om den finns. Referensen kan sparas för rullen och aktiveras på varje bild. Samma film, ljuskälla, vitbalans och källkodning krävs.
5. Justera färg med Varm/kall och Grön/magenta. Detta ändrar inte filmbasen. Kreativa profiler appliceras därefter med befintlig styrka 0–100 %.
6. Exportera JPEG eller 16-bitars TIFF. Markera **Beskär exporten till filmrutan** om även exporten ska beskäras. Originalfilen ändras aldrig.

## Implementerat

- En separat testbar densitetsmotor och en synlig filmruta, med analysmarginal 1,2 % innanför kanterna.
- Filmruta, låsning, bekräftelse, exportbeskärning och motorval per bild i arbetskön.
- Automatisk kantanalys med osäkerhetsläge och manuell korrigering.
- Filmbas analyseras separat. Neutralt vitt ljus, klippta prov och svart ram avvisas. Ett basprov måste också vara minst lika transmissivt som motivets övre percentil i alla kanaler. Orange kantprov är fortfarande en heuristik, inte en säker identifiering.
- Tydligt fallback-läge utan säker filmbas, manuell pipett och gemensam rullreferens.
- Källnormalisering före densitet: linjär sRGB från RAW, sRGB från webbläsarens JPEG/PNG/WebP-avkodning och TIFF med synlig källtolkning.
- Gemensam exponeringsnormalisering och gemensamt tonomfång. Ingen gråvärldsbalans, separat kanalsträckning eller fast varm/magenta-kompensation i Beta 2.
- Float32-förhandskälla från originalets 16-bitarsdata. Förhandsvisning och båda exportformat använder samma pixelberäkning och kalibrering.
- ICC matris/TRC-RGB-profiler i TIFF konverteras till linjär sRGB. TIFF utan ICC visar ett antagande som kan ändras till sRGB eller linjär sRGB. LUT-profiler avvisas.
- TIFF-export med inbäddad sRGB-ICC. JPEG använder sRGB-canvas.
- Rotation och valfri beskärning även i JPEG-batch. Projekt-JSON bevarar filmrutor och delade kalibreringar. Gamla v0.8-projekt kan läsas.
- Okomprimerad TIFF upp till 100 MP. Sammanhängande little-endian 16-bitarsstrips kan återanvända källbufferten för lägre minnesbehov; 68 MP-exemplet har lästs.
- Befintliga profilnamn, svartvita profiler, teman, fem-bilderskö och exportvägar behålls.

## Kvarstående begränsningar

Se **TEST_REPORT.md**. Den nya motorn har i verkliga bilder fortfarande visat cyan-/blåstick och är inte godkänd som ersättare. De förändrade beräkningarna är ingen garanti för bättre färg. En uppmätt kamera-/film-/ljuskällespecifik färgmodell saknas.

Automatisk filmruta och filmbas kan misslyckas. Fallback uppskattar masken från ljusa motivvärden och är fortfarande motivberoende. Den neutrala vitljusspärren kan inte identifiera varje färgad eller kameravitbalanserad extern ljuskälla säkert. Manuell kontroll krävs vid osäkerhet.

TIFF måste vara okomprimerad chunky RGB, 8/16 bit, orientering 1, högst 100 MP. LUT-ICC stöds inte. TIFF utan ICC med andra överföringskurvor än sRGB eller linjär sRGB behöver förberedas separat. JPEG/PNG/WebP avkodas till 8 bitar och har kvar den tidigare arbetsgränsen 3500 px. RAW/TIFF exporterar från full källa.

Delade kalibreringar återanvänds inte mellan olika källkodningar. Stora filer kan kräva mycket tid och minne, särskilt på iPad. Pekhantering, Safari-rendering och offlineinstallation är inte verifierade i en riktig iPad-webbläsare i denna körning.

## Köra kontroller

```sh
npm ci
npm test
node tests/raw-fixture.mjs
npm run build
```

`npm test` innehåller numeriska tester och appintegration i en DOM-testmiljö, inte en riktig webbläsare. `raw-fixture.mjs` avkodar en medföljande syntetisk CFA-DNG genom den faktiska LibRaw/WASM-modulen. `tests/real-files.mjs INPUT OUTPUT` kan köras på privata RAF/DNG-filer; originalen ingår inte i distributionen. Kör stora filtester sekventiellt för att begränsa minnesanvändningen.

Ingen ny filmemulering, profil, retusch, molnlagring eller nytt RAW-format har införts.
