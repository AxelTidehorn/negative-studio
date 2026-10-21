# FILMLABB 1.1 Beta 3.4.1

Befintliga kreativa profiler har fått tydligare karaktär. Standardmotorn analyserar nu originaldata; visningsbildens nedskalning används inte längre för ny färgkalibrering. Äldre projekt behåller tidigare profiler, motor och analysmetod.

- [Release och installation](RELEASE_1.1_BETA3.md)
- [Profiler: uttryck, inspiration och versionshantering](docs/PROFILER_BETA3.md)
- [Verifiering och kända begränsningar](docs/VERIFIERING_BETA3.md)
- [Tekniska ändringar](docs/TEKNIK_BETA3.md)

```sh
npm ci
npm test
npm run build
```

Lägg källfilerna i befintlig repository-root och bevara `.github/workflows`. Din Actions-konfiguration fortsätter bygga och publicera `site/`. Nya root-moduler är `creative-profiles.js` och `source-analysis.js`. Uppdatera också `test-suite.json`, worker, build och cachefiler. Ingen publicering har gjorts här.

Originalbilder ingår inte i projekt-JSON. Importera bilderna först och öppna sedan projektet. Använd den här versionen för projekt som använder de nya profilerna; äldre FILMLABB-versioner känner inte till deras nya profilversion.

Historiska motorimplementationer finns kvar för bakåtkompatibilitet, men bara Standard och Jämförelse visas normalt. Äldre projekt visar dessutom sitt sparade motorläge. Äldre dokumentation finns under `docs/history/`.

## Korrigerad manuell filmruta

Se [ändringar och verifiering](docs/MANUELL_FILMRUTA_BETA3_1.md) och [installation](RELEASE_1.1_BETA3_1.md). Tidigare Beta 3-resultat finns under docs/history/beta3.

## Svarstid i förhandsvisningen

Se [prestandarapport](docs/PRESTANDA_BETA3_2.md) och [installation](RELEASE_1.1_BETA3_2.md). Filmrutefixen från 3.1 ingår.

## Direktare reglage

Se [reglagerapport](docs/PRESTANDA_BETA3_3.md) och [installation](RELEASE_1.1_BETA3_3.md).

## Telefonlayout

Se [mobilrapport](docs/MOBIL_BETA3_4_1.md) och [installation](RELEASE_1.1_BETA3_4_1.md).
