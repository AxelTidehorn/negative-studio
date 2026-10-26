# FILMLABB 1.1 Beta 3.6.1 – testpaket för GitHub Actions

Beta 3.6:s inbäddade testpaket saknade `tests/fixtures/tiff/expected.json`
och TIFF-filerna som manifestet beskriver. Om endast rotfilerna lades in i
repositoryt stoppades `npm test` med ENOENT.

Hela TIFF-underlaget ingår nu i `slider-regression-suite.json`. `npm test`
återställer det automatiskt tillsammans med testskripten. Även `test:tiff`
och `test:gpu` använder samma återställning. Packverktyget avbryter om
TIFF-manifestet saknas när ett nytt testpaket skapas.

Verifiering sker i en ny katalog med bara rotfilerna och utan någon
`tests/`-mapp före körningen. Komplett regressionstest samt byggning kontrolleras.
GPU-rendering och färgmotorn är oförändrade från Beta 3.6.

Ersätt rotfilerna, särskilt `slider-regression-suite.json`, `verify-preview.mjs`
och `package.json`. Behåll befintlig `.github/workflows`. Ingen manuell uppladdning
av testmappar krävs för GitHub Actions. De återställs av testpaketet.
