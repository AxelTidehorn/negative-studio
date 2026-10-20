# Negative Studio v1.0 – public beta (testversion)

En webbaserad negativkonverterare för iPad och dator. Bilder bearbetas lokalt i webbläsaren. Ingen bildserver eller inloggning behövs.

## Nyheter

- DNG kan importeras med LibRaw/WASM där kameran och DNG-varianten stöds; **DNG är inte kompatibilitetstestad på alla kameror**.
- Kreativa färgprofiler har egna namn och en styrka på 0–100 %, utan påståenden om filmspecifik kalibrering.
- Den neutrala konverteringen fungerar som referens. Svartvitt har separata tonprofiler.
- Förstahjälp/instruktion, syntetisk exempelfil och länk till GitHub Issues för feedback.
- Ljust/mörkt gränssnitt och större bildyta.

## Installera i ditt GitHub-projekt

1. Packa upp ZIP-filen. Kopiera **innehållet** i mappen `Negative_Studio_v1.0_beta_source` till roten av repositoryt.
2. Behåll samma Pages-konfiguration. Granska att `.github/workflows/pages.yml` och `build.yml` finns.
3. Commit, vänta på grön körning under Actions och öppna GitHub Pages.
4. Kontrollera att appen visar **v1.0 beta**. Vid cacheproblem prova en ny URL med `?v=100b`.

Du kan låta v0.9.2 ligga på en egen git-branch innan uppdatering för enkel återställning.

## Begränsningar – läs före användning

- Färgmotorn utgår från v0.9.2, där automatisk motivanalys och andra beräkningar inte är färgmetriskt kalibrerade. **Detta är inte en ny vetenskapligt uppmätt färgmotor.** Starka kreativa profiler kan bli mindre exakta än Neutral.
- RAW/DNG används vid full avkodning/TIFF-export. Snabb förhandsvisning förutsätter en inbäddad JPEG – DNG utan JPEG-förhandsbild kan behöva full RAW-avkodning.
- TIFF läses som okomprimerad RGB 8/16-bitars. ICC-profiler i TIFF läses inte. JPG-export bör betraktas som vanlig webbläsarkodad RGB/sRGB, men ingen validerad ICC-pipeline finns ännu.
- Rullens filmbas/ljuskälla är heuristisk. 16-bitars TIFF-export använder 16-bitars samples men vissa normaliseringar kommer från 8-bitars förhandsvisning.
- Offline fungerar efter att alla nödvändiga WASM-filer faktiskt hämtats. RAW-stöd och minnesanvändning kan variera mellan enheter.
- Demoskann är en matematiskt genererad färggradient, inte ett representativt fotografi eller uppmätt film.

## Testplan

1. Kontrollera ljust/mörkt läge och rotation på iPad.
2. Importera JPEG, okomprimerad TIFF, RAF och en DNG och kontrollera att konvertering och export fungerar.
3. Testa profilstyrka 0 %: resultatet ska vara identiskt mellan alla **färgprofiler** med samma övriga inställningar.
4. Jämför profilerna vid 100 %. De är kreativa tolkningar.
5. Testa svartvitt och exporterad TIFF.
6. Testa offline efter att ha öppnat appen online och hämtat RAW-biblioteket.

### Rapportera buggar

Använd `Feedback` i appen eller skapa ett GitHub Issue. Bifoga version, filformat, webbläsare, reproduktionssteg och gärna skärmbild. Negativfiler bifogas endast med eget uttryckligt val.

## Publiceringskvalitet

Detta projekt är en **beta**, inte en verifierad v1.0-release. Undvik att ersätta dina original eller använda exporten som enda säkerhetskopia.
