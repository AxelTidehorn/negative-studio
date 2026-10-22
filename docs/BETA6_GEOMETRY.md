# FILMLABB Beta 6 – steg 1: geometri och projekt

Tekniskt underlag: [förstudien](FILMLABB_1.1_Beta6_Teknisk_forstudie.md), särskilt
avsnitt 4, 6, 7 och implementationsstegen 2–3. Branchen är uppdaterad med main
9370c6d, inklusive PR #16 och förstudien. Detta ersätter första PR-utkastets
antagande att rapporten saknades.

## Modell och koordinater

Filmrutan är fortfarande `frame.crop` / `cropRegion`, normaliserad till oroterad
källa. Befintlig detektering, analys, basmätning, tonanalys och låsning behålls.
Separat geometri lagras utanför `state` och dess färg-/worker-cachenycklar:

```js
frame.geometry = {
  version: 1,
  rotation: { quarterTurns: 0, fineDegrees: 0 },
  compositionCrop: null,           // annars {cx, cy, w, h} i R / max(W,H)
  sourceSize: null,                // annars {width, height}, verklig källa
  legacyCrop: null                 // annars {analysisFrame, edited}
};
rollShared.cropExportToFrame = false;
```

Det finns ingen `cropExportToFrameOverride`. Projektets enda gemensamma bool
lagras som `roll.cropExportToFrame`. Befintligt `settings.cropExport` är ett
härlett kompatibilitetsfält för de gamla exportanropen, inte en andra auktoritet.

Biblioteket `geometry.js` är rent, utan DOM, GPU eller färgkod. Det följer
förstudiens S/R/O/V-plan: källpixlarnas kanter 0..W/H, centrum i `(i+.5,j+.5)`,
positiv vinkel medurs. S→R roterar kring hela källans centrum. Kompositionens
centrum och storlek divideras med **samma** L=max(W,H). Negativa centrum är giltiga.
Data avser inte CSS, reducerad preview, roterad boundingbox eller automatiskt
inpassat utsnitt. Kvartvarv roterar befintligt centrum och byter w/h när det behövs.
Finvinkel ändrar inte den önskade rektangeln.

`effectiveComposition` beräknar ett separat begränsat utsnitt och ändrar aldrig
önskad komposition. Giltig domän är hela källan eller filmrutans heltalspixelgränser.
`validPolygon` transformerar domänens fyra hörn. För `null` komposition väljs den
största centrerade rektangeln med domänens sidförhållande efter kvartvarv. Med
bredd a·h och höjd h används samma hörnbegränsningar som rapportens sökförslag:

```
h = min(domainWidth / (a |cos θ| + |sin θ|),
        domainHeight / (a |sin θ| + |cos θ|))
```

För önskad komposition begränsas storleken likformigt och centrum klampas i den
inversroterade, eroderade källdomänen. `isValidCrop` verifierar alla fyra hörn.
Detta är inte största area över godtyckliga sidförhållanden.

`compositionTransform` ger R-rektangel, framtida utbildimensioner och inversa
pixelcentrum; fria dimensioner följer rapportens floor/minst-en-pixel-regel.
Exakta kvartvarv och migrerade legacy-planer behåller heltalsdimensionerna direkt,
utan en normaliserings-/avrundningsrundresa. `viewTransform` lägger separat till
fit, zoom och panorering. Dessa nya planfunktioner används inte av preview eller
nya exportlägen i steg 1.

## Migration och projektimport

Nytt format är `negative-studio-roll-beta6`, `geometryVersion:1`. Båda tidigare
stödda rullformaten (`negative-studio-roll-v08`, `negative-studio-roll-beta3`)
importeras med samma färg-/RAW-kompatibilitetsregler som i main. Source calibration,
profilversion, RAW-läge, sampling, responsdata, metadata och exportnamn bevaras.
`negative-studio-v03` blir inte ett nytt stödd importformat.

Enligt förstudiens 7.3:

- Alla äldre booler true: gemensamt true, ingen extra komposition.
- Alla false/saknas: gemensamt false, ingen extra komposition.
- Blandat: gemensamt false; tidigare true får en fryst legacy-utsnittsplan som
  materialiseras till R/L-komposition med exakt samma CE.bounds-pixelgränser.

Legacy-planen innehåller en **kopia** av den gamla analysrektangeln. Senare ändrad
analysram flyttar inte detta utsnitt. Dess centrum/storlek härleds från den gamla
heltalspixelrektangeln och kvartvarvet. Om en sparad bild inte har lästs in saknas
W/H, ibland även en detekterad filmruta. Då behålls ett uttryckligt väntande
underlag, som löses efter avkodning/detektering. Inga dimensioner gissas från
preview eller en annan bild. Projekt roundtrippar även väntande bildposter.

Vid äldre delimport räknas även befintliga omatchade köbilders exportval in när
köns standard väljs; annars skulle en gemensam true tyst beskära deras tidigare
fullbildsexport. Detta är en konservativ precisering av rapportens projektregel.
Ett nytt Beta 6-projekts uttryckliga köval gäller däremot hela kön.

