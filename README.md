# Negative Studio v0.8 – testversion

## Installera/uppdatera
Ersätt index.html, build.mjs, package.json, manifest.webmanifest och sw.js i repositoryts rot. Behåll `.github/workflows` i rätt mapp. Commit: Actions Build och Pages publicerar. Öppna Pages-adressen och ladda om med internetanslutning; säkerställ att rubriken visar v0.8. Offline måste testas efter att alla resurser hämtats.

## Nytt
- Fast, större bildyta på iPad i liggande läge, zoom 100–800 % och pekpanorering. Zoom är visningszoom, inte sensorpixelvisning.
- Filmruteområde för statistik: manuell procentuell kantmarginal samt försiktig automatisk uppskattning. Automatiken är INTE en exakt geometrisk detektor. Export beskär ännu inte bildens pixeldata.
- Gemensamma justeringar: bara färg, bara ton eller båda till markerade rutor; individuell exponering bevaras.
- Ljuskällereferens via bild: uppskattar global kanalbalans (inte spatial flat field/vinjettering). För RAW-referens används inbäddad JPEG. En ny referens behövs efter omladdning.
- Batch TIFF med högst fem markerade bilder, sekventiella nedladdningar (Safari kan fråga om varje nedladdning). JPEG-ZIP finns kvar.
- Existerande LibRaw RAF, 16-bit TIFF, emulsionsprofiler, offline-resurser bevarade.

## Begränsningar
Normalisering är fortfarande heuristisk, inte kalibrerad mot exponering eller emulsion. Ljuskällereferens har ingen platsberoende korrigering och normaliseras utifrån en enda bild. Automatisk beskärning är en uppskattning av analysområdet, inte säker bildrutedetektion; export är fortfarande i helbild. Ingen garanti om filmtrogen färg. Originalbilder lämnar inte enheten. Projekt-JSON innehåller inte RAF eller referensbild.

## Tester
Kontrollera två UltraMax-RAF, växla mellan bilder, välj 5, kopiera färg utan exponering, ladda ljuskällereferens, ändra analysmarginal, zooma, TIFF-exportera samt offline efter onlineuppdatering. Syntax- och byggkontroll genomförs; faktisk Safari-körning måste verifieras på iPad.
