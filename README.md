# Negative Studio 1.0 Beta 3 — RAW-fokus

Beta 3 är ett jämförelsebygge med RAF direkt från kameran som huvudflöde. **Beta 1:s färgmetod är fortfarande standard, men även den använder Beta 3:s korrigerade import. För en exakt jämförelse med tidigare Beta 1 behövs det tidigare bygget.** Välj Beta 3 under Färgmotor för att prova filmruteberoende basuppskattning ovanpå Beta 1:s färgframkallning. Beta 2 finns kvar som separat experiment. Inga nya RAW-format har tillkommit: RAF och DNG stöds via LibRaw 1.6.0.

## Installera

Kopiera innehållet i denna katalog till roten av ditt befintliga GitHub-projekt och bygg/publicera `site/` med den befintliga arbetsgången. `npm ci`, `npm test` och `npm run build` fungerar också lokalt. En byggd `site/` ingår i leveransen. Publicera hela den katalogen via HTTPS. Service worker-cache har fått ett nytt namn så att den äldre Beta 2-versionen inte återanvänds.

## Arbeta med en RAF direkt

1. Importera en `.RAF`. Bilden avkodas i 16 bitar med LibRaw, inte från kamerans inbäddade JPEG. Om avkodningen misslyckas får du välja JPEG-reservläge uttryckligen.
2. Kontrollera den gula filmrutan. Flytta en sida om den innehåller filmkant, ljuskälla eller intilliggande ruta och bekräfta rektangeln. Filmrutan används för analys utan att ändra originalet; beskärning av exporten är ett eget val.
3. Välj `Beta 3 · förbättrad källhantering` för jämförelse. Välj `Beta 1 · färgmetod (referens)` för att återgå till den beprövade färgmetoden. Neutral profil vid 0 % visar grundkonverteringen.
4. Klicka `TIFF 16-bit` för fullstor sRGB-TIFF med inbäddad ICC-profil. En liggande RAF med stående motiv kan roteras med 90°-knapparna; eventuell rotation används också i exporten.

## Ändringar i Beta 3

- RAF och DNG får samma normaliserade linjära RGB-ingång till analys, visning och export. Kamerafilerna skapas inte om till DNG på disk.
- TIFF med matris/TRC-ICC (inklusive Adobe RGB) skalas gemensamt över alla tre kanaler **före** omvandling till 16-bitars linjär sRGB. Därmed tappas nästan inte längre den röda informationen vid import. Samma metod används för TIFF som ljuskällereferens.
- Den nya Beta 3-varianten av Beta 1:s motor försöker endast mäta verklig oexponerad filmkant utanför den markerade filmrutan. Finns ingen säker kant använder den uttryckligen motivets övre percentiler *innanför* filmrutan som en uppskattning; vit extern ljuskälla används aldrig som uppmätt filmbas.
- Förhandsvisningens kanalvärden skapas från samma normaliserade 16-bitars källa som den fullstora exporten. Rotation, arbetskö, manuella inställningar, kreativa profiler och separat exportbeskärning är kvar.
- En neutral 16-bitars RAF/TIFF-export använder en numeriskt jämförd uppslagstabell. Kreativa profiler använder fortfarande den allmänna pixelvägen.
- Knappen för att bekräfta en filmruta döljs korrekt efter bekräftelse.

## Viktigt vid utvärdering

Den Adobe RGB-TIFF som levererades med `_DSF9237` är fortfarande betydligt cyanare än motsvarande RAF/DNG i neutral framkallning. Ett verkligt informationsbortfall vid TIFF-importen är reparerat, men Lightroom-exportens färgtolkning och/eller tonalitet skiljer sig från RAW-avkodningen. **Beta 3 är därför inte färgmässigt godkänd som ersättare för Beta 1, och TIFF-överensstämmelse är fortfarande öppen.** Ingen fast varm eller magentafärgad kompensation har lagts in för att dölja problemet. Se `TEST_REPORT.md`.

En inbäddad TIFF-profil utanför RGB-matris/TRC stöds inte. TIFF måste vara okomprimerad chunky RGB, 8 eller 16 bitar och orientering 1. Neutral RAF→TIFF klarade ett fullstorlekstest på 6032×4032 pixlar; exportberäkningen tog 8 s på testdatorn utöver RAW-avkodning. Kreativa profiler kan vara betydligt långsammare och verklig Safari/iPad-prestanda har ännu inte verifierats. Ytterligare kamerors RAW kräver avkodar- och färgtester, inte bara en ny filändelse.

## Tester

```sh
npm ci
npm test
node tests/raw-fixture.mjs
node tests/raf-dng-pair.mjs /path/to/image.RAF /path/to/image.dng
npm run build
```

De privata negativfilerna ingår inte i leveransen. Tester utan bildunderlag kontrollerar bl.a. ICC-normalisering, filmruteanalys, profilseparation, rotation, JPEG- och TIFF-export. `raf-dng-pair.mjs` kontrollerar att en RAF och dess DNG ger jämförbar avkodad RGB-statistik.
