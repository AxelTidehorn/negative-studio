# FILMLABB 1.1 Beta 3.4.2 — JPEG-export från TIFF

JPEG-export använder nu en begränsad canvas, renderar direkt från fullupplöst källa i exporterad storlek och kan prova mindre upplösningar om webbläsaren inte kan JPEG-koda. Tidigare byggdes alltid en canvas i full storlek, vilket kan ge null från `toBlob` på iOS Safari.

När dimensionerna begränsas visas faktisk exportupplösning i statusraden. Detta är en kompatibilitetslösning, **inte en fullupplöst JPEG-export för stora TIFF-filer**. 16-bitars TIFF-export lämnas oförändrad.

Även cachen har nytt versionsnamn. Ersätt repository-root med filerna i arkivet och låt befintliga GitHub Actions bygga/publikera.

Kvar att verifiera i riktig Safari: samma TIFF som tidigare gav `JPEG-kodning misslyckades`, både iPad och iPhone. Automatiska tester passerar inte hela vägen i det medföljande testpaketet på grund av ett redan existerande förväntat motorvärde (`beta3` kontra `calibrated4`).