Alla inkommande bildposter valideras före tillståndsändring, även om filnamnet
inte finns i kön. Okänd version, icke-ändliga tal, orimliga källstorlekar,
rektanglar utan yta och motstridiga legacy-/kompatibilitetsfält avvisas. Källa
begränsas till 1..1 000 000 pixlar per sida och högst 1 miljard källpixlar;
R/L-centrum till ±2 och storlek till (0,4]. Det är koordinatgränser, inte höjda
export-/minnesbudgetar. Tvetydiga filnamn i projekt eller matchad kö avvisas med
felstatus före import; de läggs inte längre tyst på första träffen.

Gränssnittets befintliga individuella kryssruta får en kompatibilitetsadapter:
individuella gamla val representeras som legacy-utsnitt, aldrig som sparade
booleska undantag. Ingen ny kökontroll visas. Den interna gemensamma mutatorn
bevarar önskad komposition och nya bilder ärver köns aktuella bool direkt.
Färgreglagens återställning bevarar nu även rotationen enligt rapportens avsnitt 7,
samt båda ramarna och kövalet; återställning av färgreglage ändrar inte geometrin.

Importens geometridel är atomär: kö, aktiv bild, färgdata, kalibrering och namn
lämnas orörda vid fel. Avkodningsfel efter ett godkänt projekt har accepterats
hanteras fortfarande av befintlig import, utan ett nytt generellt rollback-system.
Det tidigare **omergade PR-utkastets** boundingboxschema och individuella override
är inte detta format och avvisas uttryckligen, så koordinater aldrig misstolkas.

## Produktionsgräns i steg 1

Finrotation och **ny manuell** komposition är fortfarande vilande. Endast gamla
kvartvarv och gamla legacy-utsnitt får gå till export. En liten snapshot-adapter
väljer deras oförändrade källrektangel och anropar samma `CE.exportGeometry`.
Det behövs för blandade projekt: deras gamla true-utsnitt får inte börja följa
en senare teknisk analysram bara för att köns bool nu är false. JPEG-worker får
samma frysta region/crop i sitt befintliga protokoll; TIFF och reservvägar får
samma heltalsgeometri. Samplingsloopar, encoder, ICC, färgmatematik, GPU-kod och
exportbudgetar är oförändrade. Fem-bildersgränsen består.

Ny önskad komposition kan ändras internt utan analys/render och utan att en enda
ny presentationspixel aktiveras i exporten. Legacy-markören behålls som fryst
kompatibilitetsplan även när önskad ny geometri ändras. Vid uttrycklig gemensam
true används tills vidare den befintliga analysramens exportväg; begränsning av
ny manuell komposition enligt det effektiva utsnittet aktiveras först tillsammans
med alla backends. Detta är en uttrycklig fasgräns, inte slutlig Beta 6-rendering.

Nästa steg enligt förstudien är en gemensam presentationssampler **efter** färg,
med originalkoordinater för flat-field, begränsat grann-/stripeprotokoll, samma
kantpolicy och samtliga exportvägar. Därefter cacheat geometripass i preview,
verktyg/pipetter/lupp, upprätning och tredjedelsnät. Ingen generell downscaling-
eller färgfilterändring görs här. Version 1 är vilande geometri; rendersemantiken
måste migreras uttryckligen när presentationen aktiveras.

## Jämförelse med första PR-utkastet

| Förstudie | Justering |
| --- | --- |
| 6.1–6.3: S/R-plan och R/L-komposition | Ersätter normaliserad auto-canvas; negativa centrum, rotationsordning, pixelcentrum och S→R→V→S testas |
| 6.4: domän/polygon och önskat/effektivt utsnitt | Hela källa eller off-center CE.bounds-domän; separata effektiva planer utan datamutation |
| 7.2–7.3: en köbool och blandad migration | `roll.cropExportToFrame`, inga individuella booleska undantag, frysta/lazy legacy-kompositioner |
| 7: validering, dubletter och reset | Import avvisar tvetydiga namn och osäkra storlekar atomärt; färg-reset bevarar rotation |
| 9: ingen halvfärdig fri rotation | Ingen ny UI-/GPU-/samplingsväg; bara gammal exportgeometris input väljs via snapshot-adapter |

Testerna finns i `test/beta6-geometry.mjs`, `test/beta6-project.mjs` och
`test/beta6-browser.mjs`; de körs via de befintliga Node-/browser-skripten.
Tidigare utkastets testresultat ersätts av slutverifieringen efter denna anpassning.

## Slutverifiering mot förstudien

Verifierat med Node 24.19 och systemets Chromium:

- Ren checkout: `npm ci`, `npm test` (29/29 grupper), `npm run build` och
  `npm run test:build` passerade.
- `FILMLABB_CHROMIUM_BIN=/usr/bin/chromium npm run test:browser` passerade
  samtliga 6 grupper, inklusive GPU-, mobil- och legacy-exportprov.
- Efter slutgranskningen passerade även det riktade projektprovet med en
  kontrolländring under pågående TIFF-export: nästa inställning behålls medan
  exportens snapshot förblir oförändrad.
- Regression för exakt legacy-geometri täcker även en 3×22-källa där
  normaliserad avrundning annars kunde tappa en rad vid gemensam begränsning.

Chromium-proven ersätter inte verkliga iPad Safari- och Edge-enheter. Tidigare
identifierad aliasing vid downscaling kvarstår avsiktligt; ingen filtrering
eller färgmatematik ändras i detta steg. Finrotation, kompositionsgränssnitt och
samordnad preview/export aktiveras först i senare steg.
