# FILMLABB 1.1 Beta 4 — utvecklingsprototyp

Nytt: experimentell NEF/CR2/CR3/RW2-import, originaldetalj 100/200 %, större JPEG, valfri Rec.2020-färgväg i flyttal och rumslig belysningskorrigering.

Se [funktioner, installation och begränsningar](RELEASE_1.1_BETA4.md). Börja med standardinställningarna; experimenten aktiveras separat.

# FILMLABB 1.1 Beta 3.6.1 – GPU-prototyp 1

3.6.1 rättar paketeringen av TIFF-testdata för GitHub Actions. Testpaketet återställer hela `tests/` inklusive fixtures före körning.

GPU-förhandsvisning med CPU-reserv: se [funktioner, testresultat och installation](RELEASE_1.1_BETA3_6_GPU.md).

Tidigare TIFF-kompatibilitet och exportprestanda: se [ändringar, testresultat och begränsningar](RELEASE_1.1_BETA3_5.md).


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
