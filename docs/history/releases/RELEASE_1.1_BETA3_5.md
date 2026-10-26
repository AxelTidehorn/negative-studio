# FILMLABB 1.1 Beta 3.5 – TIFF och prestanda

## Ändringar

- TIFF-import: okomprimerad, LZW, ZIP/Deflate och PackBits; 8/16-bitars RGB eller gråskala. Strips och tiles, separata färgplan, horisontell predictor och orientering 1–8. Största fullständiga huvudsidan väljs när filen också innehåller mindre förhandsvisningar.
- TIFF-importfel behåller den konkreta orsaken i statusraden.
- JPEG-export kompilerar färgmotorn en gång per bild. Exakta uppslagstabeller används för heltalskällor, inklusive sRGB-TIFF. Färgblandning och gemensam högdagerkompression körs fortfarande i samma färgkedja.
- JPEG bearbetar bildblock med pauser för gränssnittet. Inställningar och källa fångas när exporten börjar. Befintliga reservstorlekar 12/6/3 megapixel behålls om JPEG-kodaren misslyckas; canvas-minnet frigörs även vid fel.
- TIFF-export återanvänder samma förberedda färgmotor. Batch-TIFF anropar aktuell exportmotor i stället för en tidigare fångad äldre implementation.
- Standardmotorns förhandsvisning undviker flera tillfälliga RGB-arrayer per pixel. Samma matematiska ton- och färgberäkning behålls.
- Sammanhängande, okomprimerad little-endian RGB16 kan använda källans pixelbuffert direkt.
- Ny offline-cacheversion och TIFF-modulen inkluderas i bygget.

## Verifiering

`npm ci`, `npm test`, `npm run build`.

- 72 oberoende testfiler skapade med Pillow/libtiff; samtliga avkodade pixelvärden verifierade. Komprimering, orientering, 8/16 bitar, byteordning, tiles/strips, färgplan och predictor ingår.
- 48 kombinationer av motor, källkodning, bitdjup och kreativ profil: förberedd export jämförd med direkt pixelberäkning, tolerans 1e-12.
- Tre TIFF-varianter genom appens verkliga import- och exportfunktioner i DOM-testharness. Rotation, beskärning och exporterade 16-bitarsvärden kontrollerade.
- Exporterad TIFF har också öppnats oberoende med Pillow/libtiff: RGB, 16 bitar/kanal och inbäddad ICC-profil.
- JPEG-kodarens null- och undantagsfall provade med simulerad canvas-kodare, inklusive reservförsök och frigjort canvas-minne.
- Befintlig regressionstestsvit kontrollerar färgmotor, historiska profiler, källanalys, exportens inställningsögonblicksbild och reglagens schemaläggning.

## Prestandamätning

Mätning i Node 24:s VM-testharness på syntetisk bild, inte på iPad/Safari:

| Beräkning | Före | Efter |
| --- | ---: | ---: |
| Förhandsvisning, 120 000 pixlar; median av tre mätningar | 2 339 ms | 1 982 ms |
| Exportberäkning, 40 000 pixlar | 2 751 ms | 285 ms + 296 ms engångsförberedelse |

Förhandsvisningens beräkning tog cirka 15 % kortare tid. Exportberäkningen inklusive förberedelse tog cirka 4,7 gånger kortare tid i detta test. Det mäter inte hela fil-exporten eller webbläsarens JPEG-kodare. Förhandsvisningens pixeljämförelse mot föregående kod gav maximal färgavvikelse 0 i 16 000 testpixlar. Råa resultat finns i `docs/performance-beta3.5.json`.

## Återstående begränsningar

Kompisens ursprungliga problemfiler finns inte i underlaget för denna ändring. Deras exakta felorsak är därför inte bekräftad. Ingen verifiering av den riktiga JPEG-kodaren eller nedladdningen i Safari/iPad har gjorts. En lokal Chromium-installation kunde inte slutföras eftersom webbläsarnedladdningen misslyckades.

BigTIFF, JPEG-komprimerad TIFF, flyttals-TIFF, palett/CMYK, premultiplicerad alfa och ICC-profiler med LUT stöds inte. Befintlig ICC-hantering kräver RGB/XYZ-matris och tonkurvor. ZIP-TIFF kräver webbläsarens DecompressionStream. Gränsen 100 megapixel kvarstår; mycket stora filer kan fortfarande överskrida enhetens minne. En mycket stor enskild strip kan blockera gränssnittet under sin avkodning.

## Installation

Ersätt källfilerna i GitHub-repositoryts rot och behåll befintlig `.github/workflows`. Kör normal byggning/publicering av `site/`. Det nya skriptet `tiff-codec.js` måste följa med. Efter publicering: ladda om appen och kontrollera att sidfoten visar **1.1 Beta 3.5**. Ingen publicering har gjorts här.
